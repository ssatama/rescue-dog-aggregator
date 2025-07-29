"""Comprehensive tests for Daisy Family Rescue scraper main functionality.

These tests cover the complete scraper workflow including Selenium operations,
data extraction, and integration with the detail scraper.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest
from selenium.webdriver.common.by import By

from scrapers.daisy_family_rescue.dogs_scraper import DaisyFamilyRescueScraper


class TestDaisyFamilyRescueScraperMain:
    """Main scraper functionality tests."""

    @pytest.fixture
    def scraper(self):
        """Create a scraper instance with mocked dependencies."""
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
            patch("scrapers.base_scraper.R2Service"),
        ):

            mock_config = MagicMock()
            mock_config.name = "Daisy Family Rescue e.V."
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,
                "max_retries": 1,
                "timeout": 5,
                "headless": True,
            }
            mock_config.get_display_name.return_value = "Daisy Family Rescue e.V."

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=12, was_created=True)
            mock_sync.return_value = mock_sync_service

            scraper = DaisyFamilyRescueScraper(config_id="daisyfamilyrescue")
            return scraper

    @pytest.fixture
    def mock_selenium_container(self):
        """Create a mock Selenium container element with realistic content."""
        container = Mock()

        # Mock link element
        link = Mock()
        link.get_attribute.return_value = "https://daisyfamilyrescue.de/hund-brownie/"
        link.text = "Brownie - in München"

        # Mock find_elements for links
        container.find_elements.return_value = [link]

        # Mock container text with realistic content
        container.text = """Brownie - in München
