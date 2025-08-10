# tests/services/test_image_processing_service_refactored.py

from unittest.mock import MagicMock, Mock

import pytest

from services.image_processing_service import ImageProcessingService
from utils.r2_service import R2Service


class TestImageProcessingServiceRefactored:
    """Test ImageProcessingService after removing multi-image functionality."""

    def test_service_initialization(self):
        """Test that service can be initialized without multi-image capabilities."""
        service = ImageProcessingService()

        assert service is not None
        assert hasattr(service, "process_primary_image")
        assert hasattr(service, "upload_image_to_r2")
        assert hasattr(service, "validate_image_url")

        # Should NOT have save_animal_images method anymore
        assert not hasattr(service, "save_animal_images")

    def test_primary_image_processing_still_works(self):
        """Test that primary image processing continues to function."""
        mock_r2_service = Mock(spec=R2Service)
        mock_r2_service.upload_image_from_url.return_value = ("https://images.rescuedogs.me/test.jpg", True)

        service = ImageProcessingService(r2_service=mock_r2_service)

        animal_data = {"name": "Test Dog", "primary_image_url": "https://example.com/dog.jpg"}

        result = service.process_primary_image(animal_data, organization_name="test-org")

        assert "primary_image_url" in result
        assert "original_image_url" in result
        # Should have called R2 service
        mock_r2_service.upload_image_from_url.assert_called_once()

    def test_validate_image_url_still_works(self):
        """Test that image URL validation continues to work."""
        service = ImageProcessingService()

        # Valid URLs
        assert service.validate_image_url("https://example.com/dog.jpg") is True
        assert service.validate_image_url("http://example.com/cat.png") is True

        # Invalid URLs
        assert service.validate_image_url("not-a-url") is False
        assert service.validate_image_url("") is False
        assert service.validate_image_url(None) is False

    def test_upload_image_to_r2_still_works(self):
        """Test that R2 upload functionality still works."""
        mock_r2_service = Mock(spec=R2Service)
        mock_r2_service.upload_image_from_url.return_value = ("https://images.rescuedogs.me/test.jpg", True)

        service = ImageProcessingService(r2_service=mock_r2_service)

        url, success = service.upload_image_to_r2("https://example.com/dog.jpg", "Test Dog", "test-org")

        assert success is True
        assert url == "https://images.rescuedogs.me/test.jpg"
        mock_r2_service.upload_image_from_url.assert_called_once_with("https://example.com/dog.jpg", "Test Dog", "test-org")

    def test_service_does_not_have_multi_image_methods(self):
        """Ensure all multi-image methods have been removed."""
        service = ImageProcessingService()

        # These methods should not exist anymore
        removed_methods = ["save_animal_images", "_get_existing_images", "_handle_existing_image", "_handle_new_image", "_cleanup_removed_images", "_create_existing_urls_map", "_get_animal_name"]

        for method_name in removed_methods:
            assert not hasattr(service, method_name), f"Method {method_name} should be removed"

    def test_process_primary_image_without_url(self):
        """Test primary image processing when no URL is provided."""
        service = ImageProcessingService()

        animal_data = {"name": "Test Dog"}  # No primary_image_url

        result = service.process_primary_image(animal_data, organization_name="test-org")

        # Should return unchanged data when no image URL
        assert result == animal_data
