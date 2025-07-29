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
        mock_image_service.save_animal_images.return_value = (3, 0)  # 3 success, 0 failures

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
    def test_basescraper_save_animal_images_uses_service(self, mock_scraper_with_service):
        """Test that save_animal_images uses injected ImageProcessingService."""
        mock_image_service = Mock(spec=ImageProcessingService)
        mock_image_service.save_animal_images.return_value = (2, 1)  # 2 success, 1 failure

        scraper = mock_scraper_with_service(organization_id=1, image_processing_service=mock_image_service)
        scraper.conn = Mock()

        image_urls = ["https://example.com/image1.jpg", "https://example.com/image2.jpg", "https://example.com/image3.jpg"]

        result = scraper.save_animal_images(123, image_urls)

        # Verify service was called with correct parameters
        mock_image_service.save_animal_images.assert_called_once_with(123, image_urls, scraper.conn, "Organization ID 1")
        assert result == (2, 1)

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_falls_back_to_legacy_without_service(self, mock_scraper_with_service):
        """Test that BaseScraper returns appropriate defaults without ImageProcessingService."""
        # Create scraper without service injection
        scraper = mock_scraper_with_service(organization_id=1)

        # Verify no image processing service
        assert scraper.image_processing_service is None

        # Mock database and Cloudinary for legacy mode
        scraper.conn = Mock()
        scraper.cloudinary_service = Mock()
        scraper.cloudinary_service.upload_image_from_url.return_value = ("https://cloudinary.com/legacy.jpg", True)

        # Mock save_animal_images legacy behavior
        mock_cursor = Mock()
        scraper.conn.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = []  # No existing images
        mock_cursor.fetchone.return_value = ("Test Dog",)  # Animal name

        result = scraper.save_animal_images(123, ["https://example.com/legacy.jpg"])

        # Should return (0, 1) indicating 0 successes and 1 failure (service unavailable)
        assert result == (0, 1)

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

        # Test without service
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
        """Test that BaseScraper logs when ImageProcessingService is not available."""
        # Create scraper without service injection
        scraper = mock_scraper_with_service(organization_id=1)

        # Call save_animal_images to trigger service unavailable logging
        result = scraper.save_animal_images(123, ["https://example.com/image.jpg"])

        # Check that service unavailable message was logged
        assert "No ImageProcessingService available" in caplog.text
