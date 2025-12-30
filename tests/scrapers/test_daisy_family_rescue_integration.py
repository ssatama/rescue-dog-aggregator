"""Integration tests for Daisy Family Rescue scraper.

These tests verify the complete integration with BaseScraper and the configuration system.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.daisy_family_rescue.dog_detail_scraper import (
    DaisyFamilyRescueDogDetailScraper,
)
from scrapers.daisy_family_rescue.dogs_scraper import DaisyFamilyRescueScraper


@pytest.mark.integration
@pytest.mark.slow
class TestDaisyFamilyRescueIntegration:
    """Integration tests for Daisy Family Rescue scraper."""

    @pytest.fixture
    def mock_config(self):
        """Create a mock configuration for testing."""
        config = MagicMock()
        config.name = "Daisy Family Rescue e.V."
        config.get_scraper_config_dict.return_value = {
            "rate_limit_delay": 0.1,
            "max_retries": 1,
            "timeout": 5,
            "headless": True,
        }
        config.get_display_name.return_value = "Daisy Family Rescue e.V."
        return config

    @pytest.fixture
    def scraper(self, mock_config):
        """Create a scraper instance with mocked dependencies."""
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
            patch("scrapers.base_scraper.R2Service"),
            patch.dict("os.environ", {"TESTING_VALIDATE_SYNC": "true"}),
        ):
            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(
                organization_id=12, was_created=True
            )
            mock_sync.return_value = mock_sync_service

            scraper = DaisyFamilyRescueScraper(config_id="daisyfamilyrescue")
            return scraper

    @pytest.mark.integration
    def test_scraper_initialization_with_config(self, scraper):
        """Test that scraper initializes correctly with configuration system."""
        assert scraper.organization_id == 12
        assert scraper.base_url == "https://daisyfamilyrescue.de"
        assert scraper.listing_url == "https://daisyfamilyrescue.de/unsere-hunde/"
        assert scraper.rate_limit_delay == 0.1  # From mock config
        assert scraper.max_retries == 1
        assert scraper.timeout == 5

        # Test target sections are set
        assert len(scraper.target_sections) == 3
        assert "Bei einer Pflegestelle in Deutschland" in scraper.target_sections
        assert "Hündinnen in Nordmazedonien" in scraper.target_sections
        assert "Rüden in Nordmazedonien" in scraper.target_sections

        # Test skip sections are set
        assert len(scraper.skip_sections) == 2
        assert "In medizinischer Behandlung" in scraper.skip_sections
        assert "Wir sind bereits reserviert" in scraper.skip_sections

    @pytest.mark.integration
    def test_translation_and_normalization_integration(self, scraper):
        """Test complete translation and normalization flow."""
        # Sample raw German data as would come from website
        raw_dogs = [
            {
                "name": "BRUNO",
                "breed": "Deutscher Schäferhund Mischling",
                "sex": "männlich, kastriert",
                "age_text": "03/2020",
                "external_id": "hund-bruno",
                "adoption_url": "https://daisyfamilyrescue.de/hund-bruno/",
                "primary_image_url": "https://example.com/bruno.jpg",
                "properties": {
                    "character_german": "menschenbezogen, verschmust, liebevoll",
                    "origin": "Nordmazedonien",
                    "current_location": "München",
                    "language": "de",
                },
            }
        ]

        # Apply translation and normalization
        translated_dogs = scraper._translate_and_normalize_dogs(raw_dogs)

        assert len(translated_dogs) == 1
        dog = translated_dogs[0]

        # Check core field translations
        assert dog["name"] == "Bruno"  # Normalized from BRUNO
        assert dog["breed"] == "German Shepherd Mixed Breed"
        assert dog["sex"] == "Male"
        assert dog["age_text"] == "Born 03/2020"

        # Check properties
        props = dog["properties"]
        assert props["language"] == "en"
        assert props["original_language"] == "de"
        assert props["translation_service"] == "daisy_family_rescue"
        assert "character" in props
        assert "people-oriented" in props["character"]
        assert "origin_translated" in props
        assert "North Macedonia" in props["origin_translated"]

    @pytest.mark.integration
    def test_detail_scraper_integration(self, scraper):
        """Test integration with detail scraper."""
        # Mock basic dog data from listing
        basic_dog_data = {
            "name": "Test Dog",
            "external_id": "hund-test",
            "adoption_url": "https://daisyfamilyrescue.de/hund-test/",
            "properties": {"source": "daisyfamilyrescue.de"},
        }

        # Mock detail scraper response
        mock_detailed_data = {
            "breed": "Mischling",
            "sex": "weiblich, kastriert",
            "age_text": "2 Jahre",
            "properties": {
                "character_german": "freundlich, verspielt",
                "origin": "Nordmazedonien",
                "weight_kg": 15,
                "height_cm": 45,
            },
        }

        with patch.object(
            DaisyFamilyRescueDogDetailScraper, "extract_dog_details"
        ) as mock_extract:
            mock_extract.return_value = mock_detailed_data

            # Test enhancement
            enhanced_data = scraper._enhance_with_detail_page(basic_dog_data)

            # Verify data was merged correctly
            assert enhanced_data["name"] == "Test Dog"  # From basic data
            assert enhanced_data["breed"] == "Mischling"  # From detail data
            assert enhanced_data["sex"] == "weiblich, kastriert"  # From detail data

            # Properties should be merged
            props = enhanced_data["properties"]
            assert props["source"] == "daisyfamilyrescue.de"  # From basic
            assert props["character_german"] == "freundlich, verspielt"  # From detail
            assert props["weight_kg"] == 15  # From detail
            assert props["height_cm"] == 45  # From detail

    @pytest.mark.integration
    def test_detail_scraper_error_handling(self, scraper):
        """Test error handling in detail scraper integration."""
        basic_dog_data = {
            "name": "Test Dog",
            "external_id": "hund-test",
            "adoption_url": "https://daisyfamilyrescue.de/hund-test/",
            "properties": {"source": "daisyfamilyrescue.de"},
        }

        # Mock detail scraper to raise exception
        with patch.object(
            DaisyFamilyRescueDogDetailScraper, "extract_dog_details"
        ) as mock_extract:
            mock_extract.side_effect = Exception("Connection error")

            # Should return basic data on error
            result = scraper._enhance_with_detail_page(basic_dog_data)
            assert result == basic_dog_data

    @pytest.mark.integration
    def test_data_validation_integration(self, scraper):
        """Test data validation integration in the scraping flow."""
        # Test valid data passes through
        valid_dog = {
            "name": "Valid Dog",
            "external_id": "valid-123",
            "adoption_url": "https://example.com/dog",
            "properties": {},
        }
        assert scraper._validate_dog_data(valid_dog) is True

        # Test invalid data is caught
        invalid_dog = {
            "name": "",
            "external_id": "test",
            "properties": {},
        }  # Invalid name
        assert scraper._validate_dog_data(invalid_dog) is False

    @pytest.mark.integration
    def test_translation_error_handling(self, scraper):
        """Test error handling in translation flow."""
        # Create data that might cause translation errors
        problematic_dogs = [
            {
                "name": "Test",
                "breed": None,  # None value
                "sex": "",  # Empty string
                "properties": {
                    "character_german": None,  # None value
                },
            }
        ]

        # Should handle errors gracefully
        result = scraper._translate_and_normalize_dogs(problematic_dogs)
        assert len(result) == 1
        assert result[0]["name"] == "Test"

    @pytest.mark.integration
    def test_collect_data_error_handling(self, scraper):
        """Test error handling in collect_data method."""
        # Mock Selenium to raise exception
        with patch.object(scraper, "_extract_with_selenium") as mock_extract:
            mock_extract.side_effect = Exception("WebDriver error")

            # Should return empty list on error
            result = scraper.collect_data()
            assert result == []

    @pytest.mark.integration
    def test_rate_limiting_integration(self, scraper):
        """Test rate limiting integration with BaseScraper."""
        import time

        # Test that respect_rate_limit works
        start_time = time.time()
        scraper.respect_rate_limit()
        elapsed = time.time() - start_time

        # Should respect the configured rate limit (0.1s in test config)
        assert elapsed >= 0.09, f"Rate limit not respected: {elapsed} seconds"

    @pytest.mark.integration
    def test_basescraper_method_integration(self, scraper):
        """Test integration with BaseScraper methods."""
        # Test configuration access methods
        org_name = scraper.get_organization_name()
        assert "Daisy Family Rescue" in org_name

        rate_delay = scraper.get_rate_limit_delay()
        assert rate_delay == 0.1

        # Test data quality assessment
        sample_data = [
            {
                "name": "Test Dog",
                "breed": "Mixed Breed",
                "age_text": "2 years",
                "external_id": "test-123",
                "sex": "Male",
                "primary_image_url": "https://example.com/image.jpg",
                "adoption_url": "https://example.com/adopt",
            }
        ]

        # Mock MetricsCollector for assess_data_quality
        mock_metrics_collector = Mock()
        mock_metrics_collector.assess_data_quality.return_value = 0.9
        scraper.metrics_collector = mock_metrics_collector

        quality_score = scraper.metrics_collector.assess_data_quality(sample_data)
        assert 0.8 <= quality_score <= 1.0, (
            f"Quality score should be high: {quality_score}"
        )

    @pytest.mark.integration
    def test_configuration_driven_initialization(self):
        """Test that scraper can be initialized through configuration system."""
        with (
            patch("scrapers.base_scraper.create_default_sync_service") as mock_sync,
            patch("scrapers.base_scraper.ConfigLoader") as mock_config_loader,
            patch("scrapers.base_scraper.R2Service"),
            patch.dict("os.environ", {"TESTING_VALIDATE_SYNC": "true"}),
        ):
            # Mock successful config loading
            mock_config = MagicMock()
            mock_config.name = "Daisy Family Rescue e.V."
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 2.5,
                "max_retries": 3,
                "timeout": 30,
            }
            mock_config.get_display_name.return_value = "Daisy Family Rescue e.V."

            mock_config_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(
                organization_id=12, was_created=True
            )
            mock_sync.return_value = mock_sync_service

            # Initialize through config system
            scraper = DaisyFamilyRescueScraper(config_id="daisyfamilyrescue")

            # Verify config values were applied
            assert scraper.rate_limit_delay == 2.5
            assert scraper.max_retries == 3
            assert scraper.timeout == 30
            assert scraper.organization_id == 12

    @pytest.mark.integration
    def test_legacy_initialization_compatibility(self):
        """Test backward compatibility with legacy organization_id initialization."""
        with (
            patch("scrapers.base_scraper.create_default_sync_service"),
            patch("scrapers.base_scraper.ConfigLoader"),
            patch("scrapers.base_scraper.R2Service"),
        ):
            # Test legacy mode
            scraper = DaisyFamilyRescueScraper(organization_id=12)

            assert scraper.organization_id == 12
            assert scraper.org_config is None
            # Should use default values
            assert scraper.rate_limit_delay == 1.0
            assert scraper.max_retries == 3
            assert scraper.timeout == 30
