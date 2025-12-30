"""Tests for Galgos del Sol scraper functionality."""

import pytest

from scrapers.galgosdelsol.galgosdelsol_scraper import GalgosDelSolScraper
from tests.scrapers.test_scraper_base import ScraperTestBase


@pytest.mark.unit
@pytest.mark.fast
class TestGalgosDelSolScraper(ScraperTestBase):
    """Test cases for Galgos del Sol scraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = GalgosDelSolScraper
    config_id = "galgosdelsol"
    expected_org_name = "Galgos del Sol"
    expected_base_url = "https://galgosdelsol.org"

    def test_is_available_dog_logic(self, scraper):
        """Test the available dog filtering logic specific to Galgos del Sol."""
        # Available dogs should return True
        assert scraper._is_available_dog("ANDRES")
        assert scraper._is_available_dog("BONITA")

        # Reserved dogs should return False
        assert not scraper._is_available_dog("ReservedAFRICA")
        assert not scraper._is_available_dog("reservedCAMPEON")
        assert not scraper._is_available_dog("RESERVEDDOG")

    def test_extract_external_id_from_url(self, scraper):
        """Test external ID extraction with GDS prefix."""
        test_cases = [
            ("https://galgosdelsol.org/adoptable-dogs/andres-2/", "gds-andres-2"),
            ("https://galgosdelsol.org/adoptable-dogs/bonita-2", "gds-bonita-2"),
        ]

        for url, expected_id in test_cases:
            result = scraper._extract_external_id(url)
            assert result == expected_id

    def test_clean_dog_name(self, scraper):
        """Test dog name cleaning - removes country suffixes."""
        test_cases = [
            ("ANDRES", "Andres"),
            ("APOLLO / FINLAND", "Apollo"),
            ("CAMPEON / CANADA", "Campeon"),
        ]

        for input_name, expected_name in test_cases:
            result = scraper._clean_dog_name(input_name)
            assert result == expected_name

    def test_clean_breed(self, scraper):
        """Test breed cleaning - age categories become Mixed Breed."""
        # Valid breeds preserved
        assert scraper._clean_breed("Galgo") == "Galgo"
        assert scraper._clean_breed("Podenco") == "Podenco"

        # Age categories become Mixed Breed
        assert scraper._clean_breed("puppy") == "Mixed Breed"
        assert scraper._clean_breed("senior") == "Mixed Breed"
