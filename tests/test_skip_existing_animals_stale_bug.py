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


class MockScraper(BaseScraper):
    """Mock scraper for testing skip_existing_animals behavior."""

    def __init__(self, organization_id=1, skip_existing=True):
        """Initialize mock scraper."""
        # Mock the config loading to avoid database dependencies
        with patch("scrapers.base_scraper.ConfigLoader"), patch("scrapers.base_scraper.OrganizationSyncManager") as mock_sync:
            mock_sync.return_value.sync_organization.return_value = (organization_id, "test_org")
            super().__init__(config_id="test_config")

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
        self.mock_cursor.fetchall.return_value = []
        scraper.start_scrape_session()
        animals = scraper.collect_data()

        # All 3 animals should be processed
        self.assertEqual(len(animals), 3)
        self.assertEqual(len(scraper.collected_urls), 3)

        # Simulate saving all animals (they would update last_seen_at)
        # Reset mock for next test
        self.mock_cursor.reset_mock()

        # Second run: Now existing URLs are returned (simulating animals in DB)
        existing_urls = {("https://example.com/dog1/",), ("https://example.com/dog2/",), ("https://example.com/dog3/",)}
        self.mock_cursor.fetchall.return_value = list(existing_urls)

        scraper.start_scrape_session()
        animals = scraper.collect_data()

        # BUG: No animals processed because they're all "existing" and skipped
        self.assertEqual(len(animals), 0)
        self.assertEqual(len(scraper.collected_urls), 0)

        # Simulate update_stale_data_detection being called
        # This would increment consecutive_scrapes_missing for all 3 animals
        # because none were "seen" in this scrape (they were skipped)
        scraper.update_stale_data_detection()

        # Verify the stale data update query was called
        expected_update_call = unittest.mock.call(
            """
                UPDATE animals
                SET consecutive_scrapes_missing = consecutive_scrapes_missing + 1,
                    availability_confidence = CASE
                        WHEN consecutive_scrapes_missing = 0 THEN 'medium'
                        WHEN consecutive_scrapes_missing >= 1 THEN 'low'
                        ELSE availability_confidence
                    END,
                    status = CASE
                        WHEN consecutive_scrapes_missing >= 3 THEN 'unavailable'
                        ELSE status
                    END
                WHERE organization_id = %s
                AND (last_seen_at IS NULL OR last_seen_at < %s)
                """,
            (1, scraper.current_scrape_session),
        )

        # The bug is that this query would affect all 3 animals because
        # their last_seen_at wasn't updated (they were skipped)
        self.mock_cursor.execute.assert_called()

    def test_skip_existing_disabled_works_correctly(self):
        """Test that skip_existing_animals=false works correctly.

        This shows the expected behavior when the feature is disabled.
        """
        scraper = MockScraper(organization_id=1, skip_existing=False)
        scraper.conn = self.mock_conn

        # Existing URLs in database
        existing_urls = {("https://example.com/dog1/",), ("https://example.com/dog2/",), ("https://example.com/dog3/",)}
        self.mock_cursor.fetchall.return_value = list(existing_urls)

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
        self.mock_cursor.fetchall.return_value = [
            ("https://example.com/dog1/",),
            ("https://example.com/dog2/",),
        ]

        scraper.start_scrape_session()

        # Test that mark_skipped_animals_as_seen method exists and works
        with patch.object(scraper, "update_stale_data_detection") as mock_stale:
            result = scraper.mark_skipped_animals_as_seen()

            # Should mark skipped animals as seen
            self.assertIsInstance(result, int)

            # Verify the correct SQL was executed
            expected_call = unittest.mock.call(
                """
                UPDATE animals
                SET last_seen_at = %s,
                    consecutive_scrapes_missing = 0,
                    availability_confidence = 'high'
                WHERE organization_id = %s
                AND status = 'available'
                """,
                (scraper.current_scrape_session, 1),
            )
            self.mock_cursor.execute.assert_called_with(*expected_call.args)

    def test_consecutive_scrapes_missing_progression(self):
        """Test that demonstrates the progression to unavailable status.

        This test shows how after 3 consecutive scrapes with skip_existing_animals=true,
        animals would be incorrectly marked as unavailable.
        """
        scraper = MockScraper(organization_id=1, skip_existing=True)
        scraper.conn = self.mock_conn

        # Setup: Animal exists in database
        self.mock_cursor.fetchall.return_value = [("https://example.com/dog1/",)]

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

            # Verify that the SQL query contains the unavailable logic
            # Look for calls that contain the stale data detection query
            stale_queries = [call for call in self.mock_cursor.execute.call_args_list if call[0] and "consecutive_scrapes_missing" in str(call[0][0])]

            # Should have at least 3 stale data detection queries
            self.assertGreaterEqual(len(stale_queries), 3)

            # The query should contain the unavailable logic
            query = stale_queries[-1][0][0]
            self.assertIn("WHEN consecutive_scrapes_missing >= 3 THEN 'unavailable'", query)


if __name__ == "__main__":
    unittest.main()
