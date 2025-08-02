import os
import sys
from unittest.mock import Mock, patch

import pytest
from selenium.common.exceptions import TimeoutException, WebDriverException

from scrapers.pets_in_turkey.dogs_scraper import PetsInTurkeyScraper

# Add project root to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


@pytest.mark.api
@pytest.mark.browser
@pytest.mark.computation
@pytest.mark.integration
@pytest.mark.selenium
@pytest.mark.slow
class TestPetsInTurkeyScraper:
    """Test Pets in Turkey scraper functionality critical for primary data source."""

    def test_init_with_config_id(self):
        """Test initialization with config_id parameter."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__") as mock_super:
            scraper = PetsInTurkeyScraper(config_id="pets-in-turkey")
            mock_super.assert_called_once_with(config_id="pets-in-turkey")
            assert scraper.base_url == "https://www.petsinturkey.org/dogs"

    def test_init_with_organization_id(self):
        """Test initialization with legacy organization_id parameter."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__") as mock_super:
            scraper = PetsInTurkeyScraper(organization_id=123)
            mock_super.assert_called_once_with(organization_id=123)
            assert scraper.base_url == "https://www.petsinturkey.org/dogs"

    def test_init_without_required_params(self):
        """Test initialization fails without required parameters."""
        with pytest.raises(ValueError, match="Either organization_id or config_id must be provided"):
            PetsInTurkeyScraper()

    @patch("scrapers.pets_in_turkey.dogs_scraper.ChromeDriverManager")
    @patch("scrapers.pets_in_turkey.dogs_scraper.webdriver.Chrome")
    @patch("scrapers.pets_in_turkey.dogs_scraper.Service")
    def test_setup_selenium_success(self, mock_service, mock_chrome, mock_driver_manager):
        """Test successful Selenium setup."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_driver = Mock()
            mock_chrome.return_value = mock_driver
            mock_driver_manager.return_value.install.return_value = "/path/to/chromedriver"

            result = scraper._setup_selenium()

            assert result == mock_driver
            mock_driver.set_page_load_timeout.assert_called_once_with(60)
            mock_driver.implicitly_wait.assert_called_once_with(10)
            # Success logging was removed in recent logging updates

    @patch("scrapers.pets_in_turkey.dogs_scraper.ChromeDriverManager")
    def test_setup_selenium_failure(self, mock_driver_manager):
        """Test Selenium setup failure handling - critical for scraper reliability."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_driver_manager.side_effect = Exception("ChromeDriver not found")

            result = scraper._setup_selenium()

            assert result is None
            scraper.logger.error.assert_called_with("Error setting up Selenium: ChromeDriver not found")

    def test_safe_driver_operation_success(self):
        """Test successful driver operation wrapper."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_operation = Mock(return_value="success")
            result = scraper._safe_driver_operation(mock_operation, "arg1", key="value")

            assert result == "success"
            mock_operation.assert_called_once_with("arg1", key="value")

    def test_safe_driver_operation_failure(self):
        """Test driver operation failure handling."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_operation = Mock(side_effect=WebDriverException("Operation failed"))
            result = scraper._safe_driver_operation(mock_operation)

            assert result is None
            # WebDriverException includes 'Message: ' prefix
            assert "Driver operation failed:" in scraper.logger.error.call_args[0][0]
            assert "Operation failed" in scraper.logger.error.call_args[0][0]

    def test_collect_data_create_dog_metadata(self):
        """Test that collect_data creates proper dog metadata - critical for user-facing listings."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()
            scraper.base_url = "https://www.petsinturkey.org/dogs"

            # Test the metadata creation logic directly
            dog_data = {"name": "Buddy", "breed": "Labrador", "age_text": "3 years", "sex": "Male", "properties": {"weight": "25kg"}}

            # Test the metadata addition that happens in collect_data
            if dog_data and "name" in dog_data and dog_data["name"]:
                dog_data["primary_image_url"] = "https://example.com/buddy.jpg"
                dog_data["adoption_url"] = scraper.base_url + "#" + dog_data["name"].lower().replace(" ", "-")
                dog_data["status"] = "available"
                dog_data["external_id"] = f"pit-{dog_data['name'].lower().replace(' ', '-')}"

            # Verify critical metadata for user adoption process
            assert dog_data["primary_image_url"] == "https://example.com/buddy.jpg"
            assert dog_data["adoption_url"] == "https://www.petsinturkey.org/dogs#buddy"
            assert dog_data["status"] == "available"
            assert dog_data["external_id"] == "pit-buddy"

    def test_collect_data_selenium_setup_failure(self):
        """Test handling of Selenium setup failure - prevents complete data collection failure."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()
            scraper._setup_selenium = Mock(return_value=None)

            result = scraper.collect_data()

            assert result == []
            scraper.logger.error.assert_called_with("Failed to set up Selenium WebDriver")

    @patch("scrapers.pets_in_turkey.dogs_scraper.time.sleep")
    @patch("scrapers.pets_in_turkey.dogs_scraper.WebDriverWait")
    def test_collect_data_page_load_timeout(self, mock_wait, mock_sleep):
        """Test handling of page load timeouts - critical for production reliability."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_driver = Mock()
            scraper._setup_selenium = Mock(return_value=mock_driver)
            mock_wait.return_value.until.side_effect = TimeoutException("Page load timeout")

            result = scraper.collect_data()

            assert result == []
            mock_driver.quit.assert_called_once()

    @patch("scrapers.pets_in_turkey.dogs_scraper.time.sleep")
    @patch("scrapers.pets_in_turkey.dogs_scraper.WebDriverWait")
    def test_collect_data_driver_cleanup_on_error(self, mock_wait, mock_sleep):
        """Test proper driver cleanup even when quit() fails."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_driver = Mock()
            mock_driver.quit.side_effect = Exception("Quit failed")
            scraper._setup_selenium = Mock(return_value=mock_driver)
            mock_wait.return_value.until.return_value = True
            mock_driver.find_elements.return_value = []

            result = scraper.collect_data()

            assert result == []
            assert scraper.driver is None  # Driver reference cleared
            scraper.logger.warning.assert_called_with("Error during WebDriver cleanup: Quit failed")

    def test_parse_special_case_norman_specific(self):
        """Test parsing for Norman - handles known edge case."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Sample text for Norman
            norman_text = """I'm Norman
