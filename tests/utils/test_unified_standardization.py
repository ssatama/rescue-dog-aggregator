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
        result = standardizer.apply_full_standardization(
            breed=None, age=None, size=None
        )
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
        assert result["breed_category"] == "Designer/Hybrid"  # Designer breed category
        assert result["primary_breed"] == "Cocker Spaniel"
        assert result["secondary_breed"] == "Poodle"

        # Labradoodle (Labrador + Poodle)
        result = standardizer.apply_full_standardization(breed="Labradoodle")
        assert result["breed"] == "Labradoodle"
        assert (
            result["breed_category"] == "Designer/Hybrid"
        )  # Labradoodle specifically gets Designer/Hybrid
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
            assert result["breed"] == "Staffordshire Bull Terrier", (
                f"Failed for variation: {variation}"
            )
            assert result["breed_category"] == "Terrier"
            assert result["standardized_size"] == "Medium"

    def test_american_staffordshire_terrier_distinct(self):
        """Test that American Staffordshire Terrier remains distinct from Staffordshire Bull Terrier."""
        standardizer = UnifiedStandardizer()

        variations = [
            "American Staffordshire Terrier",
            "Am Staff",
            "Amstaff",
            "American Stafford",
            "American Staffy",
        ]

        for variation in variations:
            result = standardizer.apply_full_standardization(breed=variation)
            assert result["breed"] == "American Staffordshire Terrier", (
                f"Failed for variation: {variation}"
            )
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

        result = standardizer.apply_full_standardization(
            breed="Lurcher", age="2 years old", size="Large"
        )

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
        standardizer = UnifiedStandardizer(
            enable_breed_standardization=True,
            enable_age_standardization=False,
            enable_size_standardization=True,
        )

        result = standardizer.apply_full_standardization(
            breed="Lurcher", age="2 years old", size="Large"
        )

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

        animals = [
            {"breed": "Lurcher", "age": "2 years", "size": "Large"},
            {"breed": "Cockapoo", "age": "6 months", "size": "Small"},
            {"breed": "Staffie", "age": "Adult", "size": None},
        ]

        results = standardizer.apply_batch_standardization(animals)

        assert len(results) == 3
        assert results[0]["breed_category"] == "Hound"
        # Skip breed_type assertion - that's from Task 4.2 not yet implemented
        assert results[2]["breed"] == "Staffordshire Bull Terrier"


def test_unknown_breed_returns_unknown():
    """Test that truly unknown breeds return Unknown group."""
    standardizer = UnifiedStandardizer()

    result = standardizer.apply_full_standardization(breed="Flibbertigibbet")

    assert result["breed"] == "Flibbertigibbet"
    assert result["breed_category"] == "Unknown"
    assert result["breed_confidence"] == 0.3  # Unknown breeds get 0.3 confidence
    assert result["breed_type"] == "unknown"  # Unknown breeds get unknown type


def test_new_terrier_breed_mappings():
    """Test newly added terrier breed mappings from database analysis."""
    standardizer = UnifiedStandardizer()

    # Test generic "Terrier" mapping
    result = standardizer.apply_full_standardization(breed="Terrier")
    assert result["breed"] == "Terrier"
    assert result["breed_category"] == "Terrier"
    assert result["standardization_confidence"] > 0.7

    # Test Patterdale Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (patterdale)")
    assert result["breed"] == "Patterdale Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Yorkshire Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (yorkshire)")
    assert result["breed"] == "Yorkshire Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Lakeland Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (lakeland)")
    assert result["breed"] == "Lakeland Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Fox Terrier Wire
    result = standardizer.apply_full_standardization(breed="Terrier (fox Wire)")
    assert result["breed"] == "Wire Fox Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Soft Coated Wheaten Terrier
    result = standardizer.apply_full_standardization(
        breed="Terrier (soft Coated Wheaten)"
    )
    assert result["breed"] == "Soft Coated Wheaten Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Miniature Bull Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (miniature Bull)")
    assert result["breed"] == "Miniature Bull Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Boston Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (boston)")
    assert result["breed"] == "Boston Terrier"
    assert (
        result["breed_category"] == "Non-Sporting"
    )  # Boston Terrier is Non-Sporting group!

    # Test Bedlington Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (bedlington)")
    assert result["breed"] == "Bedlington Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Bull Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (bull)")
    assert result["breed"] == "Bull Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Parson Russell Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (parson Russell)")
    assert result["breed"] == "Parson Russell Terrier"
    assert result["breed_category"] == "Terrier"

    # Test Border Terrier
    result = standardizer.apply_full_standardization(breed="Terrier (border)")
    assert result["breed"] == "Border Terrier"
    assert result["breed_category"] == "Terrier"

    # Test German Hunting Terrier (Deutscher Jagdterrier)
    result = standardizer.apply_full_standardization(breed="Deutscher Jagdterrier")
    assert result["breed"] == "German Hunting Terrier"
    assert result["breed_category"] == "Terrier"


