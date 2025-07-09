"""
Fast unit tests for Tierschutzverein Europa scraper core logic.

These tests focus on the core business logic without expensive WebDriver operations,
providing quick feedback during development. They complement the comprehensive slow tests.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper


class TestTierschutzvereinEuropaScraperFast:
    """Fast unit tests for Tierschutzverein Europa scraper core logic."""

    @pytest.fixture
    def scraper(self):
        """Create a Tierschutzverein Europa scraper instance for testing."""
        with patch("scrapers.base_scraper.create_default_sync_service") as mock_sync, patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader:

            mock_config = MagicMock()
            mock_config.name = "Tierschutzverein Europa Test"
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 0.1,  # Faster for tests
                "max_retries": 1,  # Fewer retries for speed
                "timeout": 5,  # Shorter timeout
                "headless": True,
            }
            mock_config.metadata.website_url = "https://tierschutzverein-europa.de"

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=1, was_created=True)
            mock_sync.return_value = mock_sync_service

            scraper = TierschutzvereinEuropaScraper()
            return scraper

    @pytest.mark.unit
    def test_extract_name_from_text(self, scraper):
        """Test name extraction from German text patterns."""
        test_cases = [
            ("Sasha - 2 Jahre, Hündin", "Sasha"),
            ("Max der Mischling ist freundlich", "Max"),
            ("Bella sucht ein Zuhause", "Bella"),
            ("Luna - Spanien", "Luna"),
        ]

        for text, expected in test_cases:
            result = scraper.extract_name_from_text(text)
            assert result == expected, f"Expected {expected}, got {result} for text: {text}"

    @pytest.mark.unit
    def test_extract_age_from_german_text(self, scraper):
        """Test age extraction from German text patterns."""
        test_cases = [
            ("2 Jahre alt", "2 Jahre"),
            ("6 Monate", "6 Monate"),
            ("ca. 3 Jahre", "ca. 3 Jahre"),
            ("etwa 1,5 Jahre", "etwa 1,5 Jahre"),
            ("18 Monate alt", "18 Monate"),
        ]

        for text, expected in test_cases:
            result = scraper.extract_age_from_text(text)
            assert result == expected, f"Expected {expected}, got {result} for text: {text}"

    @pytest.mark.unit
    def test_extract_gender_from_german_text(self, scraper):
        """Test gender extraction from German text."""
        test_cases = [
            ("Hündin", "Hündin"),
            ("Rüde", "Rüde"),
            ("weiblich", "Hündin"),
            ("männlich", "Rüde"),
            ("female", "Hündin"),  # English fallback
            ("male", "Rüde"),  # English fallback
        ]

        for text, expected in test_cases:
            result = scraper.extract_gender_from_text(text)
            assert result == expected, f"Expected {expected}, got {result} for text: {text}"

    @pytest.mark.unit
    def test_extract_breed_from_german_text(self, scraper):
        """Test breed extraction from German text patterns."""
        test_cases = [
            ("Deutscher Schäferhund", "Deutscher Schäferhund"),
            ("Mischling", "Mischling"),
            ("Golden Retriever Mix", "Golden Retriever Mix"),
            ("Labrador", "Labrador"),
            ("unbekannt", "Mischling"),  # Default fallback
        ]

        for text, expected in test_cases:
            result = scraper.extract_breed_from_text(text)
            assert result == expected, f"Expected {expected}, got {result} for text: {text}"

    @pytest.mark.unit
    def test_generate_external_id(self, scraper):
        """Test external ID generation from name and details."""
        test_cases = [
            ("Sasha", "2 Jahre, Hündin", "sasha-2-jahre"),
            ("Max Müller", "6 Monate, Rüde", "max-mueller-6-monate"),
            # Note: ü -> ue
            ("Bella-Luna", "3 Jahre", "bella-luna-3-jahre"),
        ]

        for name, details, expected_start in test_cases:
            result = scraper.generate_external_id(name, details)
            assert result.startswith(expected_start), f"Expected to start with {expected_start}, got {result}"
            assert len(result) > len(expected_start), "Should have additional unique identifier"

    @pytest.mark.unit
    def test_build_adoption_url(self, scraper):
        """Test adoption URL construction."""
        test_cases = [
            ("sasha-123", "https://tierschutzverein-europa.de/tiervermittlung/sasha-123/"),
            ("max-muller-456", "https://tierschutzverein-europa.de/tiervermittlung/max-muller-456/"),
        ]

        for external_id, expected in test_cases:
            result = scraper.build_adoption_url(external_id)
            assert result == expected, f"Expected {expected}, got {result}"

    @pytest.mark.unit
    def test_pagination_url_generation(self, scraper):
        """Test pagination URL generation."""
        base_url = "https://tierschutzverein-europa.de/tiervermittlung/"

        # Test first page (no pagination)
        result = scraper.get_page_url(1)
        assert result == base_url

        # Test subsequent pages
        for page in range(2, 13):  # Test pages 2-12
            result = scraper.get_page_url(page)
            expected = f"{base_url}page/{page}/"
            assert result == expected, f"Expected {expected}, got {result}"

    @pytest.mark.unit
    def test_data_structure_validation(self, scraper):
        """Test that data structure matches expected format."""
        sample_data = {
            "name": "Sasha",
            "external_id": "sasha-123",
            "age_text": "2 Jahre",
            "sex": "Hündin",
            "breed": "Mischling",
            "primary_image_url": "https://example.com/image.jpg",
            "adoption_url": "https://tierschutzverein-europa.de/tiervermittlung/sasha-123/",
        }

        # Validate required fields are present
        required_fields = ["name", "external_id", "age_text", "sex", "breed", "primary_image_url", "adoption_url"]
        for field in required_fields:
            assert field in sample_data, f"Required field {field} missing"
            assert sample_data[field], f"Required field {field} is empty"

    @pytest.mark.unit
    def test_url_validation(self, scraper):
        """Test URL validation logic."""
        valid_urls = ["https://tierschutzverein-europa.de/wp-content/uploads/image.jpg", "https://tierschutzverein-europa.de/tiervermittlung/sasha/", "https://example.com/image.png"]

        invalid_urls = ["", "not-a-url", "javascript:alert('xss')", None]

        for url in valid_urls:
            assert scraper.is_valid_url(url), f"Should be valid: {url}"

        for url in invalid_urls:
            assert not scraper.is_valid_url(url), f"Should be invalid: {url}"

    @pytest.mark.unit
    def test_german_text_normalization(self, scraper):
        """Test German text normalization."""
        test_cases = [
            ("Schäferhund", "Schäferhund"),  # Keep umlauts
            ("Größe: mittel", "Größe: mittel"),  # Keep umlauts
            ("  extra  spaces  ", "extra spaces"),  # Normalize spaces
            # Normalize linebreaks
            ("Multiple\n\nlinebreaks", "Multiple linebreaks"),
        ]

        for input_text, expected in test_cases:
            result = scraper.normalize_german_text(input_text)
            assert result == expected, f"Expected {expected}, got {result}"

    @pytest.mark.unit
    def test_extract_data_from_article_text(self, scraper):
        """Test extraction from actual article text structure."""
        article_text = """ABEL
