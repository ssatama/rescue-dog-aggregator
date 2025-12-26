"""Optimized tests for Woof Project scraper - essential functionality only."""

from unittest.mock import AsyncMock, Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.woof_project.dogs_scraper import WoofProjectScraper


class TestWoofProjectScraperOptimized:
    """Optimized test cases focusing on essential behaviors only."""

    @pytest.fixture
    def scraper(self):
        """Create scraper instance for testing."""
        return WoofProjectScraper(config_id="woof-project")

    # Core Business Logic Tests

    def test_status_filtering_behavior(self, scraper):
        """Test that dogs with ADOPTED/RESERVED status are properly filtered out."""
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
        """Test complete data extraction pipeline with essential functionality."""
        detail_html = """
        <html>
        <head><title>SPECIAL-NAME - Woof Project</title></head>
        <body>
        <h1>SPECIAL-NAME</h1>
        <div class="post-content">
            <p><strong>Breed:</strong> German Shepherd Mix</p>
            <p><strong>Age:</strong> 3 years</p>
            <p><strong>Size:</strong> Large</p>
            <p>This beautiful dog is approximately 3 years old.</p>
            <img src="https://woofproject.eu/wp-content/uploads/2025/01/special.jpg" 
                 alt="rescue dog" width="800" height="600" />
        </div>
        </body>
        </html>
        """

        with patch.object(scraper, "_fetch_detail_page") as mock_fetch:
            mock_fetch.return_value = BeautifulSoup(detail_html, "html.parser")

            result = scraper.scrape_animal_details("https://woofproject.eu/adoption/special-name/")

            # Test essential data extraction
            assert result is not None
            assert result["name"] == "Special-Name"
            assert result["external_id"] == "wp-special-name"
            assert "German Shepherd" in result["breed"]
            assert "3 years" in result["age_text"]
            assert result["size"] == "Large"
            assert "wp-content/uploads" in result["primary_image_url"]

    @pytest.mark.parametrize(
        "url,expected",
        [
            # Valid URLs
            ("/adoption/buddy/", True),
            ("/adoption/max-zeus/", True),
            ("https://woofproject.eu/adoption/luna/", True),
            # Invalid URLs
            ("/adoption/page/2/", False),
            ("", False),
            ("/adoption/", False),
            ("/contact/", False),
        ],
    )
    def test_url_validation_consolidated(self, scraper, url, expected):
        """Test URL validation with essential cases."""
        assert scraper._is_valid_dog_url(url) == expected

    @pytest.mark.parametrize(
        "name,expected",
        [
            ("LISBON", "Lisbon"),
            ("MAX-ZEUS", "Max-Zeus"),
            ("Buddy", "Buddy"),
            ("", "Unknown"),
            (None, "Unknown"),
            ("  BUDDY  ", "Buddy"),
        ],
    )
    def test_name_standardization_consolidated(self, scraper, name, expected):
        """Test name standardization with essential cases."""
        assert scraper._standardize_name(name) == expected

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

        expected_urls = [
            "https://woofproject.eu/adoption/",
            "https://woofproject.eu/adoption/page/2/",
            "https://woofproject.eu/adoption/page/3/",
        ]

        assert actual_urls == expected_urls

    def test_image_prioritization_logic(self, scraper):
        """Test image selection and prioritization."""
        detail_html = """
        <html>
        <body>
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

    def test_external_id_generation(self, scraper):
        """Test external ID generation from various URL formats."""
        test_cases = [
            ("https://woofproject.eu/adoption/buddy/", "wp-buddy"),
            ("https://woofproject.eu/adoption/luna", "wp-luna"),
            ("/adoption/max-zeus/", "wp-max-zeus"),
            ("https://woofproject.eu/adoption/special-name/", "wp-special-name"),
        ]

        for url, expected_id in test_cases:
            assert scraper._generate_external_id(url) == expected_id

    def test_network_error_handling(self, scraper):
        """Test network failure handling and fallbacks (Selenium path)."""
        with (
            patch("scrapers.woof_project.dogs_scraper.USE_PLAYWRIGHT", False),
            patch.object(scraper, "_fetch_with_browser") as mock_browser,
            patch("scrapers.woof_project.dogs_scraper.requests.get") as mock_get,
        ):

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

    def test_network_error_handling_playwright(self, scraper):
        """Test network failure handling and fallbacks (Playwright path)."""
        mock_playwright = AsyncMock(return_value=None)
        with (
            patch("scrapers.woof_project.dogs_scraper.USE_PLAYWRIGHT", True),
            patch.object(scraper, "_fetch_with_browser_playwright", mock_playwright),
            patch("scrapers.woof_project.dogs_scraper.requests.get") as mock_get,
        ):

            # Test successful requests fallback
            mock_response = Mock()
            mock_response.text = '<html><body><div class="fusion-text">Dogs</div></body></html>'
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response

            soup = scraper._fetch_listing_page("https://woofproject.eu/adoption/")
            assert soup is not None
            assert soup.find("div", class_="fusion-text") is not None

    def test_edge_case_handling(self, scraper):
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
                    assert isinstance(result["name"], str)
                    assert len(result["name"]) > 0
                    assert result["external_id"] == f"wp-{case_name}"
                    assert result["animal_type"] == "dog"
                    assert result["status"] == "available"

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
            assert result["external_id"] == "wp-lisbon"
            assert result["breed"] == "Hound Pointer Cross"
            assert result["standardized_breed"] is not None
            assert result["size"] == "Medium"
            assert result["standardized_size"] is not None

            # Verify wp-content image is prioritized
            assert "wp-content/uploads" in result["primary_image_url"]
