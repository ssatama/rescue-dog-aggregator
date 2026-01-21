"""
Tests for R2Service - Interface parity with CloudinaryService
"""

import hashlib
from unittest.mock import Mock, patch

import pytest
from botocore.exceptions import ClientError

from utils.r2_service import R2ConfigurationError, R2Service


@pytest.mark.slow
@pytest.mark.integration
@pytest.mark.external
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
                R2Service.upload_image_from_url(
                    "http://example.com/image.jpg",
                    "test_dog",
                    raise_on_missing_config=True,
                )

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

    @patch("utils.r2_service.boto3.client")
    @patch("utils.r2_service.requests.get")
    def test_upload_image_backward_compatibility_check(self, mock_requests_get, mock_boto3_client):
        """Test that upload checks SHA-256 key only (legacy MD5 check removed for performance)"""
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

            # Mock boto3 client - SHA-256 key doesn't exist (will upload new image)
            mock_s3_client = Mock()
            # SHA-256 key returns 404 (not found) - no legacy check anymore
            mock_s3_client.head_object.side_effect = ClientError({"Error": {"Code": "404"}}, "HeadObject")
            mock_boto3_client.return_value = mock_s3_client

            image_url = "http://example.com/dog.jpg"
            result_url, success = R2Service.upload_image_from_url(image_url, "test_dog")

            # Should upload new image since no existing key was found
            assert success is True
            assert result_url.startswith("https://images.example.com/")
            # Should have checked only SHA-256 key (legacy MD5 check removed for performance)
            assert mock_s3_client.head_object.call_count == 1
            # Should upload since no existing key was found
            mock_s3_client.upload_fileobj.assert_called_once()


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

    def test_get_optimized_url_with_gravity(self):
        """Test URL optimization with gravity parameter for smart cropping"""
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
            R2Service._reset_config_cache()
            r2_url = "https://images.example.com/rescue_dogs/org/dog_abc123.jpg"

            # Test with gravity=auto for smart cropping
            transformation_options = {
                "width": 400,
                "height": 400,
                "fit": "cover",
                "gravity": "auto",
            }
            optimized_url = R2Service.get_optimized_url(r2_url, transformation_options)
            assert "/cdn-cgi/image/" in optimized_url
            assert "w_400,h_400" in optimized_url
            assert "c_cover" in optimized_url
            assert "g_auto" in optimized_url

    def test_get_optimized_url_with_face_gravity(self):
        """Test URL optimization with face gravity for focusing on faces"""
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
            R2Service._reset_config_cache()
            r2_url = "https://images.example.com/rescue_dogs/org/dog_abc123.jpg"

            # Test with gravity=face for face detection
            transformation_options = {
                "width": 300,
                "height": 300,
                "fit": "cover",
                "gravity": "face",
            }
            optimized_url = R2Service.get_optimized_url(r2_url, transformation_options)
            assert "/cdn-cgi/image/" in optimized_url
            assert "g_face" in optimized_url

    def test_get_optimized_url_with_north_gravity(self):
        """Test URL optimization with north gravity for top-focused cropping"""
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
            R2Service._reset_config_cache()
            r2_url = "https://images.example.com/rescue_dogs/org/dog_abc123.jpg"

            # Test with gravity=north for top bias
            transformation_options = {
                "width": 400,
                "height": 300,
                "fit": "cover",
                "gravity": "north",
            }
            optimized_url = R2Service.get_optimized_url(r2_url, transformation_options)
            assert "/cdn-cgi/image/" in optimized_url
            assert "g_north" in optimized_url

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

    def test_generate_image_key_sha256(self):
        """Test image key generation uses SHA-256 (security upgrade)"""
        image_url = "http://example.com/dog.jpg"
        animal_name = "Test Dog"
        organization_name = "Test Org"

        key = R2Service._generate_image_key(image_url, animal_name, organization_name)

        # Should contain organization and animal name
        assert "rescue_dogs/test_org/test_dog_" in key

        # Should contain SHA-256 URL hash (first 8 chars)
        url_hash = hashlib.sha256(image_url.encode()).hexdigest()[:8]
        assert url_hash in key

        # Should NOT contain MD5 hash (security vulnerability)
        md5_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
        assert md5_hash not in key

    def test_generate_image_key_backward_compatibility(self):
        """Test backward compatibility for existing MD5-based keys"""
        image_url = "http://example.com/dog.jpg"
        animal_name = "Test Dog"
        organization_name = "Test Org"

        # Test the legacy key checker function
        legacy_key = R2Service._generate_legacy_image_key(image_url, animal_name, organization_name)

        # Legacy key should use MD5 format for backward compatibility checks
        md5_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
        assert md5_hash in legacy_key
        assert "rescue_dogs/test_org/test_dog_" in legacy_key

    def test_generate_image_key(self):
        """Test image key generation (legacy test for compatibility)"""
        image_url = "http://example.com/dog.jpg"
        animal_name = "Test Dog"
        organization_name = "Test Org"

        key = R2Service._generate_image_key(image_url, animal_name, organization_name)

        # Should contain organization and animal name
        assert "rescue_dogs/test_org/test_dog_" in key

        # Now should contain SHA-256 hash instead of MD5
        url_hash = hashlib.sha256(image_url.encode()).hexdigest()[:8]
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


