#!/usr/bin/env python3
"""Simple validation of Furry Rescue Italy detail extraction."""

import pytest
import requests
from bs4 import BeautifulSoup


# This is a validation utility that makes external HTTP requests
@pytest.mark.external
@pytest.mark.scrapers
@pytest.mark.browser
def test_detail_extraction(url):
    """Test extracting details from a single URL."""
    print(f"\nTesting: {url}")
    print("-" * 60)

    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}

    try:
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")

        # Extract name
        name_element = soup.find("h4", class_="fusion-tb-text")
        if not name_element:
            # Try any uppercase heading
            for tag in ["h4", "h5", "h6"]:
                headings = soup.find_all(tag)
                for heading in headings:
                    text = heading.get_text(strip=True)
                    if text and text.isupper() and len(text) > 2:
                        name_element = heading
                        break
                if name_element:
                    break

        name = name_element.get_text(strip=True) if name_element else "NOT FOUND"
        print(f"✅ Name: {name}")

        # Extract hero image
        container = soup.find("div", class_="fusion-tb-images-container")
        hero_image = None
        if container:
            img = container.find("img")
            if img and img.get("src"):
                hero_image = img["src"]

        if not hero_image:
            # Fallback to any 600x600 image
            all_images = soup.find_all("img", src=True)
            for img in all_images:
                if "600x600" in img["src"]:
                    hero_image = img["src"]
                    break

        if hero_image:
            print(f"✅ Hero Image: {hero_image[:80]}...")
        else:
            print("❌ No hero image found")

        # Extract properties - handle both formats
        properties = {}

        # First try standard format with colons
        list_items = soup.find_all("li")
        for item in list_items:
            text = item.get_text(strip=True)
            if ":" in text:
                key, value = text.split(":", 1)
                key = key.strip().lower()
                value = value.strip()

                if key in [
                    "born",
                    "sex",
                    "size",
                    "future size",
                    "breed",
                    "personality",
                    "good with",
                ]:
                    clean_key = key.replace(" ", "_")
                    properties[clean_key] = value
                    print(f"   {clean_key}: {value}")

        # Also check for Thor's format: <li class="h7">Born <span>October 2021</span></li>
        h7_items = soup.find_all("li", class_="h7")
        for item in h7_items:
            label_text = item.get_text(strip=True)
            span = item.find("span")
            if span:
                value = span.get_text(strip=True)
                key = label_text.replace(value, "").strip().lower()

                if key == "born" and "born" not in properties:
                    properties["born"] = value
                    print(f"   born: {value}")
                elif key == "weight" and "weight" not in properties:
                    properties["weight"] = value
                    print(f"   weight: {value}")

        # Look for bullet-point properties in div content (Thor's format)
        if not properties.get("sex"):
            divs = soup.find_all("div", attrs={"dir": "auto"})
            for div in divs:
                text = div.get_text(strip=True)
                if "• Born:" in text or "• Sex:" in text or "• Size:" in text:
                    lines = text.split("•")
                    for line in lines:
                        line = line.strip()
                        if ":" in line:
                            key, value = line.split(":", 1)
                            key = key.strip().lower()
                            value = value.strip()

                            if key == "sex" and "sex" not in properties:
                                properties["sex"] = value
                                print(f"   sex: {value}")
                            elif key == "size" and "size" not in properties:
                                properties["size"] = value
                                print(f"   size: {value}")
                            elif key == "breed" and "breed" not in properties:
                                properties["breed"] = value
                                print(f"   breed: {value}")
                            elif key == "personality" and "personality" not in properties:
                                properties["personality"] = value
                                print(f"   personality: {value}")
                            elif key == "good with" and "good_with" not in properties:
                                properties["good_with"] = value
                                print(f"   good_with: {value}")

        if properties:
            print(f"✅ Properties: {len(properties)} extracted")
        else:
            print("❌ No properties found")

        # Check description exists
        paragraphs = soup.find_all("p")
        has_description = False
        for p in paragraphs:
            text = p.get_text(strip=True)
            if text and len(text) > 50 and not any(x in text for x in ["👉", "📝", "WhatsApp"]):
                has_description = True
                print(f"✅ Description: Found ({len(text)} chars)")
                print(f"   Preview: {text[:100]}...")
                break

        if not has_description:
            print("⚠️ No clean description found")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        return False


def main():
    """Test all 4 URLs."""
    test_urls = [
        "https://furryrescueitaly.com/adoption/judy/",
        "https://furryrescueitaly.com/adoption/ninja/",
        "https://furryrescueitaly.com/adoption/thor-2/",
        "https://furryrescueitaly.com/adoption/stephan/",
    ]

    print("=" * 60)
    print("FURRY RESCUE ITALY - DETAIL EXTRACTION VALIDATION")
    print("=" * 60)

    success_count = 0
    for url in test_urls:
        if test_detail_extraction(url):
            success_count += 1

    print("\n" + "=" * 60)
    print(f"SUMMARY: {success_count}/{len(test_urls)} successful")
    print("=" * 60)

    return success_count == len(test_urls)


if __name__ == "__main__":
    import sys

    sys.exit(0 if main() else 1)
