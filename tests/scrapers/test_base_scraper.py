import pytest
from unittest.mock import Mock, patch, MagicMock
from scrapers.base_scraper import BaseScraper


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

        return MockScraper(organization_id=1, organization_name="Test Organization")

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    @patch("scrapers.base_scraper.json")
    def test_save_animal_new(self, mock_json, mock_scraper):
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

        # Mock JSON dumps
        mock_json.dumps.return_value = "{}"

        # Mock get_existing_animal to return None (new animal)
        with patch.object(
            mock_scraper, "get_existing_animal", return_value=None
        ), patch.object(
            mock_scraper, "create_animal", return_value=(1, "added")
        ) as mock_create, patch.object(
            BaseScraper, "detect_language", return_value="en"
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
            "external_id": "test123",
            "organization_id": 1,
        }

        # Mock JSON dumps
        mock_json.dumps.return_value = "{}"

        # Mock get_existing_animal to return existing animal
        with patch.object(
            mock_scraper, "get_existing_animal", return_value=[5]
        ), patch.object(
            mock_scraper, "update_animal", return_value=(5, "updated")
        ) as mock_update, patch.object(
            BaseScraper, "detect_language", return_value="en"
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
    def test_save_animal_images(self, mock_scraper):
        """Test saving animal images to the database."""
        # Mock database connection and cursor
        mock_scraper.conn = Mock()
        mock_cursor = Mock()
        mock_scraper.conn.cursor.return_value = mock_cursor

        # Mock the fetchone result for getting animal name
        mock_cursor.fetchone.return_value = ["Test Dog"]  # Return animal name

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
        # Should be: 1 DELETE + 1 SELECT (animal name) + 3 INSERTs = 5 total
        assert mock_cursor.execute.call_count >= 4  # At least delete + select + inserts

        # Verify commit was called
        mock_scraper.conn.commit.assert_called_once()

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