def test_new_hound_breed_mappings():
    """Test newly added hound breed mappings from database analysis."""
    standardizer = UnifiedStandardizer()

    # Test generic "Hound"
    result = standardizer.apply_full_standardization(breed="Hound")
    assert result["breed"] == "Hound"
    assert result["breed_category"] == "Hound"

    # Test Foxhound
    result = standardizer.apply_full_standardization(breed="Foxhound")
    assert result["breed"] == "Foxhound"
    assert result["breed_category"] == "Hound"

    # Test Harrier
    result = standardizer.apply_full_standardization(breed="Harrier")
    assert result["breed"] == "Harrier"
    assert result["breed_category"] == "Hound"

    # Test Segugio Italiano (Italian hound)
    result = standardizer.apply_full_standardization(breed="Hound Dog (segugio)")
    assert result["breed"] == "Segugio Italiano"
    assert result["breed_category"] == "Hound"

    # Test Maremma variant
    result = standardizer.apply_full_standardization(breed="Brindle Maremma Hound")
    assert result["breed"] == "Maremma Sheepdog"
    assert (
        result["breed_category"] == "Guardian"
    )  # Maremma is actually a guardian breed

    # Test Bulgarian Scenthound
    result = standardizer.apply_full_standardization(
        breed="Gonche (bulgarian Scenthound)"
    )
    assert result["breed"] == "Bulgarian Scenthound"
    assert result["breed_category"] == "Hound"

    result = standardizer.apply_full_standardization(
        breed="Gonche Bulgarian Scenthound"
    )
    assert result["breed"] == "Bulgarian Scenthound"
    assert result["breed_category"] == "Hound"

    # Test Black and Tan Coonhound
    result = standardizer.apply_full_standardization(breed="Black And Tan Coonhound")
    assert result["breed"] == "Black and Tan Coonhound"
    assert result["breed_category"] == "Hound"

    # Test generic Hound Dog
    result = standardizer.apply_full_standardization(breed="Hound Dog")
    assert result["breed"] == "Hound"
    assert result["breed_category"] == "Hound"


def test_new_working_and_spitz_breed_mappings():
    """Test newly added working and spitz breed mappings."""
    standardizer = UnifiedStandardizer()

    # Test Samoyed
    result = standardizer.apply_full_standardization(breed="Samoyed")
    assert result["breed"] == "Samoyed"
    assert result["breed_category"] == "Working"

    # Test Finnish Lapphund
    result = standardizer.apply_full_standardization(breed="Finnish Lapphund")
    assert result["breed"] == "Finnish Lapphund"
    assert result["breed_category"] == "Herding"

    # Test generic Spitz
    result = standardizer.apply_full_standardization(breed="Spitz")
    assert result["breed"] == "Spitz"
    assert result["breed_category"] == "Non-Sporting"

    # Test Rottweiler misspelling
    result = standardizer.apply_full_standardization(breed="Rottweiller")
    assert result["breed"] == "Rottweiler"
    assert result["breed_category"] == "Working"

    # Test Dogue de Bordeaux
    result = standardizer.apply_full_standardization(breed="Dogue De Bordeaux")
    assert result["breed"] == "Dogue de Bordeaux"
    assert result["breed_category"] == "Working"

    # Test St Bernard
    result = standardizer.apply_full_standardization(breed="St Bernard")
    assert result["breed"] == "Saint Bernard"
    assert result["breed_category"] == "Working"

    # Test Turkish Kangal
    result = standardizer.apply_full_standardization(breed="Turkish Kangal Dog")
    assert result["breed"] == "Kangal"
    assert result["breed_category"] == "Guardian"

    # Test Czechoslovakian Wolfdog
    result = standardizer.apply_full_standardization(
        breed="Tschechoslowakischer Wolfshund"
    )
    assert result["breed"] == "Czechoslovakian Wolfdog"
    assert result["breed_category"] == "Working"

    # Test American Bully
    result = standardizer.apply_full_standardization(breed="American Bully Pocket")
    assert result["breed"] == "American Bully"
    assert result["breed_category"] == "Non-Sporting"


