#!/usr/bin/env python3
"""
Fix script to add ID suffixes to the 21 animals that are missing them.
These animals have valid slugs but in "name-breed" format instead of "name-breed-id" format.
"""

import logging
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2

from config import DB_CONFIG
from utils.slug_generator import generate_unique_animal_slug

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class MissingIdSlugFixer:
    """Service to fix animals with slugs missing ID suffix."""

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

    def get_animals_missing_id_suffixes(self) -> list[tuple]:
        """Get animals that have slugs but are missing ID suffixes."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                SELECT id, name, breed, standardized_breed, slug
                FROM animals 
                WHERE slug NOT SIMILAR TO '%[-][0-9]+'
                ORDER BY id
            """
            )
            results = cursor.fetchall()
            cursor.close()
            return results
        except Exception as e:
            logger.error(f"Error fetching animals with missing ID suffixes: {e}")
            return []

    def update_animal_slug(self, animal_id: int, new_slug: str) -> bool:
        """Update slug for a specific animal."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                UPDATE animals 
                SET slug = %s 
                WHERE id = %s
            """,
                (new_slug, animal_id),
            )
            cursor.close()
            return True
        except Exception as e:
            logger.error(f"Error updating slug for animal {animal_id}: {e}")
            return False

    def fix_missing_id_suffixes(self, dry_run: bool = False) -> bool:
        """Fix animals with slugs missing ID suffixes."""
        animals = self.get_animals_missing_id_suffixes()

        if not animals:
            logger.info("No animals found with missing ID suffixes!")
            return True

        logger.info(f"Found {len(animals)} animals with missing ID suffixes")

        if dry_run:
            logger.info("DRY RUN MODE - No changes will be made")

        success_count = 0
        error_count = 0

        for animal_id, name, breed, standardized_breed, current_slug in animals:
            try:
                # Generate new slug with ID suffix
                new_slug = generate_unique_animal_slug(
                    name=name or "",
                    breed=breed,
                    standardized_breed=standardized_breed,
                    animal_id=animal_id,
                    connection=self.conn,
                )  # Include ID for suffix

                if dry_run:
                    logger.info(f"Would update animal {animal_id} ({name}): '{current_slug}' -> '{new_slug}'")
                else:
                    # Update the animal's slug
                    if self.update_animal_slug(animal_id, new_slug):
                        logger.info(f"Updated animal {animal_id} ({name}): '{current_slug}' -> '{new_slug}'")
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
                logger.info(f"Fix completed successfully: {success_count} updated, {error_count} errors")
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

    parser = argparse.ArgumentParser(description="Fix animals with slugs missing ID suffixes")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be done without making changes",
    )
    args = parser.parse_args()

    fixer = MissingIdSlugFixer()

    try:
        if not fixer.connect():
            logger.error("Failed to connect to database")
            return 1

        if fixer.fix_missing_id_suffixes(dry_run=args.dry_run):
            logger.info("Missing ID suffix fix completed successfully")
            return 0
        else:
            logger.error("Missing ID suffix fix failed")
            return 1

    except KeyboardInterrupt:
        logger.info("Fix interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return 1
    finally:
        fixer.close()


if __name__ == "__main__":
    sys.exit(main())
