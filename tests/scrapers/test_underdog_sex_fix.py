"""Tests for The Underdog sex standardization fix."""

import unittest

import pytest

from scrapers.theunderdog.normalizer import extract_gender


@pytest.mark.integration
@pytest.mark.slow
class TestUnderdogSexFix(unittest.TestCase):
    """Test cases for The Underdog sex standardization fix."""

    def test_extract_gender_male(self):
        """Test that male gender returns 'Male'."""
        # Test various male formats
        test_cases = ["Male", "male", "MALE", "The dog is male", "This is a male dog"]

        for test_input in test_cases:
            with self.subTest(input=test_input):
                result = extract_gender(test_input)
                self.assertEqual(result, "Male", f"Failed for input: {test_input}")

    def test_extract_gender_female(self):
        """Test that female gender returns 'Female'."""
        # Test various female formats
        test_cases = ["Female", "female", "FEMALE", "The dog is female", "This is a female dog"]

        for test_input in test_cases:
            with self.subTest(input=test_input):
                result = extract_gender(test_input)
                self.assertEqual(result, "Female", f"Failed for input: {test_input}")

    def test_extract_gender_none_cases(self):
        """Test that invalid/empty inputs return None."""
        test_cases = [None, "", "   ", "unknown", "not specified", "other"]

        for test_input in test_cases:
            with self.subTest(input=test_input):
                result = extract_gender(test_input)
                self.assertIsNone(result, f"Failed for input: {test_input}")

    def test_extract_gender_frontend_compatibility(self):
        """Test that results are compatible with frontend filters."""
        # Frontend expects exactly "Male" or "Female"
        male_result = extract_gender("male")
        female_result = extract_gender("female")

        # Must be exact matches for frontend filters
        self.assertEqual(male_result, "Male")
        self.assertEqual(female_result, "Female")

        # Should not be old M/F format
        self.assertNotEqual(male_result, "M")
        self.assertNotEqual(female_result, "F")


if __name__ == "__main__":
    unittest.main()
