"""
Test suite for connection pool migration in services/session_manager.py

Tests SessionManager using connection pool instead of direct connections.
"""

from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from services.connection_pool import ConnectionPoolService
from services.session_manager import SessionManager


@pytest.mark.slow
@pytest.mark.database
class TestSessionManagerWithConnectionPool:
    """Test SessionManager using connection pool."""

    def test_init_with_connection_pool(self):
        """Test SessionManager initialization with connection pool."""
        # Mock ConnectionPoolService
        mock_pool_service = Mock(spec=ConnectionPoolService)

        # Test initialization
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Verify pool service is stored
        assert session_manager.connection_pool == mock_pool_service
        assert session_manager.conn is None  # No direct connection when using pool

    def test_mark_animal_as_seen_with_pool(self):
        """Test mark_animal_as_seen using connection pool."""
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

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Set current session
        session_manager.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

        # Test
        result = session_manager.mark_animal_as_seen(123)

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database operations
        mock_cursor.execute.assert_called_once()
        mock_connection.commit.assert_called_once()

        # Verify result
        assert result is True

    def test_update_stale_data_detection_with_pool(self):
        """Test update_stale_data_detection using connection pool."""
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
        mock_cursor.rowcount = 5  # 5 animals updated

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Set current session
        session_manager.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

        # Test
        result = session_manager.update_stale_data_detection()

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database operations
        mock_cursor.execute.assert_called_once()
        mock_connection.commit.assert_called_once()

        # Verify result
        assert result is True

    def test_detect_partial_failure_with_pool(self):
        """Test detect_partial_failure using connection pool."""
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
        mock_cursor.fetchone.return_value = (50.0, 5)  # Average of 50 animals, 5 historical scrapes

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Test with normal count (not a failure)
        result = session_manager.detect_partial_failure(45)

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database query
        mock_cursor.execute.assert_called_once()

        # Should not detect failure (45 > 50 * 0.5 = 25)
        assert result is False

    def test_get_stale_animals_summary_with_pool(self):
        """Test get_stale_animals_summary using connection pool."""
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
        mock_cursor.fetchall.return_value = [("high", "available", 10), ("medium", "available", 5), ("low", "unavailable", 2)]

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Test
        result = session_manager.get_stale_animals_summary()

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database query
        mock_cursor.execute.assert_called_once()

        # Verify result
        expected = {("high", "available"): 10, ("medium", "available"): 5, ("low", "unavailable"): 2}
        assert result == expected

    def test_fallback_to_direct_connection_when_no_pool(self):
        """Test SessionManager falls back to direct connection when no pool provided."""
        # Mock successful database connection
        mock_connection = Mock()

        with patch("psycopg2.connect", return_value=mock_connection):
            # Create SessionManager without pool
            session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1)

            # Test connect method
            result = session_manager.connect()

            # Verify direct connection was established
            assert result is True
            assert session_manager.conn == mock_connection
            assert session_manager.connection_pool is None

    def test_connection_pool_error_handling(self):
        """Test error handling when connection pool operations fail."""
        # Mock ConnectionPoolService with error
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_pool_service.get_connection_context.side_effect = Exception("Pool error")

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Set current session
        session_manager.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

        # Test mark_animal_as_seen with pool error
        result = session_manager.mark_animal_as_seen(123)

        # Verify error is handled gracefully
        assert result is False
        mock_pool_service.get_connection_context.assert_called_once()

    def test_backward_compatibility_with_existing_usage(self):
        """Test that existing code using SessionManager continues to work."""
        # Mock successful database connection
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor

        with patch("psycopg2.connect", return_value=mock_connection):
            # Create SessionManager in legacy mode (no pool)
            session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1)

            # Connect using legacy method
            session_manager.connect()
            session_manager.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

            # Test existing method still works
            result = session_manager.mark_animal_as_seen(123)

            # Verify legacy functionality preserved
            assert result is True
            assert session_manager.conn == mock_connection
            mock_cursor.execute.assert_called_once()
            mock_connection.commit.assert_called_once()
