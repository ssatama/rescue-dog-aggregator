# database/db_update.py

import os
import sys

import psycopg2
from psycopg2 import sql

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import configuration
from config import DB_CONFIG


def connect_to_database():
    """Connect to the PostgreSQL database."""
    try:
        # Build connection parameters, handling empty password
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
        }

        # Only add password if it's not empty
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        # Connect to the database
        conn_params["database"] = DB_CONFIG["database"]
        conn = psycopg2.connect(**conn_params)
        print(f"Connected to database: {DB_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise


def update_schema(conn):
    """Update the database schema."""
    try:
        cursor = conn.cursor()

        # Option 1: If you want to add a column to the dogs table
        print("Adding 'language' column to the dogs table...")
        try:
            cursor.execute(
                """
                ALTER TABLE dogs 
                ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en'
            """
            )
            print("Added 'language' column successfully")
        except Exception as e:
            print(f"Error adding column: {e}")
            conn.rollback()
            raise

        # Commit the changes
        conn.commit()
        cursor.close()
        print("Database schema updated successfully")
        return True
    except Exception as e:
        print(f"Error updating schema: {e}")
        conn.rollback()
        raise


def update_database():
    """Update the database schema."""
    try:
        conn = connect_to_database()
        success = update_schema(conn)

        # Close the connection
        if conn:
            conn.close()
            print("Database connection closed")

        return success
    except Exception as e:
        print(f"Database update failed: {e}")
        return False


if __name__ == "__main__":
    print("Starting database update...")

    if update_database():
        print("Database update completed successfully")
    else:
        print("Database update failed")
