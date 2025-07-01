#!/usr/bin/env python3
"""
Fix PIT and REAN duplicate animals caused by external ID generation changes.

The issue: When external ID generation changed, the scrapers created new entries
instead of updating existing ones, causing duplicates:
- PIT: pit-{name} → pit-{name}-{hash}
- REAN: rean-{type}-{name} → rean-{type}-{name}-{hash}

This script removes the old entries (without hash) and keeps the new ones (with hash).
"""

import os
import sys

import psycopg2
from dotenv import load_dotenv

from config import DB_CONFIG

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def connect_to_database():
    """Connect to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print(f"✅ Connected to database: {DB_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None


def analyze_organization_duplicates(conn, org_pattern, org_type):
    """Analyze duplicates for a specific organization."""
    cursor = conn.cursor()

    # Get organization ID
    cursor.execute("SELECT id, name FROM organizations WHERE name ILIKE %s", (f"%{org_pattern}%",))
    org_result = cursor.fetchone()
    if not org_result:
        print(f"❌ Could not find {org_type} organization")
        return None

    org_id, org_name = org_result
    print(f"🏢 Found organization: {org_name} (ID: {org_id})")

    # Count total animals
    cursor.execute("SELECT COUNT(*) FROM animals WHERE organization_id = %s", (org_id,))
    total_count = cursor.fetchone()[0]
    print(f"📊 Total {org_type} animals: {total_count}")

    if org_type == "PIT":
        # PIT patterns: pit-name vs pit-name-hash
        old_pattern_query = "external_id ~ '^pit-[^-]+$'"
        new_pattern_query = "external_id ~ '^pit-.+-[a-f0-9]{6}$'"
        old_desc = "pit-name"
        new_desc = "pit-name-hash"
    else:  # REAN
        # REAN patterns: rean-type-name vs rean-type-name-hash
        old_pattern_query = "external_id ~ '^rean-[^-]+-[^-]+$'"
        new_pattern_query = "external_id ~ '^rean-.+-[a-f0-9]{6}$'"
        old_desc = "rean-type-name"
        new_desc = "rean-type-name-hash"

    # Count old pattern (without hash)
    cursor.execute(
        f"""
        SELECT COUNT(*) FROM animals
        WHERE organization_id = %s
        AND {old_pattern_query}
    """,
        (org_id,),
    )
    old_pattern_count = cursor.fetchone()[0]
    print(f"🔴 Old pattern animals ({old_desc}): {old_pattern_count}")

    # Count new pattern (with hash)
    cursor.execute(
        f"""
        SELECT COUNT(*) FROM animals
        WHERE organization_id = %s
        AND {new_pattern_query}
    """,
        (org_id,),
    )
    new_pattern_count = cursor.fetchone()[0]
    print(f"🟢 New pattern animals ({new_desc}): {new_pattern_count}")

    # Show some examples
    print(f"\n📋 Sample {org_type} duplicates:")
    cursor.execute(
        """
        SELECT name, external_id, created_at
        FROM animals
        WHERE organization_id = %s
        AND name IN (
            SELECT name FROM animals
            WHERE organization_id = %s
            GROUP BY name
            HAVING COUNT(*) > 1
        )
        ORDER BY name, created_at
        LIMIT 10
    """,
        (org_id, org_id),
    )

    for row in cursor.fetchall():
        name, external_id, created_at = row
        # Determine if it's old or new pattern
        if org_type == "PIT":
            is_old = len(external_id.split("-")) == 2  # pit-name vs pit-name-hash
        else:  # REAN
            is_old = len(external_id.split("-")) == 3  # rean-type-name vs rean-type-name-hash
        pattern = "OLD" if is_old else "NEW"
        print(f"  {name}: {external_id} ({pattern}) - {created_at}")

    cursor.close()
    return org_id, old_pattern_count, new_pattern_count, org_type


def fix_organization_duplicates(conn, org_id, org_type, dry_run=True):
    """Fix duplicates by removing old pattern entries."""
    cursor = conn.cursor()

    print(f"\n{'🔍 DRY RUN' if dry_run else '🔧 EXECUTING'} {org_type} duplicate fix...")

    if org_type == "PIT":
        # PIT old pattern: pit-name (no hash)
        old_pattern_query = "external_id ~ '^pit-[^-]+$'"
    else:  # REAN
        # REAN old pattern: rean-type-name (no hash)
        old_pattern_query = "external_id ~ '^rean-[^-]+-[^-]+$'"

    # Get list of animals to delete (old pattern)
    cursor.execute(
        f"""
        SELECT id, external_id, name, created_at
        FROM animals
        WHERE organization_id = %s
        AND {old_pattern_query}
        ORDER BY name, created_at
    """,
        (org_id,),
    )

    animals_to_delete = cursor.fetchall()
    print(f"📋 Found {len(animals_to_delete)} old pattern {org_type} animals to remove")

    if not animals_to_delete:
        print(f"✅ No {org_type} duplicates found to fix")
        cursor.close()
        return

    # Show first few examples
    print(f"\n🔍 Examples of {org_type} animals to be removed:")
    for i, (animal_id, external_id, name, created_at) in enumerate(animals_to_delete[:5]):
        print(f"  {i+1}. ID: {animal_id}, External ID: {external_id}, Name: {name}, Created: {created_at}")

    if len(animals_to_delete) > 5:
        print(f"  ... and {len(animals_to_delete) - 5} more")

    if not dry_run:
        print(f"\n⚠️  About to delete these {org_type} animals and their associated data...")
        confirm = input("Are you sure you want to proceed? (yes/no): ")
        if confirm.lower() != "yes":
            print("❌ Operation cancelled")
            cursor.close()
            return

        try:
            # Delete associated images first
            animal_ids = [str(row[0]) for row in animals_to_delete]
            cursor.execute(
                f"""
                DELETE FROM animal_images
                WHERE animal_id IN ({','.join(['%s'] * len(animal_ids))})
            """,
                animal_ids,
            )
            images_deleted = cursor.rowcount
            print(f"🗑️  Deleted {images_deleted} associated images")

            # Delete the animals
            cursor.execute(
                f"""
                DELETE FROM animals
                WHERE id IN ({','.join(['%s'] * len(animal_ids))})
            """,
                animal_ids,
            )
            animals_deleted = cursor.rowcount
            print(f"🗑️  Deleted {animals_deleted} duplicate {org_type} animals")

            # Commit the changes
            conn.commit()
            print(f"✅ Successfully fixed {org_type} duplicates")

        except Exception as e:
            print(f"❌ Error during {org_type} deletion: {e}")
            conn.rollback()

    cursor.close()


def main():
    """Main function to fix PIT and REAN duplicates."""
    load_dotenv()

    print("🔧 PIT & REAN Duplicate Fixer")
    print("=" * 50)

    conn = connect_to_database()
    if not conn:
        return

    try:
        organizations = [("turkey", "PIT"), ("rean", "REAN")]

        total_fixes_needed = 0
        org_results = []

        # Analyze all organizations
        for org_pattern, org_type in organizations:
            print(f"\n{'=' * 25} {org_type} {'=' * 25}")
            result = analyze_organization_duplicates(conn, org_pattern, org_type)
            if result:
                org_id, old_count, new_count, org_type = result
                total_fixes_needed += old_count
                org_results.append((org_id, org_type, old_count))

        if total_fixes_needed == 0:
            print("\n✅ No duplicates found - database is clean!")
            return

        print(f"\n📊 Summary: {total_fixes_needed} total duplicates found across organizations")

        # First run in dry-run mode for all organizations
        for org_id, org_type, old_count in org_results:
            if old_count > 0:
                print("\n" + "=" * 50)
                fix_organization_duplicates(conn, org_id, org_type, dry_run=True)

        # Ask user if they want to proceed
        print("\n" + "=" * 50)
        proceed = input("Do you want to execute the fix for ALL organizations? (yes/no): ")

        if proceed.lower() == "yes":
            # Execute fixes for all organizations
            for org_id, org_type, old_count in org_results:
                if old_count > 0:
                    print("\n" + "=" * 50)
                    fix_organization_duplicates(conn, org_id, org_type, dry_run=False)

            # Verify the fixes
            print("\n" + "=" * 50)
            print("🔍 Verifying fixes...")
            for org_pattern, org_type in organizations:
                print(f"\n--- {org_type} Verification ---")
                analyze_organization_duplicates(conn, org_pattern, org_type)
        else:
            print("❌ Fix cancelled")

    finally:
        conn.close()
        print("\n🔌 Database connection closed")


if __name__ == "__main__":
    main()
