"""
ConnectionPoolService - Centralized database connection pooling.

Provides thread-safe connection pool management following CLAUDE.md principles:
- Immutable configuration
- Clean resource management
- Context manager support
- Early returns for error handling
"""

import logging
from contextlib import contextmanager
from dataclasses import dataclass

import psycopg2
import psycopg2.extensions
import psycopg2.pool


@dataclass(frozen=True)
class PoolConfig:
    """Immutable connection pool configuration."""

    min_connections: int = 2
    max_connections: int = 25

    def __post_init__(self):
        """Validate pool configuration."""
        if self.min_connections < 1:
            raise ValueError("min_connections must be at least 1")
        if self.max_connections < self.min_connections:
            raise ValueError("max_connections must be >= min_connections")


class ConnectionPoolService:
    """Thread-safe database connection pool service."""

    def __init__(
        self,
        db_config: dict[str, str],
        min_connections: int = 2,
        max_connections: int = 25,
    ):
        """Initialize connection pool with database configuration.

        Args:
            db_config: Database connection parameters
            min_connections: Minimum connections to maintain in pool
            max_connections: Maximum connections allowed in pool
        """
        self.db_config = db_config
        self.pool_config = PoolConfig(min_connections, max_connections)
        self.logger = logging.getLogger(__name__)
        self.pool = self._create_pool()

    def _create_pool(self) -> psycopg2.pool.ThreadedConnectionPool:
        """Create threaded connection pool with validation."""
        # Build connection parameters, excluding empty password
        conn_params = {
            "host": self.db_config["host"],
            "user": self.db_config["user"],
            "database": self.db_config["database"],
            "port": self.db_config.get("port", 5432),
        }

        # Only add password if not empty
        if self.db_config.get("password"):
            conn_params["password"] = self.db_config["password"]

        try:
            pool = psycopg2.pool.ThreadedConnectionPool(
                self.pool_config.min_connections,
                self.pool_config.max_connections,
                **conn_params,
            )
            self.logger.info(
                f"Connection pool created: min={self.pool_config.min_connections}, "
                f"max={self.pool_config.max_connections}, host={conn_params['host']}:{conn_params['port']}, database={self.db_config['database']}"
            )
            return pool
        except Exception as e:
            self.logger.error(f"Failed to create connection pool: {e}")
            raise

    def _check_connection_health(self, conn: psycopg2.extensions.connection | None) -> bool:
        """Check if a connection is still alive and usable."""
        if conn is None or conn.closed:
            return False

        try:
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            if not conn.autocommit:
                conn.rollback()
            return True
        except (psycopg2.OperationalError, psycopg2.InterfaceError):
            return False

    def get_connection(self, max_attempts: int = 3):
        """Get a healthy connection from pool with retry on stale connections.

        Args:
            max_attempts: Maximum number of attempts to acquire a healthy connection

        Returns:
            Database connection from pool

        Raises:
            RuntimeError: If all attempts return stale connections
            psycopg2.pool.PoolError: If pool is exhausted
        """
        for attempt in range(max_attempts):
            connection = self.pool.getconn()

            if self._check_connection_health(connection):
                if attempt > 0:
                    self.logger.info(f"Healthy connection acquired after {attempt + 1} attempts")
                else:
                    self.logger.debug("Connection acquired from pool")
                return connection

            self.logger.warning(f"Stale connection detected, closing and retrying (attempt {attempt + 1}/{max_attempts})")
            try:
                self.pool.putconn(connection, close=True)
            except Exception as e:
                self.logger.error(f"Failed to close stale connection: {e}")
                try:
                    connection.close()
                except Exception:
                    pass

        raise RuntimeError(f"Could not acquire healthy connection after {max_attempts} attempts")

    def return_connection(self, connection, close: bool = False):
        """Return connection to pool.

        Args:
            connection: Database connection to return
            close: Whether to close connection instead of returning to pool
        """
        try:
            self.pool.putconn(connection, close=close)
            action = "closed" if close else "returned to pool"
            self.logger.debug(f"Connection {action}")
        except Exception as e:
            self.logger.error(f"Failed to return connection to pool: {e}")
            raise

    @contextmanager
    def get_connection_context(self):
        """Context manager for automatic connection management.

        Yields:
            Database connection that is automatically returned to pool
        """
        connection = None
        try:
            connection = self.get_connection()
            yield connection
        finally:
            if connection:
                self.return_connection(connection)

    def close_all(self):
        """Close all connections in pool."""
        try:
            self.pool.closeall()
            self.logger.info("All pool connections closed")
        except Exception as e:
            self.logger.error(f"Failed to close pool connections: {e}")
            raise
