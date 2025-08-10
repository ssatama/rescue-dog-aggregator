"""
Test ImageProcessingService integration with BaseScraper.

Ensures that dependency injection works correctly and ImageProcessingService is used when provided.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.image_processing_service import ImageProcessingService


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperWithImageProcessingService:
    """Test BaseScraper using injected ImageProcessingService."""

    @pytest.fixture
    def mock_scraper_with_service(self):
        """Create a mock scraper that uses ImageProcessingService."""

        class MockScraperWithService(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test1"}]

        return MockScraperWithService

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_uses_injected_image_processing_service(self, mock_scraper_with_service):
        """Test that BaseScraper uses injected ImageProcessingService for image operations."""
        # Create mock image processing service
        mock_image_service = Mock(spec=ImageProcessingService)
        mock_image_service.process_primary_image.return_value = {"name": "Test Dog", "primary_image_url": "https://cloudinary.com/test.jpg", "original_image_url": "https://example.com/test.jpg"}
        # save_animal_images method removed in refactoring

        # Create scraper with injected service
        scraper = mock_scraper_with_service(organization_id=1, image_processing_service=mock_image_service)

        # Test process_primary_image via save_animal
        animal_data = {"name": "Test Dog", "external_id": "test-123", "primary_image_url": "https://example.com/test.jpg", "organization_id": 1}

        # Mock the database operations that save_animal calls
        scraper.conn = Mock()
        scraper.get_existing_animal = Mock(return_value=None)
        scraper.create_animal = Mock(return_value=(123, "added"))

        # This should call the ImageProcessingService
        result = scraper.save_animal(animal_data)

        # Verify service was called for primary image processing
        mock_image_service.process_primary_image.assert_called_once()
        args = mock_image_service.process_primary_image.call_args[0]
        assert args[0]["primary_image_url"] == "https://example.com/test.jpg"
        assert args[1] is None  # existing_animal
        assert args[2] == scraper.conn  # database connection
        assert args[3] == "Organization ID 1"  # organization_name

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_save_animal_images_removed(self, mock_scraper_with_service):
        """Test that save_animal_images method has been removed from BaseScraper."""
        scraper = mock_scraper_with_service(organization_id=1)

        # save_animal_images method no longer exists
        assert not hasattr(scraper, "save_animal_images")

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_falls_back_to_legacy_without_service(self, mock_scraper_with_service):
        """Test that BaseScraper works properly without ImageProcessingService injection."""
        # Create scraper without service injection
        scraper = mock_scraper_with_service(organization_id=1)

        # Verify no image processing service is injected (defaults to None)
        assert scraper.image_processing_service is None

        # Verify scraper still works normally without the service
        # save_animal_images method has been removed - this test just verifies graceful operation
        animal_data = {"name": "Test Dog", "external_id": "test-123"}

        # Mock database operations
        scraper.conn = Mock()
        scraper.get_existing_animal = Mock(return_value=None)
        scraper.create_animal = Mock(return_value=(123, "added"))

        # Should work fine without image service
        result = scraper.save_animal(animal_data)
        assert result == (123, "added")

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_constructor_accepts_image_service(self, mock_scraper_with_service):
        """Test that BaseScraper constructor properly accepts ImageProcessingService."""
        mock_image_service = Mock(spec=ImageProcessingService)

        scraper = mock_scraper_with_service(organization_id=1, image_processing_service=mock_image_service)

        # Verify service is stored
        assert scraper.image_processing_service == mock_image_service

        # Test without service - should default to None
        scraper_no_service = mock_scraper_with_service(organization_id=1)
        assert scraper_no_service.image_processing_service is None

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_logs_service_usage(self, mock_scraper_with_service, caplog):
        """Test that BaseScraper properly logs when ImageProcessingService is unavailable."""
        # Create scraper without service injection
        scraper = mock_scraper_with_service(organization_id=1)

        # Verify no service is injected
        assert scraper.image_processing_service is None

        # Mock database operations and trigger the image processing flow
        animal_data = {"name": "Test Dog", "external_id": "test-123", "primary_image_url": "https://example.com/test.jpg"}
        scraper.conn = Mock()
        scraper.get_existing_animal = Mock(return_value=None)
        scraper.create_animal = Mock(return_value=(123, "added"))

        # This should trigger the service unavailable logging
        scraper.save_animal(animal_data)

        # Check that service unavailable message was logged
        assert "ImageProcessingService" in caplog.text
