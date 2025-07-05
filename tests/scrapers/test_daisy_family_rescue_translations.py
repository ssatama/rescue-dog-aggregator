"""Tests for Daisy Family Rescue German to English translations.

All test data is based on real content from the Daisy Family Rescue website
to ensure 100% coverage. Tests also verify compatibility with base_scraper.py
standardization methods.
"""

import pytest

from scrapers.daisy_family_rescue.translations import (
    clear_translation_cache,
    get_translation_cache_stats,
    normalize_name,
    translate_age,
    translate_breed,
    translate_character_traits,
    translate_compatibility,
    translate_description,
    translate_dog_data,
    translate_gender,
    translate_ideal_home,
    translate_location,
)
from utils.standardization import standardize_age, standardize_breed


class TestNameNormalization:
    """Test name normalization and capitalization."""

    def test_normalize_name_cases(self):
        """Test name normalization for various cases."""
        test_cases = [
            ("BRUNO", "Bruno"),
            ("luna", "Luna"),
            ("MAX-MUELLER", "Max-Mueller"),
            ("marie claire", "Marie Claire"),
            ("", None),
            (None, None),
        ]

        for input_name, expected in test_cases:
            result = normalize_name(input_name)
            assert result == expected, f"Failed for input: {input_name}"


class TestGenderTranslation:
    """Test translation of German gender terms."""

    def test_translate_all_genders_from_daisy(self):
        """Test ALL gender values from Daisy Family Rescue."""
        # Based on actual content from the website
        daisy_genders = {
            "männlich, kastriert": "Male",
            "weiblich, kastriert": "Female",
            "männlich": "Male",
            "weiblich": "Female",
            "Rüde": "Male",
            "Hündin": "Female",
        }

        for german, english in daisy_genders.items():
            assert translate_gender(german) == english, f"Failed for: {german}"

    def test_translate_gender_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_gender(None) is None
        assert translate_gender("") is None

    def test_translate_gender_case_insensitive(self):
        """Test that gender translation is case-insensitive."""
        assert translate_gender("MÄNNLICH") == "Male"
        assert translate_gender("weiblich") == "Female"


class TestAgeTranslation:
    """Test translation and parsing of German age patterns."""

    def test_translate_age_patterns_from_daisy(self):
        """Test age patterns found on Daisy Family Rescue."""
        # Based on actual content patterns
        daisy_ages = {
            "03/2020": "Born 03/2020",
            "05/2021": "Born 05/2021",
            "2 Jahre": "2 years",
            "3 Jahre": "3 years",
            "1 Jahr": "1 year",
            "18 Monate": "18 months",
            "6 Monate": "6 months",
        }

        for german, english in daisy_ages.items():
            result = translate_age(german)
            assert result == english, f"Failed for: {german} -> expected {english}, got {result}"

    def test_translate_age_handles_none(self):
        """Test that None/empty values are handled gracefully."""
        assert translate_age(None) is None
        assert translate_age("") is None
        assert translate_age("unknown") is None


class TestBreedTranslation:
    """Test translation of German breed names."""

    def test_translate_breeds_from_daisy(self):
        """Test breed translations found on Daisy Family Rescue."""
        # Based on actual breeds from the website
        daisy_breeds = {
            "Deutscher Schäferhund Mischling": "German Shepherd Mixed Breed",
            "Mischling": "Mixed Breed",
            "Golden Retriever": "Golden Retriever",
            "Labrador": "Labrador",
            "Border Collie": "Border Collie",
            "Husky": "Husky",
            "Terrier": "Terrier",
        }

        for german, english in daisy_breeds.items():
            result = translate_breed(german)
            assert result == english, f"Failed for: {german}"

    def test_translate_breed_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_breed(None) is None
        assert translate_breed("") is None


class TestLocationTranslation:
    """Test translation of German location names."""

    def test_translate_locations_from_daisy(self):
        """Test location translations from Daisy Family Rescue."""
        # Based on actual locations from the website
        daisy_locations = {
            "Nordmazedonien": "North Macedonia",
            "Deutschland": "Germany",
            "München": "Munich",
            "Berlin": "Berlin",
            "Hamburg": "Hamburg",
            "Frankfurt": "Frankfurt",
        }

        for german, english in daisy_locations.items():
            result = translate_location(german)
            assert result == english, f"Failed for: {german}"

    def test_translate_location_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_location(None) is None
        assert translate_location("") is None


class TestCharacterTranslation:
    """Test translation of German character trait descriptions."""

    def test_translate_character_traits_from_daisy(self):
        """Test character trait translations from actual website content."""
        # Based on real Steckbrief data
        daisy_characters = {
            "menschenbezogen, verschmust, liebevoll": "people-oriented, cuddly, loving",
            "neugierig, aufmerksam": "curious, attentive",
            "freundlich": "friendly",
            "verspielt": "playful",
            "ruhig": "calm",
            "sanft": "gentle",
        }

        for german, expected in daisy_characters.items():
            result = translate_character_traits(german)
            assert expected in result or result in expected, f"Failed for: {german} -> {result}"

    def test_translate_character_traits_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_character_traits(None) is None
        assert translate_character_traits("") is None


class TestCompatibilityTranslation:
    """Test translation of German compatibility descriptions."""

    def test_translate_compatibility_from_daisy(self):
        """Test compatibility translations from actual website content."""
        daisy_compatibility = {
            "Verträgt sich mit Hunden: ja": "Gets along with dogs: yes",
            "Verträgt sich mit Katzen: bedingt": "Gets along with cats: conditionally",
            "mag keine Katzen": "doesn't like cats",
            "gut mit Kindern": "well with children",
        }

        for german, expected in daisy_compatibility.items():
            result = translate_compatibility(german)
            # Check that key translated words are present
            if "Hunden" in german:
                assert "dogs" in result
            if "Katzen" in german:
                assert "cats" in result
            if "ja" in german:
                assert "yes" in result

    def test_translate_compatibility_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_compatibility(None) is None
        assert translate_compatibility("") is None


