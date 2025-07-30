"""
Test for correct dogs_found field semantics in BaseScraper.

This test addresses user feedback:
"dogs_found should contain ALL dogs found during scraper run. then dogs_added should be NEW ones."

The issue: When skip_existing_animals=true, dogs_found shows 0 instead of the total
animals found on the website (e.g., 35 found, but 0 reported because all were existing).
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestBaseScraper(BaseScraper):
    """Test implementation of BaseScraper that mimics daisy_family_rescue filtering behavior."""

    def collect_data(self):
        """Mock implementation that simulates the filtering behavior in daisy_family_rescue."""
        # Simulate finding 35 dogs on the website (like daisy_family_rescue does)
        all_dogs = [
            {"name": f"Test Dog {i}", "external_id": f"test-{i}", "adoption_url": f"https://example.com/test-{i}", "breed": "Mixed", "age_text": "2 years"}
            for i in range(1, 36)  # Creates 35 dogs (indices 1-35)
        ]

        # SIMULATE THE BUG: Apply filtering like daisy_family_rescue does
        if self.skip_existing_animals and all_dogs:
            all_urls = [dog.get("adoption_url") for dog in all_dogs if dog.get("adoption_url")]
            filtered_urls = self._filter_existing_urls(all_urls)
            filtered_urls_set = set(filtered_urls)

            # Filter dogs to only those with URLs we should process
            original_count = len(all_dogs)
            filtered_dogs = [dog for dog in all_dogs if dog.get("adoption_url") in filtered_urls_set]
            skipped_count = original_count - len(filtered_dogs)

            # Track filtering stats (this is what should be used for dogs_found)
            self.set_filtering_stats(original_count, skipped_count)

            # PROBLEM: Return filtered list instead of original list
            # This causes BaseScraper to see 0 dogs instead of 35
            return filtered_dogs
        else:
            # No filtering applied
            self.set_filtering_stats(len(all_dogs), 0)
            return all_dogs


class TestDogsFoundSemantics:
    """Test for correct dogs_found field semantics."""

    @pytest.fixture
    def mock_services(self):
        """Create mocked services for testing."""
        mock_db_service = Mock()
        mock_db_service.create_scrape_log.return_value = 123
        mock_db_service.complete_scrape_log.return_value = True
        mock_db_service.complete_scrape_log_with_metrics = Mock(return_value=True)

        # Mock get_existing_animal_urls to return ALL URLs (simulating all dogs exist)
        existing_urls = {f"https://example.com/test-{i}" for i in range(1, 36)}
        mock_db_service.get_existing_animal_urls.return_value = existing_urls

        mock_session_manager = Mock()
        mock_session_manager.start_scrape_session.return_value = True
        mock_session_manager.get_current_session.return_value = "test_session"
        mock_session_manager.mark_animal_as_seen.return_value = True
        mock_session_manager.update_stale_data_detection.return_value = True
        mock_session_manager.mark_skipped_animals_as_seen.return_value = 0
        mock_session_manager.detect_partial_failure.return_value = False

        mock_metrics_collector = Mock()
        mock_metrics_collector.calculate_scrape_duration.return_value = 17.4
        mock_metrics_collector.assess_data_quality.return_value = 0.85
        mock_metrics_collector.generate_comprehensive_metrics.return_value = {
            "animals_found": 35,  # This should be total found, not filtered
            "animals_added": 0,  # None were added (all existed)
            "animals_updated": 0,
            "duration_seconds": 17.4,
            "data_quality_score": 0.85,
        }
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.log_detailed_metrics.return_value = None

        return {"database_service": mock_db_service, "session_manager": mock_session_manager, "metrics_collector": mock_metrics_collector}

    def test_dogs_found_should_show_total_not_filtered_count(self, mock_services):
        """Test that dogs_found shows total animals found on website, not filtered count.

        Scenario: Scraper finds 35 dogs on website, but all 35 already exist in database.
        With skip_existing_animals=true, 0 dogs are processed (all filtered out).

        EXPECTED BEHAVIOR:
        - dogs_found: 35 (total found on website)
        - dogs_added: 0 (none were new)
        - dogs_updated: 0 (none were updated)

        CURRENT BUG:
        - dogs_found: 0 (shows filtered count instead of total)
        """
        # Create scraper with skip_existing_animals enabled
        scraper = TestBaseScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]
        scraper.skip_existing_animals = True  # Enable filtering

        # Mock save_animal to avoid actual database operations
        scraper.save_animal = Mock(return_value=(1, "no_change"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check the completion call to see what dogs_found value was logged
        db_service = mock_services["database_service"]

        print(f"complete_scrape_log called {db_service.complete_scrape_log.call_count} times")
        print(f"complete_scrape_log_with_metrics called {db_service.complete_scrape_log_with_metrics.call_count} times")

        # Check which method was called
        dogs_found_value = None
        if db_service.complete_scrape_log_with_metrics.call_count > 0:
            # Extract from complete_scrape_log_with_metrics
            call_args = db_service.complete_scrape_log_with_metrics.call_args
            args, kwargs = call_args if call_args else ([], {})
            dogs_found_value = args[2] if len(args) >= 3 else kwargs.get("animals_found", "NOT_FOUND")
        elif db_service.complete_scrape_log.call_count > 0:
            # Extract from complete_scrape_log
            call_args = db_service.complete_scrape_log.call_args
            args, kwargs = call_args if call_args else ([], {})
            dogs_found_value = args[2] if len(args) >= 3 else kwargs.get("animals_found", "NOT_FOUND")

        print(f"dogs_found value logged: {dogs_found_value}")
        print(f"Expected: 35 (total dogs found on website)")
        print(f"Current implementation likely logs: 0 (filtered count)")

        # This test should FAIL with current implementation
        # Current: dogs_found = len(filtered_animals_data) = 0
        # Expected: dogs_found = total_animals_before_filter = 35
        assert dogs_found_value == 35, (
            f"dogs_found should show total animals found on website (35), "
            f"not the filtered count ({dogs_found_value}). "
            f"When skip_existing_animals=true and all animals exist, "
            f"dogs_found should still show 35 to indicate scraper found 35 dogs, "
            f"even though 0 were processed as new."
        )

    def test_filtering_stats_are_tracked_correctly(self, mock_services):
        """Test that filtering statistics are tracked and available for logging."""
        scraper = TestBaseScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]
        scraper.skip_existing_animals = True

        scraper.save_animal = Mock(return_value=(1, "no_change"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Run the scraper to trigger filtering
        with scraper:
            scraper._run_with_connection()

        # Check that filtering stats were set correctly
        # These stats should be available for proper dogs_found calculation
        assert scraper.total_animals_before_filter == 35, "total_animals_before_filter should track the original count from collect_data()"

        assert scraper.total_animals_skipped == 35, "total_animals_skipped should track how many were filtered out"

        # The key insight: dogs_found should use total_animals_before_filter, not len(filtered_data)
        print(f"total_animals_before_filter: {scraper.total_animals_before_filter}")
        print(f"total_animals_skipped: {scraper.total_animals_skipped}")
        print(f"animals that should be processed: {scraper.total_animals_before_filter - scraper.total_animals_skipped}")

    def test_dogs_found_semantics_with_partial_processing(self, mock_services):
        """Test dogs_found semantics when some animals are new and some exist."""
        # Mock that only 20 out of 35 URLs already exist
        existing_urls = {f"https://example.com/test-{i}" for i in range(1, 21)}  # 1-20 exist
        mock_services["database_service"].get_existing_animal_urls.return_value = existing_urls

        scraper = TestBaseScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]
        scraper.skip_existing_animals = True

        # Mock save_animal to simulate adding new animals
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        with scraper:
            scraper._run_with_connection()

        # Check filtering stats
        assert scraper.total_animals_before_filter == 35, "Should track total found"
        assert scraper.total_animals_skipped == 20, "Should track how many were skipped"

        # Check completion call
        db_service = mock_services["database_service"]

        print(f"complete_scrape_log called {db_service.complete_scrape_log.call_count} times")
        print(f"complete_scrape_log_with_metrics called {db_service.complete_scrape_log_with_metrics.call_count} times")

        # Check which method was called
        dogs_found_value = None
        dogs_added_value = None
        if db_service.complete_scrape_log_with_metrics.call_count > 0:
            # Extract from complete_scrape_log_with_metrics
            call_args = db_service.complete_scrape_log_with_metrics.call_args
            args, kwargs = call_args if call_args else ([], {})
            dogs_found_value = args[2] if len(args) >= 3 else kwargs.get("animals_found")
            dogs_added_value = args[3] if len(args) >= 4 else kwargs.get("animals_added")
        elif db_service.complete_scrape_log.call_count > 0:
            # Extract from complete_scrape_log
            call_args = db_service.complete_scrape_log.call_args
            args, kwargs = call_args if call_args else ([], {})
            dogs_found_value = args[2] if len(args) >= 3 else kwargs.get("animals_found")
            dogs_added_value = args[3] if len(args) >= 4 else kwargs.get("animals_added")

        # Expected behavior:
        # - dogs_found: 35 (total found on website)
        # - dogs_added: 15 (new animals processed: 35 - 20 = 15)
        assert dogs_found_value == 35, f"dogs_found should be 35 (total), got {dogs_found_value}"
        assert dogs_added_value == 15, f"dogs_added should be 15 (new animals), got {dogs_added_value}"
