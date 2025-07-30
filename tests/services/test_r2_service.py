"""
Tests for R2Service - Interface parity with CloudinaryService
"""

import hashlib
from unittest.mock import MagicMock, Mock, patch

import boto3
import pytest
from botocore.exceptions import ClientError, NoCredentialsError

from utils.r2_service import R2ConfigurationError, R2Service


@pytest.mark.computation
@pytest.mark.integration
@pytest.mark.network
@pytest.mark.slow
class TestR2ServiceConfiguration:
    """Test R2Service configuration and validation"""

    def test_is_configured_returns_true_when_all_vars_present(self):
        """Test that is_configured returns True when all required env vars are set"""
        with patch.dict(
            "os.environ",
            {
                "R2_ACCOUNT_ID": "test_account_id",
                "R2_ACCESS_KEY_ID": "test_access_key",
                "R2_SECRET_ACCESS_KEY": "test_secret",
                "R2_BUCKET_NAME": "test_bucket",
                "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
                "R2_CUSTOM_DOMAIN": "https://images.example.com",
            },
        ):
            assert R2Service.is_configured() is True

    def test_is_configured_returns_false_when_vars_missing(self):
        """Test that is_configured returns False when required env vars are missing"""
        with patch.dict("os.environ", {}, clear=True):
            R2Service._reset_config_cache()  # Reset cache for test
            assert R2Service.is_configured() is False

    def test_configuration_error_raised_when_required(self):
        """Test that R2ConfigurationError is raised when required and not configured"""
        with patch.dict("os.environ", {}, clear=True):
            R2Service._reset_config_cache()  # Reset cache for test
            with pytest.raises(R2ConfigurationError):
                R2Service.upload_image_from_url("http://example.com/image.jpg", "test_dog", raise_on_missing_config=True)

    def test_get_status_returns_configuration_info(self):
        """Test that get_status returns configuration status"""
        with patch.dict(
            "os.environ",
            {
                "R2_ACCOUNT_ID": "test_account_id",
                "R2_ACCESS_KEY_ID": "test_access_key",
                "R2_SECRET_ACCESS_KEY": "test_secret",
                "R2_BUCKET_NAME": "test_bucket",
                "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
            },
        ):
            R2Service._reset_config_cache()  # Reset cache for test
            status = R2Service.get_status()
            assert status["configured"] is True
            assert status["account_id"] == "test_account_id"
            assert status["access_key_set"] is True
            assert status["secret_key_set"] is True
            assert status["bucket_name"] == "test_bucket"


class TestR2ServiceUpload:
    """Test R2Service upload functionality"""

    @patch("utils.r2_service.boto3.client")
    @patch("utils.r2_service.requests.get")
    def test_upload_image_from_url_success(self, mock_requests_get, mock_boto3_client):
        """Test successful image upload to R2"""
        # Mock environment variables
        with patch.dict(
            "os.environ",
            {
                "R2_ACCOUNT_ID": "test_account_id",
                "R2_ACCESS_KEY_ID": "test_access_key",
                "R2_SECRET_ACCESS_KEY": "test_secret",
                "R2_BUCKET_NAME": "test_bucket",
                "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
                "R2_CUSTOM_DOMAIN": "https://images.example.com",
            },
        ):
            R2Service._reset_config_cache()  # Reset cache for test
            # Mock requests response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.headers = {"content-type": "image/jpeg"}
            mock_response.content = b"fake_image_data"
            mock_requests_get.return_value = mock_response

            # Mock boto3 client
            mock_s3_client = Mock()
            mock_s3_client.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")  # Image doesn't exist
            mock_boto3_client.return_value = mock_s3_client

            # Test upload
            image_url = "http://example.com/dog.jpg"
            animal_name = "test_dog"
            organization_name = "test_org"

            result_url, success = R2Service.upload_image_from_url(image_url, animal_name, organization_name)

            # Verify S3 upload was called
            mock_s3_client.upload_fileobj.assert_called_once()

            # Verify return values
            assert success is True
            assert result_url.startswith("https://images.example.com/")
            assert "rescue_dogs/test_org/test_dog_" in result_url

    @patch("utils.r2_service.boto3.client")
    @patch("utils.r2_service.requests.get")
    def test_upload_image_from_url_network_error(self, mock_requests_get, mock_boto3_client):
        """Test upload handles network errors gracefully"""
        with patch.dict(
            "os.environ",
            {
                "R2_ACCOUNT_ID": "test_account_id",
                "R2_ACCESS_KEY_ID": "test_access_key",
                "R2_SECRET_ACCESS_KEY": "test_secret",
                "R2_BUCKET_NAME": "test_bucket",
                "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
                "R2_CUSTOM_DOMAIN": "https://images.example.com",
            },
        ):
            # Mock network error
            mock_requests_get.side_effect = Exception("Network error")

            image_url = "http://example.com/dog.jpg"
            result_url, success = R2Service.upload_image_from_url(image_url, "test_dog")

            # Should return original URL and False on error
            assert success is False
            assert result_url == image_url

    def test_upload_image_from_url_no_config_returns_original(self):
        """Test upload returns original URL when not configured"""
        with patch.dict("os.environ", {}, clear=True):
            image_url = "http://example.com/dog.jpg"
            result_url, success = R2Service.upload_image_from_url(image_url, "test_dog")

            assert success is False
            assert result_url == image_url

    def test_upload_image_from_url_empty_url_returns_none(self):
        """Test upload returns None for empty URL"""
        result_url, success = R2Service.upload_image_from_url("", "test_dog")
        assert result_url is None
        assert success is False

    @patch("utils.r2_service.boto3.client")
    @patch("utils.r2_service.requests.get")
    def test_upload_image_duplicate_check(self, mock_requests_get, mock_boto3_client):
        """Test that duplicate images are handled correctly"""
        with patch.dict(
            "os.environ",
            {
                "R2_ACCOUNT_ID": "test_account_id",
                "R2_ACCESS_KEY_ID": "test_access_key",
                "R2_SECRET_ACCESS_KEY": "test_secret",
                "R2_BUCKET_NAME": "test_bucket",
                "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
                "R2_CUSTOM_DOMAIN": "https://images.example.com",
            },
        ):
            R2Service._reset_config_cache()  # Reset cache for test
            # Mock requests response
            mock_response = Mock()
            mock_response.status_code = 200
            mock_response.headers = {"content-type": "image/jpeg"}
            mock_response.content = b"fake_image_data"
            mock_requests_get.return_value = mock_response

            # Mock boto3 client that returns existing object
            mock_s3_client = Mock()
            mock_s3_client.head_object.return_value = {"ETag": "existing-etag"}
            mock_boto3_client.return_value = mock_s3_client

            image_url = "http://example.com/dog.jpg"
            result_url, success = R2Service.upload_image_from_url(image_url, "test_dog")

            # Should return existing URL without uploading
            assert success is True
            assert result_url.startswith("https://images.example.com/")
            mock_s3_client.upload_fileobj.assert_not_called()


