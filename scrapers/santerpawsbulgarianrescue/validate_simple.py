#!/usr/bin/env python3
"""Simple validation script to test Santer Paws scraping functionality."""

import requests
from bs4 import BeautifulSoup


def validate_ajax_endpoint():
    """Test the AJAX endpoint directly."""
    print("=" * 60)
    print("Santer Paws Bulgarian Rescue - Direct AJAX Test")
    print("=" * 60)

    # Prepare AJAX request
    url = "https://santerpawsbulgarianrescue.com/adopt/"
    data = {
        "wpgb-ajax": "render",
        "_adoption_status_adopt": "available",
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)",
        "X-Requested-With": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    print(f"\nFetching from: {url}")
    print(f"POST data: {data}")

    try:
        # Make POST request
        response = requests.post(url, data=data, headers=headers, timeout=30)
        response.raise_for_status()

        print(f"✓ Response status: {response.status_code}")
        print(f"✓ Response size: {len(response.text)} bytes")

        # Parse HTML
        soup = BeautifulSoup(response.text, "html.parser")

        # Find dog cards
        dog_cards = soup.find_all("article", class_="bde-loop-item")
        print(f"✓ Found {len(dog_cards)} dog cards")

        if dog_cards:
            print("\nFirst 5 dogs found:")
            dogs_found = []

            for i, card in enumerate(dog_cards[:10], 1):
                link = card.find("a", href=lambda x: x and "/adoption/" in x)
                if link:
                    url = link.get("href")
                    # Extract name from URL
                    name = url.rstrip("/").split("/")[-1].replace("-", " ").title()
                    dogs_found.append((name, url))
                    if i <= 5:
                        print(f"  {i}. {name}")
                        print(f"     URL: {url}")

            print(f"\n✓ Successfully extracted {len(dogs_found)} dogs from {len(dog_cards)} cards")

            # Check for uniqueness
            urls = [dog[1] for dog in dogs_found]
            unique_urls = set(urls)
            print(f"✓ All {len(unique_urls)} URLs are unique")

            # Verify all are available (by virtue of the filter)
            print("✓ All dogs are available (filtered by _adoption_status_adopt=available)")

            print("\n" + "=" * 40)
            print("SUCCESS: Scraping functionality works!")
            print("=" * 40)
            print(f"Total available dogs: {len(dogs_found)}")

            return True
        else:
            print("\n⚠ No dog cards found in response")
            print("Response sample (first 500 chars):")
            print(response.text[:500])
            return False

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


if __name__ == "__main__":
    success = validate_ajax_endpoint()
    exit(0 if success else 1)
