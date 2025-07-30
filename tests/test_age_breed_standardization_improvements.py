"""Comprehensive tests for age and breed standardization improvements."""

import unittest
from datetime import date

import pytest

from utils.standardization import clean_breed_text, normalize_breed_case, parse_age_text, standardize_age, standardize_breed


@pytest.mark.api
@pytest.mark.database
@pytest.mark.slow
class TestAgeStandardizationImprovements(unittest.TestCase):
    """Test age standardization improvements and bug fixes."""

    def test_german_unbekannt_handling(self):
        """Test that German 'Unbekannt' is handled properly."""
        # Should return None for all fields when age is unknown
        result = parse_age_text("Unbekannt")
        self.assertIsNone(result[0])  # age_category
        self.assertIsNone(result[1])  # min_months
        self.assertIsNone(result[2])  # max_months

        # Test variations
        result = parse_age_text("unbekannt")
        self.assertIsNone(result[0])

        result = parse_age_text("UNBEKANNT")
        self.assertIsNone(result[0])

    def test_english_unknown_handling(self):
        """Test that English 'Unknown' is handled properly."""
        result = parse_age_text("Unknown")
        self.assertIsNone(result[0])
        self.assertIsNone(result[1])
        self.assertIsNone(result[2])

        # Test variations
        result = parse_age_text("unknown")
        self.assertIsNone(result[0])

        result = parse_age_text("UNKNOWN")
        self.assertIsNone(result[0])

    def test_corrupted_gender_data_rejection(self):
        """Test that corrupted age data (gender info) is rejected."""
        # These should all return None because they're not age data
        corrupt_entries = ["Geschlecht: weiblich", "Geschlecht: männlich", "Gender: Female", "Sex: Male"]

        for corrupt_entry in corrupt_entries:
            with self.subTest(entry=corrupt_entry):
                result = parse_age_text(corrupt_entry)
                self.assertIsNone(result[0], f"Should reject corrupted entry: {corrupt_entry}")

    def test_birth_date_future_validation(self):
        """Test that future birth dates are handled appropriately."""
        # Future dates should be rejected or handled gracefully
        current_year = date.today().year
        future_year = current_year + 1

        future_entries = [f"Born 03/{future_year}", f"Born 12/{future_year}", f"Born {future_year}"]

        for future_entry in future_entries:
            with self.subTest(entry=future_entry):
                result = parse_age_text(future_entry)
                # Should either return None or handle gracefully (not crash)
                if result[0] is not None:
                    # If it does parse, age should be reasonable (not negative)
                    self.assertIsNotNone(result[1])  # min_months should exist
                    self.assertGreaterEqual(result[1], 0, f"Future date should not give negative age: {future_entry}")

    def test_birth_date_far_past_validation(self):
        """Test that unreasonably old birth dates are rejected."""
        # Dogs don't live 30+ years, these are likely data errors
        old_entries = ["Born 01/1990", "Born 1985", "Born 12/1995"]

        for old_entry in old_entries:
            with self.subTest(entry=old_entry):
                result = parse_age_text(old_entry)
                if result[0] is not None:
                    # If parsed, age should be reasonable for a dog (max ~20 years = 240 months)
                    self.assertLessEqual(result[1], 300, f"Age too old for dog: {old_entry}")

    def test_birth_date_current_parsing(self):
        """Test that valid recent birth dates parse correctly."""
        current_year = date.today().year
        current_month = date.today().month

        # Test recent valid birth dates
        valid_entries = [f"Born 01/{current_year}", f"Born 06/{current_year - 1}", f"Born 12/{current_year - 2}"]

        for valid_entry in valid_entries:
            with self.subTest(entry=valid_entry):
                result = parse_age_text(valid_entry)
                self.assertIsNotNone(result[0], f"Should parse valid birth date: {valid_entry}")
                self.assertIsNotNone(result[1])
                self.assertGreaterEqual(result[1], 0)

    def test_age_range_missing_standardization_fix(self):
        """Test that age entries that previously failed to standardize now work."""
        # These are real entries from the database that failed
        problematic_entries = ["Born 03/2021", "Born 05/2022", "Born 06/2024"]

        for entry in problematic_entries:
            with self.subTest(entry=entry):
                result = parse_age_text(entry)
                # Should now successfully parse
                if "2024" in entry or "2022" in entry or "2021" in entry:
                    # These are recent enough to be valid
                    self.assertIsNotNone(result[0], f"Should now parse: {entry}")
                    self.assertIsNotNone(result[1])
                    self.assertIsNotNone(result[2])

    def test_standardize_age_wrapper_improvements(self):
        """Test that standardize_age wrapper handles edge cases."""
        # Test with problematic inputs
        edge_cases = ["Unbekannt", "Unknown", "Geschlecht: weiblich", "", None]

        for case in edge_cases:
            with self.subTest(case=case):
                result = standardize_age(case)
                # Should return dict with None values for invalid input
                self.assertIsNone(result["age_category"])
                self.assertIsNone(result["age_min_months"])
                self.assertIsNone(result["age_max_months"])


