"""
Async database connection pooling for LLM services.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear error handling
- Connection pooling for performance
"""

import asyncio
import logging
import os
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Any

import asyncpg
from asyncpg import Connection, Pool

logger = logging.getLogger(__name__)


@dataclass
class PoolConfig:
    """Configuration for database connection pool."""

    host: str
    database: str
    user: str
    password: str
    min_connections: int = 2
    max_connections: int = 10
    timeout: float = 5.0

    def __post_init__(self):
        """Validate configuration."""
        if self.min_connections > self.max_connections:
            raise ValueError("min_connections must be <= max_connections")
        if self.min_connections < 0:
            raise ValueError("min_connections must be positive")
        if self.max_connections < 1:
            raise ValueError("max_connections must be positive")

    @classmethod
    def from_environment(cls) -> "PoolConfig":
        """Create config from environment variables."""
        return cls(
            host=os.environ.get("DB_HOST", "localhost"),
            database=os.environ.get("DB_NAME", "rescue_dogs"),
            user=os.environ.get("DB_USER", os.environ.get("USER", "")),
            password=os.environ.get("DB_PASSWORD", ""),
            min_connections=int(os.environ.get("DB_POOL_MIN", "2")),
            max_connections=int(os.environ.get("DB_POOL_MAX", "10")),
        )


class ConnectionContext:
    """Context manager for database connections."""

    def __init__(self, pool: Pool):
        """Initialize with connection pool."""
        self.pool = pool
        self.connection: Connection | None = None

    async def __aenter__(self) -> Connection:
        """Acquire connection from pool."""
        self.connection = await self.pool.acquire()
        return self.connection

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Release connection back to pool."""
        if self.connection:
            await self.pool.release(self.connection)


class AsyncDatabasePool:
    """Async database connection pool manager."""

    def __init__(self, config: PoolConfig):
        """Initialize with configuration."""
        self.config = config
        self.pool: Pool | None = None
        self.is_initialized = False
        self.metrics = {"queries_executed": 0, "errors": 0, "retries": 0}

    async def initialize(self) -> None:
        """Initialize the connection pool."""
        if self.is_initialized:
            return

        try:
            self.pool = await asyncpg.create_pool(
                host=self.config.host,
                database=self.config.database,
                user=self.config.user,
                password=self.config.password,
                min_size=self.config.min_connections,
                max_size=self.config.max_connections,
                timeout=self.config.timeout,
            )
            self.is_initialized = True
            logger.info(f"Database pool initialized with {self.config.min_connections}-{self.config.max_connections} connections")
        except Exception as e:
            logger.error(f"Failed to initialize database pool: {e}")
            raise

    async def close(self) -> None:
        """Close the connection pool."""
        if self.pool:
            await self.pool.close()
            self.is_initialized = False
            logger.info("Database pool closed")

    @asynccontextmanager
    async def acquire(self):
        """Acquire a connection from the pool."""
        if not self.pool:
            raise RuntimeError("Pool not initialized. Call initialize() first.")

        async with self.pool.acquire() as connection:
            yield connection

    @asynccontextmanager
    async def transaction(self):
        """Execute operations in a transaction."""
        async with self.acquire() as connection:
            async with connection.transaction():
                yield connection

    async def fetch(self, query: str, *args) -> list[dict[str, Any]]:
        """Execute query and fetch results."""
        async with self.acquire() as connection:
            self.metrics["queries_executed"] += 1
            rows = await connection.fetch(query, *args)
            return [dict(row) for row in rows]

    async def fetchrow(self, query: str, *args) -> dict[str, Any] | None:
        """Execute query and fetch single row."""
        async with self.acquire() as connection:
            self.metrics["queries_executed"] += 1
            row = await connection.fetchrow(query, *args)
            return dict(row) if row else None

    async def execute(self, query: str, *args) -> str:
        """Execute query without returning results."""
        async with self.acquire() as connection:
            self.metrics["queries_executed"] += 1
            return await connection.execute(query, *args)

    async def execute_many(self, query: str, args_list: list[tuple]) -> None:
        """Execute query multiple times with different arguments."""
        async with self.acquire() as connection:
            self.metrics["queries_executed"] += len(args_list)
            await connection.executemany(query, args_list)

    async def fetch_with_retry(self, query: str, *args, max_retries: int = 3) -> list[dict[str, Any]]:
        """Execute query with retry on connection errors."""
        last_error = None

        for attempt in range(max_retries):
            try:
                return await self.fetch(query, *args)
            except asyncpg.exceptions.ConnectionDoesNotExistError as e:
                last_error = e
                self.metrics["retries"] += 1
                if attempt < max_retries - 1:
                    await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff
                    logger.warning(f"Connection error, retrying ({attempt + 1}/{max_retries}): {e}")
            except Exception:
                self.metrics["errors"] += 1
                raise

        raise last_error

    def get_metrics(self) -> dict[str, Any]:
        """Get pool metrics."""
        metrics = self.metrics.copy()

        if self.pool:
            # These methods don't actually exist in asyncpg.Pool
            # We'll use pool._holders for real implementation
            metrics["current_connections"] = len(self.pool._holders) if hasattr(self.pool, "_holders") else 0
            metrics["min_connections"] = self.config.min_connections
            metrics["max_connections"] = self.config.max_connections

        return metrics

    async def __aenter__(self) -> "AsyncDatabasePool":
        """Async context manager entry."""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()


# Singleton pool instance for the application
_pool_instance: AsyncDatabasePool | None = None


async def get_pool() -> AsyncDatabasePool:
    """Get or create the singleton pool instance."""
    global _pool_instance

    if _pool_instance is None:
        config = PoolConfig.from_environment()
        _pool_instance = AsyncDatabasePool(config)
        await _pool_instance.initialize()

    return _pool_instance


async def close_pool() -> None:
    """Close the singleton pool instance."""
    global _pool_instance

    if _pool_instance:
        await _pool_instance.close()
        _pool_instance = None