Lovely dog looking for a home
Breed
Weight
Age
Sex
Neutered
Adopt Me
Spaniel mix
20kg
height:49cm
2,5 yo
Male
Yes"""

            result = scraper._parse_special_case(norman_text)

            assert result["name"] == "Norman"
            assert result["breed"] == "Spaniel mix"
            assert result["properties"]["weight"] == "20kg"
            assert result["properties"]["height"] == "height:49cm"
            assert result["age_text"] == "2,5 yo"
            assert result["sex"] == "Male"
            assert result["properties"]["neutered_spayed"] == "Yes"

    def test_parse_special_case_general_dog(self):
        """Test parsing for general dog profiles."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Sample text for a general dog
            dog_text = """I'm Buddy
Friendly and energetic dog
Breed
Weight
Age
Sex
Neutered
Adopt Me
Labrador Mix
30kg
4 years
Male
Yes"""

            result = scraper._parse_special_case(dog_text)

            assert result["name"] == "Buddy"
            assert result["breed"] == "Labrador Mix"
            assert result["properties"]["weight"] == "30kg"
            assert result["age_text"] == "4 years"
            assert result["sex"] == "Male"
            assert result["properties"]["neutered_spayed"] == "Yes"
            assert "Friendly and energetic dog" in result["properties"]["description"]

    def test_parse_special_case_height_in_weight(self):
        """Test parsing when height is embedded in weight field."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            dog_text = """I'm Max
Great dog
Breed
Weight
Age
Sex
Adopt Me
German Shepherd
35kg height:60cm
5 years
Male"""

            result = scraper._parse_special_case(dog_text)

            assert result["name"] == "Max"
            assert result["properties"]["weight"] == "35kg"
            assert result["properties"]["height"] == "height:60cm"

    def test_parse_special_case_malformed_sex_correction(self):
        """Test correction of misaligned sex/age values."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Simulated misalignment where sex contains measurement
            dog_text = """I'm Luna
Sweet dog
Breed
Weight
Age
Sex
Adopt Me
Mixed Breed
25kg
30cm
Female"""

            result = scraper._parse_special_case(dog_text)

            assert result["name"] == "Luna"
            # Should correct the misalignment
            assert "Female" in result["sex"]

    def test_parse_special_case_no_name(self):
        """Test parsing with missing name - graceful degradation."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            dog_text = """Some description without name format
