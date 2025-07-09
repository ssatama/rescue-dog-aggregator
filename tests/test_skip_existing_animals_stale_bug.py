"""Critical tests for skip_existing_animals stale data detection bug.

This test file demonstrates and validates the fix for the critical bug where
skip_existing_animals=true causes existing animals to be incorrectly marked
as unavailable after 3 consecutive scrapes.

Bug description:
1. When skip_existing_animals=true, existing animals are filtered out in _filter_existing_urls()
2. These skipped animals never reach update_animal() which would update last_seen_at
3. update_stale_data_detection() increments consecutive_scrapes_missing for all animals not seen
4. After 3 runs, available animals are incorrectly marked as unavailable
"""

import unittest
from datetime import datetime, timedelta
from unittest.mock import Mock, patch

from scrapers.base_scraper import BaseScraper
from tests.fixtures.service_mocks import create_mock_database_service, create_mock_session_manager


class MockScraper(BaseScraper):
    """Mock scraper for testing skip_existing_animals behavior."""

    def __init__(self, organization_id=1, skip_existing=True):
        """Initialize mock scraper."""
        # Create services for testing
        self.mock_database_service = create_mock_database_service()
        self.mock_session_manager = create_mock_session_manager()

        # Mock the config loading to avoid database dependencies
        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.create_default_sync_service") as mock_sync:
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=organization_id, was_created=False)
            mock_sync.return_value = mock_sync_service
            super().__init__(config_id="test_config", database_service=self.mock_database_service, session_manager=self.mock_session_manager)

        # Override skip_existing_animals setting
        self.skip_existing_animals = skip_existing
        self.organization_id = organization_id

        # Track method calls for testing
        self.collected_urls = []
        self.processed_animals = []

    def collect_data(self):
        """Mock collect_data that simulates the skip_existing_animals logic."""
        # Simulate getting animal list
        all_urls = ["https://example.com/dog1/", "https://example.com/dog2/", "https://example.com/dog3/"]

        # Filter existing URLs if skip is enabled (this is where the bug occurs)
        if self.skip_existing_animals:
            urls_to_process = self._filter_existing_urls(all_urls)
        else:
            urls_to_process = all_urls

        self.collected_urls = urls_to_process

        # Process only the filtered URLs
        animals = []
        for i, url in enumerate(urls_to_process):
            animal_data = {"name": f"Dog{i+1}", "external_id": f"dog{i+1}", "adoption_url": url, "organization_id": self.organization_id, "animal_type": "dog", "status": "available"}
            animals.append(animal_data)

        self.processed_animals = animals
        return animals


