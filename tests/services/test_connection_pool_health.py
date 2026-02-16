"""
Test suite for ConnectionPoolService health check and retry logic.

Tests _check_connection_health() and retry logic in get_connection()
to handle stale/broken database connections gracefully.
"""

from unittest.mock import MagicMock, patch

import psycopg2
import pytest

from services.connection_pool import ConnectionPoolService


@pytest.mark.unit
class TestCheckConnectionHealth:
    """Tests for _check_connection_health method."""

    @pytest.fixture
    def pool_service(self):
        """Create ConnectionPoolService with mocked pool creation."""
        with patch.object(ConnectionPoolService, "_create_pool", return_value=MagicMock()):
            return ConnectionPoolService(
                db_config={"host": "localhost", "user": "test", "database": "test_db"},
            )

    def test_healthy_connection_returns_true(self, pool_service):
        conn = MagicMock()
        conn.closed = False
        cursor = MagicMock()
        conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
        conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        assert pool_service._check_connection_health(conn) is True

    def test_closed_connection_returns_false(self, pool_service):
        conn = MagicMock()
        conn.closed = True

        assert pool_service._check_connection_health(conn) is False

    def test_none_connection_returns_false(self, pool_service):
        assert pool_service._check_connection_health(None) is False

    def test_operational_error_returns_false(self, pool_service):
        conn = MagicMock()
        conn.closed = False
        cursor = MagicMock()
        cursor.execute.side_effect = psycopg2.OperationalError("server closed connection")
        conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
        conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        assert pool_service._check_connection_health(conn) is False

    def test_interface_error_returns_false(self, pool_service):
        conn = MagicMock()
        conn.closed = False
        cursor = MagicMock()
        cursor.execute.side_effect = psycopg2.InterfaceError("connection already closed")
        conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
        conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        assert pool_service._check_connection_health(conn) is False


@pytest.mark.unit
class TestGetConnectionRetry:
    """Tests for get_connection() retry logic with stale connections."""

    @pytest.fixture
    def pool_service(self):
        """Create ConnectionPoolService with mocked pool."""
        with patch.object(ConnectionPoolService, "_create_pool", return_value=MagicMock()):
            service = ConnectionPoolService(
                db_config={"host": "localhost", "user": "test", "database": "test_db"},
            )
            return service

    def test_healthy_connection_returned_immediately(self, pool_service):
        healthy_conn = MagicMock()
        healthy_conn.closed = False
        cursor = MagicMock()
        healthy_conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
        healthy_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)
        pool_service.pool.getconn.return_value = healthy_conn

        result = pool_service.get_connection()

        assert result is healthy_conn
        pool_service.pool.getconn.assert_called_once()

    def test_stale_connection_retried_and_healthy_returned(self, pool_service):
        stale_conn = MagicMock()
        stale_conn.closed = True

        healthy_conn = MagicMock()
        healthy_conn.closed = False
        cursor = MagicMock()
        healthy_conn.cursor.return_value.__enter__ = MagicMock(return_value=cursor)
        healthy_conn.cursor.return_value.__exit__ = MagicMock(return_value=False)

        pool_service.pool.getconn.side_effect = [stale_conn, healthy_conn]

        result = pool_service.get_connection()

        assert result is healthy_conn
        assert pool_service.pool.getconn.call_count == 2
        pool_service.pool.putconn.assert_called_once_with(stale_conn, close=True)

    def test_all_retries_exhausted_raises_error(self, pool_service):
        stale_conn = MagicMock()
        stale_conn.closed = True

        pool_service.pool.getconn.return_value = stale_conn

        with pytest.raises(RuntimeError, match="after 3 attempts"):
            pool_service.get_connection()

        assert pool_service.pool.getconn.call_count == 3

    def test_pool_error_propagated(self, pool_service):
        pool_service.pool.getconn.side_effect = psycopg2.pool.PoolError("pool exhausted")

        with pytest.raises(psycopg2.pool.PoolError):
            pool_service.get_connection()
