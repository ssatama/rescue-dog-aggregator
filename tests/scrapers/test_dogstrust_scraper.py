"""Tests for DogsTrustScraper class.

Focus on behavior-based testing for the Dogs Trust scraper implementation.
Tests cover the hybrid approach (Selenium for listings, HTTP for details)
and reserved dog filtering requirements.
"""

from unittest.mock import Mock, patch

import pytest
import requests

from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper


@pytest.mark.slow
@pytest.mark.browser
class TestDogsTrustScraper:
    """Test cases for DogsTrustScraper basic functionality."""

    def test_scraper_initialization_with_config(self):
        """Test scraper can be initialized with config_id."""
        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")
            assert scraper is not None
            assert hasattr(scraper, "collect_data")
            assert hasattr(scraper, "get_animal_list")

    def test_scraper_inherits_from_base_scraper(self):
        """Test that DogsTrustScraper properly inherits from BaseScraper."""
        from scrapers.base_scraper import BaseScraper

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")
            assert isinstance(scraper, BaseScraper)

    def test_service_injection_constructor_accepts_optional_services(self):
        """Test constructor accepts optional service dependencies."""
        from services.null_objects import NullMetricsCollector

        mock_metrics = NullMetricsCollector()

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust", metrics_collector=mock_metrics)

            assert scraper is not None
            assert scraper.metrics_collector is not None

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_selenium_driver_cleanup_on_exception(self, mock_webdriver):
        """Test WebDriver is properly cleaned up even when exceptions occur."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.get.side_effect = Exception("Network error")

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            # Should handle exception gracefully and clean up driver
            result = scraper.get_animal_list()

            assert isinstance(result, list)  # Should return empty list on error
            mock_driver.quit.assert_called_once()

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_collect_data_follows_template_method_pattern(self, mock_webdriver):
        """Test collect_data follows template method pattern by calling get_animal_list."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.page_source = "<html><body></body></html>"

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            # Mock get_animal_list to verify it's called
            with patch.object(scraper, "get_animal_list", return_value=[]) as mock_get_animals:
                result = scraper.collect_data()

                mock_get_animals.assert_called_once()
                assert isinstance(result, list)

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_get_animal_list_applies_reserved_dog_filter(self, mock_webdriver):
        """Test that get_animal_list applies filter to hide reserved dogs through UI."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.page_source = """
        <html>
            <body>
                <div>1 of 5</div>
            </body>
        </html>
        """

        # Mock find_element to simulate filter elements not found
        mock_driver.find_element.side_effect = Exception("Element not found")

        mock_config_loader = Mock()
        mock_config = Mock()
        mock_config.metadata.website_url = "https://www.dogstrust.org.uk"
        mock_config.get_display_name.return_value = "Dogs Trust"
        mock_config.name = "Dogs Trust"
        mock_config.id = "dogstrust"
        # Mock the scraper config method that provides numeric values
        mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 1.0, "max_retries": 3, "timeout": 30, "batch_size": 6, "skip_existing_animals": False}
        mock_config_loader.return_value.load_config.return_value = mock_config

        with patch("scrapers.base_scraper.ConfigLoader", mock_config_loader), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")
            result = scraper.get_animal_list()

            # Verify the initial page load call
            expected_first_url = "https://www.dogstrust.org.uk/rehoming/dogs"
            mock_driver.get.assert_any_call(expected_first_url)
            # Verify attempts to find filter elements were made
            assert mock_driver.find_element.called
            assert isinstance(result, list)


class TestDogsTrustBehavioralTraits:
    """Test behavioral trait extraction for Dogs Trust scraper."""

    def test_extract_behavioral_traits_with_children(self):
        """Test extraction of 'good with children' information."""
        from bs4 import BeautifulSoup

        # Sample HTML from Dogs Trust detail page
        html = """
        <div class="dog-can-live-with">
            <h3>Can live with</h3>
            <ul>
                <li>Could live with children aged 14+</li>
                <li>I may be able to live with other dogs</li>
            </ul>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            # This method should exist and extract behavioral traits
            traits = scraper._extract_behavioral_traits(soup)

            assert traits["good_with_children"] == "Yes (14+)"
            assert traits["good_with_dogs"] == "Maybe"
            assert traits.get("good_with_cats") is None or traits["good_with_cats"] == "Unknown"

    def test_extract_behavioral_traits_no_children(self):
        """Test extraction when dog cannot live with children."""
        from bs4 import BeautifulSoup

        html = """
        <div class="dog-can-live-with">
            <h3>Can live with</h3>
            <ul>
                <li>I need to be the only dog in the home</li>
                <li>I prefer an adult-only home</li>
            </ul>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            traits = scraper._extract_behavioral_traits(soup)

            assert traits["good_with_children"] == False
            assert traits["good_with_dogs"] == False
            assert traits.get("good_with_cats") is None or traits["good_with_cats"] == "Unknown"

    def test_extract_behavioral_traits_with_cats(self):
        """Test extraction when dog can live with cats."""
        from bs4 import BeautifulSoup

        html = """
        <div class="dog-can-live-with">
            <h3>Can live with</h3>
            <ul>
                <li>I can live with cats</li>
                <li>I love other dogs</li>
                <li>Could live with children aged 8+</li>
            </ul>
        </div>
        """
        soup = BeautifulSoup(html, "html.parser")

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            traits = scraper._extract_behavioral_traits(soup)

            assert traits["good_with_cats"] == True
            assert traits["good_with_dogs"] == True
            assert traits["good_with_children"] == "Yes (8+)"

    def test_scrape_animal_details_includes_behavioral_traits(self):
        """Test that _scrape_animal_details_http includes behavioral traits in properties."""
        from bs4 import BeautifulSoup

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            # Mock the HTTP request
            mock_response = Mock()
            mock_response.text = """
            <html>
                <body>
                    <h1>Simone</h1>
                    <a href="?breed%5B0%5D=Whippet">Whippet</a>
                    <a href="?age%5B0%5D=5-7">5 - 7 years</a>
                    <a href="?gender%5B0%5D=Female">Female</a>
                    <a href="?size%5B0%5D=Medium">Medium</a>
                    <div class="dog-can-live-with">
                        <h3>Can live with</h3>
                        <ul>
                            <li>Could live with children aged 14+</li>
                        </ul>
                    </div>
                    <div class="dog-description">
                        <p>Simone is a lovely dog.</p>
                    </div>
                </body>
            </html>
            """
            mock_response.raise_for_status = Mock()

            with patch("requests.get", return_value=mock_response):
                result = scraper._scrape_animal_details_http("https://example.com/dog/123")

                # Check that behavioral traits are included in properties
                assert "good_with_children" in result["properties"]
                assert result["properties"]["good_with_children"] == "Yes (14+)"
                assert "good_with_dogs" in result["properties"]
                assert "good_with_cats" in result["properties"]

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_pagination_detection_from_indicator(self, mock_webdriver):
        """Test that pagination detection works from '1 of X' indicator."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.page_source = """
        <html>
            <body>
                <div>1 of 47</div>
            </body>
        </html>
        """

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            from bs4 import BeautifulSoup

            soup = BeautifulSoup(mock_driver.page_source, "html.parser")
            max_pages = scraper._detect_max_pages(soup)

            assert max_pages == 47

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_extract_dogs_from_page_finds_dog_links(self, mock_webdriver):
        """Test that _extract_dogs_from_page finds dog detail links."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver

        # Sample HTML with dog links matching Dogs Trust URL pattern
        sample_html = """
        <html>
            <body>
                <a href="/rehoming/dogs/weimaraner/3592421">Maya - Weimaraner Cross</a>
                <a href="/rehoming/dogs/italian-corso-dog/3427428">Nala - Italian Corso Dog Cross</a>
                <a href="/rehoming/dogs?breed=poodle">Filter link - should be ignored</a>
            </body>
        </html>
        """

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            from bs4 import BeautifulSoup

            soup = BeautifulSoup(sample_html, "html.parser")
            dogs = scraper._extract_dogs_from_page(soup)

            assert len(dogs) == 2
            assert dogs[0]["external_id"] == "3592421"
            assert dogs[1]["external_id"] == "3427428"
            assert all(dog["animal_type"] == "dog" for dog in dogs)
            assert all(dog["status"] == "available" for dog in dogs)

    def test_extract_external_id_from_url_pattern(self):
        """Test external ID extraction from Dogs Trust URL pattern."""
        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            # Test standard Dogs Trust URL pattern
            url1 = "https://www.dogstrust.org.uk/rehoming/dogs/weimaraner/3592421"
            assert scraper._extract_external_id_from_url(url1) == "3592421"

            url2 = "https://www.dogstrust.org.uk/rehoming/dogs/italian-corso-dog/3427428"
            assert scraper._extract_external_id_from_url(url2) == "3427428"

            # Test edge case
            invalid_url = "https://www.dogstrust.org.uk/rehoming/dogs/invalid"
            result = scraper._extract_external_id_from_url(invalid_url)
            assert result == "unknown"

    @patch("scrapers.dogstrust.dogstrust_scraper.requests.get")
    def test_scrape_animal_details_http_basic_extraction(self, mock_get):
        """Test that HTTP detail scraping extracts basic fields."""
        # Mock HTML response similar to Dogs Trust detail page structure
        mock_response = Mock()
        mock_response.text = """
        <html>
            <head><title>Maya | Dogs Trust</title></head>
            <body>
                <h1>Maya</h1>
                <div>
                    <a href="/rehoming/dogs?breed%5B0%5D=Weimaraner">Weimaraner Cross</a>
                    <a href="/rehoming/dogs?age%5B0%5D=6%20-%2012%20months">6 - 12 months</a>
                    <a href="/rehoming/dogs?gender%5B0%5D=Female">Female</a>
                    <a href="/rehoming/dogs?size%5B0%5D=Medium">Medium</a>
                    <a href="/rehoming/dogs?centres%5B0%5D=ILF">Ilfracombe</a>
                </div>
                <h2>Are you right for Maya?</h2>
                <p>Maya is a wonderful dog looking for a loving home.</p>
                <h2>Is Maya right for you?</h2>
                <p>Maya enjoys playing and going for walks.</p>
            </body>
        </html>
        """
        mock_response.status_code = 200
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")
            # Set a proper timeout value for testing
            scraper.timeout = 30

            result = scraper._scrape_animal_details_http("https://www.dogstrust.org.uk/rehoming/dogs/weimaraner/3592421")

            assert result["name"] == "Maya"
            assert result["breed"] == "Weimaraner Mix"  # Standardized from "Weimaraner Cross"
            assert result["age_text"] == "6 - 12 months"
            assert result["sex"] == "Female"
            assert result["size"] == "Medium"
            assert result["location"] == "Ilfracombe"
            assert "Maya is a wonderful dog" in result["description"]
            assert "Maya enjoys playing" in result["description"]

    @patch("scrapers.dogstrust.dogstrust_scraper.requests.get")
    def test_scrape_animal_details_http_handles_missing_fields(self, mock_get):
        """Test HTTP scraping handles missing fields with defaults."""
        mock_response = Mock()
        mock_response.text = """
        <html>
            <body>
                <h1>Unknown Dog</h1>
                <!-- Missing most fields -->
            </body>
        </html>
        """
        mock_response.status_code = 200
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")
            scraper.timeout = 30

            result = scraper._scrape_animal_details_http("https://test.url")

            # Should provide defaults for missing fields (Zero NULLs compliance)
            assert result["name"] == "Unknown Dog"
            assert result["breed"] == "Mixed Breed"  # Default
            assert result["age_text"] == "Unknown"  # Default
            assert result["sex"] == "Unknown"  # Default
            assert result["size"] == "Medium"  # Default
            assert result["location"] == "UK"  # Default
            assert result["animal_type"] == "dog"
            assert result["status"] == "available"

    @patch("scrapers.dogstrust.dogstrust_scraper.requests.get")
    def test_scrape_animal_details_http_handles_request_errors(self, mock_get):
        """Test HTTP scraping handles request errors gracefully."""
        mock_get.side_effect = requests.RequestException("Network error")

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")
            scraper.timeout = 30

            result = scraper._scrape_animal_details_http("https://test.url")

            # Should return empty dict on error
            assert result == {}

    def test_description_extraction_combines_two_parts(self):
        """Test that description extraction combines the two-part Dogs Trust pattern."""
        sample_html = """
        <html>
            <body>
                <h2>Are you right for Maya?</h2>
                <p>Maya is a nine-month-old dog looking for a home.</p>
                <h2>Is Maya right for you?</h2>
                <p>Maya is an absolute sweetie who enjoys playing.</p>
            </body>
        </html>
        """

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            from bs4 import BeautifulSoup

            soup = BeautifulSoup(sample_html, "html.parser")
            description = scraper._extract_description(soup)

            assert "Maya is a nine-month-old dog looking for a home." in description
            assert "Maya is an absolute sweetie who enjoys playing." in description
            assert "\n\n" in description  # Should be separated by newlines