SPANIEN
31. MAI 2024
Name: Abel
Rasse: Podenco
Geschlecht: männlich
Geburtstag: 09.2020 (4 Jahre alt)
Ungefähre Größe: 59 cm
Aufenthaltsort: Refugio Huellas Con Esperanza
MEHR INFOS"""

        result = scraper.extract_data_from_article_text(article_text)

        assert result["name"] == "Abel"
        assert result["breed"] == "Podenco"
        assert result["sex"] == "Rüde"
        assert "Jahre" in result["age_text"]

    @pytest.mark.unit
    def test_extract_external_id_from_url(self, scraper):
        """Test external ID extraction from URLs."""
        test_cases = [
            ("https://tierschutzverein-europa.de/tiervermittlung/abel-in-spanien-huellas-con-esperanza/", "abel-in-spanien-huellas-con-esperanza"),
            ("https://tierschutzverein-europa.de/tiervermittlung/abril-in-spanien-tierheim-ada-canals/", "abril-in-spanien-tierheim-ada-canals"),
            ("/tiervermittlung/akeno-in-rumaenien-tierheim-odai/", "akeno-in-rumaenien-tierheim-odai"),
        ]

        for url, expected in test_cases:
            result = scraper.extract_external_id_from_url(url)
            assert result == expected, f"Expected {expected}, got {result} for URL {url}"

    @pytest.mark.unit
    def test_extract_profile_image_url(self, scraper):
        """Test profile image URL extraction."""
        # Mock image elements as we would find them
        mock_images = [
            ("https://example.com/flags/spain.png", "Ort"),  # Flag image
            ("https://example.com/flags/spain.png", "Ort"),  # Flag image duplicate
            ("https://tierschutzverein-europa.de/wp-content/uploads/2024/05/Abel-Profilbild-300x300.jpeg", "Titelbild von Abel"),  # Profile image
        ]

        result = scraper.extract_profile_image_from_images(mock_images)
        assert result == "https://tierschutzverein-europa.de/wp-content/uploads/2024/05/Abel-Profilbild-300x300.jpeg"
