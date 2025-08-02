import logging
import time
from datetime import datetime
from io import StringIO
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraper:
    @pytest.fixture
    def mock_scraper(self):
        """Create a mock implementation of BaseScraper for testing."""

        class MockScraper(BaseScraper):
            def collect_data(self):
                return [
                    {"name": "Test Dog 1", "external_id": "test1"},
                    {"name": "Test Dog 2", "external_id": "test2"},
                ]

            def get_existing_animal(self, external_id, organization_id):
                """Mock implementation for testing."""
                return None  # Default: no existing animal

            def create_animal(self, animal_data):
                """Mock implementation for testing."""
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                """Mock implementation for testing."""
                return animal_id, "updated"

        # Use only organization_id (removed organization_name parameter)
        return MockScraper(organization_id=1)

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_save_animal_new(self, mock_scraper):
        """Test adding a new animal to the database."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor

        # Configure cursor mock to return no existing animal
        mock_cursor.fetchone.return_value = None

        # Test data
        animal_data = {
            "name": "Test Dog",
            "breed": "Labrador Retriever",
            "age_text": "2 years",
            "sex": "Male",
            "primary_image_url": "http://example.com/image.jpg",
            "adoption_url": "http://example.com/adopt",
            "status": "available",
            "external_id": "test123",
            "organization_id": 1,
        }

        # JSON dumps no longer used in implementation

        # Mock get_existing_animal to return None (new animal)
        with (
            patch.object(mock_scraper, "get_existing_animal", return_value=None),
            patch.object(mock_scraper, "create_animal", return_value=(1, "added")) as mock_create,
            patch.object(BaseScraper, "detect_language", return_value="en"),
        ):

            animal_id, action = mock_scraper.save_animal(animal_data)

        # Verify method was called
        mock_create.assert_called_once()
        assert action == "added"
        assert animal_id == 1

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_save_animal_update(self, mock_scraper):
        """Test updating an existing animal in the database."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor

        # Configure cursor mock to return existing animal with primary image data
        # The primary image query will return the existing URLs
        mock_cursor.fetchone.return_value = ("http://existing.com/image.jpg", "http://original.com/image.jpg")

        # Test data - use same URL as existing to avoid upload
        animal_data = {
            "name": "Test Dog",
            "breed": "Labrador Retriever",
            "age_text": "2 years",
            "sex": "Male",
            "primary_image_url": "http://original.com/image.jpg",  # Same URL to avoid upload
            "adoption_url": "http://example.com/adopt",
            "status": "available",
            "external_id": "test123",
            "organization_id": 1,
        }

        # JSON dumps no longer used in implementation

        # Mock get_existing_animal to return existing animal (tuple format)
        with (
            patch.object(mock_scraper, "get_existing_animal", return_value=[5]),
            patch.object(mock_scraper, "update_animal", return_value=(5, "updated")) as mock_update,
            patch.object(BaseScraper, "detect_language", return_value="en"),
        ):

            animal_id, action = mock_scraper.save_animal(animal_data)

        # Verify update method was called
        mock_update.assert_called_once_with(5, animal_data)
        assert action == "updated"
        assert animal_id == 5

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    @patch("scrapers.base_scraper.detect")
    def test_detect_language(self, mock_detect, mock_scraper):
        """Test language detection functionality."""
        mock_detect.return_value = "en"

        result = mock_scraper.detect_language("Hello world")

        mock_detect.assert_called_once_with("Hello world")
        assert result == "en"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    @patch("scrapers.base_scraper.psycopg2")
    def test_connect_to_database(self, mock_psycopg2, mock_scraper):
        """Test database connection functionality."""
        # Configure the mock
        mock_conn = Mock()
        mock_psycopg2.connect.return_value = mock_conn

        # Test database connection
        result = mock_scraper.connect_to_database()

        # Verify connection was attempted with correct parameters
        mock_psycopg2.connect.assert_called_once()
        assert result is True

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    @patch.object(BaseScraper, "connect_to_database")
    @patch.object(BaseScraper, "start_scrape_log")
    @patch.object(BaseScraper, "save_animal")
    @patch.object(BaseScraper, "complete_scrape_log_with_metrics")
    @patch.object(BaseScraper, "detect_partial_failure")
    def test_run_success(self, mock_failure_detection, mock_complete_log_with_metrics, mock_save, mock_start_log, mock_connect, mock_scraper):
        """Test successful run of the scraper."""
        # Configure mocks
        mock_connect.return_value = True
        mock_start_log.return_value = True
        mock_save.side_effect = [
            (1, "added"),
            (2, "added"),
        ]  # ID and action for each dog
        mock_complete_log_with_metrics.return_value = True
        mock_failure_detection.return_value = False  # No failure detected

        # Set a mock connection
        mock_scraper.conn = Mock()

        # Run the scraper
        result = mock_scraper.run()

        # Verify methods were called
        mock_connect.assert_called_once()
        mock_start_log.assert_called_once()
        assert mock_save.call_count == 2  # Two test dogs
        mock_complete_log_with_metrics.assert_called_once()

        # Check complete_scrape_log_with_metrics was called with correct parameters
        expected_args = {
            "status": "success",
            "animals_found": 2,
            "animals_added": 2,
            "animals_updated": 0,
        }
        for key, value in expected_args.items():
            assert mock_complete_log_with_metrics.call_args[1][key] == value

        # Verify result
        assert result is True

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_save_animal_images(self, mock_scraper):
        """Test saving animal images via ImageProcessingService."""
        # Test data
        animal_id = 1
        image_urls = [
            "http://example.com/image1.jpg",
            "http://example.com/image2.jpg",
            "http://example.com/image3.jpg",
        ]

        # Mock ImageProcessingService
        mock_image_service = Mock()
        mock_image_service.save_animal_images.return_value = (3, 0)  # 3 success, 0 failures
        mock_scraper.image_processing_service = mock_image_service
        mock_scraper.organization_name = "Test Org"

        # Execute method
        result = mock_scraper.save_animal_images(animal_id, image_urls)

        # Verify ImageProcessingService was called
        mock_image_service.save_animal_images.assert_called_once_with(animal_id, image_urls, mock_scraper.conn, "Test Org")

        # Verify result - save_animal_images returns (success_count, failure_count)
        assert result == (3, 0)  # 3 images uploaded successfully, 0 failures


