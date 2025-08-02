"""
Tests for DatabaseService - TDD approach for BaseScraper refactoring.

Consolidates all DatabaseService tests:
- test_database_service.py (original TDD tests)
- test_database_service_pooled.py (connection pool tests)
- test_database_service_integration.py (BaseScraper integration tests)

Following CLAUDE.md principles:
- Test first, code second
- Pure functions, no mutations
- Immutable data patterns
- Early returns, no nested conditionals
"""

import json
import os
from datetime import datetime
from typing import Any, Dict, Optional, Tuple
from unittest.mock import Mock, patch

import pytest

from services.connection_pool import ConnectionPoolService

# Import will be created after interface design
# from services.database_service import DatabaseService


@pytest.mark.integration
@pytest.mark.database
@pytest.mark.slow
class TestDatabaseServiceInterface:
    """Test DatabaseService interface contract."""

    def test_database_service_interface_exists(self):
        """Test that DatabaseService implements expected interface."""
        # This test will fail initially - TDD approach
        try:
            from services.database_service import DatabaseService

            assert hasattr(DatabaseService, "__init__")
            assert hasattr(DatabaseService, "get_existing_animal")
            assert hasattr(DatabaseService, "create_animal")
            assert hasattr(DatabaseService, "update_animal")
            assert hasattr(DatabaseService, "create_scrape_log")
            assert hasattr(DatabaseService, "complete_scrape_log")
            assert hasattr(DatabaseService, "connect")
            assert hasattr(DatabaseService, "close")
        except ImportError:
            pytest.fail("DatabaseService not yet implemented - expected for TDD")

    def test_get_existing_animal_signature(self):
        """Test get_existing_animal method signature and return type."""
        # Will implement after creating service
        pytest.skip("DatabaseService not yet implemented")

    def test_create_animal_signature(self):
        """Test create_animal method signature and return type."""
        pytest.skip("DatabaseService not yet implemented")

    def test_update_animal_signature(self):
        """Test update_animal method signature and return type."""
        pytest.skip("DatabaseService not yet implemented")


class TestDatabaseServiceImplementation:
    """Test DatabaseService implementation with mocked dependencies."""

    @pytest.fixture
    def mock_db_config(self):
        """Mock database configuration."""
        return {"host": "localhost", "user": "test_user", "database": "test_db", "password": "test_pass"}

    @pytest.fixture
    def mock_connection(self):
        """Mock database connection."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        return mock_conn, mock_cursor

    def test_get_existing_animal_found(self, mock_db_config, mock_connection):
        """Test get_existing_animal when animal exists in database."""
        from services.database_service import DatabaseService

        mock_conn, mock_cursor = mock_connection
        mock_cursor.fetchone.return_value = (123, "Test Dog", "2024-01-01")

        db_service = DatabaseService(mock_db_config)
        db_service.conn = mock_conn

        result = db_service.get_existing_animal("test-123", 1)

        assert result == (123, "Test Dog", "2024-01-01")
        mock_cursor.execute.assert_called_once_with("SELECT id, name, updated_at FROM animals WHERE external_id = %s AND organization_id = %s", ("test-123", 1))

    def test_get_existing_animal_not_found(self, mock_db_config, mock_connection):
        """Test get_existing_animal when animal doesn't exist."""
        pytest.skip("DatabaseService not yet implemented")

    def test_create_animal_success(self, mock_db_config, mock_connection):
        """Test successful animal creation."""
        pytest.skip("DatabaseService not yet implemented")

    def test_create_animal_with_standardization(self, mock_db_config, mock_connection):
        """Test animal creation with data standardization."""
        pytest.skip("DatabaseService not yet implemented")

    def test_update_animal_with_changes(self, mock_db_config, mock_connection):
        """Test animal update when changes are detected."""
        pytest.skip("DatabaseService not yet implemented")

    def test_update_animal_no_changes(self, mock_db_config, mock_connection):
        """Test animal update when no changes detected."""
        pytest.skip("DatabaseService not yet implemented")

    def test_connection_management(self, mock_db_config):
        """Test database connection and disconnection."""
        pytest.skip("DatabaseService not yet implemented")

    def test_transaction_rollback_on_error(self, mock_db_config, mock_connection):
        """Test transaction rollback when errors occur."""
        pytest.skip("DatabaseService not yet implemented")


class TestDatabaseServiceErrorHandling:
    """Test DatabaseService error handling patterns."""

    def test_connection_error_handling(self):
        """Test handling of database connection errors."""
        pytest.skip("DatabaseService not yet implemented")

    def test_query_error_recovery(self):
        """Test recovery from query execution errors."""
        pytest.skip("DatabaseService not yet implemented")

    def test_transaction_error_rollback(self):
        """Test transaction rollback on errors."""
        pytest.skip("DatabaseService not yet implemented")


