"""The cron's DatabaseConnectionPool retries a dropped connect and connects with a timeout (#637)."""

from unittest.mock import MagicMock, patch

import psycopg2
import pytest

from services.connection_pool import CONNECT_TIMEOUT
from utils.db_connection import DatabaseConfig, DatabaseConnectionPool

CONNECT_FAILED = psycopg2.OperationalError('connection to server at "postgres.railway.internal", port 5432 failed: server closed the connection unexpectedly')
BAD_PASSWORD = psycopg2.OperationalError('connection to server failed: FATAL:  password authentication failed for user "cron"')


def make_pool(getconn_side_effect) -> DatabaseConnectionPool:
    db_pool = DatabaseConnectionPool(DatabaseConfig(host="localhost", user="test", database="test_db"))
    db_pool._pool = MagicMock()
    db_pool._pool.getconn.side_effect = getconn_side_effect
    return db_pool


@pytest.mark.unit
class TestAFailedConnectIsRetried:
    def test_a_failed_connect_then_a_good_one_succeeds(self, stub_clock):
        conn = MagicMock()
        db_pool = make_pool([CONNECT_FAILED, conn])

        with db_pool.get_connection() as got:
            assert got is conn

        assert len(stub_clock.calls) == 1
        db_pool._pool.putconn.assert_called_once_with(conn)

    def test_a_database_that_never_answers_raises_the_connect_error(self, stub_clock):
        db_pool = make_pool(CONNECT_FAILED)

        with pytest.raises(psycopg2.OperationalError) as exc_info, db_pool.get_connection():
            pass

        assert exc_info.value is CONNECT_FAILED
        assert db_pool._pool.getconn.call_count == 3
        db_pool._pool.putconn.assert_not_called()

    def test_a_permanent_connect_error_is_not_retried(self, stub_clock):
        db_pool = make_pool(BAD_PASSWORD)

        with pytest.raises(psycopg2.OperationalError), db_pool.get_connection():
            pass

        assert db_pool._pool.getconn.call_count == 1
        assert stub_clock.calls == []


@pytest.mark.unit
def test_the_cron_pool_connects_with_a_timeout():
    db_pool = DatabaseConnectionPool(DatabaseConfig(host="localhost", user="test", database="test_db"))

    with patch("utils.db_connection.pool.ThreadedConnectionPool") as threaded_pool:
        db_pool._create_pool()

    assert threaded_pool.call_args.kwargs["connect_timeout"] == CONNECT_TIMEOUT


@pytest.mark.unit
def test_the_first_connect_is_retried_too(stub_clock):
    """Review of #639: ThreadedConnectionPool opened minconn connections in its
    constructor, outside the retry, and in the cron that first connect is
    nearly the only one (each call hands its connection back)."""
    conn = MagicMock(closed=0)
    db_pool = DatabaseConnectionPool(DatabaseConfig(host="localhost", user="test", database="test_db"))

    with patch("psycopg2.connect", side_effect=[CONNECT_FAILED, conn]) as connect, db_pool.get_connection() as got:
        assert got is conn

    assert connect.call_count == 2


@pytest.mark.unit
def test_a_returned_connection_is_reused(stub_clock):
    """Round-2 review of #639: min_conn 0 made psycopg2 close every returned connection."""
    conn = MagicMock(closed=0)
    db_pool = DatabaseConnectionPool(DatabaseConfig(host="localhost", user="test", database="test_db"))

    with patch("psycopg2.connect", return_value=conn) as connect:
        with db_pool.get_connection():
            pass
        with db_pool.get_connection():
            pass

    assert connect.call_count == 1
    conn.close.assert_not_called()