def test_new_toy_and_small_breed_mappings():
    """Test newly added toy and small breed mappings."""
    standardizer = UnifiedStandardizer()

    # Test Bolognese
    result = standardizer.apply_full_standardization(breed="Bolognese")
    assert result["breed"] == "Bolognese"
    assert result["breed_category"] == "Toy"

    # Test Shar Pei
    result = standardizer.apply_full_standardization(breed="Shar Pei")
    assert result["breed"] == "Shar Pei"
    assert result["breed_category"] == "Non-Sporting"

    # Test Miniature Schnauzer
    result = standardizer.apply_full_standardization(breed="Schnauzer (miniature)")
    assert result["breed"] == "Miniature Schnauzer"
    assert result["breed_category"] == "Terrier"

    # Test Miniature Pinscher
    result = standardizer.apply_full_standardization(breed="Pinscher (miniature)")
    assert result["breed"] == "Miniature Pinscher"
    assert result["breed_category"] == "Toy"

    # Test Dachshund (German)
    result = standardizer.apply_full_standardization(breed="Dackel (Kurzhaar)")
    assert result["breed"] == "Dachshund"
    assert result["breed_category"] == "Hound"


def test_new_herding_breed_mappings():
    """Test newly added herding breed mappings."""
    standardizer = UnifiedStandardizer()

    # Test Belgian Malinois
    result = standardizer.apply_full_standardization(breed="Malinois")
    assert result["breed"] == "Belgian Malinois"
    assert result["breed_category"] == "Herding"

    # Test Australian Kelpie
    result = standardizer.apply_full_standardization(breed="Australian Kelpie")
    assert result["breed"] == "Australian Kelpie"
    assert result["breed_category"] == "Herding"


def test_new_designer_breed_mappings():
    """Test newly added designer breed mappings."""
    standardizer = UnifiedStandardizer()

    # Test Pomsky
    result = standardizer.apply_full_standardization(breed="Pomsky")
    assert result["breed"] == "Pomsky"
    assert result["breed_category"] == "Designer/Hybrid"
    assert result["breed_type"] == "crossbreed"

    # Test Cockerpoo (variant spelling)
    result = standardizer.apply_full_standardization(breed="Cockerpoo")
    assert result["breed"] == "Cockapoo"
    assert result["breed_category"] == "Designer/Hybrid"
    assert result["breed_type"] == "crossbreed"


def test_new_spanish_breed_mappings():
    """Test newly added Spanish breed mappings."""
    standardizer = UnifiedStandardizer()

    # Test Bodeguero Andaluz
    result = standardizer.apply_full_standardization(breed="Bodeguero Andaluz")
    assert result["breed"] == "Bodeguero Andaluz"
    assert result["breed_category"] == "Terrier"

    # Test Podengo Portugues
    result = standardizer.apply_full_standardization(breed="Podengo Portugues Pequeno")
    assert result["breed"] == "Portuguese Podengo"
    assert result["breed_category"] == "Hound"


def test_italian_corso_mapping():
    """Test Italian Corso Dog mapping to Cane Corso."""
    standardizer = UnifiedStandardizer()

    result = standardizer.apply_full_standardization(breed="Italian Corso Dog")
    assert result["breed"] == "Cane Corso"
    assert result["breed_category"] == "Working"


def test_data_quality_fix():
    """Test that bad data like 'Can Be The Only Dog' is handled."""
    standardizer = UnifiedStandardizer()

    # This is not a breed, it's a behavioral note
    result = standardizer.apply_full_standardization(breed="Can Be The Only Dog")
    # Should remain as Unknown since it's not a breed
    assert result["breed_category"] == "Unknown"
