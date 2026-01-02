#!/usr/bin/env python
"""
One-time script to fix protocol-relative URLs in the database.

This fixes the issue where some dogs have primary_image_url values starting with "//"
instead of "https://". These URLs cause Pydantic validation errors when building
Animal model responses.

Fixes Sentry issues: PYTHON-FASTAPI-1B, PYTHON-FASTAPI-Q

Usage:
    python management/fix_protocol_relative_urls.py --dry-run  # Preview changes
    python management/fix_protocol_relative_urls.py            # Apply changes
"""

import argparse
import os
import sys

import psycopg2
from psycopg2.extras import RealDictCursor


def get_connection():
    """Get database connection from environment."""
    database_url = os.environ.get("DATABASE_URL") or os.environ.get("RAILWAY_DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL or RAILWAY_DATABASE_URL environment variable not set")
        sys.exit(1)
    return psycopg2.connect(database_url)


def find_bad_urls(cursor):
    """Find all animals with protocol-relative URLs."""
    cursor.execute(
        """
        SELECT id, slug, name, primary_image_url, adoption_url
        FROM animals
        WHERE primary_image_url LIKE '//%'
           OR adoption_url LIKE '//%'
        ORDER BY id
    """
    )
    return cursor.fetchall()


def fix_urls(cursor, dry_run=True):
    """Fix protocol-relative URLs by prepending https:."""
    bad_records = find_bad_urls(cursor)

    if not bad_records:
        print("No protocol-relative URLs found. Database is clean.")
        return 0

    print(f"Found {len(bad_records)} records with protocol-relative URLs:")
    for record in bad_records:
        print(f"  - {record['slug']} (id={record['id']}): {record['name']}")
        if record["primary_image_url"] and record["primary_image_url"].startswith("//"):
            print(f"    primary_image_url: {record['primary_image_url'][:60]}...")

    if dry_run:
        print(f"\nDry run: Would fix {len(bad_records)} records.")
        print("Run without --dry-run to apply changes.")
        return len(bad_records)

    cursor.execute(
        """
        UPDATE animals
        SET primary_image_url = 'https:' || primary_image_url
        WHERE primary_image_url LIKE '//%'
    """
    )
    primary_fixed = cursor.rowcount

    cursor.execute(
        """
        UPDATE animals
        SET adoption_url = 'https:' || adoption_url
        WHERE adoption_url LIKE '//%'
    """
    )
    adoption_fixed = cursor.rowcount

    print(f"\nFixed {primary_fixed} primary_image_url records")
    print(f"Fixed {adoption_fixed} adoption_url records")

    return primary_fixed + adoption_fixed


def main():
    parser = argparse.ArgumentParser(description="Fix protocol-relative URLs in database")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes without applying")
    args = parser.parse_args()

    print("Protocol-Relative URL Fix Script")
    print("=" * 40)

    conn = get_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        fixed_count = fix_urls(cursor, dry_run=args.dry_run)

        if not args.dry_run and fixed_count > 0:
            conn.commit()
            print("\nChanges committed successfully.")

            remaining = find_bad_urls(cursor)
            if remaining:
                print(f"WARNING: {len(remaining)} records still have bad URLs")
            else:
                print("Verification: All URLs are now properly formatted.")

    except Exception as e:
        conn.rollback()
        print(f"ERROR: {e}")
        sys.exit(1)
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