class TestDogsTrustTextNormalization:
    """Test text normalization for smart quotes and special characters."""

    def test_normalize_text_smart_quotes(self):
        """Test normalization of smart quotes to standard quotes."""
        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            # Test smart single quotes
            text_with_smart_quotes = "Maya\u2019s favorite toy is a ball, and she\u2019s very playful"
            normalized = scraper._normalize_text(text_with_smart_quotes)
            assert normalized == "Maya's favorite toy is a ball, and she's very playful"

            # Test smart double quotes
            text_with_double_quotes = "\u201cHello world\u201d and \u201cGoodbye\u201d"
            normalized = scraper._normalize_text(text_with_double_quotes)
            assert normalized == '"Hello world" and "Goodbye"'

            # Test em and en dashes
            text_with_dashes = "Maya is 2\u20133 years old \u2014 a perfect age"
            normalized = scraper._normalize_text(text_with_dashes)
            assert normalized == "Maya is 2-3 years old - a perfect age"

    def test_normalize_text_handles_none(self):
        """Test that _normalize_text handles None values gracefully."""
        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            assert scraper._normalize_text(None) is None
            assert scraper._normalize_text("") == ""

    def test_normalize_text_preserves_regular_text(self):
        """Test that regular text without special characters is unchanged."""
        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            regular_text = "Maya is a wonderful dog who loves to play fetch."
            assert scraper._normalize_text(regular_text) == regular_text

    def test_scrape_animal_details_normalizes_description(self):
        """Test that _scrape_animal_details_http normalizes description text."""
        from bs4 import BeautifulSoup

        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            # Mock HTTP response with smart quotes in description
            mock_response = Mock()
            mock_response.text = """
            <html>
                <body>
                    <h1>Maya</h1>
                    <a href="?breed%5B0%5D=Weimaraner">Weimaraner Cross</a>
                    <a href="?age%5B0%5D=2-3">2 - 3 years</a>
                    <a href="?gender%5B0%5D=Female">Female</a>
                    <h2>Are you right for Maya?</h2>
                    <p>Maya\u2019s favorite toy is a ball \u2014 she\u2019s very playful!</p>
                    <h2>Is Maya right for you?</h2>
                    <p>\u201cShe loves walks\u201d and enjoys meeting new people.</p>
                </body>
            </html>
            """
            mock_response.raise_for_status = Mock()

            with patch("requests.get", return_value=mock_response):
                result = scraper._scrape_animal_details_http("https://example.com/dog/123")

                # Check that description has normalized quotes
                assert "Maya's favorite toy is a ball - she's very playful!" in result["description"]
                assert '"She loves walks" and enjoys meeting new people.' in result["description"]
                # Should NOT contain smart quotes
                assert "\u2019" not in result["description"]  # smart apostrophe
                assert "\u201c" not in result["description"]  # left double quote
                assert "\u201d" not in result["description"]  # right double quote
                assert "\u2014" not in result["description"]  # em dash


