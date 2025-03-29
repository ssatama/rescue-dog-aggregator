# view_sample_dogs.py

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import psycopg2
from dotenv import load_dotenv

# Import configuration
from config import DB_CONFIG

def connect_to_database():
    """Connect to the PostgreSQL database."""
    try:
        # Build connection parameters, handling empty password
        conn_params = {
            'host': DB_CONFIG['host'],
            'user': DB_CONFIG['user'],
            'database': DB_CONFIG['database'],
        }
        
        # Only add password if it's not empty
        if DB_CONFIG['password']:
            conn_params['password'] = DB_CONFIG['password']
        
        # Connect to the database
        conn = psycopg2.connect(**conn_params)
        print(f"Connected to database: {DB_CONFIG['database']}")
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        return None

def view_sample_dogs(limit=10):
    """View a sample of dogs in the database."""
    # Load environment variables
    load_dotenv()
    
    conn = connect_to_database()
    if not conn:
        return
    
    try:
        cursor = conn.cursor()
        
        # Get count of total dogs
        cursor.execute("SELECT COUNT(*) FROM dogs")
        total_count = cursor.fetchone()[0]
        print(f"\nTotal number of dogs in database: {total_count}")
        
        # Query for distinct dog names
        cursor.execute("""
            SELECT DISTINCT name FROM dogs
            ORDER BY name
        """)
        
        distinct_names = cursor.fetchall()
        print(f"Number of distinct dog names: {len(distinct_names)}")
        print("\nDistinct dog names:")
        for i, (name,) in enumerate(distinct_names):
            print(f"{i+1}. {name}")
            if i >= 19:  # Show max 20 names
                print("... (more names not shown)")
                break
        
        # Query for a sample of dogs with organization name
        cursor.execute("""
            SELECT d.id, d.name, o.name, d.breed, d.sex, d.age_text, d.status, d.adoption_url, d.primary_image_url
            FROM dogs d
            JOIN organizations o ON d.organization_id = o.id
            ORDER BY d.id DESC
            LIMIT %s
        """, (limit,))
        
        dogs = cursor.fetchall()
        
        if not dogs:
            print("No dogs found in the database.")
            return
        
        print(f"\nMost recent {limit} dogs in the database:")
        print("-" * 80)
        print(f"{'ID':<5}{'Name':<20}{'Organization':<20}{'Breed':<15}{'Sex':<10}{'Age':<10}{'Status':<15}")
        print("-" * 80)
        
        for dog in dogs:
            dog_id, name, org, breed, sex, age, status, url, img = dog
            print(f"{dog_id:<5}{name:<20}{org:<20}{breed or 'Unknown':<15}{sex or 'Unknown':<10}{age or 'Unknown':<10}{status:<15}")
            print(f"  URL: {url}")
            print(f"  Image: {img}")
            print("-" * 80)
        
        # Close the cursor
        cursor.close()
    except Exception as e:
        print(f"Error viewing dogs: {e}")
    finally:
        # Close the connection
        if conn:
            conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    # Get limit from command line if provided
    limit = 10
    if len(sys.argv) > 1:
        try:
            limit = int(sys.argv[1])
        except ValueError:
            print(f"Invalid limit: {sys.argv[1]}. Using default: 10")
    
    view_sample_dogs(limit)