# exploration/test_scraper_example.py
"""
Example script showing how to test the Pets in Turkey scraper.
This is kept as a reference for creating future scrapers.
"""

import os
import sys
import json
from datetime import datetime

# Add the project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import the scraper
from scrapers.pets_in_turkey.scraper import PetsInTurkeyScraper

def test_scraper():
    """Run a test of the PetsInTurkey scraper without database connections."""
    # Create a test version of the scraper (organization_id doesn't matter for testing)
    scraper = PetsInTurkeyScraper(organization_id=1)
    
    # Collect data
    print("Starting test scrape...")
    dogs_data = scraper.collect_data()
    
    # Save the results to a JSON file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_file = f"test_results_{timestamp}.json"
    
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(dogs_data, f, indent=2)
    
    print(f"Collected data for {len(dogs_data)} dogs")
    print(f"Results saved to {output_file}")
    
    # Print summary statistics
    breeds = set(dog['breed'] for dog in dogs_data if dog['breed'] != 'Unknown')
    sexes = set(dog['sex'] for dog in dogs_data if dog['sex'] != 'Unknown')
    
    print("\nSummary Statistics:")
    print(f"Total dogs found: {len(dogs_data)}")
    print(f"Breeds found: {len(breeds)}")
    print(f"Males: {sum(1 for dog in dogs_data if dog['sex'] == 'Male')}")
    print(f"Females: {sum(1 for dog in dogs_data if dog['sex'] == 'Female')}")

if __name__ == "__main__":
    test_scraper()
