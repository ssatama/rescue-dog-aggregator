"""Tests for Animal Rescue Bosnia scraper listing page functionality."""

import unittest
from unittest.mock import Mock, patch

import pytest

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import AnimalRescueBosniaScraper


@pytest.mark.api
@pytest.mark.computation
@pytest.mark.integration
@pytest.mark.network
@pytest.mark.slow
class TestAnimalRescueBosniaScraper(unittest.TestCase):
    """Test cases for Animal Rescue Bosnia scraper."""

    def setUp(self):
        """Set up test fixtures."""
        self.scraper = AnimalRescueBosniaScraper(config_id="animalrescuebosnia")

    def test_scraper_initialization(self):
        """Test that scraper initializes correctly with config."""
        self.assertEqual(self.scraper.base_url, "https://www.animal-rescue-bosnia.org")
        self.assertEqual(self.scraper.listing_url, "https://www.animal-rescue-bosnia.org/our-dogs/")
        self.assertEqual(self.scraper.organization_name, "Animal Rescue Bosnia")

    @patch("requests.get")
    def test_get_animal_list_with_germany_and_bosnia_sections(self, mock_get):
        """Test that scraper correctly filters out dogs in Germany."""
        # Mock HTML with both Germany and Bosnia sections
        mock_html = """
        <html>
        <body>
            <h1>Our Dogs</h1>

            <h2>We are already in Germany and waiting for a Happy End:</h2>

            <h2>Findus</h2>
            <img src="/wp-content/uploads/2025/01/Findus-1.jpg">
            <p>Breed: Mix<br>Gender: Male<br>Date of birth: January 2020</p>
            <a href="/findus/">More info</a>

            <h2>Reio</h2>
            <img src="/wp-content/uploads/2025/01/Reio-1.jpg">
            <p>Breed: Mix<br>Gender: Male<br>Date of birth: March 2019</p>
            <a href="/reio/">More info</a>

            <h3>Cindi</h3>
            <img src="/wp-content/uploads/2025/01/Cindi-1.jpg">
            <p>Breed: Mix<br>Gender: Female<br>Date of birth: June 2021</p>
            <a href="/cindi/">More info</a>

            <h2>Our Dogs waiting for you in Bosnia</h2>

            <h2>Ksenon</h2>
            <img src="/wp-content/uploads/2025/06/Ksenon-2.jpg">
            <p>Breed: Mix<br>Gender: Male<br>Date of birth: January 2022</p>
            <a href="/ksenon/">More info</a>

            <h2>Luke</h2>
            <img src="/wp-content/uploads/2025/06/Luke-1.jpg">
            <p>Breed: Mix<br>Gender: Male<br>Date of birth: April 2018</p>
            <a href="/luke/">More info</a>

            <h2>Anica</h2>
            <img src="/wp-content/uploads/2025/06/Anica-1.jpg">
            <p>Breed: Mix<br>Gender: Female<br>Date of birth: May 2023</p>
            <a href="/anica/">More info</a>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        # Get animal list
        animals = self.scraper.get_animal_list()

        # Verify only Bosnia dogs are returned
        self.assertEqual(len(animals), 3)

        # Verify dog names
        dog_names = [animal["name"] for animal in animals]
        self.assertIn("Ksenon", dog_names)
        self.assertIn("Luke", dog_names)
        self.assertIn("Anica", dog_names)

        # Verify Germany dogs are NOT included
        self.assertNotIn("Findus", dog_names)
        self.assertNotIn("Reio", dog_names)
        self.assertNotIn("Cindi", dog_names)

    @patch("requests.get")
    def test_get_animal_list_extracts_correct_urls(self, mock_get):
        """Test that correct URLs are extracted for Bosnia dogs."""
        mock_html = """
        <html>
        <body>
            <h2>Our Dogs waiting for you in Bosnia</h2>

            <h2>Ksenon</h2>
            <img src="/wp-content/uploads/2025/06/Ksenon-2.jpg">
            <p>Breed: Mix<br>Gender: Male</p>
            <a href="/ksenon/">More info</a>

            <h2>Luke</h2>
            <img src="/wp-content/uploads/2025/06/Luke-1.jpg">
            <p>Breed: Mix<br>Gender: Male</p>
            <a href="/luke/">More info</a>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Verify URLs
        self.assertEqual(len(animals), 2)
        self.assertEqual(animals[0]["url"], "https://www.animal-rescue-bosnia.org/ksenon/")
        self.assertEqual(animals[1]["url"], "https://www.animal-rescue-bosnia.org/luke/")

    @patch("requests.get")
    def test_get_animal_list_handles_no_bosnia_section(self, mock_get):
        """Test handling when there's no Bosnia section."""
        mock_html = """
        <html>
        <body>
            <h1>Our Dogs</h1>
            <h2>We are already in Germany and waiting for a Happy End:</h2>
            <h2>Findus</h2>
            <p>Breed: Mix</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Should return empty list when no Bosnia dogs found
        self.assertEqual(len(animals), 0)

    @patch("requests.get")
    def test_get_animal_list_handles_network_error(self, mock_get):
        """Test error handling for network issues."""
        mock_get.side_effect = Exception("Network error")

        animals = self.scraper.get_animal_list()

        # Should return empty list on error
        self.assertEqual(animals, [])

    @patch("requests.get")
    def test_get_animal_list_extracts_thumbnail_images(self, mock_get):
        """Test that thumbnail images are extracted for listing."""
        mock_html = """
        <html>
        <body>
            <h2>Our Dogs waiting for you in Bosnia</h2>

            <h2>Ksenon</h2>
            <img src="/wp-content/uploads/2025/06/Ksenon-2.jpg" alt="">
            <p>Breed: Mix</p>
            <a href="/ksenon/">More info</a>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Verify thumbnail is extracted
        self.assertEqual(len(animals), 1)
        self.assertEqual(animals[0]["thumbnail"], "https://www.animal-rescue-bosnia.org/wp-content/uploads/2025/06/Ksenon-2.jpg")

    @patch("requests.get")
    def test_get_animal_list_handles_mixed_heading_levels(self, mock_get):
        """Test handling of mixed h2/h3 heading levels."""
        mock_html = """
        <html>
        <body>
            <h2>Our Dogs waiting for you in Bosnia</h2>

            <h2>Ksenon</h2>
            <img src="/ksenon.jpg">
            <a href="/ksenon/">More info</a>

            <h3>Luke</h3>
            <img src="/luke.jpg">
            <a href="/luke/">More info</a>

            <h2>Anica</h2>
            <img src="/anica.jpg">
            <a href="/anica/">More info</a>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        animals = self.scraper.get_animal_list()

        # Should find all dogs regardless of heading level
        self.assertEqual(len(animals), 3)
        dog_names = [animal["name"] for animal in animals]
        self.assertEqual(dog_names, ["Ksenon", "Luke", "Anica"])

    @patch("requests.get")
    def test_scrape_animal_details_extracts_all_fields(self, mock_get):
        """Test that all required fields are extracted from detail page."""
        mock_html = """
        <html>
        <head><title>Ksenon - Animal Rescue Bosnia</title></head>
        <body>
            <h1>Ksenon</h1>

            <img src="/wp-content/uploads/2025/06/Ksenon-2.jpg" alt="">

            <h2>Short description</h2>
            <p>
                Breed: Mix<br>
                Gender: Male<br>
                Date of birth: January 2022<br>
                Height: 56 cm<br>
                Weight: 25 kg<br>
                In a shelter from: May 2025
            </p>

            <h2>About Ksenon</h2>
            <p>
                Ksenon came to us together with his sister when they were tiny puppies at a construction site of a thermal power plant.
                They were living together for a while and were inseparable. Both puppies came to our shelter and grew into beautiful
                dogs with each other. We found them a home, but unfortunately they could not stay. We then placed both in foster homes
                and believe that Ksenon will be luckier with a new owner.
            </p>

            <div class="gallery">
                <img src="/wp-content/uploads/2025/06/Ksenon-3.jpg">
                <img src="/wp-content/uploads/2025/06/Ksenon-4.jpg">
            </div>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        url = "https://www.animal-rescue-bosnia.org/ksenon/"
        result = self.scraper.scrape_animal_details(url)

        # Check all fields
        self.assertEqual(result["name"], "Ksenon")
        self.assertEqual(result["external_id"], "ksenon")
        self.assertEqual(result["adoption_url"], url)
        self.assertEqual(result["primary_image_url"], "https://www.animal-rescue-bosnia.org/wp-content/uploads/2025/06/Ksenon-2.jpg")

        # Check properties
        self.assertIn("properties", result)
        props = result["properties"]
        self.assertEqual(props["breed"], "Mix")
        self.assertEqual(props["gender"], "Male")
        self.assertEqual(props["date_of_birth"], "January 2022")
        self.assertEqual(props["height"], "56 cm")
        self.assertEqual(props["weight"], "25 kg")
        self.assertEqual(props["shelter_entry"], "May 2025")

        # Check description is in properties
        self.assertIn("properties", result)
        self.assertIn("description", result["properties"])
        self.assertIn("Ksenon came to us together with his sister", result["properties"]["description"])
        self.assertIn("thermal power plant", result["properties"]["description"])

    @patch("requests.get")
    def test_scrape_animal_details_germany_dog(self, mock_get):
        """Test that dogs in Germany are detected and skipped."""
        mock_html = """
        <html>
        <head><title>Findus - Animal Rescue Bosnia</title></head>
        <body>
            <h1>Findus</h1>
            <p>We are already in Germany!</p>

            <h2>Short description</h2>
            <p>
                Breed: Mix<br>
                Gender: Male<br>
                Location: Germany
            </p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        url = "https://www.animal-rescue-bosnia.org/findus/"
        result = self.scraper.scrape_animal_details(url)

        # Should return None for dogs in Germany
        self.assertIsNone(result)

    @patch("requests.get")
    def test_scrape_animal_details_only_hero_image(self, mock_get):
        """Test that only the hero image is extracted, not gallery images."""
        mock_html = """
        <html>
        <body>
            <h1>Ksenon</h1>

            <!-- Hero image -->
            <img src="/wp-content/uploads/2025/06/Ksenon-2.jpg" alt="">

            <h2>Short description</h2>
            <p>Breed: Mix</p>

            <!-- Gallery images - should be ignored -->
            <div class="gallery">
                <img src="/wp-content/uploads/2025/06/Ksenon-3.jpg">
                <img src="/wp-content/uploads/2025/06/Ksenon-4.jpg">
                <img src="/wp-content/uploads/2025/06/Ksenon-5.jpg">
            </div>

            <!-- Video - should be ignored -->
            <video src="/videos/ksenon.mp4"></video>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/ksenon/")

        # Should only have the hero image
        self.assertEqual(result["primary_image_url"], "https://www.animal-rescue-bosnia.org/wp-content/uploads/2025/06/Ksenon-2.jpg")

    @patch("requests.get")
    def test_scrape_animal_details_missing_fields(self, mock_get):
        """Test handling of missing fields."""
        mock_html = """
        <html>
        <body>
            <h1>Mystery Dog</h1>

            <h2>Short description</h2>
            <p>
                Breed: Unknown<br>
                Gender: Male
            </p>

            <h2>About Mystery Dog</h2>
            <p>We don't know much about this dog.</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/mystery/")

        # Should handle missing fields gracefully
        self.assertEqual(result["name"], "Mystery Dog")
        self.assertIsNone(result["primary_image_url"])
        self.assertEqual(result["properties"]["breed"], "Unknown")
        self.assertEqual(result["properties"]["gender"], "Male")
        self.assertIsNone(result["properties"].get("height"))
        self.assertIsNone(result["properties"].get("weight"))

    @patch("requests.get")
    def test_scrape_animal_details_special_characters(self, mock_get):
        """Test handling of special characters in text."""
        mock_html = """
        <html>
        <body>
            <h1>Čćžšđ</h1>

            <h2>Short description</h2>
            <p>
                Breed: Mješanac<br>
                Gender: Ženka<br>
                Height: 45 cm<br>
                Weight: 20 kg
            </p>

            <h2>About Čćžšđ</h2>
            <p>Special characters: &amp; &lt; &gt; "quotes" 'apostrophes'</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/special/")

        # Should handle special characters correctly
        self.assertEqual(result["name"], "Čćžšđ")
        self.assertEqual(result["properties"]["breed"], "Mješanac")
        self.assertEqual(result["properties"]["gender"], "Ženka")
        self.assertIn("&", result["properties"]["description"])
        self.assertIn("<", result["properties"]["description"])
        self.assertIn(">", result["properties"]["description"])

    @patch("requests.get")
    def test_scrape_animal_details_network_error(self, mock_get):
        """Test handling of network errors."""
        mock_get.side_effect = Exception("Network error")

        result = self.scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/error/")

        # Should return None on error
        self.assertIsNone(result)

    @patch("requests.get")
    def test_scrape_animal_details_properties_structure(self, mock_get):
        """Test that properties JSON has correct structure."""
        mock_html = """
        <html>
        <body>
            <h1>Test Dog</h1>
            <img src="/test.jpg">

            <h2>Short description</h2>
            <p>
                Breed: Border Collie Mix<br>
                Gender: Female<br>
                Date of birth: March 2020<br>
                Height: 52 cm<br>
                Weight: 22 kg<br>
                In a shelter from: January 2023
            </p>

            <h2>About Test Dog</h2>
            <p>Test description text.</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = mock_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = self.scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/test/")

        # Verify properties structure
        expected_properties = {"breed": "Border Collie Mix", "gender": "Female", "date_of_birth": "March 2020", "height": "52 cm", "weight": "22 kg", "shelter_entry": "January 2023"}

        for key, value in expected_properties.items():
            self.assertEqual(result["properties"][key], value)

    def test_calculate_age_text_from_birth_date(self):
        """Test age calculation from date of birth."""
        # Test with January 2022 (should be about 3 years now)
        age_text = self.scraper._calculate_age_text("January 2022")
        self.assertIsNotNone(age_text)
        self.assertIn("year", age_text)

        # Test with recent date (should be months)
        age_text = self.scraper._calculate_age_text("January 2024")
        self.assertIsNotNone(age_text)

        # Test with invalid date
        age_text = self.scraper._calculate_age_text("Invalid Date")
        self.assertIsNone(age_text)

        # Test with None
        age_text = self.scraper._calculate_age_text(None)
        self.assertIsNone(age_text)

    def test_standardize_sex_field(self):
        """Test sex field standardization."""
        # Test male variations - now returns "Male" for frontend compatibility
        self.assertEqual(self.scraper._standardize_sex("Male"), "Male")
        self.assertEqual(self.scraper._standardize_sex("male"), "Male")
        self.assertEqual(self.scraper._standardize_sex("M"), "Male")

        # Test female variations - now returns "Female" for frontend compatibility
        self.assertEqual(self.scraper._standardize_sex("Female"), "Female")
        self.assertEqual(self.scraper._standardize_sex("female"), "Female")
        self.assertEqual(self.scraper._standardize_sex("F"), "Female")

        # Test invalid values
        self.assertIsNone(self.scraper._standardize_sex("Unknown"))
        self.assertIsNone(self.scraper._standardize_sex(None))
        self.assertIsNone(self.scraper._standardize_sex(""))

    def test_extract_size_from_weight(self):
        """Test size extraction from weight."""
        # Test weight categories
        self.assertEqual(self.scraper._extract_size_from_weight("3 kg"), "Tiny")
        self.assertEqual(self.scraper._extract_size_from_weight("10 kg"), "Small")
        self.assertEqual(self.scraper._extract_size_from_weight("25 kg"), "Medium")
        self.assertEqual(self.scraper._extract_size_from_weight("40 kg"), "Large")
        self.assertEqual(self.scraper._extract_size_from_weight("50 kg"), "XLarge")

        # Test with decimal weights
        self.assertEqual(self.scraper._extract_size_from_weight("4.5 kg"), "Tiny")
        self.assertEqual(self.scraper._extract_size_from_weight("22.5 kg"), "Medium")

        # Test invalid weights
        self.assertIsNone(self.scraper._extract_size_from_weight("Unknown"))
        self.assertIsNone(self.scraper._extract_size_from_weight(None))
        self.assertIsNone(self.scraper._extract_size_from_weight(""))

    def test_data_structure_for_base_scraper(self):
        """Test that data structure is correct for BaseScraper integration."""
        # Mock HTML for complete data extraction
        mock_html = """
        <html>
        <body>
            <h1>Test Dog</h1>
            <img src="/test-image.jpg">

            <h2>Short description</h2>
            <p>
                Breed: Labrador Mix<br>
                Gender: Female<br>
                Date of birth: January 2022<br>
                Height: 50 cm<br>
                Weight: 25 kg<br>
                In a shelter from: March 2023
            </p>

            <h2>About Test Dog</h2>
            <p>Test dog is a wonderful companion.</p>
        </body>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.content = mock_html.encode("utf-8")
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            result = self.scraper.scrape_animal_details("https://test.com/test-dog/")

            # Check required fields for BaseScraper (organization_id added in collect_data)
            required_fields = ["name", "external_id", "adoption_url", "primary_image_url", "original_image_url", "animal_type", "status"]

            for field in required_fields:
                self.assertIn(field, result, f"Missing required field: {field}")

            # Check standardized fields
            self.assertEqual(result["breed"], "Labrador Mix")
            self.assertEqual(result["sex"], "Female")  # Updated to new format
            self.assertEqual(result["size"], "Medium")
            self.assertIn("year", result["age_text"])

            # Check properties include description
            self.assertIn("properties", result)
            self.assertIn("description", result["properties"])
            self.assertEqual(result["properties"]["description"], "Test dog is a wonderful companion.")

    @patch("scrapers.animalrescuebosnia.animalrescuebosnia_scraper.AnimalRescueBosniaScraper.get_animal_list")
    @patch("scrapers.animalrescuebosnia.animalrescuebosnia_scraper.AnimalRescueBosniaScraper.scrape_animal_details")
    def test_collect_data_integration(self, mock_scrape_details, mock_get_list):
        """Test collect_data method integration."""
        # Mock animal list
        mock_get_list.return_value = [{"name": "Dog1", "url": "https://test.com/dog1/"}, {"name": "Dog2", "url": "https://test.com/dog2/"}]

        # Mock detailed scraping
        mock_scrape_details.side_effect = [
            {
                "name": "Dog1",
                "external_id": "dog1",
                "adoption_url": "https://test.com/dog1/",
                "primary_image_url": "https://test.com/dog1.jpg",
                "original_image_url": "https://test.com/dog1.jpg",
                "animal_type": "dog",
                "status": "available",
                "breed": "Mix",
                "age_text": "2 years",
                "sex": "M",
                "size": "Medium",
                "properties": {"description": "Test dog 1"},
            },
            {
                "name": "Dog2",
                "external_id": "dog2",
                "adoption_url": "https://test.com/dog2/",
                "primary_image_url": "https://test.com/dog2.jpg",
                "original_image_url": "https://test.com/dog2.jpg",
                "animal_type": "dog",
                "status": "available",
                "breed": "Labrador",
                "age_text": "1 year",
                "sex": "F",
                "size": "Large",
                "properties": {"description": "Test dog 2"},
            },
        ]

        results = self.scraper.collect_data()

        # Check results
        self.assertEqual(len(results), 2)

        # Check organization_id is added
        for result in results:
            self.assertIn("organization_id", result)
            self.assertEqual(result["organization_id"], self.scraper.organization_id)


if __name__ == "__main__":
    unittest.main()
