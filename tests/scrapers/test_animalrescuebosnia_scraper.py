from unittest.mock import Mock, patch

import pytest
import requests

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import (
    AnimalRescueBosniaScraper,
)
from tests.scrapers.test_scraper_base import ScraperTestBase


@pytest.mark.unit
class TestAnimalRescueBosniaScraper(ScraperTestBase):
    scraper_class = AnimalRescueBosniaScraper
    config_id = "animalrescuebosnia"
    expected_org_name = "Animal Rescue Bosnia"
    expected_base_url = "https://www.animal-rescue-bosnia.org"

    @patch("requests.get")
    def test_bosnia_vs_germany_filtering(self, mock_get, scraper):
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

        assert len(animals) == 2
        dog_names = [animal["name"] for animal in animals]
        assert "Ksenon" in dog_names
        assert "Luke" in dog_names
        assert "Findus" not in dog_names

    @patch("requests.get")
    def test_germany_dogs_detection_and_skip(self, mock_get, scraper):
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

        assert result is None

    @patch("requests.get")
    def test_detail_page_data_extraction(self, mock_get, scraper):
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

        assert result["name"] == "Ksenon"
        assert result["external_id"] == "arb-ksenon"
        assert result["sex"] == "Male"
        assert result["properties"]["breed"] == "Mix"
        assert result["properties"]["gender"] == "Male"
        assert "construction site" in result["properties"]["description"]

    @patch("requests.get")
    def test_external_id_generation(self, mock_get, scraper):
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
        assert scraper._extract_size_from_weight("10 kg") == "Small"
        assert scraper._extract_size_from_weight("25 kg") == "Medium"
        assert scraper._extract_size_from_weight("40 kg") == "Large"
        assert scraper._extract_size_from_weight("invalid") is None

    @patch("requests.get")
    def test_detects_non_dog_organization_page(self, mock_get, scraper):
        org_page_html = """
        <html>
        <head><title>Animal Rescue Bosnia - Organization</title></head>
        <body>
            <h1>Animal Rescue Bosnia \u2013 The rescue organisation for stray dogs on the streets of Gora\u017ede in Bosnia</h1>
            <p>We are a rescue organization...</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = org_page_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = scraper.scrape_animal_details("https://test.com/org-page/")

        assert result is None

    @patch("requests.get")
    def test_detects_non_dog_based_on_name_length(self, mock_get, scraper):
        long_name_html = """
        <html>
        <body>
            <h1>This is a very long organization description that is definitely not a dog name and should be filtered out</h1>
            <h2>Short description</h2>
            <p>Breed: Mix</p>
        </body>
        </html>
        """

        mock_response = Mock()
        mock_response.content = long_name_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = scraper.scrape_animal_details("https://test.com/long-name/")

        assert result is None

    def test_sex_standardization_for_frontend_filters(self, scraper):
        assert scraper._standardize_sex("Male") == "Male"
        assert scraper._standardize_sex("M") == "Male"
        assert scraper._standardize_sex("Female") == "Female"
        assert scraper._standardize_sex("F") == "Female"
        assert scraper._standardize_sex("male") == "Male"
        assert scraper._standardize_sex(None) is None
        assert scraper._standardize_sex("") is None

    @patch("requests.get")
    def test_size_standardization_mapping_from_weight(self, mock_get, scraper):
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

        mock_response = Mock()
        mock_response.content = dog_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = scraper.scrape_animal_details("https://test.com/testdog/")

        assert result["size"] == "Medium"
        assert result["standardized_size"] == "Medium"

    def test_size_standardization_all_categories(self, scraper):
        test_cases = [
            ("3 kg", "Tiny", "Tiny"),
            ("10 kg", "Small", "Small"),
            ("25 kg", "Medium", "Medium"),
            ("40 kg", "Large", "Large"),
            ("50 kg", "XLarge", "Large"),
        ]

        for weight, expected_size, expected_standardized in test_cases:
            calculated_size = scraper._extract_size_from_weight(weight)
            assert calculated_size == expected_size

            result = scraper.process_animal({"size": calculated_size, "breed": "Mix", "age": "2 years"})
            assert result["standardized_size"] == expected_standardized

    def test_empty_size_standardization(self, scraper):
        result = scraper.process_animal({"size": None, "breed": "Mix", "age": "2 years"})
        assert "standardized_size" in result
        assert result["standardized_size"] in ["Medium", "Large"]

        result = scraper.process_animal({"size": "", "breed": "Mix", "age": "2 years"})
        assert "standardized_size" in result
        assert result["standardized_size"] in ["Medium", "Large"]

        result = scraper.process_animal({"size": "Unknown", "breed": "Mix", "age": "2 years"})
        assert "standardized_size" in result
        assert result["standardized_size"] in ["Medium", "Large"]

    @patch("requests.get")
    def test_complete_data_structure_with_standardized_size(self, mock_get, scraper):
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

        mock_response = Mock()
        mock_response.content = dog_html.encode("utf-8")
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        result = scraper.scrape_animal_details("https://test.com/integration/")

        required_fields = [
            "name",
            "external_id",
            "adoption_url",
            "primary_image_url",
            "breed",
            "age_text",
            "sex",
            "size",
            "standardized_size",
            "properties",
        ]

        for field in required_fields:
            assert field in result, f"Missing field: {field}"

        assert result["standardized_size"] is not None
        assert result["standardized_size"] == "Large"

    @patch("requests.get")
    def test_detail_page_404_logs_warning_not_error(self, mock_get, scraper, caplog):
        """404 on a dog detail page (adopted dog) should log warning, not error."""
        mock_response = Mock()
        mock_response.status_code = 404
        mock_response.raise_for_status = Mock(side_effect=requests.exceptions.HTTPError(response=mock_response))
        mock_get.return_value = mock_response

        import logging

        with caplog.at_level(logging.WARNING):
            result = scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/ryan/")

        assert result is None
        warning_msgs = [r for r in caplog.records if r.levelno == logging.WARNING]
        error_msgs = [r for r in caplog.records if r.levelno == logging.ERROR]
        assert any("likely adopted" in r.message for r in warning_msgs)
        assert not error_msgs

    @patch("requests.get")
    def test_detail_page_500_logs_error(self, mock_get, scraper, caplog):
        """500 on a dog detail page should still log as error."""
        mock_response = Mock()
        mock_response.status_code = 500
        mock_response.raise_for_status = Mock(side_effect=requests.exceptions.HTTPError(response=mock_response))
        mock_get.return_value = mock_response

        import logging

        with caplog.at_level(logging.ERROR):
            result = scraper.scrape_animal_details("https://www.animal-rescue-bosnia.org/broken/")

        assert result is None
        error_msgs = [r for r in caplog.records if r.levelno == logging.ERROR]
        assert any("HTTP error" in r.message for r in error_msgs)
