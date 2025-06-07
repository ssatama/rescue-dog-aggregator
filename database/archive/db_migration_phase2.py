# database/db_migration_phase2.py

import argparse
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
        raise


def migrate_database():
    """Run the database migration for Phase 2."""
    conn = None  # Initialize conn outside try block
    cursor = None  # Initialize cursor outside try block
    try:
        conn = connect_to_database()
        conn.autocommit = False  # Use transactions for safety
        cursor = conn.cursor()

        print("Starting Phase 2 database migration...")

        # Step 1: Create backup of existing tables (as views first for safety)
        print("Creating backup views of existing tables...")
        # --- FIX: Use correct table names ---
        cursor.execute("CREATE OR REPLACE VIEW animals_backup AS SELECT * FROM animals")
        cursor.execute(
            "CREATE OR REPLACE VIEW animal_images_backup AS SELECT * FROM animal_images"
        )
        # --- END FIX ---
        print("Backup views created successfully.")

        # Step 2: Create new standardization tables (These might already exist)
        print("Creating standardization tables...")
        try:
            cursor.execute(
                """
                CREATE TABLE breed_standards (
                    id SERIAL PRIMARY KEY,
                    original_text VARCHAR(255) NOT NULL,
                    standardized_value VARCHAR(100) NOT NULL,
                    animal_type VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )
            print("Breed standards table created.")
        except psycopg2.errors.DuplicateTable:
            print("Info: breed_standards table already exists. Skipping creation.")
            conn.rollback()  # Rollback the failed CREATE TABLE attempt
            conn.autocommit = False  # Re-disable autocommit

        try:
            cursor.execute(
                """
                CREATE TABLE size_standards (
                    id SERIAL PRIMARY KEY,
                    original_text VARCHAR(255) NOT NULL,
                    standardized_value VARCHAR(50) NOT NULL,
                    animal_type VARCHAR(20) NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )
            print("Size standards table created.")
        except psycopg2.errors.DuplicateTable:
            print("Info: size_standards table already exists. Skipping creation.")
            conn.rollback()  # Rollback the failed CREATE TABLE attempt
            conn.autocommit = False  # Re-disable autocommit
        print("Standardization tables creation step completed.")

        # Step 3: Create service regions table for geographic information
        print("Creating service regions table...")
        try:
            cursor.execute(
                """
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
            """
            )
            print("Service regions table created successfully.")
        except psycopg2.errors.DuplicateTable:
            print("Info: service_regions table already exists. Skipping creation.")
            conn.rollback()  # Rollback the failed CREATE TABLE attempt
            conn.autocommit = (
                False  # Re-disable autocommit if needed for subsequent steps
            )
        except Exception as table_error:
            print(f"Error creating service_regions table: {table_error}")
            raise  # Re-raise the error to stop migration

        # Add index for faster lookups
        print("Adding index to service_regions table...")
        try:
            cursor.execute(
                """
                CREATE INDEX IF NOT EXISTS idx_service_regions_org_country_region
                ON service_regions (organization_id, country, region);
            """
            )
            print("Index on service_regions added successfully or already exists.")
        except Exception as index_error:
            print(f"Error creating index on service_regions: {index_error}")
            # Decide if you want to raise or just warn
            # raise index_error

        # --- REMOVE Step 4: Altering the old 'dogs' table is no longer needed ---
        # print("Adding new columns to dogs table...")
        # try:
        #     cursor.execute(
        #         """
        #         ALTER TABLE dogs
        #         ADD COLUMN animal_type VARCHAR(50) NOT NULL DEFAULT 'dog',
        #         ADD COLUMN age_min_months INTEGER,
        #         ADD COLUMN age_max_months INTEGER,
        #         ADD COLUMN standardized_breed VARCHAR(100),
        #         ADD COLUMN standardized_size VARCHAR(50)
        #     """
        #     )
        #     print("New columns added successfully.")
        # except psycopg2.errors.UndefinedTable:
        #      print("Info: 'dogs' table does not exist (expected if already migrated). Skipping ALTER.")
        #      conn.rollback() # Rollback the failed ALTER attempt
        #      conn.autocommit = False # Re-disable autocommit
        # except Exception as alter_error:
        #      print(f"Error altering 'dogs' table: {alter_error}")
        #      raise # Re-raise the error to stop migration
        print("Skipping Step 4: Altering old 'dogs' table (now 'animals').")

        # Step 5: Create new animals table (if it doesn't exist)
        print("Creating animals table...")
        try:
            cursor.execute(
                """
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
                    breed_group VARCHAR(50), -- Added breed_group
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
            """
            )
            print("Animals table created successfully.")
        except psycopg2.errors.DuplicateTable:
            print("Info: animals table already exists. Skipping creation.")
            conn.rollback()  # Rollback the failed CREATE TABLE attempt
            conn.autocommit = False  # Re-disable autocommit
        except Exception as create_animals_error:
            print(f"Error creating animals table: {create_animals_error}")
            raise

        # Step 6: Copy data from backup view to new animals table (if animals table was newly created or empty)
        # This step might need adjustment based on whether you expect data loss or want to merge
        print("Copying data from animals_backup view to animals table...")
        try:
            # Check if animals table is empty before copying
            cursor.execute("SELECT COUNT(*) FROM animals")
            if cursor.fetchone()[0] == 0:
                # Map columns carefully, especially if schema changed slightly
                # Assuming animals_backup has the old schema and animals has the new one
                cursor.execute(
                    """
                     INSERT INTO animals (
                         id, name, organization_id, animal_type, external_id,
                         primary_image_url, adoption_url, status, breed,
                         age_text, sex, size, language, properties,
                         created_at, updated_at, last_scraped_at, source_last_updated
                         -- Add new columns like standardized_breed, age_min_months etc. if they exist in backup
                         -- Or leave them to be populated later by standardization scripts
                     )
                     SELECT
                         id, name, organization_id, 'dog', external_id, -- Assuming all backups are dogs
                         primary_image_url, adoption_url, status, breed,
                         age_text, sex, size, language, properties,
                         created_at, updated_at, last_scraped_at, source_last_updated
                     FROM animals_backup
                 """
                )
                print(
                    f"Copied {cursor.rowcount} records from animals_backup to animals."
                )
            else:
                print(
                    "Info: animals table is not empty. Skipping data copy from backup."
                )
        except psycopg2.errors.UndefinedTable:
            print("Info: animals_backup view does not exist. Skipping data copy.")
            # No rollback needed here as it's an expected state if run multiple times
        except Exception as copy_error:
            print(f"Error copying data from animals_backup: {copy_error}")
            raise  # Stop migration on copy error

        # Step 7: Create new animal_images table (if it doesn't exist)
        print("Creating animal_images table...")
        try:
            cursor.execute(
                """
                CREATE TABLE animal_images (
                    id SERIAL PRIMARY KEY,
                    animal_id INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
                    image_url TEXT NOT NULL,
                    is_primary BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """
            )
            print("Animal images table created successfully.")
        except psycopg2.errors.DuplicateTable:
            print("Info: animal_images table already exists. Skipping creation.")
            conn.rollback()  # Rollback the failed CREATE TABLE attempt
            conn.autocommit = False  # Re-disable autocommit
        except Exception as create_images_error:
            print(f"Error creating animal_images table: {create_images_error}")
            raise

        # Step 8: Copy data from backup view to new animal_images table
        print("Copying data from animal_images_backup view to animal_images table...")
        try:
            # Check if animal_images table is empty before copying
            cursor.execute("SELECT COUNT(*) FROM animal_images")
            if cursor.fetchone()[0] == 0:
                # --- FIX: Map dog_id to animal_id ---
                cursor.execute(
                    """
                     INSERT INTO animal_images (id, animal_id, image_url, is_primary, created_at)
                     SELECT id, dog_id, image_url, is_primary, created_at
                     FROM animal_images_backup
                 """
                )
                # --- END FIX ---
                print(
                    f"Copied {cursor.rowcount} records from animal_images_backup to animal_images."
                )
            else:
                print(
                    "Info: animal_images table is not empty. Skipping data copy from backup."
                )
        except psycopg2.errors.UndefinedTable:
            print("Info: animal_images_backup view does not exist. Skipping data copy.")
            # No rollback needed here
        except psycopg2.errors.UndefinedColumn as col_err:
            print(
                f"Error copying image data (likely column mismatch 'dog_id' vs 'animal_id'): {col_err}"
            )
            raise  # Stop migration on copy error
        except Exception as copy_img_error:
            print(f"Error copying data from animal_images_backup: {copy_img_error}")
            raise  # Stop migration on copy error

        # Step 9: Add indexes (moved after table creation and potential data copy)
        print("Adding indexes to new tables...")
        try:
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_organization ON animals(organization_id);"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_status ON animals(status);"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_standardized_breed ON animals(standardized_breed);"
            )  # Index new field
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_sex ON animals(sex);"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_standardized_size ON animals(standardized_size);"
            )  # Index new field
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_animal_type ON animals(animal_type);"
            )  # Index animal_type

            # For text search
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_name_gin ON animals USING gin(to_tsvector('english', name));"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_breed_gin ON animals USING gin(to_tsvector('english', COALESCE(breed, '')));"
            )  # Handle potential NULLs

            # For JSON properties search
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animals_properties ON animals USING gin(properties);"
            )

            # Index for animal_images
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_animal_images_animal_id ON animal_images(animal_id);"
            )
            print("Indexes added successfully or already exist.")
        except Exception as index_error:
            print(f"Error adding indexes: {index_error}")
            # Decide whether to raise or warn
            # raise index_error

        conn.commit()  # Commit all changes if everything succeeded
        print("Phase 2 migration completed successfully.")
        return True

    except Exception as e:
        print(f"Migration failed: {e}")
        if conn:
            conn.rollback()
        # Re-raise the exception to make the failure explicit
        raise
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("Database connection closed")


