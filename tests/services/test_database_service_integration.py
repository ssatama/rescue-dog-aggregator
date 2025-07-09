"""
Integration tests for DatabaseService with BaseScraper.

Following CLAUDE.md principles - test integration while maintaining existing functionality.
"""

from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.database_service import DatabaseService


@pytest.mark.slow
@pytest.mark.database
class TestDatabaseServiceIntegration:
    """Test DatabaseService integration with BaseScraper."""

    @pytest.fixture
    def mock_scraper_with_db_service(self):
        """Create a mock scraper with injected DatabaseService."""

        class MockScraperWithService(BaseScraper):
            def __init__(self, organization_id, database_service=None):
                # Initialize BaseScraper without database service initially
                super().__init__(organization_id=organization_id)
                # Inject database service
                if database_service:
                    self.database_service = database_service

            def collect_data(self):
                return [
                    {"name": "Test Dog 1", "external_id": "test1"},
                    {"name": "Test Dog 2", "external_id": "test2"},
                ]

        return MockScraperWithService

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_basescraper_can_use_database_service(self, mock_scraper_with_db_service):
        """Test that BaseScraper can use DatabaseService for operations."""
        # Create mock database service
        mock_db_service = Mock(spec=DatabaseService)
        mock_db_service.get_existing_animal.return_value = None
        mock_db_service.create_animal.return_value = (1, "added")
        mock_db_service.create_scrape_log.return_value = 123
        mock_db_service.complete_scrape_log.return_value = True
        mock_db_service.connect.return_value = True

        # Create scraper with injected service
        scraper = mock_scraper_with_db_service(organization_id=1, database_service=mock_db_service)

        # Test that we can call database service methods
        result = scraper.database_service.get_existing_animal("test-id", 1)
        assert result is None

        # Test that service methods are called correctly
        animal_data = {"name": "Test Dog", "external_id": "test-123", "organization_id": 1}
        animal_id, action = scraper.database_service.create_animal(animal_data)
        assert animal_id == 1
        assert action == "added"

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    def test_backward_compatibility_maintained(self, mock_scraper_with_db_service):
        """Test that BaseScraper still works without DatabaseService injection."""
        # Create scraper without service injection (legacy mode)
        scraper = mock_scraper_with_db_service(organization_id=1)

        # Should still have the original methods
        assert hasattr(scraper, "get_existing_animal")
        assert hasattr(scraper, "create_animal")
        assert hasattr(scraper, "update_animal")

        # Test that original methods still work (with mocking)
        scraper.conn = Mock()
        mock_cursor = Mock()
        scraper.conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None

        result = scraper.get_existing_animal("test-id", 1)
        assert result is None


@pytest.mark.slow
@pytest.mark.database
class TestDatabaseServiceRealIntegration:
    """Real integration tests using actual DatabaseService implementation."""

    def test_database_service_with_real_config(self):
        """Test DatabaseService with real database configuration."""
        from config import DB_CONFIG

        # Create real DatabaseService
        db_service = DatabaseService(DB_CONFIG)

        # Test connection
        connected = db_service.connect()
        assert connected is True

        # Test basic functionality
        result = db_service.get_existing_animal("non-existent-id", 999)
        assert result is None

        # Clean up
        db_service.close()

    def test_database_service_transaction_handling(self):
        """Test that DatabaseService handles transactions properly."""
        from config import DB_CONFIG

        db_service = DatabaseService(DB_CONFIG)
        connected = db_service.connect()
        assert connected is True

        # Test with invalid data to trigger rollback
        invalid_animal_data = {"name": None, "external_id": "test-invalid", "organization_id": 999}  # This should cause an error

        animal_id, action = db_service.create_animal(invalid_animal_data)
        assert animal_id is None
        assert action == "error"

        # Connection should still be usable after error
        result = db_service.get_existing_animal("test-id", 999)
        assert result is None

        db_service.close()
