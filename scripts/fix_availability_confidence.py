#!/usr/bin/env python3
"""
Script to fix animals that were incorrectly marked as low confidence
due to the SQL logic bug in update_stale_data_detection().

This script identifies animals that should have high confidence based on recent activity
and resets their availability_confidence appropriately.
"""

import os
import sys
from datetime import datetime, timedelta

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.database import get_pooled_connection
from config import DB_CONFIG


def fix_availability_confidence():
    """Fix animals that were incorrectly marked as low confidence."""

    print("🔧 Starting availability confidence fix...")

    with get_pooled_connection() as conn:
        cursor = conn.cursor()

        # First, let's see the current state
        print("\n📊 Current availability confidence distribution:")
        cursor.execute(
            """
            SELECT organization_id, availability_confidence, COUNT(*) 
            FROM animals 
            GROUP BY organization_id, availability_confidence 
            ORDER BY organization_id, availability_confidence
        """
        )

        current_state = cursor.fetchall()
        for org_id, confidence, count in current_state:
            print(f"  Org {org_id}: {confidence} = {count}")

        # Strategy: Reset animals to appropriate confidence based on their actual status
        # Animals that have been seen recently (within 7 days) and have low consecutive_scrapes_missing
        # should probably be high confidence, not low

        cutoff_date = datetime.now() - timedelta(days=7)

        print(f"\n🔍 Looking for animals to fix (last seen since {cutoff_date.date()})...")

        # Find animals that should be high confidence
        cursor.execute(
            """
            SELECT id, name, organization_id, consecutive_scrapes_missing, 
                   availability_confidence, last_seen_at
            FROM animals 
            WHERE availability_confidence = 'low'
            AND status = 'available'
            AND last_seen_at >= %s
            AND (consecutive_scrapes_missing <= 2 OR consecutive_scrapes_missing IS NULL)
        """,
            (cutoff_date,),
        )

        candidates = cursor.fetchall()
        print(f"Found {len(candidates)} animals that should likely be high confidence")

        if candidates:
            print("\nSample of animals to fix:")
            for i, (animal_id, name, org_id, missing, confidence, last_seen) in enumerate(candidates[:10]):
                print(f"  {animal_id}: {name} (Org {org_id}) - missing: {missing}, last seen: {last_seen.date() if last_seen else 'None'}")

            if len(candidates) > 10:
                print(f"  ... and {len(candidates) - 10} more")

        # Auto-confirm for this critical fix
        print(f"\n✅ Auto-confirming fix for {len(candidates)} animals (critical bug fix)")

        # Perform the fix
        print("\n🔄 Applying fixes...")

        fixed_count = 0
        for animal_id, name, org_id, missing, confidence, last_seen in candidates:
            cursor.execute(
                """
                UPDATE animals 
                SET availability_confidence = 'high',
                    updated_at = NOW()
                WHERE id = %s
            """,
                (animal_id,),
            )
            fixed_count += 1

        conn.commit()

        print(f"✅ Fixed {fixed_count} animals")

        # Show the new distribution
        print("\n📊 New availability confidence distribution:")
        cursor.execute(
            """
            SELECT organization_id, availability_confidence, COUNT(*) 
            FROM animals 
            GROUP BY organization_id, availability_confidence 
            ORDER BY organization_id, availability_confidence
        """
        )

        new_state = cursor.fetchall()
        for org_id, confidence, count in new_state:
            print(f"  Org {org_id}: {confidence} = {count}")

        cursor.close()

    print("\n🎉 Availability confidence fix completed!")


if __name__ == "__main__":
    fix_availability_confidence()