03/2020 • 53cm • 19kg
Deutscher Schäferhund Mischling
weiblich, kastriert"""

        # Mock image element
        img = Mock()
        img.get_attribute.return_value = "https://daisyfamilyrescue.de/wp-content/uploads/brownie.jpg"
        container.find_element.return_value = img

        return container

    @pytest.mark.unit
    def test_extract_dog_from_container_success(self, scraper, mock_selenium_container):
        """Test successful dog data extraction from container."""
        result = scraper._extract_dog_from_container(mock_selenium_container, 1)

        assert result is not None
        assert result["name"] == "Brownie"
        assert result["external_id"] == "hund-brownie"
        assert result["adoption_url"] == "https://daisyfamilyrescue.de/hund-brownie/"
        assert result["primary_image_url"] == "https://daisyfamilyrescue.de/wp-content/uploads/brownie.jpg"
        assert result["status"] == "available"
        assert result["animal_type"] == "dog"

        # Check properties
        props = result["properties"]
        assert props["source"] == "daisyfamilyrescue.de"
        assert props["country"] == "DE"
        assert props["extraction_method"] == "selenium_listing"
        assert props["language"] == "de"
        assert props["location"] == "München"

        # Check additional extracted info
        assert result["birth_date"] == "03/2020"
        assert result["height_cm"] == 53
        assert result["weight_kg"] == 19

    @pytest.mark.unit
    def test_extract_dog_from_container_no_link(self, scraper):
        """Test handling when no dog link is found in container."""
        container = Mock()
        container.find_elements.return_value = []  # No links found
        container.text = "Some non-dog content"

        result = scraper._extract_dog_from_container(container, 1)
        assert result is None

    @pytest.mark.unit
    def test_extract_dog_from_container_invalid_data(self, scraper, mock_selenium_container):
        """Test handling when extracted data fails validation."""
        # Mock container with invalid data (short name)
        link = Mock()
        link.get_attribute.return_value = "https://daisyfamilyrescue.de/hund-x/"
        link.text = "X"  # Too short name

        mock_selenium_container.find_elements.return_value = [link]
        mock_selenium_container.text = "X"

        result = scraper._extract_dog_from_container(mock_selenium_container, 1)
        assert result is None

    @pytest.mark.unit
    def test_filter_dogs_by_section_success(self, scraper):
        """Test section filtering logic."""
        # Mock driver with section headers and containers
        mock_driver = Mock()

        # Mock section headers
        header1 = Mock()
        header1.text = "Bei einer Pflegestelle in Deutschland"
        header2 = Mock()
        header2.text = "Hündinnen in Nordmazedonien"
        header3 = Mock()
        header3.text = "In medizinischer Behandlung"

        mock_driver.find_elements.side_effect = [[header1, header2, header3], [Mock(), Mock(), Mock()]]  # Section headers  # Dog containers

        # Mock execute_script for DOM positions
        mock_driver.execute_script.side_effect = [
            100,  # header1 position
            200,  # header2 position
            300,  # header3 position
            150,  # container1 position (between header1 and header2)
            250,  # container2 position (between header2 and header3)
            350,  # container3 position (after header3)
        ]

        result = scraper._filter_dogs_by_section(mock_driver)

        # Should return 2 containers (from target sections, not medical)
        assert len(result) == 2

    @pytest.mark.slow
    @pytest.mark.selenium
    @pytest.mark.browser
    def test_handle_lazy_loading(self, scraper):
        """Test lazy loading handling."""
        mock_driver = Mock()
        # Add enough return values for all the execute_script calls
        mock_driver.execute_script.side_effect = [1000, 1000, 1000, 1000, 1000, 1000]

        # Should not raise exceptions
        scraper._handle_lazy_loading(mock_driver)

        # Verify scrolling calls were made
        assert mock_driver.execute_script.call_count >= 3

    @pytest.mark.unit
    def test_collect_data_selenium_success(self, scraper):
        """Test successful collect_data flow."""
        mock_dogs = [{"name": "BRUNO", "breed": "Deutscher Schäferhund Mischling", "sex": "männlich, kastriert", "external_id": "hund-bruno", "properties": {"language": "de"}}]

        with patch.object(scraper, "_extract_with_selenium") as mock_extract, patch.object(scraper, "_translate_and_normalize_dogs") as mock_translate:

            mock_extract.return_value = mock_dogs
            mock_translate.return_value = mock_dogs

            result = scraper.collect_data()

            assert len(result) == 1
            mock_extract.assert_called_once()
            mock_translate.assert_called_once_with(mock_dogs)

    @pytest.mark.unit
    def test_collect_data_selenium_failure(self, scraper):
        """Test collect_data handling when Selenium fails."""
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            mock_extract.side_effect = Exception("WebDriver failed")

            result = scraper.collect_data()

            assert result == []

    @pytest.mark.unit
    def test_collect_data_no_dogs_found(self, scraper):
        """Test collect_data when no dogs are found."""
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            mock_extract.return_value = []

            result = scraper.collect_data()

            assert result == []

    @pytest.mark.unit
    def test_extract_with_selenium_chrome_options(self, scraper):
        """Test Chrome options setup for Selenium."""
        with patch("scrapers.daisy_family_rescue.dogs_scraper.webdriver") as mock_webdriver, patch("scrapers.daisy_family_rescue.dogs_scraper.Options") as mock_options_class:

            mock_options = Mock()
            mock_options_class.return_value = mock_options

            mock_driver = Mock()
            mock_webdriver.Chrome.return_value = mock_driver
            mock_driver.find_elements.return_value = []  # No containers to avoid full execution

            try:
                scraper._extract_with_selenium()
            except:
                pass  # We expect this to fail due to mocking, just testing setup

            # Verify Chrome options were configured
            mock_options.add_argument.assert_any_call("--headless")
            mock_options.add_argument.assert_any_call("--no-sandbox")
            mock_options.add_argument.assert_any_call("--disable-dev-shm-usage")

    @pytest.mark.integration
    def test_end_to_end_data_flow_mock(self, scraper):
        """Test complete data flow from extraction to translation (mocked)."""
        # Mock the complete flow
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            # Mock realistic dog data as it would come from website
            raw_dog_data = [
                {
                    "name": "LUNA",
                    "external_id": "hund-luna",
                    "adoption_url": "https://daisyfamilyrescue.de/hund-luna/",
                    "primary_image_url": "https://example.com/luna.jpg",
                    "status": "available",
                    "animal_type": "dog",
                    "birth_date": "03/2020",
                    "height_cm": 45,
                    "weight_kg": 15,
                    "properties": {"source": "daisyfamilyrescue.de", "country": "DE", "extraction_method": "selenium_listing", "language": "de", "location": "München"},
                }
            ]

            mock_extract.return_value = raw_dog_data

            # Run collect_data which should extract and translate
            result = scraper.collect_data()

            assert len(result) == 1
            dog = result[0]

            # Check that data was processed
            assert dog["name"] == "Luna"  # Should be normalized
            assert dog["external_id"] == "hund-luna"
            assert dog["birth_date"] == "03/2020"
            assert dog["height_cm"] == 45
            assert dog["weight_kg"] == 15

            # Check properties were updated with translation info
            props = dog["properties"]
            assert props["language"] == "en"
            assert props["original_language"] == "de"
            assert props["location"] == "München"
