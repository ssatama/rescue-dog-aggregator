#!/usr/bin/env python3
"""
Database status checker for Rescue Dog Aggregator.
Verifies the current database structure matches expectations.
"""

from config import DB_CONFIG
import os
import sys

import psycopg2

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def check_database_status():
    """Check if database has the expected structure."""
    try:
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        print("🔍 Checking database structure...\n")

        # Expected tables
        expected_tables = [
            "organizations",
            "animals",
            "animal_images",
            "scrape_logs",
            "service_regions",
        ]

        # Check which tables exist
        cursor.execute(
            """
            SELECT tablename
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY tablename;
        """
        )

        existing_tables = [row[0] for row in cursor.fetchall()]

        print("✅ Expected tables:")
        for table in expected_tables:
            if table in existing_tables:
                cursor.execute(f"SELECT COUNT(*) FROM {table}")
                count = cursor.fetchone()[0]
                print(f"   - {table}: {count} records")
            else:
                print(f"   - {table}: ❌ MISSING")

        # Check for old tables that should not exist
        old_tables = ["dogs", "dog_images"]
        problems = []

        print("\n🚫 Old tables (should not exist):")
        for table in old_tables:
            if table in existing_tables:
                print(f"   - {table}: ⚠️  EXISTS (should be removed)")
                problems.append(f"Old table '{table}' still exists")
            else:
                print(f"   - {table}: ✅ Not found (good)")

        # Check animal_type values
        print("\n📊 Animal types in database:")
        cursor.execute(
            """
            SELECT animal_type, COUNT(*)
            FROM animals
            GROUP BY animal_type
        """
        )
        for animal_type, count in cursor.fetchall():
            print(f"   - {animal_type}: {count}")

        cursor.close()
        conn.close()

        if problems:
            print(f"\n⚠️  Found {len(problems)} issues:")
            for p in problems:
                print(f"   - {p}")
            return False
        else:
            print("\n✅ Database structure looks good!")
            return True

    except Exception as e:
        print(f"❌ Error checking database: {e}")
        return False


if __name__ == "__main__":
    check_database_status()
