"""
Integration tests for REAN scraper requiring network or browser operations.

This module contains tests that validate end-to-end functionality including
web scraping, browser automation, and API interactions.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest
import requests
from selenium.common.exceptions import WebDriverException

from scrapers.rean.dogs_scraper import REANScraper


class TestREANIntegration:
    """Integration tests for REAN scraper network and browser operations."""

    @pytest.fixture
    def scraper(self):
        """Create a REAN scraper instance for testing."""
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
        ):
            mock_config = MagicMock()
            mock_config.name = "REAN Test"
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,
                "max_retries": 2,
                "timeout": 10,
            }
            mock_config.metadata.website_url = "https://rean.org.uk"

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(
                organization_id=1, was_created=True
            )
            mock_sync.return_value = mock_sync_service

            return REANScraper()

    @pytest.mark.slow
    @pytest.mark.network
    @patch("requests.get")
    def test_scrape_page_success(self, mock_get, scraper):
        """Test successful page scraping with network request."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = "<html><body>Dog content</body></html>"
        mock_get.return_value = mock_response

        result = scraper.scrape_page("https://rean.org.uk/dogs")

        assert result == "<html><body>Dog content</body></html>"
        mock_get.assert_called_once()

    @pytest.mark.slow
    @pytest.mark.network
    @patch("requests.get")
    @patch("time.sleep")  # Speed up retries
    def test_scrape_page_with_retries(self, mock_sleep, mock_get, scraper):
        """Test page scraping with network failures and retries."""
        # First attempt fails, second succeeds
        mock_get.side_effect = [
            requests.exceptions.Timeout("Timeout"),
            MagicMock(status_code=200, text="Success"),
        ]

        result = scraper.scrape_page("https://rean.org.uk/dogs")

        assert result == "Success"
        assert mock_get.call_count == 2

    @pytest.mark.slow
    @pytest.mark.selenium
    @pytest.mark.browser
    @patch("selenium.webdriver.Chrome")
    @patch("time.sleep")  # Speed up waits
    def test_extract_images_with_browser(self, mock_sleep, mock_chrome, scraper):
        """Test browser-based image extraction."""
        mock_driver = Mock()
        mock_chrome.return_value = mock_driver

        # Mock scrolling behavior
        mock_driver.execute_script.side_effect = (
            lambda script: 1000 if "scrollHeight" in script else None
        )

        # Mock image elements
        mock_img1 = Mock()
        mock_img1.get_attribute.return_value = (
            "https://img1.wsimg.com/isteam/ip/abc/dog1.jpg"
        )

        mock_img2 = Mock()
        mock_img2.get_attribute.return_value = (
            "https://img1.wsimg.com/isteam/ip/def/dog2.jpg"
        )

        mock_driver.find_elements.return_value = [mock_img1, mock_img2]

        images = scraper.extract_images_with_browser("https://rean.org.uk/dogs")

        assert len(images) == 2
        assert all("wsimg.com" in url for url in images)
        mock_driver.quit.assert_called_once()

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch("selenium.webdriver.Chrome")
    def test_extract_images_browser_failure(self, mock_chrome, scraper):
        """Test browser image extraction handles WebDriver failures."""
        mock_chrome.side_effect = WebDriverException("Chrome failed to start")

        result = scraper.extract_images_with_browser("https://rean.org.uk/dogs")

        assert result == []  # Should return empty list on failure

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch("selenium.webdriver.Chrome")
    @patch("time.sleep")
    def test_unified_extraction_with_dom(self, mock_sleep, mock_chrome, scraper):
        """Test unified DOM-based extraction approach."""
        mock_driver = Mock()
        mock_chrome.return_value = mock_driver

        # Mock container elements
        mock_container = Mock()
        mock_container.text = """
        Toby - 4 months old - in Romania
        Little friendly Toby is looking sad in the shelter.
        Vaccinated and chipped.
        (Updated 22/4/25)
        """

        # Mock image in container
        mock_img = Mock()
        mock_img.get_attribute.return_value = (
            "https://img1.wsimg.com/isteam/ip/abc/toby.jpg"
        )
        mock_container.find_elements.return_value = [mock_img]

        # Mock finding containers
        scraper._find_dog_containers = Mock(return_value=[mock_container])

        result = scraper.extract_dogs_with_images_unified(
            "https://rean.org.uk/dogs", "romania"
        )

        assert len(result) == 1
        assert result[0]["name"] == "Toby"
        assert result[0]["age_text"] == "4 months"
        assert (
            result[0]["primary_image_url"]
            == "https://img1.wsimg.com/isteam/ip/abc/toby.jpg"
        )

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch("selenium.webdriver.Chrome")
    def test_unified_extraction_fallback(self, mock_chrome, scraper):
        """Test unified extraction falls back to legacy method on failure."""
        # Make WebDriver fail
        mock_chrome.side_effect = WebDriverException("Failed")

        # Mock the legacy fallback
        scraper._extract_dogs_legacy_fallback = Mock(return_value=[])

        result = scraper.extract_dogs_with_images_unified(
            "https://rean.org.uk/dogs", "romania"
        )

        assert result == []
        scraper._extract_dogs_legacy_fallback.assert_called_once()

    @pytest.mark.slow
    @pytest.mark.network
    @patch("requests.get")
    @patch("selenium.webdriver.Chrome")
    @patch("time.sleep")
    def test_full_scraping_workflow(self, mock_sleep, mock_chrome, mock_get, scraper):
        """Test complete scraping workflow from start to finish."""
        # Mock page content
        page_html = """
        <html><body>
        <div class="dog-entry">
            Buddy is 2 years old, rescued from streets.
            He is vaccinated and chipped.
            (Updated 22/4/25)
        </div>
        </body></html>
        """

        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.text = page_html
        mock_get.return_value = mock_response

        # Mock browser for images
        mock_driver = Mock()
        mock_chrome.return_value = mock_driver

        # Mock container with dog info
        mock_container = Mock()
        mock_container.text = "Buddy is 2 years old, rescued from streets. He is vaccinated and chipped. (Updated 22/4/25)"

        mock_img = Mock()
        mock_img.get_attribute.return_value = (
            "https://img1.wsimg.com/isteam/ip/abc/buddy.jpg"
        )
        mock_container.find_elements.return_value = [mock_img]

        scraper._find_dog_containers = Mock(return_value=[mock_container])

        # Run full scraping
        result = scraper.scrape_animals()

        assert len(result) > 0  # Should find at least one dog
        # Verify complete data extraction
        dog = result[0]
        assert dog["name"] == "Buddy"
        assert dog["animal_type"] == "dog"
        assert "external_id" in dog

    @pytest.mark.slow
    @pytest.mark.network
    def test_rate_limiting_between_pages(self, scraper):
        """Test rate limiting is applied between page requests."""
        with patch("time.sleep") as mock_sleep, patch("requests.get") as mock_get:
            mock_get.return_value = MagicMock(status_code=200, text="")

            # Mock unified extraction to return empty
            scraper.extract_dogs_with_images_unified = Mock(return_value=[])

            # Scrape multiple pages
            scraper.scrape_animals()

            # Should have rate limited between pages
            assert mock_sleep.called
