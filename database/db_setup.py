# database/db_setup.py
import os
import sys

import psycopg2
from psycopg2 import errors

from config import DB_CONFIG

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


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

        conn = psycopg2.connect(**conn_params)
        print(f"Connected to database: {DB_CONFIG['database']}")
        return conn

    except psycopg2.OperationalError as e:
        # Handle case where database doesn't exist (optional, depends on
        # workflow)
        if f'database "{DB_CONFIG["database"]}" does not exist' in str(e):
            print(f"Database '{DB_CONFIG['database']}' does not exist. Please create it first.")
            # Optionally, try connecting to default 'postgres' db to create it
        else:
            print(f"Database connection error: {e}")
        raise  # Re-raise the exception to indicate failure

    except Exception as e:
        print(f"Unexpected connection error: {e}")
        raise


def create_tables(conn):
    """Create tables in the database using the schema.sql file."""
    try:
        cursor = conn.cursor()

        # Read the schema file
        schema_path = os.path.join(os.path.dirname(__file__), "schema.sql")
        with open(schema_path, "r") as f:
            schema_sql = f.read()

        # Execute the SQL commands
        cursor.execute(schema_sql)

        # Commit the changes
        conn.commit()
        print("Database schema processed successfully (or already exists)")

        cursor.close()
        return True

    except errors.DuplicateTable as e:
        print(f"Info: Tables already exist ({e}). Skipping schema creation.")
        conn.rollback()
        cursor.close()
        return True

    except Exception as e:
        print(f"Error processing schema: {e}")
        conn.rollback()
        cursor.close()
        raise


def initialize_database():
    """Initialize the database by connecting and creating tables."""
    conn = None
    try:
        conn = connect_to_database()
        schema_ok = create_tables(conn)
        if schema_ok:
            print("Database schema is ready.")
            return conn
        else:
            print("Database schema creation failed.")
            return None

    except Exception as e:
        print(f"Database initialization failed: {e}")
        if conn:
            conn.close()
        return None


def add_organization(conn, name, website_url, description=None, country=None, city=None, logo_url=None):
    """Add a new organization to the database."""
    if not conn:
        print("Error: Cannot add organization, no valid database connection.")
        return False
    try:
        cursor = conn.cursor()

        # Check if organization already exists
        cursor.execute("SELECT id FROM organizations WHERE name = %s", (name,))
        existing = cursor.fetchone()

        if existing:
            print(f"Organization '{name}' already exists with ID {existing[0]}. Skipping.")
            cursor.close()
            return True

        # Insert new organization
        print(f"Adding organization: {name}")
        cursor.execute(
            """
            INSERT INTO organizations (name, website_url, description, country, city, logo_url)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (name, website_url, description, country, city, logo_url),
        )
        conn.commit()
        print(f"Organization '{name}' added successfully.")
        cursor.close()
        return True

    except Exception as e:
        print(f"Error adding organization '{name}': {e}")
        conn.rollback()
        if cursor:
            cursor.close()
        return False


def setup_initial_data():
    """Set up initial data for the application."""
    conn = None
    try:
        conn = initialize_database()
        if not conn:
            print("Cannot setup initial data because database initialization failed.")
            return False

        print("Setting up initial data...")

        # Add Pets in Turkey organization
        org_added = add_organization(
            conn=conn,
            name="Pets in Turkey",
            website_url="https://www.petsinturkey.org",
            description="Rescue organization based in Turkey, focusing on dogs and cats.",
            country="Turkey",
            city=None,
            logo_url="https://images.squarespace-cdn.com/content/v1/60b0c58c51e13d5e3d1d1b3f/8566a85a-9b80-4c46-8a1a-969a30f11092/PIT+LOGO+ROUND+TRANSPARENT+BG.png?format=1500w",
        )

        print("Initial data setup completed.")
        return org_added

    except Exception as e:
        print(f"Error setting up initial data: {e}")
        return False
    finally:
        if conn:
            conn.close()
            print("Database connection closed after initial data setup.")


if __name__ == "__main__":
    print("Starting database setup...")

    success = setup_initial_data()

    if success:
        print("Database setup process completed successfully.")
    else:
        print("Database setup process failed.")
