"""
Tests for REAN unified DOM-based extraction approach.

This test suite validates the new unified extraction method that maintains
DOM relationships between text and images, fixing the "off by one" association issue.
"""
from unittest.mock import Mock, patch

import pytest
from selenium.common.exceptions import WebDriverException

from scrapers.rean.dogs_scraper import REANScraper


class TestREANUnifiedExtraction:
    """Test suite for unified DOM-based extraction."""

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch('time.sleep')  # Speed up by mocking sleep calls
    def test_unified_extraction_success_scenario(self, mock_sleep):
        """Test successful unified extraction with proper DOM structure."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock WebDriver and container elements
        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_driver = Mock()
            mock_chrome.return_value = mock_driver

            # Mock successful container finding
            mock_containers = [Mock(), Mock()]  # Two dog containers

            # Set up container 1 (Toby)
            mock_containers[0].text = "Toby - 4 months old - in Romania\nLittle friendly Toby is looking so sad in the shelter, when he should be running around in someone's garden, and chasing a ball and sitting for treats.\nVaccinated and chipped."
            mock_img1 = Mock()
            mock_img1.get_attribute.side_effect = lambda attr: {
                'src': 'https://img1.wsimg.com/isteam/ip/abc/toby-correct.jpg',
                'data-src': None
            }.get(attr)
            mock_containers[0].find_elements.return_value = [mock_img1]

            # Set up container 2 (Bobbie)
            mock_containers[1].text = "Bobbie - 5 months old - in Romania\nBobbie was rescued from the local kill shelter and is currently stuck in an overcrowded kennel.\nVaccinated and chipped."
            mock_img2 = Mock()
            mock_img2.get_attribute.side_effect = lambda attr: {
                'src': 'https://img1.wsimg.com/isteam/ip/abc/bobbie-correct.jpg',
                'data-src': None
            }.get(attr)
            mock_containers[1].find_elements.return_value = [mock_img2]

            # Mock _find_dog_containers to return our test containers
            scraper._find_dog_containers = Mock(return_value=mock_containers)

            # Execute unified extraction
            result = scraper.extract_dogs_with_images_unified(
                "https://test.url", "romania")

            # Verify correct extraction
            assert len(result) == 2

            # Verify Toby gets Toby's image (not Bobbie's)
            toby_data = next(dog for dog in result if dog['name'] == 'Toby')
            assert toby_data['primary_image_url'] == 'https://img1.wsimg.com/isteam/ip/abc/toby-correct.jpg'

            # Verify Bobbie gets Bobbie's image
            bobbie_data = next(
                dog for dog in result if dog['name'] == 'Bobbie')
            assert bobbie_data['primary_image_url'] == 'https://img1.wsimg.com/isteam/ip/abc/bobbie-correct.jpg'

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch('time.sleep')  # Speed up by mocking sleep calls
    def test_unified_extraction_with_lazy_loading(self, mock_sleep):
        """Test unified extraction handling data-src lazy loading."""
        scraper = REANScraper()
        scraper.logger = Mock()

        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_driver = Mock()
            mock_chrome.return_value = mock_driver

            # Mock container with lazy loading image
            mock_container = Mock()
            mock_container.text = "Toby - 4 months old - in Romania\nFriendly pup looking for home.\nVaccinated and chipped."

            # Mock image with data-src (lazy loading)
            mock_img = Mock()
            mock_img.get_attribute.side_effect = lambda attr: {
                'src': 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=',  # Placeholder
                'data-src': 'https://img1.wsimg.com/isteam/ip/abc/toby-lazy.jpg'  # Real image
            }.get(attr)
            mock_container.find_elements.return_value = [mock_img]

            scraper._find_dog_containers = Mock(return_value=[mock_container])

            result = scraper.extract_dogs_with_images_unified(
                "https://test.url", "romania")

            assert len(result) == 1
            assert result[0]['name'] == 'Toby'
            # Should prefer data-src over placeholder src
            assert result[0]['primary_image_url'] == 'https://img1.wsimg.com/isteam/ip/abc/toby-lazy.jpg'

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch('time.sleep')  # Speed up by mocking sleep calls
    def test_unified_extraction_container_detection_fallback(self, mock_sleep):
        """Test container detection with fallback selectors."""
        scraper = REANScraper()
        scraper.logger = Mock()

        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_driver = Mock()
            mock_chrome.return_value = mock_driver

            # Mock primary selectors failing
            mock_driver.find_elements.side_effect = [
                [],  # div.x-el-article fails
                [],  # div.x.c1-5 fails
                [],  # div[class*='x-el-article'] fails
                [],  # div[class*='c1-5'] fails
                [Mock()]  # h3 fallback succeeds
            ]

            # Mock h3 element with dog content
            mock_h3 = Mock()
            mock_h3.text = "Toby - 4 months old - in Romania"
            mock_parent = Mock()
            mock_parent.text = "Toby - 4 months old - in Romania\nFriendly dog.\nVaccinated."
            mock_h3.find_element.return_value = mock_parent

            # Mock image in parent container
            mock_img = Mock()
            mock_img.get_attribute.side_effect = lambda attr: {
                'src': 'https://img1.wsimg.com/isteam/ip/abc/toby.jpg',
                'data-src': None
            }.get(attr)
            mock_parent.find_elements.return_value = [mock_img]

            # Set up fallback detection
            def mock_find_elements(by, selector):
                if selector == "h3":
                    return [mock_h3]
                return []

            mock_driver.find_elements.side_effect = None
            mock_driver.find_elements = Mock(side_effect=mock_find_elements)

            result = scraper.extract_dogs_with_images_unified(
                "https://test.url", "romania")

            # Should successfully extract using fallback
            assert len(result) == 1
            assert result[0]['name'] == 'Toby'

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch('time.sleep')  # Speed up by mocking sleep calls
    def test_unified_extraction_handles_missing_images(self, mock_sleep):
        """Test unified extraction when containers have no valid images."""
        scraper = REANScraper()
        scraper.logger = Mock()

        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_driver = Mock()
            mock_chrome.return_value = mock_driver

            # Mock container with no valid images
            mock_container = Mock()
            mock_container.text = "Toby - 4 months old - in Romania\nFriendly dog.\nVaccinated and chipped."
            mock_container.find_elements.return_value = []  # No img elements

            scraper._find_dog_containers = Mock(return_value=[mock_container])

            result = scraper.extract_dogs_with_images_unified(
                "https://test.url", "romania")

            assert len(result) == 1
            assert result[0]['name'] == 'Toby'
            # Should have no image URL
            assert 'primary_image_url' not in result[0]

    def test_unified_extraction_fallback_to_legacy(self):
        """Test fallback to legacy method when unified extraction fails."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock unified extraction to fail
        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_chrome.side_effect = WebDriverException("Chrome failed")

            # Mock legacy fallback methods
            scraper.scrape_page = Mock(
                return_value="<html>test content</html>")
            scraper.extract_dog_content_from_html = Mock(
                return_value=["Toby - 4 months old"])
            scraper.extract_images_with_browser = Mock(
                return_value=["https://img1.wsimg.com/test.jpg"])
            scraper.extract_dog_data = Mock(
                return_value={
                    "name": "Toby",
                    "age_text": "4 months"})
            scraper.associate_images_with_dogs = Mock(return_value=[{
                "name": "Toby",
                "age_text": "4 months",
                "primary_image_url": "https://img1.wsimg.com/test.jpg"
            }])

            result = scraper.extract_dogs_with_images_unified(
                "https://test.url", "romania")

            # Should fallback successfully
            assert len(result) == 1
            assert result[0]['name'] == 'Toby'
            scraper.scrape_page.assert_called_once()

    @pytest.mark.slow
    @pytest.mark.selenium
    @patch('time.sleep')  # Speed up by mocking sleep calls
    def test_comprehensive_lazy_loading_trigger(self, mock_sleep):
        """Test comprehensive lazy loading trigger functionality."""
        scraper = REANScraper()
        scraper.logger = Mock()

        mock_driver = Mock()
        mock_driver.execute_script.side_effect = [
            1500,  # document.body.scrollHeight
            None, None, None, None, None, None  # scroll commands
        ]

        # Should complete without errors
        scraper._trigger_comprehensive_lazy_loading(mock_driver)

        # Verify scrolling pattern
        assert mock_driver.execute_script.call_count >= 7  # Height + multiple scrolls

    def test_container_validation(self):
        """Test dog container validation logic."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock containers with different content
        valid_container = Mock()
        valid_container.text = "Toby - 4 months old - in Romania\nVaccinated and chipped."

        invalid_container = Mock()
        invalid_container.text = "Just some random text with no dog info."

        containers = [valid_container, invalid_container]

        validated = scraper._validate_dog_containers(containers)

        assert len(validated) == 1
        assert validated[0] == valid_container

    def test_image_extraction_from_container(self):
        """Test image extraction from individual container."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock container with multiple images
        mock_container = Mock()

        # First image: invalid (placeholder)
        invalid_img = Mock()
        invalid_img.get_attribute.side_effect = lambda attr: {
            'src': 'data:image/gif;base64,placeholder',
            'data-src': None
        }.get(attr)

        # Second image: valid
        valid_img = Mock()
        valid_img.get_attribute.side_effect = lambda attr: {
            'src': 'https://img1.wsimg.com/isteam/ip/abc/toby.jpg',
            'data-src': None
        }.get(attr)

        mock_container.find_elements.return_value = [invalid_img, valid_img]

        result = scraper._extract_image_from_container(
            mock_container, "Toby", 1)

        # Should return the valid image, not the placeholder
        assert result == 'https://img1.wsimg.com/isteam/ip/abc/toby.jpg'

    def test_single_dog_extraction_from_container(self):
        """Test extraction of complete dog data from single container."""
        scraper = REANScraper()
        scraper.logger = Mock()

        # Mock container with complete dog data
        mock_container = Mock()
        mock_container.text = "Toby - 4 months old - in Romania\nLittle friendly Toby is looking so sad.\nVaccinated and chipped."

        # Mock successful image extraction
        scraper._extract_image_from_container = Mock(
            return_value="https://img1.wsimg.com/test.jpg")

        result = scraper._extract_single_dog_from_container(
            mock_container, "romania", 1)

        assert result is not None
        assert result['name'] == 'Toby'
        assert result['primary_image_url'] == 'https://img1.wsimg.com/test.jpg'

    def test_find_dog_containers_multiple_selectors(self):
        """Test container finding with multiple CSS selector attempts."""
        scraper = REANScraper()
        scraper.logger = Mock()

        mock_driver = Mock()

        # Mock first selector failing, second succeeding
        def mock_find_elements(by, selector):
            if selector == "div.x-el-article":
                return []  # Primary fails
            elif selector == "div.x.c1-5":
                mock_container = Mock()
                mock_container.text = "Toby - 4 months old\nVaccinated."
                return [mock_container]  # Alternative succeeds
            return []

        mock_driver.find_elements.side_effect = mock_find_elements

        containers = scraper._find_dog_containers(mock_driver)

        assert len(containers) == 1

    @pytest.mark.slow
    @pytest.mark.selenium
    @pytest.mark.integration
    @patch('time.sleep')  # Speed up by mocking sleep calls
    def test_unified_extraction_end_to_end_realistic(self, mock_sleep):
        """End-to-end test with realistic REAN data matching screenshots."""
        scraper = REANScraper()
        scraper.logger = Mock()

        with patch('selenium.webdriver.Chrome') as mock_chrome:
            mock_driver = Mock()
            mock_chrome.return_value = mock_driver

            # Create realistic containers matching screenshot data
            containers = []

            # Bobbie container (should get boot image)
            bobbie_container = Mock()
            bobbie_container.text = "Bobbie - 5 months old - in Romania\nBobbie was rescued from the local kill shelter and is currently stuck in an overcrowded kennel. He is a friendly and playful little boy, currently around 5 months old. Vaccinated and chipped.\n(Updated 22/4/25)"
            bobbie_img = Mock()
            bobbie_img.get_attribute.side_effect = lambda attr: {
                'src': 'https://img1.wsimg.com/isteam/ip/rean/bobbie-with-boot.jpg',  # Boot image
                'data-src': None
            }.get(attr)
            bobbie_container.find_elements.return_value = [bobbie_img]
            containers.append(bobbie_container)

            # Toby container (should get brown puppy image)
            toby_container = Mock()
            toby_container.text = "Toby - 4 months old - in Romania\nLittle friendly Toby is looking so sad in the shelter, when he should be running around in someone's garden, and chasing a ball and sitting for treats. Sadly life wasn't so kind to Toby so far, he's hoping this will change after this post. He's 4 months old and a friendly pup, desperately needs a loving home. He is vaccinated and chipped.\n(Updated 22/4/25)"
            toby_img = Mock()
            toby_img.get_attribute.side_effect = lambda attr: {
                'src': 'https://img1.wsimg.com/isteam/ip/rean/toby-brown-puppy.jpg',  # Brown puppy image
                'data-src': None
            }.get(attr)
            toby_container.find_elements.return_value = [toby_img]
            containers.append(toby_container)

            scraper._find_dog_containers = Mock(return_value=containers)

            result = scraper.extract_dogs_with_images_unified(
                "https://rean.org.uk/dogs-%26-puppies-in-romania", "romania")

            # Verify correct associations
            assert len(result) == 2

            bobbie_data = next(
                dog for dog in result if dog['name'] == 'Bobbie')
            toby_data = next(dog for dog in result if dog['name'] == 'Toby')

            # Critical test: Toby should NOT get Bobbie's image
            assert toby_data['primary_image_url'] == 'https://img1.wsimg.com/isteam/ip/rean/toby-brown-puppy.jpg'
            assert bobbie_data['primary_image_url'] == 'https://img1.wsimg.com/isteam/ip/rean/bobbie-with-boot.jpg'

            # Verify they don't have swapped images
            assert toby_data['primary_image_url'] != 'https://img1.wsimg.com/isteam/ip/rean/bobbie-with-boot.jpg'
            assert bobbie_data['primary_image_url'] != 'https://img1.wsimg.com/isteam/ip/rean/toby-brown-puppy.jpg'
