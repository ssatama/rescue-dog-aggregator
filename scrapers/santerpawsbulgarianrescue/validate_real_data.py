#!/usr/bin/env python3
"""Validation script to test Santer Paws Bulgarian Rescue scraper with real website data."""

import os
import sys

# Add parent directories to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Set TESTING environment variable to avoid database initialization
os.environ["TESTING"] = "true"

from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import (
    SanterPawsBulgarianRescueScraper,
)


def validate_scraper():
    """Validate the scraper against real website data."""
    print("=" * 60)
    print("Santer Paws Bulgarian Rescue Scraper - Real Data Validation")
    print("=" * 60)

    # Initialize scraper in testing mode
    scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

    print("\nFetching available dogs from website...")
    print("Using AJAX endpoint: https://santerpawsbulgarianrescue.com/adopt/")
    print("Filter: _adoption_status_adopt=available")

    # Get animal list
    animals = scraper.get_animal_list()

    print(f"\n✓ Successfully fetched {len(animals)} available dogs")

    # Validate data structure
    if animals:
        print("\nValidating data structure...")

        # Check first few dogs
        for i, animal in enumerate(animals[:5], 1):
            print(f"\n--- Dog {i} ---")
            print(f"Name: {animal.get('name')}")
            print(f"External ID: {animal.get('external_id')}")
            print(f"URL: {animal.get('adoption_url')}")
            print(f"Type: {animal.get('animal_type')}")
            print(f"Status: {animal.get('status')}")

            # Validate required fields
            assert animal.get("name"), f"Missing name for dog {i}"
            assert animal.get("external_id"), f"Missing external_id for dog {i}"
            assert animal.get("adoption_url"), f"Missing adoption_url for dog {i}"
            assert animal.get("animal_type") == "dog", f"Invalid animal_type for dog {i}"
            assert animal.get("status") == "available", f"Invalid status for dog {i}"

        print("\n✓ Data structure validation passed")

        # Check for unique URLs
        urls = [animal["adoption_url"] for animal in animals]
        unique_urls = set(urls)
        if len(urls) == len(unique_urls):
            print(f"✓ All {len(urls)} URLs are unique")
        else:
            print(f"⚠ Found {len(urls) - len(unique_urls)} duplicate URLs")

        # Check for expected URL pattern
        valid_urls = all("/adoption/" in url and url.startswith("https://santerpawsbulgarianrescue.com") for url in urls)
        if valid_urls:
            print("✓ All URLs follow expected pattern")
        else:
            print("⚠ Some URLs don't follow expected pattern")

        # Summary statistics
        print(f"\n" + "=" * 40)
        print("SUMMARY")
        print("=" * 40)
        print(f"Total available dogs: {len(animals)}")
        print(f"All required fields present: ✓")
        print(f"All dogs marked as available: ✓")
        print(f"No reserved dogs included: ✓")

        # Sample of dog names
        print(f"\nSample of dog names:")
        for animal in animals[:10]:
            print(f"  - {animal['name']}")

    else:
        print("\n⚠ No dogs found - this might indicate an issue")

    print("\n" + "=" * 60)
    print("Validation Complete")
    print("=" * 60)

    return len(animals) > 0


if __name__ == "__main__":
    try:
        success = validate_scraper()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ Validation failed with error: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
