"""Comprehensive standardization tests for Santer Paws Bulgarian Rescue scraper.

Tests validate the standardization utilities integration following galgosdelsol patterns.
"""

import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import (
    SanterPawsBulgarianRescueScraper,
)


@pytest.mark.unit
@pytest.mark.fast
class TestSanterPawsBulgarianRescueStandardization(unittest.TestCase):
    """Test standardization utilities integration in Santer Paws Bulgarian Rescue scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

    @patch("requests.get")
    def test_age_standardization_with_standardize_age(self, mock_get):
        """Test that age standardization uses standardize_age() utility properly."""
        mock_html = """
        <html>
        <body>
            <h2>Information</h2>
            <div>
                <div>
                    <div>D.O.B</div>
                    <div>20/04/2023</div>
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

        # Mock standardize_age to verify it's called with correct parameters
        with patch("scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper.standardize_age") as mock_standardize:
            mock_standardize.return_value = {"age_min_months": 21, "age_max_months": 21, "age_category": "Young Adult"}

            result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/test/")

            # Verify standardize_age was called with the raw age text
            mock_standardize.assert_called_once_with("20/04/2023")

            # Verify structured age data is included in properties
            self.assertIn("properties", result)
            properties = result["properties"]
            self.assertEqual(properties["age_min_months"], 21)
            self.assertEqual(properties["age_max_months"], 21)
            self.assertEqual(properties["age_category"], "Young Adult")

    @patch("requests.get")
    def test_breed_standardization_with_normalize_breed_case(self, mock_get):
        """Test that breed standardization uses normalize_breed_case() utility properly."""
        mock_html = """
        <html>
        <body>
            <h2>Information</h2>
            <div>
                <div>
                    <div>Breed</div>
                    <div>GERMAN SHEPHERD</div>
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

        # Mock normalize_breed_case to verify it's called with correct parameters
        with patch("scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper.normalize_breed_case") as mock_normalize:
            mock_normalize.return_value = "German Shepherd"

            result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/test/")

            # Verify normalize_breed_case was called with the raw breed text
            mock_normalize.assert_called_once_with("GERMAN SHEPHERD")

            # Verify normalized breed is included in result
            self.assertEqual(result["breed"], "German Shepherd")
            self.assertIn("properties", result)
            self.assertEqual(result["properties"]["breed"], "German Shepherd")

    @patch("requests.get")
    def test_description_included_in_properties_dictionary(self, mock_get):
        """Test that description is included in properties dictionary for Session 4 compliance."""
        mock_html = """
        <html>
        <body>
            <h2>About</h2>
            <div>
                <p>This is a lovely dog looking for a home.</p>
                <p>She is friendly and loves walks.</p>
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

        # Verify description is extracted
        expected_description = "This is a lovely dog looking for a home. She is friendly and loves walks."
        self.assertEqual(result["description"], expected_description)

        # Verify description is ALSO included in properties dictionary (Session 4 compliance)
        self.assertIn("properties", result)
        self.assertEqual(result["properties"]["description"], expected_description)

    @patch("requests.get")
    def test_description_extraction_handles_div_tags(self, mock_get):
        """Test that description extraction handles DIV tags (like Mirrium's case)."""
        mock_html = """
        <html>
        <body>
            <h2>About</h2>
            <div>
                <div>This is a description in DIV tags instead of P tags.</div>
                <div>She needs a loving home with experienced owners.</div>
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

        # Verify description is extracted from DIV tags
        expected_description = "This is a description in DIV tags instead of P tags. She needs a loving home with experienced owners."
        self.assertEqual(result["description"], expected_description)

        # Verify description is included in properties dictionary
        self.assertIn("properties", result)
        self.assertEqual(result["properties"]["description"], expected_description)

    @patch("requests.get")
    def test_description_extraction_handles_mixed_p_and_div_tags(self, mock_get):
        """Test that description extraction handles mixed P and DIV tags."""
        mock_html = """
        <html>
        <body>
            <h2>About</h2>
            <div>
                <p>This paragraph is in P tags.</p>
                <div>This content is in DIV tags.</div>
                <p>Another paragraph in P tags.</p>
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

        # Verify description combines both P and DIV content
        expected_description = "This paragraph is in P tags. This content is in DIV tags. Another paragraph in P tags."
        self.assertEqual(result["description"], expected_description)

    @patch("requests.get")
    def test_image_urls_array_for_r2_integration(self, mock_get):
        """Test that image_urls array is provided for R2 integration through BaseScraper template method."""
        mock_html = """
        <html>
        <body>
            <figure>
                <img src="https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/test-dog.jpg" alt="Test Dog">
            </figure>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/test/")

        # Verify image_urls array is provided for R2 integration
        self.assertIn("image_urls", result)
        self.assertEqual(len(result["image_urls"]), 1)
        self.assertEqual(result["image_urls"][0], "https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/test-dog.jpg")

        # Verify primary_image_url is also set
        self.assertEqual(result["primary_image_url"], "https://santerpawsbulgarianrescue.com/wp-content/uploads/2024/test-dog.jpg")

    @patch("requests.get")
    def test_image_urls_empty_array_when_no_image(self, mock_get):
        """Test that image_urls is empty array when no hero image found."""
        mock_html = """
        <html>
        <body>
            <h2>About</h2>
            <div>
                <p>Dog with no image.</p>
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

        # Verify image_urls is empty array (not None)
        self.assertIn("image_urls", result)
        self.assertEqual(result["image_urls"], [])
        self.assertIsNone(result["primary_image_url"])

    @patch("requests.get")
    def test_zero_nulls_compliance_with_sensible_defaults(self, mock_get):
        """Test zero NULLs compliance with sensible defaults for missing fields."""
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

        # Verify zero NULLs compliance - critical fields have sensible defaults
        self.assertEqual(result["breed"], "Mixed Breed")  # Default breed
        self.assertEqual(result["size"], "Medium")  # Default size
        self.assertEqual(result["description"], "Basic description only.")  # Empty string when found

        # Some fields can be None when missing for test compatibility
        self.assertIsNone(result.get("age_text"))
        self.assertIsNone(result.get("sex"))

    @patch("requests.get")
    def test_dog_name_proper_capitalization(self, mock_get):
        """Test that dog names are properly capitalized following Session 4 requirements."""
        mock_html = """
        <html>
        <body>
            <h2>About</h2>
            <div>
                <p>Test dog</p>
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.text = mock_html
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # Test URL with hyphenated name
        result = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/summer-breeze/")

        # Verify dog name is properly capitalized from URL
        self.assertEqual(result["name"], "Summer Breeze")

        # Test single word name
        result2 = self.scraper._scrape_animal_details("https://santerpawsbulgarianrescue.com/adoption/pepper/")
        self.assertEqual(result2["name"], "Pepper")

    def test_clean_dog_name_handles_various_formats(self):
        """Test that _clean_dog_name properly handles various name formats."""
        # Test basic capitalization
        self.assertEqual(self.scraper._clean_dog_name("pepper"), "Pepper")
        self.assertEqual(self.scraper._clean_dog_name("SUMMER"), "Summer")
        self.assertEqual(self.scraper._clean_dog_name("mixed case"), "Mixed Case")

        # Test Roman numerals handling
        self.assertEqual(self.scraper._clean_dog_name("king ii"), "King II")
        self.assertEqual(self.scraper._clean_dog_name("duke iii"), "Duke III")
        self.assertEqual(self.scraper._clean_dog_name("prince iv"), "Prince IV")

    def test_extract_dog_name_from_url_formats(self):
        """Test URL name extraction handles various URL formats."""
        # Test hyphenated names
        self.assertEqual(self.scraper._extract_dog_name_from_url("https://santerpawsbulgarianrescue.com/adoption/summer-breeze/"), "Summer Breeze")

        # Test single word names
        self.assertEqual(self.scraper._extract_dog_name_from_url("https://santerpawsbulgarianrescue.com/adoption/pepper/"), "Pepper")

        # Test multiple hyphens
        self.assertEqual(self.scraper._extract_dog_name_from_url("https://santerpawsbulgarianrescue.com/adoption/mary-jane-watson/"), "Mary Jane Watson")

    @patch("requests.get")
    def test_information_section_handles_missing_field_values(self, mock_get):
        """Test that Information section parsing handles missing field values (like Mirrium's Breed field)."""
        mock_html = """
        <html>
        <body>
            <h2>Information</h2>
            <div>
                <div>
                    <div>D.O.B</div>
                    <div>01/01/2020</div>
                    <div>Size</div>
                    <div>Small</div>
                    <div>Sex</div>
                    <div>Female</div>
                    <div>Breed</div>
                    <div>Status</div>
                    <div>available</div>
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

        # Verify fields with values are extracted correctly
        self.assertEqual(result["size"], "Small")
        self.assertEqual(result["sex"], "Female")
        self.assertEqual(result["status"], "available")

        # Verify missing Breed field gets default value
        self.assertEqual(result["breed"], "Mixed Breed")  # Default when no breed value provided

        # Verify properties include the extracted fields
        self.assertIn("properties", result)
        properties = result["properties"]
        self.assertEqual(properties["size"], "Small")
        self.assertEqual(properties["sex"], "Female")
        self.assertEqual(properties["breed"], "Mixed Breed")
        self.assertEqual(properties["status"], "available")
