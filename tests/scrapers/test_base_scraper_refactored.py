# tests/scrapers/test_base_scraper_refactored.py

from unittest.mock import MagicMock, Mock

import pytest

from scrapers.base_scraper import BaseScraper


class TestScraper(BaseScraper):
    """Test implementation of BaseScraper."""

    def collect_data(self):
        """Mock implementation for testing."""
        return []


@pytest.mark.unit
@pytest.mark.fast
class TestBaseScraperRefactored:
    """Test BaseScraper after removing multi-image functionality."""

    def test_base_scraper_does_not_have_save_animal_images(self):
        """Test that save_animal_images method has been removed from BaseScraper."""
        scraper = TestScraper(organization_id=1)

        # Should NOT have save_animal_images method anymore
        assert not hasattr(scraper, "save_animal_images")

    def test_save_animal_only_processes_primary_image(self):
        """Test that save_animal only processes primary_image_url, not image_urls array."""
        scraper = TestScraper(organization_id=1)

        # Mock dependencies
        scraper.conn = Mock()
        scraper.image_processing_service = Mock()
        scraper.image_processing_service.process_primary_image.return_value = {"name": "Test Dog", "primary_image_url": "https://images.rescuedogs.me/processed.jpg"}

        # Mock database operations
        cursor_mock = Mock()
        scraper.conn.cursor.return_value = cursor_mock
        cursor_mock.fetchone.return_value = None  # No existing animal
        cursor_mock.lastrowid = 123

        # Test data with both primary_image_url and image_urls (image_urls should be ignored)
        animal_data = {
            "name": "Test Dog",
            "primary_image_url": "https://example.com/primary.jpg",
            "image_urls": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],  # This should be ignored
            "organization_id": 1,
            "external_id": "test-123",
        }

        result = scraper.save_animal(animal_data)

        # Verify primary image was processed
        scraper.image_processing_service.process_primary_image.assert_called_once()

        # Verify image_urls array was ignored (no call to save_animal_images)
        # We can't call save_animal_images because it doesn't exist anymore
        assert result is not None  # Animal was saved successfully

    def test_save_animal_without_images_still_works(self):
        """Test that save_animal works when no images are provided."""
        scraper = TestScraper(organization_id=1)

        # Mock dependencies
        scraper.conn = Mock()
        scraper.image_processing_service = Mock()
        scraper.image_processing_service.process_primary_image.return_value = {"name": "Test Dog"}

        # Mock database operations
        cursor_mock = Mock()
        scraper.conn.cursor.return_value = cursor_mock
        cursor_mock.fetchone.return_value = None  # No existing animal
        cursor_mock.lastrowid = 123

        # Test data without any images
        animal_data = {"name": "Test Dog", "organization_id": 1, "external_id": "test-123"}

        result = scraper.save_animal(animal_data)

        # Should still work without calling image processing (no primary_image_url)
        assert result is not None
        # process_primary_image should NOT be called when no primary_image_url
        scraper.image_processing_service.process_primary_image.assert_not_called()

    def test_save_animal_with_primary_image_only(self):
        """Test that save_animal correctly processes primary_image_url."""
        scraper = TestScraper(organization_id=1)

        # Mock dependencies
        scraper.conn = Mock()
        scraper.image_processing_service = Mock()
        scraper.image_processing_service.process_primary_image.return_value = {
            "name": "Test Dog",
            "primary_image_url": "https://images.rescuedogs.me/processed.jpg",
            "original_image_url": "https://example.com/original.jpg",
        }

        # Mock database operations
        cursor_mock = Mock()
        scraper.conn.cursor.return_value = cursor_mock
        cursor_mock.fetchone.return_value = None  # No existing animal
        cursor_mock.lastrowid = 123

        # Test data with only primary image (the new pattern)
        animal_data = {"name": "Test Dog", "primary_image_url": "https://example.com/original.jpg", "organization_id": 1, "external_id": "test-123"}

        result = scraper.save_animal(animal_data)

        # Verify primary image was processed
        scraper.image_processing_service.process_primary_image.assert_called_once()

        # Verify the processed image data was used
        call_args = scraper.image_processing_service.process_primary_image.call_args[0]
        assert "primary_image_url" in call_args[0]

        assert result is not None  # Animal was saved successfully
