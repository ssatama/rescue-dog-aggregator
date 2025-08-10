#!/usr/bin/env python3
"""Test script to validate detail page scraping against real examples."""

import os
import sys

# Add parent directories to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

# Set TESTING environment variable to avoid database initialization
os.environ["TESTING"] = "true"

from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import (
    SanterPawsBulgarianRescueScraper,
)


def test_real_detail_pages():
    """Test detail page scraping against real examples."""
    print("=" * 60)
    print("Testing Real Detail Page Scraping")
    print("=" * 60)

    # Create a minimal scraper instance for testing detail method only
    scraper = SanterPawsBulgarianRescueScraper.__new__(SanterPawsBulgarianRescueScraper)

    # Set up minimal attributes needed for detail scraping
    import logging

    scraper.logger = logging.getLogger("test_scraper")
    scraper.logger.setLevel(logging.INFO)
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("%(levelname)s:%(name)s:%(message)s"))
    scraper.logger.addHandler(handler)

    # Test examples
    test_urls = [
        "https://santerpawsbulgarianrescue.com/adoption/anastasia/",
        "https://santerpawsbulgarianrescue.com/adoption/pepper/",
        "https://santerpawsbulgarianrescue.com/adoption/raya/",
    ]

    for url in test_urls:
        try:
            print(f"\n--- Testing {url} ---")

            # Extract name from URL for display
            name = url.split("/")[-2].replace("-", " ").title()

            # Scrape details with HTML debugging
            details = scraper._scrape_animal_details_debug(url)

            if details:
                print(f"✓ Successfully extracted details for {name}")
                print(f"  Description: {details.get('description', 'Not found')[:100]}...")
                print(f"  Age: {details.get('age_text', 'Not found')}")
                print(f"  Sex: {details.get('sex', 'Not found')}")
                print(f"  Size: {details.get('size', 'Not found')}")
                print(f"  Breed: {details.get('breed', 'Not found')}")
                print(f"  Status: {details.get('status', 'Not found')}")
                print(f"  Image: {details.get('primary_image_url', 'Not found')}")

                # Validate required fields
                if not details.get("description"):
                    print("  ⚠ Warning: No description extracted")
                if not details.get("primary_image_url"):
                    print("  ⚠ Warning: No image extracted")

            else:
                print(f"❌ Failed to extract details for {name}")

        except Exception as e:
            print(f"❌ Error testing {url}: {e}")

        print("-" * 40)

    print("\nTest complete!")


if __name__ == "__main__":
    test_real_detail_pages()