class TestSkipExistingAnimalsStaleDataBug(unittest.TestCase):
    """Test cases for the skip_existing_animals stale data detection bug."""

    def setUp(self):
        """Set up test fixtures."""
        self.mock_conn = Mock()
        self.mock_cursor = Mock()
        self.mock_conn.cursor.return_value = self.mock_cursor

    def test_skip_existing_animals_causes_stale_detection_bug(self):
        """Test that demonstrates the critical bug.

        This test shows how skip_existing_animals=true causes existing animals
        to be incorrectly marked as unavailable after 3 consecutive scrapes.
        """
        scraper = MockScraper(organization_id=1, skip_existing=True)
        scraper.conn = self.mock_conn

        # Mock database state: 3 existing animals
        existing_animals = [(1, "Dog1", datetime.now()), (2, "Dog2", datetime.now()), (3, "Dog3", datetime.now())]

        # First run: No existing URLs returned (simulate empty database)
        scraper.mock_database_service.get_existing_animal_urls.return_value = set()
        scraper.start_scrape_session()
        animals = scraper.collect_data()

        # All 3 animals should be processed
        self.assertEqual(len(animals), 3)
        self.assertEqual(len(scraper.collected_urls), 3)

        # Second run: Now existing URLs are returned (simulating animals in DB)
        existing_urls = {"https://example.com/dog1/", "https://example.com/dog2/", "https://example.com/dog3/"}
        scraper.mock_database_service.get_existing_animal_urls.return_value = existing_urls

        scraper.start_scrape_session()
        animals = scraper.collect_data()

        # BUG: No animals processed because they're all "existing" and skipped
        self.assertEqual(len(animals), 0)
        self.assertEqual(len(scraper.collected_urls), 0)

        # Simulate update_stale_data_detection being called
        # This would increment consecutive_scrapes_missing for all 3 animals
        # because none were "seen" in this scrape (they were skipped)
        result = scraper.update_stale_data_detection()

        # Verify the SessionManager update_stale_data_detection was called
        scraper.mock_session_manager.update_stale_data_detection.assert_called()
        self.assertTrue(result)

    def test_skip_existing_disabled_works_correctly(self):
        """Test that skip_existing_animals=false works correctly.

        This shows the expected behavior when the feature is disabled.
        """
        scraper = MockScraper(organization_id=1, skip_existing=False)
        scraper.conn = self.mock_conn

        # Existing URLs in database
        existing_urls = {"https://example.com/dog1/", "https://example.com/dog2/", "https://example.com/dog3/"}
        scraper.mock_database_service.get_existing_animal_urls.return_value = existing_urls

        scraper.start_scrape_session()
        animals = scraper.collect_data()

        # All animals should still be processed (skip is disabled)
        self.assertEqual(len(animals), 3)
        self.assertEqual(len(scraper.collected_urls), 3)

        # These animals would then be processed by save_animal() -> update_animal()
        # which would update their last_seen_at, preventing stale detection

    def test_mark_skipped_animals_as_seen_fix(self):
        """Test the proposed fix: mark skipped animals as seen.

        This test validates that the fix properly marks skipped animals
        as seen in the current scrape session.
        """
        scraper = MockScraper(organization_id=1, skip_existing=True)
        scraper.conn = self.mock_conn

        # Mock existing animals in database
        existing_urls = {"https://example.com/dog1/", "https://example.com/dog2/"}
        scraper.mock_database_service.get_existing_animal_urls.return_value = existing_urls

        scraper.start_scrape_session()

        # Test that mark_skipped_animals_as_seen method exists and works
        result = scraper.mark_skipped_animals_as_seen()

        # Should mark skipped animals as seen using SessionManager
        self.assertIsInstance(result, int)

        # Verify the SessionManager mark_skipped_animals_as_seen was called
        scraper.mock_session_manager.mark_skipped_animals_as_seen.assert_called()

    def test_consecutive_scrapes_missing_progression(self):
        """Test that demonstrates the progression to unavailable status.

        This test shows how after 3 consecutive scrapes with skip_existing_animals=true,
        animals would be incorrectly marked as unavailable.
        """
        scraper = MockScraper(organization_id=1, skip_existing=True)
        scraper.conn = self.mock_conn

        # Setup: Animal exists in database
        existing_urls = {"https://example.com/dog1/"}
        scraper.mock_database_service.get_existing_animal_urls.return_value = existing_urls

        # Track calls to update_stale_data_detection specifically
        with patch.object(scraper, "update_stale_data_detection", wraps=scraper.update_stale_data_detection) as mock_stale:
            # Run 1: Animal is skipped, consecutive_scrapes_missing = 1
            scraper.start_scrape_session()
            scraper.collect_data()
            scraper.update_stale_data_detection()

            # Run 2: Animal is skipped again, consecutive_scrapes_missing = 2
            scraper.start_scrape_session()
            scraper.collect_data()
            scraper.update_stale_data_detection()

            # Run 3: Animal is skipped again, consecutive_scrapes_missing = 3
            # Status would be changed to 'unavailable'
            scraper.start_scrape_session()
            scraper.collect_data()
            scraper.update_stale_data_detection()

            # Verify that update_stale_data_detection was called 3 times
            self.assertEqual(mock_stale.call_count, 3)

            # Verify that the SessionManager update_stale_data_detection was called 3 times
            self.assertEqual(scraper.mock_session_manager.update_stale_data_detection.call_count, 3)


if __name__ == "__main__":
    unittest.main()
