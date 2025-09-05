#!/usr/bin/env python3
"""
Apply breed standardization migration to Railway database.
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def apply_migration():
    """Apply the breed columns migration to Railway database."""
    
    railway_url = os.getenv("RAILWAY_DATABASE_URL")
    if not railway_url:
        print("❌ RAILWAY_DATABASE_URL not found in environment")
        return False
    
    migration_file = "migrations/add_breed_standardization_columns.sql"
    if not os.path.exists(migration_file):
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    try:
        # Connect to Railway database
        print("🔗 Connecting to Railway database...")
        conn = psycopg2.connect(railway_url)
        cursor = conn.cursor()
        
        # Read migration SQL
        with open(migration_file, 'r') as f:
            migration_sql = f.read()
        
        # Execute migration
        print("🚀 Applying migration...")
        cursor.execute(migration_sql)
        
        # Verify columns were added
        print("✅ Verifying columns...")
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'animals' 
            AND column_name IN ('breed_confidence', 'breed_type', 'primary_breed', 'secondary_breed')
            ORDER BY column_name;
        """)
        
        columns = cursor.fetchall()
        print(f"📊 Found {len(columns)} breed columns in Railway:")
        for col in columns:
            print(f"   - {col[0]}")
        
        # Count total columns
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.columns 
            WHERE table_name = 'animals';
        """)
        
        total_columns = cursor.fetchone()[0]
        print(f"📊 Total columns in animals table: {total_columns}")
        
        # Commit the changes
        conn.commit()
        print("✅ Migration committed successfully")
        
        cursor.close()
        conn.close()
        
        if len(columns) == 4 and total_columns == 40:
            print("✅ Migration completed successfully! Railway now has all 40 columns.")
            return True
        else:
            print(f"⚠️ Migration completed but column count mismatch: {total_columns} columns, {len(columns)} breed columns")
            return True
            
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)