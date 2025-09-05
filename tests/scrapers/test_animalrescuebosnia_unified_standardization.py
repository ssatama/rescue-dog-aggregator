"""Test AnimalRescueBosnia scraper with unified standardization."""

import pytest

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import AnimalRescueBosniaScraper


class TestAnimalRescueBosniaUnifiedStandardization:
    """Test that AnimalRescueBosnia scraper works with unified standardization."""

    def test_scraper_inherits_from_base_scraper(self):
        """Verify the scraper properly inherits from BaseScraper."""
        from scrapers.base_scraper import BaseScraper

        scraper = AnimalRescueBosniaScraper(organization_id=1)
        assert isinstance(scraper, BaseScraper)

    def test_size_extraction_from_weight(self):
        """Test that size is correctly extracted from weight."""
        scraper = AnimalRescueBosniaScraper(organization_id=1)

        # Test weight-based size categories
        assert scraper._extract_size_from_weight("3.5 kg") == "Tiny"
        assert scraper._extract_size_from_weight("10 kg") == "Small"
        assert scraper._extract_size_from_weight("25 kg") == "Medium"
        assert scraper._extract_size_from_weight("40 kg") == "Large"
        assert scraper._extract_size_from_weight("50 kg") == "XLarge"
        assert scraper._extract_size_from_weight(None) is None
        assert scraper._extract_size_from_weight("invalid") is None

    def test_size_standardization_through_base_scraper(self):
        """Test that sizes are standardized through base scraper using real standardizer."""
        scraper = AnimalRescueBosniaScraper(organization_id=1)
        scraper.use_unified_standardization = True

        # Test data with size that should be standardized
        test_data = {"name": "Test Dog", "breed": "Labrador", "size": "Small", "age_text": "2 years", "sex": "Male"}  # Will be standardized

        # Process through base scraper standardization (using real UnifiedStandardizer)
        result = scraper.process_animal(test_data)

        # Verify standardization was applied
        assert "standardized_size" in result
        assert result["standardized_size"] == "Small"

    def test_age_calculation_preserved(self):
        """Test that age calculation from date of birth is preserved."""
        scraper = AnimalRescueBosniaScraper(organization_id=1)

        # Test various date formats - check for the presence of year/month keywords
        age_text = scraper._calculate_age_text("January 2022")
        assert age_text is not None
        assert "year" in age_text.lower() or "month" in age_text.lower()

        age_text = scraper._calculate_age_text("January 2023")
        assert age_text is not None
        assert "year" in age_text.lower() or "month" in age_text.lower()

        # Test that invalid formats return None
        assert scraper._calculate_age_text("invalid") is None
        assert scraper._calculate_age_text(None) is None

    def test_sex_standardization_preserved(self):
        """Test that sex standardization is preserved."""
        scraper = AnimalRescueBosniaScraper(organization_id=1)

        # Test sex standardization
        assert scraper._standardize_sex("M") == "Male"
        assert scraper._standardize_sex("F") == "Female"
        assert scraper._standardize_sex("male") == "Male"
        assert scraper._standardize_sex("female") == "Female"
        assert scraper._standardize_sex(None) is None

    def test_no_custom_standardization_methods(self):
        """Verify that custom standardization method was removed."""
        scraper = AnimalRescueBosniaScraper(organization_id=1)

        # Verify _standardize_size_for_database method doesn't exist
        assert not hasattr(scraper, "_standardize_size_for_database")

    def test_unified_standardization_enabled(self):
        """Test that unified standardization is enabled for AnimalRescueBosnia."""
        from utils.feature_flags import is_scraper_standardization_enabled

        # Verify the feature flag is enabled for animalrescuebosnia
        assert is_scraper_standardization_enabled("animalrescuebosnia") is True

    def test_size_categories_comprehensive(self):
        """Test comprehensive size categorization from various weights."""
        scraper = AnimalRescueBosniaScraper(organization_id=1)

        # Edge cases and boundaries
        assert scraper._extract_size_from_weight("4.9 kg") == "Tiny"  # < 5kg
        assert scraper._extract_size_from_weight("5 kg") == "Small"  # >= 5kg
        assert scraper._extract_size_from_weight("14.9 kg") == "Small"  # < 15kg
        assert scraper._extract_size_from_weight("15 kg") == "Medium"  # >= 15kg
        assert scraper._extract_size_from_weight("29.9 kg") == "Medium"  # < 30kg
        assert scraper._extract_size_from_weight("30 kg") == "Large"  # >= 30kg
        assert scraper._extract_size_from_weight("44.9 kg") == "Large"  # < 45kg
        assert scraper._extract_size_from_weight("45 kg") == "XLarge"  # >= 45kg
