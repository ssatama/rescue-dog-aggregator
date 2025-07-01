import os
from unittest.mock import Mock, patch

import pytest
import requests
from cloudinary.exceptions import Error as CloudinaryError
from cloudinary.exceptions import NotFound

from utils.cloudinary_service import CloudinaryConfigurationError, CloudinaryService


@pytest.mark.slow
@pytest.mark.network
class TestCloudinaryService:
    """Test Cloudinary service functionality critical for image handling."""

    def setup_method(self):
        """Reset class-level configuration cache before each test."""
        CloudinaryService._config_checked = False
        CloudinaryService._config_valid = False

    @patch.dict(os.environ, {
        'CLOUDINARY_CLOUD_NAME': 'test_cloud',
        'CLOUDINARY_API_KEY': 'test_key',
        'CLOUDINARY_API_SECRET': 'test_secret'
    })
    @patch('utils.cloudinary_service.cloudinary.config')
    def test_check_configuration_success(self, mock_config):
        """Test successful Cloudinary configuration."""
        result = CloudinaryService._check_configuration()

        assert result is True
        assert CloudinaryService._config_valid is True
        mock_config.assert_called_once_with(
            cloud_name='test_cloud',
            api_key='test_key',
            api_secret='test_secret',
            secure=True
        )

    @patch.dict(os.environ, {}, clear=True)
    def test_check_configuration_missing_vars(self):
        """Test configuration with missing environment variables."""
        result = CloudinaryService._check_configuration()

        assert result is False
        assert CloudinaryService._config_valid is False

    @patch.dict(os.environ, {
        'CLOUDINARY_CLOUD_NAME': 'test_cloud',
        'CLOUDINARY_API_KEY': '',  # Missing key
        'CLOUDINARY_API_SECRET': 'test_secret'
    })
    def test_check_configuration_partial_missing(self):
        """Test configuration with some missing variables."""
        result = CloudinaryService._check_configuration()

        assert result is False
        assert CloudinaryService._config_valid is False

    def test_check_configuration_caching(self):
        """Test that configuration check is cached."""
        with patch.dict(os.environ, {
            'CLOUDINARY_CLOUD_NAME': 'test_cloud',
            'CLOUDINARY_API_KEY': 'test_key',
            'CLOUDINARY_API_SECRET': 'test_secret'
        }):
            with patch('utils.cloudinary_service.cloudinary.config') as mock_config:
                # First call
                result1 = CloudinaryService._check_configuration()
                # Second call
                result2 = CloudinaryService._check_configuration()

                assert result1 is True
                assert result2 is True
                # Config should only be called once due to caching
                assert mock_config.call_count == 1

    def test_is_configured_delegates_to_check_configuration(self):
        """Test that is_configured() delegates to _check_configuration()."""
        with patch.object(CloudinaryService, '_check_configuration', return_value=True) as mock_check:
            result = CloudinaryService.is_configured()

            assert result is True
            mock_check.assert_called_once()

    def test_upload_image_from_url_no_url(self):
        """Test handling of missing image URL."""
        result_url, success = CloudinaryService.upload_image_from_url(
            None, "test_animal"
        )

        assert result_url is None
        assert success is False

    def test_upload_image_from_url_empty_url(self):
        """Test handling of empty image URL."""
        result_url, success = CloudinaryService.upload_image_from_url(
            "", "test_animal"
        )

        assert result_url is None
        assert success is False

    @patch.object(CloudinaryService, '_check_configuration',
                  return_value=False)
    def test_upload_image_from_url_not_configured_with_raise(self, mock_check):
        """Test error when Cloudinary not configured and raise_on_missing_config=True."""
        with pytest.raises(CloudinaryConfigurationError):
            CloudinaryService.upload_image_from_url(
                "https://example.com/image.jpg",
                "test_animal",
                raise_on_missing_config=True
            )

    @patch.object(CloudinaryService, '_check_configuration',
                  return_value=False)
    def test_upload_image_from_url_not_configured_fallback(self, mock_check):
        """Test fallback to original URL when Cloudinary not configured."""
        original_url = "https://example.com/image.jpg"
        result_url, success = CloudinaryService.upload_image_from_url(
            original_url, "test_animal"
        )

        assert result_url == original_url
        assert success is False

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    def test_upload_image_from_url_existing_image(
            self, mock_resource, mock_check):
        """Test handling of image that already exists in Cloudinary."""
        mock_resource.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/existing.jpg'
        }

        result_url, success = CloudinaryService.upload_image_from_url(
            "https://example.com/image.jpg",
            "test_animal",
            "test_org"
        )

        assert result_url == 'https://res.cloudinary.com/test/existing.jpg'
        assert success is True

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    @patch('utils.cloudinary_service.requests.get')
    @patch('utils.cloudinary_service.cloudinary.uploader.upload')
    def test_upload_image_from_url_successful_upload(
            self, mock_upload, mock_get, mock_resource, mock_check):
        """Test successful image upload to Cloudinary."""
        # Image doesn't exist
        mock_resource.side_effect = NotFound()

        # Mock successful download
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b'fake_image_data'
        mock_response.headers = {'content-type': 'image/jpeg'}
        mock_get.return_value = mock_response

        # Mock successful upload
        mock_upload.return_value = {
            'secure_url': 'https://res.cloudinary.com/test/uploaded.jpg'
        }

        result_url, success = CloudinaryService.upload_image_from_url(
            "https://example.com/image.jpg",
            "test animal",
            "test org"
        )

        assert result_url == 'https://res.cloudinary.com/test/uploaded.jpg'
        assert success is True

        # Verify upload was called with correct parameters
        mock_upload.assert_called_once()
        upload_args = mock_upload.call_args
        assert upload_args[0][0] == b'fake_image_data'
        assert 'public_id' in upload_args[1]
        assert 'rescue_dogs/test_org/test_animal_' in upload_args[1]['public_id']

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    @patch('utils.cloudinary_service.requests.get')
    def test_upload_image_from_url_download_failure(
            self, mock_get, mock_resource, mock_check):
        """Test handling of download failure - critical for user experience."""
        mock_resource.side_effect = NotFound()
        mock_get.side_effect = requests.exceptions.RequestException(
            "Network error")

        original_url = "https://example.com/image.jpg"
        result_url, success = CloudinaryService.upload_image_from_url(
            original_url, "test_animal"
        )

        assert result_url == original_url
        assert success is False

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    @patch('utils.cloudinary_service.requests.get')
    def test_upload_image_from_url_invalid_status_code(
            self, mock_get, mock_resource, mock_check):
        """Test handling of HTTP error status codes."""
        mock_resource.side_effect = NotFound()

        mock_response = Mock()
        mock_response.status_code = 404
        mock_get.return_value = mock_response

        original_url = "https://example.com/image.jpg"
        result_url, success = CloudinaryService.upload_image_from_url(
            original_url, "test_animal"
        )

        assert result_url == original_url
        assert success is False

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    @patch('utils.cloudinary_service.requests.get')
    def test_upload_image_from_url_invalid_content_type(
            self, mock_get, mock_resource, mock_check):
        """Test handling of invalid content types - prevents broken images."""
        mock_resource.side_effect = NotFound()

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {'content-type': 'text/html'}
        mock_get.return_value = mock_response

        original_url = "https://example.com/image.jpg"
        result_url, success = CloudinaryService.upload_image_from_url(
            original_url, "test_animal"
        )

        assert result_url == original_url
        assert success is False

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    @patch('utils.cloudinary_service.requests.get')
    @patch('utils.cloudinary_service.cloudinary.uploader.upload')
    def test_upload_image_from_url_cloudinary_error(
            self, mock_upload, mock_get, mock_resource, mock_check):
        """Test handling of Cloudinary upload errors."""
        mock_resource.side_effect = NotFound()

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b'fake_image_data'
        mock_response.headers = {'content-type': 'image/jpeg'}
        mock_get.return_value = mock_response

        mock_upload.side_effect = CloudinaryError("Upload failed")

        original_url = "https://example.com/image.jpg"
        result_url, success = CloudinaryService.upload_image_from_url(
            original_url, "test_animal"
        )

        assert result_url == original_url
        assert success is False

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    @patch('utils.cloudinary_service.requests.get')
    @patch('utils.cloudinary_service.cloudinary.uploader.upload')
    def test_upload_image_from_url_unexpected_error(
            self, mock_upload, mock_get, mock_resource, mock_check):
        """Test handling of unexpected errors during upload."""
        mock_resource.side_effect = NotFound()

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.content = b'fake_image_data'
        mock_response.headers = {'content-type': 'image/jpeg'}
        mock_get.return_value = mock_response

        mock_upload.side_effect = Exception("Unexpected error")

        original_url = "https://example.com/image.jpg"
        result_url, success = CloudinaryService.upload_image_from_url(
            original_url, "test_animal"
        )

        assert result_url == original_url
        assert success is False

    def test_get_optimized_url_not_cloudinary_url(self):
        """Test handling of non-Cloudinary URLs."""
        original_url = "https://example.com/image.jpg"
        result = CloudinaryService.get_optimized_url(original_url)

        assert result == original_url

    def test_get_optimized_url_empty_url(self):
        """Test handling of empty URL."""
        result = CloudinaryService.get_optimized_url("")
        assert result == ""

        result = CloudinaryService.get_optimized_url(None)
        assert result is None

    @patch.object(CloudinaryService, 'is_configured', return_value=False)
    def test_get_optimized_url_not_configured(self, mock_is_configured):
        """Test fallback when Cloudinary not configured."""
        cloudinary_url = "https://res.cloudinary.com/test/upload/v123/image.jpg"
        result = CloudinaryService.get_optimized_url(cloudinary_url)

        assert result == cloudinary_url

    @patch.object(CloudinaryService, 'is_configured', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.CloudinaryImage')
    def test_get_optimized_url_with_transformations(
            self, mock_cloudinary_image, mock_is_configured):
        """Test URL optimization with transformations."""
        mock_image = Mock()
        mock_image.build_url.return_value = "https://res.cloudinary.com/test/upload/w_300/image.jpg"
        mock_cloudinary_image.return_value = mock_image

        cloudinary_url = "https://res.cloudinary.com/test/upload/v123/folder/image.jpg"
        transformations = {"width": 300, "quality": "auto"}

        result = CloudinaryService.get_optimized_url(
            cloudinary_url, transformations)

        assert result == "https://res.cloudinary.com/test/upload/w_300/image.jpg"
        mock_cloudinary_image.assert_called_once_with("v123/folder/image")
        mock_image.build_url.assert_called_once_with(**transformations)

    @patch.object(CloudinaryService, 'is_configured', return_value=True)
    def test_get_optimized_url_no_transformations(self, mock_is_configured):
        """Test URL optimization without transformations."""
        cloudinary_url = "https://res.cloudinary.com/test/upload/v123/image.jpg"
        result = CloudinaryService.get_optimized_url(cloudinary_url)

        assert result == cloudinary_url

    @patch.object(CloudinaryService, 'is_configured', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.CloudinaryImage')
    def test_get_optimized_url_error_handling(
            self, mock_cloudinary_image, mock_is_configured):
        """Test error handling in URL optimization."""
        mock_cloudinary_image.side_effect = Exception("Transformation error")

        cloudinary_url = "https://res.cloudinary.com/test/upload/v123/image.jpg"
        result = CloudinaryService.get_optimized_url(
            cloudinary_url, {"width": 300})

        assert result == cloudinary_url

    @patch.dict(os.environ, {
        'CLOUDINARY_CLOUD_NAME': 'test_cloud',
        'CLOUDINARY_API_KEY': 'test_key',
        'CLOUDINARY_API_SECRET': 'test_secret'
    })
    @patch.object(CloudinaryService, 'is_configured', return_value=True)
    def test_get_status_configured(self, mock_is_configured):
        """Test status reporting when properly configured."""
        status = CloudinaryService.get_status()

        assert status['configured'] is True
        assert status['cloud_name'] == 'test_cloud'
        assert status['api_key_set'] is True
        assert status['api_secret_set'] is True

    @patch.dict(os.environ, {}, clear=True)
    @patch.object(CloudinaryService, 'is_configured', return_value=False)
    def test_get_status_not_configured(self, mock_is_configured):
        """Test status reporting when not configured."""
        status = CloudinaryService.get_status()

        assert status['configured'] is False
        assert status['cloud_name'] == 'Not set'
        assert status['api_key_set'] is False
        assert status['api_secret_set'] is False

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    @patch('utils.cloudinary_service.requests.get')
    def test_upload_image_requests_timeout(
            self, mock_get, mock_resource, mock_check):
        """Test handling of request timeouts - critical for scraper reliability."""
        mock_resource.side_effect = NotFound()

        # Mock request timeout
        mock_get.side_effect = requests.exceptions.Timeout("Request timed out")

        original_url = "https://example.com/image.jpg"
        result_url, success = CloudinaryService.upload_image_from_url(
            original_url, "test_animal"
        )

        assert result_url == original_url
        assert success is False

        # Verify timeout was set
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert call_args[1]['timeout'] == 30

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    @patch('utils.cloudinary_service.requests.get')
    def test_upload_image_user_agent_header(
            self, mock_get, mock_resource, mock_check):
        """Test that proper User-Agent header is set for downloads."""
        mock_resource.side_effect = NotFound()

        mock_response = Mock()
        mock_response.status_code = 404  # Force early exit after header check
        mock_get.return_value = mock_response

        CloudinaryService.upload_image_from_url(
            "https://example.com/image.jpg", "test_animal"
        )

        # Verify User-Agent header was set
        mock_get.assert_called_once()
        call_args = mock_get.call_args
        assert 'headers' in call_args[1]
        assert 'User-Agent' in call_args[1]['headers']
        assert 'RescueDogAggregator' in call_args[1]['headers']['User-Agent']

    @patch.object(CloudinaryService, '_check_configuration', return_value=True)
    @patch('utils.cloudinary_service.cloudinary.api.resource')
    def test_upload_public_id_generation(self, mock_resource, mock_check):
        """Test public ID generation for consistent organization."""
        mock_resource.side_effect = NotFound()

        with patch('utils.cloudinary_service.requests.get') as mock_get:
            mock_response = Mock()
            mock_response.status_code = 404
            mock_get.return_value = mock_response

            CloudinaryService.upload_image_from_url(
                "https://example.com/image.jpg",
                "Test Animal Name",
                "Test Organization"
            )

            # Check that public_id was generated correctly
            mock_resource.assert_called_once()
            public_id = mock_resource.call_args[0][0]

            assert public_id.startswith(
                "rescue_dogs/test_organization/test_animal_name_")
            assert len(public_id.split('_')[-1]) == 8  # 8-character hash
