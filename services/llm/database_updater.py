"""
Database updater for LLM dog profiler.

Following CLAUDE.md principles:
- Single responsibility: Database operations only
- Dependency injection for connection pool
- Clear error handling
"""

import json
import logging
from typing import Any, Optional

import psycopg2

from config import get_database_config

logger = logging.getLogger(__name__)


class DatabaseUpdater:
    """Handles database operations for dog profiler results."""

    def __init__(
        self,
        connection_pool: Optional["ConnectionPoolService"] = None,
        dry_run: bool = False,
    ):
        """
        Initialize database updater.

        Args:
            connection_pool: Optional connection pool service
            dry_run: If True, don't actually save to database
        """
        self.connection_pool = connection_pool
        self.dry_run = dry_run

    async def save_results(self, results: list[dict[str, Any]]) -> bool:
        """
        Save profiler results to database.

        Args:
            results: List of profiler data dictionaries

        Returns:
            True if successful
        """
        if self.dry_run:
            logger.info(f"DRY RUN: Would save {len(results)} profiles to database")
            return True

        try:
            # Use connection pool if available, otherwise create direct connection
            if self.connection_pool:
                with self.connection_pool.get_connection_context() as conn:
                    self._save_with_connection(conn, results)
            else:
                # Fallback to direct connection using config
                db_config = get_database_config()
                conn = psycopg2.connect(**db_config)
                try:
                    self._save_with_connection(conn, results)
                    conn.commit()
                finally:
                    conn.close()

            logger.info(f"Successfully saved {len(results)} profiles to database")
            return True

        except Exception as e:
            logger.error(f"Failed to save results: {e}")
            return False

    def _save_with_connection(self, conn, results: list[dict[str, Any]]) -> None:
        """
        Save results using provided database connection.

        Args:
            conn: Database connection
            results: List of processed dog profiles
        """
        cursor = conn.cursor()

        for result in results:
            # Extract dog_id from the result (assuming it's included)
            dog_id = result.get("dog_id")
            if not dog_id:
                logger.warning("No dog_id in result, skipping")
                continue

            # Remove dog_id from profile data before saving
            profile_data = {k: v for k, v in result.items() if k != "dog_id"}

            # Update the dog_profiler_data column
            cursor.execute(
                """
                UPDATE animals
                SET dog_profiler_data = %s,
                    updated_at = NOW()
                WHERE id = %s
                """,
                (json.dumps(profile_data), dog_id),
            )

        conn.commit()
        cursor.close()
