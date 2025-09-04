#!/usr/bin/env python3
"""
Backfill script to standardize breed data for existing animals.

This script:
1. Fixes Lurcher breeds (53 dogs) - changes breed_group from Unknown to Hound
2. Fixes Staffordshire naming issues (25 dogs) - standardizes breed names
3. Backfills all animals with missing or incorrect breed standardization

Run this to apply unified standardization to existing database records.
"""

import argparse
import logging
import os
import sys
from typing import Any, Dict, List, Tuple

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from rich.progress import BarColumn, Progress, SpinnerColumn, TaskProgressColumn, TextColumn

from config import DB_CONFIG
from utils.unified_standardization import UnifiedStandardizer

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class StandardizationBackfillService:
    """Service to backfill breed standardization for existing animals."""

    def __init__(self):
        """Initialize service with database connection and standardizer."""
        self.conn = None
        self.standardizer = UnifiedStandardizer()

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

    def get_lurchers_to_fix(self) -> List[Tuple]:
        """Get Lurcher dogs that need breed_group fix."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                SELECT id, name, breed, standardized_breed, breed_group, age_text, standardized_size
                FROM animals 
                WHERE breed ILIKE '%lurcher%'
                AND (breed_group = 'Unknown' OR breed_group IS NULL)
                ORDER BY id
            """
            )
            results = cursor.fetchall()
            cursor.close()
            return results
        except Exception as e:
            logger.error(f"Error fetching Lurchers: {e}")
            return []

    def get_staffordshires_to_fix(self) -> List[Tuple]:
        """Get Staffordshire dogs that need breed name standardization."""
        try:
            cursor = self.conn.cursor()
            cursor.execute(
                """
                SELECT id, name, breed, standardized_breed, breed_group, age_text, standardized_size
                FROM animals 
                WHERE (
                    breed ILIKE '%staff%' 
                    OR breed ILIKE '%staffy%' 
                    OR breed ILIKE '%staffie%'
                )
                AND breed NOT ILIKE '%american staffordshire%'
                AND (
                    standardized_breed NOT LIKE '%Staffordshire Bull Terrier%'
                    OR standardized_breed IS NULL
                )
                ORDER BY id
            """
            )
            results = cursor.fetchall()
            cursor.close()
            return results
        except Exception as e:
            logger.error(f"Error fetching Staffordshires: {e}")
            return []

    def get_animals_to_backfill(self, limit: int = None) -> List[Tuple]:
        """Get animals that need breed standardization backfill."""
        try:
            cursor = self.conn.cursor()
            query = """
                SELECT id, name, breed, standardized_breed, breed_group, age_text, standardized_size
                FROM animals 
                WHERE breed_group IS NULL 
                OR breed_group = 'Unknown'
                OR standardized_breed IS NULL
                ORDER BY id
            """
            if limit:
                query += f" LIMIT {limit}"

            cursor.execute(query)
            results = cursor.fetchall()
            cursor.close()
            return results
        except Exception as e:
            logger.error(f"Error fetching animals to backfill: {e}")
            return []

    def update_animal_standardization(self, animal_id: int, standardized_data: Dict[str, Any]) -> bool:
        """Update an animal's standardization fields."""
        try:
            cursor = self.conn.cursor()

            # Build UPDATE query
            set_clauses = []
            values = []

            if "breed" in standardized_data:
                set_clauses.append("standardized_breed = %s")
                values.append(standardized_data["breed"])

            if "breed_category" in standardized_data:
                set_clauses.append("breed_category = %s")
                values.append(standardized_data["breed_category"])

            if "breed_group" in standardized_data:
                set_clauses.append("breed_group = %s")
                values.append(standardized_data["breed_group"])

            if "age_category" in standardized_data:
                set_clauses.append("age_category = %s")
                values.append(standardized_data["age_category"])

            if "standardized_size" in standardized_data:
                set_clauses.append("standardized_size = %s")
                values.append(standardized_data["standardized_size"])

            if not set_clauses:
                return True  # Nothing to update

            values.append(animal_id)
            query = f"""
                UPDATE animals 
                SET {', '.join(set_clauses)}
                WHERE id = %s
            """

            cursor.execute(query, values)
            cursor.close()
            return True

        except Exception as e:
            logger.error(f"Error updating animal {animal_id}: {e}")
            return False

    def standardize_animal_data(self, animal_tuple: Tuple) -> Dict[str, Any]:
        """Apply unified standardization to animal data."""
        id_, name, breed, standardized_breed, breed_group, age_text, size = animal_tuple

        # Apply standardization with individual parameters
        standardized = self.standardizer.apply_full_standardization(breed=breed, age=age_text, size=size)

        return {
            "breed": standardized.get("standardized_breed"),
            "breed_category": standardized.get("breed_category"),
            "breed_group": standardized.get("breed_group"),
            "age_category": standardized.get("age_category"),
            "standardized_size": standardized.get("standardized_size"),
        }

    def fix_lurchers(self, dry_run: bool = False) -> Dict[str, Any]:
        """Fix all Lurcher breeds to have Hound group."""
        lurchers = self.get_lurchers_to_fix()

        if not lurchers:
            logger.info("No Lurchers found that need fixing")
            return {"total": 0, "processed": 0, "failed": 0}

        logger.info(f"Found {len(lurchers)} Lurchers to fix")

        if dry_run:
            logger.info("DRY RUN MODE - No changes will be made")

        processed = 0
        failed = 0

        for animal_tuple in lurchers:
            id_, name, breed, *_ = animal_tuple

            try:
                # Apply standardization
                standardized_data = self.standardize_animal_data(animal_tuple)

                if dry_run:
                    logger.info(f"Would update Lurcher {id_} ({name}): breed_group -> Hound")
                else:
                    if self.update_animal_standardization(id_, standardized_data):
                        processed += 1
                        logger.debug(f"Fixed Lurcher {id_} ({name})")
                    else:
                        failed += 1

            except Exception as e:
                logger.error(f"Error processing Lurcher {id_} ({name}): {e}")
                failed += 1

        if not dry_run:
            self.conn.commit()
            logger.info(f"Fixed {processed} Lurchers, {failed} failed")

        return {"total": len(lurchers), "processed": processed, "failed": failed}

    def fix_staffordshire(self, dry_run: bool = False) -> Dict[str, Any]:
        """Fix all Staffordshire breed names."""
        staffies = self.get_staffordshires_to_fix()

        if not staffies:
            logger.info("No Staffordshire dogs found that need fixing")
            return {"total": 0, "processed": 0, "failed": 0}

        logger.info(f"Found {len(staffies)} Staffordshire dogs to fix")

        if dry_run:
            logger.info("DRY RUN MODE - No changes will be made")

        processed = 0
        failed = 0

        for animal_tuple in staffies:
            id_, name, breed, *_ = animal_tuple

            try:
                # Apply standardization
                standardized_data = self.standardize_animal_data(animal_tuple)

                if dry_run:
                    logger.info(f"Would update Staffordshire {id_} ({name}): {breed} -> Staffordshire Bull Terrier")
                else:
                    if self.update_animal_standardization(id_, standardized_data):
                        processed += 1
                        logger.debug(f"Fixed Staffordshire {id_} ({name})")
                    else:
                        failed += 1

            except Exception as e:
                logger.error(f"Error processing Staffordshire {id_} ({name}): {e}")
                failed += 1

        if not dry_run:
            self.conn.commit()
            logger.info(f"Fixed {processed} Staffordshire dogs, {failed} failed")

        return {"total": len(staffies), "processed": processed, "failed": failed}

    def backfill_breed_data(self, limit: int = None, batch_size: int = 100, dry_run: bool = False, show_progress: bool = True) -> Dict[str, Any]:
        """Backfill breed standardization for all animals."""
        animals = self.get_animals_to_backfill(limit)

        if not animals:
            logger.info("No animals found that need backfilling")
            return {"total": 0, "processed": 0, "failed": 0, "batches": 0, "errors": []}

        logger.info(f"Found {len(animals)} animals to backfill")

        if dry_run:
            logger.info("DRY RUN MODE - No changes will be made")

        processed = 0
        failed = 0
        errors = []
        batches = 0

        # Process with progress bar if requested
        if show_progress:
            with Progress(
                SpinnerColumn(),
                TextColumn("[progress.description]{task.description}"),
                BarColumn(),
                TaskProgressColumn(),
                TextColumn("[bold blue]{task.completed}/{task.total} animals"),
            ) as progress:
                task = progress.add_task("[cyan]Backfilling breed data...", total=len(animals))

                for i in range(0, len(animals), batch_size):
                    batch = animals[i : i + batch_size]
                    batches += 1

                    for animal_tuple in batch:
                        id_, name, breed, *_ = animal_tuple

                        try:
                            if not dry_run:
                                standardized_data = self.standardize_animal_data(animal_tuple)
                                if self.update_animal_standardization(id_, standardized_data):
                                    processed += 1
                                else:
                                    failed += 1
                                    errors.append({"id": id_, "name": name, "error": "Update failed"})

                            progress.update(task, advance=1)

                        except Exception as e:
                            logger.error(f"Error processing animal {id_} ({name}): {e}")
                            failed += 1
                            errors.append({"id": id_, "name": name, "error": str(e)})
                            progress.update(task, advance=1)

                    # Commit after each batch
                    if not dry_run:
                        self.conn.commit()
                        logger.debug(f"Committed batch {batches}")
        else:
            # Process without progress bar
            for i in range(0, len(animals), batch_size):
                batch = animals[i : i + batch_size]
                batches += 1

                for animal_tuple in batch:
                    id_, name, breed, *_ = animal_tuple

                    try:
                        if not dry_run:
                            standardized_data = self.standardize_animal_data(animal_tuple)
                            if self.update_animal_standardization(id_, standardized_data):
                                processed += 1
                            else:
                                failed += 1
                                errors.append({"id": id_, "name": name, "error": "Update failed"})

                    except Exception as e:
                        logger.error(f"Error processing animal {id_} ({name}): {e}")
                        failed += 1
                        errors.append({"id": id_, "name": name, "error": str(e)})

                # Commit after each batch
                if not dry_run:
                    self.conn.commit()
                    logger.debug(f"Committed batch {batches}")

        if dry_run:
            logger.info(f"Dry run completed: {len(animals)} animals would be updated")
        else:
            logger.info(f"Backfilled {processed} animals in {batches} batches, {failed} failed")

        return {"total": len(animals), "processed": processed, "failed": failed, "batches": batches, "errors": errors}


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Backfill breed standardization for existing animals")
    parser.add_argument("--dry-run", action="store_true", help="Show what would be done without making changes")
    parser.add_argument("--limit", type=int, help="Limit number of animals to process")
    parser.add_argument("--skip-lurchers", action="store_true", help="Skip fixing Lurcher breeds")
    parser.add_argument("--skip-staffordshires", action="store_true", help="Skip fixing Staffordshire breeds")
    parser.add_argument("--skip-backfill", action="store_true", help="Skip general backfill (only run targeted fixes)")
    parser.add_argument("--batch-size", type=int, default=100, help="Batch size for processing (default: 100)")

    args = parser.parse_args()

    service = StandardizationBackfillService()

    try:
        if not service.connect():
            logger.error("Failed to connect to database")
            return 1

        total_processed = 0
        total_failed = 0

        # Fix Lurchers
        if not args.skip_lurchers:
            logger.info("\n=== Fixing Lurcher breeds ===")
            lurcher_stats = service.fix_lurchers(dry_run=args.dry_run)
            total_processed += lurcher_stats["processed"]
            total_failed += lurcher_stats["failed"]

        # Fix Staffordshires
        if not args.skip_staffordshires:
            logger.info("\n=== Fixing Staffordshire breeds ===")
            staff_stats = service.fix_staffordshire(dry_run=args.dry_run)
            total_processed += staff_stats["processed"]
            total_failed += staff_stats["failed"]

        # General backfill
        if not args.skip_backfill:
            logger.info("\n=== Running general breed data backfill ===")
            backfill_stats = service.backfill_breed_data(limit=args.limit, batch_size=args.batch_size, dry_run=args.dry_run, show_progress=True)
            total_processed += backfill_stats["processed"]
            total_failed += backfill_stats["failed"]

        # Summary
        logger.info("\n=== Backfill Summary ===")
        logger.info(f"Total processed: {total_processed}")
        logger.info(f"Total failed: {total_failed}")

        if args.dry_run:
            logger.info("DRY RUN completed - no changes were made")
        else:
            logger.info("Backfill completed successfully")

        return 0 if total_failed == 0 else 1

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
