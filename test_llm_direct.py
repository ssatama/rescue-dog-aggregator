#!/usr/bin/env python3
"""Direct test of LLM integration in scraper"""

import os
import sys

# Setup environment
os.environ['PYTHONPATH'] = '.'
sys.path.insert(0, '.')

# Load .env
from dotenv import load_dotenv
load_dotenv()

# Initialize database pool first
from utils.db_connection import initialize_database_pool
from config import DB_CONFIG
pool = initialize_database_pool(DB_CONFIG)
print(f"Database pool initialized: {pool is not None}")

# Now load the scraper
from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper

def test_direct():
    """Test the scraper directly"""
    print("\nTesting Tierschutzverein Europa scraper with LLM enrichment...")
    
    # Create scraper with config
    scraper = TierschutzvereinEuropaScraper(config_id='tierschutzverein-europa')
    
    # Check config
    if hasattr(scraper, 'org_config'):
        config = scraper.org_config.get_scraper_config_dict()
        print(f"Scraper config:")
        print(f"  - enable_llm_profiling: {config.get('enable_llm_profiling', False)}")
        print(f"  - llm_organization_id: {config.get('llm_organization_id', 'not set')}")
    
    # Override to limit animals for testing
    scraper.test_limit = 3  # Only process 3 animals for testing
    
    # Mock the collect_data to return limited data for testing
    original_collect = scraper.collect_data
    def limited_collect():
        data = original_collect()
        if data and len(data) > 3:
            print(f"Limiting data from {len(data)} to 3 animals for testing")
            return data[:3]
        return data
    
    scraper.collect_data = limited_collect
    
    # Run the scraper
    print("\nRunning scraper...")
    result = scraper.run()
    
    print(f"\nScraper completed: {result}")
    print(f"Animals found: {scraper.animals_found}")
    print(f"Animals for LLM enrichment: {len(scraper.animals_for_llm_enrichment)}")
    
    # Check if any animals were enriched
    if scraper.animals_for_llm_enrichment:
        print("\nAnimals marked for enrichment:")
        for item in scraper.animals_for_llm_enrichment:
            print(f"  - ID: {item['id']}, Name: {item['data'].get('name', 'Unknown')}, Action: {item['action']}")
    
    return result

if __name__ == '__main__':
    try:
        success = test_direct()
        print(f"\nTest {'PASSED' if success else 'FAILED'}")
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\nTest FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)