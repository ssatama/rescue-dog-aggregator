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
    def test_save_animal_delegates_to_database_service_for_new_animal(self, mock_scraper_with_service):
        """Test that save_animal uses injected DatabaseService to create new animals."""
        mock_db_service = Mock(spec=DatabaseService)
        mock_db_service.get_existing_animal.return_value = None
        mock_db_service.create_animal.return_value = (123, "added")

        scraper = mock_scraper_with_service(organization_id=1, database_service=mock_db_service)
        scraper.conn = Mock()

        animal_data = {
            "name": "Test Dog",
            "external_id": "test-org1-123",
            "organization_id": 1,
            "primary_image_url": "https://example.com/dog.jpg",
            "adoption_url": "https://example.com/adopt/123",
        }

        animal_id, action = scraper.save_animal(animal_data)

        mock_db_service.get_existing_animal.assert_called_once_with("test-org1-123", 1)
        mock_db_service.create_animal.assert_called_once()
        assert animal_id == 123
        assert action == "added"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_save_animal_delegates_to_database_service_for_existing_animal(self, mock_scraper_with_service):
        """Test that save_animal uses injected DatabaseService to update existing animals."""
        mock_db_service = Mock(spec=DatabaseService)
        mock_db_service.get_existing_animal.return_value = (456, "Old Dog", "2024-01-01")
        mock_db_service.update_animal.return_value = (456, "updated")

        scraper = mock_scraper_with_service(organization_id=1, database_service=mock_db_service)
        scraper.conn = Mock()

        animal_data = {
            "name": "Updated Dog",
            "external_id": "test-org1-456",
            "organization_id": 1,
            "primary_image_url": "https://example.com/dog.jpg",
            "adoption_url": "https://example.com/adopt/456",
        }

        animal_id, action = scraper.save_animal(animal_data)

        mock_db_service.get_existing_animal.assert_called_once_with("test-org1-456", 1)
        mock_db_service.update_animal.assert_called_once()
        call_args = mock_db_service.update_animal.call_args[0]
        assert call_args[0] == 456
        assert call_args[1]["name"] == "Updated Dog"
        assert call_args[1]["external_id"] == "test-org1-456"
        assert animal_id == 456
        assert action == "updated"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_save_animal_returns_error_without_database_service(self, mock_scraper_with_service):
        """Test that save_animal returns error tuple when no DatabaseService is injected."""
        scraper = mock_scraper_with_service(organization_id=1)

        animal_data = {
            "name": "Test Dog",
            "external_id": "test-org1-789",
            "organization_id": 1,
        }

        animal_id, action = scraper.save_animal(animal_data)

        assert animal_id is None
        assert action == "error"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_save_animal_logs_service_unavailable_without_database_service(self, mock_scraper_with_service, caplog):
        """Test that save_animal logs warning when no DatabaseService is available."""
        scraper = mock_scraper_with_service(organization_id=1)

        animal_data = {"name": "Test Dog", "external_id": "test-org1-abc"}

        scraper.save_animal(animal_data)

        assert "DatabaseService" in caplog.text


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
        mock_db_service = Mock(spec=DatabaseService)
        mock_db_service.get_existing_animal.return_value = None
        mock_db_service.create_animal.return_value = (123, "added")
        mock_db_service.update_animal.return_value = (123, "updated")
        mock_db_service.create_scrape_log.return_value = 456
        mock_db_service.complete_scrape_log.return_value = True

        scraper = mock_scraper_with_service(organization_id=1, database_service=mock_db_service)
        scraper.conn = Mock()

        # Test save_animal for new animal (delegates to get_existing_animal + create_animal)
        animal_data = {
            "name": "Test Dog",
            "external_id": "test-org1-456",
            "organization_id": 1,
            "primary_image_url": "https://example.com/dog.jpg",
            "adoption_url": "https://example.com/adopt/456",
        }
        animal_id, action = scraper.save_animal(animal_data)
        mock_db_service.get_existing_animal.assert_called_with("test-org1-456", 1)
        mock_db_service.create_animal.assert_called_once()
        assert animal_id == 123
        assert action == "added"

        # Test save_animal for existing animal (delegates to get_existing_animal + update_animal)
        mock_db_service.get_existing_animal.return_value = (123, "Test Dog", "2024-01-01")
        animal_id, action = scraper.save_animal(animal_data)
        mock_db_service.update_animal.assert_called_once()
        update_call_args = mock_db_service.update_animal.call_args[0]
        assert update_call_args[0] == 123
        assert update_call_args[1]["name"] == "Test Dog"
        assert animal_id == 123
        assert action == "updated"

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
        scraper = mock_scraper_with_service(organization_id=1)

        # Test save_animal returns error without database service
        animal_data = {
            "name": "Test Dog",
            "external_id": "test-org1-456",
            "organization_id": 1,
        }
        animal_id, action = scraper.save_animal(animal_data)
        assert animal_id is None
        assert action == "error"

        # Test start_scrape_log returns True to continue scraping without logging
        result = scraper.start_scrape_log()
        assert result is True

        # Test complete_scrape_log returns True to continue scraping without logging
        result = scraper.complete_scrape_log("completed", 10, 5, 3, None)
        assert result is True

        # Verify service methods are not used
        assert scraper.database_service is None
