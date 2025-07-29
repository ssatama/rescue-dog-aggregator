# api/database/connection_pool.py

"""
Database connection pool manager for improved performance.

This module provides connection pooling to reduce connection overhead
and improve database performance for high-traffic scenarios.
"""

import logging
import threading
from contextlib import contextmanager
from typing import Generator, Optional

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

from config import DB_CONFIG

logger = logging.getLogger(__name__)


class ConnectionPool:
    """Thread-safe connection pool manager."""

    _instance: Optional["ConnectionPool"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "ConnectionPool":
        """Singleton pattern for global connection pool."""
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        """Initialize the connection pool if not already initialized."""
        if hasattr(self, "_initialized"):
            return

        self._initialized = True
        self._pool = None
        self._create_pool()

    def _create_pool(self):
        """Create the connection pool with configuration."""
        try:
            # Build connection parameters
            conn_params = {
                "host": DB_CONFIG["host"],
                "user": DB_CONFIG["user"],
                "database": DB_CONFIG["database"],
            }
            if DB_CONFIG["password"]:
                conn_params["password"] = DB_CONFIG["password"]

            # Create threaded connection pool
            self._pool = psycopg2.pool.ThreadedConnectionPool(minconn=2, maxconn=20, **conn_params)  # Minimum connections  # Maximum connections

            logger.info(f"Connection pool created: min=2, max=20, database={DB_CONFIG['database']}")

        except Exception as e:
            logger.error(f"Failed to create connection pool: {e}")
            raise

    @contextmanager
    def get_connection(self) -> Generator[psycopg2.extensions.connection, None, None]:
        """Get a connection from the pool."""
        conn = None
        try:
            if self._pool is None:
                raise RuntimeError("Connection pool not initialized")

            conn = self._pool.getconn()
            if conn is None:
                raise RuntimeError("Could not get connection from pool")

            logger.debug(f"Connection acquired from pool: {id(conn)}")
            yield conn

            # Commit transaction on success
            conn.commit()

        except Exception as e:
            if conn:
                conn.rollback()
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

    def get_pool_status(self) -> dict:
        """Get current pool status for monitoring."""
        if not self._pool:
            return {"status": "not_initialized"}

        # Note: psycopg2 ThreadedConnectionPool doesn't expose these stats directly
        # This is a simplified version for monitoring
        return {
            "status": "active",
            "min_connections": 2,
            "max_connections": 20,
            "pool_type": "ThreadedConnectionPool",
        }


# Global connection pool instance (lazy loaded)
_connection_pool = None


def get_connection_pool() -> ConnectionPool:
    """Get the global connection pool instance."""
    global _connection_pool
    if _connection_pool is None:
        _connection_pool = ConnectionPool()
    return _connection_pool


@contextmanager
def get_pooled_connection():
    """Context manager for getting a pooled database connection."""
    pool = get_connection_pool()  # This will create pool on first use
    with pool.get_connection() as conn:
        yield conn


@contextmanager
def get_pooled_cursor():
    """Context manager for getting a cursor from the connection pool."""
    pool = get_connection_pool()  # This will create pool on first use
    with pool.get_cursor() as cursor:
        yield cursor
