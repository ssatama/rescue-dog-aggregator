"""Test image deduplication functionality in ImageProcessingService."""

import logging
from unittest.mock import MagicMock, Mock, patch

import pytest

from services.image_processing_service import ImageProcessingService


class TestImageDeduplication:
    """Test deduplication of images to avoid re-uploading existing R2 images."""

    @pytest.fixture
    def mock_r2_service(self):
        """Create mock R2 service."""
        mock_r2 = Mock()
        mock_r2.batch_upload_images_with_stats.return_value = ([("https://images.rescuedogs.me/org/dog1.jpg", True)], {"successful": 1, "total": 1, "success_rate": 100.0, "total_time": 1.0})
        mock_r2.concurrent_upload_images_with_stats.return_value = ([("https://images.rescuedogs.me/org/dog1.jpg", True)], {"successful": 1, "total": 1, "success_rate": 100.0, "total_time": 1.0})
        return mock_r2

    @pytest.fixture
    def mock_database_connection(self):
        """Create mock database connection with cursor."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        return mock_conn, mock_cursor

    @pytest.fixture
    def image_service(self, mock_r2_service):
        """Create ImageProcessingService with mocked dependencies."""
        service = ImageProcessingService(r2_service=mock_r2_service)
        return service

    def test_deduplication_reuses_existing_r2_images(self, image_service, mock_database_connection):
        """Test that existing R2 images are reused instead of re-uploaded."""
        mock_conn, mock_cursor = mock_database_connection

        # Mock database query to return existing mapping
        mock_cursor.fetchall.return_value = [
            ("https://example.com/dog1.jpg", "https://images.rescuedogs.me/org/existing1.jpg"),
            ("https://example.com/dog2.jpg", "https://images.rescuedogs.me/org/existing2.jpg"),
        ]

        animals_data = [
            {"name": "Dog1", "primary_image_url": "https://example.com/dog1.jpg"},
            {"name": "Dog2", "primary_image_url": "https://example.com/dog2.jpg"},
            {"name": "Dog3", "primary_image_url": "https://example.com/dog3.jpg"},  # New image
        ]

        result = image_service.batch_process_images(animals_data, "test_org", database_connection=mock_conn)

        # Verify database was queried for existing mappings
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        assert "SELECT DISTINCT original_image_url, primary_image_url" in query
        assert "WHERE original_image_url IN" in query  # Updated to match new IN clause instead of ANY()

        # Verify existing images were reused
        assert result[0]["primary_image_url"] == "https://images.rescuedogs.me/org/existing1.jpg"
        assert result[0]["original_image_url"] == "https://example.com/dog1.jpg"
        assert result[1]["primary_image_url"] == "https://images.rescuedogs.me/org/existing2.jpg"
        assert result[1]["original_image_url"] == "https://example.com/dog2.jpg"

        # Verify only new image was uploaded
        image_service.r2_service.batch_upload_images_with_stats.assert_called_once()
        upload_args = image_service.r2_service.batch_upload_images_with_stats.call_args[0][0]
        assert len(upload_args) == 1  # Only Dog3
        assert upload_args[0][0] == "https://example.com/dog3.jpg"

    def test_deduplication_handles_duplicate_urls_in_batch(self, image_service, mock_database_connection):
        """Test that duplicate URLs within the same batch are handled correctly."""
        mock_conn, mock_cursor = mock_database_connection

        # No existing mappings
        mock_cursor.fetchall.return_value = []

        # Multiple animals with same image URL
        animals_data = [
            {"name": "Dog1", "primary_image_url": "https://example.com/same.jpg"},
            {"name": "Dog2", "primary_image_url": "https://example.com/same.jpg"},
            {"name": "Dog3", "primary_image_url": "https://example.com/same.jpg"},
        ]

        # Mock R2 upload
        image_service.r2_service.batch_upload_images_with_stats.return_value = (
            [("https://images.rescuedogs.me/org/same.jpg", True)],
            {"successful": 1, "total": 1, "success_rate": 100.0, "total_time": 1.0},
        )

        result = image_service.batch_process_images(animals_data, "test_org", database_connection=mock_conn)

        # Verify only one upload for the duplicate URL
        image_service.r2_service.batch_upload_images_with_stats.assert_called_once()
        upload_args = image_service.r2_service.batch_upload_images_with_stats.call_args[0][0]
        assert len(upload_args) == 1  # Only one upload despite 3 animals

        # All animals should get the same R2 URL
        assert all(animal["primary_image_url"] == "https://images.rescuedogs.me/org/same.jpg" for animal in result)
        assert all(animal["original_image_url"] == "https://example.com/same.jpg" for animal in result)

    def test_deduplication_works_without_database(self, image_service):
        """Test that batch processing works when no database connection is provided."""
        animals_data = [
            {"name": "Dog1", "primary_image_url": "https://example.com/dog1.jpg"},
            {"name": "Dog2", "primary_image_url": "https://example.com/dog2.jpg"},
        ]

        # Mock R2 upload
        image_service.r2_service.batch_upload_images_with_stats.return_value = (
            [
                ("https://images.rescuedogs.me/org/dog1.jpg", True),
                ("https://images.rescuedogs.me/org/dog2.jpg", True),
            ],
            {"successful": 2, "total": 2, "success_rate": 100.0, "total_time": 1.0},
        )

        result = image_service.batch_process_images(animals_data, "test_org", database_connection=None)

        # All images should be uploaded (no deduplication without database)
        image_service.r2_service.batch_upload_images_with_stats.assert_called_once()
        upload_args = image_service.r2_service.batch_upload_images_with_stats.call_args[0][0]
        assert len(upload_args) == 2

    def test_deduplication_skips_invalid_urls(self, image_service, mock_database_connection):
        """Test that invalid URLs are skipped during deduplication."""
        mock_conn, mock_cursor = mock_database_connection
        mock_cursor.fetchall.return_value = []

        animals_data = [
            {"name": "Dog1", "primary_image_url": "data:image/png;base64,abc123"},  # Data URL
            {"name": "Dog2", "primary_image_url": "https://images.rescuedogs.me/existing.jpg"},  # Already R2
            {"name": "Dog3", "primary_image_url": "https://example.com/valid.jpg"},  # Valid
        ]

        result = image_service.batch_process_images(animals_data, "test_org", database_connection=mock_conn)

        # Only valid non-R2 URL should be uploaded
        image_service.r2_service.batch_upload_images_with_stats.assert_called_once()
        upload_args = image_service.r2_service.batch_upload_images_with_stats.call_args[0][0]
        assert len(upload_args) == 1
        assert upload_args[0][0] == "https://example.com/valid.jpg"

    def test_deduplication_logs_statistics(self, image_service, mock_database_connection, caplog):
        """Test that deduplication logs helpful statistics."""
        mock_conn, mock_cursor = mock_database_connection

        # Mock existing mapping for one image
        mock_cursor.fetchall.return_value = [
            ("https://example.com/dog1.jpg", "https://images.rescuedogs.me/org/existing1.jpg"),
        ]

        animals_data = [
            {"name": "Dog1", "primary_image_url": "https://example.com/dog1.jpg"},  # Existing
            {"name": "Dog2", "primary_image_url": "https://example.com/dog1.jpg"},  # Duplicate
            {"name": "Dog3", "primary_image_url": "https://example.com/dog2.jpg"},  # New
        ]

        with caplog.at_level(logging.INFO, logger="services.image_processing_service"):
            result = image_service.batch_process_images(animals_data, "test_org", database_connection=mock_conn)

        # Check for deduplication statistics in logs
        assert "Found 1 existing R2 images to reuse" in caplog.text
        assert "Batch processing 3 images: 2 unique, 2 reused, 1 to upload" in caplog.text

    def test_deduplication_handles_empty_batch(self, image_service, mock_database_connection):
        """Test that empty batch is handled gracefully."""
        mock_conn, mock_cursor = mock_database_connection

        animals_data = []

        result = image_service.batch_process_images(animals_data, "test_org", database_connection=mock_conn)

        # Should return empty list without errors
        assert result == []
        mock_cursor.execute.assert_not_called()
        image_service.r2_service.batch_upload_images_with_stats.assert_not_called()

    def test_deduplication_all_images_exist(self, image_service, mock_database_connection, caplog):
        """Test when all images already exist in R2."""
        mock_conn, mock_cursor = mock_database_connection

        # All images have existing mappings
        mock_cursor.fetchall.return_value = [
            ("https://example.com/dog1.jpg", "https://images.rescuedogs.me/org/existing1.jpg"),
            ("https://example.com/dog2.jpg", "https://images.rescuedogs.me/org/existing2.jpg"),
        ]

        animals_data = [
            {"name": "Dog1", "primary_image_url": "https://example.com/dog1.jpg"},
            {"name": "Dog2", "primary_image_url": "https://example.com/dog2.jpg"},
        ]

        with caplog.at_level(logging.INFO, logger="services.image_processing_service"):
            result = image_service.batch_process_images(animals_data, "test_org", database_connection=mock_conn)

        # No uploads should occur
        image_service.r2_service.batch_upload_images_with_stats.assert_not_called()
        image_service.r2_service.concurrent_upload_images_with_stats.assert_not_called()

        # Should log that no uploads are needed
        assert "All images already exist in R2, no uploads needed!" in caplog.text

        # All animals should have reused URLs
        assert result[0]["primary_image_url"] == "https://images.rescuedogs.me/org/existing1.jpg"
        assert result[1]["primary_image_url"] == "https://images.rescuedogs.me/org/existing2.jpg"
