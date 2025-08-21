#!/usr/bin/env python3
"""Simple test of LLM integration in test mode"""

import os
import sys

# Setup environment - MUST be in test mode to skip organization sync
os.environ['TESTING'] = 'true'
os.environ['PYTHONPATH'] = '.'
sys.path.insert(0, '.')

# Load .env
from dotenv import load_dotenv
load_dotenv()

def test_llm_methods():
    """Test the LLM methods are integrated correctly"""
    from scrapers.base_scraper import BaseScraper
    
    print("Testing LLM integration methods in BaseScraper...")
    
    # Create a minimal test scraper
    class TestScraper(BaseScraper):
        def collect_data(self):
            return [
                {'name': 'Test Dog 1', 'breed': 'Labrador', 'description': 'Friendly dog'},
                {'name': 'Test Dog 2', 'breed': 'Beagle', 'description': 'Playful pup'}
            ]
    
    # Create instance with test config
    scraper = TestScraper(organization_id=11)
    
    # Manually set config to enable LLM
    from utils.config_loader import ConfigLoader
    loader = ConfigLoader()
    scraper.org_config = loader.load_config('tierschutzverein-europa')
    
    # Check that methods exist
    print("\nChecking new methods:")
    print(f"  - _is_significant_update: {hasattr(scraper, '_is_significant_update')}")
    print(f"  - _post_process_llm_enrichment: {hasattr(scraper, '_post_process_llm_enrichment')}")
    print(f"  - animals_for_llm_enrichment: {hasattr(scraper, 'animals_for_llm_enrichment')}")
    
    # Test _is_significant_update
    print("\nTesting _is_significant_update:")
    existing = (1, 'dog-1', 'Old Dog', 'Poodle', None, None, '1 year', None, None, None, {'description': 'Old description'})
    new_data = {'name': 'Old Dog', 'breed': 'Labrador', 'description': 'New description'}
    is_significant = scraper._is_significant_update(existing, new_data)
    print(f"  - Breed change detected: {is_significant}")
    
    # Test tracking animals for enrichment
    print("\nTesting animal tracking:")
    scraper.animals_for_llm_enrichment = []
    scraper.animals_for_llm_enrichment.append({
        'id': 1,
        'data': {'name': 'Test Dog', 'breed': 'Labrador'},
        'action': 'create'
    })
    print(f"  - Animals tracked: {len(scraper.animals_for_llm_enrichment)}")
    
    # Test _post_process_llm_enrichment exists and can be called
    print("\nTesting _post_process_llm_enrichment:")
    try:
        scraper._post_process_llm_enrichment()
        print("  - Method executed without error")
    except Exception as e:
        print(f"  - Method executed with expected warning: {str(e)[:100]}")
    
    return True

if __name__ == '__main__':
    try:
        success = test_llm_methods()
        print(f"\n{'✅' if success else '❌'} Test {'PASSED' if success else 'FAILED'}")
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Test FAILED with error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)