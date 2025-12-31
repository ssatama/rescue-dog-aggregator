#!/usr/bin/env python3
"""
Run adoption status tracking migration (013).

This script safely applies the migration with proper validation and rollback capability.
Usage:
    python management/run_adoption_migration.py [--dry-run] [--rollback]
"""

import argparse
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

load_dotenv()


class AdoptionMigrationRunner:
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.conn = None
        self.cursor = None

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
            self.cursor = self.conn.cursor()
            print(f"✅ Connected to database: {os.getenv('DB_NAME')}")
        except Exception as e:
            print(f"❌ Failed to connect to database: {e}")
            sys.exit(1)

    def pre_migration_checks(self):
        """Run pre-migration validation checks."""
        print("\n📋 Running pre-migration checks...")

        # Check current status distribution
        self.cursor.execute(
            """
            SELECT status, COUNT(*) as count 
            FROM animals 
            GROUP BY status 
            ORDER BY count DESC
        """
        )
        status_counts = self.cursor.fetchall()

        print("\nCurrent status distribution:")
        for status, count in status_counts:
            print(f"  - {status}: {count:,} dogs")

        # Check for animals with consecutive_scrapes_missing > 3
        self.cursor.execute(
            """
            SELECT COUNT(*) 
            FROM animals 
            WHERE consecutive_scrapes_missing >= 3
            AND status != 'adopted'
            AND status != 'reserved'
        """
        )
        eligible_count = self.cursor.fetchone()[0]
        print(f"\nDogs eligible for adoption checking: {eligible_count:,}")

        # Check if migration was already applied
        self.cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'animals' 
                AND column_name = 'adoption_check_data'
            )
        """
        )
        already_applied = self.cursor.fetchone()[0]

        if already_applied:
            print("\n⚠️  Warning: Migration appears to be already applied (adoption_check_data column exists)")
            response = input("Continue anyway? (y/n): ")
            if response.lower() != "y":
                print("Migration cancelled.")
                return False

        return True

    def run_migration(self):
        """Execute the migration SQL."""
        print("\n🚀 Running migration 013_adoption_status_tracking...")

        migration_path = Path(__file__).parent.parent / "database" / "migrations" / "013_adoption_status_tracking.sql"

        if not migration_path.exists():
            print(f"❌ Migration file not found: {migration_path}")
            return False

        try:
            with open(migration_path, "r") as f:
                migration_sql = f.read()

            if self.dry_run:
                print("\n🔍 DRY RUN - Would execute:")
                print(migration_sql[:500] + "..." if len(migration_sql) > 500 else migration_sql)
                return True

            # Execute migration
            self.cursor.execute(migration_sql)

            # Verify migration success
            self.cursor.execute(
                """
                SELECT COUNT(*) FROM animals WHERE status = 'unknown'
            """
            )
            unknown_count = self.cursor.fetchone()[0]

            self.cursor.execute(
                """
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'animals' 
                    AND column_name = 'adoption_check_data'
                )
            """
            )
            columns_created = self.cursor.fetchone()[0]

            if columns_created:
                print("✅ Migration successful!")
                print(f"  - Converted {unknown_count:,} dogs to 'unknown' status")
                print("  - Added adoption tracking columns")
                print("  - Created performance indexes")
                self.conn.commit()
                return True
            else:
                print("❌ Migration verification failed")
                self.conn.rollback()
                return False

        except Exception as e:
            print(f"❌ Migration failed: {e}")
            if self.conn:
                self.conn.rollback()
            return False

    def run_rollback(self):
        """Execute the rollback SQL."""
        print("\n⏮️  Running rollback for migration 013...")

        rollback_path = Path(__file__).parent.parent / "database" / "migrations" / "013_adoption_status_tracking_rollback.sql"

        if not rollback_path.exists():
            print(f"❌ Rollback file not found: {rollback_path}")
            return False

        try:
            with open(rollback_path, "r") as f:
                rollback_sql = f.read()

            if self.dry_run:
                print("\n🔍 DRY RUN - Would execute rollback")
                return True

            self.cursor.execute(rollback_sql)

            # Verify rollback success
            self.cursor.execute(
                """
                SELECT COUNT(*) FROM animals WHERE status = 'unavailable'
            """
            )
            unavailable_count = self.cursor.fetchone()[0]

            print("✅ Rollback successful!")
            print(f"  - Restored {unavailable_count:,} dogs to 'unavailable' status")
            print("  - Removed adoption tracking columns")

            self.conn.commit()
            return True

        except Exception as e:
            print(f"❌ Rollback failed: {e}")
            if self.conn:
                self.conn.rollback()
            return False

    def post_migration_report(self):
        """Generate post-migration report."""
        print("\n📊 Post-migration report:")

        # New status distribution
        self.cursor.execute(
            """
            SELECT status, COUNT(*) as count 
            FROM animals 
            GROUP BY status 
            ORDER BY count DESC
        """
        )
        status_counts = self.cursor.fetchall()

        print("\nNew status distribution:")
        for status, count in status_counts:
            print(f"  - {status}: {count:,} dogs")

        # Check indexes
        self.cursor.execute(
            """
            SELECT indexname 
            FROM pg_indexes 
            WHERE tablename = 'animals' 
            AND indexname LIKE '%adoption%'
        """
        )
        indexes = self.cursor.fetchall()

        if indexes:
            print("\nCreated indexes:")
            for idx in indexes:
                print(f"  - {idx[0]}")

    def cleanup(self):
        """Close database connections."""
        if self.cursor:
            self.cursor.close()
        if self.conn:
            self.conn.close()
        print("\n✅ Database connection closed.")


def main():
    parser = argparse.ArgumentParser(description="Run adoption status tracking migration")
    parser.add_argument("--dry-run", action="store_true", help="Preview migration without applying")
    parser.add_argument("--rollback", action="store_true", help="Rollback the migration")
    args = parser.parse_args()

    runner = AdoptionMigrationRunner(dry_run=args.dry_run)

    try:
        runner.connect()

        if args.rollback:
            if runner.run_rollback():
                print("\n✅ Rollback completed successfully!")
            else:
                print("\n❌ Rollback failed!")
                sys.exit(1)
        else:
            if not runner.pre_migration_checks():
                sys.exit(1)

            if runner.run_migration():
                runner.post_migration_report()
                print("\n✅ Migration completed successfully!")
                print("\n📝 Next steps:")
                print("  1. Run Phase 1.3 to verify data consistency")
                print("  2. Deploy Phase 2 (AdoptionDetectionService)")
                print("  3. Update API endpoints (Phase 3)")
            else:
                print("\n❌ Migration failed!")
                sys.exit(1)

    finally:
        runner.cleanup()


if __name__ == "__main__":
    main()
