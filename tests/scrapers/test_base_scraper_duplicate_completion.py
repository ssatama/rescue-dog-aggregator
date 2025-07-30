"""
Test for BaseScraper duplicate completion calls issue.

This test reproduces the bug where BaseScraper calls complete_scrape_log
multiple times for the same scrape, causing apparent "duplicate" scrapes
in the database.
"""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestBaseScraper(BaseScraper):
    """Test implementation of BaseScraper."""

    def collect_data(self):
        """Mock implementation that returns test data."""
        return [{"name": "Test Dog", "external_id": "test-123", "adoption_url": "https://example.com/test-123", "breed": "Mixed", "age_text": "2 years"}]


class TestBasescraperDuplicateCompletion:
    """Test for duplicate completion issue in BaseScraper."""

    @pytest.fixture
    def mock_services(self):
        """Create mocked services for testing."""
        mock_db_service = Mock()
        mock_db_service.create_scrape_log.return_value = 123  # Fixed scrape log ID
        mock_db_service.complete_scrape_log.return_value = True
        # Note: Both complete_scrape_log and complete_scrape_log_with_metrics call the same database method

        mock_session_manager = Mock()
        mock_session_manager.start_scrape_session.return_value = True
        mock_session_manager.get_current_session.return_value = "test_session"
        mock_session_manager.mark_animal_as_seen.return_value = True
        mock_session_manager.update_stale_data_detection.return_value = True
        mock_session_manager.mark_skipped_animals_as_seen.return_value = 0
        mock_session_manager.detect_partial_failure.return_value = False

        mock_metrics_collector = Mock()
        mock_metrics_collector.calculate_scrape_duration.return_value = 30.5
        mock_metrics_collector.assess_data_quality.return_value = 0.85
        mock_metrics_collector.generate_comprehensive_metrics.return_value = {"animals_found": 1, "animals_added": 1, "animals_updated": 0, "duration_seconds": 30.5, "data_quality_score": 0.85}
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.log_detailed_metrics.return_value = None

        return {"database_service": mock_db_service, "session_manager": mock_session_manager, "metrics_collector": mock_metrics_collector}

    def test_duplicate_completion_calls_detected(self, mock_services):
        """Test that BaseScraper is calling complete_scrape_log multiple times."""
        # Create scraper with mocked services - use existing config
        scraper = TestBaseScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Mock the save_animal method to avoid database operations
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Set skip_existing_animals to False to avoid triggering mark_skipped_animals_as_seen
        scraper.skip_existing_animals = False

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        # Verify scraper ran successfully
        assert result is True

        # Check how many times complete_scrape_log was called
        db_service = mock_services["database_service"]

        # This is the BUG: complete_scrape_log should only be called ONCE per scrape
        # But currently it's called from both _finalize_scrape (for failures) and
        # _log_completion_metrics (for success with metrics)

        print(f"complete_scrape_log called {db_service.complete_scrape_log.call_count} times")
        print("Call details:")
        for i, call in enumerate(db_service.complete_scrape_log.call_args_list):
            args, kwargs = call
            print(f"  Call {i+1}: args={args}, kwargs={kwargs}")

        # ASSERTION: complete_scrape_log should be called exactly ONCE per scrape
        # Currently this test will FAIL because it's called multiple times
        assert db_service.complete_scrape_log.call_count == 1, (
            f"Expected complete_scrape_log to be called exactly once, "
            f"but it was called {db_service.complete_scrape_log.call_count} times. "
            f"This creates duplicate scrape log entries in the database."
        )

    def test_successful_scrape_should_use_metrics_completion(self, mock_services):
        """Test that successful scrapes should use complete_scrape_log_with_metrics."""
        # Create scraper with mocked services - use existing config
        scraper = TestBaseScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Mock the save_animal method
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.skip_existing_animals = False

        # Mock detect_partial_failure to return False (no failure detected)
        scraper.detect_partial_failure = Mock(return_value=False)

        # Patch BaseScraper methods to track which completion method is called
        with patch.object(scraper, "complete_scrape_log", wraps=scraper.complete_scrape_log) as mock_basic_completion:
            with patch.object(scraper, "complete_scrape_log_with_metrics", wraps=scraper.complete_scrape_log_with_metrics) as mock_metrics_completion:

                # Run the scraper
                with scraper:
                    result = scraper._run_with_connection()

                assert result is True

                print(f"BaseScraper.complete_scrape_log called {mock_basic_completion.call_count} times")
                print(f"BaseScraper.complete_scrape_log_with_metrics called {mock_metrics_completion.call_count} times")

                # CORRECT BEHAVIOR: For successful scrapes, only complete_scrape_log_with_metrics should be called
                # The previous bug where complete_scrape_log was called first has been fixed

                # For successful scrapes, BaseScraper.complete_scrape_log should NOT be called
                assert mock_basic_completion.call_count == 0, "BaseScraper.complete_scrape_log should not be called for successful scrapes"

                # For successful scrapes, BaseScraper.complete_scrape_log_with_metrics SHOULD be called
                assert mock_metrics_completion.call_count == 1, "BaseScraper.complete_scrape_log_with_metrics should be called exactly once for successful scrapes"
