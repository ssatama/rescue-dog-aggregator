"""Tests for AnimalRescueBosnia bug fixes: non-dog detection and size standardization."""

import unittest
from unittest.mock import Mock, patch

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import AnimalRescueBosniaScraper


class TestAnimalRescueBosniaFixes(unittest.TestCase):
    """Test cases for bug fixes."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = AnimalRescueBosniaScraper(config_id="animalrescuebosnia")

    def test_detects_non_dog_organization_page(self):
        """Test that organization description pages are detected and filtered out."""
        # Test organization page with suspicious title
        org_page_html = """
        <html>
        <head><title>Animal Rescue Bosnia - Organization</title></head>
        <body>
            <h1>Animal Rescue Bosnia – The rescue organisation for stray dogs on the streets of Goražde in Bosnia</h1>
            <p>We are a rescue organization...</p>
        </body>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.content = org_page_html.encode("utf-8")
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            result = self.scraper.scrape_animal_details("https://test.com/org-page/")

            # Should return None for organization pages
            self.assertIsNone(result)

    def test_detects_non_dog_based_on_name_length(self):
        """Test that very long names (>50 chars) are filtered out as non-dogs."""
        long_name_html = """
        <html>
        <body>
            <h1>This is a very long organization description that is definitely not a dog name and should be filtered out</h1>
            <h2>Short description</h2>
            <p>Breed: Mix</p>
        </body>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.content = long_name_html.encode("utf-8")
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            result = self.scraper.scrape_animal_details("https://test.com/long-name/")

            # Should return None for suspiciously long names
            self.assertIsNone(result)

    def test_allows_normal_dog_names(self):
        """Test that normal dog names are processed correctly."""
        normal_dog_html = """
        <html>
        <body>
            <h1>Ksenon</h1>
            <img src="/dog-image.jpg">
            <h2>Short description</h2>
            <p>Breed: Mix<br>Gender: Male</p>
            <h2>About Ksenon</h2>
            <p>Ksenon is a lovely dog.</p>
        </body>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.content = normal_dog_html.encode("utf-8")
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            result = self.scraper.scrape_animal_details("https://test.com/ksenon/")

            # Should process normal dog names and standardize sex correctly
            self.assertIsNotNone(result)
            self.assertEqual(result["name"], "Ksenon")
            self.assertEqual(result["sex"], "Male")  # Should be "Male", not "M"

    def test_sex_standardization_for_frontend_filters(self):
        """Test that sex values are standardized correctly for frontend filters."""
        # Test Male
        male_result = self.scraper._standardize_sex("Male")
        self.assertEqual(male_result, "Male")

        male_m_result = self.scraper._standardize_sex("M")
        self.assertEqual(male_m_result, "Male")

        # Test Female
        female_result = self.scraper._standardize_sex("Female")
        self.assertEqual(female_result, "Female")

        female_f_result = self.scraper._standardize_sex("F")
        self.assertEqual(female_f_result, "Female")

        # Test case insensitive
        male_lower_result = self.scraper._standardize_sex("male")
        self.assertEqual(male_lower_result, "Male")

        # Test None/empty
        none_result = self.scraper._standardize_sex(None)
        self.assertIsNone(none_result)

        empty_result = self.scraper._standardize_sex("")
        self.assertIsNone(empty_result)

    def test_size_standardization_mapping(self):
        """Test that size values are properly mapped to standardized_size."""
        dog_html = """
        <html>
        <body>
            <h1>TestDog</h1>
            <img src="/dog.jpg">
            <h2>Short description</h2>
            <p>
                Breed: Mix<br>
                Gender: Male<br>
                Weight: 25 kg
            </p>
            <h2>About TestDog</h2>
            <p>Test description.</p>
        </body>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.content = dog_html.encode("utf-8")
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            result = self.scraper.scrape_animal_details("https://test.com/testdog/")

            # Check that size is calculated and standardized_size is set
            self.assertEqual(result["size"], "Medium")  # From weight calculation
            self.assertEqual(result["standardized_size"], "Medium")  # Should be mapped

    def test_size_standardization_all_categories(self):
        """Test standardization mapping for all size categories."""
        test_cases = [("3 kg", "Tiny", "Tiny"), ("10 kg", "Small", "Small"), ("25 kg", "Medium", "Medium"), ("40 kg", "Large", "Large"), ("50 kg", "XLarge", "XLarge")]

        for weight, expected_size, expected_standardized in test_cases:
            with self.subTest(weight=weight):
                # Test the helper method directly
                calculated_size = self.scraper._extract_size_from_weight(weight)
                self.assertEqual(calculated_size, expected_size)

                # Test standardization mapping
                standardized = self.scraper._standardize_size_for_database(calculated_size)
                self.assertEqual(standardized, expected_standardized)

    def test_empty_size_standardization(self):
        """Test that empty sizes are handled correctly."""
        # Test None input
        result = self.scraper._standardize_size_for_database(None)
        self.assertIsNone(result)

        # Test empty string input
        result = self.scraper._standardize_size_for_database("")
        self.assertIsNone(result)

        # Test unknown size
        result = self.scraper._standardize_size_for_database("Unknown")
        self.assertIsNone(result)

    def test_integration_data_structure_with_standardized_size(self):
        """Test that complete data structure includes standardized_size."""
        dog_html = """
        <html>
        <body>
            <h1>IntegrationTestDog</h1>
            <img src="/integration.jpg">
            <h2>Short description</h2>
            <p>
                Breed: Labrador Mix<br>
                Gender: Female<br>
                Weight: 30 kg
            </p>
            <h2>About IntegrationTestDog</h2>
            <p>Integration test description.</p>
        </body>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.content = dog_html.encode("utf-8")
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            result = self.scraper.scrape_animal_details("https://test.com/integration/")

            # Check complete data structure for BaseScraper
            required_fields = ["name", "external_id", "adoption_url", "primary_image_url", "breed", "age_text", "sex", "size", "standardized_size", "properties"]

            for field in required_fields:
                self.assertIn(field, result, f"Missing field: {field}")

            # Verify standardized_size is populated
            self.assertIsNotNone(result["standardized_size"])
            self.assertEqual(result["standardized_size"], "Large")  # 30kg = Large


if __name__ == "__main__":
    unittest.main()
