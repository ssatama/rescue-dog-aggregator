"""
Test Suite for SanterPawsBulgarianRescue Scraper with Unified Standardization

Tests the migration of SanterPaws from old standardization.py to unified standardization.
Focuses on proper breed standardization (including potential Bulgarian breeds),
age parsing, size handling, and overall data consistency.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import (
    SanterPawsBulgarianRescueScraper,
)


class TestSanterPawsBulgarianRescueUnifiedStandardization:
    """Test SanterPaws scraper uses unified standardization correctly."""

    @pytest.fixture
    def scraper(self):
        """Create a SanterPaws scraper instance."""
        # Mock the database service to avoid database connections
        with patch(
            "scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper.SanterPawsBulgarianRescueScraper.__init__",
            return_value=None,
        ):
            scraper = SanterPawsBulgarianRescueScraper.__new__(SanterPawsBulgarianRescueScraper)
            scraper.config_id = "santerpawsbulgarianrescue"
            scraper.standardizer = Mock()
            scraper.use_unified_standardization = True
            scraper.logger = Mock()
            scraper.organization_id = 1
            scraper.scrape_status = {"success": 0, "errors": 0}
            return scraper

    def test_inherits_from_base_scraper(self):
        """Test that SanterPaws properly inherits from BaseScraper."""
        assert issubclass(SanterPawsBulgarianRescueScraper, BaseScraper)

    def test_process_animal_with_unified_standardization(self, scraper):
        """Test that process_animal uses unified standardization when enabled."""
        # Arrange
        raw_data = {
            "name": "Luna",
            "breed": "bulgarian shepherd mix",
            "age": "2 years",
            "gender": "Female",
            "size": "Large",
            "description": "Sweet Bulgarian shepherd mix",
            "adoption_url": "https://example.com/luna",
            "external_id": "SP123",
            "primary_image_url": "https://example.com/luna.jpg",
        }

        # Mock the standardizer methods
        scraper.standardizer.apply_field_normalization.return_value = raw_data.copy()
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": "Bulgarian Shepherd Mix",
            "breed_category": "Mixed",
            "primary_breed": "Bulgarian Shepherd Mix",
            "secondary_breed": "Mixed Breed",
            "standardization_confidence": 0.85,
            "age": "2 years",
            "age_category": "Young",
            "age_min_months": 24,
            "age_max_months": 36,
            "size": "Large",
            "standardized_size": "Large",
        }

        # Act
        result = scraper.process_animal(raw_data)

        # Assert - check that standardizer was called with keyword args
        scraper.standardizer.apply_full_standardization.assert_called_once_with(breed="bulgarian shepherd mix", age="2 years", size="Large")
        assert result["breed"] == "Bulgarian Shepherd Mix"
        assert result["breed_category"] == "Mixed"

    def test_bulgarian_breed_standardization(self, scraper):
        """Test that Bulgarian breeds are properly standardized."""
        # Arrange - test with Karakachan (Bulgarian shepherd breed)
        raw_data = {
            "name": "Boris",
            "breed": "karakachan",
            "age": "4 years old",
            "gender": "Male",
            "size": "XLarge",
        }

        # Mock both standardizer methods
        scraper.standardizer.apply_field_normalization.return_value = raw_data.copy()
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": "Karakachan",
            "breed_category": "Guardian",
            "primary_breed": "Karakachan",
            "secondary_breed": None,
            "standardization_confidence": 0.95,
            "age": "4 years old",
            "age_category": "Adult",
            "age_min_months": 48,
            "age_max_months": 60,
            "size": "XLarge",
            "standardized_size": "Large",  # XLarge maps to Large for canonical sizes
        }

        # Act
        result = scraper.process_animal(raw_data)

        # Assert
        assert result["breed"] == "Karakachan"
        assert result["breed_category"] == "Guardian"
        assert result["standardized_size"] == "Large"

    def test_age_text_standardization(self, scraper):
        """Test various age formats are properly standardized."""
        # Arrange
        test_cases = [
            ("8 weeks", "Puppy", 2, 3),
            ("6 months", "Puppy", 6, 12),
            ("1 year", "Young", 12, 24),
            ("5 years old", "Adult", 60, 72),
            ("10+ years", "Senior", 120, 132),
        ]

        for (
            age_text,
            expected_category,
            expected_min_months,
            expected_max_months,
        ) in test_cases:
            raw_data = {"name": "Test Dog", "age": age_text, "breed": "Mixed Breed"}

            # Mock both standardizer methods for each iteration
            scraper.standardizer.apply_field_normalization.return_value = raw_data.copy()
            scraper.standardizer.apply_full_standardization.return_value = {
                "breed": "Mixed Breed",
                "breed_category": "Mixed",
                "primary_breed": "Mixed Breed",
                "secondary_breed": "Mixed Breed",
                "standardization_confidence": 0.8,
                "age": age_text,
                "age_category": expected_category,
                "age_min_months": expected_min_months,
                "age_max_months": expected_max_months,
                "size": None,
                "standardized_size": "Medium",  # default
            }

            # Act
            result = scraper.process_animal(raw_data)

            # Assert - age is kept as original string
            assert result["age"] == age_text

    def test_size_standardization(self, scraper):
        """Test that sizes are properly standardized."""
        # Arrange
        test_cases = [
            ("small", "Small"),
            ("medium", "Medium"),
            ("large", "Large"),
            ("xlarge", "Large"),  # xlarge maps to Large for canonical sizes
            ("giant", "Large"),  # giant maps to Large for canonical sizes
        ]

        for raw_size, expected_size in test_cases:
            raw_data = {"name": "Test Dog", "size": raw_size, "breed": "Mixed Breed"}

            # Mock both standardizer methods
            scraper.standardizer.apply_field_normalization.return_value = raw_data.copy()
            scraper.standardizer.apply_full_standardization.return_value = {
                "breed": "Mixed Breed",
                "breed_category": "Mixed",
                "primary_breed": "Mixed Breed",
                "secondary_breed": "Mixed Breed",
                "standardization_confidence": 0.8,
                "age": None,
                "age_category": "Adult",
                "age_min_months": None,
                "age_max_months": None,
                "size": raw_size,
                "standardized_size": expected_size,
            }

            # Act
            result = scraper.process_animal(raw_data)

            # Assert
            assert result["standardized_size"] == expected_size

    def test_mixed_breed_handling(self, scraper):
        """Test that mixed breeds are properly categorized."""
        # Arrange
        raw_data = {"name": "Mila", "breed": "shepherd mix", "age": "3 years"}

        # Mock both standardizer methods
        scraper.standardizer.apply_field_normalization.return_value = raw_data.copy()
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": "Shepherd Mix",
            "breed_category": "Mixed",
            "primary_breed": "Shepherd Mix",
            "secondary_breed": "Mixed Breed",
            "standardization_confidence": 0.85,
            "age": "3 years",
            "age_category": "Adult",
            "age_min_months": 36,
            "age_max_months": 48,
            "size": None,
            "standardized_size": "Medium",
        }

        # Act
        result = scraper.process_animal(raw_data)

        # Assert
        assert result["breed"] == "Shepherd Mix"
        assert result["breed_category"] == "Mixed"

    def test_defaults_for_missing_fields(self, scraper):
        """Test that missing fields get proper defaults."""
        # Arrange
        raw_data = {
            "name": "Unknown Dog",
            "adoption_url": "https://example.com/dog",
            "breed": "Mixed Breed",
            "standardized_size": "Medium",
        }  # Add default breed  # Add default size

        # Mock both standardizer methods
        scraper.standardizer.apply_field_normalization.return_value = raw_data.copy()
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": "Mixed Breed",
            "breed_category": "Mixed",
            "primary_breed": "Mixed Breed",
            "secondary_breed": "Mixed Breed",
            "standardization_confidence": 0.8,
            "age": None,
            "age_category": "Adult",
            "age_min_months": None,
            "age_max_months": None,
            "size": None,
            "standardized_size": "Medium",
        }

        # Act
        result = scraper.process_animal(raw_data)

        # Assert
        assert result["breed"] == "Mixed Breed"
        assert result["standardized_size"] == "Medium"

    def test_feature_flag_enabled(self, scraper):
        """Test that unified standardization respects the feature flag."""
        # Arrange
        scraper.use_unified_standardization = True
        raw_data = {"name": "Test", "breed": "labrador"}

        # Mock both standardizer methods
        scraper.standardizer.apply_field_normalization.return_value = raw_data.copy()
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": "Labrador Retriever",
            "breed_category": "Sporting",
            "primary_breed": "Labrador Retriever",
            "secondary_breed": None,
            "standardization_confidence": 0.95,
            "age": None,
            "age_category": "Adult",
            "age_min_months": None,
            "age_max_months": None,
            "size": None,
            "standardized_size": "Medium",
        }

        # Act
        result = scraper.process_animal(raw_data)

        # Assert
        scraper.standardizer.apply_full_standardization.assert_called_once()
        assert result["breed"] == "Labrador Retriever"
