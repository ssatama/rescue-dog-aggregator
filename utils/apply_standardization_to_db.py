#!/usr/bin/env python3
"""
Apply standardization to all dogs in the database.

This script reads all dog records from the database, applies standardization rules,
and updates the standardized fields.
"""

import json
import os
import sys

from utils.db import connect_to_database
from utils.standardization import standardize_age, standardize_breed

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def apply_standardization_to_database():
    """Apply standardization to all dogs in the database."""
    conn = connect_to_database()
    if not conn:
        print("Failed to connect to database")
        return False

    try:
        cursor = conn.cursor()

        # Get all dogs from the database
        print("Fetching all dogs from database...")
        cursor.execute(
            """
            SELECT id, breed, age_text, properties FROM animals
            WHERE animal_type = 'dog'
        """
        )
        dogs = cursor.fetchall()

        total_count = len(dogs)
        print(f"Found {total_count} dogs to process")

        # Process each dog
        updated_count = 0
        skipped_count = 0

        for i, (dog_id, breed, age_text, properties_json) in enumerate(dogs):
            # Progress indicator
            if i % 10 == 0:
                print(f"Processing dog {i+1}/{total_count}...")

            updates = []
            params = []

            # Parse properties json
            try:
                properties = json.loads(properties_json) if properties_json else {}
            except BaseException:
                properties = {}

            # Standardize breed
            if breed:
                std_breed, breed_group, size_estimate = standardize_breed(breed)
                updates.append("standardized_breed = %s")
                params.append(std_breed)

                # Add breed_group to properties
                properties["breed_group"] = breed_group
                updates.append("properties = %s")
                params.append(json.dumps(properties))

                # Only set standardized_size if we have an estimate and current
                # value is NULL
                cursor.execute("SELECT standardized_size FROM animals WHERE id = %s", (dog_id,))
                current_size = cursor.fetchone()[0]

                if size_estimate and not current_size:
                    updates.append("standardized_size = %s")
                    params.append(size_estimate)

            # Standardize age
            if age_text:
                age_info = standardize_age(age_text)

                if age_info["age_min_months"] is not None:
                    updates.append("age_min_months = %s")
                    params.append(age_info["age_min_months"])

                if age_info["age_max_months"] is not None:
                    updates.append("age_max_months = %s")
                    params.append(age_info["age_max_months"])

            # Update the database if we have changes
            if updates and params:
                # Add ID to params
                params.append(dog_id)

                # Build update query
                query = "UPDATE animals SET " + ", ".join(updates) + " WHERE id = %s"

                # Execute update
                cursor.execute(query, params)
                updated_count += 1
            else:
                skipped_count += 1

        # Commit all updates
        conn.commit()

        print(f"\nStandardization completed:")
        print(f"  Total dogs processed: {total_count}")
        print(f"  Updated: {updated_count}")
        print(f"  Skipped (no changes): {skipped_count}")

        return True

    except Exception as e:
        print(f"Error during standardization: {e}")
        conn.rollback()
        return False

    finally:
        if conn:
            conn.close()
            print("Database connection closed")


if __name__ == "__main__":
    print("Starting standardization of all dogs in database...")
    success = apply_standardization_to_database()

    if success:
        print("Database standardization completed successfully.")
    else:
        print("Database standardization failed.")
