"""Test improvements to MISIs Animal Rescue scraper.

Focus on fixing:
1. Size standardization based on weight
2. Age extraction from DOB patterns
3. Breed extraction with special characters
4. Name normalization with special characters
"""

from datetime import datetime
from unittest.mock import patch

import pytest

from scrapers.misis_rescue.normalizer import (
    calculate_age_years,
    extract_age_from_text,
    extract_birth_date,
    extract_breed,
    extract_weight_kg,
    normalize_name,
    normalize_size,
)


class TestSizeStandardization:
    """Test correct size categorization based on weight."""

    def test_tiny_size_under_5kg(self):
        """Dogs under 5kg should be Tiny."""
        assert normalize_size("3kg") == "Tiny"
        assert normalize_size("4.5kg") == "Tiny"

    def test_small_size_5_to_10kg(self):
        """Dogs 5-10kg should be Small."""
        assert normalize_size("5kg") == "Small"
        assert normalize_size("7.5kg") == "Small"
        assert normalize_size("10kg") == "Small"

    def test_medium_size_10_to_25kg(self):
        """Dogs 10-25kg should be Medium."""
        assert normalize_size("12kg") == "Medium"
        assert normalize_size("15kg") == "Medium"
        assert normalize_size("20kg") == "Medium"
        assert normalize_size("25kg") == "Medium"

    def test_large_size_25_to_40kg(self):
        """Dogs 25-40kg should be Large."""
        assert normalize_size("26kg") == "Large"
        assert normalize_size("30kg") == "Large"
        assert normalize_size("35kg") == "Large"
        assert normalize_size("40kg") == "Large"

    def test_xlarge_size_over_40kg(self):
        """Dogs over 40kg should be XLarge."""
        assert normalize_size("41kg") == "XLarge"
        assert normalize_size("50kg") == "XLarge"
        assert normalize_size("60kg") == "XLarge"

    def test_weight_extraction_patterns(self):
        """Test various weight text patterns."""
        assert extract_weight_kg("✔️weighs around 22-25kg") == 23.5
        assert extract_weight_kg("weighs around 15-18 kg") == 16.5
        assert extract_weight_kg("12kg") == 12.0
        assert extract_weight_kg("weight: 15 kg") == 15.0
        assert extract_weight_kg("10.5kg") == 10.5


class TestAgeExtraction:
    """Test age extraction from various DOB patterns."""

    def test_dob_year_only(self):
        """Test DOB with year only (e.g., 'DOB- 2023')."""
        assert extract_birth_date("DOB- 2023") == "2023"
        assert extract_birth_date("DOB 2022") == "2022"
        assert extract_birth_date("DOB: 2021") == "2021"

    def test_dob_month_year(self):
        """Test DOB with month and year."""
        assert extract_birth_date("DOB: March 2023") == "March 2023"
        assert extract_birth_date("DOB - october 2022") == "october 2022"
        assert extract_birth_date("born: December 2021") == "December 2021"

    def test_dob_month_range_year(self):
        """Test DOB with month range."""
        assert extract_birth_date("DOB: April/May 2024") == "April/May 2024"

    def test_calculate_age_from_year_only(self):
        """Test age calculation from year-only DOB."""
        # Test with year strings - the actual age will depend on current date
        # so we just verify it returns a reasonable value
        age = calculate_age_years("2023")
        assert age is not None
        assert age >= 0

        age = calculate_age_years("2020")
        assert age is not None
        assert age >= 0

    def test_calculate_age_from_month_year(self):
        """Test age calculation from month-year DOB."""
        # Test with month-year strings
        age = calculate_age_years("March 2023")
        assert age is not None
        assert age >= 0

        age = calculate_age_years("December 2020")
        assert age is not None
        assert age >= 0

    def test_age_from_text_patterns(self):
        """Test age extraction from various text patterns."""
        assert extract_age_from_text("She is 2 years old") == 2.0
        assert extract_age_from_text("approximately 3 years old") == 3.0
        assert extract_age_from_text("18 months old") == 1.5
        assert extract_age_from_text("6 months") == 0.5
        assert extract_age_from_text("nearly 4 years old") == 4.0