# Integration tests will be added after DatabaseService is implemented
class TestDatabaseServiceIntegration:
    """Integration tests for DatabaseService with BaseScraper."""

    def test_basescraper_integration(self):
        """Test DatabaseService integration with BaseScraper."""
        pytest.skip("Integration tests pending service implementation")

    def test_existing_functionality_preserved(self):
        """Test that existing BaseScraper functionality is preserved."""
        pytest.skip("Integration tests pending service implementation")

    @pytest.mark.skip(reason="Test creates real database records and contaminates production data")
    def test_complete_scrape_log_with_detailed_metrics(self):
        """Test that complete_scrape_log can store detailed metrics, duration, and quality score."""
        # Following TDD - this test should FAIL initially
        import json
        import os

        from config import DB_CONFIG
        from services.database_service import DatabaseService

        db_service = DatabaseService(DB_CONFIG)
        db_service.connect()

        try:
            # First ensure we have an organization in the database
            from api.database.connection_pool import get_pooled_cursor

            with get_pooled_cursor() as cursor:
                # Insert a test organization if it doesn't exist
                cursor.execute(
                    """
                    INSERT INTO organizations (id, name, slug, website_url, country, city, active)
                    VALUES (999, 'Test Org for Scrape', 'test-org-scrape', 'http://test.com', 'Test', 'Test', TRUE)
                    ON CONFLICT (id) DO NOTHING
                """
                )
                cursor.connection.commit()

            # Create a scrape log
            scrape_log_id = db_service.create_scrape_log(organization_id=999)  # Use our test org
            assert scrape_log_id is not None

            # Test data for detailed metrics
            detailed_metrics = {
                "animals_found": 25,
                "animals_added": 5,
                "animals_updated": 20,
                "images_uploaded": 15,
                "images_failed": 2,
                "retry_attempts": 3,
                "retry_successes": 2,
                "phase_timings": {"data_collection": 45.2, "database_operations": 12.8},
            }
            duration_seconds = 58.3
            data_quality_score = 0.92

            # This should work but currently fails because method doesn't accept these params
            success = db_service.complete_scrape_log(
                scrape_log_id=scrape_log_id,
                status="success",
                animals_found=25,
                animals_added=5,
                animals_updated=20,
                error_message=None,
                detailed_metrics=detailed_metrics,
                duration_seconds=duration_seconds,
                data_quality_score=data_quality_score,
            )

            assert success is True

            # Verify the data was stored in database
            from api.database.connection_pool import get_pooled_cursor

            with get_pooled_cursor() as cursor:
                cursor.execute("SELECT detailed_metrics, duration_seconds, data_quality_score FROM scrape_logs WHERE id = %s", (scrape_log_id,))
                result = cursor.fetchone()

                assert result is not None
                assert result["detailed_metrics"] == detailed_metrics  # JSONB comparison
                assert abs(float(result["duration_seconds"]) - duration_seconds) < 0.1
                assert abs(float(result["data_quality_score"]) - data_quality_score) < 0.01

        finally:
            db_service.close()


@pytest.mark.slow
@pytest.mark.database
class TestDatabaseServiceWithConnectionPool:
    """Test DatabaseService using connection pool.

    Consolidated from test_database_service_pooled.py
    """

    def test_init_with_connection_pool(self):
        """Test DatabaseService initialization with connection pool."""
        from services.database_service import DatabaseService

        # Mock ConnectionPoolService
        mock_pool_service = Mock(spec=ConnectionPoolService)

        # Test initialization
        db_service = DatabaseService(db_config={"host": "localhost", "user": "test", "database": "test_db"}, connection_pool=mock_pool_service)

        # Verify pool service is stored
        assert db_service.connection_pool == mock_pool_service
        assert db_service.conn is None  # No direct connection when using pool

    def test_get_existing_animal_with_pool(self):
        """Test get_existing_animal using connection pool."""
        from services.database_service import DatabaseService

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
        from services.database_service import DatabaseService

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

        # Mock responses for slug uniqueness check and animal creation
        mock_cursor.fetchone.side_effect = [(0,), (456,)]  # First call: slug uniqueness check (0 = unique)  # Second call: INSERT RETURNING id

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

        # Verify database operations - now expects multiple calls due to slug generation
        # (1 call for slug uniqueness check + 1 call for INSERT)
        assert mock_cursor.execute.call_count >= 2
        mock_connection.commit.assert_called_once()

        # Verify result
        assert animal_id == 456
        assert action == "added"

    def test_create_scrape_log_with_pool(self):
        """Test create_scrape_log using connection pool."""
        from services.database_service import DatabaseService

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
        from services.database_service import DatabaseService

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
        from services.database_service import DatabaseService

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
        from services.database_service import DatabaseService

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
