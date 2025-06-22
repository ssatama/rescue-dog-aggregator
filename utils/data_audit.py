#!/usr/bin/env python3

"""
Data Audit Script for Rescue Dog Aggregator

This script extracts unique values from the animals table for dogs and saves them to CSV files
for manual analysis. It focuses on breed, size, and age text fields to prepare for standardization.
"""

import csv
import os
import re
import sys
from collections import Counter

from utils.db import connect_to_database

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def extract_unique_values():
    """Extract unique breed, size, and age values from the animals table (dogs only)."""
    conn = connect_to_database()
    if not conn:
        print("Failed to connect to database")
        return

    try:
        cursor = conn.cursor()

        # Get unique breed values and their counts
        print("Extracting unique breed values...")
        cursor.execute(
            """
            SELECT breed, COUNT(*) as count
            FROM animals
            WHERE animal_type = 'dog' AND breed IS NOT NULL
            GROUP BY breed
            ORDER BY count DESC
        """
        )
        breed_data = cursor.fetchall()

        # Get unique size values and their counts
        print("Extracting unique size values...")
        cursor.execute(
            """
            SELECT size, COUNT(*) as count
            FROM animals
            WHERE animal_type = 'dog' AND size IS NOT NULL
            GROUP BY size
            ORDER BY count DESC
        """
        )
        size_data = cursor.fetchall()

        # Get unique age text values and their counts
        print("Extracting unique age text values...")
        cursor.execute(
            """
            SELECT age_text, COUNT(*) as count
            FROM animals
            WHERE animal_type = 'dog' AND age_text IS NOT NULL
            GROUP BY age_text
            ORDER BY count DESC
        """
        )
        age_data = cursor.fetchall()

        # Get unique sex values and their counts
        print("Extracting unique sex values...")
        cursor.execute(
            """
            SELECT sex, COUNT(*) as count
            FROM animals
            WHERE animal_type = 'dog' AND sex IS NOT NULL
            GROUP BY sex
            ORDER BY count DESC
        """
        )
        sex_data = cursor.fetchall()

        # Create output directory if it doesn't exist
        os.makedirs(os.path.join("data", "audit"), exist_ok=True)

        # Export to CSV files for manual analysis
        export_to_csv(breed_data, "breed_audit.csv", ["breed", "count"])
        export_to_csv(size_data, "size_audit.csv", ["size", "count"])
        export_to_csv(age_data, "age_audit.csv", ["age_text", "count"])
        export_to_csv(sex_data, "sex_audit.csv", ["sex", "count"])

        print(f"Found {len(breed_data)} unique breed values")
        print(f"Found {len(size_data)} unique size values")
        print(f"Found {len(age_data)} unique age text values")
        print(f"Found {len(sex_data)} unique sex values")

        # Also export property fields that might contain relevant info
        print("Analyzing property fields...")
        cursor.execute(
            """
            SELECT id, properties
            FROM animals
            WHERE animal_type = 'dog' AND properties IS NOT NULL
        """
        )
        properties_data = cursor.fetchall()

        analyze_properties(properties_data)

        # Create standardization templates
        create_standardization_templates(breed_data, size_data, age_data)

    finally:
        conn.close()
        print("Database connection closed")


def export_to_csv(data, filename, headers):
    """Export data to a CSV file."""
    filepath = os.path.join("data", "audit", filename)
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        for row in data:
            writer.writerow(row)
    print(f"Exported data to {filepath}")