class TestBreedExtraction:
    """Test breed extraction with various patterns."""

    def test_mixed_breed_patterns(self):
        """Test mixed breed detection."""
        assert extract_breed(["✔️Mixed breed"]) == "Mixed Breed"
        assert extract_breed(["Mixed breed"]) == "Mixed Breed"
        assert extract_breed(["crossbreed"]) == "Mixed Breed"

    def test_specific_breed_mix(self):
        """Test specific breed mix patterns."""
        assert extract_breed(["✔️Posavac Hound mix✔️"]) == "Posavac Hound Mix"
        assert extract_breed(["Lab mix"]) == "Labrador Mix"
        assert extract_breed(["German Shepherd mix"]) == "German Shepherd Mix"

    def test_pure_breed(self):
        """Test pure breed detection."""
        assert extract_breed(["✔️Husky✔️"]) == "Husky"
        assert extract_breed(["German Shepherd"]) == "German Shepherd"
        assert extract_breed(["Terrier"]) == "Terrier"

    def test_no_breed_info(self):
        """Test when no breed info is available."""
        assert extract_breed([]) is None
        assert extract_breed(["some other text"]) is None


class TestNameNormalization:
    """Test name normalization with special characters."""

    def test_emoji_removal(self):
        """Test removal of emojis from names."""
        assert normalize_name("🌹💕LUNA💕🌹") == "Luna"
        assert normalize_name("💕Bella💕") == "Bella"
        assert normalize_name("⭐Max⭐") == "Max"

    def test_gender_descriptor_removal(self):
        """Test removal of gender descriptors."""
        assert normalize_name("Luna she's a girl") == "Luna"
        assert normalize_name("Max he's a boy") == "Max"
        assert normalize_name("Bella (female)") == "Bella"
        assert normalize_name("Rocky - male") == "Rocky"

    def test_location_removal(self):
        """Test removal of location suffixes."""
        assert normalize_name("Luna in UK") == "Luna"
        assert normalize_name("Max from Serbia") == "Max"
        assert normalize_name("Bella - UK") == "Bella"

    def test_special_characters(self):
        """Test handling of special/invisible characters."""
        assert normalize_name("‍Blacky‍") == "Blacky"  # Zero-width joiners
        assert normalize_name("Luna{!}") == "Luna{!}"  # Keep some special chars

    def test_complex_names(self):
        """Test complex name patterns."""
        assert normalize_name("🌹💕LUNA💕🌹 she's a girl in UK") == "Luna"
        assert normalize_name("Cookie and Muffin") == "Cookie And Muffin"
        assert normalize_name("Flekica & Juca") == "Flekica & Juca"


class TestIntegrationScenarios:
    """Test real-world scenarios from database."""

    def test_alice_small_dog_5kg(self):
        """Alice: 5.5kg should be Small, not Medium."""
        weight = extract_weight_kg("5.5kg")
        assert weight == 5.5
        size = normalize_size("5.5kg")
        assert size == "Small"

    def test_amena_small_dog_10kg(self):
        """Amena: 10kg should be Small, not Medium."""
        weight = extract_weight_kg("10.0kg")
        assert weight == 10.0
        size = normalize_size("10.0kg")
        assert size == "Small"

    def test_megi_medium_dog_12kg(self):
        """Megi: 12kg should be Medium."""
        weight = extract_weight_kg("12kg")
        assert weight == 12.0
        size = normalize_size("12kg")
        assert size == "Medium"

    def test_large_dog_30kg(self):
        """30kg should be Large."""
        weight = extract_weight_kg("30kg")
        assert weight == 30.0
        size = normalize_size("30kg")
        assert size == "Large"

    def test_megi_age_from_dob_2023(self):
        """Megi with DOB 2023 should have calculated age."""
        dob = extract_birth_date("DOB- 2023")
        assert dob == "2023"
        age = calculate_age_years(dob)
        assert age is not None
        assert age >= 0  # Should be positive
