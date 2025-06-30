# clear_animals.py (renamed from clear_dogs.py)

import os
import sys

import psycopg2
from dotenv import load_dotenv

from config import DB_CONFIG

# Add parent directory to path to import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import configuration - this MUST be after path modification


def connect_to_database():
    """Connect to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        print(f"✅ Connected to database: {DB_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"❌ Database connection error: {e}")
        return None


def clear_animals():
    """Clear all animals from the database with enhanced safety checks."""
    # Load environment variables
    load_dotenv()

    print("🗑️  Animal Database Cleaner")
    print("=" * 50)

    # Safety check - prevent accidental production database clearing
    db_name = DB_CONFIG.get("database", "")
    if "prod" in db_name.lower() or "production" in db_name.lower():
        print("❌ SAFETY ERROR: This appears to be a production database!")
        print(f"   Database name: {db_name}")
        print("   This script should not be used on production databases.")
        return

    print(f"🏠 Target database: {db_name}")
    if "test" not in db_name.lower() and "dev" not in db_name.lower():
        print("⚠️  WARNING: This doesn't appear to be a test or development database")

    conn = connect_to_database()
    if not conn:
        return

    try:
        cursor = conn.cursor()

        # Get detailed count of what will be deleted
        cursor.execute("SELECT COUNT(*) FROM animals")
        animals_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM animal_images")
        images_count = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM scrape_logs")
        logs_count = cursor.fetchone()[0]

        print(f"📊 Current database contents:")
        print(f"  • Animals: {animals_count}")
        print(f"  • Animal images: {images_count}")
        print(f"  • Scrape logs: {logs_count}")

        if animals_count == 0:
            print("✅ Database is already empty!")
            return

        # Enhanced confirmation with more details
        print(f"\n⚠️  This will PERMANENTLY DELETE:")
        print(f"  • {animals_count} animals")
        print(f"  • {images_count} animal images")
        print(f"  • {logs_count} scrape logs")
        print(f"\n🗄️ Database: {db_name}")
        print("This action CANNOT be undone!")

        confirm1 = input("\nType 'DELETE ALL' to confirm (or anything else to cancel): ")
        if confirm1 != "DELETE ALL":
            print("❌ Operation cancelled - confirmation text did not match")
            return

        confirm2 = input("Are you absolutely sure? Type 'yes' to proceed: ")
        if confirm2.lower() != "yes":
            print("❌ Operation cancelled")
            return

        print("\n🗑️  Deleting data...")

        # Delete in correct order due to foreign key constraints
        cursor.execute("DELETE FROM animal_images")
        images_deleted = cursor.rowcount
        print(f"  ✅ Deleted {images_deleted} animal images")

        cursor.execute("DELETE FROM animals")
        animals_deleted = cursor.rowcount
        print(f"  ✅ Deleted {animals_deleted} animals")

        cursor.execute("DELETE FROM scrape_logs")
        logs_deleted = cursor.rowcount
        print(f"  ✅ Deleted {logs_deleted} scrape logs")

        # Commit the changes
        conn.commit()
        print("\n✅ All data successfully deleted!")

        # Verify the deletion
        cursor.execute("SELECT COUNT(*) FROM animals")
        remaining_animals = cursor.fetchone()[0]

        cursor.execute("SELECT COUNT(*) FROM animal_images")
        remaining_images = cursor.fetchone()[0]

        if remaining_animals == 0 and remaining_images == 0:
            print("🔍 Verification: Database is now empty")
        else:
            print(
                f"⚠️  Verification warning: {remaining_animals} animals and {remaining_images} images remain"
            )

        cursor.close()
    except Exception as e:
        print(f"❌ Error clearing animals: {e}")
        print("🔄 Rolling back changes...")
        conn.rollback()
    finally:
        if conn:
            conn.close()
            print("🔌 Database connection closed")


if __name__ == "__main__":
    clear_animals()
