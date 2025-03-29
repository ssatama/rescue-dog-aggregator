# database/db_setup.py

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
            'host': DB_CONFIG['host'],
            'user': DB_CONFIG['user'],
        }
        
        # Only add password if it's not empty
        if DB_CONFIG['password']:
            conn_params['password'] = DB_CONFIG['password']
            
        # First try to connect to the specific database
        try:
            conn_params['database'] = DB_CONFIG['database']
            conn = psycopg2.connect(**conn_params)
            print(f"Connected to database: {DB_CONFIG['database']}")
            return conn
        except psycopg2.OperationalError as e:
            if "does not exist" not in str(e):
                # If error is not about database not existing, re-raise
                raise
                
            # If the database doesn't exist, connect to 'postgres' and create it
            conn_params['database'] = 'postgres'  # Connect to default database
            conn = psycopg2.connect(**conn_params)
            conn.autocommit = True  # Enable autocommit for database creation
            cursor = conn.cursor()
            
            # Create the database if it doesn't exist
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(
                sql.Identifier(DB_CONFIG['database'])
            ))
            cursor.close()
            conn.close()
            
            print(f"Created database: {DB_CONFIG['database']}")
            
            # Now connect to the newly created database
            conn_params['database'] = DB_CONFIG['database']
            conn = psycopg2.connect(**conn_params)
            return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        print("\nPlease check your PostgreSQL installation and credentials.")
        print("You can set database credentials using environment variables:")
        print("  DB_HOST, DB_NAME, DB_USER, DB_PASSWORD")
        print("Or by creating a .env file based on the .env.sample template.")
        raise

def create_tables(conn):
    """Create tables in the database using the schema.sql file."""
    try:
        cursor = conn.cursor()
        
        # Read the schema file
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
        
        # Execute the SQL commands
        cursor.execute(schema_sql)
        
        # Commit the changes
        conn.commit()
        print("Database schema created successfully")
        
        cursor.close()
    except Exception as e:
        print(f"Error creating tables: {e}")
        conn.rollback()
        raise

def initialize_database():
    """Initialize the database by connecting and creating tables."""
    try:
        conn = connect_to_database()
        create_tables(conn)
        print("Database initialization completed successfully")
        
        # Close the connection
        if conn:
            conn.close()
            print("Database connection closed")
        
        return True
    except Exception as e:
        print(f"Database initialization failed: {e}")
        return False

def add_organization(conn, name, website_url, description=None, country=None, city=None, logo_url=None):
    """Add a new organization to the database."""
    try:
        cursor = conn.cursor()
        
        # Check if organization already exists
        cursor.execute(
            "SELECT id FROM organizations WHERE name = %s",
            (name,)
        )
        existing = cursor.fetchone()
        
        if existing:
            print(f"Organization '{name}' already exists with ID: {existing[0]}")
            cursor.close()
            return existing[0]
        
        # Insert new organization
        cursor.execute(
            """
            INSERT INTO organizations (name, website_url, description, country, city, logo_url)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
            """,
            (name, website_url, description, country, city, logo_url)
        )
        
        org_id = cursor.fetchone()[0]
        conn.commit()
        print(f"Added organization '{name}' with ID: {org_id}")
        
        cursor.close()
        return org_id
    except Exception as e:
        print(f"Error adding organization: {e}")
        conn.rollback()
        return None

def setup_initial_data():
    """Set up initial data for the application."""
    try:
        conn = connect_to_database()
        
        # Add Pets in Turkey organization
        add_organization(
            conn,
            name="Pets in Turkey",
            website_url="https://www.petsinturkey.org",
            description="A Swiss registered non-profit dog rescue organization in Izmir, Turkey.",
            country="Turkey",
            city="Izmir",
            logo_url=None  # Add logo URL if available
        )
        
        # Close the connection
        if conn:
            conn.close()
            print("Initial data setup completed")
        
        return True
    except Exception as e:
        print(f"Initial data setup failed: {e}")
        return False

if __name__ == "__main__":
    print("Starting database setup...")
    
    # Initialize the database schema
    success = initialize_database()
    
    if success:
        # Set up initial data
        setup_initial_data()
        print("Database setup completed successfully")
    else:
        print("Database setup failed")