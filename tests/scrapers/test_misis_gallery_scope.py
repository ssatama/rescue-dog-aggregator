"""MISIs photos come from the post's gallery only, never the logo or footer icons (#487)."""

import logging
from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from scrapers.misis_rescue.scraper import MisisRescueScraper

FIXTURE = Path(__file__).parent.parent / "fixtures" / "galleries" / "misis_freya.html"


@pytest.mark.unit
def test_static_image_urls_are_the_posts_gallery_only():
    scraper = MisisRescueScraper.__new__(MisisRescueScraper)
    scraper.base_url = "https://www.misisrescue.com"
    scraper.logger = logging.getLogger("test")

    urls = scraper._extract_static_image_urls(BeautifulSoup(FIXTURE.read_text(), "html.parser"))

    assert len(urls) == 33
    assert all("ef9e05_" in url for url in urls)
    assert not any("9f9c321c" in url or "0fdef751" in url for url in urls)
