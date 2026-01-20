"""Tests for Animal Rescue Bosnia scraper."""

from unittest.mock import Mock, patch

import pytest

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import (
    AnimalRescueBosniaScraper,
)
from tests.scrapers.test_scraper_base import ScraperTestBase


@pytest.mark.unit
@pytest.mark.unit
class TestAnimalRescueBosniaScraper(ScraperTestBase):
    """Test cases for Animal Rescue Bosnia scraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = AnimalRescueBosniaScraper
    config_id = "animalrescuebosnia"
    expected_org_name = "Animal Rescue Bosnia"
    expected_base_url = "https://www.animal-rescue-bosnia.org"

    @patch("requests.get")
    def test_bosnia_vs_germany_filtering(self, mock_get, scraper):
        """Test that scraper correctly filters out dogs in Germany, only returning Bosnia dogs."""
        mock_html = """
        <html><body>
            <h2>We are already in Germany and waiting for a Happy End:</h2>
            <h2>Findus</h2><a href="/findus/">More info</a>
            <h2>Our Dogs waiting for you in Bosnia</h2>
            <h2>Ksenon</h2><a href="/ksenon/">More info</a>
            <h2>Luke</h2><a href="/luke/">More info</a>
        </body></html>
        """
        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        animals = scraper.get_animal_list()

        # Should only return Bosnia dogs
        assert len(animals) == 2
        dog_names = [animal["name"] for animal in animals]
        assert "Ksenon" in dog_names
        assert "Luke" in dog_names
        assert "Findus" not in dog_names

    @patch("requests.get")
    def test_germany_dogs_detection_and_skip(self, mock_get, scraper):
        """Test that dogs marked as being in Germany are detected and skipped."""
        mock_html = """
        <html><body>
            <h1>Findus</h1>
            <p>We are already in Germany!</p>
            <h2>Short description</h2>
            <p>Breed: Mix<br>Gender: Male<br>Location: Germany</p>
        </body></html>
        """
        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/findus/")

        # Should return None for dogs in Germany
        assert result is None

    @patch("requests.get")
    def test_detail_page_data_extraction(self, mock_get, scraper):
        """Test comprehensive data extraction from detail pages."""
        mock_html = """
        <html><body>
            <h1>Ksenon</h1>
            <img src="/wp-content/uploads/2025/06/Ksenon-2.jpg" alt="">
            <h2>Short description</h2>
            <p>Breed: Mix<br>Gender: Male<br>Date of birth: January 2022<br>Weight: 25 kg</p>
            <h2>About Ksenon</h2>
            <p>Ksenon came to us together with his sister at a construction site.</p>
        </body></html>
        """
        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/ksenon/")

        # Check core fields unique to this scraper
        assert result["name"] == "Ksenon"
        assert result["external_id"] == "arb-ksenon"
        assert result["properties"]["breed"] == "Mix"
        assert result["properties"]["gender"] == "Male"
        assert "construction site" in result["properties"]["description"]

    @patch("requests.get")
    def test_external_id_generation(self, mock_get, scraper):
        """Test external ID generation from dog names using 'arb-' prefix."""
        mock_html = """
        <html><body>
            <h1>Ksenon Dog</h1>
            <h2>Short description</h2>
            <p>Breed: Mix<br>Gender: Male</p>
        </body></html>
        """
        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/ksenon/")

        assert result["external_id"] == "arb-ksenon-dog"

    def test_weight_to_size_standardization(self, scraper):
        """Test standardization of weight values to size categories."""
        assert scraper._extract_size_from_weight("10 kg") == "Small"
        assert scraper._extract_size_from_weight("25 kg") == "Medium"
        assert scraper._extract_size_from_weight("40 kg") == "Large"
        assert scraper._extract_size_from_weight("invalid") is None
