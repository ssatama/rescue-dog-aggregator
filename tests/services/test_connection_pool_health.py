"""
Test suite for ConnectionPoolService health check and retry logic.

Tests _check_connection_health() and retry logic in get_connection()
to handle stale/broken database connections gracefully.
"""

from unittest.mock import MagicMock, patch

import psycopg2
import pytest

from services.connection_pool import CONNECT_TIMEOUT, ConnectionPoolService


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


CONNECT_FAILED = psycopg2.OperationalError('connection to server at "postgres.railway.internal", port 5432 failed: server closed the connection unexpectedly')
BAD_PASSWORD = psycopg2.OperationalError('connection to server failed: FATAL:  password authentication failed for user "scraper"')


@pytest.mark.unit
class TestAFailedConnectIsRetried:
    """#632: the scraper pool had neither of #625's fixes for a dropped handshake."""

    @pytest.fixture
    def pool_service(self):
        with patch.object(ConnectionPoolService, "_create_pool", return_value=MagicMock()):
            return ConnectionPoolService(db_config={"host": "localhost", "user": "test", "database": "test_db"})

    def test_a_failed_connect_then_a_healthy_one_succeeds(self, pool_service, stub_clock):
        healthy_conn = MagicMock()
        healthy_conn.closed = False
        pool_service.pool.getconn.side_effect = [CONNECT_FAILED, healthy_conn]

        assert pool_service.get_connection() is healthy_conn
        assert len(stub_clock.calls) == 1

    def test_a_database_that_never_answers_raises_the_connect_error(self, pool_service, stub_clock):
        pool_service.pool.getconn.side_effect = CONNECT_FAILED

        with pytest.raises(psycopg2.OperationalError) as exc_info:
            pool_service.get_connection()

        assert exc_info.value is CONNECT_FAILED
        assert pool_service.pool.getconn.call_count == 3

    def test_a_permanent_connect_error_is_not_retried(self, pool_service, stub_clock):
        pool_service.pool.getconn.side_effect = BAD_PASSWORD

        with pytest.raises(psycopg2.OperationalError):
            pool_service.get_connection()

        assert pool_service.pool.getconn.call_count == 1
        assert stub_clock.calls == []


@pytest.mark.unit
def test_the_scraper_pool_connects_with_a_timeout():
    """An unanswered connect must fail fast instead of hanging a scraper run."""
    with patch("services.connection_pool.psycopg2.pool.ThreadedConnectionPool") as threaded_pool:
        ConnectionPoolService(db_config={"host": "localhost", "user": "test", "database": "test_db"})

    assert threaded_pool.call_args.kwargs["connect_timeout"] == CONNECT_TIMEOUT


@pytest.mark.unit
def test_the_scraper_pool_retries_a_connect_dropped_while_it_is_built(stub_clock):
    """The constructor opens min_connections connections, outside get_connection's retry (#637 review)."""
    with patch("psycopg2.connect", side_effect=[CONNECT_FAILED, MagicMock(closed=0), MagicMock(closed=0)]) as connect:
        ConnectionPoolService(db_config={"host": "localhost", "user": "test", "database": "test_db"}, min_connections=2)

    assert connect.call_count == 3
