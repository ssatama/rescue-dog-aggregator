"""Tests for Santer Paws Bulgarian Rescue scraper functionality."""

import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import (
    SanterPawsBulgarianRescueScraper,
)


@pytest.mark.unit
@pytest.mark.fast
class TestSanterPawsBulgarianRescueScraper(unittest.TestCase):
    """Test cases for Santer Paws Bulgarian Rescue scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

    def test_scraper_initialization(self):
        """Test that scraper initializes correctly with config."""
        self.assertEqual(self.scraper.base_url, "https://santerpawsbulgarianrescue.com")
        self.assertEqual(self.scraper.listing_url, "https://santerpawsbulgarianrescue.com/adopt/")
        self.assertEqual(self.scraper.organization_name, "Santer Paws Bulgarian Rescue")

    def test_extract_dog_name_from_url(self):
        """Test extracting dog name from adoption URL."""
        test_cases = [
            ("https://santerpawsbulgarianrescue.com/adoption/pepper/", "Pepper"),
            ("https://santerpawsbulgarianrescue.com/adoption/daisy/", "Daisy"),
            ("https://santerpawsbulgarianrescue.com/adoption/summer-breeze/", "Summer Breeze"),
            ("https://santerpawsbulgarianrescue.com/adoption/ruby-red/", "Ruby Red"),
        ]

        for url, expected_name in test_cases:
            with self.subTest(url=url):
                result = self.scraper._extract_dog_name_from_url(url)
                self.assertEqual(result, expected_name)

    def test_extract_external_id_from_url(self):
        """Test external ID extraction from URLs."""
        test_cases = [
            ("https://santerpawsbulgarianrescue.com/adoption/pepper/", "pepper"),
            ("https://santerpawsbulgarianrescue.com/adoption/daisy/", "daisy"),
            ("https://santerpawsbulgarianrescue.com/adoption/summer-breeze/", "summer-breeze"),
            ("https://santerpawsbulgarianrescue.com/adoption/ruby-red/", "ruby-red"),
        ]

        for url, expected_id in test_cases:
            with self.subTest(url=url):
                result = self.scraper._extract_external_id(url)
                self.assertEqual(result, expected_id)

    @patch("requests.post")
    def test_get_animal_list_ajax_request(self, mock_post):
        """Test that get_animal_list makes correct AJAX request."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html></html>"
        mock_post.return_value = mock_response

        self.scraper.get_animal_list()

        # Verify POST request was made to correct URL with correct data
        mock_post.assert_called_once()
        call_args = mock_post.call_args

        # Check URL
        self.assertEqual(call_args[0][0], "https://santerpawsbulgarianrescue.com/adopt/")

        # Check POST data
        self.assertEqual(call_args[1]["data"]["wpgb-ajax"], "render")
        self.assertEqual(call_args[1]["data"]["_adoption_status_adopt"], "available")

        # Check headers
        self.assertIn("X-Requested-With", call_args[1]["headers"])
        self.assertEqual(call_args[1]["headers"]["X-Requested-With"], "XMLHttpRequest")

    @patch("requests.post")
    def test_get_animal_list_parses_dogs(self, mock_post):
        """Test that get_animal_list correctly parses dog information."""
        # Mock HTML response with sample dog cards
        mock_html = """
        <html>
        <body>
            <article class="bde-loop-item ee-post">
                <div class="breakdance">
                    <a class="bde-container-link" href="https://santerpawsbulgarianrescue.com/adoption/pepper/">
                        <div>Pepper</div>
                    </a>
                </div>
            </article>
            <article class="bde-loop-item ee-post">
                <div class="breakdance">
                    <a class="bde-container-link" href="https://santerpawsbulgarianrescue.com/adoption/daisy/">
                        <div>Daisy</div>
                    </a>
                </div>
            </article>
            <article class="bde-loop-item ee-post">
                <div class="breakdance">
                    <a class="bde-container-link" href="https://santerpawsbulgarianrescue.com/adoption/summer-breeze/">
                        <div>Summer Breeze</div>
                    </a>
                </div>
            </article>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Should return 3 dogs
        self.assertEqual(len(animals), 3)

        # Check first dog
        self.assertEqual(animals[0]["name"], "Pepper")
        self.assertEqual(animals[0]["external_id"], "pepper")
        self.assertEqual(animals[0]["adoption_url"], "https://santerpawsbulgarianrescue.com/adoption/pepper/")
        self.assertEqual(animals[0]["animal_type"], "dog")
        self.assertEqual(animals[0]["status"], "available")

        # Check second dog
        self.assertEqual(animals[1]["name"], "Daisy")
        self.assertEqual(animals[1]["external_id"], "daisy")
        self.assertEqual(animals[1]["adoption_url"], "https://santerpawsbulgarianrescue.com/adoption/daisy/")

        # Check third dog with hyphenated name
        self.assertEqual(animals[2]["name"], "Summer Breeze")
        self.assertEqual(animals[2]["external_id"], "summer-breeze")
        self.assertEqual(animals[2]["adoption_url"], "https://santerpawsbulgarianrescue.com/adoption/summer-breeze/")

    @patch("requests.post")
    def test_get_animal_list_handles_empty_response(self, mock_post):
        """Test that get_animal_list handles empty response gracefully."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = "<html><body></body></html>"
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Should return empty list
        self.assertEqual(len(animals), 0)

    @patch("requests.post")
    def test_get_animal_list_handles_network_error(self, mock_post):
        """Test that get_animal_list handles network errors gracefully."""
        mock_post.side_effect = Exception("Network error")

        animals = self.scraper.get_animal_list()

        # Should return empty list on error
        self.assertEqual(len(animals), 0)

    @patch("requests.post")
    def test_filters_only_available_dogs(self, mock_post):
        """Test that only available dogs are returned (filter parameter works)."""
        # This is implicitly tested by the AJAX parameters
        # The _adoption_status_adopt=available parameter ensures only available dogs
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = """
        <html>
        <body>
            <article class="bde-loop-item ee-post">
                <a href="https://santerpawsbulgarianrescue.com/adoption/available-dog/">
                    Available Dog
                </a>
            </article>
        </body>
        </html>
        """
        mock_response.raise_for_status = Mock()
        mock_post.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Check that AJAX request includes availability filter
        call_args = mock_post.call_args
        self.assertEqual(call_args[1]["data"]["_adoption_status_adopt"], "available")

        # All returned dogs should be available
        for animal in animals:
            self.assertEqual(animal["status"], "available")

    def test_collect_data_deduplicates_by_url(self):
        """Test that collect_data removes duplicate dogs by URL."""
        with patch.object(self.scraper, "get_animal_list") as mock_get_list:
            # Return list with duplicates
            mock_get_list.return_value = [
                {
                    "name": "Pepper",
                    "external_id": "pepper",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/adoption/pepper/",
                    "animal_type": "dog",
                    "status": "available",
                },
                {
                    "name": "Daisy",
                    "external_id": "daisy",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/adoption/daisy/",
                    "animal_type": "dog",
                    "status": "available",
                },
                {
                    "name": "Pepper",  # Duplicate
                    "external_id": "pepper",
                    "adoption_url": "https://santerpawsbulgarianrescue.com/adoption/pepper/",
                    "animal_type": "dog",
                    "status": "available",
                },
            ]

            result = self.scraper.collect_data()

            # Should deduplicate to 2 unique dogs
            self.assertEqual(len(result), 2)
            urls = [dog["adoption_url"] for dog in result]
            self.assertEqual(len(urls), len(set(urls)))  # All URLs should be unique
