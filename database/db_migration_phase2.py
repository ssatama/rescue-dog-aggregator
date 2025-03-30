# database/db_migration_phase2.py

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
        raise

def migrate_database():
    """Run the database migration for Phase 2."""
    try:
        conn = connect_to_database()
        conn.autocommit = False  # Use transactions for safety
        cursor = conn.cursor()
        
        print("Starting Phase 2 database migration...")
        
        # Step 1: Create backup of existing tables (as views first for safety)
        print("Creating backup views of existing tables...")
        cursor.execute("CREATE OR REPLACE VIEW dogs_backup AS SELECT * FROM dogs")
        cursor.execute("CREATE OR REPLACE VIEW dog_images_backup AS SELECT * FROM dog_images")
        print("Backup views created successfully.")
        
        # Step 2: Create new standardization tables
        print("Creating standardization tables...")
        cursor.execute("""
            CREATE TABLE breed_standards (
                id SERIAL PRIMARY KEY,
                original_text VARCHAR(255) NOT NULL,
                standardized_value VARCHAR(100) NOT NULL,
                animal_type VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        cursor.execute("""
            CREATE TABLE size_standards (
                id SERIAL PRIMARY KEY,
                original_text VARCHAR(255) NOT NULL,
                standardized_value VARCHAR(50) NOT NULL,
                animal_type VARCHAR(20) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("Standardization tables created successfully.")
        
        # Step 3: Create service regions table for geographic information
        print("Creating service regions table...")
        cursor.execute("""
            CREATE TABLE service_regions (
                id SERIAL PRIMARY KEY,
                organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
                country VARCHAR(100) NOT NULL,
                region VARCHAR(100),
                active BOOLEAN DEFAULT TRUE,
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("Service regions table created successfully.")
        
        # Step 4: Add new columns to the dogs table before renaming
        print("Adding new columns to dogs table...")
        cursor.execute("""
            ALTER TABLE dogs 
            ADD COLUMN animal_type VARCHAR(50) NOT NULL DEFAULT 'dog',
            ADD COLUMN age_min_months INTEGER,
            ADD COLUMN age_max_months INTEGER,
            ADD COLUMN standardized_breed VARCHAR(100),
            ADD COLUMN standardized_size VARCHAR(50)
        """)
        print("New columns added successfully.")
        
        # Step 5: Create new animals table (we'll copy data later)
        print("Creating animals table...")
        cursor.execute("""
            CREATE TABLE animals (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                organization_id INTEGER NOT NULL REFERENCES organizations(id),
                animal_type VARCHAR(50) NOT NULL DEFAULT 'dog',
                external_id VARCHAR(255),
                primary_image_url TEXT,
                adoption_url TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'available',
                breed VARCHAR(255),
                standardized_breed VARCHAR(100),
                age_text VARCHAR(100),
                age_min_months INTEGER,
                age_max_months INTEGER,
                sex VARCHAR(50),
                size VARCHAR(50),
                standardized_size VARCHAR(50),
                language VARCHAR(10) DEFAULT 'en',
                properties JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_scraped_at TIMESTAMP,
                source_last_updated TIMESTAMP
            )
        """)
        
        # Step 6: Create new animal_images table
        print("Creating animal_images table...")
        cursor.execute("""
            CREATE TABLE animal_images (
                id SERIAL PRIMARY KEY,
                animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
                image_url TEXT NOT NULL,
                is_primary BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Step 7: Copy data from dogs to animals
        print("Copying data from dogs to animals...")
        cursor.execute("""
            INSERT INTO animals (
                id, name, organization_id, animal_type, external_id, 
                primary_image_url, adoption_url, status, breed, standardized_breed,
                age_text, age_min_months, age_max_months, sex, size, standardized_size,
                language, properties, created_at, updated_at, last_scraped_at, 
                source_last_updated
            )
            SELECT 
                id, name, organization_id, animal_type, external_id,
                primary_image_url, adoption_url, status, breed, standardized_breed,
                age_text, age_min_months, age_max_months, sex, size, standardized_size,
                language, properties, created_at, updated_at, last_scraped_at,
                source_last_updated
            FROM dogs
        """)
        
        # Step 8: Copy data from dog_images to animal_images
        print("Copying data from dog_images to animal_images...")
        cursor.execute("""
            INSERT INTO animal_images (
                id, animal_id, image_url, is_primary, created_at
            )
            SELECT 
                id, dog_id, image_url, is_primary, created_at
            FROM dog_images
        """)
        
        # Step 9: Update sequences for the new tables
        print("Updating sequences...")
        cursor.execute("SELECT setval('animals_id_seq', (SELECT MAX(id) FROM animals), true)")
        cursor.execute("SELECT setval('animal_images_id_seq', (SELECT MAX(id) FROM animal_images), true)")
        
        # Step 10: Create indexes for the new tables
        print("Creating indexes...")
        cursor.execute("CREATE INDEX idx_animals_organization ON animals(organization_id)")
        cursor.execute("CREATE INDEX idx_animals_status ON animals(status)")
        cursor.execute("CREATE INDEX idx_animals_type ON animals(animal_type)")
        cursor.execute("CREATE INDEX idx_animals_breed ON animals(breed)")
        cursor.execute("CREATE INDEX idx_animals_standardized_breed ON animals(standardized_breed)")
        cursor.execute("CREATE INDEX idx_animals_sex ON animals(sex)")
        cursor.execute("CREATE INDEX idx_animals_size ON animals(size)")
        cursor.execute("CREATE INDEX idx_animals_standardized_size ON animals(standardized_size)")
        cursor.execute("CREATE INDEX idx_animals_name_gin ON animals USING gin(to_tsvector('english', name))")
        cursor.execute("CREATE INDEX idx_animals_breed_gin ON animals USING gin(to_tsvector('english', breed))")
        cursor.execute("CREATE INDEX idx_animals_properties ON animals USING gin(properties)")
        
        # Step 11: Commit all changes
        conn.commit()
        print("Phase 2 database migration completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("Database connection closed")

def rollback_migration():
    """Rollback the migration changes if needed."""
    try:
        conn = connect_to_database()
        conn.autocommit = False
        cursor = conn.cursor()
        
        print("Rolling back Phase 2 database migration...")
        
        # Drop new tables
        cursor.execute("DROP TABLE IF EXISTS animal_images")
        cursor.execute("DROP TABLE IF EXISTS animals")
        cursor.execute("DROP TABLE IF EXISTS service_regions")
        cursor.execute("DROP TABLE IF EXISTS breed_standards")
        cursor.execute("DROP TABLE IF EXISTS size_standards")
        
        # Remove added columns
        cursor.execute("""
            ALTER TABLE dogs 
            DROP COLUMN IF EXISTS animal_type,
            DROP COLUMN IF EXISTS age_min_months,
            DROP COLUMN IF EXISTS age_max_months,
            DROP COLUMN IF EXISTS standardized_breed,
            DROP COLUMN IF EXISTS standardized_size
        """)
        
        # Drop backup views
        cursor.execute("DROP VIEW IF EXISTS dogs_backup")
        cursor.execute("DROP VIEW IF EXISTS dog_images_backup")
        
        conn.commit()
        print("Rollback completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during rollback: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("Database connection closed")

def finalize_migration():
    """Finalize the migration by dropping old tables (run after verification)."""
    try:
        conn = connect_to_database()
        conn.autocommit = False
        cursor = conn.cursor()
        
        print("Finalizing Phase 2 database migration...")
        
        # First, verify that the new tables have data
        cursor.execute("SELECT COUNT(*) FROM animals")
        animal_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM animal_images")
        image_count = cursor.fetchone()[0]
        
        print(f"Verification: Found {animal_count} animals and {image_count} images in new tables.")
        
        if animal_count == 0:
            print("ERROR: No data found in animals table. Aborting finalization.")
            return
        
        # Drop backup views first
        print("Dropping backup views...")
        cursor.execute("DROP VIEW IF EXISTS dogs_backup")
        cursor.execute("DROP VIEW IF EXISTS dog_images_backup")
        
        # Drop old tables
        print("Dropping old tables...")
        cursor.execute("DROP TABLE IF EXISTS dog_images")
        cursor.execute("DROP TABLE IF EXISTS dogs")
        
        conn.commit()
        print("Migration finalization completed successfully!")
        
    except Exception as e:
        conn.rollback()
        print(f"Error during finalization: {e}")
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("Database connection closed")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Database migration for Phase 2')
    parser.add_argument('--action', choices=['migrate', 'rollback', 'finalize'], 
                        default='migrate', help='Action to perform')
    
    args = parser.parse_args()
    
    if args.action == 'migrate':
        migrate_database()
    elif args.action == 'rollback':
        rollback_migration()
    elif args.action == 'finalize':
        finalize_migration()