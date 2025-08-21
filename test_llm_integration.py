#!/usr/bin/env python3
"""Test LLM integration with Org 11 scraper"""

import os
import sys

# Setup environment
os.environ['PYTHONPATH'] = '.'
sys.path.insert(0, '.')

# Initialize database pool first
from utils.db_connection import initialize_database_pool
from config import DB_CONFIG

from management.config_commands import ConfigManager

def test_llm_integration():
    """Test org 11 with LLM enrichment enabled"""
    print("Testing LLM integration for Tierschutzverein Europa (org 11)...")
    
    # Load .env file
    from dotenv import load_dotenv
    load_dotenv()
    
    # Initialize database pool
    pool = initialize_database_pool(DB_CONFIG)
    print(f"Database pool initialized: {pool is not None}")
    
    # Run just org 11
    manager = ConfigManager()
    
    # First, verify the config has LLM enabled
    from utils.config_loader import ConfigLoader
    loader = ConfigLoader()
    config = loader.load_config('tierschutzverein-europa')
    scraper_config = config.get_scraper_config_dict()
    
    print(f"Config check:")
    print(f"  - enable_llm_profiling: {scraper_config.get('enable_llm_profiling', False)}")
    print(f"  - llm_organization_id: {scraper_config.get('llm_organization_id', 'not set')}")
    
    # Check if OPENROUTER_API_KEY is set
    api_key = os.environ.get('OPENROUTER_API_KEY', '')
    print(f"  - OPENROUTER_API_KEY: {'Set' if api_key else 'Not set'} ({len(api_key)} chars)")
    
    if not api_key:
        print("ERROR: OPENROUTER_API_KEY not found in environment")
        return False
    
    # Run scraper with a small limit for testing
    print("\nRunning scraper (this may take a moment)...")
    result = manager.run_scraper('tierschutzverein-europa')
    
    print(f"\nScraper result: {result}")
    
    return result.get('success', False) if isinstance(result, dict) else False

if __name__ == '__main__':
    success = test_llm_integration()
    sys.exit(0 if success else 1)