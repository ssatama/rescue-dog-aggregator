"""
Database service for management operations following CLAUDE.md principles.
Provides centralized database connection management with context manager support.
"""

from dataclasses import dataclass
from typing import Any

import psycopg2


@dataclass(frozen=True)
class DatabaseConfig:
    """Immutable database configuration."""

    host: str
    user: str
    database: str
    password: str | None = None


class DatabaseService:
    """Service for managing database connections and operations."""

    def __init__(self, config: DatabaseConfig):
        """Initialize database service with configuration."""
        self.config = config

    def get_connection(self):
        """Create and return database connection."""
        conn_params = {
            "host": self.config.host,
            "user": self.config.user,
            "database": self.config.database,
        }

        if self.config.password:
            conn_params["password"] = self.config.password

        return psycopg2.connect(**conn_params)

    def __enter__(self):
        """Context manager entry - create connection."""
        self._connection = self.get_connection()
        return self._connection

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - close connection."""
        if hasattr(self, "_connection"):
            self._connection.close()

    def execute_query(self, query: str, params: tuple | None = None) -> list[tuple]:
        """Execute read query and return results."""
        with self as connection:
            cursor = connection.cursor()
            try:
                cursor.execute(query, params)
                return cursor.fetchall()
            finally:
                cursor.close()

    def execute_command(self, command: str, params: tuple | None = None) -> int:
        """Execute write command and return affected rows."""
        with self as connection:
            cursor = connection.cursor()
            try:
                cursor.execute(command, params)
                connection.commit()
                return cursor.rowcount
            finally:
                cursor.close()


def create_database_service_from_config(db_config: dict[str, Any]) -> DatabaseService:
    """Factory function to create DatabaseService from config dictionary."""
    config = DatabaseConfig(
        host=db_config["host"],
        user=db_config["user"],
        database=db_config["database"],
        password=db_config.get("password"),
    )
    return DatabaseService(config)
