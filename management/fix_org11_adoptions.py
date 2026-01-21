#!/usr/bin/env python3
"""Fix misclassified adoption statuses for organization 11 dogs."""

import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

import os
from datetime import UTC, datetime

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Database connection
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_NAME = os.getenv("DB_NAME", "rescue_dogs")
DB_USER = os.getenv("DB_USER", "samposatama")
DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)


def fix_misclassified_dogs():
    """Fix misclassified adoption statuses for org 11."""
    session = Session()

    try:
        # Fix Nata (ID: 893) - died in fire, incorrectly marked as adopted
        print("Fixing Nata (ID: 893) - died in fire, should be 'unknown' not 'adopted'...")
        nata_update = text(
            """
            UPDATE animals 
            SET status = 'unknown',
                adoption_check_data = jsonb_set(
                    COALESCE(adoption_check_data, '{}'::jsonb),
                    '{manual_correction}',
                    '"Died in fire - corrected from adopted to unknown"'::jsonb
                ),
                adoption_checked_at = :check_date
            WHERE id = 893 AND organization_id = 11
        """
        )
        result = session.execute(nata_update, {"check_date": datetime.now(UTC)})
        print(f"  Updated {result.rowcount} row(s) for Nata")

        # Fix Lobo (ID: 850) - page marked DELETED, should be 'unknown' not 'available'
        print("\nFixing Lobo (ID: 850) - page DELETED, should be 'unknown' not 'available'...")
        lobo_update = text(
            """
            UPDATE animals 
            SET status = 'unknown',
                adoption_check_data = jsonb_set(
                    COALESCE(adoption_check_data, '{}'::jsonb),
                    '{manual_correction}',
                    '"Page marked DELETED - corrected from available to unknown"'::jsonb
                ),
                adoption_checked_at = :check_date
            WHERE id = 850 AND organization_id = 11
        """
        )
        result = session.execute(lobo_update, {"check_date": datetime.now(UTC)})
        print(f"  Updated {result.rowcount} row(s) for Lobo")

        # Check for any other dogs with DELETED in their adoption_check_data that might be misclassified
        print("\nChecking for other potentially misclassified dogs with DELETED pages...")
        check_deleted = text(
            """
            SELECT id, name, status, adoption_check_data
            FROM animals
            WHERE organization_id = 11
            AND adoption_check_data IS NOT NULL
            AND adoption_check_data::text ILIKE '%DELETED%'
            AND status != 'unknown'
        """
        )
        deleted_dogs = session.execute(check_deleted).fetchall()

        if deleted_dogs:
            print(f"Found {len(deleted_dogs)} dogs with DELETED pages not marked as 'unknown':")
            for dog in deleted_dogs:
                print(f"  - {dog.name} (ID: {dog.id}): status={dog.status}")
                # Fix these as well
                fix_deleted = text(
                    """
                    UPDATE animals 
                    SET status = 'unknown',
                        adoption_check_data = jsonb_set(
                            adoption_check_data,
                            '{manual_correction}',
                            '"Page marked DELETED - auto-corrected to unknown"'::jsonb
                        ),
                        adoption_checked_at = :check_date
                    WHERE id = :dog_id AND organization_id = 11
                """
                )
                session.execute(
                    fix_deleted,
                    {"dog_id": dog.id, "check_date": datetime.now(UTC)},
                )
                print(f"    Fixed {dog.name}")
        else:
            print("  No other DELETED pages found with incorrect status")

        # Verify the corrections
        print("\n=== Verification ===")
        verify_query = text(
            """
            SELECT id, name, status, adoption_check_data->>'manual_correction' as correction
            FROM animals
            WHERE id IN (893, 850) AND organization_id = 11
        """
        )
        results = session.execute(verify_query).fetchall()

        for dog in results:
            print(f"{dog.name} (ID: {dog.id}):")
            print(f"  Status: {dog.status}")
            print(f"  Correction: {dog.correction}")

        # Final summary of org 11 adoption statuses
        print("\n=== Organization 11 Status Summary ===")
        summary_query = text(
            """
            SELECT status, COUNT(*) as count
            FROM animals
            WHERE organization_id = 11
            GROUP BY status
            ORDER BY count DESC
        """
        )
        summary = session.execute(summary_query).fetchall()

        for row in summary:
            print(f"  {row.status}: {row.count} dogs")

        session.commit()
        print("\n✅ All corrections applied successfully!")

    except Exception as e:
        session.rollback()
        print(f"❌ Error: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    fix_misclassified_dogs()
