"""Test suite for MISIs Rescue scraper comprehensive fixes.

Tests the following critical issues:
1. Error page detection (no more "This Site Can't Be Reached" entries)
2. Reserved dog filtering
3. Performance optimization with requests
4. Size standardization persistence
"""

from unittest.mock import MagicMock, Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.misis_rescue.detail_parser import MisisRescueDetailParser
from scrapers.misis_rescue.scraper import MisisRescueScraper


class TestMisisRescueErrorPageDetection:
    """Test error page detection prevents bad data."""

    @patch("scrapers.misis_rescue.scraper.webdriver.Chrome")
    def test_error_page_detected_in_title(self, mock_chrome):
        """Test that error pages are detected by title."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        # Mock driver with error page title
        mock_driver = Mock()
        mock_driver.title = "This site can't be reached"
        mock_driver.page_source = "<html><body>Error</body></html>"
        mock_chrome.return_value = mock_driver

        # Mock wait
        with patch("scrapers.misis_rescue.scraper.WebDriverWait"):
            result = scraper._scrape_dog_detail("https://test.com/dog")

        assert result is None  # Should return None for error pages
        mock_driver.quit.assert_called_once()

    @patch("scrapers.misis_rescue.scraper.webdriver.Chrome")
    def test_error_page_detected_with_apostrophe_variation(self, mock_chrome):
        """Test that different apostrophe variations are detected."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        # Mock driver with different apostrophe
        mock_driver = Mock()
        mock_driver.title = "This Site Can'T Be Reached"  # Different apostrophe
        mock_driver.page_source = "<html><body>Error</body></html>"
        mock_chrome.return_value = mock_driver

        with patch("scrapers.misis_rescue.scraper.WebDriverWait"):
            result = scraper._scrape_dog_detail("https://test.com/dog")

        assert result is None

    @patch("scrapers.misis_rescue.scraper.requests.get")
    def test_fast_scraper_detects_error_pages(self, mock_get):
        """Test that fast scraper with requests also detects error pages."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        # Mock error response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><head><title>This site can't be reached</title></head></html>"
        mock_get.return_value = mock_response

        result = scraper._scrape_dog_detail_fast("https://test.com/dog")

        assert result is None


class TestMisisRescuePerformanceOptimization:
    """Test performance optimization with requests."""

    @patch("scrapers.misis_rescue.scraper.requests.get")
    def test_fast_scraper_used_for_valid_pages(self, mock_get):
        """Test that fast scraper successfully processes valid pages."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        # Mock successful response with dog content
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
        <head><title>Fluffy - Adorable Puppy</title></head>
        <body>
            <h1>Fluffy</h1>
            <h2>Things you should know</h2>
            <ul>
                <li>DOB- 2023</li>
                <li>Mixed breed</li>
                <li>Weighs 5.5kg</li>
            </ul>
            <img src="https://static.wixstatic.com/media/dog.jpg">
        </body>
        </html>
        """
        mock_get.return_value = mock_response

        with patch.object(scraper.detail_parser, "parse_detail_page") as mock_parse:
            mock_parse.return_value = {"name": "Fluffy", "size": "Small", "properties": {"standardized_size": "Small"}}

            result = scraper._scrape_dog_detail_fast("https://test.com/fluffy")

        assert result is not None
        assert result["name"] == "Fluffy"
        assert result["standardized_size"] == "Small"  # Size copied to top level
        assert "adoption_url" in result
        assert "external_id" in result

    @patch("scrapers.misis_rescue.scraper.requests.get")
    @patch("scrapers.misis_rescue.scraper.webdriver.Chrome")
    def test_fallback_to_selenium_when_needed(self, mock_chrome, mock_get):
        """Test fallback to Selenium when content requires JavaScript."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        # Mock response without "Things you should know" (needs JS)
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body>Loading...</body></html>"
        mock_get.return_value = mock_response

        # Mock Selenium driver
        mock_driver = Mock()
        mock_driver.title = "Fluffy"
        mock_driver.page_source = """
        <html><body><h1>Fluffy</h1>
        <h2>Things you should know</h2>
        <ul><li>DOB- 2023</li></ul>
        </body></html>
        """
        mock_chrome.return_value = mock_driver

        with patch("scrapers.misis_rescue.scraper.WebDriverWait"):
            with patch.object(scraper, "_extract_main_image", return_value="http://image.jpg"):
                result = scraper._scrape_dog_detail_fast("https://test.com/fluffy")

        # Should have called Selenium method
        mock_chrome.assert_called()


