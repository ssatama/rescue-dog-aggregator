import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime
from scrapers.base_scraper import BaseScraper


class TestBaseScraper:
    @pytest.fixture
    def mock_scraper(self):
        """Create a mock implementation of BaseScraper for testing."""

        class MockScraper(BaseScraper):
            def collect_data(self):
                return [
                    {
                        "name": "Test Dog",
                        "breed": "Labrador Retriever",
                        "age_text": "2 years",
                        "sex": "Male",
                        "primary_image_url": "https://example.com/dog1.jpg",
                        "adoption_url": "https://example.com/adopt/dog1",
                    },
                    {
                        "name": "Test Dog 2",
                        "breed": "Golden Mix",
                        "age_text": "6 months",
                        "sex": "Female",
                        "primary_image_url": "https://example.com/dog2.jpg",
                        "adoption_url": "https://example.com/adopt/dog2",
                    },
                ]

        # Create an instance with test organization ID
        return MockScraper(organization_id=1, organization_name="Test Organization")

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

    @patch("scrapers.base_scraper.detect")
    def test_detect_language(self, mock_detect, mock_scraper):
        """Test language detection functionality."""
        # Configure the mock
        mock_detect.return_value = "en"

        # Test language detection
        result = mock_scraper.detect_language("This is English text")

        # Verify detect was called and result is correct
        mock_detect.assert_called_once_with("This is English text")
        assert result == "en"

        # Test short text fallback to English
        mock_detect.reset_mock()
        result = mock_scraper.detect_language("Hi")
        assert result == "en"  # Should default to English for very short text
        assert not mock_detect.called  # Shouldn't call detect for short text

        # Test None handling
        result = mock_scraper.detect_language(None)
        assert result == "en"  # Should default to English

    @patch.object(BaseScraper, "connect_to_database")
    @patch.object(BaseScraper, "start_scrape_log")
    @patch.object(BaseScraper, "save_animal")
    @patch.object(BaseScraper, "complete_scrape_log")
    def test_run_success(
        self, mock_complete_log, mock_save, mock_start_log, mock_connect, mock_scraper
    ):
        """Test successful run of the scraper."""
        # Configure mocks
        mock_connect.return_value = True
        mock_start_log.return_value = True
        mock_save.side_effect = [
            (1, "added"),
            (2, "added"),
        ]  # ID and action for each dog
        mock_complete_log.return_value = True

        # Set a mock connection
        mock_scraper.conn = Mock()

        # Run the scraper
        result = mock_scraper.run()

        # Verify methods were called
        mock_connect.assert_called_once()
        mock_start_log.assert_called_once()
        assert mock_save.call_count == 2  # Two test dogs
        mock_complete_log.assert_called_once()

        # Check complete_scrape_log was called with correct parameters
        expected_args = {
            "status": "success",
            "animals_found": 2,
            "animals_added": 2,
            "animals_updated": 0,
        }
        for key, value in expected_args.items():
            assert mock_complete_log.call_args[1][key] == value

        # Verify result
        assert result is True

    @patch.object(BaseScraper, "connect_to_database")
    def test_run_database_connection_failure(self, mock_connect, mock_scraper):
        """Test graceful handling of database connection failure."""
        # Configure mock to simulate connection failure
        mock_connect.return_value = False

        # Run the scraper
        result = mock_scraper.run()

        # Verify result
        assert result is False

    @patch("scrapers.base_scraper.json")
    def test_save_animal_new(self, mock_json, mock_scraper):
        """Test saving a new animal to the database."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor

        # Configure cursor mock for checking existing and then insert
        mock_cursor.fetchone.side_effect = [
            None,
            [1],
        ]  # First None (no existing), then return ID 1

        # Test data
        animal_data = {
            "name": "Test Dog",
            "breed": "Labrador Retriever",
            "age_text": "2 years",
            "sex": "Male",
            "primary_image_url": "http://example.com/image.jpg",
            "adoption_url": "http://example.com/adopt",
            "status": "available",
        }

        # Mock JSON dumps
        mock_json.dumps.return_value = "{}"

        # Execute method
        with patch.object(BaseScraper, "detect_language", return_value="en"):
            animal_id, action = mock_scraper.save_animal(animal_data)

        # Verify cursor was called for insert
        assert mock_cursor.execute.call_count == 2  # Check + Insert
        mock_scraper.conn.commit.assert_called_once()

        # Verify return values
        assert animal_id == 1
        assert action == "added"

    @patch("scrapers.base_scraper.json")
    def test_save_animal_update(self, mock_json, mock_scraper):
        """Test updating an existing animal in the database."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor

        # Configure cursor mock to find existing animal
        mock_cursor.fetchone.return_value = [5]  # Existing ID 5

        # Test data
        animal_data = {
            "name": "Test Dog",
            "breed": "Labrador Retriever",
            "age_text": "2 years",
            "sex": "Male",
            "primary_image_url": "http://example.com/image.jpg",
            "adoption_url": "http://example.com/adopt",
            "status": "available",
        }

        # Mock JSON dumps
        mock_json.dumps.return_value = "{}"

        # Execute method
        with patch.object(BaseScraper, "detect_language", return_value="en"):
            animal_id, action = mock_scraper.save_animal(animal_data)

        # Verify cursor was called for update
        assert mock_cursor.execute.call_count == 2  # Check + Update
        mock_scraper.conn.commit.assert_called_once()

        # Verify return values
        assert animal_id == 5
        assert action == "updated"

    def test_save_animal_images(self, mock_scraper):
        """Test saving animal images to the database."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor

        # Test data
        animal_id = 1
        image_urls = [
            "http://example.com/image1.jpg",
            "http://example.com/image2.jpg",
            "http://example.com/image3.jpg",
        ]

        # Execute method
        result = mock_scraper.save_animal_images(animal_id, image_urls)

        # Verify cursor was called correctly
        assert mock_cursor.execute.call_count == 4  # 1 delete + 3 inserts
        mock_scraper.conn.commit.assert_called_once()

        # Verify result
        assert result is True

    def test_start_scrape_log(self, mock_scraper):
        """Test creating a scrape log entry."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor

        # Configure cursor to return log ID
        mock_cursor.fetchone.return_value = [10]

        # Execute method
        result = mock_scraper.start_scrape_log()

        # Verify cursor was called correctly
        mock_cursor.execute.assert_called_once()
        mock_scraper.conn.commit.assert_called_once()

        # Verify result and scrape_log_id
        assert result is True
        assert mock_scraper.scrape_log_id == 10

    def test_complete_scrape_log(self, mock_scraper):
        """Test updating a scrape log entry with completion info."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor

        # Set scrape_log_id
        mock_scraper.scrape_log_id = 10

        # Execute method
        result = mock_scraper.complete_scrape_log(
            status="success", animals_found=10, animals_added=5, animals_updated=3
        )

        # Verify cursor was called correctly
        mock_cursor.execute.assert_called_once()
        mock_scraper.conn.commit.assert_called_once()

        # Verify result
        assert result is True
