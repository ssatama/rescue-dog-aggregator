#!/usr/bin/env python3
"""
Test suite for shared data extraction patterns utility.

This module tests the consolidated extraction functions that replace duplicated
logic from theunderdog, misis_rescue, and rean scrapers.
"""

import pytest

from utils.shared_extraction_patterns import (
    calculate_age_range_months,
    extract_age_from_text,
    extract_breed_from_text,
    extract_sex_from_text,
    extract_weight_from_text,
    normalize_age_text,
)


class TestAgeExtraction:
    """Test age extraction from various text formats."""

    def test_extract_age_years_basic(self):
        """Test basic year extraction patterns."""
        # Pattern: "around X years"
        assert extract_age_from_text("around two years") == 2.0
        assert extract_age_from_text("around 3 years") == 3.0
        assert extract_age_from_text("around four years old") == 4.0

        # Pattern: "X years old"
        assert extract_age_from_text("2 years old") == 2.0
        assert extract_age_from_text("approximately 3 years old") == 3.0

        # Pattern: "X+ years"
        assert extract_age_from_text("8+ years") == 8.0
        assert extract_age_from_text("3+ years old") == 3.0

    def test_extract_age_months(self):
        """Test month extraction patterns."""
        # Pattern: "X months old"
        assert extract_age_from_text("6 months old") == 0.5
        assert extract_age_from_text("18 months") == 1.5
        assert extract_age_from_text("around 12 months old") == 1.0

    def test_extract_age_ranges(self):
        """Test age range extraction."""
        # Pattern: "X-Y years"
        assert extract_age_from_text("2-3 years") == 2.5  # Average
        assert extract_age_from_text("8-10 years old") == 9.0

    def test_extract_age_written_numbers(self):
        """Test extraction from written numbers."""
        assert extract_age_from_text("two years old") == 2.0
        assert extract_age_from_text("eighteen months old") == 1.5
        assert extract_age_from_text("three months") == 0.25

    def test_extract_age_categories(self):
        """Test age category to numeric conversion."""
        assert extract_age_from_text("puppy") == 0.5
        assert extract_age_from_text("young adult") == 1.5
        assert extract_age_from_text("adult") == 3.0
        assert extract_age_from_text("senior dog") == 8.0

    def test_extract_age_veterinary_estimates(self):
        """Test veterinary age estimates from misis_rescue patterns."""
        assert extract_age_from_text("vet estimated her 4 y old") == 4.0
        assert extract_age_from_text("veterinary assessment approximately 2.5 years") == 2.5
        assert extract_age_from_text("roughly 3 y old") == 3.0

    def test_extract_age_complex_patterns(self):
        """Test complex age patterns from real scraper data."""
        # TheUnderdog patterns
        assert extract_age_from_text("Young adult (around two years)") == 2.0
        assert extract_age_from_text("Adolescent (around eighteen months)") == 1.5

        # REAN patterns
        assert extract_age_from_text("around 5 months old") == pytest.approx(0.42, abs=0.1)

    def test_extract_age_none_cases(self):
        """Test cases that should return None."""
        assert extract_age_from_text(None) is None
        assert extract_age_from_text("") is None
        assert extract_age_from_text("unknown age") is None
        assert extract_age_from_text("no age info") is None


class TestBreedExtraction:
    """Test breed extraction from description text."""

    def test_extract_breed_mixed_indicators(self):
        """Test mixed breed identification."""
        assert extract_breed_from_text("She's a mixed breed") == "Mixed Breed"
        assert extract_breed_from_text("crossbreed dog") == "Mixed Breed"
        assert extract_breed_from_text("cross breed with unknown heritage") == "Mixed Breed"

    def test_extract_breed_specific_mixes(self):
        """Test specific breed mix extraction."""
        assert extract_breed_from_text("labrador mix from the shelter") == "Labrador Mix"
        assert extract_breed_from_text("german shepherd cross") == "German Shepherd Mix"
        assert extract_breed_from_text("golden retriever mix") == "Golden Retriever Mix"
        assert extract_breed_from_text("terrier mix") == "Terrier Mix"

    def test_extract_breed_pure_breeds(self):
        """Test pure breed extraction."""
        assert extract_breed_from_text("Beautiful golden retriever") == "Golden Retriever"
        assert extract_breed_from_text("German shepherd from Germany") == "German Shepherd"
        assert extract_breed_from_text("Siberian husky") == "Siberian Husky"

    def test_extract_breed_pattern_matching(self):
        """Test pattern-based breed matching."""
        # From misis_rescue patterns
        assert extract_breed_from_text("possibly husky cross") == "Husky Mix"
        assert extract_breed_from_text("might be labrador crossbreed") == "Labrador Mix"
        assert extract_breed_from_text("looks like terrier cross") == "Terrier Mix"

    def test_extract_breed_priority_matching(self):
        """Test breed priority in complex descriptions."""
        # Labrador should have priority
        assert extract_breed_from_text("lab-shepherd mix") == "Labrador Mix"
        assert extract_breed_from_text("shepherd-lab mix") == "Labrador Mix"

    def test_extract_breed_none_cases(self):
        """Test cases that should return default."""
        assert extract_breed_from_text(None) == "Mixed Breed"
        assert extract_breed_from_text("") == "Mixed Breed"
        assert extract_breed_from_text("no breed information") == "Mixed Breed"


