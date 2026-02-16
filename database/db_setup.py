# database/db_setup.py
import os
import sys

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2
from psycopg2 import errors

from config import DB_CONFIG


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
        with open(schema_path) as f:
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


def update_table_statistics(conn):
    """Update PostgreSQL table statistics for query optimization."""
    try:
        cursor = conn.cursor()

        print("Updating table statistics...")

        cursor.execute("ANALYZE animals;")
        cursor.execute("ANALYZE organizations;")
        cursor.execute("ANALYZE service_regions;")
        cursor.execute("ANALYZE scrape_logs;")

        conn.commit()
        print("Table statistics updated")
        cursor.close()
        return True

    except psycopg2.Error as e:
        print(f"Error updating table statistics: {e}")
        conn.rollback()
        cursor.close()
        return False


def initialize_database():
    """Initialize the database by connecting and creating tables."""
    conn = None
    try:
        conn = connect_to_database()
        schema_ok = create_tables(conn)

        if schema_ok:
            if not update_table_statistics(conn):
                print("Warning: Table statistics update failed. Database is usable but may have suboptimal query performance.")
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


if __name__ == "__main__":
    print("Starting database setup...")

    conn = initialize_database()

    if conn:
        print("Database setup process completed successfully.")
        conn.close()
    else:
        print("Database setup process failed.")
        sys.exit(1)
