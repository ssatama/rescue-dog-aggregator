"""
Test BaseScraper integration with DatabaseService.

Consolidates all BaseScraper + DatabaseService integration tests:
- test_basescraper_with_database_service.py
- test_basescraper_database_integration_complete.py
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.database_service import DatabaseService


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperWithDatabaseService:
    """Test BaseScraper using injected DatabaseService."""

    @pytest.fixture
    def mock_scraper_with_service(self):
        """Create a mock scraper that uses DatabaseService."""

        class MockScraperWithService(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test1"}]

        return MockScraperWithService

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_uses_injected_database_service(self, mock_scraper_with_service):
        """Test that BaseScraper uses injected DatabaseService for database operations."""
        # Create mock database service
        mock_db_service = Mock(spec=DatabaseService)
        mock_db_service.get_existing_animal.return_value = None
        mock_db_service.create_animal.return_value = (123, "added")

        # Create scraper with injected service
        scraper = mock_scraper_with_service(organization_id=1, database_service=mock_db_service)

        # Test get_existing_animal uses service
        result = scraper.get_existing_animal("test-123", 1)

        # Verify service was called
        mock_db_service.get_existing_animal.assert_called_once_with("test-123", 1)
        assert result is None

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_create_animal_uses_service(self, mock_scraper_with_service):
        """Test that create_animal uses injected DatabaseService."""
        mock_db_service = Mock(spec=DatabaseService)
        mock_db_service.create_animal.return_value = (456, "added")

        scraper = mock_scraper_with_service(organization_id=1, database_service=mock_db_service)

        animal_data = {
            "name": "Test Dog",
            "external_id": "test-456",
            "organization_id": 1,
        }

        result = scraper.create_animal(animal_data)

        # Verify service was called with correct data
        mock_db_service.create_animal.assert_called_once_with(animal_data)
        assert result == (456, "added")

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_falls_back_to_legacy_without_service(self, mock_scraper_with_service):
        """Test that BaseScraper returns appropriate defaults without DatabaseService."""
        # Create scraper without service injection
        scraper = mock_scraper_with_service(organization_id=1)

        # Mock legacy database connection
        scraper.conn = Mock()
        mock_cursor = Mock()
        scraper.conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (789, "Legacy Dog", "2024-01-01")

        # Should return None and log service unavailable
        result = scraper.get_existing_animal("legacy-123", 1)

        # Verify no database service available - should return None
        assert result is None

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_service_needs_connection_established(self, mock_scraper_with_service):
        """Test that DatabaseService needs connection established for operations."""
        from config import DB_CONFIG

        # Create real DatabaseService (without connection)
        db_service = DatabaseService(DB_CONFIG)

        scraper = mock_scraper_with_service(organization_id=1, database_service=db_service)

        # Should handle no connection gracefully
        result = scraper.get_existing_animal("test-no-conn", 1)
        assert result is None  # Should return None when no connection

        # Establish connection and test again
        connected = db_service.connect()
        assert connected is True

        # Now should work
        result = scraper.get_existing_animal("test-with-conn", 999)  # Non-existent org
        assert result is None  # Should return None for non-existent animal

        db_service.close()


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperCompleteIntegration:
    """Test that all BaseScraper database methods use DatabaseService when available.

    Consolidated from test_basescraper_database_integration_complete.py
    """

    @pytest.fixture
    def mock_scraper_with_service(self):
        """Create a mock scraper that uses DatabaseService."""

        class MockScraperWithService(BaseScraper):
            def collect_data(self):
                return [{"name": "Test Dog", "external_id": "test1"}]

        return MockScraperWithService

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_all_database_methods_use_service(self, mock_scraper_with_service):
        """Test that all database methods use injected DatabaseService."""
        # Create mock database service
        mock_db_service = Mock(spec=DatabaseService)
        mock_db_service.get_existing_animal.return_value = None
        mock_db_service.create_animal.return_value = (123, "added")
        mock_db_service.update_animal.return_value = (123, "updated")
        mock_db_service.create_scrape_log.return_value = 456
        mock_db_service.complete_scrape_log.return_value = True

        # Create scraper with injected service
        scraper = mock_scraper_with_service(organization_id=1, database_service=mock_db_service)

        # Test get_existing_animal uses service
        result = scraper.get_existing_animal("test-123", 1)
        mock_db_service.get_existing_animal.assert_called_with("test-123", 1)
        assert result is None

        # Test create_animal uses service
        animal_data = {
            "name": "Test Dog",
            "external_id": "test-456",
            "organization_id": 1,
        }
        result = scraper.create_animal(animal_data)
        mock_db_service.create_animal.assert_called_with(animal_data)
        assert result == (123, "added")

        # Test update_animal uses service
        result = scraper.update_animal(123, animal_data)
        mock_db_service.update_animal.assert_called_with(123, animal_data)
        assert result == (123, "updated")

        # Test start_scrape_log uses service
        result = scraper.start_scrape_log()
        mock_db_service.create_scrape_log.assert_called_with(1)
        assert result is True
        assert scraper.scrape_log_id == 456

        # Test complete_scrape_log uses service
        result = scraper.complete_scrape_log("completed", 10, 5, 3, None)
        mock_db_service.complete_scrape_log.assert_called_with(456, "completed", 10, 5, 3, None)
        assert result is True

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_legacy_fallback_without_service(self, mock_scraper_with_service):
        """Test that all methods return appropriate defaults without DatabaseService."""
        # Create scraper without service injection
        scraper = mock_scraper_with_service(organization_id=1)

        # Mock legacy database connection
        scraper.conn = Mock()
        mock_cursor = Mock()
        scraper.conn.cursor.return_value = mock_cursor

        # Test fallback behavior for get_existing_animal - should return None and log service unavailable
        result = scraper.get_existing_animal("legacy-123", 1)
        assert result is None

        # Test fallback behavior for create_animal - should return None, "error" and log service unavailable
        animal_data = {
            "name": "Test Dog",
            "external_id": "test-456",
            "organization_id": 1,
        }
        result = scraper.create_animal(animal_data)
        assert result == (None, "error")

        # Test fallback behavior for update_animal - should return None, "error" and log service unavailable
        result = scraper.update_animal(123, animal_data)
        assert result == (None, "error")

        # Test fallback behavior for start_scrape_log - should return True and log service unavailable
        result = scraper.start_scrape_log()
        assert result is True  # Returns True to continue scraping without logging

        # Test fallback behavior for complete_scrape_log - should return True and log service unavailable
        result = scraper.complete_scrape_log("completed", 10, 5, 3, None)
        assert result is True  # Returns True to continue scraping without logging

        # Verify service methods are not used
        assert scraper.database_service is None
