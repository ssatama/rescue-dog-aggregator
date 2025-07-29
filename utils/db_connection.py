"""
Secure database connection management with connection pooling.
Follows CLAUDE.md principles: immutable data, pure functions, context managers.
"""

import logging
import os
from contextlib import contextmanager
from dataclasses import dataclass
from threading import Lock
from typing import Any, Dict, Generator, Optional

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class DatabaseConfig:
    """Immutable database configuration."""

    host: str
    user: str
    database: str
    password: Optional[str] = None
    port: int = 5432

    def __post_init__(self):
        """Validate configuration parameters."""
        if not self.host or not self.user or not self.database:
            raise ValueError("Host, user, and database are required")

        if self.port < 1 or self.port > 65535:
            raise ValueError("Port must be between 1 and 65535")


class DatabaseConnectionPool:
    """Thread-safe database connection pool."""

    def __init__(self, config: DatabaseConfig, min_conn: int = 1, max_conn: int = 10):
        self.config = config
        self._pool: Optional[pool.ThreadedConnectionPool] = None
        self._lock = Lock()
        self._min_conn = min_conn
        self._max_conn = max_conn

    def _create_pool(self) -> pool.ThreadedConnectionPool:
        """Create connection pool with validated parameters."""
        conn_params = {
            "host": self.config.host,
            "user": self.config.user,
            "database": self.config.database,
            "port": self.config.port,
        }

        if self.config.password:
            conn_params["password"] = self.config.password

        return pool.ThreadedConnectionPool(minconn=self._min_conn, maxconn=self._max_conn, **conn_params)

    def get_pool(self) -> pool.ThreadedConnectionPool:
        """Get connection pool (thread-safe singleton)."""
        if self._pool is None:
            with self._lock:
                if self._pool is None:
                    self._pool = self._create_pool()
                    logger.info(f"Created database connection pool: {self._min_conn}-{self._max_conn} connections")
        return self._pool

    @contextmanager
    def get_connection(self) -> Generator[psycopg2.extensions.connection, None, None]:
        """Context manager for database connections."""
        connection_pool = self.get_pool()
        conn = None

        try:
            conn = connection_pool.getconn()
            if conn:
                yield conn
            else:
                raise RuntimeError("Failed to get database connection from pool")
        finally:
            if conn:
                connection_pool.putconn(conn)

    @contextmanager
    def get_cursor(self) -> Generator[RealDictCursor, None, None]:
        """Context manager for database cursors."""
        with self.get_connection() as conn:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            try:
                yield cursor
            finally:
                cursor.close()

    def close_all_connections(self):
        """Close all connections in the pool."""
        if self._pool:
            self._pool.closeall()
            self._pool = None
            logger.info("Closed all database connections")


# Global connection pool instance
_connection_pool: Optional[DatabaseConnectionPool] = None


def initialize_database_pool(config: DatabaseConfig) -> DatabaseConnectionPool:
    """Initialize global database connection pool."""
    global _connection_pool
    _connection_pool = DatabaseConnectionPool(config)
    return _connection_pool


def get_database_pool() -> DatabaseConnectionPool:
    """Get global database connection pool."""
    if _connection_pool is None:
        raise RuntimeError("Database pool not initialized. Call initialize_database_pool first.")
    return _connection_pool


def create_database_config_from_env() -> DatabaseConfig:
    """Create database configuration from environment variables."""
    from config import DB_CONFIG

    return DatabaseConfig(host=DB_CONFIG["host"], user=DB_CONFIG["user"], database=DB_CONFIG["database"], password=DB_CONFIG.get("password"), port=int(DB_CONFIG.get("port", 5432)))


@contextmanager
def get_db_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """Context manager for database connections (backward compatibility)."""
    pool = get_database_pool()
    with pool.get_connection() as conn:
        yield conn


@contextmanager
def get_db_cursor() -> Generator[RealDictCursor, None, None]:
    """Context manager for database cursors (backward compatibility)."""
    pool = get_database_pool()
    with pool.get_cursor() as cursor:
        yield cursor


def execute_query(query: str, params: Optional[tuple] = None) -> list:
    """Execute read query and return results."""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        return cursor.fetchall()


def execute_command(query: str, params: Optional[tuple] = None) -> Optional[dict]:
    """Execute write command and return single result."""
    with get_db_cursor() as cursor:
        cursor.execute(query, params)
        cursor.connection.commit()

        # Only try to fetch results for INSERT/SELECT operations that return data
        # UPDATE/DELETE operations don't return results unless they use RETURNING clause
        query_upper = query.strip().upper()
        if query_upper.startswith(("INSERT", "SELECT")) or "RETURNING" in query_upper:
            return cursor.fetchone()
        else:
            return None


def execute_transaction(commands: list) -> list:
    """Execute multiple commands in a transaction."""
    results = []

    with get_db_connection() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            try:
                for command, params in commands:
                    cursor.execute(command, params)
                    result = cursor.fetchone()
                    results.append(result)
                conn.commit()
            except Exception:
                conn.rollback()
                raise

    return results
