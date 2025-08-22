"""
Railway index synchronization module.

Syncs database indexes from development to production (Railway).
This ensures both databases have the same optimized index structure.
"""

import logging
from typing import Any, Dict, List

from sqlalchemy import text

from .connection import railway_session

logger = logging.getLogger(__name__)


def get_local_indexes(table_name: str = "animals") -> List[Dict[str, Any]]:
    """Get all indexes from local database for a table."""
    import psycopg2

    from config import DB_CONFIG

    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cursor = conn.cursor()

        # Get index definitions from local database
        cursor.execute(
            """
            SELECT 
                indexname,
                indexdef,
                tablename
            FROM pg_indexes 
            WHERE tablename = %s 
            AND schemaname = 'public'
            ORDER BY indexname
        """,
            (table_name,),
        )

        indexes = []
        for row in cursor.fetchall():
            indexes.append({"name": row[0], "definition": row[1], "table": row[2]})

        cursor.close()
        conn.close()
        return indexes

    except Exception as e:
        logger.error(f"Failed to get local indexes: {e}")
        return []


def get_railway_indexes(table_name: str = "animals") -> List[Dict[str, Any]]:
    """Get all indexes from Railway database for a table."""
    try:
        with railway_session() as session:
            result = session.execute(
                text(
                    """
                SELECT 
                    indexname,
                    indexdef,
                    tablename
                FROM pg_indexes 
                WHERE tablename = :table
                AND schemaname = 'public'
                ORDER BY indexname
            """
                ),
                {"table": table_name},
            )

            indexes = []
            for row in result:
                indexes.append({"name": row[0], "definition": row[1], "table": row[2]})

            return indexes

    except Exception as e:
        logger.error(f"Failed to get Railway indexes: {e}")
        return []


def sync_indexes_to_railway(table_name: str = "animals", dry_run: bool = False) -> bool:
    """
    Sync indexes from local database to Railway.

    Args:
        table_name: Table to sync indexes for (default: animals)
        dry_run: If True, only log what would be done without executing

    Returns:
        bool: True if sync successful, False otherwise
    """
    try:
        logger.info(f"Starting index sync for table '{table_name}'...")

        # Get indexes from both databases
        local_indexes = get_local_indexes(table_name)
        railway_indexes = get_railway_indexes(table_name)

        # Create lookup dictionaries
        local_index_dict = {idx["name"]: idx for idx in local_indexes}
        railway_index_dict = {idx["name"]: idx for idx in railway_indexes}

        # Find differences
        to_create = []  # Indexes in local but not in Railway
        to_drop = []  # Indexes in Railway but not in local
        to_update = []  # Indexes that exist but have different definitions

        # Check for indexes to create or update
        for name, local_idx in local_index_dict.items():
            if name not in railway_index_dict:
                to_create.append(local_idx)
            elif local_idx["definition"] != railway_index_dict[name]["definition"]:
                to_update.append(local_idx)

        # Check for indexes to drop
        for name, railway_idx in railway_index_dict.items():
            if name not in local_index_dict:
                # Don't drop primary keys or unique constraints
                if "pkey" not in name and "unique" not in name.lower() and "_key" not in name:
                    to_drop.append(railway_idx)

        # Log the plan
        logger.info(f"Index sync plan for '{table_name}':")
        logger.info(f"  - Indexes to create: {len(to_create)}")
        logger.info(f"  - Indexes to drop: {len(to_drop)}")
        logger.info(f"  - Indexes to update: {len(to_update)}")

        if dry_run:
            logger.info("DRY RUN - No changes will be made")
            for idx in to_create:
                logger.info(f"  Would create: {idx['name']}")
            for idx in to_drop:
                logger.info(f"  Would drop: {idx['name']}")
            for idx in to_update:
                logger.info(f"  Would update: {idx['name']}")
            return True

        # Execute the sync
        with railway_session() as session:
            success_count = 0

            # Drop outdated indexes first
            for idx in to_drop:
                try:
                    logger.info(f"Dropping index: {idx['name']}")
                    # Use parameterized query to prevent SQL injection
                    # PostgreSQL doesn't support parameters in DDL, so we validate the name
                    index_name = idx["name"]
                    if not index_name.replace("_", "").replace("-", "").isalnum():
                        logger.error(f"Invalid index name format: {index_name}")
                        continue
                    session.execute(text(f"DROP INDEX IF EXISTS {index_name}"))
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to drop index {idx['name']}: {e}")

            # Update existing indexes (drop and recreate)
            for idx in to_update:
                try:
                    logger.info(f"Updating index: {idx['name']}")
                    # Validate index name to prevent SQL injection
                    index_name = idx["name"]
                    if not index_name.replace("_", "").replace("-", "").isalnum():
                        logger.error(f"Invalid index name format: {index_name}")
                        continue
                    session.execute(text(f"DROP INDEX IF EXISTS {index_name}"))

                    # Modify definition to remove CONCURRENTLY for Railway
                    definition = idx["definition"].replace(" CONCURRENTLY", "")
                    session.execute(text(definition))
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to update index {idx['name']}: {e}")

            # Create new indexes
            for idx in to_create:
                try:
                    logger.info(f"Creating index: {idx['name']}")
                    # Modify definition to remove CONCURRENTLY for Railway
                    definition = idx["definition"].replace(" CONCURRENTLY", "")
                    session.execute(text(definition))
                    success_count += 1
                except Exception as e:
                    logger.error(f"Failed to create index {idx['name']}: {e}")

            # Commit all changes
            session.commit()

            # Update statistics
            logger.info(f"Updating statistics for '{table_name}'...")
            # Validate table name to prevent SQL injection
            if not table_name.replace("_", "").isalnum():
                logger.error(f"Invalid table name format: {table_name}")
            else:
                session.execute(text(f"ANALYZE {table_name}"))
                session.commit()

            total_changes = len(to_create) + len(to_drop) + len(to_update)
            logger.info(f"✅ Index sync completed: {success_count}/{total_changes} operations successful")

            return success_count == total_changes

    except Exception as e:
        logger.error(f"Failed to sync indexes: {e}")
        return False


def sync_all_table_indexes(dry_run: bool = False) -> bool:
    """
    Sync indexes for all main tables.

    Args:
        dry_run: If True, only log what would be done without executing

    Returns:
        bool: True if all syncs successful, False otherwise
    """
    tables = ["animals", "organizations", "scrape_logs", "service_regions"]
    success = True

    for table in tables:
        logger.info(f"\n{'='*60}")
        logger.info(f"Syncing indexes for table: {table}")
        logger.info(f"{'='*60}")

        if not sync_indexes_to_railway(table, dry_run=dry_run):
            success = False
            logger.error(f"Failed to sync indexes for {table}")

    return success
