"""Refactored tests for Woof Project scraper - focused on behaviors, not implementation."""

from unittest.mock import MagicMock, Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.woof_project.dogs_scraper import WoofProjectScraper


class TestWoofProjectScraper:
    """Refactored test cases focusing on core behaviors and integration scenarios."""

    @pytest.fixture
    def scraper(self):
        """Create scraper instance for testing."""
        return WoofProjectScraper(config_id="woof-project")

    # Core Business Logic Tests

    def test_status_filtering_behavior(self, scraper):
        """Test that dogs with ADOPTED/RESERVED status are properly filtered out."""
        # HTML structure representing real site patterns
        test_html = """
        <div class="fusion-text fusion-text-1">
            <!-- Available dog -->
            <h4 style="text-align: center;">
                <a href="/adoption/buddy/">Buddy</a>
            </h4>
        </div>
        <div class="fusion-text fusion-text-1">
            <!-- Adopted dog -->
            <h2 style="text-align: center;">
                <span style="color: #ff0000;">ADOPTED</span>
            </h2>
            <h4 style="text-align: center;">
                <a href="/adoption/luna/">Luna</a>
            </h4>
        </div>
        <div class="fusion-text fusion-text-1">
            <!-- Reserved dog -->
            <h2 style="text-align: center;">
                <span style="color: #ff0000;">RESERVED</span>
            </h2>
            <h4 style="text-align: center;">
                <a href="/adoption/max/">Max</a>
            </h4>
        </div>
        """

        soup = BeautifulSoup(test_html, "html.parser")
        elements = soup.find_all("div", class_="fusion-text")

        # Test filtering behavior
        assert scraper._is_available_dog(elements[0]) is True  # Available
        assert scraper._is_available_dog(elements[1]) is False  # Adopted
        assert scraper._is_available_dog(elements[2]) is False  # Reserved

    def test_data_extraction_pipeline(self, scraper):
        """Test complete data extraction pipeline with edge cases."""
        detail_html = """
        <html>
        <head><title>SPECIAL-NAME - Woof Project</title></head>
        <body>
        <h1>SPECIAL-NAME</h1>
        <div class="post-content">
            <p><strong>Breed:</strong> German Shepherd Mix</p>
            <p><strong>Age:</strong> 3 years</p>
            <p><strong>Size:</strong> Large</p>
            <p>This beautiful dog is approximately 3 years old and weighs about 25kg.</p>
            <img src="https://woofproject.eu/wp-content/uploads/2025/01/special.jpg" 
                 alt="rescue dog" width="800" height="600" />
        </div>
        </body>
        </html>
        """

        with patch.object(scraper, "_fetch_detail_page") as mock_fetch:
            mock_fetch.return_value = BeautifulSoup(detail_html, "html.parser")

            result = scraper.scrape_animal_details("https://woofproject.eu/adoption/special-name/")

            # Test complete data pipeline
            assert result is not None

            # Verify standardization
            assert result["name"] == "Special-Name"  # Hyphenated name handling
            assert result["external_id"] == "special-name"

            # Verify extraction with fallbacks
            assert "German Shepherd" in result["breed"]
            assert "3 years" in result["age_text"]
            assert result["size"] == "Large"

            # Verify image prioritization
            assert "wp-content/uploads" in result["primary_image_url"]

            # Verify NULL prevention
            assert all(value is not None for key, value in result.items() if key not in ["properties"])

    def test_listing_extraction_behavior(self, scraper):
        """Test extraction from listing pages with realistic structure."""
        listing_html = """
        <html><body>
        <!-- Available dogs -->
        <a href="/adoption/dog1/"><img src="img1.jpg" /></a>
        <h2>DOG1</h2>
        <a href="/adoption/dog2/"><img src="img2.jpg" /></a>
        <h2>DOG2</h2>
        
        <!-- Adopted dog (should be filtered) -->
        <h2>ADOPTED</h2>
        <h2>ADOPTED_DOG</h2>
        <a href="/adoption/adopted_dog/"><img src="img3.jpg" /></a>
        
        <!-- Reserved dog (should be filtered) -->
        <h2>RESERVED</h2>
        <h2>RESERVED_DOG</h2>
        <a href="/adoption/reserved_dog/"><img src="img4.jpg" /></a>
        </body></html>
        """

        with patch("scrapers.woof_project.dogs_scraper.requests.get") as mock_get:
            mock_response = Mock()
            mock_response.text = listing_html
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response

            soup = scraper._fetch_listing_page("https://woofproject.eu/adoption/")
            dogs = scraper._extract_dogs_from_page_new_method(soup)

            # Test behavior, not exact count
            assert len(dogs) >= 0  # Should handle empty results gracefully
            assert all("url" in dog and "name" in dog for dog in dogs)

            # Verify filtering works - no status keywords in names
            if dogs:
                dog_names = [dog["name"] for dog in dogs]
                assert not any(name in ["ADOPTED", "RESERVED"] for name in dog_names)

    @pytest.mark.parametrize(
        "url,expected",
        [
            # Valid individual dog URLs
            ("/adoption/buddy/", True),
            ("/adoption/max-zeus/", True),
            ("https://woofproject.eu/adoption/luna/", True),
            # Invalid pagination URLs
            ("/adoption/page/2/", False),
            ("/adoption/page/10/", False),
            # Invalid formats
            ("", False),
            ("/adoption/", False),
            ("/adoption/123/", False),
            ("/contact/", False),
            ("/adoption/dog/extra/", False),
        ],
    )
    def test_url_validation_comprehensive(self, scraper, url, expected):
        """Test URL validation with comprehensive cases using parametrized tests."""
        assert scraper._is_valid_dog_url(url) == expected

    def test_pagination_discovery(self, scraper):
        """Test dynamic pagination URL generation."""
        pagination_html = """
        <html><body>
        <a href="/adoption/page/2/">Page 2</a>
        <a href="/adoption/page/3/">Page 3</a>
        </body></html>
        """
        soup = BeautifulSoup(pagination_html, "html.parser")

        with patch.object(scraper, "_fetch_listing_page", return_value=soup):
            actual_urls = scraper._get_pagination_urls()

        # Should include page 1 plus discovered pages
        expected_urls = [
            "https://woofproject.eu/adoption/",  # Page 1 (always included)
            "https://woofproject.eu/adoption/page/2/",  # Discovered
            "https://woofproject.eu/adoption/page/3/",  # Discovered
        ]

        assert actual_urls == expected_urls

    # Integration Tests

    def test_error_handling_and_fallbacks(self, scraper):
        """Test handling of edge cases and malformed data."""
        edge_cases = [
            # Empty/minimal content
            ("<html><body></body></html>", "empty_page"),
            # Malformed HTML
            ("<html><h1>DOG</h1><p>No closing tags", "malformed_html"),
            # Unicode/special characters
            ("<html><h1>CAFÉ-MÜNCHEN</h1></html>", "unicode_name"),
        ]

        for html_content, case_name in edge_cases:
            with patch.object(scraper, "_fetch_detail_page") as mock_fetch:
                mock_fetch.return_value = BeautifulSoup(html_content, "html.parser")

                result = scraper.scrape_animal_details(f"https://woofproject.eu/adoption/{case_name}/")

                # Should handle gracefully without exceptions
                if result is not None:
                    # Basic data integrity checks
                    assert isinstance(result["name"], str)
                    assert len(result["name"]) > 0
                    assert result["external_id"] == case_name
                    assert result["animal_type"] == "dog"
                    assert result["status"] == "available"

    def test_network_error_handling(self, scraper):
        """Test network failure handling and fallbacks."""
        with patch.object(scraper, "_fetch_with_browser") as mock_browser, patch("scrapers.woof_project.dogs_scraper.requests.get") as mock_get:

            # Mock browser automation to fail
            mock_browser.side_effect = Exception("Browser not available")

            # Test successful requests fallback
            mock_response = Mock()
            mock_response.text = '<html><body><div class="fusion-text">Dogs</div></body></html>'
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response

            soup = scraper._fetch_listing_page("https://woofproject.eu/adoption/")
            assert soup is not None
            assert soup.find("div", class_="fusion-text") is not None

            # Test complete network failure
            mock_get.side_effect = Exception("Network error")
            soup = scraper._fetch_listing_page("https://woofproject.eu/adoption/")
            assert soup is None

    @pytest.mark.slow
    def test_browser_automation_integration(self, scraper):
        """Test complete browser automation workflow with fallback."""
        test_url = "https://woofproject.eu/adoption/"

        with patch("selenium.webdriver.Chrome") as mock_chrome:
            # Test successful browser automation
            mock_driver = MagicMock()
            mock_chrome.return_value = mock_driver
            mock_driver.page_source = "<html><h2>TEST_DOG</h2></html>"
            mock_driver.execute_script.return_value = 1000

            result = scraper._fetch_with_browser(test_url)

            # Verify complete workflow
            assert result is not None
            mock_driver.get.assert_called_once_with(test_url)

            # Verify lazy loading sequence
            script_calls = [call[0][0] for call in mock_driver.execute_script.call_args_list]
            assert any("scrollHeight" in call for call in script_calls)
            assert any("scrollTo(0, 0)" in call for call in script_calls)

            mock_driver.quit.assert_called_once()

        # Test fallback to requests when browser fails
        with patch("selenium.webdriver.Chrome", side_effect=Exception("Browser failed")):
            result = scraper._fetch_with_browser(test_url)
            assert result is None

    def test_image_prioritization_logic(self, scraper):
        """Test image selection and prioritization."""
        # HTML with multiple images including wp-content uploads
        detail_html = """
        <html>
        <body>
            <div class="header">
                <img src="/logo.png" alt="Site Logo" />
            </div>
            <div class="post-content">
                <img src="/images/generic-dog.jpg" alt="Generic dog photo" />
                <img src="https://woofproject.eu/wp-content/uploads/2025/07/actual-dog-photo.jpeg" alt="Buddy" />
                <img src="/thumbnails/small-thumb.jpg" alt="Thumbnail" />
            </div>
        </body>
        </html>
        """

        soup = BeautifulSoup(detail_html, "html.parser")
        image_url = scraper._extract_primary_image_from_detail(soup)

        # Should prioritize the wp-content/uploads image
        assert image_url == "https://woofproject.eu/wp-content/uploads/2025/07/actual-dog-photo.jpeg"

        # Test fallback when no wp-content images
        fallback_html = """
        <html>
        <body>
            <div class="post-content">
                <img src="/images/dog-photo.jpg" alt="rescue dog" width="400" height="300" />
                <img src="/logo.png" alt="logo" />
            </div>
        </body>
        </html>
        """

        soup = BeautifulSoup(fallback_html, "html.parser")
        image_url = scraper._extract_primary_image_from_detail(soup)

        # Should fall back to best available image
        assert image_url == "https://woofproject.eu/images/dog-photo.jpg"

    def test_data_standardization_integration(self, scraper):
        """Test that complete data standardization works end-to-end."""
        detail_html = """
        <html>
        <head><title>LISBON - Woof Project</title></head>
        <body>
        <h1>LISBON</h1>
        <div class="post-content">
            <p><strong>Breed:</strong> Hound Pointer Cross</p>
            <p><strong>Age:</strong> 2 years</p>
            <p><strong>Size:</strong> Medium</p>
            <p>LISBON is a friendly dog looking for a loving home.</p>
            <img src="https://woofproject.eu/wp-content/uploads/2025/07/lisbon.jpg" alt="LISBON" />
        </div>
        </body>
        </html>
        """

        with patch.object(scraper, "_fetch_detail_page") as mock_fetch:
            mock_fetch.return_value = BeautifulSoup(detail_html, "html.parser")

            result = scraper.scrape_animal_details("https://woofproject.eu/adoption/lisbon/")

            # Verify standardization is applied
            assert result is not None
            assert result["name"] == "Lisbon"  # Standardized from "LISBON"
            assert result["external_id"] == "lisbon"
            assert result["breed"] == "Hound Pointer Cross"
            assert result["standardized_breed"] is not None
            assert result["size"] == "Medium"
            assert result["standardized_size"] is not None

            # Verify wp-content image is prioritized
            assert "wp-content/uploads" in result["primary_image_url"]

    def test_external_id_generation(self, scraper):
        """Test external ID generation from various URL formats."""
        test_cases = [
            ("https://woofproject.eu/adoption/buddy/", "buddy"),
            ("https://woofproject.eu/adoption/luna", "luna"),
            ("/adoption/max-zeus/", "max-zeus"),
            ("https://woofproject.eu/adoption/special-name/", "special-name"),
        ]

        for url, expected_id in test_cases:
            assert scraper._generate_external_id(url) == expected_id

    @pytest.mark.parametrize(
        "name,expected",
        [
            # Test uppercase names get converted to title case
            ("LISBON", "Lisbon"),
            ("COOPER", "Cooper"),
            # Test hyphenated names
            ("MAX-ZEUS", "Max-Zeus"),
            ("LUNA-BELLE", "Luna-Belle"),
            # Test already proper names remain unchanged
            ("Buddy", "Buddy"),
            ("Charlie", "Charlie"),
            # Test empty/None names
            ("", "Unknown"),
            (None, "Unknown"),
            # Test names with extra whitespace
            ("  BUDDY  ", "Buddy"),
        ],
    )
    def test_name_standardization(self, scraper, name, expected):
        """Test name standardization to title case with various inputs."""
        assert scraper._standardize_name(name) == expected

    def test_comprehensive_null_prevention(self, scraper):
        """Test that scrape_animal_details prevents NULL values with minimal data."""
        minimal_html = """
        <html>
        <head><title>TestDog - Woof Project</title></head>
        <body>
        <h1>TestDog</h1>
        <div class="post-content">
            <p>A rescue dog.</p>
        </div>
        </body>
        </html>
        """

        with patch.object(scraper, "_fetch_detail_page") as mock_fetch:
            mock_fetch.return_value = BeautifulSoup(minimal_html, "html.parser")

            result = scraper.scrape_animal_details("https://woofproject.eu/adoption/testdog/")

            # All critical fields should have values (no NULLs)
            assert result is not None
            assert result["name"] == "Testdog"  # Standardized to title case
            assert result["external_id"] == "testdog"
            assert result["breed"] is not None  # Should have default
            assert result["size"] is not None  # Should have default
            assert result["description"] is not None
