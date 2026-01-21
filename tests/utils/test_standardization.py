from datetime import datetime

import pytest

from utils.standardization import (
    apply_standardization,
    get_size_from_breed,
    standardize_age,
    standardize_breed,
)


@pytest.mark.slow
@pytest.mark.slow
class TestBreedStandardization:
    def test_exact_breed_match(self):
        """Test exact matches against the breed mapping dictionary."""
        assert standardize_breed("labrador retriever") == (
            "Labrador Retriever",
            "Sporting",
            "Large",
        )
        # Beagle is Medium per AKC (20-30 lbs, 13-15 inches)
        assert standardize_breed("beagle") == ("Beagle", "Hound", "Medium")
        # German Shepherd Dog is the official AKC breed name
        assert standardize_breed("german shepherd") == (
            "German Shepherd Dog",
            "Herding",
            "Large",
        )

        # Fix for test_partial_breed_match

    def test_partial_breed_match(self):
        """Test partial matches that should be detected."""
        # "lab mix" is recognized as a Labrador cross with correct size
        result = standardize_breed("lab mix")
        assert result[0] == "Lab Mix"  # Capitalized input, not expanded alias
        assert result[1] == "Mixed"
        assert result[2] == "Large"  # Size from Labrador Retriever
        # Check that "golden mix" is recognized as Mixed type
        assert standardize_breed("golden mix")[1] == "Mixed"

    def test_unknown_breed(self):
        """Test handling of unknown breeds."""
        result = standardize_breed("unknown breed")
        # Returns capitalized input "Unknown Breed" when not in breed_data
        assert result[0] == "Unknown Breed"
        assert result[1] == "Unknown"
        assert result[2] is None

    # Fix for test_age_ranges
    def test_age_ranges(self):
        """Test parsing of age ranges."""
        result = standardize_age("1-2 years")
        assert result["age_category"] == "Young"
        assert result["age_min_months"] == 12  # 1 year = 12 months
        assert result["age_max_months"] == 24  # 2 years = 24 months

    def test_mixed_breeds(self):
        """Test various mixed breed descriptions."""
        assert standardize_breed("mixed breed")[:2] == ("Mixed Breed", "Mixed")
        assert standardize_breed("terrier mix")[:2] == ("Terrier Mix", "Mixed")

    def test_empty_or_none_breed(self):
        """Test handling of empty or None input."""
        assert standardize_breed("") == ("Unknown", "Unknown", None)
        assert standardize_breed(None) == ("Unknown", "Unknown", None)