class TestR2ServiceSecurity:
    """Test R2Service security aspects and edge cases"""

    def test_generate_image_key_collision_resistance(self):
        """Test that SHA-256 keys are collision resistant compared to MD5"""
        # Test different URLs that could potentially collide
        test_cases = [
            ("http://example.com/dog1.jpg", "test_dog", "org1"),
            ("http://example.com/dog2.jpg", "test_dog", "org1"),
            ("http://different.com/dog1.jpg", "test_dog", "org1"),
            ("http://example.com/dog1.jpg", "different_dog", "org1"),
            ("http://example.com/dog1.jpg", "test_dog", "different_org"),
        ]

        keys = []
        legacy_keys = []

        for image_url, animal_name, org_name in test_cases:
            key = R2Service._generate_image_key(image_url, animal_name, org_name)
            legacy_key = R2Service._generate_legacy_image_key(image_url, animal_name, org_name)
            keys.append(key)
            legacy_keys.append(legacy_key)

        # All SHA-256 keys should be unique
        assert len(set(keys)) == len(keys), "SHA-256 keys should be unique"

        # All legacy MD5 keys should also be unique for this test set
        assert len(set(legacy_keys)) == len(legacy_keys), "Legacy MD5 keys should be unique for this test set"

        # SHA-256 and MD5 keys should be different for same inputs
        for i in range(len(keys)):
            assert keys[i] != legacy_keys[i], f"SHA-256 and MD5 keys should differ for input {i}"

    def test_generate_image_key_input_validation(self):
        """Test image key generation handles malicious inputs safely"""
        malicious_inputs = [
            # Path traversal attempts
            ("http://example.com/../../../etc/passwd", "dog", "org"),
            ("http://example.com/..\\..\\..\\windows\\system32", "dog", "org"),
            # Script injection attempts
            ("<script>alert('xss')</script>", "dog", "org"),
            ("'; DROP TABLE images; --", "dog", "org"),
            # Unicode and encoding attempts
            ("http://example.com/\x00\x01\x02", "dog", "org"),
            ("http://example.com/%2e%2e%2f", "dog", "org"),
        ]

        for image_url, animal_name, org_name in malicious_inputs:
            # Should not raise exceptions
            key = R2Service._generate_image_key(image_url, animal_name, org_name)
            legacy_key = R2Service._generate_legacy_image_key(image_url, animal_name, org_name)

            # Keys should be valid S3 object names
            assert key.startswith("rescue_dogs/")
            assert key.endswith(".jpg")
            assert legacy_key.startswith("rescue_dogs/")
            assert legacy_key.endswith(".jpg")

            # Keys should not contain dangerous characters
            dangerous_chars = ["<", ">", "&", "'", '"', ";", "\x00", "\\", ".."]
            for char in dangerous_chars:
                assert char not in key, f"Key should not contain dangerous character: {char}"
                assert char not in legacy_key, f"Legacy key should not contain dangerous character: {char}"

    def test_upload_image_security_headers(self):
        """Test that upload includes security metadata"""
        image_url = "http://example.com/dog.jpg"
        animal_name = "security_test"
        organization_name = "test_org"

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
            R2Service._reset_config_cache()

            with (
                patch("utils.r2_service.boto3.client") as mock_boto3_client,
                patch("utils.r2_service.requests.get") as mock_requests_get,
            ):
                # Mock successful image download
                mock_response = Mock()
                mock_response.status_code = 200
                mock_response.headers = {"content-type": "image/jpeg"}
                mock_response.content = b"fake_image_data"
                mock_requests_get.return_value = mock_response

                # Mock S3 client - image doesn't exist, will upload
                mock_s3_client = Mock()
                mock_s3_client.head_object.side_effect = [
                    ClientError({"Error": {"Code": "404"}}, "HeadObject"),  # SHA-256 key not found
                    ClientError({"Error": {"Code": "404"}}, "HeadObject"),  # Legacy key not found
                ]
                mock_boto3_client.return_value = mock_s3_client

                result_url, success = R2Service.upload_image_from_url(image_url, animal_name, organization_name)

                # Verify upload was called with security metadata
                mock_s3_client.upload_fileobj.assert_called_once()
                call_args = mock_s3_client.upload_fileobj.call_args

                # Check ExtraArgs contains security metadata
                extra_args = call_args[1]["ExtraArgs"]
                assert "Metadata" in extra_args
                metadata = extra_args["Metadata"]

                # Verify security metadata is present
                assert "original_url" in metadata
                assert "animal_name" in metadata
                assert "organization" in metadata
                assert metadata["original_url"] == image_url
                assert metadata["animal_name"] == animal_name
                assert metadata["organization"] == organization_name

    def test_upload_image_content_type_validation(self):
        """Test that upload validates content types for security"""
        malicious_content_types = [
            "application/x-executable",
            "text/html",
            "application/javascript",
            "text/plain",
            "",  # Empty content type
            "image/svg+xml",  # SVG can contain scripts
        ]

        for content_type in malicious_content_types:
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
                R2Service._reset_config_cache()

                with patch("utils.r2_service.requests.get") as mock_requests_get:
                    # Mock response with malicious content type
                    mock_response = Mock()
                    mock_response.status_code = 200
                    mock_response.headers = {"content-type": content_type}
                    mock_response.content = b"fake_content"
                    mock_requests_get.return_value = mock_response

                    result_url, success = R2Service.upload_image_from_url("http://example.com/malicious.exe", "test", "test")

                    # Should reject non-image content types
                    assert success is False
                    # Should return original URL as fallback
                    assert result_url == "http://example.com/malicious.exe"
