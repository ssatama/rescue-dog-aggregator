#!/usr/bin/env python3
"""
Repair script for breed slug mismatches after breed standardization fixes.

This script updates breed_slug values to match the corrected primary_breed values
after the unified standardization fixes. It specifically targets records where:
- primary_breed was updated by standardization fixes
- breed_slug is now inconsistent with primary_breed
- slug should be specific (e.g., "german-shepherd-mix") not generic ("mixed-breed")
"""

import argparse
import logging
import os
import sys
from typing import Dict, List

import psycopg2
from psycopg2.extras import RealDictCursor

# Add the project root to the path so we can import from utils
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG
from utils.breed_utils import generate_breed_slug


def setup_logging() -> logging.Logger:
    """Set up logging configuration."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
    return logging.getLogger(__name__)


def get_mismatched_breed_slugs(cursor, limit: int = None) -> List[Dict]:
    """
    Get records where breed_slug doesn't match the primary_breed.

    These are records where the breed standardization created specific breed names
    but the slugs are still generic.
    """
    limit_clause = f"LIMIT {limit}" if limit else ""

    query = f"""
    SELECT id, primary_breed, breed_slug
    FROM animals
    WHERE primary_breed IS NOT NULL
        AND breed_slug IS NOT NULL
        AND primary_breed != 'Mixed Breed'  -- Skip generic mixed breeds
        AND breed_slug = 'mixed-breed'      -- But slug is generic
        AND primary_breed LIKE '% Mix'      -- Primary breed is specific mix
    ORDER BY id
    {limit_clause}
    """

    cursor.execute(query)
    return cursor.fetchall()


def repair_breed_slug(animal: Dict) -> Dict:
    """Generate correct breed slug for an animal record."""
    primary_breed = animal["primary_breed"]
    correct_slug = generate_breed_slug(primary_breed)

    return {
        "id": animal["id"],
        "primary_breed": primary_breed,
        "old_slug": animal["breed_slug"],
        "new_slug": correct_slug,
    }


def update_breed_slug(cursor, repair_data: Dict) -> None:
    """Update a single animal record with corrected breed slug."""
    update_query = """
    UPDATE animals
    SET breed_slug = %s
    WHERE id = %s
    """

    cursor.execute(update_query, (repair_data["new_slug"], repair_data["id"]))


def main():
    """Main repair function."""
    parser = argparse.ArgumentParser(description="Repair breed slug mismatches")
    parser.add_argument("--limit", type=int, help="Limit number of records to repair (for testing)")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be changed without making changes")
    parser.add_argument("--allow-prod", action="store_true", help="Allow running against production database")

    args = parser.parse_args()
    logger = setup_logging()

    # Safety check for production
    db_config = DB_CONFIG
    if db_config["database"] == "rescue_dogs" and not args.allow_prod:
        logger.error("SAFETY: Refusing to run against production database without --allow-prod")
        return 1

    logger.info(f"Connecting to database: {db_config['database']}")

    try:
        # Connect to database
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get mismatched records
        logger.info("Finding records with mismatched breed slugs...")
        mismatched_records = get_mismatched_breed_slugs(cursor, limit=args.limit)
        logger.info(f"Found {len(mismatched_records)} records with mismatched slugs")

        if not mismatched_records:
            logger.info("No mismatched breed slugs found. Nothing to repair.")
            return 0

        # Process each mismatched record
        repairs = []
        for animal in mismatched_records:
            repair_data = repair_breed_slug(animal)
            repairs.append(repair_data)

        # Show repair summary
        logger.info(f"\nRepair Summary:")
        logger.info("=" * 80)

        changes_by_slug = {}
        for repair in repairs:
            change_key = f"{repair['old_slug']} → {repair['new_slug']}"
            if change_key not in changes_by_slug:
                changes_by_slug[change_key] = []
            changes_by_slug[change_key].append(repair["primary_breed"])

        total_changes = 0
        for change, breeds in changes_by_slug.items():
            logger.info(f"{change}: {len(breeds)} records")
            logger.info(f"  Examples: {', '.join(breeds[:5])}")
            if len(breeds) > 5:
                logger.info(f"  ... and {len(breeds) - 5} more")
            logger.info("")
            total_changes += len(breeds)

        if args.dry_run:
            logger.info("DRY RUN: No changes made to database")
            return 0

        # Apply repairs
        logger.info(f"Applying {len(repairs)} slug repairs...")
        for repair in repairs:
            update_breed_slug(cursor, repair)

        # Commit changes
        conn.commit()
        logger.info("All slug repairs applied successfully!")

        # Verify repairs
        cursor.execute(
            """
        SELECT COUNT(*) as remaining_mismatched
        FROM animals
        WHERE primary_breed IS NOT NULL
            AND breed_slug IS NOT NULL
            AND primary_breed != 'Mixed Breed'
            AND breed_slug = 'mixed-breed'
            AND primary_breed LIKE '% Mix'
        """
        )
        remaining = cursor.fetchone()["remaining_mismatched"]
        logger.info(f"Remaining mismatched slugs: {remaining}")

    except Exception as e:
        logger.error(f"Error during repair: {e}")
        if "conn" in locals():
            conn.rollback()
        return 1
    finally:
        if "cursor" in locals():
            cursor.close()
        if "conn" in locals():
            conn.close()

    return 0


if __name__ == "__main__":
    exit(main())