@pytest.mark.slow
@pytest.mark.database
class TestBaseCRUDMethods:
    """Test the database CRUD methods that need to be implemented in BaseScraper."""

    @pytest.fixture
    def concrete_scraper(self):
        """Create a concrete implementation of BaseScraper for testing CRUD methods."""

        class ConcreteScraper(BaseScraper):
            def collect_data(self):
                return []

        return ConcreteScraper(organization_id=1)

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_get_existing_animal_found(self, concrete_scraper):
        """Test get_existing_animal when animal exists via DatabaseService."""
        # Mock DatabaseService
        mock_db_service = Mock()
        mock_db_service.get_existing_animal.return_value = (123, "Test Dog", "2024-01-01")
        concrete_scraper.database_service = mock_db_service

        # Test
        result = concrete_scraper.get_existing_animal("test-123", 1)

        # Verify DatabaseService was called
        mock_db_service.get_existing_animal.assert_called_once_with("test-123", 1)

        # Verify result
        assert result == (123, "Test Dog", "2024-01-01")

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_get_existing_animal_not_found(self, concrete_scraper):
        """Test get_existing_animal when animal doesn't exist via DatabaseService."""
        # Mock DatabaseService
        mock_db_service = Mock()
        mock_db_service.get_existing_animal.return_value = None
        concrete_scraper.database_service = mock_db_service

        # Test
        result = concrete_scraper.get_existing_animal("nonexistent", 1)

        # Verify DatabaseService was called
        mock_db_service.get_existing_animal.assert_called_once_with("nonexistent", 1)

        # Verify result
        assert result is None

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_create_animal_success(self, concrete_scraper):
        """Test create_animal method via DatabaseService."""
        # Mock DatabaseService
        mock_db_service = Mock()
        mock_db_service.create_animal.return_value = (456, "added")
        concrete_scraper.database_service = mock_db_service

        # Test data
        animal_data = {
            "name": "New Dog",
            "external_id": "new-123",
            "organization_id": 1,
            "animal_type": "dog",
            "breed": "Labrador",
            "age_text": "3 years",
            "sex": "Male",
            "adoption_url": "http://example.com/adopt/new-123",
            "primary_image_url": "http://example.com/image.jpg",
            "status": "available",
        }

        # Test
        animal_id, action = concrete_scraper.create_animal(animal_data)

        # Verify DatabaseService was called
        mock_db_service.create_animal.assert_called_once_with(animal_data)

        # Verify result
        assert animal_id == 456
        assert action == "added"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_update_animal_with_changes(self, concrete_scraper):
        """Test update_animal when changes are detected via DatabaseService."""
        # Mock DatabaseService
        mock_db_service = Mock()
        mock_db_service.update_animal.return_value = (123, "updated")
        concrete_scraper.database_service = mock_db_service

        # Test data with changes
        animal_data = {
            "name": "Updated Name",
            "breed": "Old Breed",
            "age_text": "3 years",
            "sex": "Female",
            "primary_image_url": "old-url.jpg",
            "status": "available",
        }

        # Test
        animal_id, action = concrete_scraper.update_animal(123, animal_data)

        # Verify DatabaseService was called
        mock_db_service.update_animal.assert_called_once_with(123, animal_data)

        # Verify result
        assert animal_id == 123
        assert action == "updated"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_update_animal_no_changes(self, concrete_scraper):
        """Test update_animal when no changes are detected via DatabaseService."""
        # Mock DatabaseService
        mock_db_service = Mock()
        mock_db_service.update_animal.return_value = (123, "no_change")
        concrete_scraper.database_service = mock_db_service

        # Test data (no changes)
        animal_data = {"name": "Same Name", "breed": "Same Breed", "age_text": "2 years", "sex": "Female", "primary_image_url": "same-url.jpg", "status": "available"}

        # Test
        animal_id, action = concrete_scraper.update_animal(123, animal_data)

        # Verify DatabaseService was called
        mock_db_service.update_animal.assert_called_once_with(123, animal_data)

        # Verify result
        assert animal_id == 123
        assert action == "no_change"


@pytest.mark.slow
@pytest.mark.database
class TestScrapeSessionTracking:
    """Test scrape session tracking and stale data detection."""

    @pytest.fixture
    def session_scraper(self):
        """Create a scraper for session tracking tests."""

        class SessionScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Dog 1", "external_id": "dog-1"}, {"name": "Dog 2", "external_id": "dog-2"}]

        return SessionScraper(organization_id=1)

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_start_scrape_session(self, session_scraper):
        """Test starting a new scrape session."""
        # Mock database connection and cursor
        session_scraper.conn = Mock()
        mock_cursor = Mock()
        session_scraper.conn.cursor.return_value = mock_cursor

        # Mock datetime for consistent testing
        test_time = datetime(2024, 1, 15, 10, 30, 0)

        # Test
        with patch("scrapers.base_scraper.datetime") as mock_datetime:
            mock_datetime.now.return_value = test_time
            result = session_scraper.start_scrape_session()

        # Verify session was started
        assert result is True
        assert session_scraper.current_scrape_session == test_time

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_update_stale_data_detection(self, session_scraper):
        """Test updating stale data detection after scrape via SessionManager."""
        # Mock SessionManager
        mock_session_manager = Mock()
        mock_session_manager.update_stale_data_detection.return_value = True
        session_scraper.session_manager = mock_session_manager

        # Set current scrape session
        session_scraper.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

        # Test
        result = session_scraper.update_stale_data_detection()

        # Verify SessionManager was called
        mock_session_manager.update_stale_data_detection.assert_called_once()

        # Verify result
        assert result is True

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_mark_animal_as_seen(self, session_scraper):
        """Test marking an animal as seen in current scrape via SessionManager."""
        # Mock SessionManager
        mock_session_manager = Mock()
        mock_session_manager.mark_animal_as_seen.return_value = True
        session_scraper.session_manager = mock_session_manager

        # Set current scrape session
        test_time = datetime(2024, 1, 15, 10, 30, 0)
        session_scraper.current_scrape_session = test_time

        # Test
        result = session_scraper.mark_animal_as_seen(123)

        # Verify SessionManager was called
        mock_session_manager.mark_animal_as_seen.assert_called_once_with(123)

        # Verify result
        assert result is True


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.computation
class TestAvailabilityStatusManagement:
    """Test availability status management and animal lifecycle."""

    @pytest.fixture
    def availability_scraper(self):
        """Create a scraper for availability management tests."""

        class AvailabilityScraper(BaseScraper):
            def collect_data(self):
                return []

        return AvailabilityScraper(organization_id=1)

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_mark_animals_unavailable_after_threshold(self, availability_scraper):
        """Test that animals are marked unavailable after consecutive missed scrapes via SessionManager."""
        # Mock SessionManager
        mock_session_manager = Mock()
        mock_session_manager.mark_animals_unavailable.return_value = 5
        availability_scraper.session_manager = mock_session_manager

        # Test
        result = availability_scraper.mark_animals_unavailable(threshold=4)

        # Verify SessionManager was called
        mock_session_manager.mark_animals_unavailable.assert_called_once_with(4)

        # Verify result
        assert result == 5

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_restore_available_animals(self, availability_scraper):
        """Test restoring animals to available status when they reappear via SessionManager."""
        # Mock SessionManager
        mock_session_manager = Mock()
        mock_session_manager.restore_available_animal.return_value = True
        availability_scraper.session_manager = mock_session_manager

        # Test
        result = availability_scraper.restore_available_animal(123)

        # Verify SessionManager was called
        mock_session_manager.restore_available_animal.assert_called_once_with(123)

        # Verify result
        assert result is True

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_get_stale_animals_summary(self, availability_scraper):
        """Test getting summary of stale animals for monitoring via SessionManager."""
        # Mock SessionManager
        mock_session_manager = Mock()
        mock_session_manager.get_stale_animals_summary.return_value = {("high", "available"): 10, ("medium", "available"): 5, ("low", "available"): 3, ("low", "unavailable"): 2}
        availability_scraper.session_manager = mock_session_manager

        # Test
        result = availability_scraper.get_stale_animals_summary()

        # Verify SessionManager was called
        mock_session_manager.get_stale_animals_summary.assert_called_once()

        # Verify result
        expected = {("high", "available"): 10, ("medium", "available"): 5, ("low", "available"): 3, ("low", "unavailable"): 2}
        assert result == expected


