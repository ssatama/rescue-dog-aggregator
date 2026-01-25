#!/usr/bin/env python3
"""
Drop unused indexes from animals table.

Based on pg_stat_user_indexes analysis showing 23 indexes with 0 scans.
Total savings: ~37MB of index space.

Usage:
    python management/drop_unused_indexes.py --analyze-only  # Show what would be dropped
    python management/drop_unused_indexes.py --dry-run       # Verify indexes exist
    python management/drop_unused_indexes.py                 # Execute drops
"""

import argparse
import logging
import os
import sys

import psycopg2
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

UNUSED_INDEXES = [
    "idx_animals_dog_profiler_data",
    "idx_animals_search_enhanced",
    "idx_animals_properties",
    "idx_animals_name_trgm",
    "idx_animals_size_breed_status",
    "idx_animals_sitemap_quality",
    "idx_animals_updated_desc",
    "idx_animals_blur_data_url_null",
    "idx_animals_name_asc",
    "idx_animals_breed_gin",
    "idx_animals_name_gin",
    "idx_animals_breed_composite",
    "idx_animals_translations",
    "idx_animals_secondary_breed",
    "idx_animals_breed_confidence",
    "idx_breed_confidence",
    "idx_animals_breed_type",
    "idx_breed_type",
    "idx_animals_good_with_dogs",
    "idx_animals_good_with_cats",
    "idx_animals_location_composite",
    "idx_animals_adoption_checked_at",
    "idx_animals_swipe_composite",
    "idx_animals_good_with_kids",
    "idx_animals_quality_score",
]


def get_railway_connection():
    railway_url = os.getenv("RAILWAY_DATABASE_URL")
    if not railway_url:
        raise ValueError("RAILWAY_DATABASE_URL not found in environment variables")
    return psycopg2.connect(railway_url)


def check_index_exists(cursor, index_name: str) -> bool:
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE indexname = %s AND tablename = 'animals'
        )
        """,
        (index_name,),
    )
    return cursor.fetchone()[0]


def get_index_size(cursor, index_name: str) -> str:
    cursor.execute(
        """
        SELECT pg_size_pretty(pg_relation_size(indexrelid))
        FROM pg_stat_user_indexes
        WHERE indexrelname = %s
        """,
        (index_name,),
    )
    result = cursor.fetchone()
    return result[0] if result else "N/A"


def get_index_stats(cursor) -> dict:
    cursor.execute(
        """
        SELECT
            COUNT(*) as index_count,
            pg_size_pretty(pg_indexes_size('animals')) as total_size,
            pg_size_pretty(pg_relation_size('animals')) as table_size
        FROM pg_indexes
        WHERE tablename = 'animals'
        """
    )
    result = cursor.fetchone()
    return {
        "index_count": result[0],
        "total_index_size": result[1],
        "table_size": result[2],
    }


def analyze_indexes(cursor) -> None:
    logger.info("=" * 60)
    logger.info("ANALYZING UNUSED INDEXES")
    logger.info("=" * 60)

    stats = get_index_stats(cursor)
    logger.info(f"Current state: {stats['index_count']} indexes, {stats['total_index_size']} index size, {stats['table_size']} table size")

    existing = []
    missing = []

    for index_name in UNUSED_INDEXES:
        if check_index_exists(cursor, index_name):
            size = get_index_size(cursor, index_name)
            existing.append((index_name, size))
            logger.info(f"  [EXISTS] {index_name}: {size}")
        else:
            missing.append(index_name)
            logger.info(f"  [MISSING] {index_name}")

    logger.info(f"\nSummary: {len(existing)} indexes to drop, {len(missing)} already missing")


def drop_indexes(cursor, dry_run: bool = False) -> list[str]:
    dropped = []

    for index_name in UNUSED_INDEXES:
        if not check_index_exists(cursor, index_name):
            logger.info(f"Skipping {index_name} - doesn't exist")
            continue

        size = get_index_size(cursor, index_name)

        if dry_run:
            logger.info(f"[DRY RUN] Would drop {index_name} ({size})")
        else:
            logger.info(f"Dropping {index_name} ({size})...")
            cursor.execute(f"DROP INDEX IF EXISTS {index_name}")
            dropped.append(index_name)

    return dropped


def main():
    parser = argparse.ArgumentParser(description="Drop unused indexes from animals table")
    parser.add_argument("--analyze-only", action="store_true", help="Only analyze, don't drop")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be dropped")
    args = parser.parse_args()

    try:
        with get_railway_connection() as conn:
            with conn.cursor() as cursor:
                if args.analyze_only:
                    analyze_indexes(cursor)
                    return 0

                before_stats = get_index_stats(cursor)
                logger.info(f"BEFORE: {before_stats['index_count']} indexes, {before_stats['total_index_size']}")

                dropped = drop_indexes(cursor, dry_run=args.dry_run)

                if not args.dry_run and dropped:
                    conn.commit()

                    after_stats = get_index_stats(cursor)
                    logger.info(f"AFTER: {after_stats['index_count']} indexes, {after_stats['total_index_size']}")
                    logger.info(f"Dropped {len(dropped)} indexes successfully")

                return 0

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
