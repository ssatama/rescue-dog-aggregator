"""Comprehensive tests for size standardization fixes."""

import unittest
from unittest.mock import patch

import pytest

from scrapers.daisy_family_rescue.dog_detail_scraper import DaisyFamilyRescueDogDetailScraper
from utils.standardization import apply_standardization, standardize_size_value


@pytest.mark.api
@pytest.mark.integration
@pytest.mark.slow
class TestSizeStandardizationFixes(unittest.TestCase):
    """Test all size standardization fixes."""

    def setUp(self):
        """Set up test fixtures."""
        self.daisy_scraper = DaisyFamilyRescueDogDetailScraper()

    def test_standardize_size_value_basic_cases(self):
        """Test basic size standardization cases."""
        test_cases = [
            # Basic cases (the ones that were broken)
            ("small", "Small"),
            ("medium", "Medium"),
            ("large", "Large"),
            # Case variations
            ("SMALL", "Small"),
            ("MEDIUM", "Medium"),
            ("LARGE", "Large"),
            ("Small", "Small"),
            ("Medium", "Medium"),
            ("Large", "Large"),
            # Extended sizes
            ("tiny", "Tiny"),
            ("xlarge", "XLarge"),
            ("x-large", "XLarge"),
            ("extra large", "XLarge"),
        ]

        for input_size, expected in test_cases:
            with self.subTest(input=input_size):
                result = standardize_size_value(input_size)
                self.assertEqual(result, expected, f"Failed for input: {input_size}")

    def test_standardize_size_value_alternative_formats(self):
        """Test alternative size formats."""
        test_cases = [
            # Abbreviations
            ("sm", "Small"),
            ("med", "Medium"),
            ("lg", "Large"),
            ("xl", "XLarge"),
            ("xxl", "XLarge"),
            # Descriptive terms
            ("mini", "Tiny"),
            ("miniature", "Tiny"),
            ("toy", "Tiny"),
            ("very small", "Tiny"),
            ("very large", "XLarge"),
            ("giant", "XLarge"),
        ]

        for input_size, expected in test_cases:
            with self.subTest(input=input_size):
                result = standardize_size_value(input_size)
                self.assertEqual(result, expected, f"Failed for input: {input_size}")

    def test_standardize_size_value_compound_sizes(self):
        """Test compound size formats."""
        test_cases = [
            ("medium-large", "Large"),  # Should take the larger size
            ("small-medium", "Medium"),
        ]

        for input_size, expected in test_cases:
            with self.subTest(input=input_size):
                result = standardize_size_value(input_size)
                self.assertEqual(result, expected, f"Failed for input: {input_size}")

    def test_standardize_size_value_invalid_cases(self):
        """Test invalid size inputs."""
        invalid_cases = [None, "", "   ", "invalid", "unknown", "other"]

        for invalid_input in invalid_cases:
            with self.subTest(input=invalid_input):
                result = standardize_size_value(invalid_input)
                self.assertIsNone(result, f"Should return None for: {invalid_input}")

    def test_daisy_family_rescue_size_determination(self):
        """Test Daisy Family Rescue size determination now returns proper case."""
        test_cases = [
            # Height in cm -> Expected size
            (30, "Small"),  # 0-40cm = Small
            (50, "Medium"),  # 40-60cm = Medium
            (70, "Large"),  # 60-100cm = Large
            (110, "Large"),  # >=100cm = Large (edge case)
        ]

        for height_cm, expected_size in test_cases:
            with self.subTest(height=height_cm):
                result = self.daisy_scraper._determine_size(height_cm)
                self.assertEqual(result, expected_size, f"Height {height_cm}cm should give size {expected_size}")

    def test_daisy_family_rescue_no_lowercase_sizes(self):
        """Test that Daisy Family Rescue no longer returns lowercase sizes."""
        # Test various heights to ensure no lowercase sizes are returned
        test_heights = [20, 30, 45, 55, 70, 80, 110]

        for height in test_heights:
            result = self.daisy_scraper._determine_size(height)
            if result:
                # Check that result is properly capitalized
                self.assertEqual(result, result.capitalize(), f"Size should be properly capitalized, got: {result}")
                # Check that it's not lowercase
                self.assertNotEqual(result, result.lower(), f"Size should not be lowercase, got: {result}")

    def test_apply_standardization_with_size_fallback(self):
        """Test that apply_standardization now falls back to size field."""
        # Test case: animal with size but no breed (MISIs scenario)
        animal_data = {"name": "TestDog", "breed": None, "size": "Medium", "age_text": "2 years"}  # No breed = no size estimate from breed  # Has size field

        result = apply_standardization(animal_data)

        # Should now have standardized_size from size fallback
        self.assertIn("standardized_size", result)
        self.assertEqual(result["standardized_size"], "Medium")

    def test_apply_standardization_lowercase_size_fallback(self):
        """Test that apply_standardization handles lowercase sizes."""
        # Test case: Daisy Family Rescue scenario with lowercase size
        animal_data = {"name": "TestDog", "breed": "Unknown Breed", "size": "large", "age_text": "3 years"}  # No size estimate from breed  # Lowercase size (old Daisy format)

        result = apply_standardization(animal_data)

        # Should convert lowercase to proper case
        self.assertIn("standardized_size", result)
        self.assertEqual(result["standardized_size"], "Large")

    def test_apply_standardization_breed_override(self):
        """Test that breed size estimate still takes precedence."""
        # Test case: specific breed with known size estimate
        animal_data = {"name": "TestLabrador", "breed": "labrador", "size": "Medium", "age_text": "4 years"}  # Labrador = Large size estimate  # Conflicting size field

        result = apply_standardization(animal_data)

        # Breed estimate should take precedence
        self.assertIn("standardized_size", result)
        self.assertEqual(result["standardized_size"], "Large")

    def test_apply_standardization_provided_standardized_size_precedence(self):
        """Test that explicitly provided standardized_size takes highest precedence."""
        animal_data = {
            "name": "TestDog",
            "breed": "labrador",  # Would suggest Large
            "size": "Medium",  # Would suggest Medium
            "standardized_size": "Small",  # Explicit override
            "age_text": "2 years",
        }

        result = apply_standardization(animal_data)

        # Explicit standardized_size should be preserved
        self.assertEqual(result["standardized_size"], "Small")

    def test_frontend_compatibility(self):
        """Test that all results are compatible with frontend size filters."""
        # Frontend expects exactly these values
        expected_sizes = {"Tiny", "Small", "Medium", "Large", "XLarge"}

        # Test a variety of inputs
        test_inputs = ["tiny", "small", "medium", "large", "xlarge", "TINY", "SMALL", "MEDIUM", "LARGE", "XLARGE", "mini", "lg", "xl", "very large"]

        for input_size in test_inputs:
            result = standardize_size_value(input_size)
            if result:  # Skip None results
                self.assertIn(result, expected_sizes, f"Result '{result}' not in expected frontend sizes")

    def test_regression_prevention_misis_scenario(self):
        """Test the specific MISIs scenario that was broken."""
        # Simulate problematic MISIs data
        animal_data = {"name": "Alani", "breed": None, "size": "Medium", "age_text": "2 years"}  # This was causing the issue

        result = apply_standardization(animal_data)

        # Should now have standardized_size
        self.assertIn("standardized_size", result)
        self.assertEqual(result["standardized_size"], "Medium")
        self.assertIsNotNone(result["standardized_size"])

    def test_regression_prevention_daisy_scenario(self):
        """Test the specific Daisy Family Rescue scenario that was broken."""
        # Simulate problematic Daisy data - use a breed without size estimate
        animal_data = {"name": "Ben", "breed": "Some Unknown Breed", "size": "large", "age_text": "3 years"}  # No size estimate from breed  # Lowercase - this was the issue

        result = apply_standardization(animal_data)

        # Should convert to proper case via size fallback
        self.assertIn("standardized_size", result)
        self.assertEqual(result["standardized_size"], "Large")
        self.assertNotEqual(result["standardized_size"], "large")


if __name__ == "__main__":
    unittest.main()
