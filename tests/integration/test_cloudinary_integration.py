import os
import sys
from unittest.mock import Mock, patch

import pytest

from utils.cloudinary_service import CloudinaryService

# Add project root to path
sys.path.append(
    os.path.dirname(
        os.path.dirname(
            os.path.dirname(
                os.path.abspath(__file__))))
)


@pytest.mark.slow
@pytest.mark.network
@pytest.mark.integration
class TestCloudinaryIntegration:
    """Test the complete image upload flow from scraper to frontend."""

    def setup_method(self):
        """Reset CloudinaryService configuration cache before each test."""
        CloudinaryService._reset_config_cache()

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "test-cloud",
            "CLOUDINARY_API_KEY": "test-key",
            "CLOUDINARY_API_SECRET": "test-secret",
        },
        clear=False,
    )
    @patch("utils.cloudinary_service.cloudinary.uploader.upload")
    @patch("utils.cloudinary_service.requests.get")
    @patch("utils.cloudinary_service.cloudinary.api.resource")
    def test_end_to_end_image_upload_success(
        self, mock_resource, mock_requests, mock_upload
    ):
        """Test complete successful image upload flow."""
        # Mock image doesn't exist yet
        from cloudinary.exceptions import NotFound

        mock_resource.side_effect = NotFound("Image not found")

        # Mock successful image download
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "image/jpeg"}
        mock_response.content = b"fake_image_data"
        mock_response.raise_for_status = Mock()  # Mock this method to avoid exceptions
        mock_requests.return_value = mock_response

        # Mock successful Cloudinary upload
        mock_upload.return_value = {
            "secure_url": "https://res.cloudinary.com/test-cloud/image/upload/v1/rescue_dogs/test_org/test_dog_12345678.jpg",
            "public_id": "rescue_dogs/test_org/test_dog_12345678",
        }

        # Test the upload
        service = CloudinaryService()
        cloudinary_url, success = service.upload_image_from_url(
            "https://example.com/original.jpg", "Test Dog", "Test Org"
        )

        # Verify results
        assert success is True
        assert (
            cloudinary_url
            == "https://res.cloudinary.com/test-cloud/image/upload/v1/rescue_dogs/test_org/test_dog_12345678.jpg"
        )

        # Verify mocks were called correctly
        mock_requests.assert_called_once()
        mock_upload.assert_called_once()

        # Verify upload parameters
        upload_call_args = mock_upload.call_args
        assert upload_call_args[0][0] == b"fake_image_data"  # Image content
        assert "rescue_dogs/test_org/test_dog" in upload_call_args[1]["public_id"]

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
        clear=False,
    )
    def test_missing_credentials_handling(self):
        """Test that missing Cloudinary credentials are handled gracefully."""
        service = CloudinaryService()
        cloudinary_url, success = service.upload_image_from_url(
            "https://example.com/test.jpg", "Test Dog", "Test Org"
        )

        assert success is False
        # Updated: Should return original URL as fallback, not None
        assert cloudinary_url == "https://example.com/test.jpg"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "test-cloud",
            "CLOUDINARY_API_KEY": "test-key",
            "CLOUDINARY_API_SECRET": "test-secret",
        },
        clear=False,
    )
    @patch("utils.cloudinary_service.requests.get")
    def test_network_failure_handling(self, mock_requests):
        """Test handling of network failures during image download."""
        # Mock network failure
        mock_requests.side_effect = Exception("Network timeout")

        service = CloudinaryService()
        cloudinary_url, success = service.upload_image_from_url(
            "https://example.com/unreachable.jpg", "Test Dog", "Test Org"
        )

        assert success is False
        # Updated: Should return original URL as fallback, not None
        assert cloudinary_url == "https://example.com/unreachable.jpg"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "test-cloud",
            "CLOUDINARY_API_KEY": "test-key",
            "CLOUDINARY_API_SECRET": "test-secret",
        },
        clear=False,
    )
    @patch("utils.cloudinary_service.cloudinary.api.resource")
    def test_existing_image_detection(self, mock_resource):
        """Test that existing images are detected and not re-uploaded."""
        # Mock existing image
        mock_resource.return_value = {
            "secure_url": "https://res.cloudinary.com/test-cloud/existing.jpg"
        }

        service = CloudinaryService()
        cloudinary_url, success = service.upload_image_from_url(
            "https://example.com/existing.jpg", "Existing Dog", "Test Org"
        )

        assert success is True
        assert cloudinary_url == "https://res.cloudinary.com/test-cloud/existing.jpg"

        # Verify we checked for existing image
        mock_resource.assert_called_once()
