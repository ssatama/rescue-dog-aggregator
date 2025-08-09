"""Tests for Galgos del Sol scraper functionality."""

import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.galgosdelsol.galgosdelsol_scraper import GalgosDelSolScraper


@pytest.mark.unit
@pytest.mark.fast
class TestGalgosDelSolScraper(unittest.TestCase):
    """Test cases for Galgos del Sol scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = GalgosDelSolScraper(config_id="galgosdelsol")

    def test_scraper_initialization(self):
        """Test that scraper initializes correctly with config."""
        self.assertEqual(self.scraper.base_url, "https://galgosdelsol.org")
        self.assertEqual(len(self.scraper.listing_urls), 4)
        expected_urls = [
            "https://galgosdelsol.org/adoptables/galgos/",
            "https://galgosdelsol.org/adoptables/podencos/",
            "https://galgosdelsol.org/adoptables/pups-teens/",
            "https://galgosdelsol.org/adoptables/other-dogs/",
        ]
        self.assertEqual(self.scraper.listing_urls, expected_urls)
        self.assertEqual(self.scraper.organization_name, "Galgos del Sol")

    def test_is_available_dog_logic(self):
        """Test the available dog filtering logic."""
        # Available dogs should return True
        self.assertTrue(self.scraper._is_available_dog("ANDRES"))
        self.assertTrue(self.scraper._is_available_dog("BONITA"))

        # Reserved dogs should return False
        self.assertFalse(self.scraper._is_available_dog("ReservedAFRICA"))
        self.assertFalse(self.scraper._is_available_dog("reservedCAMPEON"))
        self.assertFalse(self.scraper._is_available_dog("RESERVEDDOG"))

        # Edge cases
        self.assertTrue(self.scraper._is_available_dog(""))
        self.assertTrue(self.scraper._is_available_dog(None))

    def test_extract_external_id_from_url(self):
        """Test external ID extraction from URLs."""
        test_cases = [
            ("https://galgosdelsol.org/adoptable-dogs/andres-2/", "andres-2"),
            ("https://galgosdelsol.org/adoptable-dogs/bonita-2", "bonita-2"),
            ("https://example.com/path/to/resource/", "resource"),
            ("https://example.com/single", "single"),
        ]

        for url, expected_id in test_cases:
            with self.subTest(url=url):
                result = self.scraper._extract_external_id(url)
                self.assertEqual(result, expected_id)

    def test_clean_dog_name(self):
        """Test dog name cleaning functionality."""
        test_cases = [
            ("ANDRES", "Andres"),
            ("bonita", "Bonita"),
            ("APOLLO / FINLAND", "Apollo"),
            ("CAMPEON / CANADA", "Campeon"),
            ("  SPACED NAME  ", "Spaced Name"),
            ("", ""),
        ]

        for input_name, expected_name in test_cases:
            with self.subTest(input_name=input_name):
                result = self.scraper._clean_dog_name(input_name)
                self.assertEqual(result, expected_name)

    def test_clean_breed(self):
        """Test breed cleaning functionality."""
        # Valid breeds should be preserved
        self.assertEqual(self.scraper._clean_breed("Galgo"), "Galgo")
        self.assertEqual(self.scraper._clean_breed("Podenco"), "Podenco")

        # Age categories should become Mixed Breed
        self.assertEqual(self.scraper._clean_breed("puppy"), "Mixed Breed")
        self.assertEqual(self.scraper._clean_breed("senior"), "Mixed Breed")

        # Generic categories should become Mixed Breed
        self.assertEqual(self.scraper._clean_breed("other"), "Mixed Breed")
        self.assertEqual(self.scraper._clean_breed("mixed"), "Mixed Breed")

        # Empty/None should become Mixed Breed
        self.assertEqual(self.scraper._clean_breed(""), "Mixed Breed")
        self.assertEqual(self.scraper._clean_breed(None), "Mixed Breed")

    @patch("requests.get")
    def test_scrape_listing_page_basic(self, mock_get):
        """Test basic listing page scraping functionality."""
        mock_html = """
        <html>
        <body>
            <main>
                <div>
                    <a href="https://galgosdelsol.org/adoptable-dogs/andres-2/">ANDRES</a>
                    <a href="https://galgosdelsol.org/adoptable-dogs/bonita-2/">BONITA</a>
                </div>
            </main>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = mock_html
        mock_get.return_value = mock_response

        animals = self.scraper._scrape_listing_page("https://galgosdelsol.org/adoptables/galgos/")

        # Should extract 2 dogs
        self.assertEqual(len(animals), 2)

        # Check first dog data
        first_dog = animals[0]
        self.assertEqual(first_dog["name"], "Andres")
        self.assertEqual(first_dog["external_id"], "andres-2")
        self.assertEqual(first_dog["adoption_url"], "https://galgosdelsol.org/adoptable-dogs/andres-2/")
        self.assertEqual(first_dog["animal_type"], "dog")
        self.assertEqual(first_dog["status"], "available")

    @patch("requests.get")
    def test_scrape_listing_page_filters_reserved(self, mock_get):
        """Test that listing page scraping filters out reserved dogs."""
        mock_html = """
        <html>
        <body>
            <main>
                <div>
                    <a href="https://galgosdelsol.org/adoptable-dogs/andres-2/">ANDRES</a>
                    <a href="https://galgosdelsol.org/adoptable-dogs/africa/">ReservedAFRICA</a>
                    <a href="https://galgosdelsol.org/adoptable-dogs/bonita-2/">BONITA</a>
                </div>
            </main>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = mock_html
        mock_get.return_value = mock_response

        animals = self.scraper._scrape_listing_page("https://galgosdelsol.org/adoptables/galgos/")

        # Should only return available dogs (not Reserved ones)
        self.assertEqual(len(animals), 2)

        animal_names = [animal["name"] for animal in animals]
        self.assertIn("Andres", animal_names)
        self.assertIn("Bonita", animal_names)
        self.assertNotIn("Africa", animal_names)

    def test_calculate_age_from_birth_date(self):
        """Test age calculation from various birth date formats."""
        from datetime import datetime

        current_year = datetime.now().year

        # Test valid formats
        self.assertEqual(self.scraper._calculate_age_from_birth_date("2020"), f"{current_year - 2020} years")

        # Test invalid/empty
        self.assertIsNone(self.scraper._calculate_age_from_birth_date(""))
        self.assertIsNone(self.scraper._calculate_age_from_birth_date(None))
        self.assertIsNone(self.scraper._calculate_age_from_birth_date("invalid"))


@pytest.mark.integration
@pytest.mark.slow
class TestGalgosDelSolScraperIntegration(unittest.TestCase):
    """Integration tests for Galgos del Sol scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = GalgosDelSolScraper(config_id="galgosdelsol")

    @patch("scrapers.galgosdelsol.galgosdelsol_scraper.time.sleep")  # Speed up tests
    @patch("requests.get")
    def test_collect_data_integration(self, mock_get, mock_sleep):
        """Test the main collect_data method integration."""
        # Mock responses for all 4 listing pages
        mock_html = """
        <html>
        <body>
            <main>
                <div>
                    <a href="https://galgosdelsol.org/adoptable-dogs/test-dog/">TEST DOG</a>
                </div>
            </main>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = mock_html
        mock_get.return_value = mock_response

        # Call collect_data
        data = self.scraper.collect_data()

        # Should have called all 4 listing URLs (plus detail page calls)
        self.assertGreaterEqual(mock_get.call_count, 4)

        # Should return data for the test dog (4 times, once per page)
        # But duplicates should be filtered out
        self.assertEqual(len(data), 1)  # Only one unique dog

        dog = data[0]
        self.assertEqual(dog["name"], "Test Dog")
        self.assertEqual(dog["organization_id"], self.scraper.organization_id)
