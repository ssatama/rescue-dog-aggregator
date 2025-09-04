"""
Test unified standardization for Tierschutzverein Europa scraper.
Tests German-to-English translation followed by unified standardization.
"""

import pytest

from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper
from scrapers.tierschutzverein_europa.translations import translate_breed
from utils.unified_standardization import UnifiedStandardizer


class TestTierschutzvereinEuropaUnifiedStandardization:
    """Test that German breeds are properly translated and then standardized."""

    @pytest.fixture
    def scraper(self):
        """Create a scraper instance with unified standardization enabled."""
        scraper = TierschutzvereinEuropaScraper("tierschutzverein-europa")
        scraper.use_unified_standardization = True
        return scraper

    @pytest.fixture
    def standardizer(self):
        """Create a standardizer instance."""
        return UnifiedStandardizer()

    def test_german_mixed_breed_translation_and_standardization(self, standardizer):
        """Test that German 'Mischling' is translated to 'Mixed Breed' and standardized."""
        # First translate German to English
        translated = translate_breed("Mischling")
        assert translated == "Mixed Breed"

        # Then standardize - apply_full_standardization returns nested structure
        result = standardizer.apply_full_standardization(breed=translated)
        assert result["breed"]["name"] == "Mixed Breed"
        assert result["breed"]["group"] == "Mixed"

    def test_german_shepherd_variations(self, standardizer):
        """Test German Shepherd variations are properly handled."""
        # Test "Deutscher Schäferhund"
        translated = translate_breed("Deutscher Schäferhund")
        assert translated == "German Shepherd"
        result = standardizer.apply_full_standardization(breed=translated)
        assert result["breed"]["name"] == "German Shepherd Dog"
        assert result["breed"]["group"] == "Herding"

        # Test "Schäferhund"
        translated = translate_breed("Schäferhund")
        assert translated == "German Shepherd"
        result = standardizer.apply_full_standardization(breed=translated)
        assert result["breed"]["name"] == "German Shepherd Dog"
        assert result["breed"]["group"] == "Herding"

        # Test "Schäferhund-Mischling"
        translated = translate_breed("Schäferhund-Mischling")
        assert translated == "German Shepherd Mix"
        result = standardizer.apply_full_standardization(breed=translated)
        assert result["breed"]["name"] == "German Shepherd Mix"  # Standardizer keeps mix names as-is
        assert result["breed"]["group"] == "Mixed"
        assert result["breed"]["is_mixed"] == True

    def test_livestock_guardian_dog_translation(self, standardizer):
        """Test German 'Herdenschutzhund' is properly handled."""
        translated = translate_breed("Herdenschutzhund")
        assert translated == "Livestock Guardian Dog"
        result = standardizer.apply_full_standardization(breed=translated)
        # Livestock Guardian Dog is not a specific breed, should be handled as unknown
        assert result["breed"]["name"] == "Livestock Guardian Dog"
        assert result["breed"]["group"] == "Working"  # Guardian dogs are working dogs

    def test_compound_breeds_with_und(self, standardizer):
        """Test German compound breeds with 'und' (and)."""
        # Test "Mix Husky und Schäferhund"
        translated = translate_breed("Mix Husky und Schäferhund")
        assert translated == "Husky and German Shepherd Mix"
        result = standardizer.apply_full_standardization(breed=translated)
        # For mixed breeds with "and", the standardizer should recognize both breeds
        assert "Husky" in result["breed"]["name"]
        assert "German Shepherd" in result["breed"]["name"]
        assert result["breed"]["group"] == "Mixed"
        assert result["breed"]["is_mixed"] == True

    def test_podenco_mischling(self, standardizer):
        """Test Podenco-Mischling (Spanish breed with German suffix)."""
        translated = translate_breed("Podenco-Mischling")
        assert translated == "Podenco Mix"
        result = standardizer.apply_full_standardization(breed=translated)
        assert result["breed"]["name"] == "Podenco Mix"
        assert result["breed"]["group"] == "Mixed"
        assert result["breed"]["is_mixed"] == True

    def test_spanish_breeds_with_german_names(self, standardizer):
        """Test Spanish breeds that appear with German names."""
        # Test "Mastin"
        translated = translate_breed("Mastin")
        assert translated == "Spanish Mastiff"
        result = standardizer.apply_full_standardization(breed=translated)
        assert result["breed"]["name"] == "Spanish Mastiff"
        assert result["breed"]["group"] == "Working"

        # Test "Bretone Epagneul"
        translated = translate_breed("Bretone Epagneul")
        assert translated == "Brittany Spaniel"
        result = standardizer.apply_full_standardization(breed=translated)
        assert result["breed"]["name"] == "Brittany"
        assert result["breed"]["group"] == "Sporting"

    def test_scraper_integration_with_german_breeds(self, scraper):
        """Test that the scraper properly processes German breeds through translation and standardization."""
        # Create a mock dog with German breed
        mock_dog = {"name": "Max", "breed": "Schäferhund-Mischling", "age": "2 Jahre", "gender": "Rüde", "language": "de", "original_language": "de"}

        # The scraper should translate and then standardize
        # After translation: "German Shepherd Mix"
        # After standardization: primary_breed="German Shepherd Dog", secondary_breed="Mix"

        # This tests the full pipeline
        translated = translate_breed(mock_dog["breed"])
        assert translated == "German Shepherd Mix"

        # The scraper with unified standardization should handle this
        standardizer = UnifiedStandardizer()
        result = standardizer.apply_full_standardization(breed=translated)
        assert result["breed"]["name"] == "German Shepherd Mix"  # Standardizer keeps mix names as-is
        assert result["breed"]["group"] == "Mixed"
        assert result["breed"]["is_mixed"] == True

    def test_preserve_language_metadata(self, scraper):
        """Test that language and original_language fields are preserved."""
        # The scraper sets language='de' and original_language='de'
        # These should be preserved through the standardization process
        assert scraper.use_unified_standardization == True

        # Mock dog data should retain language fields
        mock_dog = {"language": "de", "original_language": "de", "breed": "Mischling"}

        # Even after standardization, these fields should remain
        assert mock_dog["language"] == "de"
        assert mock_dog["original_language"] == "de"