class TestIdealHomeTranslation:
    """Test translation of German ideal home descriptions."""

    def test_translate_ideal_home_from_daisy(self):
        """Test ideal home translations from actual website content."""
        daisy_homes = {
            "ruhige, erfahrene Halter": "quiet, experienced",
            "Haus mit Garten": "house with garden",
            "ländliche Gegend": "rural",
            "aktive Familie": "active family",
        }

        for german, key_words in daisy_homes.items():
            result = translate_ideal_home(german)
            assert key_words in result, f"Expected '{key_words}' in result for '{german}': {result}"

    def test_translate_ideal_home_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_ideal_home(None) is None
        assert translate_ideal_home("") is None


class TestDescriptionTranslation:
    """Test translation of German dog descriptions."""

    def test_translate_description_from_daisy(self):
        """Test description translations from actual website content."""
        # Real content from Daisy Family Rescue
        german_desc = "Vermittelt werde ich über Daisy Family Rescue e.V. mit der entsprechenden Erlaubnis nach §11 TierSchG."
        result = translate_description(german_desc)

        assert "I am being rehomed through" in result
        assert "appropriate permit" in result

    def test_translate_description_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_description(None) is None
        assert translate_description("") is None


class TestComprehensiveDogDataTranslation:
    """Test the complete dog data translation workflow."""

    def test_translate_complete_dog_data(self):
        """Test translation of complete dog data structure."""
        sample_dog = {
            "name": "BRUNO",
            "breed": "Deutscher Schäferhund Mischling",
            "sex": "männlich, kastriert",
            "age_text": "03/2020",
            "properties": {
                "german_description": "Vermittelt werde ich über Daisy Family Rescue e.V.",
                "character_german": "menschenbezogen, verschmust, liebevoll",
                "compatibility_german": "Verträgt sich mit Hunden: ja, mit Katzen: bedingt",
                "origin": "Nordmazedonien",
                "current_location": "München",
                "ideal_home_german": "ruhige, erfahrene Halter",
            },
        }

        result = translate_dog_data(sample_dog)

        # Check core field translations
        assert result["name"] == "Bruno"  # Normalized
        assert result["breed"] == "German Shepherd Mixed Breed"
        assert result["sex"] == "Male"
        assert result["age_text"] == "Born 03/2020"

        # Check property translations
        props = result["properties"]
        assert "description" in props
        assert "character" in props
        assert "compatibility" in props
        assert "origin_translated" in props
        assert "current_location_translated" in props

        # Verify specific translations
        assert "people-oriented" in props["character"]
        assert "North Macedonia" in props["origin_translated"]
        assert "Munich" in props["current_location_translated"]

    def test_translate_dog_data_handles_missing_fields(self):
        """Test translation with minimal dog data."""
        minimal_dog = {"name": "test", "breed": "Mischling"}

        result = translate_dog_data(minimal_dog)
        assert result["name"] == "Test"
        assert result["breed"] == "Mixed Breed"

    def test_translate_dog_data_handles_none_input(self):
        """Test translation with None or invalid input."""
        assert translate_dog_data(None) is None
        assert translate_dog_data({}) == {}
        assert translate_dog_data("invalid") == "invalid"


class TestTranslationCaching:
    """Test the translation caching system."""

    def test_translation_caching_works(self):
        """Test that translations are cached for performance."""
        # Clear cache first
        clear_translation_cache()

        # Get initial stats
        initial_stats = get_translation_cache_stats()
        assert initial_stats["cache_size"] == 0

        # Perform some translations
        translate_breed("Mischling")
        translate_gender("männlich")
        translate_location("München")

        # Check cache has entries
        stats = get_translation_cache_stats()
        assert stats["cache_size"] > 0
        assert stats["cache_types"] > 0

        # Test same translation uses cache (performance test)
        import time

        start = time.time()
        for _ in range(100):
            translate_breed("Mischling")  # Should be instant from cache
        duration = time.time() - start

        # Should be very fast due to caching
        assert duration < 0.1, f"Cached translations took too long: {duration}s"

    def test_cache_stats_functionality(self):
        """Test cache statistics functionality."""
        clear_translation_cache()

        # Add some translations
        translate_breed("Terrier")
        translate_gender("weiblich")

        stats = get_translation_cache_stats()
        assert isinstance(stats["cache_size"], int)
        assert isinstance(stats["cache_types"], int)
        assert stats["cache_size"] >= 2
        assert stats["cache_types"] >= 2


class TestCompatibilityWithStandardization:
    """Test that translations work correctly with BaseScraper standardization."""

    def test_breed_translation_with_standardization(self):
        """Test that translated breeds work with standardization."""
        german_breed = "Deutscher Schäferhund Mischling"
        translated_breed = translate_breed(german_breed)

        # Test that standardization works on translated breed
        standardized_breed, breed_group, size_estimate = standardize_breed(translated_breed)

        assert standardized_breed is not None
        assert "shepherd" in standardized_breed.lower()

    def test_age_translation_with_standardization(self):
        """Test that translated ages work with standardization."""
        german_age = "2 Jahre"
        translated_age = translate_age(german_age)

        # Test that standardization works on translated age
        age_info = standardize_age(translated_age)

        assert age_info["age_min_months"] == 24
        assert age_info["age_max_months"] == 36
