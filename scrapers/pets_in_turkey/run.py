# scrapers/pets_in_turkey/run.py

import os
import sys

import psycopg2
from dotenv import load_dotenv

from config import DB_CONFIG
from scrapers.pets_in_turkey.dogs_scraper import PetsInTurkeyScraper

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


# Import the scrapers and config


def get_organization_id(organization_name="Pets in Turkey"):
    """Get the ID of the organization from the database."""
    try:
        # Build connection parameters, handling empty password
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
            "port": DB_CONFIG.get("port", 5432),
        }

        # Only add password if it's not empty
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        # Connect to the database
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor()

        # Query for the organization ID
        cursor.execute("SELECT id FROM organizations WHERE name = %s", (organization_name,))

        result = cursor.fetchone()

        # Close the connection
        cursor.close()
        conn.close()

        return result[0] if result else None
    except Exception as e:
        print(f"Error getting organization ID: {e}")
        return None


def main():
    """Run the Pets in Turkey scrapers."""
    # Load environment variables from .env file
    load_dotenv()

    print("Starting Pets in Turkey scrapers...")

    # Get the organization ID
    organization_id = get_organization_id()

    if not organization_id:
        print("Error: Could not find Pets in Turkey organization in the database.")
        print("Please make sure the organization is added to the database.")
        return

    # Create and run the dog scraper
    print("\n=== Running Dogs Scraper ===")
    dog_scraper = PetsInTurkeyScraper(organization_id)
    dog_success = dog_scraper.run()

    if dog_success:
        print("Pets in Turkey dogs scraper completed successfully.")
    else:
        print("Pets in Turkey dogs scraper encountered errors.")


if __name__ == "__main__":
    main()