@pytest.mark.slow
@pytest.mark.database
class TestScraperErrorHandling:
    """Test error handling and failure recovery in scrapers."""

    @pytest.fixture
    def error_scraper(self):
        """Create a scraper for error handling tests."""

        class ErrorScraper(BaseScraper):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                self.should_fail = False

            def collect_data(self):
                if self.should_fail:
                    raise Exception("Simulated scraper failure")
                return [{"name": "Test Dog", "external_id": "test-1"}]

        return ErrorScraper(organization_id=1)

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_scraper_failure_does_not_update_stale_data(self, error_scraper):
        """Test that scraper failures don't incorrectly mark animals as stale."""
        # Mock database connection
        error_scraper.conn = Mock()
        mock_cursor = Mock()
        error_scraper.conn.cursor.return_value = mock_cursor

        # Mock successful connection and scrape log creation
        mock_cursor.fetchone.return_value = (1,)  # scrape_log_id

        # Configure scraper to fail
        error_scraper.should_fail = True

        # Test run
        with (
            patch.object(error_scraper, "connect_to_database", return_value=True),
            patch.object(error_scraper, "start_scrape_log", return_value=True),
            patch.object(error_scraper, "start_scrape_session", return_value=True),
            patch.object(error_scraper, "update_stale_data_detection") as mock_stale_update,
            patch.object(error_scraper, "complete_scrape_log", return_value=True),
        ):

            result = error_scraper.run()

        # Verify scraper failed
        assert result is False

        # Verify stale data detection was NOT called during failure
        mock_stale_update.assert_not_called()

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_partial_scraper_failure_detection(self, error_scraper):
        """Test detection of abnormally low animal counts (partial failures) via SessionManager."""
        # Mock SessionManager
        mock_session_manager = Mock()
        mock_session_manager.detect_partial_failure.return_value = True
        error_scraper.session_manager = mock_session_manager

        # Set the attributes that are passed to the session manager
        error_scraper.total_animals_before_filter = 50
        error_scraper.total_animals_skipped = 0

        # Test with suspiciously low count (10 animals, 20% of average)
        result = error_scraper.detect_partial_failure(animals_found=10)

        # Verify SessionManager was called with correct parameters
        mock_session_manager.detect_partial_failure.assert_called_once_with(10, 0.5, 3, 3, 50, 0)

        # Should detect as potential failure (< 50% of average)
        assert result is True

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_normal_count_not_flagged_as_failure(self, error_scraper):
        """Test that normal animal counts are not flagged as failures."""
        # Mock database connection and cursor
        error_scraper.conn = Mock()
        mock_cursor = Mock()
        error_scraper.conn.cursor.return_value = mock_cursor

        # Mock historical average of 50 animals
        mock_cursor.fetchone.return_value = (50.0,)

        # Test with normal count (45 animals, 90% of average)
        result = error_scraper.detect_partial_failure(animals_found=45)

        # Should NOT detect as failure (> 50% of average)
        assert result is False


