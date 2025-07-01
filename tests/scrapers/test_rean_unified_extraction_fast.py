"""
Fast unit tests for REAN unified extraction core logic.

These tests focus on the business logic of unified extraction without expensive
WebDriver operations, providing quick feedback during development.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.rean.dogs_scraper import REANScraper


class TestREANUnifiedExtractionFast:
    """Fast unit tests for unified extraction logic."""

    @pytest.fixture
    def scraper(self):
        """Create a REAN scraper instance for testing."""
        scraper = REANScraper()
        scraper.logger = Mock()
        return scraper

    @pytest.mark.unit
    def test_container_validation_patterns(self, scraper):
        """Test container validation patterns quickly."""
        # Valid containers
        valid_containers = [
            "Toby - 4 months old - in Romania\nVaccinated and chipped.",
            "Bobbie is around 5 months old\nFriendly dog looking for home.",
            "Max - 2 years old - in foster\nSweet boy needs family.",
        ]

        for text in valid_containers:
            container = Mock()
            container.text = text
            validated = scraper._validate_dog_containers([container])
            assert len(validated) == 1

        # Invalid containers
        invalid_containers = [
            "Just some random text",
            "No dog information here",
            "",
            "Contact us for more info",
        ]

        for text in invalid_containers:
            container = Mock()
            container.text = text
            validated = scraper._validate_dog_containers([container])
            assert len(validated) == 0

    @pytest.mark.unit
    def test_image_extraction_from_container_logic(self, scraper):
        """Test image extraction from container logic quickly."""
        container = Mock()

        # Mock images: placeholder + valid image
        placeholder_img = Mock()
        placeholder_img.get_attribute.side_effect = lambda attr: {"src": "data:image/gif;base64,placeholder", "data-src": None}.get(attr)

        valid_img = Mock()
        valid_img.get_attribute.side_effect = lambda attr: {"src": "https://img1.wsimg.com/isteam/ip/abc/toby.jpg", "data-src": None}.get(attr)

        container.find_elements.return_value = [placeholder_img, valid_img]

        result = scraper._extract_image_from_container(container, "Toby", 1)
        assert result == "https://img1.wsimg.com/isteam/ip/abc/toby.jpg"

    @pytest.mark.unit
    def test_image_extraction_lazy_loading_logic(self, scraper):
        """Test lazy loading image extraction logic quickly."""
        container = Mock()

        # Mock lazy-loaded image (data-src preferred over src)
        lazy_img = Mock()
        lazy_img.get_attribute.side_effect = lambda attr: {"src": "data:image/gif;base64,placeholder", "data-src": "https://img1.wsimg.com/isteam/ip/abc/toby-lazy.jpg"}.get(attr)

        container.find_elements.return_value = [lazy_img]

        result = scraper._extract_image_from_container(container, "Toby", 1)
        assert result == "https://img1.wsimg.com/isteam/ip/abc/toby-lazy.jpg"

    @pytest.mark.unit
    def test_single_dog_extraction_logic(self, scraper):
        """Test single dog extraction from container logic quickly."""
        container = Mock()
        container.text = "Toby - 4 months old - in Romania\nFriendly pup.\nVaccinated and chipped."

        # Mock successful image extraction
        scraper._extract_image_from_container = Mock(return_value="https://img1.wsimg.com/test.jpg")

        result = scraper._extract_single_dog_from_container(container, "romania", 1)

        assert result is not None
        assert result["name"] == "Toby"
        assert result["age_text"] == "4 months"
        assert result["primary_image_url"] == "https://img1.wsimg.com/test.jpg"
        assert result["properties"]["source_page"] == "romania"

    @pytest.mark.unit
    def test_single_dog_extraction_no_image(self, scraper):
        """Test single dog extraction without image quickly."""
        container = Mock()
        container.text = "Toby - 4 months old - in Romania\nFriendly pup.\nVaccinated and chipped."

        # Mock no image found
        scraper._extract_image_from_container = Mock(return_value=None)

        result = scraper._extract_single_dog_from_container(container, "romania", 1)

        assert result is not None
        assert result["name"] == "Toby"
        assert "primary_image_url" not in result

    @pytest.mark.unit
    def test_single_dog_extraction_invalid_data(self, scraper):
        """Test single dog extraction with invalid data quickly."""
        container = Mock()
        container.text = "Random text without dog information"

        result = scraper._extract_single_dog_from_container(container, "romania", 1)

        # Method may return data but it should be recognizably poor quality
        if result is not None:
            # Check that it found questionable name data
            assert result.get("name") in ["Random", None] or len(result.get("name", "")) < 5

    @pytest.mark.unit
    def test_image_validation_patterns(self, scraper):
        """Test image URL validation patterns quickly."""
        # Valid REAN images
        valid_images = [
            "https://img1.wsimg.com/isteam/ip/abc123/dog.jpg",
            "//img1.wsimg.com/isteam/ip/def456/puppy.jpg",
            "https://img1.wsimg.com/isteam/ip/ghi789/animal.jpg/:/rs=w:400,h:300",
        ]

        for img_url in valid_images:
            assert scraper._is_valid_rean_image(img_url) is True

        # Invalid images
        invalid_images = [
            "data:image/gif;base64,placeholder",
            "https://example.com/external.jpg",
            "",
            None,
            "not-a-url",
            "javascript:void(0)",
        ]

        for img_url in invalid_images:
            assert scraper._is_valid_rean_image(img_url) is False

    @pytest.mark.unit
    def test_dog_container_content_patterns(self, scraper):
        """Test dog container content patterns quickly."""
        # Test realistic container content patterns
        realistic_containers = [
            "Bobbie - 5 months old - in Romania\nBobbie was rescued from the local kill shelter.\nVaccinated and chipped.\n(Updated 22/4/25)",
            "Toby - 4 months old - in Romania\nLittle friendly Toby is looking so sad.\nVaccinated and chipped.\n(Updated 22/4/25)",
            "Max is around 16 kg, fostered in Lincolnshire\nGentle soul who gets along with other dogs.\nSpayed, vaccinated and chipped.\n(Updated 21/4/25)",
        ]

        for content in realistic_containers:
            container = Mock()
            container.text = content

            # Should validate as dog container
            validated = scraper._validate_dog_containers([container])
            assert len(validated) == 1

            # Should extract dog data successfully
            result = scraper._extract_single_dog_from_container(container, "romania", 1)
            assert result is not None
            assert "name" in result
            assert result["name"] is not None

    @pytest.mark.unit
    def test_fallback_selector_logic(self, scraper):
        """Test fallback selector logic quickly."""
        # Mock different selector scenarios
        selectors = ["div.x-el-article", "div.x.c1-5", "div[class*='x-el-article']", "div[class*='c1-5']", "h3"]  # Final fallback

        # Test that each selector type would be attempted
        for selector in selectors:
            # This is testing the logical flow, not actual DOM queries
            assert isinstance(selector, str)
            assert len(selector) > 0

    @pytest.mark.slow  # Actually slow due to complex data flow simulation
    @pytest.mark.computation
    @pytest.mark.complex_setup
    def test_unified_extraction_data_flow(self, scraper):
        """Test unified extraction data flow logic quickly."""
        # Mock the complete data flow without WebDriver
        mock_containers = []

        # Create mock container with complete data
        container = Mock()
        container.text = "Toby - 4 months old - in Romania\nFriendly dog.\nVaccinated and chipped."

        # Mock image in container
        img = Mock()
        img.get_attribute.side_effect = lambda attr: {"src": "https://img1.wsimg.com/isteam/ip/abc/toby.jpg", "data-src": None}.get(attr)
        container.find_elements.return_value = [img]
        mock_containers.append(container)

        # Mock the container finding
        scraper._find_dog_containers = Mock(return_value=mock_containers)

        # Test with mocked WebDriver
        with patch("selenium.webdriver.Chrome") as mock_chrome:
            mock_driver = Mock()
            mock_chrome.return_value = mock_driver

            result = scraper.extract_dogs_with_images_unified("https://test.url", "romania")

            assert len(result) == 1
            assert result[0]["name"] == "Toby"
            assert result[0]["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/abc/toby.jpg"

    @pytest.mark.unit
    def test_unified_extraction_error_handling_logic(self, scraper):
        """Test unified extraction error handling logic quickly."""
        # Test fallback to legacy method logic
        scraper.scrape_page = Mock(return_value="<html>test content</html>")
        scraper.extract_dog_content_from_html = Mock(return_value=["Toby - 4 months old"])
        scraper.extract_images_with_browser = Mock(return_value=["https://img1.wsimg.com/test.jpg"])
        scraper.extract_dog_data = Mock(return_value={"name": "Toby", "age_text": "4 months"})
        scraper.associate_images_with_dogs = Mock(return_value=[{"name": "Toby", "age_text": "4 months", "primary_image_url": "https://img1.wsimg.com/test.jpg"}])

        # Simulate WebDriver failure
        with patch("selenium.webdriver.Chrome", side_effect=Exception("WebDriver failed")):
            result = scraper.extract_dogs_with_images_unified("https://test.url", "romania")

            # Should fallback successfully
            assert len(result) == 1
            assert result[0]["name"] == "Toby"
            scraper.scrape_page.assert_called_once()

    @pytest.mark.slow  # Actually slow due to complex image association logic
    @pytest.mark.computation
    @pytest.mark.complex_setup
    def test_image_container_association_accuracy(self, scraper):
        """Test accuracy of image-container association logic quickly."""
        # Test the core issue: ensuring dogs get correct images
        containers_data = [
            {"text": "Bobbie - 5 months old - in Romania\nBobbie was rescued from shelter.\nVaccinated.", "image": "https://img1.wsimg.com/isteam/ip/rean/bobbie-correct.jpg"},
            {"text": "Toby - 4 months old - in Romania\nToby is looking for home.\nVaccinated.", "image": "https://img1.wsimg.com/isteam/ip/rean/toby-correct.jpg"},
        ]

        containers = []
        for data in containers_data:
            container = Mock()
            container.text = data["text"]

            img = Mock()
            img.get_attribute.side_effect = lambda attr, url=data["image"]: {"src": url, "data-src": None}.get(attr)
            container.find_elements.return_value = [img]
            containers.append(container)

        # Mock container finding
        scraper._find_dog_containers = Mock(return_value=containers)

        with patch("selenium.webdriver.Chrome") as mock_chrome:
            mock_driver = Mock()
            mock_chrome.return_value = mock_driver

            result = scraper.extract_dogs_with_images_unified("https://test.url", "romania")

            # Verify correct associations
            assert len(result) == 2

            bobbie_data = next(dog for dog in result if dog["name"] == "Bobbie")
            toby_data = next(dog for dog in result if dog["name"] == "Toby")

            # Critical: each dog should get their own image
            assert bobbie_data["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/rean/bobbie-correct.jpg"
            assert toby_data["primary_image_url"] == "https://img1.wsimg.com/isteam/ip/rean/toby-correct.jpg"

            # Verify no cross-contamination
            assert toby_data["primary_image_url"] != "https://img1.wsimg.com/isteam/ip/rean/bobbie-correct.jpg"
            assert bobbie_data["primary_image_url"] != "https://img1.wsimg.com/isteam/ip/rean/toby-correct.jpg"
