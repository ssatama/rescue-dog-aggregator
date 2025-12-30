"""Test fixes for MisisRescue normalizer issues discovered in production.

These tests verify the fixes for:
1. "Size Mix" breed issue - pattern was incorrectly matching "full size mixed breed"
2. Missing age extraction for "DOB -April /May 2024" format
3. Missing breed extraction for "English Pointer"
4. Name normalization issues with "In The Uk!" and special characters
"""

import pytest

from scrapers.misis_rescue.normalizer import (
    extract_birth_date,
    extract_breed,
    normalize_name,
)


@pytest.mark.integration
@pytest.mark.scrapers
class TestNormalizerFixes:
    """Test the fixes for normalizer issues discovered in production."""

    def test_breed_not_size_mix_from_full_size_text(self):
        """Test that 'full size mixed breed' doesn't become 'Size Mix'."""
        # This was the bug: "10kg, should be around 20 kg at full size" + "mixed breed"
        # was being parsed as "size mix" due to overly generic pattern
        bullets = [
            "weights around 10kg, should be around 20 kg at full size",
            "mixed breed",
        ]

        breed = extract_breed(bullets)
        assert breed == "Mixed Breed", f"Expected 'Mixed Breed' but got '{breed}'"

    def test_breed_extraction_with_size_in_context(self):
        """Test various bullets with 'size' word don't create 'Size Mix'."""
        test_cases = [
            (
                [
                    "weights around 5kg, should be around 10-12kg at full size",
                    "mixed breed",
                ],
                "Mixed Breed",
            ),
            (
                ["13-14kg, should be around 17-20kg at full size", "mixed breed"],
                "Mixed Breed",
            ),
            (["will grow to full size", "mixed breed, probably hound"], "Mixed Breed"),
        ]

        for bullets, expected in test_cases:
            breed = extract_breed(bullets)
            assert breed == expected, (
                f"Failed for {bullets}: expected '{expected}' but got '{breed}'"
            )

    def test_english_pointer_breed_extraction(self):
        """Test that English Pointer breed is correctly extracted."""
        bullets = ["rough estimate DOB 2021", "weights around 23KG", "English Pointer"]

        breed = extract_breed(bullets)
        assert breed == "English Pointer", (
            f"Expected 'English Pointer' but got '{breed}'"
        )

    def test_generic_pointer_breed_extraction(self):
        """Test that generic Pointer breed is correctly extracted."""
        bullets = ["Pointer", "23kg", "male"]

        breed = extract_breed(bullets)
        assert breed == "Pointer", f"Expected 'Pointer' but got '{breed}'"

    def test_birth_date_with_dash_before_month_range(self):
        """Test extraction of birth date with dash before month range."""
        # This format wasn't being parsed: "DOB -April /May 2024"
        text = "rough estimate DOB -April /May 2024"

        birth_date = extract_birth_date(text)
        assert birth_date == "April /May 2024", (
            f"Expected 'April /May 2024' but got '{birth_date}'"
        )

    def test_birth_date_with_spaces_in_month_range(self):
        """Test extraction with spaces around slash in month range."""
        test_cases = [
            "DOB -April /May 2024",
            "DOB: April/May 2024",
            "DOB - April / May 2024",
            "DOB:April /May 2024",
        ]

        for text in test_cases:
            birth_date = extract_birth_date(text)
            assert birth_date is not None, f"Failed to extract from: {text}"
            assert "2024" in birth_date, f"Year not found in result from: {text}"

    def test_name_normalization_in_the_uk(self):
        """Test that 'In The Uk!' suffix is removed from names."""
        test_cases = [
            ("COCO 💛 in the UK!", "Coco"),
            ("LARA 💛 in the UK!", "Lara"),
            ("Max in the UK", "Max"),
            ("Bella IN THE UK!", "Bella"),
        ]

        for raw_name, expected in test_cases:
            cleaned = normalize_name(raw_name)
            assert cleaned == expected, (
                f"Failed for '{raw_name}': expected '{expected}' but got '{cleaned}'"
            )

    def test_name_normalization_with_curly_braces(self):
        """Test that curly brace content is removed from names."""
        test_cases = [
            ("💙 Beky {He's a boy 🤪!}", "Beky"),
            ("Beky {!}", "Beky"),
            ("Max {reserved}", "Max"),
            ("Luna {adopted!}", "Luna"),
        ]

        for raw_name, expected in test_cases:
            cleaned = normalize_name(raw_name)
            assert cleaned == expected, (
                f"Failed for '{raw_name}': expected '{expected}' but got '{cleaned}'"
            )

    def test_name_normalization_complex_cases(self):
        """Test complex name normalization cases."""
        test_cases = [
            ("✨Fluffy✨", "Fluffy"),  # Emojis
            ("💙Ronnie💙", "Ronnie"),  # Emojis
            ("FLUFFY", "Fluffy"),  # All caps
            ("fluffy", "Fluffy"),  # All lowercase
            ("  Fluffy  ", "Fluffy"),  # Extra spaces
        ]

        for raw_name, expected in test_cases:
            cleaned = normalize_name(raw_name)
            assert cleaned == expected, (
                f"Failed for '{raw_name}': expected '{expected}' but got '{cleaned}'"
            )

    def test_hound_breed_extraction(self):
        """Test that 'hound' breed is extracted."""
        bullets = ["mixed breed, probably hound"]

        breed = extract_breed(bullets)
        assert breed == "Mixed Breed", (
            f"Expected 'Mixed Breed' for mixed hound but got '{breed}'"
        )

        # Pure hound
        bullets = ["hound", "20kg"]
        breed = extract_breed(bullets)
        assert breed == "Hound", f"Expected 'Hound' but got '{breed}'"

    def test_breed_extraction_doesnt_match_size_words(self):
        """Ensure we don't extract 'size' as a breed component."""
        bullets = ["medium size", "mixed breed"]

        breed = extract_breed(bullets)
        assert breed == "Mixed Breed", (
            f"Should not extract 'Size' as breed, got '{breed}'"
        )

        # Another variant
        bullets = ["large size dog", "crossbreed"]
        breed = extract_breed(bullets)
        assert breed == "Mixed Breed", (
            f"Should be 'Mixed Breed' for crossbreed, got '{breed}'"
        )
