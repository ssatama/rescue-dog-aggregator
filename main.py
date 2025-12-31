# main.py
"""
Main script for running the Rescue Dog Aggregator scrapers.
Run specific scrapers or all scrapers using command line arguments.
"""

import argparse
import logging
import os

from dotenv import load_dotenv
from webdriver_manager.chrome import ChromeDriverManager


def run_pets_in_turkey_scraper():
    """Run the Pets in Turkey scraper."""
    try:
        from scrapers.pets_in_turkey.run import main as run_pets_in_turkey

        return run_pets_in_turkey()
    except Exception as e:
        print(f"Error running Pets in Turkey scraper: {e}")
        return False


def run_all_scrapers():
    """Run all available scrapers."""
    # Currently, we only have the Pets in Turkey scraper
    results = {"Pets in Turkey": run_pets_in_turkey_scraper()}

    # Print summary
    print("\nScraper run summary:")
    for name, success in results.items():
        status = "✓ Success" if success else "✗ Failed"
        print(f"  {name}: {status}")

    # Return True if all scrapers succeeded
    return all(results.values())


def setup_database():
    """Run the database setup script."""
    try:
        from database.db_setup import initialize_database, setup_initial_data

        print("Setting up database...")
        success = initialize_database()

        if success:
            print("Setting up initial data...")
            setup_initial_data()
            print("Database setup completed successfully")
            return True
        else:
            print("Database setup failed")
            return False
    except Exception as e:
        print(f"Error during database setup: {e}")
        return False


def update_chromedriver():
    """Downloads or updates chromedriver using webdriver-manager."""
    print("Checking/Updating chromedriver...")
    try:
        # --- ADD Verbose Logging ---
        # Set log level specifically for webdriver-manager
        # Note: This might print a lot of information
        os.environ["WDM_LOG_LEVEL"] = "DEBUG"
        logging.getLogger("WDM").setLevel(logging.DEBUG)
        # --- END Verbose Logging ---

        driver_path = ChromeDriverManager().install()
        print(f"Chromedriver is up to date. Path: {driver_path}")
        return True
    except Exception as e:
        print(f"Error updating chromedriver: {e}")
        # --- ADD Reset Log Level ---
        # Reset log level if needed after error
        os.environ.pop("WDM_LOG_LEVEL", None)
        logging.getLogger("WDM").setLevel(logging.INFO)  # Or your default level
        # --- END Reset Log Level ---
        return False
    finally:
        # --- ADD Reset Log Level ---
        # Ensure log level is reset even on success
        os.environ.pop("WDM_LOG_LEVEL", None)
        logging.getLogger("WDM").setLevel(logging.INFO)  # Or your default level
        # --- END Reset Log Level ---


def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description="Rescue Dog Aggregator - Data Collection")

    parser.add_argument("--setup", action="store_true", help="Set up the database")
    parser.add_argument("--all", action="store_true", help="Run all scrapers")
    parser.add_argument("--pit", action="store_true", help="Run Pets in Turkey scraper")
    parser.add_argument("--update-driver", action="store_true", help="Update chromedriver")

    return parser.parse_args()


def main():
    """Main function to run the appropriate scrapers based on command line arguments."""
    # Load environment variables from .env file
    load_dotenv()

    # Parse command line arguments
    args = parse_arguments()

    # Update chromedriver if requested
    if args.update_driver:
        update_chromedriver()
        # Optionally exit after updating, or let it continue to other tasks if needed
        # return # Uncomment this line if you only want to update the driver

    # If no other action specified after potential driver update, show help
    # Adjusted condition to check if *any* action other than update-driver was
    # specified
    if not args.setup and not args.all and not args.pit and not args.update_driver:
        print("No action specified. Use --help to see available options.")
        return
    elif not args.setup and not args.all and not args.pit and args.update_driver:
        # If only --update-driver was run, we can exit cleanly here if we
        # didn't exit above
        print("Chromedriver update check complete.")
        return

    # Set up database if requested
    if args.setup:
        success = setup_database()
        if not success:
            return

    # Run the appropriate scrapers
    if args.all:
        run_all_scrapers()
    elif args.pit:
        run_pets_in_turkey_scraper()


if __name__ == "__main__":
    main()