class TestBreedStandardizationImprovements(unittest.TestCase):
    """Test breed standardization improvements and cleanup."""

    def test_mixed_breed_case_normalization(self):
        """Test that mixed breed case inconsistencies are fixed."""
        test_cases = [
            ("mixed breed", "Mixed Breed"),
            ("MIXED BREED", "Mixed Breed"),
            ("Mixed Breed", "Mixed Breed"),  # Already correct
            ("MiXeD bReEd", "Mixed Breed"),
        ]

        for input_breed, expected in test_cases:
            with self.subTest(input=input_breed):
                result = normalize_breed_case(input_breed)
                self.assertEqual(result, expected)

    def test_unclear_breed_cleanup(self):
        """Test that unclear/meaningless breed names are cleaned up."""
        unclear_breeds = ["Size Mix", "A Mix", "Unknown Mix", "Other Mix"]

        for unclear in unclear_breeds:
            with self.subTest(breed=unclear):
                result = clean_breed_text(unclear)
                # Should be normalized to "Mixed Breed"
                self.assertEqual(result, "Mixed Breed")

    def test_long_descriptive_breed_simplification(self):
        """Test that overly long breed descriptions are simplified."""
        long_breeds = ["Mixed Breed (Podenco or Mastin, found with two mothers)", "Mixed Breed (possibly German Shepherd-Podenco)", "Mixed Breed (possibly Sheltie-Collie-German Shepherd)"]

        for long_breed in long_breeds:
            with self.subTest(breed=long_breed):
                result = clean_breed_text(long_breed)
                # Should extract the primary breed if possible
                if "Podenco" in long_breed:
                    self.assertEqual(result, "Podenco Mix")
                elif "German Shepherd" in long_breed:
                    self.assertEqual(result, "German Shepherd Mix")
                else:
                    # Fallback to Mixed Breed if too complex
                    self.assertEqual(result, "Mixed Breed")

    def test_terrier_case_consistency(self):
        """Test that terrier variants are consistently capitalized."""
        terrier_variants = [("terrier mix", "Terrier Mix"), ("Terrier mix", "Terrier Mix"), ("TERRIER MIX", "Terrier Mix"), ("terrier", "Terrier")]

        for input_breed, expected in terrier_variants:
            with self.subTest(input=input_breed):
                result = normalize_breed_case(input_breed)
                self.assertEqual(result, expected)

    def test_empty_or_none_breed_handling(self):
        """Test handling of empty or None breed values."""
        empty_cases = [None, "", "   ", "N/A", "n/a"]

        for empty_case in empty_cases:
            with self.subTest(case=empty_case):
                result = clean_breed_text(empty_case)
                # Should return None to indicate missing data
                self.assertIsNone(result)

    def test_breed_standardization_preserves_good_data(self):
        """Test that well-formatted breeds are preserved."""
        good_breeds = ["Labrador Retriever", "German Shepherd", "Golden Retriever Mix", "Podenco", "Beagle"]

        for good_breed in good_breeds:
            with self.subTest(breed=good_breed):
                # Should pass through unchanged (or with minimal standardization)
                std_breed, _, _ = standardize_breed(good_breed)
                # The standardized version should be recognizable as the same breed
                self.assertIn(good_breed.split()[0], std_breed)

    def test_regression_prevention_existing_functionality(self):
        """Test that existing breed standardization still works."""
        # Test cases from current test suite that should continue working
        test_cases = [
            ("labrador", ("Labrador Retriever", "Sporting", "Large")),
            ("german shepherd", ("German Shepherd", "Herding", "Large")),
            ("mixed breed", ("Mixed Breed", "Mixed", "Medium")),  # Current implementation returns Medium
            ("unknown", ("Unknown", "Unknown", None)),
        ]

        for input_breed, expected in test_cases:
            with self.subTest(breed=input_breed):
                result = standardize_breed(input_breed)
                self.assertEqual(result, expected)


class TestIntegrationImprovements(unittest.TestCase):
    """Test that improvements work together in apply_standardization."""

    def test_problematic_database_entries_fixed(self):
        """Test that real problematic entries from database are now handled."""
        # Real problematic entries found in database
        problem_cases = [
            {"age_text": "Unbekannt", "breed": "mixed breed"},
            {"age_text": "Geschlecht: weiblich", "breed": "Size Mix"},
            {"age_text": "Born 03/2025", "breed": "Mixed Breed (Podenco or Mastin, found with two mothers)"},
        ]

        for case in problem_cases:
            with self.subTest(case=case):
                from utils.standardization import apply_standardization

                result = apply_standardization(case)

                # Age should be handled properly (None for invalid, valid for good dates)
                if case["age_text"] in ["Unbekannt", "Geschlecht: weiblich"]:
                    self.assertIsNone(result.get("age_category"))

                # Breed should be cleaned up
                if "standardized_breed" in result:
                    self.assertIsNotNone(result["standardized_breed"])
                    # Should not be the original problematic value
                    self.assertNotEqual(result["standardized_breed"], case["breed"])


if __name__ == "__main__":
    unittest.main()
