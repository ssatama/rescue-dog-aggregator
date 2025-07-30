"""
Test to verify that terminal logging fix works correctly.

Ensures that both database and terminal logging show the same animals_found count
when skip_existing_animals=true.

Following CLAUDE.md TDD principles: Write test, see it pass after fix.
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from scrapers.base_scraper import BaseScraper


class TestTerminalLoggingFix:
    """Test that terminal logging now matches database logging after the fix."""

    def test_terminal_and_database_logging_consistency_after_fix(self):
        """
        Test that terminal logging (self.animals_found) now matches database logging
        (_get_correct_animals_found_count) after the fix.
        
        This test verifies that the fix in base_scraper.py line 349 works correctly.
        """
        # Create a concrete test scraper class
        class TestScraper(BaseScraper):
            def collect_data(self):
                return []  # Empty after filtering (simulates skip_existing_animals)
        
        # Create scraper instance with skip_existing_animals enabled
        scraper = TestScraper(organization_id=1)
        scraper.skip_existing_animals = True
        
        # Simulate the scenario where filtering was applied
        scraper.total_animals_before_filter = 42  # Found 42 dogs on website
        scraper.total_animals_skipped = 42        # All 42 were existing, so skipped
        
        # Mock database operations to prevent actual DB calls
        with patch.object(scraper, 'start_scrape_log', return_value=True), \
             patch.object(scraper, 'start_scrape_session', return_value=True), \
             patch.object(scraper, '_process_animals_data', return_value={
                 'animals_added': 0, 'animals_updated': 0, 'animals_unchanged': 0,
                 'images_uploaded': 0, 'images_failed': 0, 'potential_failure_detected': False
             }), \
             patch.object(scraper, '_finalize_scrape'), \
             patch.object(scraper, '_log_completion_metrics'):
            
            # Run the scraper
            result = scraper.run()
            
            # Verify success
            assert result is True, "Scraper should succeed"
            
            # The key test: Verify that terminal logging now matches database logging
            terminal_count = scraper.animals_found  # What terminal will show
            database_count = scraper._get_correct_animals_found_count([])  # What DB logs
            
            assert terminal_count == database_count == 42, \
                f"Terminal shows {terminal_count}, DB shows {database_count}, both should be 42"

    def test_terminal_logging_without_skip_existing_animals(self):
        """
        Test that terminal logging works correctly when skip_existing_animals=false.
        """
        class TestScraper(BaseScraper):
            def collect_data(self):
                # Return some test data
                return [{'name': 'Dog1'}, {'name': 'Dog2'}, {'name': 'Dog3'}]
        
        scraper = TestScraper(organization_id=1)
        scraper.skip_existing_animals = False
        
        # Mock database operations
        with patch.object(scraper, 'start_scrape_log', return_value=True), \
             patch.object(scraper, 'start_scrape_session', return_value=True), \
             patch.object(scraper, '_process_animals_data', return_value={
                 'animals_added': 3, 'animals_updated': 0, 'animals_unchanged': 0,
                 'images_uploaded': 0, 'images_failed': 0, 'potential_failure_detected': False
             }), \
             patch.object(scraper, '_finalize_scrape'), \
             patch.object(scraper, '_log_completion_metrics'):
            
            result = scraper.run()
            
            assert result is True
            
            # Both should show the actual data count (3)
            terminal_count = scraper.animals_found
            database_count = scraper._get_correct_animals_found_count([{'name': 'Dog1'}, {'name': 'Dog2'}, {'name': 'Dog3'}])
            
            assert terminal_count == database_count == 3, \
                f"Terminal shows {terminal_count}, DB shows {database_count}, both should be 3"

    def test_partial_filtering_scenario(self):
        """
        Test scenario where some animals are skipped but not all.
        """
        class TestScraper(BaseScraper):
            def collect_data(self):
                # Return 2 dogs after filtering (originally found 5, skipped 3)
                return [{'name': 'Dog1'}, {'name': 'Dog2'}]
        
        scraper = TestScraper(organization_id=1)
        scraper.skip_existing_animals = True
        scraper.total_animals_before_filter = 5  # Found 5 on website
        scraper.total_animals_skipped = 3        # Skipped 3 existing ones
        
        with patch.object(scraper, 'start_scrape_log', return_value=True), \
             patch.object(scraper, 'start_scrape_session', return_value=True), \
             patch.object(scraper, '_process_animals_data', return_value={
                 'animals_added': 2, 'animals_updated': 0, 'animals_unchanged': 0,
                 'images_uploaded': 0, 'images_failed': 0, 'potential_failure_detected': False
             }), \
             patch.object(scraper, '_finalize_scrape'), \
             patch.object(scraper, '_log_completion_metrics'):
            
            result = scraper.run()
            
            assert result is True
            
            # Both should show total found on website (5), not filtered count (2)
            terminal_count = scraper.animals_found
            database_count = scraper._get_correct_animals_found_count([{'name': 'Dog1'}, {'name': 'Dog2'}])
            
            assert terminal_count == database_count == 5, \
                f"Terminal shows {terminal_count}, DB shows {database_count}, both should be 5"

    def test_no_filtering_stats_fallback(self):
        """
        Test that when no filtering stats are available, both use len(animals_data).
        """
        class TestScraper(BaseScraper):
            def collect_data(self):
                return [{'name': 'Dog1'}, {'name': 'Dog2'}]
        
        scraper = TestScraper(organization_id=1)
        scraper.skip_existing_animals = True
        # Don't set total_animals_before_filter - simulates no filtering stats
        
        with patch.object(scraper, 'start_scrape_log', return_value=True), \
             patch.object(scraper, 'start_scrape_session', return_value=True), \
             patch.object(scraper, '_process_animals_data', return_value={
                 'animals_added': 2, 'animals_updated': 0, 'animals_unchanged': 0,
                 'images_uploaded': 0, 'images_failed': 0, 'potential_failure_detected': False
             }), \
             patch.object(scraper, '_finalize_scrape'), \
             patch.object(scraper, '_log_completion_metrics'):
            
            result = scraper.run()
            
            assert result is True
            
            # Both should fall back to len(animals_data) = 2
            terminal_count = scraper.animals_found
            database_count = scraper._get_correct_animals_found_count([{'name': 'Dog1'}, {'name': 'Dog2'}])
            
            assert terminal_count == database_count == 2, \
                f"Terminal shows {terminal_count}, DB shows {database_count}, both should be 2"