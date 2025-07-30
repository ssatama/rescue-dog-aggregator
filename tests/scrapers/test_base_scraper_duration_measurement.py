"""
Test for accurate duration measurement in BaseScraper.

This test addresses the issue where duration_seconds shows only database
update time (0.001s) instead of the full scrape duration (17.4s).

The issue: MetricsCollector.calculate_scrape_duration() is called only during
the metrics logging phase, which measures time from scrape_start_time to
scrape_end_time but doesn't account for the full execution time.
"""

import time
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.network
@pytest.mark.slow
class TestDurationMeasurementScraper(BaseScraper):
    """Test implementation that simulates realistic scrape timing."""

    def __init__(self, config_id="daisyfamilyrescue", simulate_duration=2.0):
        """Initialize with configurable duration simulation."""
        super().__init__(config_id=config_id)
        self.simulate_duration = simulate_duration

    def collect_data(self):
        """Mock implementation that takes realistic time."""
        # Simulate realistic scrape time (e.g., network requests, page processing)
        time.sleep(self.simulate_duration)

        # Return mock data
        return [{"name": "Test Dog", "external_id": "test-123", "adoption_url": "https://example.com/test-123", "breed": "Mixed", "age_text": "2 years"}]


class TestDurationMeasurement:
    """Test for accurate duration measurement."""

    @pytest.fixture
    def mock_services(self):
        """Create mocked services for testing."""
        mock_db_service = Mock()
        mock_db_service.create_scrape_log.return_value = 123
        mock_db_service.complete_scrape_log.return_value = True
        mock_db_service.complete_scrape_log_with_metrics = Mock(return_value=True)
        mock_db_service.get_existing_animal_urls.return_value = set()

        mock_session_manager = Mock()
        mock_session_manager.start_scrape_session.return_value = True
        mock_session_manager.get_current_session.return_value = "test_session"
        mock_session_manager.mark_animal_as_seen.return_value = True
        mock_session_manager.update_stale_data_detection.return_value = True
        mock_session_manager.mark_skipped_animals_as_seen.return_value = 0
        mock_session_manager.detect_partial_failure.return_value = False

        # Mock metrics collector that tracks actual timing
        mock_metrics_collector = Mock()
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.log_detailed_metrics.return_value = None

        # KEY ISSUE: calculate_scrape_duration should return the actual elapsed time
        # Currently it may only measure a small portion of the total time
        def mock_calculate_duration(start_time, end_time):
            """Mock that should return actual elapsed time."""
            actual_duration = (end_time - start_time).total_seconds()
            return actual_duration

        mock_metrics_collector.calculate_scrape_duration = Mock(side_effect=mock_calculate_duration)
        mock_metrics_collector.assess_data_quality.return_value = 0.85

        # Mock generate_comprehensive_metrics to return the provided kwargs
        # This simulates the correct behavior where duration_seconds is passed through
        def mock_comprehensive_metrics(**kwargs):
            """Mock that returns the provided metrics (simulating correct behavior)."""
            return kwargs

        mock_metrics_collector.generate_comprehensive_metrics = Mock(side_effect=mock_comprehensive_metrics)

        return {"database_service": mock_db_service, "session_manager": mock_session_manager, "metrics_collector": mock_metrics_collector}

    def test_duration_should_measure_full_scrape_time(self, mock_services):
        """Test that duration measurement captures the full scrape execution time.

        Scenario: Scraper takes 2.0 seconds to execute collect_data() due to network
        requests and processing time. The duration_seconds should reflect this full
        time, not just the database update time.

        EXPECTED BEHAVIOR:
        - duration_seconds: ~2.0 seconds (full execution time)

        CURRENT BUG:
        - duration_seconds: 0.001 seconds (only database operation time)
        """
        # Create scraper that simulates 2 seconds of execution time
        scraper = TestDurationMeasurementScraper(config_id="daisyfamilyrescue", simulate_duration=2.0)
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Mock save_animal to avoid actual database operations
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Record start time for our own measurement
        test_start_time = time.time()

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        # Calculate actual elapsed time
        actual_elapsed = time.time() - test_start_time

        assert result is True

        # Check the completion call to see what duration was logged
        db_service = mock_services["database_service"]
        metrics_collector = mock_services["metrics_collector"]

        print(f"complete_scrape_log called {db_service.complete_scrape_log.call_count} times")
        print(f"complete_scrape_log_with_metrics called {db_service.complete_scrape_log_with_metrics.call_count} times")
        print(f"calculate_scrape_duration called {metrics_collector.calculate_scrape_duration.call_count} times")

        # Extract duration from the logged metrics
        logged_duration = None
        detailed_metrics_duration = None

        if db_service.complete_scrape_log.call_count > 0:
            call_args = db_service.complete_scrape_log.call_args
            args, kwargs = call_args if call_args else ([], {})

            print(f"complete_scrape_log call args count: {len(args)}")
            print(f"All call args: {args}")

            # Let's see what each argument is
            for i, arg in enumerate(args):
                print(f"  args[{i}]: {type(arg).__name__} = {arg}")

            if len(args) >= 7:  # New format with detailed metrics
                # Need to figure out the correct parameter positions
                logged_duration = args[7] if len(args) > 7 else None  # Try args[7] for duration_seconds
                detailed_metrics = args[6] if len(args) > 6 else None  # Try args[6] for detailed_metrics
                if detailed_metrics and isinstance(detailed_metrics, dict):
                    detailed_metrics_duration = detailed_metrics.get("duration_seconds")
                    print(f"detailed_metrics contains: {detailed_metrics}")
            else:
                print("WARNING: complete_scrape_log called with old format (< 7 args)")
                print(f"Call args: {args}")

        print(f"Actual elapsed time: {actual_elapsed:.3f} seconds")
        print(f"Expected duration: ~2.0 seconds (simulate_duration)")
        print(f"Logged duration parameter: {logged_duration} seconds")
        print(f"detailed_metrics['duration_seconds']: {detailed_metrics_duration} seconds")

        # The key issue: duration measurement inconsistency
        assert logged_duration is not None, "Duration should be logged as parameter"
        assert logged_duration >= 1.8, (
            f"Duration parameter should measure full scrape time (~2.0s), "
            f"but got {logged_duration}s. "
            f"This indicates duration measurement captures database update time "
            f"instead of the full scrape execution time including collect_data()."
        )

        # Additional check: detailed_metrics should be consistent with duration parameter
        if detailed_metrics_duration is not None:
            assert abs(detailed_metrics_duration - logged_duration) < 0.1, (
                f"Duration inconsistency: parameter={logged_duration}s, " f"detailed_metrics={detailed_metrics_duration}s. " f"These should be the same value!"
            )

    def test_calculate_scrape_duration_timing_points(self, mock_services):
        """Test that scrape_start_time and scrape_end_time span the full execution."""
        scraper = TestDurationMeasurementScraper(config_id="daisyfamilyrescue", simulate_duration=1.5)
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)

        # Track when calculate_scrape_duration is called and with what parameters
        original_calculate = mock_services["metrics_collector"].calculate_scrape_duration
        call_info = []

        def track_calculate_duration(start_time, end_time):
            duration = original_calculate(start_time, end_time)
            call_info.append({"start_time": start_time, "end_time": end_time, "calculated_duration": duration})
            return duration

        mock_services["metrics_collector"].calculate_scrape_duration = track_calculate_duration

        # Record our own timing
        test_start = time.time()

        with scraper:
            result = scraper._run_with_connection()

        test_end = time.time()
        actual_test_duration = test_end - test_start

        assert result is True
        assert len(call_info) > 0, "calculate_scrape_duration should be called"

        # Analyze the timing information
        timing_info = call_info[0]  # Should be only one call
        calculated_duration = timing_info["calculated_duration"]

        print(f"Test measured duration: {actual_test_duration:.3f}s")
        print(f"BaseScraper calculated duration: {calculated_duration:.3f}s")
        print(f"Expected duration: ~1.5s (simulate_duration)")

        # The calculated duration should be close to our test measurement
        # If it's much smaller, it means the timing points are wrong
        assert calculated_duration >= 1.2, (
            f"BaseScraper's calculated duration ({calculated_duration:.3f}s) "
            f"should be close to actual execution time (~1.5s), "
            f"but it's much smaller. This suggests scrape_start_time is set too late "
            f"or scrape_end_time is set too early, missing the collect_data() phase."
        )

    def test_duration_consistency_across_multiple_runs(self, mock_services):
        """Test duration measurement consistency with different execution times."""
        durations_to_test = [0.5, 1.0, 1.5]  # Different simulated durations
        measured_durations = []

        for expected_duration in durations_to_test:
            scraper = TestDurationMeasurementScraper(config_id="daisyfamilyrescue", simulate_duration=expected_duration)
            scraper.database_service = mock_services["database_service"]
            scraper.session_manager = mock_services["session_manager"]
            scraper.metrics_collector = mock_services["metrics_collector"]

            scraper.save_animal = Mock(return_value=(1, "added"))
            scraper.mark_animal_as_seen = Mock(return_value=True)

            # Reset mock call counts
            mock_services["database_service"].complete_scrape_log_with_metrics.reset_mock()

            with scraper:
                result = scraper._run_with_connection()

            assert result is True

            # Debug: Check which completion method was called
            with_metrics_args = mock_services["database_service"].complete_scrape_log_with_metrics.call_args
            basic_args = mock_services["database_service"].complete_scrape_log.call_args

            print(f"complete_scrape_log_with_metrics called: {with_metrics_args is not None}")
            print(f"complete_scrape_log called: {basic_args is not None}")

            if with_metrics_args:
                args, kwargs = with_metrics_args
                print(f"With metrics - Args length: {len(args)}, Args: {args}")
                logged_duration = args[6] if len(args) >= 7 else kwargs.get("duration_seconds")
            elif basic_args:
                args, kwargs = basic_args
                print(f"Basic - Args length: {len(args)}, Args: {args}")
                # The basic method now gets duration at position 7 (0-indexed)
                logged_duration = args[7] if len(args) >= 8 else None
            else:
                logged_duration = None

            measured_durations.append((expected_duration, logged_duration))

        print("Duration measurement consistency test:")
        for expected, measured in measured_durations:
            print(f"  Expected: {expected:.1f}s, Measured: {measured:.3f}s")

        # All measured durations should be reasonably close to expected
        for expected, measured in measured_durations:
            assert measured >= expected * 0.8, (
                f"Measured duration ({measured:.3f}s) should be close to "
                f"expected duration ({expected:.1f}s), but it's much smaller. "
                f"This indicates the duration measurement is not capturing "
                f"the full execution time consistently."
            )