@pytest.mark.slow
@pytest.mark.slow
class TestAgeStandardization:
    def test_years_format(self):
        """Test parsing of age expressed in years."""
        # Test "2 years"
        result = standardize_age("2 years")
        assert result["age_category"] == "Young"
        assert result["age_min_months"] == 24
        assert result["age_max_months"] > 24

        # Test "3.5 y/o"
        result = standardize_age("3.5 y/o")
        assert result["age_category"] == "Adult"
        assert result["age_min_months"] == 42

        # Test European format with comma
        result = standardize_age("2,5 years")
        assert result["age_category"] == "Young"
        assert result["age_min_months"] == 30

    def test_months_format(self):
        """Test parsing of age expressed in months."""
        # Test "6 months"
        result = standardize_age("6 months")
        assert result["age_category"] == "Puppy"
        assert result["age_min_months"] == 6
        assert result["age_max_months"] >= 6

        # Test "18 mo"
        result = standardize_age("18 mo")
        assert result["age_category"] == "Young"
        assert result["age_min_months"] == 18

    def test_weeks_format(self):
        """Test parsing of age expressed in weeks."""
        result = standardize_age("10 weeks")
        assert result["age_category"] == "Puppy"
        assert result["age_min_months"] in (2, 3)  # Approximately 2.3 months

    def test_descriptive_age(self):
        """Test parsing of descriptive age terms."""
        assert standardize_age("puppy")["age_category"] == "Puppy"
        assert standardize_age("young adult")["age_category"] == "Young"
        assert standardize_age("adult")["age_category"] == "Adult"
        assert standardize_age("senior")["age_category"] == "Senior"

    def test_direct_age_categories(self):
        """Test parsing of direct standardized age category names.

        This test FAILS for 'Young' due to a bug in parse_age_text function.
        The function handles 'Adult', 'Puppy', 'Senior' but not 'Young'.
        """
        # These should work (and currently do)
        assert standardize_age("Adult")["age_category"] == "Adult"
        assert standardize_age("Puppy")["age_category"] == "Puppy"
        assert standardize_age("Senior")["age_category"] == "Senior"

        # This FAILS - parse_age_text doesn't handle standalone "Young"
        result = standardize_age("Young")
        assert result["age_category"] == "Young", f"Expected 'Young', got {result['age_category']}"
        assert result["age_min_months"] == 12, f"Expected 12, got {result['age_min_months']}"
        assert result["age_max_months"] == 36, f"Expected 36, got {result['age_max_months']}"

        # Test case insensitive versions
        assert standardize_age("young")["age_category"] == "Young"

    def test_empty_age(self):
        """Test handling of empty age input."""
        result = standardize_age("")
        assert result["age_category"] is None
        assert result["age_min_months"] is None
        assert result["age_max_months"] is None

        result = standardize_age(None)
        assert result["age_category"] is None

    def test_birth_date_format_mm_yyyy(self):
        """Test parsing of birth date in MM/YYYY format."""
        # Test current year birth (should be very young)
        current_year = datetime.now().year
        birth_date = f"01/{current_year}"
        result = standardize_age(birth_date)

        # Should be categorized based on months since birth
        assert result["age_min_months"] is not None
        assert result["age_max_months"] is not None
        assert result["age_category"] in ["Puppy", "Young"]

        # Test 2-year-old dog (should be Young)
        birth_date = f"01/{current_year - 2}"
        result = standardize_age(birth_date)
        assert result["age_category"] == "Young"
        assert result["age_min_months"] >= 20  # At least 20 months old
        assert result["age_max_months"] <= 40  # Less than 40 months old

    def test_birth_date_format_born_mm_yyyy(self):
        """Test parsing of birth date with 'Born' prefix."""
        current_year = datetime.now().year

        # Test "Born MM/YYYY" format
        birth_date = f"Born 03/{current_year - 4}"
        result = standardize_age(birth_date)
        assert result["age_category"] == "Adult"
        assert result["age_min_months"] >= 45  # Around 4 years old

        # Test "Born MM/YYYY" for puppy
        birth_date = f"Born 11/{current_year}"
        result = standardize_age(birth_date)
        # Should be puppy if born recently this year
        expected_months = datetime.now().month - 11
        if expected_months <= 0:
            expected_months += 12  # Born last year
        if expected_months < 12:
            assert result["age_category"] == "Puppy"

    def test_birth_date_format_yyyy(self):
        """Test parsing of birth date with just year."""
        current_year = datetime.now().year

        # Test year-only format (assumes June birth)
        # Use 9 years ago to ensure Senior category regardless of current month
        # (8 years in January would only be ~91 months due to June assumption)
        birth_year = str(current_year - 9)
        result = standardize_age(birth_year)
        assert result["age_category"] == "Senior"
        assert result["age_min_months"] >= 96  # Around 9 years old = 108 months

    def test_senior_plus_years_format(self):
        """Test parsing of 'X + years' pattern used by Dogs Trust for senior dogs."""
        from utils.standardization import MAX_DOG_AGE_MONTHS

        # Test "8 + years" pattern - now uses finite max instead of None
        result = standardize_age("8 + years")
        assert result["age_category"] == "Senior"
        assert result["age_min_months"] == 96  # 8 years = 96 months
        assert result["age_max_months"] == MAX_DOG_AGE_MONTHS  # Finite max for system compatibility

        # Test with different spacing
        result = standardize_age("8+ years")
        assert result["age_category"] == "Senior"
        assert result["age_min_months"] == 96
        assert result["age_max_months"] == MAX_DOG_AGE_MONTHS

        # Test with uppercase
        result = standardize_age("8 + Years")
        assert result["age_category"] == "Senior"
        assert result["age_min_months"] == 96
        assert result["age_max_months"] == MAX_DOG_AGE_MONTHS

        # Test different senior age (10+ years)
        result = standardize_age("10 + years")
        assert result["age_category"] == "Senior"
        assert result["age_min_months"] == 120  # 10 years = 120 months
        assert result["age_max_months"] == MAX_DOG_AGE_MONTHS

    def test_german_unknown_age(self):
        """Test parsing of German 'Unbekannt' (Unknown)."""
        result = standardize_age("Unbekannt")
        assert result["age_category"] is None
        assert result["age_min_months"] is None
        assert result["age_max_months"] is None

    def test_birth_date_edge_cases(self):
        """Test edge cases for birth date parsing."""
        current_year = datetime.now().year

        # Test future birth date (should return None)
        future_birth = f"01/{current_year + 1}"
        result = standardize_age(future_birth)
        assert result["age_category"] is None

        # Test very old dog (should be Senior)
        old_birth = f"01/{current_year - 15}"
        result = standardize_age(old_birth)
        assert result["age_category"] == "Senior"


@pytest.mark.slow
@pytest.mark.slow
class TestSizeEstimation:
    def test_size_from_known_breed(self):
        """Test size estimation from known breeds."""
        assert get_size_from_breed("Labrador Retriever") == "Large"
        assert get_size_from_breed("Beagle") == "Small"
        assert get_size_from_breed("Great Dane") == "XLarge"
        assert get_size_from_breed("Yorkshire Terrier") == "Tiny"
        assert get_size_from_breed("Golden Retriever") == "Large"

    def test_size_from_mixed_breed(self):
        """Test size estimation from mixed breeds."""
        assert get_size_from_breed("Labrador Retriever Mix") == "Large"
        assert get_size_from_breed("Terrier Mix") is not None

    def test_unknown_breed_size(self):
        """Test size estimation for unknown breeds."""
        assert get_size_from_breed("Unknown Breed") is None
        assert get_size_from_breed("Some Random Breed") is None


@pytest.mark.slow
@pytest.mark.slow
class TestFullStandardization:
    def test_apply_standardization_complete_data(self):
        """Test full standardization with complete data."""
        animal_data = {"breed": "labrador retriever", "age_text": "2 years", "size": ""}
        result = apply_standardization(animal_data)

        assert result["standardized_breed"] == "Labrador Retriever"
        assert result["breed_group"] == "Sporting"
        assert result["age_category"] == "Young"
        assert result["age_min_months"] == 24
        assert result["standardized_size"] == "Large"

    def test_apply_standardization_partial_data(self):
        """Test standardization with partial data."""
        animal_data = {"breed": "mixed breed", "age_text": ""}
        result = apply_standardization(animal_data)

        assert result["standardized_breed"] == "Mixed Breed"
        assert result["breed_group"] == "Mixed"
        assert "age_category" not in result or result["age_category"] is None

    def test_apply_standardization_with_existing_size(self):
        """Test standardization respects existing size values."""
        animal_data = {
            "breed": "labrador retriever",
            "size": "Medium",
            "standardized_size": "Medium",  # Already set
        }
        result = apply_standardization(animal_data)

        assert result["standardized_breed"] == "Labrador Retriever"
        # Should keep existing value
        assert result["standardized_size"] == "Medium"
