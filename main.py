# main.py
"""
Main script for running the Rescue Dog Aggregator scrapers.
Run specific scrapers or all scrapers using command line arguments.
"""

import os
import sys
import argparse
from dotenv import load_dotenv

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
    results = {
        "Pets in Turkey": run_pets_in_turkey_scraper()
    }
    
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

def parse_arguments():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(description='Rescue Dog Aggregator - Data Collection')
    
    parser.add_argument('--setup', action='store_true', help='Set up the database')
    parser.add_argument('--all', action='store_true', help='Run all scrapers')
    parser.add_argument('--pit', action='store_true', help='Run Pets in Turkey scraper')
    
    return parser.parse_args()

def main():
    """Main function to run the appropriate scrapers based on command line arguments."""
    # Load environment variables from .env file
    load_dotenv()
    
    # Parse command line arguments
    args = parse_arguments()
    
    # If no arguments provided, show help
    if not any(vars(args).values()):
        print("No action specified. Use --help to see available options.")
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