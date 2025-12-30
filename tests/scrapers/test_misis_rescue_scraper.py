from unittest.mock import Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.misis_rescue.scraper import MisisRescueScraper
from tests.scrapers.test_scraper_base import ScraperTestBase


@pytest.mark.unit
@pytest.mark.fast
class TestMisisRescueScraper(ScraperTestBase):
    """Test cases for Misis Rescue scraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = MisisRescueScraper
    config_id = "misisrescue"
    expected_org_name = "MISIs Animal Rescue"
    expected_base_url = "https://www.misisrescue.com"

    def test_skips_reserved_section(self, scraper):
        """Test that scraper correctly identifies and skips reserved dogs."""
        html_with_reserved = """
        <html><body>
            <div><a href="/post/dog1">Dog 1</a><a href="/post/dog2">Dog 2</a></div>
            <h2>💙⭐Reserved⭐💙</h2>
            <div><a href="/post/reserved-dog">Reserved Dog</a></div>
        </body></html>
        """
        soup = BeautifulSoup(html_with_reserved, "html.parser")
        reserved_heading = soup.find(
            "h2", string=lambda text: text and "reserved" in text.lower()
        )
        assert scraper._is_reserved_section(reserved_heading)
        available_dogs = scraper._extract_dogs_before_reserved(soup)
        assert len(available_dogs) == 2

    def test_extract_dog_urls_from_page(self, scraper):
        """Test extracting dog URLs from listing page."""
        mock_html = '<html><main class="PAGES_CONTAINER"><a href="/post/dog-1" class="O16KGI">Dog 1</a><a href="/post/dog-2" class="O16KGI">Dog 2</a></main></html>'
        mock_driver_instance = Mock()
        mock_driver_instance.page_source = mock_html
        mock_driver_instance.quit = Mock()

        with patch.object(
            scraper, "_setup_selenium_driver", return_value=mock_driver_instance
        ):
            urls = scraper._extract_dog_urls_from_page(1)
            assert len(urls) == 2
            assert all("/post/" in url for url in urls)

    def test_pagination_logic(self, scraper):
        """Test pagination handling for multiple pages."""
        with patch.object(scraper, "_extract_dog_urls_from_page") as mock_extract:
            mock_extract.side_effect = [["url1", "url2"], ["url3"], []]
            all_urls = scraper._get_all_dog_urls()
            assert len(all_urls) == 3
            assert mock_extract.call_count == 3

    def test_external_id_generation(self, scraper):
        """Test external ID generation from URLs."""
        test_url = "https://www.misisrescue.com/post/amena-123"
        external_id = scraper._generate_external_id(test_url)
        assert external_id == "mar-amena-123"

    def test_reserved_section_detection_variations(self, scraper):
        """Test various Reserved section header formats."""
        test_cases = ["💙⭐Reserved⭐💙", "Reserved", "RESERVED DOGS"]
        for reserved_text in test_cases:
            mock_element = Mock()
            mock_element.get_text.return_value = reserved_text
            assert scraper._is_reserved_section(mock_element)

    def test_detail_page_scraping(self, scraper):
        """Test individual detail page scraping."""
        mock_html = "<html><body><h1>Test Dog</h1><div><ul><li>DOB: 2022</li><li>Mixed breed</li><li>weighs 15kg</li></ul></div></body></html>"
        mock_driver_instance = Mock()
        mock_driver_instance.page_source = mock_html
        mock_driver_instance.title = "Test Dog - MISIs Animal Rescue"
        mock_driver_instance.quit = Mock()

        with patch.object(
            scraper, "_setup_selenium_driver", return_value=mock_driver_instance
        ):
            dog_data = scraper._scrape_dog_detail("https://example.com/post/test-dog")
            assert dog_data["name"] == "Test Dog"
            assert dog_data["external_id"] == "mar-test-dog"
