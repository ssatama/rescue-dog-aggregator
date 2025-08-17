"""Tests for DogsTrustScraper class.

Focus on behavior-based testing for the Dogs Trust scraper implementation.
Tests cover the hybrid approach (Selenium for listings, HTTP for details)
and reserved dog filtering requirements.
"""

from unittest.mock import Mock, patch

import pytest
import requests

from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper
from tests.scrapers.test_scraper_base import ScraperTestBase


@pytest.mark.slow
@pytest.mark.browser
class TestDogsTrustScraper(ScraperTestBase):
    """Test cases for DogsTrustScraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = DogsTrustScraper
    config_id = "dogstrust"
    expected_org_name = "Dogs Trust"
    expected_base_url = "https://www.dogstrust.org.uk"

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_selenium_driver_cleanup_on_exception(self, mock_webdriver, scraper):
        """Test WebDriver is properly cleaned up even when exceptions occur."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.get.side_effect = Exception("Network error")

        # Should handle exception gracefully and clean up driver
        result = scraper.get_animal_list()

        assert isinstance(result, list)  # Should return empty list on error
        mock_driver.quit.assert_called_once()

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_get_animal_list_applies_reserved_dog_filter(self, mock_webdriver, scraper):
        """Test that get_animal_list applies filter to hide reserved dogs through UI."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.page_source = """
        <html>
            <body>
                <div>1 of 5</div>
            </body>
        </html>
        """

        # Mock find_element to simulate filter elements not found
        mock_driver.find_element.side_effect = Exception("Element not found")

        result = scraper.get_animal_list()

        # Verify the initial page load call
        expected_first_url = "https://www.dogstrust.org.uk/rehoming/dogs"
        mock_driver.get.assert_any_call(expected_first_url)
        # Verify attempts to find filter elements were made
        assert mock_driver.find_element.called
        assert isinstance(result, list)