class TestSexExtraction:
    """Test sex/gender extraction from text."""

    def test_extract_sex_medical_indicators(self):
        """Test medical procedure indicators (highest confidence)."""
        assert extract_sex_from_text("She has been spayed") == "Female"
        assert extract_sex_from_text("He was neutered last month") == "Male"
        assert extract_sex_from_text("castrated male") == "Male"

    def test_extract_sex_pronouns(self):
        """Test pronoun-based sex determination."""
        assert extract_sex_from_text("She is a lovely dog") == "Female"
        assert extract_sex_from_text("He loves to play") == "Male"
        assert extract_sex_from_text("Her favorite toy is a ball") == "Female"
        assert extract_sex_from_text("His energy is amazing") == "Male"

    def test_extract_sex_explicit_mentions(self):
        """Test explicit gender mentions."""
        assert extract_sex_from_text("This female dog needs a home") == "Female"
        assert extract_sex_from_text("Male dog looking for family") == "Male"
        assert extract_sex_from_text("She's a good girl") == "Female"
        assert extract_sex_from_text("He's a good boy") == "Male"

    def test_extract_sex_confidence_scoring(self):
        """Test confidence-based scoring system."""
        # Multiple female indicators should be confident
        text = "She is a spayed female who loves her toys"
        assert extract_sex_from_text(text) == "Female"

        # Multiple male indicators should be confident
        text = "He is a neutered male who loves his walks"
        assert extract_sex_from_text(text) == "Male"

    def test_extract_sex_conflict_detection(self):
        """Test conflicting gender signal detection."""
        # Mixed pronouns might indicate multiple dogs
        conflicted_text = "She is a good boy who loves his toys"
        # Should return None due to conflict without medical indicators
        assert extract_sex_from_text(conflicted_text) is None

    def test_extract_sex_none_cases(self):
        """Test cases that should return None."""
        assert extract_sex_from_text(None) is None
        assert extract_sex_from_text("") is None
        assert extract_sex_from_text("No gender information available") is None


class TestWeightExtraction:
    """Test weight extraction from text."""

    def test_extract_weight_single_values(self):
        """Test single weight value extraction."""
        assert extract_weight_from_text("weighs 30kg") == 30.0
        assert extract_weight_from_text("Large (around 30kg)") == 30.0
        assert extract_weight_from_text("15 kg") == 15.0
        assert extract_weight_from_text("22.5kg") == 22.5

    def test_extract_weight_ranges(self):
        """Test weight range extraction (should return average)."""
        assert extract_weight_from_text("15-20kg") == 17.5
        assert extract_weight_from_text("weighs around 22-25kg") == 23.5
        assert extract_weight_from_text("Medium (15-20kg)") == 17.5

    def test_extract_weight_multiple_mentions(self):
        """Test multiple weight mentions (should take most recent)."""
        text = "was 35kg, now 30kg after diet"
        assert extract_weight_from_text(text) == 30.0

    def test_extract_weight_pounds_conversion(self):
        """Test pounds to kg conversion."""
        assert extract_weight_from_text("44 pounds") == pytest.approx(20.0, abs=0.1)
        assert extract_weight_from_text("20 lbs") == pytest.approx(9.1, abs=0.1)

    def test_extract_weight_patterns_from_scrapers(self):
        """Test weight patterns from actual scraper data."""
        # TheUnderdog patterns
        assert extract_weight_from_text("Big dog (25-30 kilos)") == 27.5
        assert extract_weight_from_text("Smaller side of medium") is None  # No weight info

        # MisisRescue patterns
        assert extract_weight_from_text("✔️weighs around 22-25kg") == 23.5
        assert extract_weight_from_text("weight: 15 kg") == 15.0

    def test_extract_weight_none_cases(self):
        """Test cases that should return None."""
        assert extract_weight_from_text(None) is None
        assert extract_weight_from_text("") is None
        assert extract_weight_from_text("Large dog with no weight info") is None


class TestUtilityFunctions:
    """Test utility functions for age processing."""

    def test_normalize_age_text(self):
        """Test age text normalization."""
        assert normalize_age_text(2.0) == "2 years"
        assert normalize_age_text(2.5) == "2.5 years"
        assert normalize_age_text(0.5) == "6 months"
        assert normalize_age_text(1.0) == "1 year"

    def test_calculate_age_range_months(self):
        """Test age range calculation in months."""
        # Puppy range
        min_months, max_months = calculate_age_range_months(0.5)
        assert min_months == 3  # 6 months - 3
        assert max_months == 9  # 6 months + 3

        # Adult range
        min_months, max_months = calculate_age_range_months(3.0)
        assert min_months == 24  # 36 months - 12
        assert max_months == 48  # 36 months + 12

    def test_calculate_age_range_none_cases(self):
        """Test age range calculation with None input."""
        min_months, max_months = calculate_age_range_months(None)
        assert min_months is None
        assert max_months is None


@pytest.mark.integration
class TestIntegrationWithScrapers:
    """Integration tests to ensure compatibility with existing scrapers."""

    def test_theunderdog_compatibility(self):
        """Test compatibility with theunderdog normalizer patterns."""
        # Test patterns from theunderdog normalizer
        assert extract_age_from_text("Young adult (around two years)") == 2.0
        assert extract_breed_from_text("labrador mix from shelter") == "Labrador Mix"
        assert extract_weight_from_text("Large (around 30kg)") == 30.0

    def test_misis_rescue_compatibility(self):
        """Test compatibility with misis_rescue normalizer patterns."""
        # Test patterns from misis_rescue normalizer
        assert extract_age_from_text("roughly 3 y old") == 3.0
        assert extract_sex_from_text("spayed female") == "Female"
        assert extract_weight_from_text("✔️weighs around 22-25kg") == 23.5

    def test_rean_compatibility(self):
        """Test compatibility with rean scraper patterns."""
        # Test patterns from rean scraper
        assert extract_age_from_text("around 5 months old") == pytest.approx(0.42, abs=0.1)
        assert extract_weight_from_text("15 kg") == 15.0