def analyze_properties(properties_data):
    """Analyze the properties JSON field for additional attributes."""
    property_keys = Counter()
    weight_values = []
    height_values = []
    neutered_values = []
    other_relevant = []

    for animal_id, props in properties_data:
        if not props:
            continue

        # Count property keys
        for key in props.keys():
            property_keys[key] += 1

        # Extract weight, height, and neutered status if available
        if "weight" in props and props["weight"]:
            weight_values.append((animal_id, props["weight"]))
        if "height" in props and props["height"]:
            height_values.append((animal_id, props["height"]))
        if "neutered_spayed" in props and props["neutered_spayed"]:
            neutered_values.append((animal_id, props["neutered_spayed"]))

        # Collect other potentially relevant properties
        for key in [
            "color",
            "coat",
            "temperament",
            "good_with_kids",
            "good_with_cats",
            "good_with_dogs",
        ]:
            if key in props and props[key]:
                other_relevant.append((animal_id, key, props[key]))

    print("\nProperty fields analysis:")
    print(f"Found {len(property_keys)} unique property keys")
    print("Top property keys:")
    for key, count in property_keys.most_common(10):
        print(f"  {key}: {count}")

    # Export property values
    if weight_values:
        export_to_csv(weight_values, "weight_values.csv", ["animal_id", "weight"])
    if height_values:
        export_to_csv(height_values, "height_values.csv", ["animal_id", "height"])
    if neutered_values:
        export_to_csv(
            neutered_values, "neutered_values.csv", ["animal_id", "neutered_spayed"]
        )
    if other_relevant:
        export_to_csv(
            other_relevant, "other_properties.csv", ["animal_id", "property", "value"]
        )


def create_standardization_templates(breed_data, size_data, age_data):
    """Create templates for manual standardization."""
    # Breed standardization template
    with open(
        os.path.join("data", "audit", "breed_standardization.csv"),
        "w",
        newline="",
        encoding="utf-8",
    ) as f:
        writer = csv.writer(f)
        writer.writerow(
            ["original_breed", "count", "standardized_breed", "breed_group", "notes"]
        )

        for breed, count in breed_data:
            writer.writerow([breed, count, "", "", ""])

    # Size standardization template
    with open(
        os.path.join("data", "audit", "size_standardization.csv"),
        "w",
        newline="",
        encoding="utf-8",
    ) as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "original_size",
                "count",
                "standardized_size",
                "weight_range_kg",
                "height_range_cm",
                "notes",
            ]
        )

        for size, count in size_data:
            writer.writerow([size, count, "", "", "", ""])

    # Age standardization template
    with open(
        os.path.join("data", "audit", "age_standardization.csv"),
        "w",
        newline="",
        encoding="utf-8",
    ) as f:
        writer = csv.writer(f)
        writer.writerow(
            [
                "original_age_text",
                "count",
                "age_category",
                "min_months",
                "max_months",
                "notes",
            ]
        )

        for age, count in age_data:
            # Attempt to extract numeric values
            age_value = ""
            months_min = ""
            months_max = ""

            # Look for patterns like "3 years" or "2.5 y/o"
            years_match = re.search(
                r"(\d+(?:[.,]\d+)?)\s*(?:years?|y\/o|yr)", str(age).lower()
            )
            if years_match:
                years = float(years_match.group(1).replace(",", "."))
                months_min = int(years * 12)
                months_max = months_min + 12  # Approximate range

            # Look for patterns like "6 months"
            months_match = re.search(r"(\d+)\s*(?:months?|mo)", str(age).lower())
            if months_match:
                months_min = int(months_match.group(1))
                months_max = months_min + 1

            # Categorize age
            if months_min:
                if months_min < 12:
                    age_value = "Puppy"
                elif months_min < 36:
                    age_value = "Young"
                elif months_min < 96:
                    age_value = "Adult"
                else:
                    age_value = "Senior"
            elif any(term in str(age).lower() for term in ["puppy", "pup", "baby"]):
                age_value = "Puppy"
                months_min = 0
                months_max = 12
            elif any(
                term in str(age).lower() for term in ["young", "adolescent", "junior"]
            ):
                age_value = "Young"
                months_min = 12
                months_max = 36
            elif any(term in str(age).lower() for term in ["adult", "mature"]):
                age_value = "Adult"
                months_min = 36
                months_max = 96
            elif any(
                term in str(age).lower() for term in ["senior", "older", "elderly"]
            ):
                age_value = "Senior"
                months_min = 96
                months_max = 240  # 20 years as upper bound

            writer.writerow([age, count, age_value, months_min, months_max, ""])

    print("\nCreated standardization templates:")
    print("- data/audit/breed_standardization.csv")
    print("- data/audit/size_standardization.csv")
    print("- data/audit/age_standardization.csv")
    print(
        "\nPlease fill in these templates with standardized values for the next phase."
    )


if __name__ == "__main__":
    print("Starting data audit for dog standardization...")
    extract_unique_values()
    print("\nAudit complete. Files saved to data/audit/ directory.")
    print("Next step: Manually review and fill in the standardization templates.")
