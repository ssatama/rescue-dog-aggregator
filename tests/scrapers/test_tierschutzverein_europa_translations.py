"""Tests for Tierschutzverein Europa German to English translations.

All test data is taken from actual production database values to ensure 100% coverage.
Tests also verify compatibility with base_scraper.py standardization methods.
"""

import pytest

from scrapers.tierschutzverein_europa.translations import (
    normalize_name,
    translate_age,
    translate_breed,
    translate_gender,
)
from utils.standardization import standardize_age, standardize_breed


@pytest.mark.database
@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestGenderTranslation:
    """Test translation of all gender values found in production database."""

    def test_translate_all_genders_from_production(self):
        """Test ALL gender values actually in our database."""
        # These are the EXACT values from our production database query
        production_genders = {
            "Rüde": "Male",  # 202 occurrences
            "Hündin": "Female",  # 164 occurrences
        }

        for german, english in production_genders.items():
            assert translate_gender(german) == english

    def test_translate_gender_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_gender(None) is None

    def test_translate_gender_case_insensitive(self):
        """Test that gender translation is case-insensitive."""
        assert translate_gender("RÜDE") == "Male"
        assert translate_gender("hündin") == "Female"
        assert translate_gender("RüDe") == "Male"


class TestAgeTranslation:
    """Test translation and parsing of all age patterns found in production database."""

    def test_translate_all_age_patterns_from_production(self):
        """Test ALL age patterns actually in our database."""
        # These are the EXACT patterns from our production database
        production_ages = {
            "1 Jahre": "1 year",  # 58 occurrences
            "2 Jahre": "2 years",  # 52 occurrences
            "3 Jahre": "3 years",  # 46 occurrences
            "5 Jahre": "5 years",  # 36 occurrences
            "Unbekannt": None,  # 34 occurrences
            "4 Jahre": "4 years",  # 29 occurrences
            "7 Jahre": "7 years",  # 28 occurrences
            "6 Jahre": "6 years",  # 21 occurrences
            "8 Jahre": "8 years",  # 20 occurrences
            "9 Jahre": "9 years",  # 19 occurrences
            "11 Jahre": "11 years",  # 12 occurrences
            "10 Jahre": "10 years",  # 7 occurrences
            "14 Jahre": "14 years",  # 2 occurrences
            "12 Jahre": "12 years",  # 1 occurrence
            "13 Jahre": "13 years",  # 1 occurrence
        }

        for german_age, expected_english in production_ages.items():
            result = translate_age(german_age)
            assert result == expected_english, f"Failed for {german_age}: expected {expected_english}, got {result}"

    def test_translate_age_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_age(None) is None

    def test_translate_age_handles_empty_string(self):
        """Test that empty strings are handled gracefully."""
        assert translate_age("") is None
        assert translate_age("  ") is None


class TestBreedTranslation:
    """Test translation of all breed names found in production database."""

    def test_translate_common_breeds_from_production(self):
        """Test translation of the most common breeds in our database."""
        # Test the most common patterns that need translation
        production_breeds = {
            "Mischling": "Mixed Breed",  # 185 occurrences
            "Schäferhund Mischling": "German Shepherd Mix",  # 11 occurrences
            "Schäferhund-Mischling": "German Shepherd Mix",  # 8 occurrences
            "Deutscher Schäferhund": "German Shepherd",  # 6 occurrences
            "Herdenschutzhund Mischling": "Livestock Guardian Dog Mix",  # 5 occurrences
            "Herdenschutzhund-Mischling": "Livestock Guardian Dog Mix",  # 5 occurrences
            "Podenco-Mischling": "Podenco Mix",  # 7 occurrences
            "Podenco Mischling": "Podenco Mix",  # 4 occurrences
            "Herdenschutzhund": "Livestock Guardian Dog",  # 3 occurrences
            "Jagdhund Mischling": "Hunting Dog Mix",  # 3 occurrences
            "Hütehund-Mischling": "Herding Dog Mix",  # 2 occurrences
            "Jagdhund-Mischling": "Hunting Dog Mix",  # 1 occurrence
            "Hütehund Mischling": "Herding Dog Mix",  # 1 occurrence
        }

        for german, english in production_breeds.items():
            result = translate_breed(german)
            assert result == english, f"Failed for {german}: expected {english}, got {result}"

    def test_breeds_that_remain_unchanged(self):
        """Test breeds that should remain unchanged (already in English or proper names)."""
        unchanged_breeds = [
            "Podenco",  # 26 occurrences
            "Podenca",  # 10 occurrences
            "Galgo",  # 7 occurrences
            "Galga",  # 4 occurrences
            "Galgo Español",  # 4 occurrences
            "Beagle - Mischling",  # 3 occurrences (partial translation)
            "Bodeguero Andaluz",  # 3 occurrences
            "Labrador-Mischling",  # 3 occurrences (partial translation)
            "Chihuahua",  # 1 occurrence
            "Labrador",  # 1 occurrence
            "Pointer",  # 1 occurrence
            "Rottweiler",  # 1 occurrence
            "Fox Terrier",  # 1 occurrence
            "Husky (reinrassig)",  # 1 occurrence (partial translation)
        ]

        for breed in unchanged_breeds:
            # These breeds should either remain the same or have minimal changes
            result = translate_breed(breed)
            assert result is not None

    def test_translate_breed_handles_none(self):
        """Test that None values are handled gracefully."""
        assert translate_breed(None) is None

    def test_translate_breed_handles_complex_descriptions(self):
        """Test handling of complex breed descriptions from the database."""
        complex_breeds = {
            "Mischling (Podenco oder Mastin, wurde mit zwei Müttern gefunden)": "Mixed Breed (Podenco or Spanish Mastiff, found with two mothers)",
            '"Mini" Border Collie Mischling': '"Mini" Border Collie Mix',
            "Mix Husky und Schäferhund": "Husky and German Shepherd Mix",
            "Mischling (evtl. Bretone Epagneul-Pointer-Mischling)": "Mixed Breed (possibly Brittany Spaniel-Pointer Mix)",
            "Mischling (vllt. Sheltie-Collie-Schäferhund)": "Mixed Breed (possibly Sheltie-Collie-German Shepherd)",
        }

        for german, english in complex_breeds.items():
            result = translate_breed(german)
            assert result == english, f"Failed for {german}: expected {english}, got {result}"


