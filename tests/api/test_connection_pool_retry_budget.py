"""The retry budgets in _acquire_connection_with_retry.

Two production defects (Sentry PYTHON-FASTAPI-2R / -2Q / -2S, 17 events each):
a couple of stale connections could spend the whole retry budget and fail the
request with `last_error = None`, and the exhaustion error was a bare
RuntimeError whose message no substring branch in the dependency matched, so
every exhaustion answered 500 instead of 503.
"""

from unittest.mock import MagicMock

import pytest
from psycopg2 import pool as psycopg2_pool

from api.database.connection_pool import (
    POOL_ACQUIRE_RETRIES,
    POOL_STALE_CONNECTION_RETRIES,
    ConnectionPool,
    PoolExhaustedError,
)


def make_pool(getconn_side_effect) -> ConnectionPool:
    """Build a ConnectionPool around a mocked psycopg2 pool, bypassing __init__."""
    instance = ConnectionPool.__new__(ConnectionPool)
    instance._pool = MagicMock()
    instance._pool.getconn.side_effect = getconn_side_effect
    return instance


def healthy_connection() -> MagicMock:
    conn = MagicMock()
    conn.closed = False
    conn.cursor.return_value.__enter__.return_value = MagicMock()
    conn.cursor.return_value.__exit__.return_value = False
    return conn


def stale_connection() -> MagicMock:
    conn = MagicMock()
    conn.closed = True
    return conn


@pytest.mark.unit
class TestStaleConnectionsDoNotSpendTheExhaustionBudget:
    def test_stale_connections_then_a_healthy_one_succeeds(self):
        healthy = healthy_connection()
        connection_pool = make_pool([stale_connection(), stale_connection(), healthy])

        assert connection_pool._acquire_connection_with_retry() is healthy

    def test_stale_discards_leave_the_exhaustion_budget_intact(self, stub_clock):
        healthy = healthy_connection()
        exhausted = psycopg2_pool.PoolError("connection pool exhausted")
        connection_pool = make_pool([stale_connection(), stale_connection(), *[exhausted] * (POOL_ACQUIRE_RETRIES - 1), healthy])

        # Every stale discard used to consume an attempt, so two dead
        # connections left one retry for the burst and the request failed with
        # "after 3 retries: None" - no error, because no PoolError was ever hit.
        assert connection_pool._acquire_connection_with_retry() is healthy
        assert stub_clock.calls == [0.1, 0.2, 0.4, 0.8]

    def test_an_unreachable_database_stops_instead_of_looping(self):
        connection_pool = make_pool(lambda: stale_connection())

        with pytest.raises(PoolExhaustedError) as exc_info:
            connection_pool._acquire_connection_with_retry()

        assert "stale" in str(exc_info.value)
        assert connection_pool._pool.getconn.call_count == POOL_STALE_CONNECTION_RETRIES


@pytest.mark.unit
class TestExhaustion:
    def test_raises_a_typed_error_the_dependency_can_match(self):
        connection_pool = make_pool(psycopg2_pool.PoolError("connection pool exhausted"))

        with pytest.raises(PoolExhaustedError) as exc_info:
            connection_pool._acquire_connection_with_retry()

        # The old message ended in "None" because last_error was never carried.
        assert "connection pool exhausted" in str(exc_info.value)

    def test_spends_every_attempt_with_exponential_backoff(self, stub_clock):
        connection_pool = make_pool(psycopg2_pool.PoolError("connection pool exhausted"))

        with pytest.raises(PoolExhaustedError):
            connection_pool._acquire_connection_with_retry()

        assert connection_pool._pool.getconn.call_count == POOL_ACQUIRE_RETRIES
        assert stub_clock.calls == [0.1, 0.2, 0.4, 0.8]

    def test_budget_is_wide_enough_to_outlast_a_burst(self, stub_clock):
        """0.3s of retries failed requests that a one-second burst would have cleared."""
        connection_pool = make_pool(psycopg2_pool.PoolError("connection pool exhausted"))

        with pytest.raises(PoolExhaustedError):
            connection_pool._acquire_connection_with_retry()

        assert sum(stub_clock.calls) >= 1.0

    def test_a_burst_that_clears_is_served(self, stub_clock):
        healthy = healthy_connection()
        connection_pool = make_pool([psycopg2_pool.PoolError("connection pool exhausted"), psycopg2_pool.PoolError("connection pool exhausted"), healthy])

        assert connection_pool._acquire_connection_with_retry() is healthy
