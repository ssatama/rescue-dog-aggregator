import os
import sys
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper

# Add project root to path
sys.path.append(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
)


@pytest.mark.slow
@pytest.mark.network
class TestErrorResilience:
    """Test system resilience to various failure scenarios."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test123"}]

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        # Use only organization_id (removed organization_name parameter)
        return TestScraper(organization_id=1)

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_database_connection_failure_recovery(self, mock_scraper):
        """Test scraper handles database connection failures gracefully."""
        with patch("scrapers.base_scraper.psycopg2.connect") as mock_connect:
            # First call fails, second succeeds
            mock_connect.side_effect = [
                Exception("Connection failed"),
                Mock(),  # Successful connection
            ]

            # Should handle the failure gracefully
            result = mock_scraper.connect_to_database()

            # First attempt should fail, but method should handle it
            assert mock_connect.call_count >= 1

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "test-cloud",
            "CLOUDINARY_API_KEY": "test-key",
            "CLOUDINARY_API_SECRET": "test-secret",
        },
    )
    @patch("utils.r2_service.requests.get")
    def test_image_download_timeout_handling(self, mock_requests):
        """Test handling of image download timeouts."""
        # Mock timeout
        import requests

        from utils.r2_service import R2Service

        mock_requests.side_effect = requests.exceptions.Timeout("Request timeout")

        service = R2Service()
        url, success = service.upload_image_from_url(
            "https://example.com/slow-image.jpg", "Test Dog", "Test Org"
        )

        assert success is False
        # Updated: Should return original URL as fallback, not None
        assert url == "https://example.com/slow-image.jpg"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_partial_data_handling(self, mock_scraper):
        """Test system handles incomplete animal data gracefully."""
        # Test with minimal required data
        minimal_data = {
            "name": "Incomplete Dog",
            "external_id": "incomplete123",
            "organization_id": 1,
            # Missing breed, age, size, etc.
        }

        # Should not crash with minimal data
        animal_id, action = mock_scraper.save_animal(minimal_data)
        assert animal_id is not None
        assert action in ["added", "updated", "test"]

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_malformed_image_url_handling(self, mock_scraper):
        """Test handling of malformed or invalid image URLs."""
        malformed_data = {
            "name": "Test Dog",
            "external_id": "test123",
            "primary_image_url": "not-a-valid-url",
            "organization_id": 1,
        }

        # Should handle malformed URL gracefully
        animal_id, action = mock_scraper.save_animal(malformed_data)
        assert animal_id is not None
        assert action in ["added", "updated", "test"]

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "test-cloud",
            "CLOUDINARY_API_KEY": "test-key",
            "CLOUDINARY_API_SECRET": "test-secret",
        },
    )
    @patch("utils.r2_service.requests.get")
    def test_invalid_image_content_handling(self, mock_requests):
        """Test handling of invalid image content."""
        from utils.r2_service import R2Service

        # Mock response with invalid content type
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.headers = {"content-type": "text/html"}  # Not an image
        mock_response.content = b"<html>Not an image</html>"
        mock_requests.return_value = mock_response

        service = R2Service()
        url, success = service.upload_image_from_url(
            "https://example.com/fake-image.jpg", "Test Dog", "Test Org"
        )

        assert success is False
        # Updated: Should return original URL as fallback, not None
        assert url == "https://example.com/fake-image.jpg"
