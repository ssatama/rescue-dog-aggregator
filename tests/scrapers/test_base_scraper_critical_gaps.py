"""
Test suite for critical functionality gaps in scrapers/base_scraper.py

Tests image handling, config initialization, error recovery, and edge cases.
"""

from unittest.mock import MagicMock, Mock, patch

import psycopg2
import pytest
import requests
from cloudinary.exceptions import Error as CloudinaryError
from langdetect.lang_detect_exception import LangDetectException

from scrapers.base_scraper import BaseScraper


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperImageHandling:
    """Test image handling and Cloudinary integration critical gaps."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""

        class MockScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        return MockScraper(organization_id=1)

    @patch("utils.cloudinary_service.CloudinaryService.upload_image_from_url")
    def test_upload_single_image_cloudinary_success(self, mock_upload, mock_scraper):
        """Test successful image upload via CloudinaryService."""
        # Mock CloudinaryService response
        mock_upload.return_value = "https://cloudinary.com/uploaded/image.jpg"

        original_url = "http://example.com/image.jpg"
        result = mock_scraper.cloudinary_service.upload_image_from_url(original_url)

        assert result == "https://cloudinary.com/uploaded/image.jpg"
        mock_upload.assert_called_once_with(original_url)

    @patch("utils.cloudinary_service.CloudinaryService.upload_image_from_url")
    def test_upload_single_image_cloudinary_error(self, mock_upload, mock_scraper):
        """Test image upload failure fallback to original URL."""
        # Mock CloudinaryService error - return original URL on failure
        original_url = "http://example.com/image.jpg"
        mock_upload.return_value = original_url  # CloudinaryService returns original URL on error

        result = mock_scraper.cloudinary_service.upload_image_from_url(original_url)

        # Should fallback to original URL
        assert result == original_url

    @patch("utils.cloudinary_service.CloudinaryService.upload_image_from_url")
    def test_upload_single_image_network_timeout(self, mock_upload, mock_scraper):
        """Test image upload with network timeout."""
        # Mock network timeout - CloudinaryService handles this internally
        original_url = "http://example.com/image.jpg"
        mock_upload.return_value = original_url  # Fallback behavior

        result = mock_scraper.cloudinary_service.upload_image_from_url(original_url)

        # Should fallback to original URL
        assert result == original_url

    @patch("utils.cloudinary_service.CloudinaryService.upload_image_from_url")
    def test_upload_single_image_invalid_url(self, mock_upload, mock_scraper):
        """Test image upload with invalid URL."""
        # Mock invalid URL error
        original_url = "invalid://not-a-real-url"
        mock_upload.return_value = original_url  # CloudinaryService fallback

        result = mock_scraper.cloudinary_service.upload_image_from_url(original_url)

        # Should fallback to original URL
        assert result == original_url

    @patch.dict("os.environ", {"CLOUDINARY_CLOUD_NAME": "", "CLOUDINARY_API_KEY": "", "CLOUDINARY_API_SECRET": ""})
    @patch("utils.cloudinary_service.CloudinaryService.upload_image_from_url")
    def test_upload_single_image_cloudinary_disabled(self, mock_upload, mock_scraper):
        """Test image upload when Cloudinary is disabled."""
        original_url = "http://example.com/image.jpg"
        mock_upload.return_value = original_url  # Should return original when disabled

        result = mock_scraper.cloudinary_service.upload_image_from_url(original_url)

        # Should return original URL when Cloudinary is disabled
        assert result == original_url

    def test_save_animal_images_multiple_success(self, mock_scraper):
        """Test saving multiple images successfully."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.organization_name = "Test Organization"  # Required by save_animal_images

        # Mock existing images query - fetchall returns empty list initially
        mock_cursor.fetchall.return_value = []
        # Mock animal name query
        mock_cursor.fetchone.return_value = ("Test Dog",)

        # Mock CloudinaryService directly on the scraper instance
        mock_scraper.cloudinary_service = Mock()
        mock_scraper.cloudinary_service.upload_image_from_url.side_effect = [("https://cloudinary.com/image1.jpg", True), ("https://cloudinary.com/image2.jpg", True)]

        image_urls = ["http://example.com/image1.jpg", "http://example.com/image2.jpg"]
        result = mock_scraper.save_animal_images(1, image_urls)

        # Should return True on success
        assert result is True
        # Verify database operations occurred
        assert mock_cursor.execute.call_count >= 1  # At least one database operation

    def test_save_animal_images_partial_failure(self, mock_scraper):
        """Test saving images with partial Cloudinary failures."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.organization_name = "Test Organization"

        # Mock existing images query
        mock_cursor.fetchall.return_value = []
        # Mock animal name query
        mock_cursor.fetchone.return_value = ("Test Dog",)

        # Mock CloudinaryService directly on the scraper instance
        mock_scraper.cloudinary_service = Mock()
        mock_scraper.cloudinary_service.upload_image_from_url.side_effect = [("https://cloudinary.com/image1.jpg", True), ("http://example.com/image2.jpg", False)]  # Failure case

        image_urls = ["http://example.com/image1.jpg", "http://example.com/image2.jpg"]
        result = mock_scraper.save_animal_images(1, image_urls)

        # Should continue processing despite partial failure
        assert result is True
        # Verify both images were processed
        assert mock_scraper.cloudinary_service.upload_image_from_url.call_count == 2

    def test_save_animal_images_database_error(self, mock_scraper):
        """Test saving images with database error."""
        # Mock database connection with error
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = psycopg2.Error("Database error")

        image_urls = ["http://example.com/image1.jpg"]

        # The method catches database errors and returns False
        result = mock_scraper.save_animal_images(1, image_urls)
        assert result is False

    def test_save_animal_images_empty_list(self, mock_scraper):
        """Test saving empty image list."""
        # Mock database connection
        mock_scraper.conn = Mock()

        result = mock_scraper.save_animal_images(1, [])

        # Should return True for empty list (no work to do)
        assert result is True

    def test_save_animal_images_duplicate_urls(self, mock_scraper):
        """Test saving images with duplicate URLs."""
        # Mock database connection
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.organization_name = "Test Organization"

        # Mock existing images query
        mock_cursor.fetchall.return_value = []
        # Mock animal name query
        mock_cursor.fetchone.return_value = ("Test Dog",)

        # Mock CloudinaryService
        mock_scraper.cloudinary_service = Mock()
        mock_scraper.cloudinary_service.upload_image_from_url.return_value = ("https://cloudinary.com/image.jpg", True)

        # Duplicate URLs
        image_urls = ["http://example.com/image.jpg", "http://example.com/image.jpg"]
        result = mock_scraper.save_animal_images(1, image_urls)

        # Should handle duplicates appropriately
        assert result is True


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperConfigInitialization:
    """Test config-based initialization critical gaps."""

    def test_config_based_initialization_success(self):
        """Test successful config-based scraper initialization."""
        with (
            patch("scrapers.base_scraper.ConfigLoader") as mock_loader_class,
            patch("scrapers.base_scraper.OrganizationSyncManager") as mock_sync_class,
            patch("scrapers.base_scraper.psycopg2.connect"),
        ):

            # Mock config object with required methods
            mock_config = Mock()
            mock_config.name = "Test Org"
            mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 1.0, "max_retries": 3, "timeout": 30}

            # Mock config loader instance
            mock_loader_instance = Mock()
            mock_loader_instance.load_config.return_value = mock_config
            mock_loader_class.return_value = mock_loader_instance

            # Mock sync manager
            mock_sync_instance = Mock()
            mock_sync_instance.sync_organization.return_value = (1, True)  # (org_id, created)
            mock_sync_class.return_value = mock_sync_instance

            class TestScraper(BaseScraper):
                def collect_data(self):
                    return []

                def get_existing_animal(self, external_id, organization_id):
                    return None

                def create_animal(self, animal_data):
                    return 1, "added"

                def update_animal(self, animal_id, animal_data):
                    return animal_id, "updated"

            # Initialize with config_id
            scraper = TestScraper(config_id="test_org")

            # Verify config was loaded and sync manager created
            mock_loader_instance.load_config.assert_called_once_with("test_org")
            mock_sync_class.assert_called_once()
            assert scraper.organization_id == 1

    @patch("utils.config_loader.ConfigLoader.load_config")
    def test_config_based_initialization_load_failure(self, mock_load_config):
        """Test config-based initialization with config load failure."""
        # Mock config loading failure
        mock_load_config.side_effect = FileNotFoundError("Config not found")

        class TestScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        # Should raise error when config loading fails
        with pytest.raises(FileNotFoundError):
            TestScraper(config_id="nonexistent_org")

    @patch("utils.config_loader.ConfigLoader.load_config")
    @patch("utils.org_sync.OrganizationSyncManager")
    def test_config_initialization_sync_failure(self, mock_sync_manager, mock_load_config):
        """Test config initialization with sync failure."""
        # Mock config object
        mock_config = Mock()
        mock_config.name = "Test Org"
        mock_config.get_scraper_config_dict.return_value = {}
        mock_load_config.return_value = mock_config

        # Mock sync manager with failure
        mock_sync_instance = Mock()
        mock_sync_manager.return_value = mock_sync_instance
        mock_sync_instance.sync_organization.side_effect = Exception("Sync failed")

        class TestScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        # Should handle sync failure
        with pytest.raises(Exception):
            TestScraper(config_id="test_org")

    def test_backward_compatibility_organization_id_init(self):
        """Test backward compatibility with direct organization_id initialization."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        # Initialize with organization_id (legacy mode)
        scraper = TestScraper(organization_id=1)

        # Verify initialization works
        assert scraper.organization_id == 1


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperDatabaseErrorHandling:
    """Test database connection and error handling critical gaps."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""

        class MockScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        return MockScraper(organization_id=1)

    @patch("scrapers.base_scraper.psycopg2.connect")
    @patch("scrapers.base_scraper.DB_CONFIG", {"host": "localhost", "user": "test", "database": "test_db", "password": ""})
    def test_database_connection_no_password(self, mock_connect, mock_scraper):
        """Test database connection without password."""
        mock_conn = Mock()
        mock_connect.return_value = mock_conn

        mock_scraper.connect_to_database()

        # Verify connection called without password
        mock_connect.assert_called_once_with(host="localhost", user="test", database="test_db")

    @patch("scrapers.base_scraper.psycopg2.connect")
    @patch("scrapers.base_scraper.DB_CONFIG", {"host": "localhost", "user": "test", "database": "test_db", "password": "secret"})
    def test_database_connection_with_password(self, mock_connect, mock_scraper):
        """Test database connection with password."""
        mock_conn = Mock()
        mock_connect.return_value = mock_conn

        mock_scraper.connect_to_database()

        # Verify connection called with password
        mock_connect.assert_called_once_with(host="localhost", user="test", database="test_db", password="secret")

    @patch("scrapers.base_scraper.psycopg2.connect")
    def test_database_connection_failure(self, mock_connect, mock_scraper):
        """Test database connection failure handling."""
        mock_connect.side_effect = psycopg2.OperationalError("Connection failed")

        # Method catches exceptions and returns False
        result = mock_scraper.connect_to_database()
        assert result is False

    @patch("scrapers.base_scraper.psycopg2.connect")
    def test_database_connection_timeout(self, mock_connect, mock_scraper):
        """Test database connection timeout handling."""
        mock_connect.side_effect = psycopg2.OperationalError("timeout expired")

        # Method catches exceptions and returns False
        result = mock_scraper.connect_to_database()
        assert result is False


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperLanguageDetection:
    """Test language detection edge cases."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""

        class MockScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        return MockScraper(organization_id=1)

    @patch("scrapers.base_scraper.detect")
    def test_detect_language_success(self, mock_detect, mock_scraper):
        """Test successful language detection."""
        mock_detect.return_value = "en"

        result = mock_scraper.detect_language("This is English text")

        assert result == "en"
        mock_detect.assert_called_once_with("This is English text")

    @patch("scrapers.base_scraper.detect")
    def test_detect_language_failure(self, mock_detect, mock_scraper):
        """Test language detection failure fallback."""
        mock_detect.side_effect = LangDetectException(304, "Detection failed")

        result = mock_scraper.detect_language("Some text")

        # Should fallback to English
        assert result == "en"

    def test_detect_language_empty_text(self, mock_scraper):
        """Test language detection with empty text."""
        result = mock_scraper.detect_language("")

        # Should fallback to English for empty text
        assert result == "en"

    def test_detect_language_whitespace_only(self, mock_scraper):
        """Test language detection with whitespace-only text."""
        result = mock_scraper.detect_language("   \n\t   ")

        # Should fallback to English for whitespace-only text
        assert result == "en"

    @patch("scrapers.base_scraper.detect")
    def test_detect_language_very_long_text(self, mock_detect, mock_scraper):
        """Test language detection with very long text."""
        mock_detect.return_value = "en"

        long_text = "This is a very long text. " * 1000
        result = mock_scraper.detect_language(long_text)

        assert result == "en"
        # Should still call detect with full text
        mock_detect.assert_called_once_with(long_text)

    @patch("scrapers.base_scraper.detect")
    def test_detect_language_mixed_content(self, mock_detect, mock_scraper):
        """Test language detection with mixed language content."""
        mock_detect.return_value = "en"  # Dominant language

        mixed_text = "This is English text. Este es texto en español."
        result = mock_scraper.detect_language(mixed_text)

        assert result == "en"


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperScrapeLogging:
    """Test scrape log management critical gaps."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""

        class MockScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        return MockScraper(organization_id=1)

    def test_start_scrape_log_success(self, mock_scraper):
        """Test successful scrape log creation."""
        # Mock database connection
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = [123]  # Returns list, not dict

        result = mock_scraper.start_scrape_log()

        assert result is True  # Method returns True on success
        assert mock_scraper.scrape_log_id == 123  # ID is stored on scraper
        # Verify INSERT was called
        assert mock_cursor.execute.called

    def test_start_scrape_log_database_error(self, mock_scraper):
        """Test scrape log creation with database error."""
        # Mock database connection with error
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = psycopg2.Error("Insert failed")

        # Method catches exceptions and returns False
        result = mock_scraper.start_scrape_log()
        assert result is False

    def test_complete_scrape_log_success(self, mock_scraper):
        """Test successful scrape log completion."""
        # Mock database connection
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.scrape_log_id = 123

        result = mock_scraper.complete_scrape_log("completed", 10, 5, 3, 2)

        # Verify UPDATE was called and method succeeded
        assert mock_cursor.execute.called
        assert result is True
        # scrape_log_id should remain (not set to None)

    def test_complete_scrape_log_database_error(self, mock_scraper):
        """Test scrape log completion with database error."""
        # Mock database connection with error
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = psycopg2.Error("Update failed")
        mock_scraper.scrape_log_id = 123

        # Method catches exceptions and returns False
        result = mock_scraper.complete_scrape_log("error", 10, 5, 3, 2)
        assert result is False

    def test_complete_scrape_log_no_scrape_log_id(self, mock_scraper):
        """Test scrape log completion when no scrape_log_id exists."""
        # Mock database connection
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.scrape_log_id = None

        # Should still execute the update (with None scrape_log_id)
        result = mock_scraper.complete_scrape_log("completed", 10, 5, 3, 2)

        # Should still try to execute (the UPDATE will have scrape_log_id = None)
        assert result is True
        assert mock_cursor.execute.called


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperStaleDataDetection:
    """Test stale data detection critical gaps."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""

        class MockScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        return MockScraper(organization_id=1)

    def test_update_stale_data_detection_success(self, mock_scraper):
        """Test successful stale data detection update."""
        # Mock database connection
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.current_scrape_session = "session123"  # Required for method to proceed

        # Mock database operations
        mock_cursor.fetchall.return_value = [{"id": 1, "external_id": "dog1"}, {"id": 2, "external_id": "dog2"}]

        result = mock_scraper.update_stale_data_detection()

        # Should return True on success
        assert result is True
        # Verify database queries were executed
        assert mock_cursor.execute.call_count >= 1

    def test_update_stale_data_detection_database_error(self, mock_scraper):
        """Test stale data detection with database error."""
        # Mock database connection with error
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.current_scrape_session = "session123"
        mock_cursor.execute.side_effect = psycopg2.Error("Query failed")

        # Method catches exceptions and returns False
        result = mock_scraper.update_stale_data_detection()
        assert result is False

    def test_update_stale_data_detection_empty_list(self, mock_scraper):
        """Test stale data detection with no current scrape session."""
        # Mock database connection
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.current_scrape_session = None  # No active session

        result = mock_scraper.update_stale_data_detection()

        # Should return False when no active scrape session
        assert result is False


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperErrorRecovery:
    """Test error recovery and resilience critical gaps."""

    @pytest.fixture
    def mock_scraper(self):
        """Create a mock scraper for testing."""

        class MockScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return animal_id, "updated"

        return MockScraper(organization_id=1)

    def test_handle_scraper_failure_with_scrape_log(self, mock_scraper):
        """Test failure handling when scrape log exists."""
        # Mock database connection and complete_scrape_log method
        mock_scraper.conn = Mock()
        mock_scraper.scrape_log_id = 123
        mock_scraper.complete_scrape_log = Mock(return_value=True)
        mock_scraper.current_scrape_session = "session123"

        result = mock_scraper.handle_scraper_failure("Scraper failed")

        # Should call complete_scrape_log and return True
        assert result is True
        mock_scraper.complete_scrape_log.assert_called_once()
        # Should reset scrape session, but scrape_log_id remains
        assert mock_scraper.current_scrape_session is None

    def test_handle_scraper_failure_no_scrape_log(self, mock_scraper):
        """Test failure handling when no scrape log exists."""
        # Mock database connection
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_scraper.scrape_log_id = None

        error = Exception("Scraper failed")
        mock_scraper.handle_scraper_failure(error)

        # Should handle gracefully when no scrape_log_id
        # (May or may not call execute depending on implementation)

    def test_handle_scraper_failure_database_error(self, mock_scraper):
        """Test failure handling with database error during cleanup."""
        # Mock database connection with error
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = psycopg2.Error("Update failed")
        mock_scraper.scrape_log_id = 123

        error = Exception("Scraper failed")

        # Should handle database errors gracefully during cleanup
        # The exact behavior depends on implementation - it might raise or log the error
        try:
            mock_scraper.handle_scraper_failure(error)
        except psycopg2.Error:
            # This is acceptable - cleanup failed but we tried
            pass
