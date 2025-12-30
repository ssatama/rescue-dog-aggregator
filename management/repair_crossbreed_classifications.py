#!/usr/bin/env python3
"""
Comprehensive repair script for crossbreed classification bugs.

This script fixes breed records that were incorrectly classified as "unknown"
when they should be "crossbreed" due to:
1. Word boundary regex bug with compound words (e.g., "Schäferhundmix")
2. Missing breed keywords in detection logic
3. International breed name issues

The script re-applies the now-fixed unified standardization logic.
"""

import argparse
import logging

# Add the project root to the path so we can import from utils
import os
import sys
from typing import Dict, List

import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG
from utils.unified_standardization import UnifiedStandardizer


def setup_logging() -> logging.Logger:
    """Set up logging configuration."""
    logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
    return logging.getLogger(__name__)


def get_misclassified_crossbreeds(cursor, limit: int = None) -> List[Dict]:
    """
    Get crossbreeds that were incorrectly classified as 'unknown'.

    These are records where:
    - breed contains crossbreed patterns (Cross, Mix, compound words)
    - breed_type is 'unknown' (incorrect classification)
    - Should actually be 'crossbreed'
    """
    limit_clause = f"LIMIT {limit}" if limit else ""

    query = f"""
    SELECT id, breed, primary_breed, secondary_breed, breed_type,
           age_text, standardized_size, organization_id, external_id
    FROM animals
    WHERE breed_type = 'unknown'
      AND (
        breed LIKE '% Cross' OR
        breed LIKE '% cross' OR
        breed LIKE '% Mix' OR
        breed LIKE '% mix' OR
        breed LIKE '%mix' OR
        breed LIKE '%Mix' OR
        breed LIKE '% X %'
      )
      AND breed NOT LIKE 'Can Be%'  -- Exclude non-breed descriptions
    ORDER BY id
    {limit_clause}
    """

    cursor.execute(query)
    return cursor.fetchall()


def get_unknown_purebreds(cursor, limit: int = None) -> List[Dict]:
    """
    Get purebreds that might have been incorrectly classified as 'unknown'.

    These might be breeds not in the breed_data but are actually known breeds.
    """
    limit_clause = f"LIMIT {limit}" if limit else ""

    query = f"""
    SELECT id, breed, primary_breed, secondary_breed, breed_type,
           age_text, standardized_size, organization_id, external_id
    FROM animals
    WHERE breed_type = 'unknown'
      AND breed NOT LIKE '% Cross'
      AND breed NOT LIKE '% cross'
      AND breed NOT LIKE '% Mix'
      AND breed NOT LIKE '% mix'
      AND breed NOT LIKE '%mix'
      AND breed NOT LIKE '%Mix'
      AND breed NOT LIKE '% X %'
      AND breed NOT LIKE 'Can Be%'
      AND breed NOT LIKE 'Unknown%'
      AND breed IS NOT NULL
      AND breed != ''
    ORDER BY id
    {limit_clause}
    """

    cursor.execute(query)
    return cursor.fetchall()


def repair_animal_classification(
    animal: Dict, standardizer: UnifiedStandardizer
) -> Dict:
    """Apply correct standardization to a misclassified animal record."""

    # Apply the now-fixed unified standardization
    result = standardizer.apply_full_standardization(
        breed=animal["breed"], age=animal["age_text"], size=animal["standardized_size"]
    )

    return {
        "id": animal["id"],
        "original_breed": animal["breed"],
        "original_breed_type": animal["breed_type"],
        "original_primary_breed": animal["primary_breed"],
        "new_breed_type": result["breed_type"],
        "new_primary_breed": result["primary_breed"],
        "new_secondary_breed": result["secondary_breed"],
        "new_confidence": result["breed_confidence"],
    }


