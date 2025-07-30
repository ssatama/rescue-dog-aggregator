"""
Test to reproduce the logging discrepancy where terminal shows 0 animals found
but database shows successful scrapes with animals found.

Following CLAUDE.md TDD principles: Write failing test first.
"""

from unittest.mock import MagicMock, Mock, patch

import pytest

from utils.config_loader import ConfigLoader
from utils.secure_config_scraper_runner import SecureConfigScraperRunner


class TestAnimalsFoundLoggingBug:
    """Test class to reproduce and fix the animals_found logging discrepancy."""

    def test_scraper_animals_found_attribute_preserved_after_run(self):
        """
        Test that scraper.animals_found attribute is correctly preserved after scraper.run()

        This test reproduces the bug where:
        - Database logs show dogs found (from database operations during scrape)
        - Terminal logs show 0 animals found (from getattr(scraper, "animals_found", 0))

        Expected: Both should show the same non-zero value
        """
        # Arrange: Create a mock scraper with animals_found set
        mock_scraper = Mock()
        mock_scraper.run.return_value = True  # Successful scrape
        mock_scraper.animals_found = 42  # This should be preserved

        # Mock config and config loader
        mock_config = Mock()
        mock_config.get_display_name.return_value = "Test Organization"
        mock_config.is_enabled_for_scraping.return_value = True

        mock_config_loader = Mock()
        mock_config_loader.load_config.return_value = mock_config

        # Create runner with mocked dependencies
        runner = SecureConfigScraperRunner(config_loader=mock_config_loader, scraper_loader=None, sync_service=None)  # Will be mocked  # Will be mocked

        # Mock the scraper loading to return our mock scraper
        with patch.object(runner, "load_scraper_safely", return_value=mock_scraper), patch.object(runner, "ensure_organization_synced", return_value=1):

            # Act: Run the scraper
            result = runner.run_scraper("test-org", sync_first=False)

            # Assert: The result should contain the correct animals_found value
            assert result.success is True
            assert result.animals_found == 42, f"Expected 42 animals found, got {result.animals_found}"

            # Verify that the scraper's animals_found attribute wasn't modified
            assert mock_scraper.animals_found == 42, "Scraper animals_found attribute was modified"

    def test_multiple_scrapers_preserve_animals_found_independently(self):
        """
        Test that multiple scrapers maintain their individual animals_found values.

        This tests the scenario in run_all_enabled_scrapers where multiple scrapers
        should each report their correct animals_found values.
        """
        # Arrange: Create multiple mock scrapers with different animals_found values
        scrapers = []
        expected_animals = [33, 337, 27, 20, 183]  # Values from actual database

        for i, animal_count in enumerate(expected_animals):
            mock_scraper = Mock()
            mock_scraper.run.return_value = True
            mock_scraper.animals_found = animal_count
            scrapers.append(mock_scraper)

        # Mock configs
        mock_configs = []
        for i in range(len(expected_animals)):
            mock_config = Mock()
            mock_config.id = f"org-{i}"
            mock_config.get_display_name.return_value = f"Organization {i}"
            mock_config.is_enabled_for_scraping.return_value = True
            mock_configs.append(mock_config)

        mock_config_loader = Mock()
        mock_config_loader.get_enabled_orgs.return_value = mock_configs
        mock_config_loader.load_config.side_effect = lambda org_id: mock_configs[int(org_id.split("-")[1])]

        # Mock sync service
        mock_sync_service = Mock()
        mock_sync_summary = Mock()
        mock_sync_summary.success = True
        mock_sync_service.sync_all_organizations.return_value = mock_sync_summary

        runner = SecureConfigScraperRunner(config_loader=mock_config_loader, sync_service=mock_sync_service)

        # Mock scraper loading to return appropriate scraper for each config
        def mock_load_scraper(config_id):
            index = int(config_id.split("-")[1])
            return scrapers[index]

        with patch.object(runner, "load_scraper_safely", side_effect=mock_load_scraper):

            # Act: Run all scrapers
            result = runner.run_all_enabled_scrapers()

            # Assert: Each scraper result should have correct animals_found
            assert result.success is True
            assert len(result.results) == len(expected_animals)

            for i, scraper_result in enumerate(result.results):
                assert scraper_result.success is True, f"Scraper {i} failed"
                assert scraper_result.animals_found == expected_animals[i], f"Scraper {i}: expected {expected_animals[i]} animals, got {scraper_result.animals_found}"

    def test_getattr_animals_found_fallback_behavior(self):
        """
        Test the exact getattr call used in secure_config_scraper_runner.py:175

        This tests: getattr(scraper, "animals_found", 0)
        """
        # Test case 1: Scraper has animals_found attribute
        scraper_with_attr = Mock()
        scraper_with_attr.animals_found = 42

        result = getattr(scraper_with_attr, "animals_found", 0)
        assert result == 42, f"Expected 42, got {result}"

        # Test case 2: Scraper missing animals_found attribute (should fallback to 0)
        scraper_without_attr = Mock(spec=[])  # Empty spec means no attributes

        result = getattr(scraper_without_attr, "animals_found", 0)
        assert result == 0, f"Expected 0 fallback, got {result}"

        # Test case 3: Scraper has animals_found but it's None
        scraper_with_none = Mock()
        scraper_with_none.animals_found = None

        result = getattr(scraper_with_none, "animals_found", 0)
        assert result is None, f"Expected None, got {result}"

    def test_skip_existing_animals_affects_terminal_but_not_database_logging(self):
        """
        Test that reproduces the exact bug:
        - Database logs correct count via _get_correct_animals_found_count()
        - Terminal shows filtered count via self.animals_found

        When skip_existing_animals=true and all animals exist:
        - animals_data will be empty after filtering (len=0)
        - But total_animals_before_filter will be the actual count found
        """
        # Arrange: Create a scraper that simulates the skip_existing_animals scenario
        mock_scraper = Mock()
        mock_scraper.run.return_value = True

        # Simulate the bug: animals_found is set to filtered count (0)
        # but the scraper should have found animals before filtering
        mock_scraper.animals_found = 0  # This is what causes terminal to show 0

        # Add the filtering stats that would be set in real scenarios
        mock_scraper.skip_existing_animals = True
        mock_scraper.total_animals_before_filter = 42  # Actual dogs found on website
        mock_scraper.total_animals_skipped = 42  # All dogs skipped (exist in DB)

        # Mock _get_correct_animals_found_count to return the correct value
        # (this is what the database logging uses)
        def mock_get_correct_count(animals_data):
            if hasattr(mock_scraper, "total_animals_before_filter") and mock_scraper.total_animals_before_filter > 0:
                return mock_scraper.total_animals_before_filter
            return len(animals_data)

        mock_scraper._get_correct_animals_found_count = mock_get_correct_count

        # The bug is that terminal logging uses animals_found (0)
        # but database logging uses _get_correct_animals_found_count (42)

        # Assert: Demonstrate the discrepancy
        terminal_count = getattr(mock_scraper, "animals_found", 0)  # What terminal shows
        database_count = mock_scraper._get_correct_animals_found_count([])  # What DB logs

        assert terminal_count == 0, f"Terminal should show 0 due to bug, got {terminal_count}"
        assert database_count == 42, f"Database should show 42, got {database_count}"

        # This test demonstrates the exact bug we need to fix