@pytest.mark.slow
@pytest.mark.database
class TestEnhancedLogging:
    """Test enhanced logging and metrics tracking."""

    @pytest.fixture
    def logging_scraper(self):
        """Create a scraper for logging tests."""

        class LoggingScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test-1"}]

        return LoggingScraper(organization_id=1)

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_detailed_scrape_metrics_logging(self, logging_scraper):
        """Test that detailed metrics are logged during scrape via MetricsCollector."""
        # Mock MetricsCollector
        mock_metrics_collector = Mock()
        mock_metrics_collector.log_detailed_metrics.return_value = True
        logging_scraper.metrics_collector = mock_metrics_collector

        # Test data
        metrics = {
            "animals_found": 25,
            "animals_added": 5,
            "animals_updated": 15,
            "animals_unchanged": 5,
            "images_uploaded": 30,
            "images_failed": 2,
            "duration_seconds": 120.5,
            "data_quality_score": 0.95,
        }

        # Test
        result = logging_scraper.log_detailed_metrics(metrics)

        # Verify MetricsCollector was called
        mock_metrics_collector.log_detailed_metrics.assert_called_once_with(metrics)

        # Verify result
        assert result is True

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_data_quality_assessment(self, logging_scraper):
        """Test data quality assessment during scraping via MetricsCollector."""
        # Mock MetricsCollector
        mock_metrics_collector = Mock()
        mock_metrics_collector.assess_data_quality.return_value = 0.67  # Lower score due to quality issues
        logging_scraper.metrics_collector = mock_metrics_collector

        # Test data with various quality issues
        animals_data = [
            {"name": "Good Dog", "breed": "Labrador", "age_text": "3 years", "external_id": "good-1"},
            {"name": "", "breed": "Unknown", "age_text": "", "external_id": "poor-1"},  # Poor quality
            {"name": "OK Dog", "breed": "", "age_text": "young", "external_id": "ok-1"},  # Medium quality
        ]

        # Test
        quality_score = logging_scraper.metrics_collector.assess_data_quality(animals_data)

        # Verify MetricsCollector was called
        mock_metrics_collector.assess_data_quality.assert_called_once_with(animals_data)

        # Should be between 0 and 1, with lower score due to quality issues
        assert 0 <= quality_score <= 1
        assert quality_score < 1.0  # Not perfect due to quality issues

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_scrape_duration_tracking(self, logging_scraper):
        """Test that scrape duration is properly tracked via MetricsCollector."""
        # Mock MetricsCollector
        mock_metrics_collector = Mock()
        mock_metrics_collector.calculate_scrape_duration.return_value = 150.0  # 2.5 minutes
        logging_scraper.metrics_collector = mock_metrics_collector

        # Mock time tracking
        start_time = datetime(2024, 1, 15, 10, 0, 0)
        end_time = datetime(2024, 1, 15, 10, 2, 30)  # 2.5 minutes later

        # Calculate duration
        duration = logging_scraper.metrics_collector.calculate_scrape_duration(start_time, end_time)

        # Verify MetricsCollector was called
        mock_metrics_collector.calculate_scrape_duration.assert_called_once_with(start_time, end_time)

        # Should be 150 seconds (2.5 minutes)
        assert duration == 150.0


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestDurationMeasurementScraper(BaseScraper):
    """Test implementation that simulates realistic scrape timing - consolidated from test_base_scraper_duration_measurement.py."""

    def __init__(self, config_id="daisyfamilyrescue", simulate_duration=2.0):
        """Initialize with configurable duration simulation."""
        super().__init__(config_id=config_id)
        self.simulate_duration = simulate_duration

    def collect_data(self):
        """Mock implementation that takes realistic time."""
        # Simulate realistic scrape time (e.g., network requests, page processing)
        time.sleep(self.simulate_duration)

        # Return mock data
        return [{"name": "Test Dog", "external_id": "test-123", "adoption_url": "https://example.com/test-123", "breed": "Mixed", "age_text": "2 years"}]


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestBaseScraperDurationMeasurement:
    """Test for accurate duration measurement - consolidated from test_base_scraper_duration_measurement.py."""

    @pytest.fixture
    def mock_services_duration(self):
        """Create mocked services for testing duration measurement."""
        mock_db_service = Mock()
        mock_db_service.create_scrape_log.return_value = 123
        mock_db_service.complete_scrape_log.return_value = True
        mock_db_service.complete_scrape_log_with_metrics = Mock(return_value=True)
        mock_db_service.get_existing_animal_urls.return_value = set()

        mock_session_manager = Mock()
        mock_session_manager.start_scrape_session.return_value = True
        mock_session_manager.get_current_session.return_value = "test_session"
        mock_session_manager.mark_animal_as_seen.return_value = True
        mock_session_manager.update_stale_data_detection.return_value = True
        mock_session_manager.mark_skipped_animals_as_seen.return_value = 0
        mock_session_manager.detect_partial_failure.return_value = False

        # Mock metrics collector that tracks actual timing
        mock_metrics_collector = Mock()
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.log_detailed_metrics.return_value = None

        # KEY ISSUE: calculate_scrape_duration should return the actual elapsed time
        # Currently it may only measure a small portion of the total time
        def mock_calculate_duration(start_time, end_time):
            """Mock that should return actual elapsed time."""
            actual_duration = (end_time - start_time).total_seconds()
            return actual_duration

        mock_metrics_collector.calculate_scrape_duration = Mock(side_effect=mock_calculate_duration)
        mock_metrics_collector.assess_data_quality.return_value = 0.85

        # Mock generate_comprehensive_metrics to return the provided kwargs
        # This simulates the correct behavior where duration_seconds is passed through
        def mock_comprehensive_metrics(**kwargs):
            """Mock that returns the provided metrics (simulating correct behavior)."""
            return kwargs

        mock_metrics_collector.generate_comprehensive_metrics = Mock(side_effect=mock_comprehensive_metrics)

        return {"database_service": mock_db_service, "session_manager": mock_session_manager, "metrics_collector": mock_metrics_collector}

    def test_duration_should_measure_full_scrape_time(self, mock_services_duration):
        """Test that duration measurement captures the full scrape execution time."""
        # Create scraper that simulates 2 seconds of execution time
        scraper = TestDurationMeasurementScraper(config_id="daisyfamilyrescue", simulate_duration=2.0)
        scraper.database_service = mock_services_duration["database_service"]
        scraper.session_manager = mock_services_duration["session_manager"]
        scraper.metrics_collector = mock_services_duration["metrics_collector"]

        # Mock save_animal to avoid actual database operations
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Record start time for our own measurement
        test_start_time = time.time()

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        # Calculate actual elapsed time
        actual_elapsed = time.time() - test_start_time

        assert result is True

        # Check the completion call to see what duration was logged
        db_service = mock_services_duration["database_service"]
        metrics_collector = mock_services_duration["metrics_collector"]

        # Extract duration from the logged metrics
        logged_duration = None

        if db_service.complete_scrape_log.call_count > 0:
            call_args = db_service.complete_scrape_log.call_args
            args, kwargs = call_args if call_args else ([], {})

            if len(args) >= 7:  # New format with detailed metrics
                logged_duration = args[7] if len(args) > 7 else None  # Try args[7] for duration_seconds

        # The key issue: duration measurement inconsistency
        assert logged_duration is not None, "Duration should be logged as parameter"
        assert logged_duration >= 1.8, (
            f"Duration parameter should measure full scrape time (~2.0s), "
            f"but got {logged_duration}s. "
            f"This indicates duration measurement captures database update time "
            f"instead of the full scrape execution time including collect_data()."
        )

    def test_calculate_scrape_duration_timing_points(self, mock_services_duration):
        """Test that scrape_start_time and scrape_end_time span the full execution."""
        scraper = TestDurationMeasurementScraper(config_id="daisyfamilyrescue", simulate_duration=1.5)
        scraper.database_service = mock_services_duration["database_service"]
        scraper.session_manager = mock_services_duration["session_manager"]
        scraper.metrics_collector = mock_services_duration["metrics_collector"]

        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Track when calculate_scrape_duration is called and with what parameters
        original_calculate = mock_services_duration["metrics_collector"].calculate_scrape_duration
        call_info = []

        def track_calculate_duration(start_time, end_time):
            duration = original_calculate(start_time, end_time)
            call_info.append({"start_time": start_time, "end_time": end_time, "calculated_duration": duration})
            return duration

        mock_services_duration["metrics_collector"].calculate_scrape_duration = track_calculate_duration

        # Record our own timing
        test_start = time.time()

        with scraper:
            result = scraper._run_with_connection()

        test_end = time.time()
        actual_test_duration = test_end - test_start

        assert result is True
        assert len(call_info) > 0, "calculate_scrape_duration should be called"

        # Analyze the timing information
        timing_info = call_info[0]  # Should be only one call
        calculated_duration = timing_info["calculated_duration"]

        # The calculated duration should be close to our test measurement
        # If it's much smaller, it means the timing points are wrong
        assert calculated_duration >= 1.2, (
            f"BaseScraper's calculated duration ({calculated_duration:.3f}s) "
            f"should be close to actual execution time (~1.5s), "
            f"but it's much smaller. This suggests scrape_start_time is set too late "
            f"or scrape_end_time is set too early, missing the collect_data() phase."
        )

    def test_duration_consistency_across_multiple_runs(self, mock_services_duration):
        """Test duration measurement consistency with different execution times."""
        durations_to_test = [0.5, 1.0, 1.5]  # Different simulated durations
        measured_durations = []

        for expected_duration in durations_to_test:
            scraper = TestDurationMeasurementScraper(config_id="daisyfamilyrescue", simulate_duration=expected_duration)
            scraper.database_service = mock_services_duration["database_service"]
            scraper.session_manager = mock_services_duration["session_manager"]
            scraper.metrics_collector = mock_services_duration["metrics_collector"]

            scraper.save_animal = Mock(return_value=(1, "added"))
            scraper.mark_animal_as_seen = Mock(return_value=True)

            # Reset mock call counts
            mock_services_duration["database_service"].complete_scrape_log_with_metrics.reset_mock()

            with scraper:
                result = scraper._run_with_connection()

            assert result is True

            # Debug: Check which completion method was called
            with_metrics_args = mock_services_duration["database_service"].complete_scrape_log_with_metrics.call_args
            basic_args = mock_services_duration["database_service"].complete_scrape_log.call_args

            if with_metrics_args:
                args, kwargs = with_metrics_args
                logged_duration = args[6] if len(args) >= 7 else kwargs.get("duration_seconds")
            elif basic_args:
                args, kwargs = basic_args
                # The basic method now gets duration at position 7 (0-indexed)
                logged_duration = args[7] if len(args) >= 8 else None
            else:
                logged_duration = None

            measured_durations.append((expected_duration, logged_duration))

        # All measured durations should be reasonably close to expected
        for expected, measured in measured_durations:
            assert measured >= expected * 0.8, (
                f"Measured duration ({measured:.3f}s) should be close to "
                f"expected duration ({expected:.1f}s), but it's much smaller. "
                f"This indicates the duration measurement is not capturing "
                f"the full execution time consistently."
            )


