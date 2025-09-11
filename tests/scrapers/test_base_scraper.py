# tests/scrapers/test_base_scraper_behavioral.py
"""
Behavioral tests for BaseScraper - testing outcomes, not implementation details.
Replaces the overly granular test_base_scraper.py with focused behavioral tests.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


class ConcreteTestScraper(BaseScraper):
    """Concrete implementation for testing."""

    def collect_data(self):
        return [
            {"name": "Test Dog", "external_id": "test-1", "primary_image_url": "https://example.com/dog.jpg"},
        ]


@pytest.mark.unit
@pytest.mark.fast
class TestBaseScraperBehavior:
    """Test BaseScraper behavior - what it does, not how it does it."""
    
    @pytest.fixture
    def scraper(self):
        """Create a test scraper instance."""
        with patch("scrapers.base_scraper.psycopg2"):
            scraper = ConcreteTestScraper(organization_id=1)
            # Mock database service for proper functionality
            scraper.database_service = Mock()
            scraper.conn = Mock()
            scraper.cursor = Mock()
            return scraper

    def test_scraper_saves_new_animals(self, scraper):
        """Test that scraper successfully saves new animals to database."""
        # Setup
        scraper.database_service.get_existing_animal.return_value = None  # No existing animal
        scraper.database_service.create_animal.return_value = (123, "create")

        animal_data = {
            "name": "New Dog",
            "external_id": "new-1",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt/new-1",
        }

        # Act
        result = scraper.save_animal(animal_data)

        # Assert
        assert result == (123, "create")

    def test_scraper_handles_database_errors_gracefully(self, scraper):
        """Test that scraper handles database errors without crashing."""
        # Setup
        scraper.database_service.create_animal.side_effect = Exception("Database error")

        animal_data = {
            "name": "Error Dog",
            "external_id": "error-1",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt/error-1",
        }

        # Act & Assert
        result = scraper.save_animal(animal_data)
        assert result == (None, "error")  # Should return error tuple, not crash
    
    def test_scraper_rejects_animal_with_empty_image_url(self, scraper):
        """Test that animals with empty string image URLs are rejected during validation."""
        # Animal data with empty string for primary_image_url (invalid)
        animal_data_empty_url = {
            "name": "Test Dog",
            "external_id": "test-empty-url",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "",  # Empty string should be rejected
        }
        
        # Validate should return False for empty image URL
        assert not scraper._validate_animal_data(animal_data_empty_url)
        
        # Animal data with None for primary_image_url (valid - optional field)
        animal_data_none_url = {
            "name": "Test Dog",
            "external_id": "test-none-url",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": None,  # None is acceptable
        }
        
        # Validate should return True for None image URL
        assert scraper._validate_animal_data(animal_data_none_url)
        
        # Animal data with valid URL (valid)
        animal_data_valid_url = {
            "name": "Test Dog",
            "external_id": "test-valid-url",
            "organization_id": 1,
            "adoption_url": "https://example.com/adopt",
            "primary_image_url": "https://example.com/dog.jpg",  # Valid URL
        }
        
        # Validate should return True for valid image URL
        assert scraper._validate_animal_data(animal_data_valid_url)