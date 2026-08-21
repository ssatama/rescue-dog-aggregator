import os
import sys
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


class TestErrorResilience:
    """Test system resilience to various failure scenarios."""

    @pytest.fixture
    def database_service(self):
        """Stand in for the DatabaseService production injects into every scraper.

        BaseScraper.save_animal persists through self.database_service. Without
        one it logs a warning and returns (None, "error"), so a scraper built
        without this saves nothing while still looking like it ran.
        """
        service = Mock()
        service.get_existing_animal.return_value = None
        service.create_animal.return_value = (1, "added")
        service.update_animal.side_effect = lambda animal_id, animal_data: (animal_id, "updated")
        return service

    @pytest.fixture
    def mock_scraper(self, database_service):
        """Create a scraper wired the way the production loader wires one."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test123"}]

        return TestScraper(organization_id=1, database_service=database_service)

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
            _result = mock_scraper.connect_to_database()

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
        url, success = service.upload_image_from_url("https://example.com/slow-image.jpg", "Test Dog", "Test Org")

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
    def test_partial_data_handling(self, mock_scraper, database_service):
        """Test system handles incomplete animal data gracefully."""
        # Test with minimal required data
        minimal_data = {
            "name": "Incomplete Dog",
            "external_id": "incomplete123",
            "organization_id": 1,
            # Missing breed, age, size, etc.
        }

        animal_id, action = mock_scraper.save_animal(minimal_data)

        assert (animal_id, action) == (1, "added")

        # The absent fields must reach the database as absent, not as junk.
        saved = database_service.create_animal.call_args[0][0]
        assert saved["name"] == "Incomplete Dog"
        assert saved["external_id"] == "incomplete123"
        assert saved.get("age_text") is None  # present, and explicitly empty
        assert "sex" not in saved  # never invented

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_malformed_image_url_handling(self, mock_scraper, database_service):
        """Test handling of malformed or invalid image URLs."""
        malformed_data = {
            "name": "Test Dog",
            "external_id": "test123",
            "primary_image_url": "not-a-valid-url",
            "organization_id": 1,
        }

        animal_id, action = mock_scraper.save_animal(malformed_data)

        assert (animal_id, action) == (1, "added")

        # AnimalValidator requires primary_image_url to be present but does not
        # validate its format, so a malformed URL is stored verbatim rather than
        # rejected or rewritten. Pinned so a change to either is deliberate.
        saved = database_service.create_animal.call_args[0][0]
        assert saved["name"] == "Test Dog"
        assert saved["primary_image_url"] == "not-a-valid-url"

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
        url, success = service.upload_image_from_url("https://example.com/fake-image.jpg", "Test Dog", "Test Org")

        assert success is False
        # Updated: Should return original URL as fallback, not None
        assert url == "https://example.com/fake-image.jpg"