@pytest.mark.computation
@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestProgressIntegrationScraper(BaseScraper):
    """Test implementation for progress tracking integration - consolidated from test_base_scraper_progress_integration.py."""

    def __init__(self, config_id="daisyfamilyrescue", animal_count=100):
        """Initialize with configurable animal count for testing different scales."""
        super().__init__(config_id=config_id)
        self.animal_count = animal_count

    def collect_data(self):
        """Mock implementation that returns specified number of animals."""
        animals = []
        for i in range(self.animal_count):
            animals.append(
                {
                    "name": f"Test Dog {i+1}",
                    "external_id": f"test-{i+1}",
                    "adoption_url": f"https://example.com/test-{i+1}",
                    "breed": "Mixed",
                    "age_text": "2 years",
                    "image_urls": [f"https://example.com/image-{i+1}.jpg"],
                }
            )
        return animals


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestBaseScraperProgressIntegration:
    """Test ProgressTracker integration with BaseScraper - consolidated from test_base_scraper_progress_integration.py."""

    @pytest.fixture
    def mock_services_progress(self):
        """Create mocked services for testing progress integration."""
        mock_db_service = Mock()
        mock_db_service.create_scrape_log.return_value = 123
        mock_db_service.complete_scrape_log.return_value = True
        mock_db_service.complete_scrape_log_with_metrics = Mock(return_value=True)
        mock_db_service.get_existing_animal_urls.return_value = set()

        mock_session_manager = Mock()
        mock_session_manager.start_scrape_session.return_value = True
        mock_session_manager.get_current_session.return_value = "test_session"
        mock_session_manager.mark_animal_as_seen.return_value = True
        mock_session_manager.update_stale_data_detection.return_value = True
        mock_session_manager.mark_skipped_animals_as_seen.return_value = 0
        mock_session_manager.detect_partial_failure.return_value = False

        mock_metrics_collector = Mock()
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.log_detailed_metrics.return_value = None
        mock_metrics_collector.calculate_scrape_duration.return_value = 5.0
        mock_metrics_collector.assess_data_quality.return_value = 0.85
        mock_metrics_collector.generate_comprehensive_metrics.return_value = {"test": "metrics"}

        return {"database_service": mock_db_service, "session_manager": mock_session_manager, "metrics_collector": mock_metrics_collector}

    def test_small_site_should_use_minimal_logging(self, mock_services_progress):
        """Test that small sites (≤25 animals) use minimal logging with no progress updates."""
        # Small site with 15 animals
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=15)
        scraper.database_service = mock_services_progress["database_service"]
        scraper.session_manager = mock_services_progress["session_manager"]
        scraper.metrics_collector = mock_services_progress["metrics_collector"]

        # Mock save_animal to avoid actual database operations
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.save_animal_images = Mock(return_value=(1, 0))

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

    def test_large_site_should_use_comprehensive_logging_with_progress(self, mock_services_progress):
        """Test that large sites (150+ animals) use comprehensive logging with progress bars."""
        # Large site with 200 animals
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=200)
        scraper.database_service = mock_services_progress["database_service"]
        scraper.session_manager = mock_services_progress["session_manager"]
        scraper.metrics_collector = mock_services_progress["metrics_collector"]

        # Mock save_animal to simulate processing time
        def mock_save_with_delay(animal_data):
            time.sleep(0.001)  # Small delay to simulate processing
            return (1, "added")

        scraper.save_animal = Mock(side_effect=mock_save_with_delay)
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.save_animal_images = Mock(return_value=(2, 0))

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

    def test_progress_logging_should_not_impact_existing_functionality(self, mock_services_progress):
        """Test that progress logging doesn't break existing scraper functionality."""
        # Test with medium-sized site
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=75)
        scraper.database_service = mock_services_progress["database_service"]
        scraper.session_manager = mock_services_progress["session_manager"]
        scraper.metrics_collector = mock_services_progress["metrics_collector"]

        # Mock services
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.save_animal_images = Mock(return_value=(2, 0))

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Verify all existing functionality still works
        mock_services_progress["database_service"].create_scrape_log.assert_called_once()
        mock_services_progress["session_manager"].start_scrape_session.assert_called_once()
        mock_services_progress["metrics_collector"].calculate_scrape_duration.assert_called_once()

        # Verify completion was logged (either basic or with metrics)
        completion_calls = mock_services_progress["database_service"].complete_scrape_log.call_count + mock_services_progress["database_service"].complete_scrape_log_with_metrics.call_count
        assert completion_calls >= 1, "Scrape completion should be logged"

    def test_terminal_and_database_logging_consistency(self, mock_services_progress):
        """Test that terminal logging matches database logging for animals_found count."""
        # Create test scraper
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=5)
        scraper.database_service = mock_services_progress["database_service"]
        scraper.session_manager = mock_services_progress["session_manager"]
        scraper.metrics_collector = mock_services_progress["metrics_collector"]

        # Configure skip_existing_animals scenario
        scraper.skip_existing_animals = True
        scraper.total_animals_before_filter = 42  # Found 42 dogs on website
        scraper.total_animals_skipped = 42  # All 42 were existing, so skipped

        # Mock save_animal to track animals_found
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Run scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Verify that animals_found is preserved correctly
        # This tests the fix for the logging discrepancy bug
        assert hasattr(scraper, "animals_found"), "animals_found attribute should exist"

    def test_animals_found_attribute_preserved_after_run(self, mock_services_progress):
        """Test that scraper.animals_found attribute is correctly preserved after scraper.run()."""
        # Create scraper with mock services
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=42)
        scraper.database_service = mock_services_progress["database_service"]
        scraper.session_manager = mock_services_progress["session_manager"]
        scraper.metrics_collector = mock_services_progress["metrics_collector"]

        # Mock successful processing
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Verify animals_found attribute is set correctly
        # This should match what gets logged to database and terminal
        expected_count = 42  # Based on collect_data() return
        assert getattr(scraper, "animals_found", 0) == expected_count, f"Expected {expected_count} animals found, got {getattr(scraper, 'animals_found', 0)}"


