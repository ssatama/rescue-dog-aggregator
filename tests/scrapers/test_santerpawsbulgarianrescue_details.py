"""Tests for Santer Paws Bulgarian Rescue detail page scraping functionality."""

import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import (
    SanterPawsBulgarianRescueScraper,
)


@pytest.mark.unit
@pytest.mark.fast
class TestSanterPawsBulgarianRescueDetailScraping(unittest.TestCase):
    """Test cases for Santer Paws Bulgarian Rescue detail page scraping."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

    @patch("requests.get")
    def test_scrape_animal_details_extracts_hero_image(self, mock_get):
        """Test that hero image is correctly extracted from carousel."""
        mock_html = """
        <html>
        <body>
            <div>
                <figure>
                    <img src="https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/anastasia-1.jpg" alt="Anastasia">
                </figure>
                <figure>
                    <img src="https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/anastasia-2.jpg" alt="Anastasia 2">
                </figure>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/anastasia/")

        # Should extract first image as hero image
        self.assertIn("primary_image_url", result)
        self.assertEqual(result["primary_image_url"], "https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/anastasia-1.jpg")

    @patch("requests.get")
    def test_scrape_animal_details_extracts_about_section(self, mock_get):
        """Test that About section description is correctly extracted."""
        mock_html = """
        <html>
        <body>
            <h2>About</h2>
            <div>
                <p>Anastasia is the sister of Tiger and Priscilla now in the UK.</p>
                <p>She has lived with young children and cats.</p>
                <p>The worried look is because she was at the vet! She is not normally subdued.</p>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/anastasia/")

        # Should extract combined about text
        self.assertIn("description", result)
        description = result["description"]
        self.assertIn("Anastasia is the sister of Tiger", description)
        self.assertIn("lived with young children", description)
        self.assertIn("worried look is because", description)

    @patch("requests.get")
    def test_scrape_animal_details_extracts_information_fields(self, mock_get):
        """Test that Information section fields are correctly parsed."""
        mock_html = """
        <html>
        <body>
            <h2>Information</h2>
            <div>
                <div>
                    <div>
                        <div>D.O.B</div>
                        <div>20/04/2023</div>
                    </div>
                    <div>
                        <div>Size</div>
                        <div>Medium</div>
                    </div>
                </div>
                <div>
                    <div>
                        <div>Sex</div>
                        <div>Female</div>
                    </div>
                    <div>
                        <div>Breed</div>
                        <div>Mixed</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/anastasia/")

        # Should extract structured information
        self.assertEqual(result.get("age_text"), "20/04/2023")
        self.assertEqual(result.get("size"), "Medium")
        self.assertEqual(result.get("sex"), "Female")
        self.assertEqual(result.get("breed"), "Mixed")

    @patch("requests.get")
    def test_scrape_animal_details_detects_reserved_status(self, mock_get):
        """Test that reserved dogs are correctly identified."""
        mock_html = """
        <html>
        <body>
            <h2>Information</h2>
            <div>
                <div>
                    <div>
                        <div>Status</div>
                        <div>Reserved</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/test/")

        # Should detect reserved status
        self.assertEqual(result.get("status"), "reserved")

    @patch("requests.get")
    def test_scrape_animal_details_handles_missing_information(self, mock_get):
        """Test that missing information is handled gracefully."""
        mock_html = """
        <html>
        <body>
            <h2>About</h2>
            <div>
                <p>Basic description only.</p>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/test/")

        # Should handle missing fields gracefully
        self.assertIn("description", result)
        self.assertEqual(result["description"], "Basic description only.")
        # Missing fields should not be present or be None
        self.assertIsNone(result.get("age_text"))
        self.assertIsNone(result.get("sex"))

    @patch("requests.get")
    def test_scrape_animal_details_handles_network_error(self, mock_get):
        """Test that network errors are handled gracefully."""
        mock_get.side_effect = Exception("Network error")

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/test/")

        # Should return empty dict on error
        self.assertEqual(result, {})

    @patch("requests.get")
    def test_scrape_animal_details_handles_completely_missing_sections(self, mock_get):
        """Test handling when both About and Information sections are missing."""
        mock_html = """
        <html>
        <body>
            <h1>Dog Page</h1>
            <div>
                <p>Some random content that is not About or Information.</p>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/test/")

        # Should return result with zero NULLs compliance defaults
        # Some fields get sensible defaults, others remain None when truly missing
        self.assertEqual(result.get("description"), "")  # Empty string, not None
        self.assertEqual(result.get("breed"), "Mixed Breed")  # Default breed
        self.assertEqual(result.get("size"), "Medium")  # Default size
        self.assertIsNone(result.get("age_text"))  # Can be None when missing
        self.assertIsNone(result.get("sex"))  # Can be None when missing

    def test_integrate_with_collect_data_method(self):
        """Test that detail scraping integrates correctly with collect_data."""
        # Mock the listing data
        mock_animal_data = {
            "name": "Test Dog",
            "external_id": "test-dog",
            "adoption_url": "https://santerpawsbulgarianrescue.com/adoption/test-dog/",
            "animal_type": "dog",
            "status": "available",
        }

        with patch.object(self.scraper, "get_animal_list") as mock_get_list, patch.object(self.scraper, "_scrape_animal_details") as mock_scrape_details:

            mock_get_list.return_value = [mock_animal_data]
            mock_scrape_details.return_value = {"description": "Detailed description from page", "age_text": "01/01/2023", "sex": "Male", "primary_image_url": "https://example.com/image.jpg"}

            result = self.scraper.collect_data()

            # Should have called detail scraping and merged data
            mock_scrape_details.assert_called_once_with("https://santerpawsbulgarianrescue.com/adoption/test-dog/")

            self.assertEqual(len(result), 1)
            dog_data = result[0]

            # Should contain both basic and detailed data
            self.assertEqual(dog_data["name"], "Test Dog")
            self.assertEqual(dog_data["description"], "Detailed description from page")
            self.assertEqual(dog_data["age_text"], "01/01/2023")
            self.assertEqual(dog_data["sex"], "Male")
            self.assertEqual(dog_data["primary_image_url"], "https://example.com/image.jpg")
