"""Tests for Furry Rescue Italy scraper."""

from unittest.mock import Mock, patch

import pytest

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper
from tests.scrapers.test_scraper_base import ScraperTestBase


@pytest.mark.unit
@pytest.mark.fast
class TestFurryRescueItalyScraper(ScraperTestBase):
    """Test cases for Furry Rescue Italy scraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = FurryRescueItalyScraper
    config_id = "furryrescueitaly"
    expected_org_name = "Furry Rescue Italy"
    expected_base_url = "https://furryrescueitaly.com"

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_pagination_and_filtering(self, mock_get, scraper):
        """Test pagination handling and reserved dog filtering."""
        # Mock response with pagination and reserved dogs
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <article>
                <h6 class="adoption-header">BILLO</h6>
                <a href="/adoption/billo/" class="btn">More Info</a>
            </article>
            <article>
                <h6 class="adoption-header">RESERVED - BIGOL</h6>
                <a href="/adoption/bigol/" class="btn">More Info</a>
            </article>
            <div class="pagination">
                <a href="/adoptions/page/2/">2</a>
            </div>
        </html>
        """
        mock_get.return_value = mock_response

        animals = scraper.get_animal_list(max_pages_to_scrape=1)

        # Should filter out reserved dogs
        assert len(animals) == 1
        assert animals[0]["name"] == "Billo"
        assert "RESERVED" not in [a["name"] for a in animals]

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_data_standardization(self, mock_get, scraper):
        """Test data standardization functionality."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
            <article>
                <h6 class="adoption-header">THOR</h6>
                <ul>
                    <li>Born: October 2021</li>
                    <li>Breed: german SHEPHERD mix</li>
                    <li>Size: Large (25-30 kg)</li>
                    <li>Sex: Female</li>
                    <li>Good with: Dogs, Cats and Children</li>
                    <li>Location: Italy</li>
                </ul>
                <a href="/adoption/thor/" class="btn">More Info</a>
            </article>
        </html>
        """
        mock_get.return_value = mock_response

        animals = scraper.get_animal_list(max_pages_to_scrape=1)

        # Should apply standardization
        assert len(animals) == 1
        animal = animals[0]
        # Standardization should extract key fields
        assert "born" in animal
        assert "location" in animal
        assert animal["name"] == "Thor"

    @patch("scrapers.furryrescueitaly.furryrescueitaly_scraper.requests.get")
    def test_error_handling_graceful(self, mock_get, scraper):
        """Test graceful handling of network errors."""
        mock_get.side_effect = Exception("Network error")

        animals = scraper.get_animal_list(max_pages_to_scrape=1)

        # Should return empty list on error
        assert animals == []

    def test_parallel_processing_configuration(self, scraper):
        """Test that parallel processing is properly configured."""
        # Should have batch size configured for efficient processing
        assert hasattr(scraper, "batch_size")
        assert scraper.batch_size <= 4  # Configured max for this site
