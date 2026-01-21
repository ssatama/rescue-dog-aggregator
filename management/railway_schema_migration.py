#!/usr/bin/env python3
"""
Railway database schema migration script for breed_slug feature.

This script:
1. Adds the new breed_slug column to Railway production
2. Removes unused columns from both local and Railway databases
3. Updates sync.py to handle the new schema
"""

import logging
import os
import sys

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Setup logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Columns to be removed
COLUMNS_TO_REMOVE = [
    "last_session_id",
    "enriched_description",
    "source_last_updated",
    "llm_processed_at",
    "llm_model_used",
]


def get_local_connection():
    """Get connection to local database."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "rescue_dogs"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
    )


def get_railway_connection():
    """Get connection to Railway database."""
    railway_url = os.getenv("RAILWAY_DATABASE_URL")
    if not railway_url:
        raise ValueError("RAILWAY_DATABASE_URL not found in environment variables")
    return psycopg2.connect(railway_url)


def check_column_exists(cursor, table_name, column_name):
    """Check if a column exists in a table."""
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_name = %s
            AND column_name = %s
        )
    """,
        (table_name, column_name),
    )
    return cursor.fetchone()[0]


def check_column_data(cursor, table_name, column_name):
    """Check if a column has any non-null data."""
    cursor.execute(
        f"""
        SELECT COUNT({column_name}) as count
        FROM {table_name}
        WHERE {column_name} IS NOT NULL
    """
    )
    return cursor.fetchone()[0]


def add_breed_slug_column(cursor, table_name="animals"):
    """Add breed_slug column if it doesn't exist."""
    if not check_column_exists(cursor, table_name, "breed_slug"):
        logger.info(f"Adding breed_slug column to {table_name}")
        cursor.execute(
            f"""
            ALTER TABLE {table_name}
            ADD COLUMN breed_slug VARCHAR(255)
        """
        )
        return True
    else:
        logger.info(f"breed_slug column already exists in {table_name}")
        return False


def remove_unused_columns(cursor, table_name="animals"):
    """Remove unused columns from the table."""
    removed_columns = []
    for column in COLUMNS_TO_REMOVE:
        if check_column_exists(cursor, table_name, column):
            # Double-check no data exists
            data_count = check_column_data(cursor, table_name, column)
            if data_count > 0:
                logger.warning(f"Column {column} has {data_count} non-null values - skipping removal")
                continue

            logger.info(f"Removing column {column} from {table_name}")
            cursor.execute(
                f"""
                ALTER TABLE {table_name}
                DROP COLUMN {column}
            """
            )
            removed_columns.append(column)
        else:
            logger.info(f"Column {column} doesn't exist in {table_name}")

    return removed_columns


def analyze_schema_differences():
    """Analyze schema differences between local and Railway databases."""
    logger.info("=" * 60)
    logger.info("ANALYZING SCHEMA DIFFERENCES")
    logger.info("=" * 60)

    try:
        with get_local_connection() as local_conn:
            with local_conn.cursor() as local_cursor:
                # Get local schema
                local_cursor.execute(
                    """
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'animals'
                    ORDER BY ordinal_position
                """
                )
                local_columns = {row[0]: row[1] for row in local_cursor.fetchall()}

        with get_railway_connection() as railway_conn:
            with railway_conn.cursor() as railway_cursor:
                # Get Railway schema
                railway_cursor.execute(
                    """
                    SELECT column_name, data_type
                    FROM information_schema.columns
                    WHERE table_name = 'animals'
                    ORDER BY ordinal_position
                """
                )
                railway_columns = {row[0]: row[1] for row in railway_cursor.fetchall()}

        # Compare schemas
        logger.info(f"Local columns: {len(local_columns)}")
        logger.info(f"Railway columns: {len(railway_columns)}")

        # Columns only in local
        local_only = set(local_columns.keys()) - set(railway_columns.keys())
        if local_only:
            logger.info(f"\nColumns only in LOCAL: {sorted(local_only)}")

        # Columns only in Railway
        railway_only = set(railway_columns.keys()) - set(local_columns.keys())
        if railway_only:
            logger.info(f"\nColumns only in RAILWAY: {sorted(railway_only)}")

        # Check for breed_slug
        if "breed_slug" in local_columns and "breed_slug" not in railway_columns:
            logger.warning("\n⚠️  breed_slug exists in LOCAL but not in RAILWAY - needs to be added")

        # Check for columns to remove
        for col in COLUMNS_TO_REMOVE:
            if col in local_columns:
                logger.warning(f"⚠️  {col} exists in LOCAL - should be removed")
            if col in railway_columns:
                logger.warning(f"⚠️  {col} exists in RAILWAY - should be removed")

        return local_columns, railway_columns

    except Exception as e:
        logger.error(f"Error analyzing schema: {e}")
        return None, None


