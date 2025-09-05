"""Simple integration test for unified standardization."""

import pytest

from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.unit
class TestUnifiedStandardizationSimple:
    """Simple tests for unified standardization functionality."""

    def test_lurcher_to_hound_fix(self):
        """Test critical Lurcher -> Hound group fix."""
        standardizer = UnifiedStandardizer()

        # Test Lurcher breed mapping
        result = standardizer.apply_full_standardization(breed="Lurcher")
        assert result["breed"] == "Lurcher"
        assert result["breed_category"] == "Hound"  # Critical fix!
        assert result["breed_confidence"] >= 0.9

    def test_staffordshire_standardization(self):
        """Test Staffordshire Bull Terrier name standardization."""
        standardizer = UnifiedStandardizer()

        # Test various Staffy variations
        variations = ["Staffy", "Staffie", "Staff", "Staffordshire", "Staffordshire Terrier"]
        for variant in variations:
            result = standardizer.apply_full_standardization(breed=variant)
            assert result["breed"] == "Staffordshire Bull Terrier"
            assert result["breed_category"] == "Terrier"
            assert result["breed_confidence"] >= 0.8

    def test_designer_breeds(self):
        """Test designer breed handling."""
        standardizer = UnifiedStandardizer()

        # Test Labradoodle
        result = standardizer.apply_full_standardization(breed="Labradoodle")
        assert result["breed"] == "Labradoodle"
        assert result["breed_category"] == "Designer/Hybrid"
        assert result["primary_breed"] == "Labrador Retriever"
        assert result["secondary_breed"] == "Poodle"
        assert result["breed_type"] == "crossbreed"

        # Test Cockapoo
        result = standardizer.apply_full_standardization(breed="Cockapoo")
        assert result["breed"] == "Cockapoo"
        assert result["breed_category"] == "Designer/Hybrid"
        assert result["primary_breed"] == "Cocker Spaniel"
        assert result["secondary_breed"] == "Poodle"

    def test_age_standardization(self):
        """Test age parsing and standardization."""
        standardizer = UnifiedStandardizer()

        # Test various age formats
        result = standardizer.apply_full_standardization(age="2 years")
        assert result["age_min_months"] == 24
        assert result["age_max_months"] == 36  # 2 years gets expanded to 2-3 years range
        assert result["age_category"] == "Young"  # 2 years is categorized as Young

        result = standardizer.apply_full_standardization(age="puppy")
        assert result["age_category"] == "Puppy"
        assert result["age_min_months"] <= 12

        result = standardizer.apply_full_standardization(age="5-7 years")
        assert result["age_min_months"] == 60
        assert result["age_max_months"] == 84

    def test_size_standardization(self):
        """Test size standardization."""
        standardizer = UnifiedStandardizer()

        # Test various size formats
        result = standardizer.apply_full_standardization(size="medium")
        assert result["standardized_size"] == "Medium"

        result = standardizer.apply_full_standardization(size="Large")
        assert result["standardized_size"] == "Large"

        # Test breed-based size inference
        result = standardizer.apply_full_standardization(breed="Chihuahua", size=None)
        assert result["standardized_size"] == "Tiny"  # Chihuahua is Tiny, not Small

    def test_full_animal_standardization(self):
        """Test standardizing complete animal data."""
        standardizer = UnifiedStandardizer()

        # Test complete animal data standardization
        result = standardizer.apply_full_standardization(breed="Lurcher cross", age="3 years old", size="large")

        # Verify all fields are standardized
        assert result["breed"] == "Lurcher Cross"  # Cross is kept, not converted to Mix
        assert result["breed_category"] == "Hound"  # Lurcher Cross still gets Hound category
        assert result["primary_breed"] == "Lurcher Cross"
        assert result["age_min_months"] == 36
        assert result["age_category"] == "Adult"
        assert result["standardized_size"] == "Large"