class TestDogsTrustScraperIntegration:

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    @patch("scrapers.dogstrust.dogstrust_scraper.requests.get")
    def test_collect_data_integration_flow(self, mock_get, mock_webdriver):
        """Test the complete collect_data flow with mocked responses."""
        # Mock WebDriver for listing pages
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.page_source = """
        <html>
            <body>
                <div>1 of 2</div>
                <a href="/rehoming/dogs/weimaraner/3592421">Maya</a>
            </body>
        </html>
        """

        # Mock HTTP response for detail pages
        mock_response = Mock()
        mock_response.text = """
        <html>
            <body>
                <h1>Maya</h1>
                <a href="/rehoming/dogs?breed%5B0%5D=Weimaraner">Weimaraner Cross</a>
                <h2>Are you right for Maya?</h2>
                <p>Maya is wonderful.</p>
            </body>
        </html>
        """
        mock_response.status_code = 200
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        mock_config_loader = Mock()
        mock_config = Mock()
        mock_config.metadata.website_url = "https://www.dogstrust.org.uk"
        mock_config.get_display_name.return_value = "Dogs Trust"
        mock_config.name = "Dogs Trust"
        mock_config.id = "dogstrust"
        # Mock the scraper config method that provides numeric values
        mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 1.0, "max_retries": 3, "timeout": 30, "batch_size": 6, "skip_existing_animals": False}
        mock_config_loader.return_value.load_config.return_value = mock_config

        with patch("scrapers.base_scraper.ConfigLoader", mock_config_loader), patch("scrapers.base_scraper.create_default_sync_service"):
            scraper = DogsTrustScraper(config_id="dogstrust")

            # Run collect_data integration with pagination limit to avoid comparison issues
            result = scraper.collect_data(max_pages_to_scrape=1)

            # Should return list of dogs with enriched data
            assert isinstance(result, list)
            assert len(result) >= 1

            if result:  # If dogs were found
                dog = result[0]
                assert dog["animal_type"] == "dog"
                assert dog["status"] == "available"
                assert "external_id" in dog
                assert "adoption_url" in dog
