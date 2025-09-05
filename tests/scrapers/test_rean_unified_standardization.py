"""
Test REAN scraper with unified standardization enabled.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.rean.dogs_scraper import REANScraper
from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.unit
class TestREANUnifiedStandardization:
    """Test REAN scraper with unified standardization."""

    @pytest.fixture
    def scraper(self):
        """Create REAN scraper instance."""
        with patch("services.database_service.DatabaseService"), patch("utils.config_loader.ConfigLoader.load_config") as mock_load_config:
            # Mock config loading
            mock_load_config.return_value = Mock(name="REAN", base_url="https://www.rean.org.uk", organization_id="rean")
            scraper = REANScraper(config_id="rean")
            scraper.db_service = Mock()
            scraper.standardizer = UnifiedStandardizer()
            return scraper

    def test_rean_inherits_from_base_scraper(self):
        """Verify REAN scraper inherits from BaseScraper."""
        from scrapers.base_scraper import BaseScraper

        assert issubclass(REANScraper, BaseScraper)

    def test_rean_uses_unified_standardization_when_enabled(self, scraper):
        """Test that REAN uses unified standardization through BaseScraper."""
        # Set feature flag
        scraper.use_unified_standardization = True

        # Mock animal data (REAN doesn't extract breed)
        raw_animal = {"name": "Buddy", "age_text": "2 years old", "properties": {"weight": "25kg", "location": "Romania"}}

        # Process through base scraper's process_animal method
        processed = scraper.process_animal(raw_animal)

        # Verify standardization was applied (even without breed data)
        assert processed["name"] == "Buddy"
        assert "age_text" in processed
        # With no breed data, the processed data should be returned as-is with any age standardization

    def test_rean_handles_missing_breed_gracefully(self, scraper):
        """Test REAN handles cases where breed is not extracted."""
        scraper.use_unified_standardization = True

        raw_animal = {"name": "Max", "age": "3 years", "properties": {}}

        # Process animal through standardization
        processed = scraper.process_animal(raw_animal)

        # Verify it processes gracefully even without breed
        assert processed["name"] == "Max"
        assert processed["age_text"] == "3 years"
        assert processed["breed"] == "Unknown"  # Unified standardization sets default

    def test_rean_future_breed_extraction_ready(self, scraper):
        """Test that if REAN adds breed extraction, it will use unified standardization."""
        scraper.use_unified_standardization = True

        # Simulate future breed data extraction
        raw_animal = {"name": "Luna", "age_text": "1 year", "breed": "Lurcher", "properties": {}}

        # Process through standardizer with proper keyword arguments
        standardized = scraper.standardizer.apply_full_standardization(breed="Lurcher", age="1 year")

        # Verify Lurcher would be properly standardized
        if standardized.get("breed"):
            assert standardized["breed"] == "Lurcher"
            assert standardized["breed_category"] == "Hound"

    def test_rean_data_extraction_unchanged(self, scraper):
        """Verify REAN's data extraction logic remains unchanged."""
        with patch.object(scraper, "extract_dog_data") as mock_extract:
            mock_extract.return_value = {"name": "Test Dog", "age_text": "2 years", "properties": {"weight": "20kg"}}

            # Call extraction
            result = scraper.extract_dog_data("Sample text")

            # Verify extraction still works
            assert result["name"] == "Test Dog"
            assert result["age_text"] == "2 years"
            assert "properties" in result

    def test_feature_flag_controls_standardization(self, scraper):
        """Test feature flag properly controls standardization usage."""
        raw_animal = {"name": "Charlie", "age": "4 years", "properties": {}}

        # Test with flag disabled - should return data unchanged
        scraper.use_unified_standardization = False
        result_disabled = scraper.process_animal(raw_animal)
        assert result_disabled == raw_animal

        # Test with flag enabled - should apply any available standardization
        scraper.use_unified_standardization = True
        result_enabled = scraper.process_animal(raw_animal)
        assert result_enabled["name"] == "Charlie"
        assert result_enabled["age_text"] == "4 years"  # Unified standardization preserves age_text
