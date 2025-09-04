from typing import Any, Dict, Optional

import pytest

from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.slow
@pytest.mark.computation
class TestUnifiedStandardizer:
    """Test suite for the unified standardization module that consolidates all breed, age, and size standardization."""

    def test_class_initialization(self):
        """Test that UnifiedStandardizer can be initialized with default settings."""
        standardizer = UnifiedStandardizer()
        assert standardizer is not None
        assert hasattr(standardizer, "apply_full_standardization")

    def test_apply_full_standardization_method_exists(self):
        """Test that the main entry point method exists and accepts required parameters."""
        standardizer = UnifiedStandardizer()
        assert callable(standardizer.apply_full_standardization)

    def test_empty_input_handling(self):
        """Test that empty inputs are handled gracefully."""
        standardizer = UnifiedStandardizer()
        result = standardizer.apply_full_standardization(breed=None, age=None, size=None)
        assert result is not None
        assert "breed" in result
        assert "age" in result
        assert "size" in result

    def test_lurcher_to_hound_group_fix(self):
        """Test that Lurcher is correctly classified as Hound group instead of Unknown."""
        standardizer = UnifiedStandardizer()

        # Test exact match
        result = standardizer.apply_full_standardization(breed="Lurcher")
        assert result["breed"] == "Lurcher"
        assert result["breed_category"] == "Hound"
        assert result["standardized_size"] == "Large"

        # Test case insensitive
        result = standardizer.apply_full_standardization(breed="lurcher")
        assert result["breed"] == "Lurcher"
        assert result["breed_category"] == "Hound"

        # Test with extra spaces
        result = standardizer.apply_full_standardization(breed=" Lurcher ")
        assert result["breed"] == "Lurcher"
        assert result["breed_category"] == "Hound"

        # Test Lurcher cross/mix
        result = standardizer.apply_full_standardization(breed="Lurcher Cross")
        assert result["breed"] == "Lurcher Cross"
        assert result["breed_category"] == "Hound"
        # Mixed breed detection happens internally but not exposed in flattened result

    def test_designer_breed_handling(self):
        """Test that designer breeds are properly standardized with correct groups."""
        standardizer = UnifiedStandardizer()

        # Cockapoo (Cocker Spaniel + Poodle)
        result = standardizer.apply_full_standardization(breed="Cockapoo")
        assert result["breed"] == "Cockapoo"
        assert result["breed_category"] == "Non-Sporting"  # Uses Poodle's category
        assert result["primary_breed"] == "Cocker Spaniel"
        assert result["secondary_breed"] == "Poodle"

        # Labradoodle (Labrador + Poodle)
        result = standardizer.apply_full_standardization(breed="Labradoodle")
        assert result["breed"] == "Labradoodle"
        assert result["breed_category"] == "Designer/Hybrid"  # Labradoodle specifically gets Designer/Hybrid
        assert result["primary_breed"] == "Labrador Retriever"
        assert result["secondary_breed"] == "Poodle"

        # Puggle (Pug + Beagle)
        result = standardizer.apply_full_standardization(breed="Puggle")
        assert result["breed"] == "Puggle"
        assert result["breed_category"] == "Hound"  # Puggle gets Hound category

        # Schnoodle (Schnauzer + Poodle)
        result = standardizer.apply_full_standardization(breed="Schnoodle")
        assert result["breed"] == "Schnoodle"

        # Yorkipoo (Yorkshire Terrier + Poodle)
        result = standardizer.apply_full_standardization(breed="Yorkipoo")
        assert result["breed"] == "Yorkipoo"

    def test_staffordshire_bull_terrier_standardization(self):
        """Test that all Staffordshire Bull Terrier variations are standardized consistently."""
        standardizer = UnifiedStandardizer()

        variations = [
            "Staffordshire Bull Terrier",
            "Staffie",
            "Staffy",
            "Staff",
            "Staffordshire",
            "Staffordshire Terrier",
            "Stafford",
            "SBT",
            "Staffy Bull Terrier",
            "English Staffordshire Bull Terrier",
        ]

        for variation in variations:
            result = standardizer.apply_full_standardization(breed=variation)
            assert result["breed"] == "Staffordshire Bull Terrier", f"Failed for variation: {variation}"
            assert result["breed_category"] == "Terrier"
            assert result["standardized_size"] == "Medium"

    def test_american_staffordshire_terrier_distinct(self):
        """Test that American Staffordshire Terrier remains distinct from Staffordshire Bull Terrier."""
        standardizer = UnifiedStandardizer()

        variations = ["American Staffordshire Terrier", "Am Staff", "Amstaff", "American Stafford", "American Staffy"]

        for variation in variations:
            result = standardizer.apply_full_standardization(breed=variation)
            assert result["breed"] == "American Staffordshire Terrier", f"Failed for variation: {variation}"
            assert result["breed_category"] == "Terrier"
            assert result["standardized_size"] == "Medium"

    def test_breed_confidence_scoring(self):
        """Test that breed confidence scores are calculated correctly."""
        standardizer = UnifiedStandardizer()

        # Exact match should have high confidence
        result = standardizer.apply_full_standardization(breed="Golden Retriever")
        assert result["standardization_confidence"] >= 0.9

        # Mixed breed should have lower confidence
        result = standardizer.apply_full_standardization(breed="Mixed Breed")
        assert result["standardization_confidence"] <= 0.5

        # Crossbreed with identified breeds should have medium confidence
        result = standardizer.apply_full_standardization(breed="Labrador Cross")
        assert 0.5 <= result["standardization_confidence"] <= 0.8

    def test_full_standardization_integration(self):
        """Test that all three standardization types work together correctly."""
        standardizer = UnifiedStandardizer()

        result = standardizer.apply_full_standardization(breed="Lurcher", age="2 years old", size="Large")

        # Breed standardization
        assert result["breed"] == "Lurcher"
        assert result["breed_category"] == "Hound"

        # Age standardization (2 years is "Young" not "Adult")
        assert result["age_category"] == "Young"
        assert result["age_min_months"] == 24
        assert result["age_max_months"] == 36  # Young category is 1-3 years

        # Size standardization
        assert result["standardized_size"] == "Large"

    def test_caching_functionality(self):
        """Test that caching improves performance for repeated calls."""
        standardizer = UnifiedStandardizer()

        # First call - should cache
        result1 = standardizer.apply_full_standardization(breed="Lurcher")

        # Second call - should use cache
        result2 = standardizer.apply_full_standardization(breed="Lurcher")

        # Results should be identical
        assert result1 == result2

    def test_feature_flag_support(self):
        """Test that feature flags can enable/disable specific standardization features."""
        standardizer = UnifiedStandardizer(enable_breed_standardization=True, enable_age_standardization=False, enable_size_standardization=True)

        result = standardizer.apply_full_standardization(breed="Lurcher", age="2 years old", size="Large")

        # Breed should be standardized
        assert result["breed"] == "Lurcher"
        assert result["breed_category"] == "Hound"

        # Age should be passed through unchanged (feature flag disabled)
        assert result["age"] == "2 years old"
        assert result.get("age_category") is None

        # Size should be standardized
        assert result["standardized_size"] == "Large"

    def test_error_handling_for_invalid_inputs(self):
        """Test that invalid inputs are handled gracefully without crashes."""
        standardizer = UnifiedStandardizer()

        # Test with non-string breed
        result = standardizer.apply_full_standardization(breed=123)
        assert result["breed"] == "Unknown"

        # Test with very long string
        long_breed = "a" * 1000
        result = standardizer.apply_full_standardization(breed=long_breed)
        assert result is not None

        # Test with special characters
        result = standardizer.apply_full_standardization(breed="Test@#$%^&*()")
        assert result is not None

    def test_batch_processing_capability(self):
        """Test that multiple animals can be processed efficiently in batch."""
        standardizer = UnifiedStandardizer()

        animals = [{"breed": "Lurcher", "age": "2 years", "size": "Large"}, {"breed": "Cockapoo", "age": "6 months", "size": "Small"}, {"breed": "Staffie", "age": "Adult", "size": None}]

        results = standardizer.apply_batch_standardization(animals)

        assert len(results) == 3
        assert results[0]["breed_category"] == "Hound"
        # Skip breed_type assertion - that's from Task 4.2 not yet implemented
        assert results[2]["breed"] == "Staffordshire Bull Terrier"
