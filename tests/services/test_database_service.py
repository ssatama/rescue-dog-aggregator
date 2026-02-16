"""
Tests for DatabaseService connection pool integration and core operations.

Tests real behavior via mocked database connections — validates query construction,
pool usage patterns, error handling, and backward compatibility.
"""

from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from services.connection_pool import ConnectionPoolService


class TestDatabaseServiceDirectConnection:
    """Test DatabaseService with direct (non-pooled) connections."""

    @pytest.fixture
    def mock_db_config(self):
        return {
            "host": "localhost",
            "user": "test_user",
            "database": "test_db",
            "password": "test_pass",
        }

    @pytest.fixture
    def mock_connection(self):
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        return mock_conn, mock_cursor

    def test_get_existing_animal_found(self, mock_db_config, mock_connection):
        """Test get_existing_animal returns tuple when animal exists."""
        from services.database_service import DatabaseService

        mock_conn, mock_cursor = mock_connection
        mock_cursor.fetchone.return_value = (123, "Test Dog", "2024-01-01")

        db_service = DatabaseService(mock_db_config)
        db_service.conn = mock_conn

        result = db_service.get_existing_animal("test-123", 1)

        assert result == (123, "Test Dog", "2024-01-01")
        mock_cursor.execute.assert_called_once_with(
            "SELECT id, name, updated_at FROM animals WHERE external_id = %s AND organization_id = %s",
            ("test-123", 1),
        )


@pytest.mark.slow
@pytest.mark.database
class TestDatabaseServiceWithConnectionPool:
    """Test DatabaseService using connection pool."""

    def test_init_with_connection_pool(self):
        """Test DatabaseService stores pool and skips direct connection."""
        from services.database_service import DatabaseService

        mock_pool_service = Mock(spec=ConnectionPoolService)

        db_service = DatabaseService(
            db_config={"host": "localhost", "user": "test", "database": "test_db"},
            connection_pool=mock_pool_service,
        )

        assert db_service.connection_pool == mock_pool_service
        assert db_service.conn is None

    def test_get_existing_animal_with_pool(self):
        """Test get_existing_animal uses pool context manager for queries."""
        from services.database_service import DatabaseService

        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (123, "Test Dog", datetime(2024, 1, 15))

        db_service = DatabaseService(
            db_config={"host": "localhost", "user": "test", "database": "test_db"},
            connection_pool=mock_pool_service,
        )

        result = db_service.get_existing_animal("test-123", 1)

        mock_pool_service.get_connection_context.assert_called_once()
        mock_cursor.execute.assert_called_once_with(
            "SELECT id, name, updated_at FROM animals WHERE external_id = %s AND organization_id = %s",
            ("test-123", 1),
        )
        assert result == (123, "Test Dog", datetime(2024, 1, 15))

    def test_create_animal_with_pool(self):
        """Test create_animal generates slug and inserts via pool."""
        from services.database_service import DatabaseService

        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor

        mock_cursor.fetchone.side_effect = [
            (0,),  # slug uniqueness check
            (456,),  # INSERT RETURNING id
        ]

        db_service = DatabaseService(
            db_config={"host": "localhost", "user": "test", "database": "test_db"},
            connection_pool=mock_pool_service,
        )

        animal_data = {
            "name": "New Dog",
            "external_id": "new-123",
            "organization_id": 1,
            "animal_type": "dog",
            "breed": "Labrador",
            "age_text": "3 years",
            "sex": "Male",
            "adoption_url": "http://example.com/adopt/new-123",
            "primary_image_url": "http://example.com/image.jpg",
            "status": "available",
        }

        animal_id, action = db_service.create_animal(animal_data)

        mock_pool_service.get_connection_context.assert_called_once()
        assert mock_cursor.execute.call_count >= 2
        mock_connection.commit.assert_called_once()
        assert animal_id == 456
        assert action == "added"

    def test_create_scrape_log_with_pool(self):
        """Test create_scrape_log inserts log and returns ID via pool."""
        from services.database_service import DatabaseService

        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (789,)

        db_service = DatabaseService(
            db_config={"host": "localhost", "user": "test", "database": "test_db"},
            connection_pool=mock_pool_service,
        )

        scrape_log_id = db_service.create_scrape_log(1)

        mock_pool_service.get_connection_context.assert_called_once()
        mock_cursor.execute.assert_called_once()
        mock_connection.commit.assert_called_once()
        assert scrape_log_id == 789

    def test_fallback_to_direct_connection_when_no_pool(self):
        """Test DatabaseService uses psycopg2.connect when no pool provided."""
        from services.database_service import DatabaseService

        mock_connection = Mock()

        with patch("psycopg2.connect", return_value=mock_connection):
            db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"})
            result = db_service.connect()

            assert result is True
            assert db_service.conn == mock_connection
            assert db_service.connection_pool is None

    def test_connection_pool_error_handling(self):
        """Test get_existing_animal returns None when pool raises."""
        from services.database_service import DatabaseService

        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_pool_service.get_connection_context.side_effect = Exception("Pool error")

        db_service = DatabaseService(
            db_config={"host": "localhost", "user": "test", "database": "test_db"},
            connection_pool=mock_pool_service,
        )

        result = db_service.get_existing_animal("test-123", 1)

        assert result is None
        mock_pool_service.get_connection_context.assert_called_once()

    def test_backward_compatibility_with_existing_usage(self):
        """Test legacy direct-connection usage still works end-to-end."""
        from services.database_service import DatabaseService

        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (123, "Test Dog", datetime(2024, 1, 15))

        with patch("psycopg2.connect", return_value=mock_connection):
            db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"})
            db_service.connect()

            result = db_service.get_existing_animal("test-123", 1)

            assert result == (123, "Test Dog", datetime(2024, 1, 15))
            assert db_service.conn == mock_connection