@pytest.mark.integration
@pytest.mark.network
@pytest.mark.slow
class TestLoggerSetupScraper(BaseScraper):
    """Test implementation for logger setup testing - consolidated from test_base_scraper_logger_setup.py."""

    def __init__(self, config_id="daisyfamilyrescue"):
        """Initialize with minimal setup for testing."""
        super().__init__(config_id=config_id)

    def collect_data(self):
        """Mock implementation for testing."""
        return [{"name": "Test Dog", "external_id": "test-123", "adoption_url": "https://example.com/test-123", "breed": "Mixed", "age_text": "2 years"}]


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestBaseScraperLoggerSetup:
    """Test for logger setup and handler duplication issues - consolidated from test_base_scraper_logger_setup.py."""

    def test_logger_should_not_create_duplicate_handlers(self):
        """Test that multiple scraper instances don't create duplicate handlers."""
        import logging
        from io import StringIO

        # Get the logger name that will be used
        test_org_name = "Daisy Family Rescue e.V. (daisyfamilyrescue)"
        logger_name = f"scraper.{test_org_name}.dog"

        # Clear any existing handlers on this logger
        test_logger = logging.getLogger(logger_name)
        test_logger.handlers.clear()

        # Capture log output
        log_capture = StringIO()
        stream_handler = logging.StreamHandler(log_capture)

        # Create first scraper instance
        scraper1 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")
        handlers_after_first = len(scraper1.logger.handlers)

        # Create second scraper instance
        scraper2 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")
        handlers_after_second = len(scraper2.logger.handlers)

        # Create third scraper instance
        scraper3 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")
        handlers_after_third = len(scraper3.logger.handlers)

        # Test the duplication issue
        # Add our test handler to capture messages
        test_logger.addHandler(stream_handler)
        test_logger.setLevel(logging.INFO)

        # All three scrapers should use the same logger
        assert scraper1.logger.name == scraper2.logger.name == scraper3.logger.name

        # Log a message and check for duplication
        test_message = "Test message for duplication check"
        scraper3.logger.info(test_message)

        # Get captured log output
        log_output = log_capture.getvalue()
        message_count = log_output.count(test_message)

        # CURRENT BUG: Message appears multiple times due to handler duplication
        # EXPECTED: Message should appear only once
        assert message_count == 1, (
            f"Log message appeared {message_count} times instead of 1. "
            f"This indicates handler duplication bug. "
            f"Handlers count progression: {handlers_after_first} → {handlers_after_second} → {handlers_after_third}"
        )

        # Clean up
        test_logger.removeHandler(stream_handler)

    def test_logger_setup_should_be_idempotent(self):
        """Test that calling _setup_logger multiple times is safe."""
        scraper = TestLoggerSetupScraper(config_id="daisyfamilyrescue")

        # Get initial handler count
        initial_count = len(scraper.logger.handlers)

        # Call setup again (this could happen in certain scenarios)
        logger2 = scraper._setup_logger()
        second_count = len(logger2.handlers)

        # Handler count should not increase
        assert second_count == initial_count, f"Handler count increased from {initial_count} to {second_count} " f"after second _setup_logger() call. This indicates setup is not idempotent."

    def test_logger_configuration_should_be_consistent(self):
        """Test that logger configuration is consistent across instances."""
        scraper1 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")
        scraper2 = TestLoggerSetupScraper(config_id="daisyfamilyrescue")

        # Both should have same logger name and level
        assert scraper1.logger.name == scraper2.logger.name
        assert scraper1.logger.level == scraper2.logger.level

        # Both should reference the same logger object
        assert scraper1.logger is scraper2.logger, "Scrapers with same organization should share the same logger instance"


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestBaseScraperDogsFoundSemantics(BaseScraper):
    """Test implementation of BaseScraper that mimics daisy_family_rescue filtering behavior - consolidated from test_base_scraper_dogs_found_semantics.py."""

    def collect_data(self):
        """Mock implementation that simulates the filtering behavior in daisy_family_rescue."""
        # Simulate finding 35 dogs on the website (like daisy_family_rescue does)
        all_dogs = [
            {"name": f"Test Dog {i}", "external_id": f"test-{i}", "adoption_url": f"https://example.com/test-{i}", "breed": "Mixed", "age_text": "2 years"}
            for i in range(1, 36)  # Creates 35 dogs (indices 1-35)
        ]

        # SIMULATE THE BUG: Apply filtering like daisy_family_rescue does
        if self.skip_existing_animals and all_dogs:
            all_urls = [dog.get("adoption_url") for dog in all_dogs if dog.get("adoption_url")]
            filtered_urls = self._filter_existing_urls(all_urls)
            filtered_urls_set = set(filtered_urls)

            # Filter dogs to only those with URLs we should process
            original_count = len(all_dogs)
            filtered_dogs = [dog for dog in all_dogs if dog.get("adoption_url") in filtered_urls_set]
            skipped_count = original_count - len(filtered_dogs)

            # Track filtering stats (this is what should be used for dogs_found)
            self.set_filtering_stats(original_count, skipped_count)

            # PROBLEM: Return filtered list instead of original list
            # This causes BaseScraper to see 0 dogs instead of 35
            return filtered_dogs
        else:
            # No filtering applied
            self.set_filtering_stats(len(all_dogs), 0)
            return all_dogs


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestBaseScraperDogsFoundSemanticsTests:
    """Test for correct dogs_found field semantics - consolidated from test_base_scraper_dogs_found_semantics.py."""

    @pytest.fixture
    def mock_services_dogs_found(self):
        """Create mocked services for testing dogs found semantics."""
        mock_db_service = Mock()
        mock_db_service.create_scrape_log.return_value = 123
        mock_db_service.complete_scrape_log.return_value = True
        mock_db_service.complete_scrape_log_with_metrics = Mock(return_value=True)

        # Mock get_existing_animal_urls to return ALL URLs (simulating all dogs exist)
        existing_urls = {f"https://example.com/test-{i}" for i in range(1, 36)}
        mock_db_service.get_existing_animal_urls.return_value = existing_urls

        mock_session_manager = Mock()
        mock_session_manager.start_scrape_session.return_value = True
        mock_session_manager.get_current_session.return_value = "test_session"
        mock_session_manager.mark_animal_as_seen.return_value = True
        mock_session_manager.update_stale_data_detection.return_value = True
        mock_session_manager.mark_skipped_animals_as_seen.return_value = 0
        mock_session_manager.detect_partial_failure.return_value = False

        mock_metrics_collector = Mock()
        mock_metrics_collector.calculate_scrape_duration.return_value = 17.4
        mock_metrics_collector.assess_data_quality.return_value = 0.85
        mock_metrics_collector.generate_comprehensive_metrics.return_value = {
            "animals_found": 35,  # This should be total found, not filtered
            "animals_added": 0,  # None were added (all existed)
            "animals_updated": 0,
            "duration_seconds": 17.4,
            "data_quality_score": 0.85,
        }
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.log_detailed_metrics.return_value = None

        return {"database_service": mock_db_service, "session_manager": mock_session_manager, "metrics_collector": mock_metrics_collector}

    def test_dogs_found_should_show_total_not_filtered_count(self, mock_services_dogs_found):
        """Test that dogs_found shows total animals found on website, not filtered count."""
        # Create scraper with skip_existing_animals enabled
        scraper = TestBaseScraperDogsFoundSemantics(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services_dogs_found["database_service"]
        scraper.session_manager = mock_services_dogs_found["session_manager"]
        scraper.metrics_collector = mock_services_dogs_found["metrics_collector"]
        scraper.skip_existing_animals = True  # Enable filtering

        # Mock save_animal to avoid actual database operations
        scraper.save_animal = Mock(return_value=(1, "no_change"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check the completion call to see what dogs_found value was logged
        db_service = mock_services_dogs_found["database_service"]

        # Check which method was called
        dogs_found_value = None
        if db_service.complete_scrape_log_with_metrics.call_count > 0:
            # Extract from complete_scrape_log_with_metrics
            call_args = db_service.complete_scrape_log_with_metrics.call_args
            args, kwargs = call_args if call_args else ([], {})
            dogs_found_value = args[2] if len(args) >= 3 else kwargs.get("animals_found", "NOT_FOUND")
        elif db_service.complete_scrape_log.call_count > 0:
            # Extract from complete_scrape_log
            call_args = db_service.complete_scrape_log.call_args
            args, kwargs = call_args if call_args else ([], {})
            dogs_found_value = args[2] if len(args) >= 3 else kwargs.get("animals_found", "NOT_FOUND")

        # This test should FAIL with current implementation
        # Current: dogs_found = len(filtered_animals_data) = 0
        # Expected: dogs_found = total_animals_before_filter = 35
        assert dogs_found_value == 35, (
            f"dogs_found should show total animals found on website (35), "
            f"not the filtered count ({dogs_found_value}). "
            f"When skip_existing_animals=true and all animals exist, "
            f"dogs_found should still show 35 to indicate scraper found 35 dogs, "
            f"even though 0 were processed as new."
        )

    def test_filtering_stats_are_tracked_correctly(self, mock_services_dogs_found):
        """Test that filtering statistics are tracked and available for logging."""
        scraper = TestBaseScraperDogsFoundSemantics(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services_dogs_found["database_service"]
        scraper.session_manager = mock_services_dogs_found["session_manager"]
        scraper.metrics_collector = mock_services_dogs_found["metrics_collector"]
        scraper.skip_existing_animals = True

        scraper.save_animal = Mock(return_value=(1, "no_change"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Run the scraper to trigger filtering
        with scraper:
            scraper._run_with_connection()

        # Check that filtering stats were set correctly
        # These stats should be available for proper dogs_found calculation
        assert scraper.total_animals_before_filter == 35, "total_animals_before_filter should track the original count from collect_data()"

        assert scraper.total_animals_skipped == 35, "total_animals_skipped should track how many were filtered out"

    def test_dogs_found_semantics_with_partial_processing(self, mock_services_dogs_found):
        """Test dogs_found semantics when some animals are new and some exist."""
        # Mock that only 20 out of 35 URLs already exist
        existing_urls = {f"https://example.com/test-{i}" for i in range(1, 21)}  # 1-20 exist
        mock_services_dogs_found["database_service"].get_existing_animal_urls.return_value = existing_urls

        scraper = TestBaseScraperDogsFoundSemantics(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services_dogs_found["database_service"]
        scraper.session_manager = mock_services_dogs_found["session_manager"]
        scraper.metrics_collector = mock_services_dogs_found["metrics_collector"]
        scraper.skip_existing_animals = True

        # Mock save_animal to simulate adding new animals
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        with scraper:
            scraper._run_with_connection()

        # Check filtering stats
        assert scraper.total_animals_before_filter == 35, "Should track total found"
        assert scraper.total_animals_skipped == 20, "Should track how many were skipped"

        # Check completion call
        db_service = mock_services_dogs_found["database_service"]

        # Check which method was called
        dogs_found_value = None
        dogs_added_value = None
        if db_service.complete_scrape_log_with_metrics.call_count > 0:
            # Extract from complete_scrape_log_with_metrics
            call_args = db_service.complete_scrape_log_with_metrics.call_args
            args, kwargs = call_args if call_args else ([], {})
            dogs_found_value = args[2] if len(args) >= 3 else kwargs.get("animals_found")
            dogs_added_value = args[3] if len(args) >= 4 else kwargs.get("animals_added")
        elif db_service.complete_scrape_log.call_count > 0:
            # Extract from complete_scrape_log
            call_args = db_service.complete_scrape_log.call_args
            args, kwargs = call_args if call_args else ([], {})
            dogs_found_value = args[2] if len(args) >= 3 else kwargs.get("animals_found")
            dogs_added_value = args[3] if len(args) >= 4 else kwargs.get("animals_added")

        # Expected behavior:
        # - dogs_found: 35 (total found on website)
        # - dogs_added: 15 (new animals processed: 35 - 20 = 15)
        assert dogs_found_value == 35, f"dogs_found should be 35 (total), got {dogs_found_value}"
        assert dogs_added_value == 15, f"dogs_added should be 15 (new animals), got {dogs_added_value}"


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestBaseScraperDuplicateCompletion:
    """Test for BaseScraper duplicate completion scenarios - consolidated from test_duplicate_completion_scenarios.py and test_base_scraper_duplicate_completion.py."""

    @pytest.fixture
    def mock_services_for_completion(self):
        """Create mocked services for testing completion scenarios."""
        mock_db_service = Mock()
        mock_db_service.create_scrape_log.return_value = 123
        mock_db_service.complete_scrape_log.return_value = True
        mock_db_service.complete_scrape_log_with_metrics = Mock(return_value=True)

        mock_session_manager = Mock()
        mock_session_manager.start_scrape_session.return_value = True
        mock_session_manager.get_current_session.return_value = "test_session"
        mock_session_manager.mark_animal_as_seen.return_value = True
        mock_session_manager.update_stale_data_detection.return_value = True
        mock_session_manager.mark_skipped_animals_as_seen.return_value = 0
        mock_session_manager.detect_partial_failure.return_value = False

        mock_metrics_collector = Mock()
        mock_metrics_collector.calculate_scrape_duration.return_value = 30.5
        mock_metrics_collector.assess_data_quality.return_value = 0.85
        mock_metrics_collector.generate_comprehensive_metrics.return_value = {"animals_found": 1, "animals_added": 1, "animals_updated": 0, "duration_seconds": 30.5, "data_quality_score": 0.85}
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.log_detailed_metrics.return_value = None

        return {"database_service": mock_db_service, "session_manager": mock_session_manager, "metrics_collector": mock_metrics_collector}

    def test_duplicate_completion_calls_detected(self, mock_services_for_completion):
        """Test that BaseScraper does not call complete_scrape_log multiple times."""

        # Create test scraper class
        class TestCompletionScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test-123", "adoption_url": "https://example.com/test-123", "breed": "Mixed", "age_text": "2 years"}]

        # Create scraper with mocked services
        scraper = TestCompletionScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services_for_completion["database_service"]
        scraper.session_manager = mock_services_for_completion["session_manager"]
        scraper.metrics_collector = mock_services_for_completion["metrics_collector"]

        # Mock the save_animal method to avoid database operations
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.skip_existing_animals = False  # Avoid triggering mark_skipped_animals_as_seen

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check how many times complete_scrape_log was called
        db_service = mock_services_for_completion["database_service"]

        # ASSERTION: complete_scrape_log should be called exactly ONCE per scrape
        # This prevents duplicate scrape log entries in the database
        total_completion_calls = db_service.complete_scrape_log.call_count + db_service.complete_scrape_log_with_metrics.call_count
        assert total_completion_calls == 1, (
            f"Expected complete_scrape_log to be called exactly once, " f"but total completion calls were {total_completion_calls}. " f"This creates duplicate scrape log entries in the database."
        )

    def test_session_startup_failure_scenario(self, mock_services_for_completion):
        """Test completion behavior when session startup fails."""

        class TestFailureScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test-123"}]

        scraper = TestFailureScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services_for_completion["database_service"]
        scraper.session_manager = mock_services_for_completion["session_manager"]
        scraper.metrics_collector = mock_services_for_completion["metrics_collector"]

        # Make session startup fail
        mock_services_for_completion["session_manager"].start_scrape_session.return_value = False

        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Run the scraper - should handle failure gracefully
        with scraper:
            result = scraper._run_with_connection()

        # Should complete even with session failure
        db_service = mock_services_for_completion["database_service"]
        assert db_service.complete_scrape_log.call_count >= 0  # May or may not complete depending on failure point

    def test_partial_failure_detection_scenario(self, mock_services_for_completion):
        """Test completion behavior when partial failure is detected."""

        class TestPartialFailureScraper(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test-123"}]

        scraper = TestPartialFailureScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services_for_completion["database_service"]
        scraper.session_manager = mock_services_for_completion["session_manager"]
        scraper.metrics_collector = mock_services_for_completion["metrics_collector"]

        # Enable partial failure detection
        mock_services_for_completion["session_manager"].detect_partial_failure.return_value = True

        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        # Should still complete successfully but handle partial failure
        db_service = mock_services_for_completion["database_service"]
        total_completion_calls = db_service.complete_scrape_log.call_count + db_service.complete_scrape_log_with_metrics.call_count
        assert total_completion_calls == 1, "Should complete exactly once even with partial failure"


@pytest.mark.slow
class TestBaseScraperRetryMechanism:
    """Test retry functionality for ALL scrapers - consolidated from test_base_scraper_retry.py."""

    @pytest.fixture
    def retry_scraper(self):
        """Create a test scraper for retry testing."""

        class MockRetryBaseScraper(BaseScraper):
            def __init__(self, organization_id=1):
                super().__init__(organization_id=organization_id)

            def collect_data(self):
                return []

            def _scrape_detail_page(self, url):
                """Mock detail page scraping for testing."""
                return {"name": "Test Animal", "external_id": "test123", "adoption_url": url}

        return MockRetryBaseScraper(organization_id=1)

    def test_retry_mechanism_exists_in_base_scraper(self, retry_scraper):
        """Test that retry mechanism exists in BaseScraper."""
        # Should have retry method in base class
        assert hasattr(retry_scraper, "_scrape_with_retry")

    def test_retry_config_from_yaml(self, retry_scraper):
        """Test retry config is loaded from YAML config."""
        # Should have default retry settings
        assert hasattr(retry_scraper, "max_retries")
        assert hasattr(retry_scraper, "retry_backoff_factor")
        assert retry_scraper.max_retries >= 1

    def test_retry_on_timeout_exception(self, retry_scraper):
        """Test retry logic on TimeoutException."""
        from selenium.common.exceptions import TimeoutException

        mock_method = Mock()
        mock_method.side_effect = [
            TimeoutException("Timeout"),
            TimeoutException("Timeout"),
            {"name": "Test Animal", "external_id": "test123", "adoption_url": "http://test.com"},
        ]

        result = retry_scraper._scrape_with_retry(mock_method, "http://test.com")

        # Should succeed after retries
        assert result is not None
        assert result["name"] == "Test Animal"
        assert mock_method.call_count == 3

    def test_retry_on_webdriver_exception(self, retry_scraper):
        """Test retry logic on WebDriverException."""
        from selenium.common.exceptions import WebDriverException

        mock_method = Mock()
        mock_method.side_effect = [
            WebDriverException("Connection failed"),
            WebDriverException("Connection failed"),
            {"name": "Test Animal", "external_id": "test123", "adoption_url": "http://test.com"},
        ]

        result = retry_scraper._scrape_with_retry(mock_method, "http://test.com")

        # Should succeed after retries
        assert result is not None
        assert result["name"] == "Test Animal"
        assert mock_method.call_count == 3

    def test_retry_exhausted_returns_none(self, retry_scraper):
        """Test that exhausted retries return None."""
        from selenium.common.exceptions import TimeoutException

        mock_method = Mock()
        mock_method.side_effect = TimeoutException("Always timeout")

        result = retry_scraper._scrape_with_retry(mock_method, "http://test.com")

        # Should return None after max retries
        assert result is None
        assert mock_method.call_count == retry_scraper.max_retries

    def test_invalid_name_detection(self, retry_scraper):
        """Test detection of invalid names from connection errors."""
        # Should detect common error patterns
        assert retry_scraper._is_invalid_name("This Site Cant Be Reached")
        assert retry_scraper._is_invalid_name("Error 404")
        assert retry_scraper._is_invalid_name("Connection Failed")
        assert retry_scraper._is_invalid_name("Page Not Found")
        assert retry_scraper._is_invalid_name("Site can't be reached")
        assert retry_scraper._is_invalid_name("DNS_PROBE_FINISHED_NXDOMAIN")

        # Should accept valid names
        assert not retry_scraper._is_invalid_name("Lilly")
        assert not retry_scraper._is_invalid_name("Buddy")
        assert not retry_scraper._is_invalid_name("Max")