class TestR2ServiceOptimization:
    """Test R2Service optimization and URL generation"""

    def test_get_optimized_url_with_r2_url(self):
        """Test URL optimization for R2 URLs"""
        with patch.dict(
            "os.environ",
            {
                "R2_ACCOUNT_ID": "test_account_id",
                "R2_ACCESS_KEY_ID": "test_access_key",
                "R2_SECRET_ACCESS_KEY": "test_secret",
                "R2_BUCKET_NAME": "test_bucket",
                "R2_ENDPOINT": "https://test.r2.cloudflarestorage.com",
                "R2_CUSTOM_DOMAIN": "https://images.example.com",
            },
        ):
            R2Service._reset_config_cache()  # Reset cache for test
            r2_url = "https://images.example.com/rescue_dogs/org/dog_abc123.jpg"
            transformation_options = {"width": 400, "height": 300}

            optimized_url = R2Service.get_optimized_url(r2_url, transformation_options)

            # Should use Cloudflare Images transformation format
            assert "/cdn-cgi/image/" in optimized_url
            assert "w_400,h_300" in optimized_url

    def test_get_optimized_url_with_non_r2_url(self):
        """Test URL optimization for non-R2 URLs"""
        external_url = "http://example.com/dog.jpg"

        optimized_url = R2Service.get_optimized_url(external_url)

        # Should return original URL for non-R2 URLs
        assert optimized_url == external_url

    def test_get_optimized_url_no_config(self):
        """Test URL optimization when not configured"""
        with patch.dict("os.environ", {}, clear=True):
            r2_url = "https://images.example.com/rescue_dogs/org/dog_abc123.jpg"

            optimized_url = R2Service.get_optimized_url(r2_url)

            # Should return original URL when not configured
            assert optimized_url == r2_url


class TestR2ServiceHelpers:
    """Test R2Service helper methods"""

    def test_generate_image_key(self):
        """Test image key generation"""
        image_url = "http://example.com/dog.jpg"
        animal_name = "Test Dog"
        organization_name = "Test Org"

        key = R2Service._generate_image_key(image_url, animal_name, organization_name)

        # Should contain organization and animal name
        assert "rescue_dogs/test_org/test_dog_" in key

        # Should contain URL hash
        url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
        assert url_hash in key

    def test_build_custom_domain_url(self):
        """Test custom domain URL building"""
        with patch.dict("os.environ", {"R2_CUSTOM_DOMAIN": "https://images.example.com"}):
            key = "rescue_dogs/org/dog_abc123.jpg"
            url = R2Service._build_custom_domain_url(key)

            assert url == "https://images.example.com/rescue_dogs/org/dog_abc123.jpg"

    def test_is_r2_url(self):
        """Test R2 URL detection"""
        with patch.dict("os.environ", {"R2_CUSTOM_DOMAIN": "https://images.example.com"}):
            # Test R2 URL
            assert R2Service._is_r2_url("https://images.example.com/path/image.jpg") is True

            # Test non-R2 URL
            assert R2Service._is_r2_url("http://external.com/image.jpg") is False

            # Test empty URL
            assert R2Service._is_r2_url("") is False
