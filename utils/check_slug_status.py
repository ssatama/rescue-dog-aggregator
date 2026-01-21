#!/usr/bin/env python3
"""
Quick script to check the current state of slug columns in the database.
"""

import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2

from config import DB_CONFIG


def check_slug_status():
    """Check current slug status in database."""
    try:
        # Connect to database
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }
        if DB_CONFIG.get("password"):
            conn_params["password"] = DB_CONFIG["password"]

        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        # Check if slug column exists
        cursor.execute(
            """
            SELECT column_name, is_nullable, data_type
            FROM information_schema.columns
            WHERE table_name = 'animals' AND column_name = 'slug'
        """
        )
        slug_column = cursor.fetchone()

        if not slug_column:
            print("❌ Slug column does not exist in animals table")
            return False

        print(f"✅ Slug column exists: {slug_column[2]} {'NULL' if slug_column[1] == 'YES' else 'NOT NULL'}")

        # Check animals with NULL slugs
        cursor.execute("SELECT COUNT(*) FROM animals WHERE slug IS NULL")
        null_count = cursor.fetchone()[0]

        # Check animals with empty slugs
        cursor.execute("SELECT COUNT(*) FROM animals WHERE slug = ''")
        empty_count = cursor.fetchone()[0]

        # Check total animals
        cursor.execute("SELECT COUNT(*) FROM animals")
        total_count = cursor.fetchone()[0]

        print("\n📊 Animals table status:")
        print(f"   Total animals: {total_count}")
        print(f"   Animals with NULL slug: {null_count}")
        print(f"   Animals with empty slug: {empty_count}")
        print(f"   Animals with valid slug: {total_count - null_count - empty_count}")

        if null_count > 0 or empty_count > 0:
            print(f"\n⚠️  {null_count + empty_count} animals need slug backfill")

            # Show a few examples
            cursor.execute(
                """
                SELECT id, name, breed, external_id, slug
                FROM animals
                WHERE slug IS NULL OR slug = ''
                LIMIT 5
            """
            )
            examples = cursor.fetchall()
            print("\n📝 Examples of animals needing slugs:")
            for animal_id, name, breed, external_id, slug in examples:
                print(f"   ID {animal_id}: {name} ({breed}) - slug: {slug}")
        else:
            print("\n✅ All animals have valid slugs!")

        cursor.close()
        conn.close()
        return True

    except Exception as e:
        print(f"❌ Error checking slug status: {e}")
        return False


if __name__ == "__main__":
    check_slug_status()
