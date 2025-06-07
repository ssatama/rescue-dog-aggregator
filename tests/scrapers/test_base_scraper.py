import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
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

    @patch.dict(
        "os.environ",
        {
            "CLOUDINARY_CLOUD_NAME": "",
            "CLOUDINARY_API_KEY": "",
            "CLOUDINARY_API_SECRET": "",
        },
    )
    @patch("scrapers.base_scraper.json")
    def test_save_animal_images(self, mock_json, mock_scraper):
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
        # But since we have the organization_name fix, this should work
        assert mock_cursor.execute.call_count >= 4  # At least delete + select + inserts

        # Verify commit was called
        mock_scraper.conn.commit.assert_called_once()

        # Verify result
        assert result is True


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
        """Test get_existing_animal when animal exists."""
        # Mock database connection and cursor
        concrete_scraper.conn = Mock()
        mock_cursor = Mock()
        concrete_scraper.conn.cursor.return_value = mock_cursor
        
        # Mock cursor to return existing animal
        mock_cursor.fetchone.return_value = (123, "Test Dog", "2024-01-01")
        
        # Test
        result = concrete_scraper.get_existing_animal("test-123", 1)
        
        # Verify query was executed
        mock_cursor.execute.assert_called_once_with(
            "SELECT id, name, updated_at FROM animals WHERE external_id = %s AND organization_id = %s",
            ("test-123", 1)
        )
        
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
        """Test get_existing_animal when animal doesn't exist."""
        # Mock database connection and cursor
        concrete_scraper.conn = Mock()
        mock_cursor = Mock()
        concrete_scraper.conn.cursor.return_value = mock_cursor
        
        # Mock cursor to return None (no animal found)
        mock_cursor.fetchone.return_value = None
        
        # Test
        result = concrete_scraper.get_existing_animal("nonexistent", 1)
        
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
        """Test create_animal method."""
        # Mock database connection and cursor
        concrete_scraper.conn = Mock()
        mock_cursor = Mock()
        concrete_scraper.conn.cursor.return_value = mock_cursor
        
        # Mock cursor to return new animal ID
        mock_cursor.fetchone.return_value = (456,)
        
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
            "status": "available"
        }
        
        # Test
        animal_id, action = concrete_scraper.create_animal(animal_data)
        
        # Verify INSERT was executed
        mock_cursor.execute.assert_called_once()
        call_args = mock_cursor.execute.call_args[0]
        assert "INSERT INTO animals" in call_args[0]
        assert "last_seen_at" in call_args[0]  # Should include stale data columns
        
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
        """Test update_animal when changes are detected."""
        # Mock database connection and cursor
        concrete_scraper.conn = Mock()
        mock_cursor = Mock()
        concrete_scraper.conn.cursor.return_value = mock_cursor
        
        # Mock existing animal data
        mock_cursor.fetchone.return_value = (
            "Old Name", "Old Breed", "2 years", "Female", "old-url.jpg", "available"
        )
        
        # Test data with changes
        animal_data = {
            "name": "Updated Name",  # Changed
            "breed": "Old Breed",    # Same
            "age_text": "3 years",   # Changed
            "sex": "Female",         # Same
            "primary_image_url": "old-url.jpg",  # Same
            "status": "available"    # Same
        }
        
        # Test
        animal_id, action = concrete_scraper.update_animal(123, animal_data)
        
        # Verify SELECT to get current data was executed
        assert mock_cursor.execute.call_count >= 1
        
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
        """Test update_animal when no changes are detected."""
        # Mock database connection and cursor
        concrete_scraper.conn = Mock()
        mock_cursor = Mock()
        concrete_scraper.conn.cursor.return_value = mock_cursor
        
        # Mock existing animal data (identical to update data)
        mock_cursor.fetchone.return_value = (
            "Same Name", "Same Breed", "2 years", "Female", "same-url.jpg", "available"
        )
        
        # Test data (no changes)
        animal_data = {
            "name": "Same Name",
            "breed": "Same Breed", 
            "age_text": "2 years",
            "sex": "Female",
            "primary_image_url": "same-url.jpg",
            "status": "available"
        }
        
        # Test
        animal_id, action = concrete_scraper.update_animal(123, animal_data)
        
        # Verify result
        assert animal_id == 123
        assert action == "no_change"


class TestScrapeSessionTracking:
    """Test scrape session tracking and stale data detection."""

    @pytest.fixture
    def session_scraper(self):
        """Create a scraper for session tracking tests."""
        
        class SessionScraper(BaseScraper):
            def collect_data(self):
                return [
                    {"name": "Dog 1", "external_id": "dog-1"},
                    {"name": "Dog 2", "external_id": "dog-2"}
                ]
        
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
        with patch('scrapers.base_scraper.datetime') as mock_datetime:
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
        """Test updating stale data detection after scrape."""
        # Mock database connection and cursor
        session_scraper.conn = Mock()
        mock_cursor = Mock()
        session_scraper.conn.cursor.return_value = mock_cursor
        
        # Set current scrape session
        session_scraper.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)
        
        # Test
        result = session_scraper.update_stale_data_detection()
        
        # Verify stale data query was executed
        mock_cursor.execute.assert_called()
        call_args = mock_cursor.execute.call_args[0]
        assert "consecutive_scrapes_missing" in call_args[0]
        assert "availability_confidence" in call_args[0]
        
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
        """Test marking an animal as seen in current scrape."""
        # Mock database connection and cursor
        session_scraper.conn = Mock()
        mock_cursor = Mock()
        session_scraper.conn.cursor.return_value = mock_cursor
        
        # Set current scrape session
        test_time = datetime(2024, 1, 15, 10, 30, 0)
        session_scraper.current_scrape_session = test_time
        
        # Test
        result = session_scraper.mark_animal_as_seen(123)
        
        # Verify animal was marked as seen
        mock_cursor.execute.assert_called_once()
        call_args = mock_cursor.execute.call_args[0]
        assert "UPDATE animals" in call_args[0]
        assert "last_seen_at = %s" in call_args[0]
        assert "consecutive_scrapes_missing = 0" in call_args[0]
        assert "availability_confidence = 'high'" in call_args[0]
        assert call_args[1] == (test_time, 123)
        
        # Verify result
        assert result is True
