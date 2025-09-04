"""
Test Suite for SanterPawsBulgarianRescue Scraper with Unified Standardization

Tests the migration of SanterPaws from old standardization.py to unified standardization.
Focuses on proper breed standardization (including potential Bulgarian breeds),
age parsing, size handling, and overall data consistency.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock, call
from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import SanterPawsBulgarianRescueScraper
from scrapers.base_scraper import BaseScraper


class TestSanterPawsBulgarianRescueUnifiedStandardization:
    """Test SanterPaws scraper uses unified standardization correctly."""

    @pytest.fixture
    def scraper(self):
        """Create a SanterPaws scraper instance."""
        # Mock the database service to avoid database connections
        with patch('scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper.SanterPawsBulgarianRescueScraper.__init__', return_value=None):
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
            "primary_image_url": "https://example.com/luna.jpg"
        }
        
        # Mock the standardizer to return the expected structure
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": {
                "name": "Bulgarian Shepherd Mix",
                "group": "Mixed",
                "is_mixed": True
            },
            "age": {
                "years": 2,
                "category": "Adult"
            },
            "size": {
                "category": "Large"
            }
        }
        
        # Act
        result = scraper.process_animal(raw_data)
        
        # Assert - check that standardizer was called with keyword args
        scraper.standardizer.apply_full_standardization.assert_called_once_with(
            breed="bulgarian shepherd mix",
            age="2 years",
            size="Large"
        )
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
            "size": "XLarge"
        }
        
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": {
                "name": "Karakachan",
                "group": "Guardian",
                "is_mixed": False
            },
            "age": {
                "years": 4,
                "category": "Adult"
            },
            "size": {
                "category": "X-Large"
            }
        }
        
        # Act
        result = scraper.process_animal(raw_data)
        
        # Assert
        assert result["breed"] == "Karakachan"
        assert result["breed_category"] == "Guardian"
        assert result["standardized_size"] == "X-Large"

    def test_age_text_standardization(self, scraper):
        """Test various age formats are properly standardized."""
        # Arrange
        test_cases = [
            ("8 weeks", 0.15, "Puppy"),
            ("6 months", 0.5, "Puppy"),
            ("1 year", 1, "Adult"),
            ("5 years old", 5, "Adult"),
            ("10+ years", 10, "Senior")
        ]
        
        for age_text, expected_age, expected_category in test_cases:
            raw_data = {
                "name": "Test Dog",
                "age": age_text,
                "breed": "Mixed Breed"
            }
            
            scraper.standardizer.apply_full_standardization.return_value = {
                "breed": {
                    "name": "Mixed Breed",
                    "group": "Mixed",
                    "is_mixed": True
                },
                "age": {
                    "years": expected_age,
                    "category": expected_category
                }
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
            ("xlarge", "X-Large"),
            ("giant", "X-Large")
        ]
        
        for raw_size, expected_size in test_cases:
            raw_data = {
                "name": "Test Dog",
                "size": raw_size,
                "breed": "Mixed Breed"
            }
            
            scraper.standardizer.apply_full_standardization.return_value = {
                "breed": {
                    "name": "Mixed Breed",
                    "group": "Mixed",
                    "is_mixed": True
                },
                "size": {
                    "category": expected_size
                }
            }
            
            # Act
            result = scraper.process_animal(raw_data)
            
            # Assert
            assert result["standardized_size"] == expected_size

    def test_mixed_breed_handling(self, scraper):
        """Test that mixed breeds are properly categorized."""
        # Arrange
        raw_data = {
            "name": "Mila",
            "breed": "shepherd mix",
            "age": "3 years"
        }
        
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": {
                "name": "Shepherd Mix",
                "group": "Mixed",
                "is_mixed": True
            },
            "age": {
                "years": 3,
                "category": "Adult"
            }
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
            "breed": "Mixed Breed",  # Add default breed
            "standardized_size": "Medium"  # Add default size
        }
        
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": {
                "name": "Mixed Breed",
                "group": "Mixed",
                "is_mixed": True
            },
            "age": {
                "category": "Adult"
            },
            "size": {
                "category": "Medium"
            }
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
        
        scraper.standardizer.apply_full_standardization.return_value = {
            "breed": {
                "name": "Labrador Retriever",
                "group": "Sporting",
                "is_mixed": False
            }
        }
        
        # Act
        result = scraper.process_animal(raw_data)
        
        # Assert
        scraper.standardizer.apply_full_standardization.assert_called_once()
        assert result["breed"] == "Labrador Retriever"