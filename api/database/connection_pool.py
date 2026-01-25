# api/database/connection_pool.py

"""
Database connection pool manager for improved performance.

This module provides connection pooling to reduce connection overhead
and improve database performance for high-traffic scenarios.

Pool Configuration:
- minconn: 5 (warm connections ready for immediate use)
- maxconn: 50 (handles traffic bursts without exhaustion)
- Retry logic with exponential backoff when pool is temporarily exhausted
"""

import logging
import os
import threading
import time
from collections.abc import Generator
from contextlib import contextmanager
from typing import Optional

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from config import DB_CONFIG

logger = logging.getLogger(__name__)

POOL_MIN_CONN = int(os.getenv("DB_POOL_MIN_CONN", "5"))
POOL_MAX_CONN = int(os.getenv("DB_POOL_MAX_CONN", "50"))
POOL_ACQUIRE_RETRIES = int(os.getenv("DB_POOL_ACQUIRE_RETRIES", "3"))
POOL_ACQUIRE_RETRY_DELAY = float(os.getenv("DB_POOL_ACQUIRE_RETRY_DELAY", "0.1"))


class ConnectionPool:
    """Thread-safe connection pool manager with proper initialization."""

    _instance: Optional["ConnectionPool"] = None
    _lock = threading.Lock()
    _initialization_lock = threading.Lock()
    _initialized = False
    _initialization_error: Exception | None = None

    def __new__(cls) -> "ConnectionPool":
        """Singleton pattern with thread-safe initialization."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the connection pool if not already initialized."""
        # Use a separate initialization lock to prevent race conditions
        with self._initialization_lock:
            if ConnectionPool._initialized:
                return

            self._pool = None
            self._retry_count = 0
            self._max_retries = 3
            self._base_retry_delay = 1  # seconds

            # Don't auto-initialize here - wait for explicit initialization
            logger.info("ConnectionPool instance created, awaiting initialization")

    def initialize(self, max_retries: int = 3) -> None:
        """
        Explicitly initialize the connection pool with retry logic.

        Args:
            max_retries: Maximum number of initialization attempts

        Raises:
            Exception: If initialization fails after all retries
        """
        with self._initialization_lock:
            if ConnectionPool._initialized and self._pool is not None:
                logger.info("Connection pool already initialized")
                return

            self._max_retries = max_retries
            last_error = None

            for attempt in range(1, self._max_retries + 1):
                try:
                    logger.info(f"Attempting to initialize connection pool (attempt {attempt}/{self._max_retries})")
                    self._create_pool()
                    self._validate_pool()
                    ConnectionPool._initialized = True
                    ConnectionPool._initialization_error = None
                    logger.info(f"Connection pool initialized successfully on attempt {attempt}")
                    return
                except Exception as e:
                    last_error = e
                    logger.error(f"Pool initialization attempt {attempt} failed: {e}")

                    if attempt < self._max_retries:
                        retry_delay = self._base_retry_delay * (2 ** (attempt - 1))  # Exponential backoff
                        logger.info(f"Retrying in {retry_delay} seconds...")
                        time.sleep(retry_delay)

            # All retries failed
            ConnectionPool._initialization_error = last_error
            error_msg = f"Failed to initialize connection pool after {self._max_retries} attempts: {last_error}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    def _create_pool(self):
        """Create the connection pool with configuration."""
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
            "port": DB_CONFIG.get("port", 5432),
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        self._pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=POOL_MIN_CONN,
            maxconn=POOL_MAX_CONN,
            **conn_params,
        )

        logger.info(f"Connection pool created: min={POOL_MIN_CONN}, max={POOL_MAX_CONN}, database={DB_CONFIG['database']}")

    def _validate_pool(self):
        """Validate that the pool can provide working connections."""
        test_conn = None
        try:
            test_conn = self._pool.getconn()
            if test_conn is None:
                raise RuntimeError("Pool returned None connection")

            # Test the connection with a simple query
            with test_conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                if result[0] != 1:
                    raise RuntimeError("Connection validation query failed")

            logger.info("Connection pool validation successful")
        finally:
            if test_conn and self._pool:
                self._pool.putconn(test_conn)

    def _check_connection_health(self, conn: psycopg2.extensions.connection) -> bool:
        """
        Check if a connection is still alive and usable.

        Returns True if connection is healthy, False if it's stale/closed.
        """
        if conn is None or conn.closed:
            return False

        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            return True
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            return False

    def _acquire_connection_with_retry(self) -> psycopg2.extensions.connection:
        """Acquire a connection with retry logic for pool exhaustion and stale connections."""
        last_error = None

        for attempt in range(POOL_ACQUIRE_RETRIES):
            try:
                conn = self._pool.getconn()
                if conn is None:
                    raise pool.PoolError("Pool returned None connection")

                if not self._check_connection_health(conn):
                    logger.warning(f"Stale connection detected, returning to pool and retrying (attempt {attempt + 1})")
                    try:
                        self._pool.putconn(conn, close=True)
                    except Exception:
                        pass
                    continue

                if attempt > 0:
                    logger.info(f"Connection acquired after {attempt + 1} attempts")
                return conn
            except pool.PoolError as e:
                last_error = e
                if attempt < POOL_ACQUIRE_RETRIES - 1:
                    delay = POOL_ACQUIRE_RETRY_DELAY * (2**attempt)
                    logger.warning(f"Pool exhausted, retrying in {delay:.2f}s (attempt {attempt + 1}/{POOL_ACQUIRE_RETRIES})")
                    time.sleep(delay)

        logger.error(f"Failed to acquire connection after {POOL_ACQUIRE_RETRIES} retries: {last_error}")
        raise RuntimeError(f"Connection pool exhausted after {POOL_ACQUIRE_RETRIES} retries")

    @contextmanager
    def get_connection(self) -> Generator[psycopg2.extensions.connection, None, None]:
        """Get a connection from the pool with retry on exhaustion."""
        conn = None
        try:
            if not ConnectionPool._initialized or self._pool is None:
                if ConnectionPool._initialization_error:
                    raise RuntimeError(f"Connection pool initialization failed: {ConnectionPool._initialization_error}")
                raise RuntimeError("Connection pool not initialized. Call initialize() first.")

            conn = self._acquire_connection_with_retry()
            logger.debug(f"Connection acquired from pool: {id(conn)}")
            yield conn
            conn.commit()

        except Exception as e:
            if conn:
                conn.rollback()
            from fastapi import HTTPException

            if not isinstance(e, HTTPException):
                logger.error(f"Error with pooled connection: {e}")
            raise
        finally:
            if conn and self._pool:
                self._pool.putconn(conn)
                logger.debug(f"Connection returned to pool: {id(conn)}")

    @contextmanager
    def get_cursor(self) -> Generator[RealDictCursor, None, None]:
        """Get a cursor from a pooled connection."""
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            try:
                logger.debug(f"Cursor created from pooled connection: {id(cursor)}")
                yield cursor
            finally:
                cursor.close()
                logger.debug(f"Cursor closed: {id(cursor)}")

    def close_all(self):
        """Close all connections in the pool."""
        if self._pool:
            self._pool.closeall()
            logger.info("All connections in pool closed")
            ConnectionPool._initialized = False
            self._pool = None

    def get_pool_status(self) -> dict:
        """Get current pool status for monitoring."""
        if not ConnectionPool._initialized or not self._pool:
            return {
                "status": "not_initialized",
                "initialized": ConnectionPool._initialized,
                "has_pool": self._pool is not None,
                "initialization_error": str(ConnectionPool._initialization_error) if ConnectionPool._initialization_error else None,
            }

        return {
            "status": "active",
            "initialized": True,
            "min_connections": POOL_MIN_CONN,
            "max_connections": POOL_MAX_CONN,
            "acquire_retries": POOL_ACQUIRE_RETRIES,
            "acquire_retry_delay": POOL_ACQUIRE_RETRY_DELAY,
            "pool_type": "ThreadedConnectionPool",
        }

    def is_initialized(self) -> bool:
        """Check if the pool is initialized and ready."""
        return ConnectionPool._initialized and self._pool is not None


# Global connection pool instance (lazy loaded)
_connection_pool = None


def get_connection_pool() -> ConnectionPool:
    """Get the global connection pool instance."""
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = ConnectionPool()
    return _connection_pool


def initialize_pool(max_retries: int = 3) -> None:
    """Initialize the global connection pool with retry logic."""
    pool = get_connection_pool()
    pool.initialize(max_retries=max_retries)


@contextmanager
def get_pooled_connection():
    """Context manager for getting a pooled database connection."""
    pool = get_connection_pool()
    with pool.get_connection() as conn:
        yield conn


@contextmanager
def get_pooled_cursor():
    """Context manager for getting a cursor from the connection pool."""
    pool = get_connection_pool()
    with pool.get_cursor() as cursor:
        yield cursor
