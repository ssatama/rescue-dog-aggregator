"""
Create dog_photo_analysis table for Instagram photo quality scoring.

Simple SQL execution script - run once to create table.
Following CLAUDE.md: No over-engineering, direct approach.
"""

import os
import sys

# Add project root to path
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if project_root not in sys.path:
    sys.path.insert(0, project_root)

import psycopg2

from config import DB_CONFIG


def create_photo_analysis_table():
    """Create dog_photo_analysis table with indexes."""
    conn = None
    cursor = None

    try:
        # Connect to database
        print(f"Connecting to database: {DB_CONFIG['database']}")
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }

        if DB_CONFIG.get("password"):
            conn_params["password"] = DB_CONFIG["password"]

        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        print("Creating dog_photo_analysis table...")

        # Create table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS dog_photo_analysis (
                id SERIAL PRIMARY KEY,
                dog_id INTEGER NOT NULL UNIQUE REFERENCES animals(id) ON DELETE CASCADE,

                -- Scores (1-10 scale)
                quality_score INTEGER NOT NULL CHECK (quality_score BETWEEN 1 AND 10),
                visibility_score INTEGER NOT NULL CHECK (visibility_score BETWEEN 1 AND 10),
                appeal_score INTEGER NOT NULL CHECK (appeal_score BETWEEN 1 AND 10),
                background_score INTEGER NOT NULL CHECK (background_score BETWEEN 1 AND 10),
                overall_score NUMERIC(3,1) NOT NULL,

                -- Classification
                ig_ready BOOLEAN NOT NULL,
                confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),

                -- Analysis details
                reasoning TEXT,
                flags TEXT[],

                -- Metadata
                image_url TEXT NOT NULL,
                analyzed_at TIMESTAMP NOT NULL DEFAULT NOW(),
                model_used TEXT NOT NULL DEFAULT 'google/gemini-2.5-flash-image',
                api_cost_usd NUMERIC(10,6),

                -- Constraints
                CHECK (overall_score = (quality_score + visibility_score + appeal_score + background_score) / 4.0)
            )
        """)

        print("Creating indexes...")

        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_dog_photo_ig_ready
                ON dog_photo_analysis(ig_ready)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_dog_photo_overall_score
                ON dog_photo_analysis(overall_score DESC)
        """)

        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_dog_photo_analyzed_at
                ON dog_photo_analysis(analyzed_at)
        """)

        # Commit changes
        conn.commit()

        print("✅ Successfully created dog_photo_analysis table with indexes")

        # Verify table exists
        cursor.execute("""
            SELECT COUNT(*)
            FROM information_schema.tables
            WHERE table_name = 'dog_photo_analysis'
        """)
        count = cursor.fetchone()[0]

        if count == 1:
            print("✅ Table verified in database")
        else:
            print("⚠️  Warning: Table creation may have failed")

        return True

    except Exception as e:
        print(f"❌ Error creating table: {e}")
        if conn:
            conn.rollback()
        return False

    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
            print("Database connection closed")


if __name__ == "__main__":
    success = create_photo_analysis_table()
    sys.exit(0 if success else 1)
