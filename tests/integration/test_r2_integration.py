import os
import sys
from unittest.mock import Mock, patch

import pytest

from utils.r2_service import R2Service

# Add project root to path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)


@pytest.mark.slow
@pytest.mark.network
@pytest.mark.integration
class TestR2Integration:
    """Test the complete image upload flow from scraper to frontend."""

    def setup_method(self):
        """Reset R2Service configuration cache before each test."""
        R2Service._reset_config_cache()

    @patch.dict(
        "os.environ",
        {
            "R2_ACCOUNT_ID": "test-account-id",
            "R2_ACCESS_KEY_ID": "test-access-key",
            "R2_SECRET_ACCESS_KEY": "test-secret-key",
            "R2_BUCKET_NAME": "test-bucket",
            "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
            "R2_CUSTOM_DOMAIN": "https://images.example.com",
        },
        clear=False,
    )
    @patch("utils.r2_service.boto3.client")
    @patch("utils.r2_service.requests.get")
    def test_end_to_end_image_upload_success(self, mock_requests, mock_boto_client):
        """Test complete successful image upload flow."""
        # Mock successful image download
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "image/jpeg"}
        mock_response.content = b"fake_image_data"
        mock_response.raise_for_status = Mock()  # Mock this method to avoid exceptions
        mock_requests.return_value = mock_response

        # Mock successful R2 upload
        mock_s3_client = Mock()
        # Mock ClientError for 404 (object not found)
        from botocore.exceptions import ClientError

        mock_s3_client.head_object.side_effect = ClientError(
            error_response={"Error": {"Code": "404", "Message": "Not Found"}},
            operation_name="HeadObject",
        )
        mock_s3_client.upload_fileobj.return_value = None  # Successful upload
        mock_boto_client.return_value = mock_s3_client

        # Mock environment variables already set above

        # Test the upload
        service = R2Service()
        r2_url, success = service.upload_image_from_url(
            "https://example.com/original.jpg", "Test Dog", "Test Org"
        )

        # Verify results
        assert success is True
        assert r2_url.startswith(
            "https://images.example.com/rescue_dogs/test_org/test_dog_"
        )
        assert r2_url.endswith(".jpg")
        mock_s3_client.upload_fileobj.assert_called_once()
        mock_requests.assert_called_once()

    @patch.dict(
        "os.environ",
        {
            "R2_ACCOUNT_ID": "",
            "R2_ACCESS_KEY_ID": "",
            "R2_SECRET_ACCESS_KEY": "",
            "R2_BUCKET_NAME": "",
            "R2_ENDPOINT": "",
            "R2_CUSTOM_DOMAIN": "",
        },
        clear=False,
    )
    def test_missing_credentials_handling(self):
        """Test that missing R2 credentials are handled gracefully."""
        service = R2Service()
        r2_url, success = service.upload_image_from_url(
            "https://example.com/test.jpg", "Test Dog", "Test Org"
        )

        assert success is False
        assert (
            r2_url == "https://example.com/test.jpg"
        )  # Returns original URL as fallback

    @patch.dict(
        "os.environ",
        {
            "R2_ACCOUNT_ID": "test-account-id",
            "R2_ACCESS_KEY_ID": "test-access-key",
            "R2_SECRET_ACCESS_KEY": "test-secret-key",
            "R2_BUCKET_NAME": "test-bucket",
            "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
            "R2_CUSTOM_DOMAIN": "https://images.example.com",
        },
        clear=False,
    )
    @patch("utils.r2_service.requests.get")
    def test_network_failure_handling(self, mock_requests):
        """Test handling of network failures during image download."""
        # Mock network failure
        mock_requests.side_effect = Exception("Network timeout")

        service = R2Service()
        r2_url, success = service.upload_image_from_url(
            "https://example.com/unreachable.jpg", "Test Dog", "Test Org"
        )

        assert success is False
        assert (
            r2_url == "https://example.com/unreachable.jpg"
        )  # Returns original URL as fallback

    @patch.dict(
        "os.environ",
        {
            "R2_ACCOUNT_ID": "test-account-id",
            "R2_ACCESS_KEY_ID": "test-access-key",
            "R2_SECRET_ACCESS_KEY": "test-secret-key",
            "R2_BUCKET_NAME": "test-bucket",
            "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
            "R2_CUSTOM_DOMAIN": "https://images.example.com",
        },
        clear=False,
    )
    @patch("utils.r2_service.boto3.client")
    @patch("utils.r2_service.requests.get")
    def test_existing_image_handling(self, mock_requests, mock_boto_client):
        """Test handling of existing images (should not re-upload)."""
        # Mock successful image download
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "image/jpeg"}
        mock_response.content = b"fake_image_data"
        mock_response.raise_for_status = Mock()
        mock_requests.return_value = mock_response

        # Mock existing image in R2
        mock_s3_client = Mock()
        mock_s3_client.head_object.return_value = {
            "ContentLength": 1024
        }  # Image exists
        mock_boto_client.return_value = mock_s3_client

        service = R2Service()
        r2_url, success = service.upload_image_from_url(
            "https://example.com/existing.jpg", "Existing Dog", "Test Org"
        )

        assert success is True
        assert r2_url.startswith(
            "https://images.example.com/rescue_dogs/test_org/existing_dog_"
        )
        assert r2_url.endswith(".jpg")
        # Should not call upload_fileobj since image already exists
        mock_s3_client.upload_fileobj.assert_not_called()

    @patch.dict(
        "os.environ",
        {
            "R2_ACCOUNT_ID": "test-account-id",
            "R2_ACCESS_KEY_ID": "test-access-key",
            "R2_SECRET_ACCESS_KEY": "test-secret-key",
            "R2_BUCKET_NAME": "test-bucket",
            "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
            "R2_CUSTOM_DOMAIN": "https://images.example.com",
        },
        clear=False,
    )
    @patch("utils.r2_service.requests.get")
    def test_invalid_image_content_handling(self, mock_requests):
        """Test handling of invalid image content."""
        # Mock response with invalid content type
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "text/html"}
        mock_response.content = b"<html>Not an image</html>"
        mock_response.raise_for_status = Mock()
        mock_requests.return_value = mock_response

        service = R2Service()
        r2_url, success = service.upload_image_from_url(
            "https://example.com/fake-image.jpg", "Test Dog", "Test Org"
        )

        assert success is False
        assert (
            r2_url == "https://example.com/fake-image.jpg"
        )  # Returns original URL as fallback

    def test_r2_service_is_configured_check(self):
        """Test R2Service configuration validation."""
        # Test with missing configuration
        with patch.dict("os.environ", {}, clear=True):
            R2Service._reset_config_cache()
            assert R2Service.is_configured() is False

        # Test with complete configuration
        with patch.dict(
            "os.environ",
            {
                "R2_ACCOUNT_ID": "test-account-id",
                "R2_ACCESS_KEY_ID": "test-access-key",
                "R2_SECRET_ACCESS_KEY": "test-secret-key",
                "R2_BUCKET_NAME": "test-bucket",
                "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
                "R2_CUSTOM_DOMAIN": "https://images.example.com",
            },
            clear=False,
        ):
            R2Service._reset_config_cache()
            assert R2Service.is_configured() is True
