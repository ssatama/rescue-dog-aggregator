"""
Test complete DatabaseService integration with BaseScraper.

Verifies that all database methods use DatabaseService when injected.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.database_service import DatabaseService


@pytest.mark.slow
@pytest.mark.database
class TestBaseScraperCompleteIntegration:
    """Test that all BaseScraper database methods use DatabaseService when available."""

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
        animal_data = {"name": "Test Dog", "external_id": "test-456", "organization_id": 1}
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
        animal_data = {"name": "Test Dog", "external_id": "test-456", "organization_id": 1}
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