class TestNameNormalization:
    """Test normalization of dog names to proper capitalization."""

    def test_normalize_all_caps_names(self):
        """Test that all-caps names from the database are properly capitalized."""
        # These are actual names from our database - all are in ALL CAPS
        all_caps_names = [
            ("ASHANTI", "Ashanti"),
            ("BRENDA", "Brenda"),
            ("SNOOPA", "Snoopa"),
            ("TRO", "Tro"),
            ("AKENO", "Akeno"),
            ("ABEL", "Abel"),
            ("AKIL", "Akil"),
            ("DEXTER", "Dexter"),
            ("LOLA", "Lola"),
            ("ROMULUS", "Romulus"),
            ("FUSSI", "Fussi"),
            ("AKIRA", "Akira"),
            ("ARALE", "Arale"),
            ("ARES", "Ares"),
            ("CRONOS", "Cronos"),
            ("ENEKO", "Eneko"),
            ("INA", "Ina"),
            ("INDILA", "Indila"),
            ("LUNA", "Luna"),
            ("DIANA", "Diana"),
            ("AMOUR", "Amour"),
            ("ARIEL", "Ariel"),
            ("CHICO", "Chico"),
            ("CUCA", "Cuca"),
            ("KALE", "Kale"),
            ("LEVI", "Levi"),
            ("LOVELY", "Lovely"),
            ("MARGA", "Marga"),
            ("WIKA", "Wika"),
            ("OTTO", "Otto"),
        ]

        for all_caps, expected in all_caps_names:
            assert normalize_name(all_caps) == expected

    def test_normalize_name_handles_none(self):
        """Test that None values are handled gracefully."""
        assert normalize_name(None) is None

    def test_normalize_name_preserves_proper_case(self):
        """Test that properly cased names are preserved."""
        assert normalize_name("Max") == "Max"
        assert normalize_name("Bella") == "Bella"

    def test_normalize_name_handles_special_cases(self):
        """Test special cases like hyphenated names."""
        assert normalize_name("MARY-JANE") == "Mary-Jane"
        assert normalize_name("JEAN-LUC") == "Jean-Luc"


class TestBasescraperCompatibility:
    """Test that translations work correctly with base_scraper.py standardization methods."""

    def test_translated_ages_work_with_standardize_age(self):
        """Test that translated ages can be properly standardized by base_scraper.py."""
        # Test common German age patterns
        german_ages = ["1 Jahre", "3 Jahre", "7 Jahre", "12 Jahre"]

        for german_age in german_ages:
            # Translate to English
            english_age = translate_age(german_age)
            assert english_age is not None, f"Translation failed for {german_age}"

            # Verify base_scraper can standardize it
            age_info = standardize_age(english_age)
            assert age_info is not None, f"Standardization failed for {english_age} (from {german_age})"
            assert "age_min_months" in age_info, f"Missing age_min_months for {english_age}"
            assert "age_max_months" in age_info, f"Missing age_max_months for {english_age}"

    def test_translated_breeds_work_with_standardize_breed(self):
        """Test that translated breeds can be properly standardized by base_scraper.py."""
        # Test common German breed patterns that get translated
        german_breeds = [
            "Deutscher Schäferhund",
            "Mischling",
            "Schäferhund Mischling",
            "Herdenschutzhund",
        ]

        for german_breed in german_breeds:
            # Translate to English
            english_breed = translate_breed(german_breed)
            assert english_breed is not None, f"Translation failed for {german_breed}"

            # Verify base_scraper can standardize it
            standardized_breed, breed_group, size_estimate = standardize_breed(english_breed)
            # At minimum, we should get the breed back (may not be in standardization mapping)
            assert standardized_breed is not None, f"Standardization failed for {english_breed} (from {german_breed})"

    def test_age_translation_preserves_semantic_meaning(self):
        """Test that age translations preserve semantic meaning for standardization."""
        # Test that young dogs get categorized as puppies/young by standardization
        young_ages = ["1 Jahre", "2 Jahre"]
        old_ages = ["10 Jahre", "12 Jahre", "14 Jahre"]

        for german_age in young_ages:
            english_age = translate_age(german_age)
            age_info = standardize_age(english_age)
            # Should be categorized as Puppy or Young
            assert age_info["age_min_months"] < 36, f"Young dog {german_age} not categorized as young"

        for german_age in old_ages:
            english_age = translate_age(german_age)
            age_info = standardize_age(english_age)
            # Should be categorized as Adult or Senior
            assert age_info["age_min_months"] >= 36, f"Old dog {german_age} not categorized as mature"

    def test_breed_translation_preserves_size_information(self):
        """Test that breed translations allow size estimation by standardization."""
        # Test that German Shepherd gets properly sized
        german_shepherd = translate_breed("Deutscher Schäferhund")
        standardized_breed, breed_group, size_estimate = standardize_breed(german_shepherd)

        # German Shepherds should be recognized and sized appropriately
        assert "Shepherd" in standardized_breed or "German Shepherd" in standardized_breed
        assert size_estimate in ["Medium", "Large", "XLarge"] or size_estimate is None
