"""Test BaseScraper's protection against dogs without images."""

from unittest.mock import Mock

from scrapers.base_scraper import BaseScraper
from services.progress_tracker import ProgressTracker


class TestableBaseScraper(BaseScraper):
    """Concrete implementation of BaseScraper for testing."""

    def collect_data(self):
        """Not needed for this test."""
        return []

    def get_organization_name(self):
        """Return test organization name."""
        return "Test Organization"


class TestBaseScraperImageValidation:
    """Test that BaseScraper properly rejects animals without images."""

    def test_process_animals_data_skips_dogs_without_images(self):
        """Test that _process_animals_data skips animals with empty image URLs."""
        # Create scraper instance with mocked services
        scraper = TestableBaseScraper(
            organization_id=1,
            database_service=Mock(),
            image_processing_service=None,
            session_manager=Mock(),
            metrics_collector=Mock(),
        )

        # Mock the save_animal method to track calls
        save_animal_mock = Mock(return_value=(1, "added"))
        scraper.save_animal = save_animal_mock

        # Mock mark_animal_as_seen
        scraper.mark_animal_as_seen = Mock()

        # Mock logger to verify warnings
        scraper.logger = Mock()

        # Initialize progress_tracker (normally done in _run_with_connection)
        scraper.progress_tracker = ProgressTracker(total_items=4, logger=scraper.logger, config={})

        # Create test data with mix of valid and invalid animals
        animals_data = [
            {
                "name": "Valid Dog 1",
                "external_id": "test-1",
                "primary_image_url": "https://example.com/dog1.jpg",
                "adoption_url": "https://example.com/adopt/dog1",
                "description": "A good dog",
            },
            {
                "name": "Invalid Dog - Empty String",
                "external_id": "test-2",
                "primary_image_url": "",  # Empty string - should be rejected
                "adoption_url": "https://example.com/adopt/dog2",
                "description": "No image",
            },
            {
                "name": "Valid Dog 2",
                "external_id": "test-3",
                "primary_image_url": "https://example.com/dog2.jpg",
                "adoption_url": "https://example.com/adopt/dog3",
                "description": "Another good dog",
            },
            {
                "name": "Invalid Dog - None",
                "external_id": "test-4",
                "primary_image_url": None,  # None - should be rejected (no valid image)
                "adoption_url": "https://example.com/adopt/dog4",
                "description": "No image field",
            },
        ]

        # Process animals
        _stats = scraper._process_animals_data(animals_data)

        # Verify that save_animal was called only for valid animals
        # Both empty string and None should be rejected
        assert save_animal_mock.call_count == 2  # Valid Dog 1 and Valid Dog 2 only

        # Verify warning was logged for invalid animal
        warning_calls = [call for call in scraper.logger.warning.call_args_list if "Invalid Dog - Empty String" in str(call)]
        assert len(warning_calls) == 1, "Should have logged warning for dog with empty image URL"

    def test_validate_animal_data_rejects_empty_image_urls(self):
        """Test that _validate_animal_data correctly rejects empty image URLs."""
        scraper = TestableBaseScraper(
            organization_id=1,
            database_service=Mock(),
            image_processing_service=None,
            session_manager=Mock(),
            metrics_collector=Mock(),
        )

        # Test with empty string image URL
        invalid_animal = {
            "name": "Test Dog",
            "external_id": "test-1",
            "primary_image_url": "",
            "adoption_url": "https://example.com/adopt/test1",
            "description": "Test description",
        }

        # Should reject empty string
        assert not scraper._validate_animal_data(invalid_animal)

        # Test with valid image URL
        valid_animal = {
            "name": "Test Dog",
            "external_id": "test-2",
            "primary_image_url": "https://example.com/dog.jpg",
            "adoption_url": "https://example.com/adopt/test2",
            "description": "Test description",
        }

        # Should accept valid URL
        assert scraper._validate_animal_data(valid_animal)

        # Test with None (no valid image)
        none_animal = {
            "name": "Test Dog",
            "external_id": "test-3",
            "primary_image_url": None,
            "adoption_url": "https://example.com/adopt/test3",
            "description": "Test description",
        }

        # Should reject None (no valid image URL)
        assert not scraper._validate_animal_data(none_animal)

    def test_integration_no_dogs_saved_with_empty_images(self):
        """Integration test ensuring no dogs with empty images reach the database."""
        # Create scraper with mock database service
        mock_db = Mock()
        mock_db.create_scrape_log = Mock(return_value=1)
        mock_db.complete_scrape_log = Mock(return_value=True)

        scraper = TestableBaseScraper(
            organization_id=1,
            database_service=mock_db,
            image_processing_service=None,
            session_manager=Mock(),
            metrics_collector=Mock(),
        )

        # Mock methods needed for save_animal
        scraper.get_existing_animal = Mock(return_value=None)
        scraper.create_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock()
        scraper.logger = Mock()

        # Initialize progress_tracker (normally done in _run_with_connection)
        scraper.progress_tracker = ProgressTracker(total_items=1, logger=scraper.logger, config={})

        # Test data with empty image
        animals_data = [
            {
                "name": "Colonel",  # The problematic dog
                "external_id": "dt-colonel",
                "primary_image_url": "",  # Empty string that caused the issue
                "adoption_url": "https://example.com/adopt/colonel",
                "description": "Italian Corso",
            }
        ]

        # Process the data
        stats = scraper._process_animals_data(animals_data)

        # Verify create_animal was never called (dog was rejected)
        scraper.create_animal.assert_not_called()

        # Verify stats show no animals were processed
        assert stats["animals_added"] == 0
        assert stats["animals_updated"] == 0

    def test_missing_adoption_url_rejected(self):
        """Test that animals without adoption_url are rejected."""
        scraper = TestableBaseScraper(
            organization_id=1,
            database_service=Mock(),
            image_processing_service=None,
            session_manager=Mock(),
            metrics_collector=Mock(),
        )

        # Test data missing adoption_url
        invalid_animal = {
            "name": "Test Dog",
            "external_id": "test-1",
            "primary_image_url": "https://example.com/dog.jpg",
            # No adoption_url
            "description": "Test description",
        }

        # Should reject due to missing required field
        assert not scraper._validate_animal_data(invalid_animal)
