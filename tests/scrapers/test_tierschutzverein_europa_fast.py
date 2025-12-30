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
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
        ):
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
            mock_sync_service.sync_single_organization.return_value = Mock(
                organization_id=1, was_created=True
            )
            mock_sync.return_value = mock_sync_service

            scraper = TierschutzvereinEuropaScraper()
            return scraper

    @pytest.mark.unit
    def test_translations_normalize_name(self):
        """Test name normalization through translations module."""
        from scrapers.tierschutzverein_europa.translations import normalize_name

        test_cases = [
            ("SASHA", "Sasha"),
            ("MAX", "Max"),
            ("bella", "Bella"),
            ("Luna (vermittlungshilfe)", "Luna"),
            ("Mo'nique", "Mo'nique"),
        ]

        for text, expected in test_cases:
            result = normalize_name(text)
            assert result == expected, (
                f"Expected {expected}, got {result} for text: {text}"
            )

    @pytest.mark.unit
    def test_translations_translate_age(self):
        """Test age translation from German to English."""
        from scrapers.tierschutzverein_europa.translations import translate_age

        test_cases = [
            ("2 Jahre alt", "2 years old"),
            ("6 Monate alt", "6 months old"),
            ("3 Jahre", "3 years"),
            ("1 Jahr alt", "1 year old"),
            ("18 Monate", "18 months"),
            ("05.2025 (3 Monate alt)", "3 months old"),
        ]

        for text, expected in test_cases:
            result = translate_age(text)
            assert result == expected, (
                f"Expected {expected}, got {result} for text: {text}"
            )

    @pytest.mark.unit
    def test_translations_translate_gender(self):
        """Test gender translation from German text."""
        from scrapers.tierschutzverein_europa.translations import translate_gender

        test_cases = [
            ("Hündin", "Female"),
            ("Rüde", "Male"),
            ("weiblich", "Female"),
            ("männlich", "Male"),
            ("hündin", "Female"),
            ("rüde", "Male"),
        ]

        for text, expected in test_cases:
            result = translate_gender(text)
            assert result == expected, (
                f"Expected {expected}, got {result} for text: {text}"
            )

    @pytest.mark.unit
    def test_translations_translate_breed(self):
        """Test breed translation from German text patterns."""
        from scrapers.tierschutzverein_europa.translations import translate_breed

        test_cases = [
            ("Deutscher Schäferhund", "German Shepherd"),
            ("Mischling", "Mixed Breed"),
            ("Golden Retriever Mix", "Golden Retriever Mix"),
            ("Labrador", "Labrador"),
            ("Herdenschutz Mix", "Livestock Guardian Mix"),
        ]

        for text, expected in test_cases:
            result = translate_breed(text)
            assert result == expected, (
                f"Expected {expected}, got {result} for text: {text}"
            )

    @pytest.mark.unit
    def test_extract_external_id_from_url(self, scraper):
        """Test external ID extraction from URLs."""
        test_cases = [
            (
                "/tiervermittlung/abel-in-spanien-huellas-con-esperanza/",
                "abel-in-spanien-huellas-con-esperanza",
            ),
            (
                "/tiervermittlung/abril-in-spanien-tierheim-ada-canals/",
                "abril-in-spanien-tierheim-ada-canals",
            ),
            (
                "/tiervermittlung/akeno-in-rumaenien-tierheim-odai/",
                "akeno-in-rumaenien-tierheim-odai",
            ),
        ]

        for url, expected in test_cases:
            result = scraper._extract_external_id_from_url(url)
            assert result == expected, (
                f"Expected {expected}, got {result} for URL {url}"
            )

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
        required_fields = [
            "name",
            "external_id",
            "age_text",
            "sex",
            "breed",
            "primary_image_url",
            "adoption_url",
        ]
        for field in required_fields:
            assert field in sample_data, f"Required field {field} missing"
            assert sample_data[field], f"Required field {field} is empty"
