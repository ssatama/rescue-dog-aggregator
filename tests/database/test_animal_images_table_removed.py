# tests/database/test_animal_images_table_removed.py

import psycopg2
import pytest

from config import DB_CONFIG


class TestAnimalImagesTableRemoved:
    """Test that animal_images table has been removed from the database."""

    @pytest.fixture
    def db_connection(self):
        """Create a database connection for testing."""
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }

        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        conn = psycopg2.connect(**conn_params)
        yield conn
        conn.close()

    def test_animal_images_table_does_not_exist(self, db_connection):
        """Test that the animal_images table has been removed."""
        cursor = db_connection.cursor()

        # Query to check if table exists
        cursor.execute(
            """
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'animal_images'
            );
        """
        )

        table_exists = cursor.fetchone()[0]
        cursor.close()

        # Table should NOT exist
        assert table_exists is False, "animal_images table still exists but should be removed"

    def test_animals_table_has_primary_image_fields(self, db_connection):
        """Test that animals table still has primary_image_url fields."""
        cursor = db_connection.cursor()

        # Check for primary_image_url column
        cursor.execute(
            """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'animals' 
            AND column_name IN ('primary_image_url', 'original_image_url');
        """
        )

        columns = [row[0] for row in cursor.fetchall()]
        cursor.close()

        # These columns should exist in animals table
        assert "primary_image_url" in columns, "primary_image_url column missing from animals table"
        assert "original_image_url" in columns, "original_image_url column missing from animals table"

    def test_no_foreign_key_references_to_animal_images(self, db_connection):
        """Test that there are no foreign key references to animal_images table."""
        cursor = db_connection.cursor()

        # Check for any foreign key constraints referencing animal_images
        cursor.execute(
            """
            SELECT 
                tc.constraint_name,
                tc.table_name,
                kcu.column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
                ON ccu.constraint_name = tc.constraint_name
                AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND ccu.table_name = 'animal_images';
        """
        )

        foreign_keys = cursor.fetchall()
        cursor.close()

        # Should be no foreign keys referencing animal_images
        assert len(foreign_keys) == 0, f"Found foreign keys referencing animal_images: {foreign_keys}"