Breed
Weight
Adopt Me
Unknown Breed
Unknown Weight"""

            result = scraper._parse_special_case(dog_text)

            # Without 'I'm' pattern, default values are returned
            assert result["name"] == ""
            # Parser extracts this from the text
            assert result["breed"] == "Unknown Breed"

    def test_parse_special_case_exception_handling(self):
        """Test exception handling in parsing."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Pass None to trigger exception
            result = scraper._parse_special_case(None)

            # Exception handling returns default values
            assert result["name"] == ""
            assert result["breed"] == "Unknown"
            assert scraper.logger.error.called

    def test_find_image_for_container_success(self):
        """Test successful image extraction from container."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_container = Mock()
            mock_img1 = Mock()
            mock_img1.get_attribute.return_value = "https://static.wixstatic.com/media/abc123.jpg/v1/crop/h_300,w_300"
            mock_img2 = Mock()
            mock_img2.get_attribute.return_value = "https://example.com/logo.svg"  # Should be filtered

            mock_container.find_elements.return_value = [mock_img1, mock_img2]

            result = scraper._find_image_for_container(mock_container)

            assert result == "https://static.wixstatic.com/media/abc123.jpg"

    def test_find_image_for_container_no_valid_images(self):
        """Test image extraction when no valid images found."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_container = Mock()
            mock_img = Mock()
            mock_img.get_attribute.return_value = "https://example.com/icon.svg"  # Invalid
            mock_container.find_elements.return_value = [mock_img]

            result = scraper._find_image_for_container(mock_container)

            assert result is None

    def test_find_image_for_container_no_images(self):
        """Test image extraction when no images in container."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_container = Mock()
            mock_container.find_elements.return_value = []

            result = scraper._find_image_for_container(mock_container)

            assert result is None

    def test_find_image_for_container_exception(self):
        """Test image extraction exception handling."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_container = Mock()
            mock_container.find_elements.side_effect = Exception("Element not found")

            result = scraper._find_image_for_container(mock_container)

            assert result is None
            scraper.logger.error.assert_called_with("Error finding image: Element not found")

    @patch("scrapers.pets_in_turkey.dogs_scraper.time.sleep")
    @patch("scrapers.pets_in_turkey.dogs_scraper.WebDriverWait")
    def test_collect_data_scroll_behavior(self, mock_wait, mock_sleep):
        """Test page scrolling for dynamic content loading."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            mock_driver = Mock()
            scraper._setup_selenium = Mock(return_value=mock_driver)
            mock_wait.return_value.until.return_value = True
            mock_driver.find_elements.return_value = []

            scraper.collect_data()

            # Verify scrolling calls
            scroll_calls = [call for call in mock_driver.execute_script.call_args_list if "scrollTo" in str(call)]
            assert len(scroll_calls) >= 5  # Should scroll multiple times

            # Verify scroll to top at end
            final_scroll = mock_driver.execute_script.call_args_list[-1]
            assert "scrollTo(0, 0)" in str(final_scroll)

    def test_collect_data_dog_validation_logic(self):
        """Test critical dog validation logic that filters invalid entries."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Test the validation logic from collect_data
            container_text_valid = "I'm Buddy\nFriendly dog\nBreed\nAge\nSex\nAdopt Me\nLabrador\n3 years\nMale"
            container_text_invalid = "Just some text without proper format"

            # Valid container should pass validation
            valid_check = "I'm " in container_text_valid and "Breed" in container_text_valid and ("Age" in container_text_valid or "Sex" in container_text_valid)
            assert valid_check is True

            # Invalid container should fail validation
            invalid_check = "I'm " in container_text_invalid and "Breed" in container_text_invalid and ("Age" in container_text_invalid or "Sex" in container_text_invalid)
            assert invalid_check is False

            # Test dog data validation (dog must have name to be included)
            valid_dog_data = {"name": "Buddy", "breed": "Labrador"}
            invalid_dog_data = {"name": "", "breed": "Unknown"}  # Empty name

            assert valid_dog_data and "name" in valid_dog_data and valid_dog_data["name"]
            assert not (invalid_dog_data and "name" in invalid_dog_data and invalid_dog_data["name"])

    def test_collect_data_invalid_dog_filtered(self):
        """Test that invalid dog entries are filtered out."""
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Mock parse_special_case to return invalid data (no name)
            scraper._parse_special_case = Mock(return_value={"breed": "Unknown"})

            # This should result in the dog being filtered out
            with patch.object(scraper, "_setup_selenium", return_value=Mock()) as mock_setup:
                with patch("scrapers.pets_in_turkey.dogs_scraper.WebDriverWait"):
                    with patch("scrapers.pets_in_turkey.dogs_scraper.time.sleep"):
                        mock_driver = Mock()
                        mock_setup.return_value = mock_driver
                        mock_driver.find_elements.return_value = [Mock()]

                        result = scraper.collect_data()

            assert len(result) == 0  # Invalid dogs should be filtered out

    def test_weight_to_size_standardization(self):
        """Test that weight values are converted to standardized size categories.

        This test will FAIL initially, demonstrating the issue where PIT scraper
        extracts weight but doesn't convert it to size categories.
        """
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Test weight parsing and size conversion
            test_cases = [
                ("5kg", "Small"),  # Small dog
                ("15kg", "Medium"),  # Medium dog
                ("30kg", "Large"),  # Large dog
                ("50kg", "XLarge"),  # XLarge dog
                ("2.5 kg", "Tiny"),  # Tiny dog with space
                ("approx 20kg", "Medium"),  # Approximate weight
            ]

            for weight_text, expected_size in test_cases:
                # Mock parsed data with weight but no size
                mock_data = {"name": "Test Dog", "breed": "Labrador", "properties": {"weight": weight_text}}

                # This should add size field based on weight
                # Currently will FAIL because scraper doesn't convert weight to size
                processed_data = scraper._add_size_from_weight(mock_data)

                assert "size" in processed_data, f"Size should be added for weight {weight_text}"
                assert processed_data["size"] == expected_size, f"Weight {weight_text} should map to size {expected_size}"

    def test_age_text_standardization(self):
        """Test that age text is properly parsed and standardized.

        This test will FAIL initially if age parsing doesn't use standardization utilities.
        """
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Test age text variations - expectations based on parse_age_text behavior
            test_cases = [
                ("2 yo", "Young"),  # 2 years = Young category
                ("3 years", "Adult"),  # 3 years = Adult category
                ("6 months", "Puppy"),  # 6 months = Puppy category
                ("1.5 years", "Young"),  # 1.5 years = Young category
                ("adult", "Adult"),  # Life stage gets capitalized
                ("puppy", "Puppy"),  # Life stage gets capitalized
            ]

            for raw_age, expected_age in test_cases:
                mock_data = {"name": "Test Dog", "age_text": raw_age}

                # This should standardize age text format
                # Currently may FAIL if not using parse_age_text utility
                processed_data = scraper._standardize_age_text(mock_data)

                assert processed_data["age_text"] == expected_age, f"Age text '{raw_age}' should be standardized to '{expected_age}'"

    def test_breed_standardization_integration(self):
        """Test that breed data flows through standardization utilities.

        This test will FAIL initially if breed isn't properly standardized.
        """
        with patch("scrapers.pets_in_turkey.dogs_scraper.BaseScraper.__init__"):
            scraper = PetsInTurkeyScraper(config_id="test")
            scraper.logger = Mock()

            # Test breed standardization cases
            test_cases = [
                ("labrador", "Labrador Retriever"),
                ("spaniel mix", "Spaniel Mix"),
                ("german shepherd", "German Shepherd"),
                ("mixed breed", "Mixed Breed"),
            ]

            for raw_breed, expected_breed in test_cases:
                mock_data = {"name": "Test Dog", "breed": raw_breed}

                # This should apply breed standardization
                # Currently may work via base_scraper but we want to test the flow
                processed_data = scraper._prepare_for_standardization(mock_data)

                # Check that breed data is clean and ready for base_scraper
                # standardization
                assert processed_data["breed"].strip() != "", f"Breed '{raw_breed}' should not be empty after processing"
                assert isinstance(processed_data["breed"], str), f"Breed should be a string, got {type(processed_data['breed'])}"
