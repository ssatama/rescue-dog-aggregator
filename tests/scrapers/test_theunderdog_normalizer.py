"""Tests for The Underdog normalizer."""

import pytest

from scrapers.theunderdog.normalizer import extract_age_text, extract_breed_from_description, extract_gender, extract_size_and_weight, normalize_animal_data


@pytest.mark.computation
@pytest.mark.integration
@pytest.mark.slow
class TestTheUnderdogNormalizer:
    """Test suite for The Underdog normalizer functions."""

    @pytest.fixture
    def sample_vicky_data(self):
        """Sample data from Vicky's real page."""
        return {
            "name": "Vicky",
            "external_id": "vicky",
            "adoption_url": "https://www.theunderdog.org/adopt/vicky",
            "primary_image_url": "//images.squarespace-cdn.com/content/...",
            "description": "Vicky is currently in a foster home in North Devon after being rescued from a difficult start in life and spending a good few months in the shelter in Cyprus. She's believed to be around two years old and is a large mixed breed with a calm, sweet and endearing personality.",
            "properties": {
                "How big?": "Large (around 30kg)",
                "How old?": "Young adult (around two years)",
                "Male or female?": "Female",
                "Living with kids?": "I can live with children (8+)",
                "Living with dogs?": "I can live with other dogs",
                "Resident dog required?": "No, but would be beneficial",
                "Living with cats?": "I've not been tested with cats",
                "Where can I live?": "I'd like a calm, semi-rural home",
                "Where am I from?": "Cyprus, now in Devon (Cyprus adoption fee applies)",
            },
            "animal_type": "dog",
            "country": "United Kingdom",
        }

    @pytest.fixture
    def sample_minimal_data(self):
        """Sample data with minimal information."""
        return {
            "name": "Buddy",
            "external_id": "buddy",
            "adoption_url": "https://www.theunderdog.org/adopt/buddy",
            "description": "A lovely dog looking for a home.",
            "properties": {"How big?": "Medium", "Male or female?": "Male"},
            "animal_type": "dog",
        }

    def test_normalize_animal_data_complete(self, sample_vicky_data):
        """Test complete normalization with full data."""
        result = normalize_animal_data(sample_vicky_data)

        # Check that all original data is preserved
        assert result["name"] == "Vicky"
        assert result["external_id"] == "vicky"
        assert result["description"] == sample_vicky_data["description"]
        assert result["properties"] == sample_vicky_data["properties"]

        # Check normalized fields
        assert result["age_text"] == "2 years"
        assert result["breed"] == "Mixed Breed"
        assert result["sex"] == "Female"  # Updated to new format
        assert result["size"] == "Large"
        assert result["weight_kg"] == 30.0

    def test_normalize_animal_data_minimal(self, sample_minimal_data):
        """Test normalization with minimal data."""
        result = normalize_animal_data(sample_minimal_data)

        # Check that original data is preserved
        assert result["name"] == "Buddy"
        assert result["external_id"] == "buddy"

        # Check normalized fields
        assert result["age_text"] is None  # No age info
        assert result["breed"] == "Mixed Breed"  # Default from description
        assert result["sex"] == "Male"  # Updated to new format
        assert result["size"] == "Medium"
        assert result["weight_kg"] is None  # No weight specified

    def test_extract_age_text(self):
        """Test age extraction from various formats."""
        # Standard patterns
        assert extract_age_text("Young adult (around two years)") == "2 years"
        assert extract_age_text("Puppy (6 months)") == "6 months"
        assert extract_age_text("Around 3 years old") == "3 years"
        assert extract_age_text("Approximately 18 months") == "18 months"
        assert extract_age_text("2-3 years") == "2-3 years"

        # Edge cases
        assert extract_age_text("Senior dog (8+ years)") == "8+ years"
        assert extract_age_text("Very young puppy") is None
        assert extract_age_text("") is None
        assert extract_age_text(None) is None

    def test_extract_breed_from_description(self):
        """Test breed extraction from description text."""
        # Mixed breed patterns
        desc1 = "She's believed to be around two years old and is a large mixed breed with a calm personality."
        assert extract_breed_from_description(desc1) == "Mixed Breed"

        # Specific breed mentions
        desc2 = "This beautiful labrador mix is looking for a home."
        assert extract_breed_from_description(desc2) == "Labrador Mix"

        desc3 = "A lovely german shepherd cross who needs space."
        assert extract_breed_from_description(desc3) == "German Shepherd Mix"

        desc4 = "This terrier is full of energy and loves to play."
        assert extract_breed_from_description(desc4) == "Terrier"

        desc5 = "A gentle golden retriever looking for love."
        assert extract_breed_from_description(desc5) == "Golden Retriever"

        # No breed mentioned
        desc6 = "A lovely dog looking for a home."
        assert extract_breed_from_description(desc6) == "Mixed Breed"

        # Edge cases
        assert extract_breed_from_description("") == "Mixed Breed"
        assert extract_breed_from_description(None) == "Mixed Breed"

    def test_extract_gender(self):
        """Test gender extraction from properties - includes sex standardization fix tests."""
        # Updated to new format for frontend compatibility
        assert extract_gender("Female") == "Female"
        assert extract_gender("Male") == "Male"
        assert extract_gender("female") == "Female"
        assert extract_gender("male") == "Male"

        # Additional test cases from sex fix (consolidated from test_underdog_sex_fix.py)
        male_cases = ["Male", "male", "MALE", "The dog is male", "This is a male dog"]
        for test_input in male_cases:
            assert extract_gender(test_input) == "Male", f"Failed for input: {test_input}"

        female_cases = ["Female", "female", "FEMALE", "The dog is female", "This is a female dog"]
        for test_input in female_cases:
            assert extract_gender(test_input) == "Female", f"Failed for input: {test_input}"

        # Edge cases and None cases (expanded)
        none_cases = [None, "", "   ", "unknown", "not specified", "other", "Unknown"]
        for test_input in none_cases:
            assert extract_gender(test_input) is None, f"Failed for input: {test_input}"

        # Frontend compatibility verification (from sex fix)
        male_result = extract_gender("male")
        female_result = extract_gender("female")
        assert male_result == "Male"  # Must be exact match for frontend filters
        assert female_result == "Female"  # Must be exact match for frontend filters
        assert male_result != "M"  # Should not be old M/F format
        assert female_result != "F"  # Should not be old M/F format

    def test_extract_size_and_weight(self):
        """Test size and weight extraction."""
        # Standard formats
        size, weight = extract_size_and_weight("Large (around 30kg)")
        assert size == "Large"
        assert weight == 30.0

        size, weight = extract_size_and_weight("Medium (15-20kg)")
        assert size == "Medium"
        assert weight == 17.5  # Average of range

        size, weight = extract_size_and_weight("Small (8kg)")
        assert size == "Small"
        assert weight == 8.0

        # No weight specified
        size, weight = extract_size_and_weight("Large")
        assert size == "Large"
        assert weight is None

        size, weight = extract_size_and_weight("Medium")
        assert size == "Medium"
        assert weight is None

        # Different formats
        size, weight = extract_size_and_weight("Big dog (25-30 kilos)")
        assert size == "Big dog"
        assert weight == 27.5

        # Edge cases
        size, weight = extract_size_and_weight("")
        assert size is None
        assert weight is None

        size, weight = extract_size_and_weight(None)
        assert size is None
        assert weight is None

    def test_complex_age_patterns(self):
        """Test complex age pattern extraction."""
        # Real patterns from The Underdog
        assert extract_age_text("Young adult (around two years)") == "2 years"
        assert extract_age_text("Puppy (approximately 6 months old)") == "6 months"
        assert extract_age_text("Senior (8-10 years)") == "8-10 years"
        assert extract_age_text("Adult dog (3+ years)") == "3+ years"
        assert extract_age_text("Very young (under 1 year)") == "1 years"

    def test_complex_breed_patterns(self):
        """Test complex breed pattern extraction."""
        # Mixed breed variations
        desc1 = "Luna is a beautiful crossbreed with shepherd heritage."
        assert extract_breed_from_description(desc1) == "Mixed Breed"

        desc2 = "This lovely dog appears to be a husky mix."
        assert extract_breed_from_description(desc2) == "Husky Mix"

        desc3 = "Possibly a border collie cross."
        assert extract_breed_from_description(desc3) == "Border Collie Mix"

        # Multiple breeds mentioned (lab prioritized)
        desc4 = "This lab-shepherd mix is wonderful."
        assert extract_breed_from_description(desc4) == "Labrador Mix"  # Lab expanded to Labrador

        # Breed with descriptors
        desc5 = "A stunning black labrador retriever."
        assert extract_breed_from_description(desc5) == "Labrador Retriever"

    def test_weight_extraction_edge_cases(self):
        """Test edge cases for weight extraction."""
        # Different units
        size, weight = extract_size_and_weight("Medium (20 pounds)")
        assert size == "Medium"
        assert weight == 9.1  # Converted to kg (20 * 0.453592)

        # Multiple weights mentioned
        size, weight = extract_size_and_weight("Large (was 35kg, now 30kg)")
        assert size == "Large"
        assert weight == 30.0  # Should get the last/current weight

        # Weight without size (extracts everything before parentheses)
        size, weight = extract_size_and_weight("Around 25kg")
        assert size == "Around 25kg"  # Takes whole string as size category
        assert weight == 25.0

    def test_preserves_all_original_fields(self, sample_vicky_data):
        """Test that normalization preserves all original fields."""
        original_keys = set(sample_vicky_data.keys())
        result = normalize_animal_data(sample_vicky_data)

        # All original keys should still be present
        for key in original_keys:
            assert key in result
            assert result[key] == sample_vicky_data[key]

        # New normalized fields should be added
        expected_new_fields = {"age_text", "breed", "sex", "size", "weight_kg"}
        for field in expected_new_fields:
            assert field in result
