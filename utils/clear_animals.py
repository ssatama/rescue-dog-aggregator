# clear_animals.py (renamed from clear_dogs.py)

import os
import sys

import psycopg2
from dotenv import load_dotenv

from config import DB_CONFIG

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import configuration


def connect_to_database():
    """Connect to the PostgreSQL database."""
    try:
        # Build connection parameters, handling empty password
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }

        # Only add password if it's not empty
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        # Connect to the database
        conn = psycopg2.connect(**conn_params)
        print(f"Connected to database: {DB_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None


def clear_animals():
    """Clear all animals from the database."""
    # Load environment variables
    load_dotenv()

    conn = connect_to_database()
    if not conn:
        return

    try:
        cursor = conn.cursor()

        # Get count of animals before clearing
        cursor.execute("SELECT COUNT(*) FROM animals")
        count_before = cursor.fetchone()[0]
        print(f"Current number of animals in database: {count_before}")

        # Ask for confirmation
        confirm = input(
            "Are you sure you want to delete all animals? (yes/no): ")
        if confirm.lower() != "yes":
            print("Operation cancelled.")
            return

        # Delete all animal images first (due to foreign key constraints)
        cursor.execute("DELETE FROM animal_images")

        # Delete all animals
        cursor.execute("DELETE FROM animals")

        # Delete all scrape logs as well
        cursor.execute("DELETE FROM scrape_logs")

        # Commit the changes
        conn.commit()

        # Get count after clearing
        cursor.execute("SELECT COUNT(*) FROM animals")
        count_after = cursor.fetchone()[0]

        print(f"Animals deleted: {count_before - count_after}")
        print(f"Remaining animals: {count_after}")

        # Close the cursor
        cursor.close()
    except Exception as e:
        print(f"Error clearing animals: {e}")
        conn.rollback()
    finally:
        # Close the connection
        if conn:
            conn.close()
            print("Database connection closed")


if __name__ == "__main__":
    clear_animals()
