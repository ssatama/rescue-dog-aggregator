"""Test Woof Project scraper integration with unified standardization."""

from unittest.mock import patch


from scrapers.base_scraper import BaseScraper
from scrapers.woof_project.dogs_scraper import WoofProjectScraper
from utils.unified_standardization import UnifiedStandardizer


class TestWoofProjectUnifiedStandardization:
    """Test unified standardization for Woof Project scraper."""

    def test_scraper_inherits_from_base_scraper(self):
        """Verify Woof Project scraper properly inherits from BaseScraper."""
        assert issubclass(WoofProjectScraper, BaseScraper)

    def test_scraper_has_unified_standardizer(self):
        """Verify scraper initializes with UnifiedStandardizer."""
        scraper = WoofProjectScraper()
        assert hasattr(scraper, "standardizer")
        assert isinstance(scraper.standardizer, UnifiedStandardizer)

    def test_scraper_uses_unified_standardization_flag(self):
        """Verify scraper respects unified standardization feature flag."""
        scraper = WoofProjectScraper()
        assert hasattr(scraper, "use_unified_standardization")
        # Should default to True for base scraper
        assert scraper.use_unified_standardization is True

    def test_feature_flag_enables_unified_standardization(self):
        """Verify feature flag controls unified standardization."""
        from utils.feature_flags import is_scraper_standardization_enabled

        scraper = WoofProjectScraper()
        # Feature flag should be enabled for woof_project
        assert is_scraper_standardization_enabled("woof_project") is True

    def test_scraper_no_longer_imports_optimized_standardization(self):
        """Verify scraper doesn't import from optimized_standardization."""
        import scrapers.woof_project.dogs_scraper as module

        source = module.__file__
        with open(source, "r") as f:
            content = f.read()
        # Should NOT have these imports anymore after migration
        assert "from utils.optimized_standardization import" not in content

    def test_scraper_removes_standardized_fields_from_extraction(self):
        """Verify scraper no longer sets standardized_breed/size fields."""
        import scrapers.woof_project.dogs_scraper as module

        source = module.__file__
        with open(source, "r") as f:
            content = f.read()
        # These fields should be removed from the result dictionary
        assert '"standardized_breed":' not in content
        assert '"standardized_size":' not in content

    @patch("utils.feature_flags.is_unified_standardization_enabled")
    def test_process_animal_applies_unified_standardization(self, mock_flag):
        """Verify process_animal applies unified standardization."""
        mock_flag.return_value = True

        scraper = WoofProjectScraper()

        # Test data similar to what scraper extracts
        animal_data = {
            "name": "Bella",
            "breed": "labrador retriever mix",
            "age": "2 years old",  # Use "age" for unified standardization
            "size": "large",
            "sex": "Female",
            "external_id": "woof-123",
            "description": "Sweet dog",
            "animal_type": "dog",
            "status": "available",
        }

        # Process the animal
        result = scraper.process_animal(animal_data)

        # Verify standardization was applied (using actual field names from base_scraper)
        assert "primary_breed" in result
        assert "breed_category" in result
        assert "standardized_size" in result
        assert "standardization_confidence" in result

        # Check values (mixed breeds keep the original breed name)
        assert "labrador" in result["primary_breed"].lower()
        assert result["breed_category"] == "Mixed"  # Mixed for "mix" breeds
        assert result["standardized_size"] == "Large"
        assert result["standardization_confidence"] > 0.5  # Lower confidence for mixes

    @patch("utils.feature_flags.is_unified_standardization_enabled")
    def test_lurcher_standardization(self, mock_flag):
        """Test Lurcher breed is correctly mapped to Hound group."""
        mock_flag.return_value = True

        scraper = WoofProjectScraper()

        animal_data = {
            "name": "Shadow",
            "breed": "lurcher",
            "age": "3 years",  # Use "age" for unified standardization
            "size": "medium",
            "sex": "Male",
            "external_id": "woof-456",
            "animal_type": "dog",
        }

        result = scraper.process_animal(animal_data)

        # Verify Lurcher is correctly mapped to Hound group
        assert "primary_breed" in result
        assert "breed_category" in result
        assert result["primary_breed"] == "Lurcher"
        assert (
            result["breed_category"] == "Hound"
        )  # Critical: Lurcher should be Hound, not Unknown
        assert result["standardization_confidence"] > 0.9