class TestMisisRescueSizeStandardization:
    """Test size standardization is properly saved."""

    def test_detail_parser_sets_standardized_size_in_properties(self):
        """Test that detail parser sets standardized_size in properties."""
        parser = MisisRescueDetailParser()

        html = """
        <html>
        <body>
            <h1>Tiny Tim</h1>
            <h2>Things you should know</h2>
            <ul>
                <li>DOB- 2024</li>
                <li>Weighs 4.5kg</li>
            </ul>
        </body>
        </html>
        """

        soup = BeautifulSoup(html, "html.parser")
        result = parser.parse_detail_page(soup)

        assert result["name"] == "Tiny Tim"
        assert result["size"] == "Tiny"  # 4.5kg = Tiny
        assert result["properties"]["standardized_size"] == "Tiny"
        assert result["properties"]["weight"] == "4.5kg"

    def test_size_categories_are_correct(self):
        """Test all size categories based on weight."""
        parser = MisisRescueDetailParser()

        test_cases = [
            (3, "Tiny"),  # <5kg
            (5.5, "Small"),  # 5-10kg
            (15, "Medium"),  # 10-25kg
            (30, "Large"),  # 25-40kg
            (45, "XLarge"),  # >40kg
        ]

        for weight, expected_size in test_cases:
            html = f"""
            <html><body>
            <h1>Test Dog</h1>
            <h2>Things you should know</h2>
            <ul><li>Weighs {weight}kg</li></ul>
            </body></html>
            """

            soup = BeautifulSoup(html, "html.parser")
            result = parser.parse_detail_page(soup)

            assert result["size"] == expected_size, f"Weight {weight}kg should be {expected_size}"
            assert result["properties"]["standardized_size"] == expected_size


class TestMisisRescueReservedDogFiltering:
    """Test reserved dog filtering."""

    def test_reserved_dogs_are_filtered(self):
        """Test that reserved dogs are not included."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        html = """
        <html>
        <body>
            <a href="/post/fluffy">Fluffy</a>
            <a href="/post/max">Max (reserved)</a>
            <a href="/post/bella">Bella</a>
            <a href="/post/charlie">Charlie (Reserved)</a>
        </body>
        </html>
        """

        soup = BeautifulSoup(html, "html.parser")
        dogs = scraper._extract_dogs_before_reserved(soup)

        # Should only get non-reserved dogs
        assert len(dogs) == 2
        assert dogs[0]["name"] == "Fluffy"
        assert dogs[1]["name"] == "Bella"

        # Reserved dogs should be filtered out
        dog_names = [d["name"] for d in dogs]
        assert "Max (reserved)" not in dog_names
        assert "Charlie (Reserved)" not in dog_names


class TestMisisRescueIntegration:
    """Integration tests for all fixes together."""

    @patch("scrapers.misis_rescue.scraper.requests.get")
    def test_complete_flow_with_all_fixes(self, mock_get):
        """Test complete flow with all fixes applied."""
        scraper = MisisRescueScraper(config_id="misisrescue")

        # Mock successful response
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
        <head><title>Fluffy - Adorable Puppy</title></head>
        <body>
            <h1>Fluffy</h1>
            <h2>Things you should know about Fluffy</h2>
            <ul>
                <li>DOB- December 2024</li>
                <li>Mixed breed</li>
                <li>9kg</li>
            </ul>
            <img src="https://static.wixstatic.com/media/dog.jpg">
        </body>
        </html>
        """
        mock_get.return_value = mock_response

        result = scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/fluffy-2")

        # Verify all expected fields
        assert result is not None
        assert result["name"] == "Fluffy"
        assert result["standardized_size"] == "Small"  # 9kg = Small
        assert result["adoption_url"] == "https://www.misisrescue.com/post/fluffy-2"
        assert result["external_id"] == "mar-fluffy-2"
        assert result["organization_id"] is not None
        assert len(result.get("image_urls", [])) > 0
