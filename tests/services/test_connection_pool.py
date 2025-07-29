"""
Test suite for services/connection_pool.py

Tests connection pool creation, lifecycle management, and thread safety.
"""

from unittest.mock import Mock, patch

import psycopg2
import psycopg2.pool
import pytest

from services.connection_pool import ConnectionPoolService


@pytest.mark.slow
@pytest.mark.database
class TestConnectionPoolService:
    """Test connection pool service functionality."""

    def test_connection_pool_creation(self):
        """Test connection pool creation with valid configuration."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db", "password": "secret"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_pool_class.return_value = mock_pool

            pool_service = ConnectionPoolService(db_config, min_connections=2, max_connections=10)

            # Verify pool was created with correct parameters
            mock_pool_class.assert_called_once_with(2, 10, host="localhost", user="test", database="test_db", password="secret")
            assert pool_service.pool == mock_pool

    def test_connection_pool_creation_no_password(self):
        """Test connection pool creation without password."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db", "password": ""}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_pool_class.return_value = mock_pool

            ConnectionPoolService(db_config, min_connections=1, max_connections=5)

            # Verify pool was created without password parameter
            mock_pool_class.assert_called_once_with(1, 5, host="localhost", user="test", database="test_db")

    def test_get_connection_success(self):
        """Test successful connection acquisition from pool."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_connection = Mock()
            mock_pool.getconn.return_value = mock_connection
            mock_pool_class.return_value = mock_pool

            pool_service = ConnectionPoolService(db_config)
            connection = pool_service.get_connection()

            # Verify connection returned from pool
            mock_pool.getconn.assert_called_once()
            assert connection == mock_connection

    def test_return_connection(self):
        """Test returning connection to pool."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_connection = Mock()
            mock_pool_class.return_value = mock_pool

            pool_service = ConnectionPoolService(db_config)
            pool_service.return_connection(mock_connection)

            # Verify connection returned to pool
            mock_pool.putconn.assert_called_once_with(mock_connection, close=False)

    def test_return_connection_with_error(self):
        """Test returning connection to pool when connection has error."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_connection = Mock()
            mock_pool_class.return_value = mock_pool

            pool_service = ConnectionPoolService(db_config)
            pool_service.return_connection(mock_connection, close=True)

            # Verify connection returned to pool with close flag
            mock_pool.putconn.assert_called_once_with(mock_connection, close=True)

    def test_close_all_connections(self):
        """Test closing all connections in pool."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_pool_class.return_value = mock_pool

            pool_service = ConnectionPoolService(db_config)
            pool_service.close_all()

            # Verify all connections closed
            mock_pool.closeall.assert_called_once()

    def test_context_manager_success(self):
        """Test context manager for automatic connection management."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_connection = Mock()
            mock_pool.getconn.return_value = mock_connection
            mock_pool_class.return_value = mock_pool

            pool_service = ConnectionPoolService(db_config)

            with pool_service.get_connection_context() as connection:
                assert connection == mock_connection

            # Verify connection was returned to pool
            mock_pool.putconn.assert_called_once_with(mock_connection, close=False)

    def test_context_manager_with_exception(self):
        """Test context manager returns connection even when exception occurs."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_connection = Mock()
            mock_pool.getconn.return_value = mock_connection
            mock_pool_class.return_value = mock_pool

            pool_service = ConnectionPoolService(db_config)

            try:
                with pool_service.get_connection_context() as connection:
                    assert connection == mock_connection
                    raise ValueError("Test exception")
            except ValueError:
                pass

            # Verify connection was returned to pool despite exception
            mock_pool.putconn.assert_called_once_with(mock_connection, close=False)

    def test_pool_creation_failure(self):
        """Test handling of pool creation failure."""
        db_config = {"host": "invalid", "user": "test", "database": "test_db"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool_class.side_effect = psycopg2.OperationalError("Connection failed")

            with pytest.raises(psycopg2.OperationalError):
                ConnectionPoolService(db_config)

    def test_connection_acquisition_failure(self):
        """Test handling of connection acquisition failure."""
        db_config = {"host": "localhost", "user": "test", "database": "test_db"}

        with patch("psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = Mock()
            mock_pool.getconn.side_effect = psycopg2.pool.PoolError("Pool exhausted")
            mock_pool_class.return_value = mock_pool

            pool_service = ConnectionPoolService(db_config)

            with pytest.raises(psycopg2.pool.PoolError):
                pool_service.get_connection()