def perform_migration(dry_run=False):
    """Perform the migration on both databases."""
    logger.info("=" * 60)
    logger.info(f"STARTING MIGRATION {'(DRY RUN)' if dry_run else ''}")
    logger.info("=" * 60)

    # First analyze current state
    local_columns, railway_columns = analyze_schema_differences()
    if not local_columns or not railway_columns:
        logger.error("Failed to analyze schema differences")
        return False

    success = True

    # Migrate Railway database
    logger.info("\n" + "=" * 40)
    logger.info("MIGRATING RAILWAY DATABASE")
    logger.info("=" * 40)

    try:
        with get_railway_connection() as railway_conn:
            with railway_conn.cursor() as railway_cursor:
                if dry_run:
                    logger.info("[DRY RUN] Would perform the following on Railway:")

                    # Check breed_slug
                    if not check_column_exists(railway_cursor, "animals", "breed_slug"):
                        logger.info("  - ADD COLUMN breed_slug VARCHAR(255)")

                    # Check columns to remove
                    for col in COLUMNS_TO_REMOVE:
                        if check_column_exists(railway_cursor, "animals", col):
                            data_count = check_column_data(railway_cursor, "animals", col)
                            if data_count == 0:
                                logger.info(f"  - DROP COLUMN {col}")
                            else:
                                logger.warning(f"  - SKIP {col} (has {data_count} non-null values)")
                else:
                    # Add breed_slug column
                    added = add_breed_slug_column(railway_cursor, "animals")

                    # Remove unused columns
                    removed = remove_unused_columns(railway_cursor, "animals")

                    railway_conn.commit()
                    logger.info(f"✅ Railway migration completed - Added: {added}, Removed: {len(removed)} columns")

    except Exception as e:
        logger.error(f"❌ Railway migration failed: {e}")
        success = False

    # Migrate local database
    logger.info("\n" + "=" * 40)
    logger.info("MIGRATING LOCAL DATABASE")
    logger.info("=" * 40)

    try:
        with get_local_connection() as local_conn:
            with local_conn.cursor() as local_cursor:
                if dry_run:
                    logger.info("[DRY RUN] Would perform the following on Local:")

                    # Check breed_slug (should already exist)
                    if not check_column_exists(local_cursor, "animals", "breed_slug"):
                        logger.info("  - ADD COLUMN breed_slug VARCHAR(255)")
                    else:
                        logger.info("  - breed_slug already exists")

                    # Check columns to remove
                    for col in COLUMNS_TO_REMOVE:
                        if check_column_exists(local_cursor, "animals", col):
                            data_count = check_column_data(local_cursor, "animals", col)
                            if data_count == 0:
                                logger.info(f"  - DROP COLUMN {col}")
                            else:
                                logger.warning(f"  - SKIP {col} (has {data_count} non-null values)")
                else:
                    # Add breed_slug column (in case it doesn't exist)
                    added = add_breed_slug_column(local_cursor, "animals")

                    # Remove unused columns
                    removed = remove_unused_columns(local_cursor, "animals")

                    local_conn.commit()
                    logger.info(f"✅ Local migration completed - Added: {added}, Removed: {len(removed)} columns")

    except Exception as e:
        logger.error(f"❌ Local migration failed: {e}")
        success = False

    # Final verification
    if success and not dry_run:
        logger.info("\n" + "=" * 40)
        logger.info("VERIFYING FINAL STATE")
        logger.info("=" * 40)
        analyze_schema_differences()

    return success


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Railway database schema migration")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )
    parser.add_argument("--analyze-only", action="store_true", help="Only analyze schema differences")

    args = parser.parse_args()

    if args.analyze_only:
        analyze_schema_differences()
    else:
        success = perform_migration(dry_run=args.dry_run)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
