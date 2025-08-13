# tests/api/test_connection_pool_fix.py

"""
Test suite for connection pool initialization and error handling fixes.
"""

import concurrent.futures
import threading
import time
from unittest.mock import MagicMock, patch

import psycopg2
import pytest
from fastapi.testclient import TestClient

from api.database.connection_pool import ConnectionPool, get_connection_pool, initialize_pool
from api.main import app
from api.models.errors import ErrorCode, ErrorType


class TestConnectionPoolInitialization:
    """Test connection pool initialization and race condition fixes."""

    def test_pool_singleton_pattern(self):
        """Test that ConnectionPool follows singleton pattern correctly."""
        pool1 = ConnectionPool()
        pool2 = ConnectionPool()
        assert pool1 is pool2

    def test_pool_initialization_with_retry(self):
        """Test pool initialization with retry logic."""
        with patch("api.database.connection_pool.psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            # Setup successful mock pool after first failure
            mock_pool = MagicMock()
            mock_conn = MagicMock()
            mock_cursor = MagicMock()

            # Setup mock chain for validation
            mock_pool.getconn.return_value = mock_conn
            mock_conn.cursor.return_value.__enter__ = lambda self: mock_cursor
            mock_conn.cursor.return_value.__exit__ = lambda self, *args: None
            mock_cursor.execute.return_value = None
            mock_cursor.fetchone.return_value = (1,)

            # First attempt fails, second succeeds
            mock_pool_class.side_effect = [psycopg2.OperationalError("Connection refused"), mock_pool]

            # Reset singleton state
            ConnectionPool._instance = None
            ConnectionPool._initialized = False

            pool = ConnectionPool()
            pool._pool = None  # Ensure pool is None before initialization

            with patch("api.database.connection_pool.time.sleep"):  # Speed up test
                pool.initialize(max_retries=2)

            assert pool.is_initialized()
            assert mock_pool_class.call_count == 2

    def test_pool_initialization_all_retries_fail(self):
        """Test pool initialization when all retries fail."""
        with patch("api.database.connection_pool.psycopg2.pool.ThreadedConnectionPool") as mock_pool:
            mock_pool.side_effect = psycopg2.OperationalError("Connection refused")

            # Reset singleton state
            ConnectionPool._instance = None
            ConnectionPool._initialized = False

            pool = ConnectionPool()
            pool._pool = None  # Ensure pool is None before initialization

            with patch("api.database.connection_pool.time.sleep"):  # Speed up test
                with pytest.raises(RuntimeError, match="Failed to initialize connection pool"):
                    pool.initialize(max_retries=2)

            assert not pool.is_initialized()
            assert ConnectionPool._initialization_error is not None

    def test_concurrent_pool_initialization(self):
        """Test that concurrent initialization attempts don't cause race conditions."""
        with patch("api.database.connection_pool.psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            # Setup successful mock pool
            mock_pool = MagicMock()
            mock_conn = MagicMock()
            mock_cursor = MagicMock()

            # Setup mock chain for validation
            mock_pool.getconn.return_value = mock_conn
            mock_conn.cursor.return_value.__enter__ = lambda self: mock_cursor
            mock_conn.cursor.return_value.__exit__ = lambda self, *args: None
            mock_cursor.execute.return_value = None
            mock_cursor.fetchone.return_value = (1,)

            mock_pool_class.return_value = mock_pool

            # Reset singleton for test
            ConnectionPool._instance = None
            ConnectionPool._initialized = False

            results = []
            errors = []

            def init_pool():
                try:
                    pool = ConnectionPool()  # Get singleton instance
                    if not pool.is_initialized():
                        pool.initialize()
                    results.append(pool)
                except Exception as e:
                    errors.append(e)

            # Create multiple threads trying to initialize simultaneously
            threads = []
            for _ in range(10):
                thread = threading.Thread(target=init_pool)
                threads.append(thread)
                thread.start()

            for thread in threads:
                thread.join()

            # All should get the same instance
            assert len(set(results)) == 1
            assert len(errors) == 0
            # Pool should only be created once (maybe multiple attempts but only one success)
            assert ConnectionPool._initialized


class TestConnectionPoolHealthEndpoint:
    """Test the pool health monitoring endpoint."""

    def test_pool_health_when_active(self):
        """Test health endpoint when pool is active."""
        with patch("api.database.get_connection_pool") as mock_get_pool:
            mock_pool = MagicMock()
            mock_pool.get_pool_status.return_value = {
                "status": "active",
                "initialized": True,
                "min_connections": 2,
                "max_connections": 20,
            }
            mock_get_pool.return_value = mock_pool

            client = TestClient(app)
            response = client.get("/health/database/pool")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["pool"]["status"] == "active"

    def test_pool_health_when_not_initialized(self):
        """Test health endpoint when pool is not initialized."""
        with patch("api.database.get_connection_pool") as mock_get_pool:
            mock_pool = MagicMock()
            mock_pool.get_pool_status.return_value = {"status": "not_initialized", "initialized": False, "has_pool": False, "initialization_error": "Connection refused"}
            mock_get_pool.return_value = mock_pool

            client = TestClient(app)
            response = client.get("/health/database/pool")

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "unhealthy"
            assert data["pool"]["initialization_error"] == "Connection refused"


class TestStructuredErrorResponses:
    """Test structured error responses from API."""

    def test_pool_not_initialized_error_structure(self):
        """Test that pool not initialized errors return structured format."""
        # Patch the function that get_pooled_db_cursor calls internally
        with patch("api.dependencies.get_pooled_cursor") as mock_cursor:
            mock_cursor.side_effect = RuntimeError("Connection pool not initialized")

            client = TestClient(app)
            response = client.get("/api/animals/")

            assert response.status_code == 503
            data = response.json()

            # Check structured error format - errors are nested under "detail"
            assert "detail" in data
            error = data["detail"]
            assert "type" in error
            assert "code" in error
            assert "message" in error
            assert error["code"] == ErrorCode.POOL_NOT_INITIALIZED.value
            assert error["type"] == ErrorType.DATABASE_CONNECTION.value
            assert "retry" in error
            assert error["retry"]["suggested"] is True

    def test_pool_exhausted_error_structure(self):
        """Test that pool exhausted errors return structured format."""
        # Patch the function that get_pooled_db_cursor calls internally
        with patch("api.dependencies.get_pooled_cursor") as mock_cursor:
            mock_cursor.side_effect = RuntimeError("Could not get connection from pool - pool may be exhausted")

            client = TestClient(app)
            response = client.get("/api/animals/")

            assert response.status_code == 503
            data = response.json()

            # Check structured error format - errors are nested under "detail"
            assert "detail" in data
            error = data["detail"]
            assert error["code"] == ErrorCode.POOL_EXHAUSTED.value
            assert "too many concurrent requests" in error["detail"]
            assert error["retry"]["suggested"] is True


class TestLifespanHandler:
    """Test FastAPI lifespan handler for pool initialization."""

    @pytest.mark.asyncio
    async def test_lifespan_initializes_pool(self):
        """Test that lifespan handler initializes pool on startup."""
        with patch("api.main.initialize_pool") as mock_init:
            mock_init.return_value = None

            # Import lifespan after patching
            from api.main import lifespan

            app_mock = MagicMock()
            async with lifespan(app_mock):
                # Pool should be initialized
                mock_init.assert_called_once_with(max_retries=3)

    @pytest.mark.asyncio
    async def test_lifespan_handles_initialization_failure(self):
        """Test that app starts even if pool initialization fails."""
        with patch("api.main.initialize_pool") as mock_init:
            mock_init.side_effect = RuntimeError("Database unavailable")

            from api.main import lifespan

            app_mock = MagicMock()
            # Should not raise, just log the error
            async with lifespan(app_mock):
                mock_init.assert_called_once()

    @pytest.mark.asyncio
    async def test_lifespan_closes_pool_on_shutdown(self):
        """Test that lifespan handler closes pool on shutdown."""
        with patch("api.main.initialize_pool"):
            with patch("api.database.get_connection_pool") as mock_get_pool:
                mock_pool = MagicMock()
                mock_get_pool.return_value = mock_pool

                from api.main import lifespan

                app_mock = MagicMock()
                async with lifespan(app_mock):
                    pass

                # Pool should be closed on exit
                mock_pool.close_all.assert_called_once()


class TestRetryLogic:
    """Test retry logic and exponential backoff."""

    def test_exponential_backoff_calculation(self):
        """Test that retry delays follow exponential backoff."""
        pool = ConnectionPool()
        pool._base_retry_delay = 1

        # Test delay calculation for different attempts
        delays = []
        for attempt in range(1, 4):
            delay = pool._base_retry_delay * (2 ** (attempt - 1))
            delays.append(delay)

        assert delays == [1, 2, 4]  # Exponential backoff

    def test_pool_validation_after_creation(self):
        """Test that pool validates connections after creation."""
        with patch("api.database.connection_pool.psycopg2.pool.ThreadedConnectionPool") as mock_pool_class:
            mock_pool = MagicMock()
            mock_conn = MagicMock()
            mock_cursor = MagicMock()

            # Setup mock chain
            mock_pool.getconn.return_value = mock_conn
            mock_conn.cursor.return_value.__enter__ = lambda self: mock_cursor
            mock_conn.cursor.return_value.__exit__ = lambda self, *args: None
            mock_cursor.execute.return_value = None
            mock_cursor.fetchone.return_value = (1,)

            mock_pool_class.return_value = mock_pool

            # Reset singleton state
            ConnectionPool._instance = None
            ConnectionPool._initialized = False

            pool = ConnectionPool()
            pool._pool = None  # Ensure pool is None before initialization
            pool.initialize()

            # Should have validated with SELECT 1
            mock_cursor.execute.assert_called_with("SELECT 1")
            mock_cursor.fetchone.assert_called_once()
