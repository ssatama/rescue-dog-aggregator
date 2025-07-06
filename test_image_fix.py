#!/usr/bin/env python3
"""Test script for image extraction fix."""

import pytest
from bs4 import BeautifulSoup

from scrapers.theunderdog.theunderdog_scraper import TheUnderdogScraper


def test_image_extraction_with_data_src():
    """Test that image extraction works with Squarespace data-src attributes."""

    # Mock HTML that represents the actual Squarespace structure with data-src
    mock_html = """
    <div class="ProductItem-gallery">
        <img src="No src" alt="Underdog International" data-src="https://images.squarespace-cdn.com/content/v1/5c40fa0e1aef1d1aa24274ea/1549663947052-D5ONWTYM2O9QMKTKVCMI/PRIMARY_UD_label.png">
        <img src="No src" alt="0F821595-8B6D-4F84-9F14-87F5219D204C.jpeg" data-src="https://images.squarespace-cdn.com/content/v1/5c40fa0e1aef1d1aa24274ea/1717392531727-6JBH68UT2VELN9U44I9M/0F821595-8B6D-4F84-9F14-87F5219D204C.jpeg">
        <img src="No src" alt="08C1DD39-B2B0-4400-8C0B-7079CDFFC937.jpeg" data-src="https://images.squarespace-cdn.com/content/v1/5c40fa0e1aef1d1aa24274ea/1717392550749-PGH632249IBHS8R0PAP3/08C1DD39-B2B0-4400-8C0B-7079CDFFC937.jpeg">
    </div>
    """

    soup = BeautifulSoup(mock_html, "html.parser")
    scraper = TheUnderdogScraper()

    # Test the extraction
    image_url = scraper._extract_hero_image(soup)

    # Should NOT be the organization logo
    assert image_url is not None
    assert "PRIMARY_UD_label.png" not in image_url
    assert "Underdog International" not in image_url

    # Should be the full data-src URL with format parameter
    assert "squarespace-cdn.com" in image_url
    assert "1717392531727-6JBH68UT2VELN9U44I9M" in image_url
    assert "format=1500w" in image_url

    print(f"✅ Extracted image URL: {image_url}")


def test_fallback_to_alt_construction():
    """Test fallback to alt attribute construction when data-src is not available."""

    # Mock HTML with only alt attributes (no data-src)
    mock_html = """
    <div class="ProductItem-gallery-slides">
        <img src="No src" alt="Underdog International">
        <img src="No src" alt="WhatsApp+Image+2025-06-03+at+18.28.35+%285%29.jpg">
        <img src="No src" alt="WhatsApp+Image+2025-06-15+at+09.04.15+%282%29.jpg">
    </div>
    """

    soup = BeautifulSoup(mock_html, "html.parser")
    scraper = TheUnderdogScraper()

    # Test the extraction
    image_url = scraper._extract_hero_image(soup)

    # Should fall back to alt-based construction
    assert image_url is not None
    assert "squarespace-cdn.com" in image_url
    assert "WhatsApp" in image_url

    print(f"✅ Fallback extracted URL: {image_url}")


if __name__ == "__main__":
    test_image_extraction_with_data_src()
    test_fallback_to_alt_construction()
    print("✅ All image extraction tests passed!")
