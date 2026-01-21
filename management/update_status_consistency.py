#!/usr/bin/env python3
"""
Phase 1.3: Update existing status values and ensure data consistency.

This script ensures that status and availability_confidence fields are properly
decoupled and consistent after the migration.

Usage:
    python management/update_status_consistency.py [--dry-run] [--verbose]
"""

import argparse
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
from psycopg2.extras import RealDictCursor

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

load_dotenv()


class StatusConsistencyUpdater:
    def __init__(self, dry_run=False, verbose=False):
        self.dry_run = dry_run
        self.verbose = verbose
        self.conn = None
        self.cursor = None
        self.stats = {
            "total_checked": 0,
            "already_consistent": 0,
            "updated": 0,
            "errors": 0,
        }

    def connect(self):
        """Connect to the database."""
        try:
            self.conn = psycopg2.connect(
                dbname=os.getenv("DB_NAME", "rescue_dogs"),
                user=os.getenv("DB_USER", "postgres"),
                password=os.getenv("DB_PASSWORD"),
                host=os.getenv("DB_HOST", "localhost"),
                port=os.getenv("DB_PORT", "5432"),
            )
            self.cursor = self.conn.cursor(cursor_factory=RealDictCursor)
            print(f"✅ Connected to database: {os.getenv('DB_NAME')}")
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            sys.exit(1)

    def analyze_current_state(self):
        """Analyze current data state and identify inconsistencies."""
        print("\n📊 Analyzing current data state...")

        # Check status distribution
        self.cursor.execute(
            """
            SELECT status, COUNT(*) as count
            FROM animals
            GROUP BY status
            ORDER BY count DESC
        """
        )
        status_dist = self.cursor.fetchall()

        print("\nStatus distribution:")
        for row in status_dist:
            print(f"  - {row['status']}: {row['count']:,} dogs")

        # Check availability_confidence distribution
        self.cursor.execute(
            """
            SELECT availability_confidence, COUNT(*) as count
            FROM animals
            GROUP BY availability_confidence
            ORDER BY count DESC
        """
        )
        confidence_dist = self.cursor.fetchall()

        print("\nAvailability confidence distribution:")
        for row in confidence_dist:
            print(f"  - {row['availability_confidence']}: {row['count']:,} dogs")

        # Check for inconsistencies
        self.cursor.execute(
            """
            SELECT
                status,
                availability_confidence,
                COUNT(*) as count
            FROM animals
            GROUP BY status, availability_confidence
            ORDER BY status, availability_confidence
        """
        )
        combinations = self.cursor.fetchall()

        print("\nStatus/Confidence combinations:")
        for row in combinations:
            print(f"  - {row['status']}/{row['availability_confidence']}: {row['count']:,} dogs")

        # Identify dogs needing updates
        self.cursor.execute(
            """
            SELECT COUNT(*)
            FROM animals
            WHERE
                (status = 'unknown' AND availability_confidence = 'high')
                OR (status = 'available' AND availability_confidence = 'low')
                OR (consecutive_scrapes_missing >= 3 AND availability_confidence = 'high')
        """
        )
        inconsistent_count = self.cursor.fetchone()["count"]

        if inconsistent_count > 0:
            print(f"\n⚠️  Found {inconsistent_count:,} dogs with inconsistent data")
        else:
            print("\n✅ All dogs have consistent status/confidence values")

        return inconsistent_count > 0

    def update_availability_confidence(self):
        """Update availability_confidence based on consecutive_scrapes_missing."""
        print("\n🔧 Updating availability_confidence based on scraping data...")

        # Dogs with high misses should have low confidence
        update_query = """
            UPDATE animals
            SET availability_confidence = 'low',
                updated_at = NOW()
            WHERE consecutive_scrapes_missing >= 3
            AND availability_confidence != 'low'
            RETURNING id, name, consecutive_scrapes_missing
        """

        if self.dry_run:
            print("DRY RUN - Would update dogs with high miss count to low confidence")
            self.cursor.execute(
                update_query.replace("UPDATE", "SELECT id, name, consecutive_scrapes_missing FROM")
                .replace("SET", "-- SET")
                .replace(
                    "RETURNING",
                    "WHERE consecutive_scrapes_missing >= 3 AND availability_confidence != 'low' -- RETURNING",
                )
            )
        else:
            self.cursor.execute(update_query)

        updated_dogs = self.cursor.fetchall()

        if updated_dogs:
            print(f"Updated {len(updated_dogs)} dogs to low confidence:")
            if self.verbose:
                for dog in updated_dogs[:10]:  # Show first 10
                    print(f"  - {dog['name']} (ID: {dog['id']}, misses: {dog['consecutive_scrapes_missing']})")
                if len(updated_dogs) > 10:
                    print(f"  ... and {len(updated_dogs) - 10} more")

        self.stats["updated"] += len(updated_dogs)

        # Dogs with no misses should have high confidence
        update_query2 = """
            UPDATE animals
            SET availability_confidence = 'high',
                updated_at = NOW()
            WHERE consecutive_scrapes_missing = 0
            AND availability_confidence != 'high'
            AND status = 'available'
            RETURNING id, name
        """

        if self.dry_run:
            print("DRY RUN - Would update available dogs with no misses to high confidence")
        else:
            self.cursor.execute(update_query2)
            updated_dogs2 = self.cursor.fetchall()
            if updated_dogs2:
                print(f"Updated {len(updated_dogs2)} available dogs to high confidence")
                self.stats["updated"] += len(updated_dogs2)

    def fix_status_conflicts(self):
        """Fix any conflicting status values."""
        print("\n🔧 Checking for status conflicts...")

        # Unknown dogs with 0 misses should be available
        fix_query = """
            UPDATE animals
            SET status = 'available',
                availability_confidence = 'high',
                updated_at = NOW()
            WHERE status = 'unknown'
            AND consecutive_scrapes_missing = 0
            RETURNING id, name
        """

        if self.dry_run:
            print("DRY RUN - Would fix unknown dogs with 0 misses")
            self.cursor.execute(
                """
                SELECT id, name
                FROM animals
                WHERE status = 'unknown'
                AND consecutive_scrapes_missing = 0
            """
            )
        else:
            self.cursor.execute(fix_query)

        fixed_dogs = self.cursor.fetchall()

        if fixed_dogs:
            print(f"Fixed {len(fixed_dogs)} dogs from unknown to available status")
            self.stats["updated"] += len(fixed_dogs)

    def update_scraper_logic_markers(self):
        """Add documentation for scraper logic updates needed."""
        print("\n📝 Creating scraper update documentation...")

        doc_content = """
# Scraper Logic Updates Required

After the adoption tracking migration, the following scraper logic needs updating:

## 1. Status Transition Logic
**Current behavior:**
- When consecutive_scrapes_missing >= 3: Set status='unavailable', availability_confidence='low'

**New behavior:**
- When consecutive_scrapes_missing >= 3: Set status='unknown', availability_confidence='low'
- Trigger adoption check if organization has check_adoption_status=true

## 2. Fields to Update

### When dog is found in scraping:
```python
consecutive_scrapes_missing = 0
availability_confidence = 'high'
# status remains unchanged (don't override adopted/reserved)
if status == 'unknown':
    status = 'available'
```

### When dog is missing from scraping:
```python
consecutive_scrapes_missing += 1
if consecutive_scrapes_missing >= threshold:
    status = 'unknown'  # Not 'unavailable'
    availability_confidence = 'low'
```

## 3. Files to Update
- services/database_service.py - Update status transition logic
- scrapers/base_scraper.py - If base logic exists
- management/config_commands.py - Update scraper command logic

## 4. Important Notes
- Never change status from 'adopted' or 'reserved' back to 'available'
- Keep availability_confidence separate from status
- Status tracks dog state, confidence tracks data quality
"""

        doc_path = Path(__file__).parent.parent / "docs" / "scraper_updates_needed.md"
        doc_path.parent.mkdir(exist_ok=True)

        with open(doc_path, "w") as f:
            f.write(doc_content)

        print(f"✅ Created scraper update documentation at: {doc_path}")

    def generate_report(self):
        """Generate final consistency report."""
        print("\n📊 Final Consistency Report")
        print("=" * 50)

        # Re-check final state
        self.cursor.execute(
            """
            SELECT
                status,
                availability_confidence,
                COUNT(*) as count
            FROM animals
            GROUP BY status, availability_confidence
            ORDER BY status, availability_confidence
        """
        )
        final_state = self.cursor.fetchall()

        print("\nFinal status/confidence distribution:")
        for row in final_state:
            status_conf = f"{row['status']}/{row['availability_confidence']}"
            print(f"  {status_conf:30} {row['count']:,} dogs")

        # Check consistency rules
        self.cursor.execute(
            """
            WITH consistency_check AS (
                SELECT
                    CASE
                        WHEN status = 'unknown' AND consecutive_scrapes_missing < 3 THEN 'Unknown with low misses'
                        WHEN status = 'available' AND availability_confidence = 'low' THEN 'Available with low confidence'
                        WHEN consecutive_scrapes_missing >= 3 AND availability_confidence = 'high' THEN 'High misses with high confidence'
                        ELSE 'Consistent'
                    END as issue
                FROM animals
            )
            SELECT issue, COUNT(*) as count
            FROM consistency_check
            WHERE issue != 'Consistent'
            GROUP BY issue
        """
        )

        issues = self.cursor.fetchall()

        if issues:
            print("\n⚠️  Remaining issues:")
            for issue in issues:
                print(f"  - {issue['issue']}: {issue['count']} dogs")
        else:
            print("\n✅ All dogs pass consistency checks!")

        print("\nUpdate Statistics:")
        print(f"  - Total dogs checked: {self.stats['total_checked']:,}")
        print(f"  - Dogs updated: {self.stats['updated']:,}")
        print(f"  - Already consistent: {self.stats['already_consistent']:,}")
        print(f"  - Errors: {self.stats['errors']}")

    def run(self):
        """Run the complete status consistency update."""
        try:
            self.connect()

            # Analyze current state
            has_issues = self.analyze_current_state()

            if has_issues or self.dry_run:
                # Apply fixes
                self.update_availability_confidence()
                self.fix_status_conflicts()

                # Commit changes
                if not self.dry_run:
                    self.conn.commit()
                    print("\n✅ Changes committed to database")
                else:
                    print("\n🔍 DRY RUN - No changes made")

            # Create documentation
            self.update_scraper_logic_markers()

            # Generate report
            self.generate_report()

        except Exception as e:
            print(f"\n❌ Error during update: {e}")
            if self.conn:
                self.conn.rollback()
            self.stats["errors"] += 1
            raise

        finally:
            if self.cursor:
                self.cursor.close()
            if self.conn:
                self.conn.close()
            print("\n✅ Database connection closed")


def main():
    parser = argparse.ArgumentParser(description="Update status values for consistency")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")
    parser.add_argument("--verbose", action="store_true", help="Show detailed output")
    args = parser.parse_args()

    updater = StatusConsistencyUpdater(dry_run=args.dry_run, verbose=args.verbose)
    updater.run()


if __name__ == "__main__":
    main()