def rollback_migration():
    """Rollback the migration changes if needed."""
    conn = None
    cursor = None
    try:
        conn = connect_to_database()
        conn.autocommit = False
        cursor = conn.cursor()

        print("Starting Phase 2 migration rollback...")

        # Drop new tables/indexes if they exist
        print("Dropping new tables and indexes...")
        cursor.execute("DROP INDEX IF EXISTS idx_service_regions_org_country_region;")
        cursor.execute("DROP TABLE IF EXISTS service_regions CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS breed_standards CASCADE;")
        cursor.execute("DROP TABLE IF EXISTS size_standards CASCADE;")
        cursor.execute(
            "DROP TABLE IF EXISTS animal_images CASCADE;"
        )  # Drop new images table
        cursor.execute(
            "DROP TABLE IF EXISTS animals CASCADE;"
        )  # Drop new animals table

        # Restore old tables from backup views
        print("Restoring tables from backup views...")
        # --- FIX: Restore animals and animal_images ---
        try:
            cursor.execute("CREATE TABLE animals AS SELECT * FROM animals_backup;")
            print("Restored 'animals' table from 'animals_backup'.")
        except psycopg2.errors.UndefinedTable:
            print("Info: 'animals_backup' view not found. Cannot restore 'animals'.")
            conn.rollback()
            conn.autocommit = False
        except psycopg2.errors.DuplicateTable:
            print("Info: 'animals' table already exists. Skipping restore.")
            conn.rollback()
            conn.autocommit = False

        try:
            cursor.execute(
                "CREATE TABLE animal_images AS SELECT * FROM animal_images_backup;"
            )
            # Need to rename dog_id back if the backup view still has it
            # This assumes the backup view HAS dog_id. If not, adjust.
            # cursor.execute("ALTER TABLE animal_images RENAME COLUMN animal_id TO dog_id;") # Optional: Rename back if needed
            print("Restored 'animal_images' table from 'animal_images_backup'.")
        except psycopg2.errors.UndefinedTable:
            print(
                "Info: 'animal_images_backup' view not found. Cannot restore 'animal_images'."
            )
            conn.rollback()
            conn.autocommit = False
        except psycopg2.errors.DuplicateTable:
            print("Info: 'animal_images' table already exists. Skipping restore.")
            conn.rollback()
            conn.autocommit = False
        # --- END FIX ---

        # Drop backup views (optional, but good cleanup)
        # cursor.execute("DROP VIEW IF EXISTS animals_backup;")
        # cursor.execute("DROP VIEW IF EXISTS animal_images_backup;")

        conn.commit()
        print("Rollback completed successfully.")
        return True

    except Exception as e:
        print(f"Rollback failed: {e}")
        if conn:
            conn.rollback()
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("Database connection closed")


def finalize_migration():
    """Finalize the migration by dropping backup views (run after verification)."""
    conn = None
    cursor = None
    try:
        conn = connect_to_database()
        conn.autocommit = True  # Use autocommit for dropping objects
        cursor = conn.cursor()

        print("Finalizing migration by dropping backup views...")

        # --- FIX: Drop backup views ---
        cursor.execute("DROP VIEW IF EXISTS animals_backup;")
        cursor.execute("DROP VIEW IF EXISTS animal_images_backup;")
        # --- END FIX ---

        print("Backup views dropped successfully.")
        print("Migration finalized.")
        return True

    except Exception as e:
        print(f"Finalization failed: {e}")
        # No rollback needed with autocommit
        return False
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("Database connection closed")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Database migration for Phase 2")
    parser.add_argument(
        "--action",
        choices=["migrate", "rollback", "finalize"],
        default="migrate",
        help="Action to perform",
    )

    args = parser.parse_args()

    if args.action == "migrate":
        migrate_database()
    elif args.action == "rollback":
        rollback_migration()
    elif args.action == "finalize":
        finalize_migration()
