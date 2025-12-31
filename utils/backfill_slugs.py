#!/usr/bin/env python3
"""
Backfill script to generate slugs for existing animals with NULL slugs.
Run this before applying the database migration that adds NOT NULL constraint.
"""

import logging
import os
import sys
from typing import List, Tuple

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2

from config import DB_CONFIG
from utils.slug_generator import generate_unique_animal_slug

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class SlugBackfillService:
    """Service to backfill slugs for existing animals."""

    def __init__(self):
        self.conn = None

    def connect(self) -> bool:
        """Connect to database."""
        try:
            conn_params = {
                "host": DB_CONFIG["host"],
                "user": DB_CONFIG["user"],
                "database": DB_CONFIG["database"],
            }
            if DB_CONFIG.get("password"):
                conn_params["password"] = DB_CONFIG["password"]

            self.conn = psycopg2.connect(**conn_params)
            logger.info(f"Connected to database: {DB_CONFIG['database']}")
            return True
        except Exception as e:
            logger.error(f"Database connection error: {e}")
            return False

    def close(self):
        """Close database connection."""
        if self.conn:
            self.conn.close()
            logger.info("Database connection closed")

    def get_animals_without_slugs(self) -> List[Tuple]:
        """Get animals that have NULL or empty slugs."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                SELECT id, name, breed, standardized_breed, external_id 
                FROM animals 
                WHERE slug IS NULL OR slug = ''
                ORDER BY id
            """
            )
            results = cursor.fetchall()
            cursor.close()
            return results
        except Exception as e:
            logger.error(f"Error fetching animals without slugs: {e}")
            return []

    def update_animal_slug(self, animal_id: int, slug: str) -> bool:
        """Update slug for a specific animal."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                UPDATE animals 
                SET slug = %s 
                WHERE id = %s
            """,
                (slug, animal_id),
            )
            cursor.close()
            return True
        except Exception as e:
            logger.error(f"Error updating slug for animal {animal_id}: {e}")
            return False

    def backfill_slugs(self, dry_run: bool = False) -> bool:
        """Backfill slugs for all animals missing them."""
        animals = self.get_animals_without_slugs()

        if not animals:
            logger.info("No animals found with missing slugs!")
            return True

        logger.info(f"Found {len(animals)} animals with missing slugs")

        if dry_run:
            logger.info("DRY RUN MODE - No changes will be made")

        success_count = 0
        error_count = 0

        for animal_id, name, breed, standardized_breed, external_id in animals:
            try:
                # Generate slug for this animal
                slug = generate_unique_animal_slug(
                    name=name or "",
                    breed=breed,
                    standardized_breed=standardized_breed,
                    animal_id=animal_id,
                    connection=self.conn,
                )  # Use actual ID for uniqueness

                if dry_run:
                    logger.info(f"Would update animal {animal_id} ({name}) with slug: {slug}")
                else:
                    # Update the animal's slug
                    if self.update_animal_slug(animal_id, slug):
                        logger.info(f"Updated animal {animal_id} ({name}) with slug: {slug}")
                        success_count += 1
                    else:
                        logger.error(f"Failed to update animal {animal_id} ({name})")
                        error_count += 1

            except Exception as e:
                logger.error(f"Error processing animal {animal_id} ({name}): {e}")
                error_count += 1

        if not dry_run:
            # Commit all changes
            try:
                self.conn.commit()
                logger.info(f"Backfill completed successfully: {success_count} updated, {error_count} errors")
            except Exception as e:
                logger.error(f"Error committing changes: {e}")
                self.conn.rollback()
                return False
        else:
            logger.info(f"Dry run completed: {len(animals)} animals would be updated")

        return error_count == 0


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Backfill slugs for existing animals")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )
    args = parser.parse_args()

    service = SlugBackfillService()

    try:
        if not service.connect():
            logger.error("Failed to connect to database")
            return 1

        if service.backfill_slugs(dry_run=args.dry_run):
            logger.info("Slug backfill completed successfully")
            return 0
        else:
            logger.error("Slug backfill failed")
            return 1

    except KeyboardInterrupt:
        logger.info("Backfill interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1
    finally:
        service.close()


if __name__ == "__main__":
    sys.exit(main())
