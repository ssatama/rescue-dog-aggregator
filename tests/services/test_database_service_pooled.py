"""
Test suite for connection pool migration in services/database_service.py

Tests DatabaseService using connection pool instead of direct connections.
"""

import json
from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from services.connection_pool import ConnectionPoolService
from services.database_service import DatabaseService


@pytest.mark.slow
@pytest.mark.database
class TestDatabaseServiceWithConnectionPool:
    """Test DatabaseService using connection pool."""

    def test_init_with_connection_pool(self):
        """Test DatabaseService initialization with connection pool."""
        # Mock ConnectionPoolService
        mock_pool_service = Mock(spec=ConnectionPoolService)

        # Test initialization
        db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"}, connection_pool=mock_pool_service)

        # Verify pool service is stored
        assert db_service.connection_pool == mock_pool_service
        assert db_service.conn is None  # No direct connection when using pool

    def test_get_existing_animal_with_pool(self):
        """Test get_existing_animal using connection pool."""
        # Mock ConnectionPoolService and connection
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        # Setup connection context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (123, "Test Dog", datetime(2024, 1, 15))

        # Create DatabaseService with pool
        db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"}, connection_pool=mock_pool_service)

        # Test
        result = db_service.get_existing_animal("test-123", 1)

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database query
        mock_cursor.execute.assert_called_once_with("SELECT id, name, updated_at FROM animals WHERE external_id = %s AND organization_id = %s", ("test-123", 1))

        # Verify result
        assert result == (123, "Test Dog", datetime(2024, 1, 15))

    def test_create_animal_with_pool(self):
        """Test create_animal using connection pool."""
        # Mock ConnectionPoolService and connection
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        # Setup connection context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (456,)  # New animal ID

        # Create DatabaseService with pool
        db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"}, connection_pool=mock_pool_service)

        # Test data
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

        # Test
        animal_id, action = db_service.create_animal(animal_data)

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database operations
        mock_cursor.execute.assert_called_once()
        mock_connection.commit.assert_called_once()

        # Verify result
        assert animal_id == 456
        assert action == "added"

    def test_create_scrape_log_with_pool(self):
        """Test create_scrape_log using connection pool."""
        # Mock ConnectionPoolService and connection
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        # Setup connection context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (789,)  # Scrape log ID

        # Create DatabaseService with pool
        db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"}, connection_pool=mock_pool_service)

        # Test
        scrape_log_id = db_service.create_scrape_log(1)

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database operations
        mock_cursor.execute.assert_called_once()
        mock_connection.commit.assert_called_once()

        # Verify result
        assert scrape_log_id == 789

    def test_fallback_to_direct_connection_when_no_pool(self):
        """Test DatabaseService falls back to direct connection when no pool provided."""
        # Mock successful database connection
        mock_connection = Mock()

        with patch("psycopg2.connect", return_value=mock_connection):
            # Create DatabaseService without pool
            db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"})

            # Test connect method
            result = db_service.connect()

            # Verify direct connection was established
            assert result is True
            assert db_service.conn == mock_connection
            assert db_service.connection_pool is None

    def test_connection_pool_error_handling(self):
        """Test error handling when connection pool operations fail."""
        # Mock ConnectionPoolService with error
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_pool_service.get_connection_context.side_effect = Exception("Pool error")

        # Create DatabaseService with pool
        db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"}, connection_pool=mock_pool_service)

        # Test get_existing_animal with pool error
        result = db_service.get_existing_animal("test-123", 1)

        # Verify error is handled gracefully
        assert result is None
        mock_pool_service.get_connection_context.assert_called_once()

    def test_backward_compatibility_with_existing_usage(self):
        """Test that existing code using DatabaseService continues to work."""
        # Mock successful database connection
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (123, "Test Dog", datetime(2024, 1, 15))

        with patch("psycopg2.connect", return_value=mock_connection):
            # Create DatabaseService in legacy mode (no pool)
            db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"})

            # Connect using legacy method
            db_service.connect()

            # Test existing method still works
            result = db_service.get_existing_animal("test-123", 1)

            # Verify legacy functionality preserved
            assert result == (123, "Test Dog", datetime(2024, 1, 15))
            assert db_service.conn == mock_connection
