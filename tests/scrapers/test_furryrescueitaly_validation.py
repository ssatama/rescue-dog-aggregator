"""Validation tests for Furry Rescue Italy detail page extraction."""

import json
from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper


@pytest.mark.unit
@pytest.mark.fast
class TestFurryRescueDetailValidation:
    """Test detail extraction with real-world HTML patterns."""

    @pytest.fixture
    def scraper(self):
        """Create scraper instance with mocked database."""
        with patch("scrapers.base_scraper.create_default_sync_service") as mock_create_sync:
            mock_sync = Mock()
            mock_sync.sync_single_organization.return_value = Mock(success=True, organization_id="furryrescueitaly")
            mock_create_sync.return_value = mock_sync

            return FurryRescueItalyScraper(config_id="furryrescueitaly", database_service=None)

    def test_detail_extraction_judy_format(self, scraper):
        """Test extraction for Judy's page format (standard colons)."""
        # Mock HTML response
        html = """
        <html>
            <h4 class="fusion-tb-text">JUDY</h4>
            <div class="fusion-tb-images-container">
                <img src="https://furryrescueitaly.com/wp-content/uploads/2024/10/judy-600x600.jpg">
            </div>
            <ul>
                <li>Born: October 2021</li>
                <li>Sex: Female</li>
                <li>Size: Medium (20-25 kg)</li>
                <li>Breed: Mixed Breed</li>
                <li>Personality: Friendly, playful</li>
                <li>Good with: Dogs, cats, children</li>
            </ul>
            <p>Judy is a lovely dog looking for her forever home.</p>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.text = html
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            details = scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/judy/")

        assert details["name"] == "JUDY"
        assert "600x600" in details["primary_image_url"]
        assert details["properties"]["born"] == "October 2021"
        assert details["properties"]["sex"] == "Female"
        assert details["properties"]["size"] == "Medium (20-25 kg)"
        assert details["properties"]["weight"] == "20-25 kg"
        assert details["properties"]["breed"] == "Mixed Breed"
        assert details["properties"]["personality"] == "Friendly, playful"
        assert details["properties"]["good_with"] == "Dogs, cats, children"
        assert "lovely dog" in details["description"]

    def test_detail_extraction_thor_format(self, scraper):
        """Test extraction for Thor's page format (h7 with spans and bullets)."""
        html = """
        <html>
            <h4>THOR</h4>
            <img src="https://furryrescueitaly.com/wp-content/uploads/2024/11/thor-600x600.jpg">
            <li class="h7">Born <span>October 2021</span></li>
            <li class="h7">Weight <span>28 kgs</span></li>
            <li class="h7">Location <span>Italy</span></li>
            <div dir="auto">
                • Born: October 2021
                • Sex: Male
                • Size: Large
                • Breed: Maremmano Mix
                • Personality: Protective, loyal
                • Good with: Dogs, older children
            </div>
            <p>Thor is a magnificent dog.</p>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.text = html
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            details = scraper.scrape_animal_details("https://furryrescueitaly.com/adoption/thor-2/")

        assert details["name"] == "THOR"
        assert "600x600" in details["primary_image_url"]
        assert details["properties"]["born"] == "October 2021"
        assert details["properties"]["sex"] == "Male"
        assert details["properties"]["size"] == "Large"
        assert details["properties"]["weight"] == "28 kgs"
        assert details["properties"]["breed"] == "Maremmano Mix"
        assert details["properties"]["location"] == "Italy"
        assert "magnificent dog" in details["description"]

    def test_description_cleaning(self, scraper):
        """Test that description cleaning removes unwanted content."""
        html = """
        <html>
            <h4>TEST DOG</h4>
            <p>This is a good dog.</p>
            <p>👉 Follow us @furryrescue_italy</p>
            <p>📝 Fill out form: https://forms.gle/abc123</p>
            <p>He loves to play.</p>
            <p>WhatsApp: +39 123 456 7890</p>
            <p>Full RBU and home check required.</p>
            <p>Adoption fees apply.</p>
        </html>
        """

        with patch("requests.get") as mock_get:
            mock_response = Mock()
            mock_response.text = html
            mock_response.raise_for_status = Mock()
            mock_get.return_value = mock_response

            details = scraper.scrape_animal_details("https://test.com")

        description = details.get("description", "")

        # Should contain good content
        assert "good dog" in description
        assert "loves to play" in description

        # Should NOT contain unwanted content
        assert "@furryrescue" not in description
        assert "WhatsApp" not in description
        assert "forms.gle" not in description
        assert "Full RBU" not in description
        assert "home check" not in description
        assert "Adoption fees" not in description
        assert "👉" not in description
        assert "📝" not in description

    def test_weight_extraction_from_size(self, scraper):
        """Test weight extraction from various size formats."""
        test_cases = [
            ("Small (10-15 kg)", "10-15 kg"),
            ("Medium 20kg", "20kg"),
            ("Large (28 kgs)", "28 kgs"),
            ("Small dog", None),
            ("25-30 KG approx", "25-30 KG"),
        ]

        for size_text, expected_weight in test_cases:
            weight = scraper._extract_weight_from_size(size_text)
            assert weight == expected_weight, f"Failed for '{size_text}': got {weight}, expected {expected_weight}"

    def test_properties_extraction_all_formats(self, scraper):
        """Test that all property extraction formats work."""
        from bs4 import BeautifulSoup

        # Test standard format
        html1 = "<ul><li>Born: May 2020</li><li>Sex: Female</li></ul>"
        soup1 = BeautifulSoup(html1, "html.parser")
        props1 = scraper._extract_properties(soup1)
        assert props1["born"] == "May 2020"
        assert props1["sex"] == "Female"

        # Test h7 format
        html2 = '<li class="h7">Born <span>June 2021</span></li>'
        soup2 = BeautifulSoup(html2, "html.parser")
        props2 = scraper._extract_properties(soup2)
        assert props2["born"] == "June 2021"

        # Test bullet format
        html3 = '<div dir="auto">• Born: July 2022\n• Sex: Male</div>'
        soup3 = BeautifulSoup(html3, "html.parser")
        props3 = scraper._extract_properties(soup3)
        assert props3["born"] == "July 2022"
        assert props3["sex"] == "Male"

    @patch("requests.get")
    def test_error_handling_in_detail_scraping(self, mock_get, scraper):
        """Test that errors in detail scraping are handled gracefully."""
        # Test network error
        mock_get.side_effect = Exception("Network error")
        details = scraper.scrape_animal_details("https://test.com")
        assert details == {}

        # Test HTML parsing error
        mock_get.side_effect = None
        mock_response = Mock()
        mock_response.text = "Invalid HTML <<<<>"
        mock_response.raise_for_status = Mock()
        mock_get.return_value = mock_response

        details = scraper.scrape_animal_details("https://test.com")
        # Should return something even with bad HTML
        assert isinstance(details, dict)