def update_animal_classification(cursor, repair_data: Dict) -> None:
    """Update a single animal record with corrected classification."""

    update_query = """
    UPDATE animals
    SET breed_type = %s,
        primary_breed = %s,
        secondary_breed = %s,
        breed_confidence = %s
    WHERE id = %s
    """

    cursor.execute(
        update_query,
        (
            repair_data["new_breed_type"],
            repair_data["new_primary_breed"],
            repair_data["new_secondary_breed"],
            repair_data["new_confidence"],
            repair_data["id"],
        ),
    )


def main():
    """Main repair function."""
    parser = argparse.ArgumentParser(
        description="Repair misclassified crossbreed records"
    )
    parser.add_argument(
        "--limit", type=int, help="Limit number of records to repair (for testing)"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be changed without making changes",
    )
    parser.add_argument(
        "--allow-prod",
        action="store_true",
        help="Allow running against production database",
    )
    parser.add_argument(
        "--crossbreeds-only",
        action="store_true",
        help="Only repair crossbreeds, skip potential purebreds",
    )

    args = parser.parse_args()
    logger = setup_logging()

    # Safety check for production
    db_config = DB_CONFIG
    if db_config["database"] == "rescue_dogs" and not args.allow_prod:
        logger.error(
            "SAFETY: Refusing to run against production database without --allow-prod"
        )
        return 1

    logger.info(f"Connecting to database: {db_config['database']}")

    try:
        # Connect to database
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Initialize standardizer with fixed logic
        standardizer = UnifiedStandardizer()

        # Get misclassified crossbreeds
        logger.info("Finding misclassified crossbreeds...")
        misclassified_crossbreeds = get_misclassified_crossbreeds(
            cursor, limit=args.limit
        )
        logger.info(f"Found {len(misclassified_crossbreeds)} misclassified crossbreeds")

        # Get potential misclassified purebreds (unless crossbreeds-only)
        potential_purebreds = []
        if not args.crossbreeds_only:
            logger.info("Finding potential misclassified purebreds...")
            potential_purebreds = get_unknown_purebreds(cursor, limit=args.limit)
            logger.info(
                f"Found {len(potential_purebreds)} potential misclassified purebreds"
            )

        all_animals = misclassified_crossbreeds + potential_purebreds

        if not all_animals:
            logger.info("No misclassified records found. Nothing to repair.")
            return 0

        # Process each misclassified record
        repairs = []
        for animal in all_animals:
            repair_data = repair_animal_classification(animal, standardizer)

            # Only include if classification actually changed
            if repair_data["new_breed_type"] != repair_data["original_breed_type"]:
                repairs.append(repair_data)

        # Show repair summary
        logger.info("\nRepair Summary:")
        logger.info("=" * 80)

        changes_by_type = {}
        for repair in repairs:
            change_key = f"{repair['original_breed_type']} → {repair['new_breed_type']}"
            if change_key not in changes_by_type:
                changes_by_type[change_key] = []
            changes_by_type[change_key].append(repair["original_breed"])

        total_changes = 0
        for change, breeds in changes_by_type.items():
            logger.info(f"{change}: {len(breeds)} records")
            logger.info(f"  Examples: {', '.join(breeds[:5])}")
            if len(breeds) > 5:
                logger.info(f"  ... and {len(breeds) - 5} more")
            logger.info("")
            total_changes += len(breeds)

        if total_changes == 0:
            logger.info(
                "No classification changes needed. All records are correctly classified."
            )
            return 0

        if args.dry_run:
            logger.info("DRY RUN: No changes made to database")
            return 0

        # Apply repairs
        logger.info(f"Applying {len(repairs)} repairs...")
        for repair in repairs:
            update_animal_classification(cursor, repair)

        # Commit changes
        conn.commit()
        logger.info("All repairs applied successfully!")

        # Verify repairs
        cursor.execute(
            """
        SELECT breed_type, COUNT(*) as count
        FROM animals
        WHERE breed_type IN ('unknown', 'crossbreed', 'mixed', 'purebred')
        GROUP BY breed_type
        ORDER BY count DESC
        """
        )
        final_counts = cursor.fetchall()

        logger.info("Final breed type distribution:")
        for row in final_counts:
            logger.info(f"  {row['breed_type']}: {row['count']}")

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
