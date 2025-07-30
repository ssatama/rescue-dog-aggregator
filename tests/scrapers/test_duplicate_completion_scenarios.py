"""
Test for all potential duplicate completion scenarios in BaseScraper.

Tests various scenarios that could trigger multiple completion calls:
1. Session startup failure
2. Partial failure detection
3. Normal success flow
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


class TestDuplicateCompletionScenarios:
    """Test for all duplicate completion scenarios."""

    @pytest.fixture
    def mock_services(self):
        """Create mocked services for testing."""
        mock_db_service = Mock()
        mock_db_service.create_scrape_log.return_value = 123
        mock_db_service.complete_scrape_log.return_value = True
        mock_db_service.complete_scrape_log_with_metrics = Mock(return_value=True)

        mock_session_manager = Mock()
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

    def test_session_startup_failure_scenario(self, mock_services):
        """Test completion calls when session startup fails."""
        # Create scraper with mocked services
        scraper = TestBaseScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Mock session startup failure
        mock_services["session_manager"].start_scrape_session.return_value = False

        # Mock the save_animal method
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.skip_existing_animals = False

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check completion calls
        db_service = mock_services["database_service"]

        print(f"complete_scrape_log called {db_service.complete_scrape_log.call_count} times")
        print(f"complete_scrape_log_with_metrics called {db_service.complete_scrape_log_with_metrics.call_count} times")

        # Total completion calls should be exactly 1
        total_completions = db_service.complete_scrape_log.call_count + db_service.complete_scrape_log_with_metrics.call_count

        # This test should FAIL if there are duplicate completions
        assert total_completions == 1, (
            f"Expected exactly 1 completion call total, but got {total_completions} "
            f"(complete_scrape_log: {db_service.complete_scrape_log.call_count}, "
            f"complete_scrape_log_with_metrics: {db_service.complete_scrape_log_with_metrics.call_count}). "
            f"Session startup failure should not cause duplicate completions."
        )

    def test_partial_failure_detection_scenario(self, mock_services):
        """Test completion calls when partial failure is detected."""
        # Create scraper with mocked services
        scraper = TestBaseScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Mock session startup success but partial failure detection
        mock_services["session_manager"].start_scrape_session.return_value = True
        mock_services["session_manager"].detect_partial_failure.return_value = True  # Partial failure!

        # Mock the save_animal method
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.skip_existing_animals = False

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check completion calls
        db_service = mock_services["database_service"]

        print(f"complete_scrape_log called {db_service.complete_scrape_log.call_count} times")
        print(f"complete_scrape_log_with_metrics called {db_service.complete_scrape_log_with_metrics.call_count} times")

        # Total completion calls should be exactly 1
        total_completions = db_service.complete_scrape_log.call_count + db_service.complete_scrape_log_with_metrics.call_count

        # This test should FAIL if there are duplicate completions
        assert total_completions == 1, (
            f"Expected exactly 1 completion call total, but got {total_completions} "
            f"(complete_scrape_log: {db_service.complete_scrape_log.call_count}, "
            f"complete_scrape_log_with_metrics: {db_service.complete_scrape_log_with_metrics.call_count}). "
            f"Partial failure detection should not cause duplicate completions."
        )

    def test_session_failure_plus_partial_failure_scenario(self, mock_services):
        """Test completion calls when BOTH session fails AND partial failure detected."""
        # Create scraper with mocked services
        scraper = TestBaseScraper(config_id="daisyfamilyrescue")
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Mock BOTH session startup failure AND partial failure detection
        mock_services["session_manager"].start_scrape_session.return_value = False  # Session fails
        mock_services["session_manager"].detect_partial_failure.return_value = True  # Partial failure!

        # Mock the save_animal method
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.skip_existing_animals = False

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check completion calls
        db_service = mock_services["database_service"]

        print(f"complete_scrape_log called {db_service.complete_scrape_log.call_count} times")
        print(f"complete_scrape_log_with_metrics called {db_service.complete_scrape_log_with_metrics.call_count} times")

        # Total completion calls should be exactly 1
        total_completions = db_service.complete_scrape_log.call_count + db_service.complete_scrape_log_with_metrics.call_count

        # This test should FAIL if there are duplicate completions due to multiple failure conditions
        assert total_completions == 1, (
            f"Expected exactly 1 completion call total, but got {total_completions} "
            f"(complete_scrape_log: {db_service.complete_scrape_log.call_count}, "
            f"complete_scrape_log_with_metrics: {db_service.complete_scrape_log_with_metrics.call_count}). "
            f"Multiple failure conditions should not cause duplicate completions."
        )
