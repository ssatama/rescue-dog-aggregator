#!/usr/bin/env python3
"""
Verify that the database migration was successful and sync is ready.
"""

import os
import sys
from datetime import datetime

import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def get_local_connection():
    """Get connection to local database."""
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "rescue_dogs"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "postgres"),
    )


def get_railway_connection():
    """Get connection to Railway database."""
    railway_url = os.getenv("RAILWAY_DATABASE_URL")
    if not railway_url:
        raise ValueError("RAILWAY_DATABASE_URL not found in environment variables")
    return psycopg2.connect(railway_url)


def verify_schema(cursor, db_name):
    """Verify the schema for a database."""
    # Check column count
    cursor.execute(
        """
        SELECT COUNT(*) FROM information_schema.columns 
        WHERE table_name = 'animals'
    """
    )
    column_count = cursor.fetchone()[0]

    # Check for breed_slug
    cursor.execute(
        """
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'animals' AND column_name = 'breed_slug'
        )
    """
    )
    has_breed_slug = cursor.fetchone()[0]

    # Check for removed columns
    removed_columns = [
        "last_session_id",
        "enriched_description",
        "source_last_updated",
        "llm_processed_at",
        "llm_model_used",
    ]
    removed_found = []
    for col in removed_columns:
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'animals' AND column_name = %s
            )
        """,
            (col,),
        )
        if cursor.fetchone()[0]:
            removed_found.append(col)

    return {
        "column_count": column_count,
        "has_breed_slug": has_breed_slug,
        "removed_columns_found": removed_found,
    }


def main():
    print("=" * 60)
    print("DATABASE MIGRATION VERIFICATION")
    print("=" * 60)
    print(f"Timestamp: {datetime.now().isoformat()}\n")

    success = True

    # Verify local database
    print("LOCAL DATABASE:")
    print("-" * 40)
    try:
        with get_local_connection() as conn:
            with conn.cursor() as cursor:
                local_schema = verify_schema(cursor, "Local")
                print(f"✓ Column count: {local_schema['column_count']}")
                print(f"✓ Has breed_slug: {'YES' if local_schema['has_breed_slug'] else 'NO'}")

                if local_schema["removed_columns_found"]:
                    print(f"✗ Still has removed columns: {', '.join(local_schema['removed_columns_found'])}")
                    success = False
                else:
                    print("✓ All obsolete columns removed")
    except Exception as e:
        print(f"✗ Error checking local database: {e}")
        success = False

    print()

    # Verify Railway database
    print("RAILWAY DATABASE:")
    print("-" * 40)
    try:
        with get_railway_connection() as conn:
            with conn.cursor() as cursor:
                railway_schema = verify_schema(cursor, "Railway")
                print(f"✓ Column count: {railway_schema['column_count']}")
                print(f"✓ Has breed_slug: {'YES' if railway_schema['has_breed_slug'] else 'NO'}")

                if railway_schema["removed_columns_found"]:
                    print(f"✗ Still has removed columns: {', '.join(railway_schema['removed_columns_found'])}")
                    success = False
                else:
                    print("✓ All obsolete columns removed")
    except Exception as e:
        print(f"✗ Error checking Railway database: {e}")
        success = False

    print()

    # Compare schemas
    print("SCHEMA COMPARISON:")
    print("-" * 40)
    try:
        if local_schema["column_count"] == railway_schema["column_count"]:
            print(f"✓ Both databases have {local_schema['column_count']} columns")
        else:
            print(f"✗ Column count mismatch: Local={local_schema['column_count']}, Railway={railway_schema['column_count']}")
            success = False

        if local_schema["has_breed_slug"] and railway_schema["has_breed_slug"]:
            print("✓ breed_slug column exists in both databases")
        else:
            print("✗ breed_slug column missing in one or both databases")
            success = False
    except:
        pass  # Variables might not be defined if earlier steps failed

    print()
    print("=" * 60)
    if success:
        print("✅ MIGRATION SUCCESSFUL - Ready for sync!")
        print("\nNext steps:")
        print("1. Run sync with: python management/railway_commands.py sync")
        print("2. Or dry run first: python management/railway_commands.py sync --dry-run")
    else:
        print("❌ MIGRATION VERIFICATION FAILED")
        print("\nPlease check the errors above and re-run the migration if needed.")
    print("=" * 60)

    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
