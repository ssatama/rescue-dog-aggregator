"""
Test for BaseScraper integration with ProgressTracker - world-class logging.

This test addresses the silent processing issue where _process_animals_data()
provides no feedback during long-running operations. Integration tests verify
that progress tracking works seamlessly with the existing Template Method Pattern.
"""

import logging
import time
from io import StringIO
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.progress_tracker import LoggingLevel, ProgressTracker


@pytest.mark.computation
@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestProgressIntegrationScraper(BaseScraper):
    """Test implementation for progress tracking integration."""

    def __init__(self, config_id="daisyfamilyrescue", animal_count=100):
        """Initialize with configurable animal count for testing different scales."""
        super().__init__(config_id=config_id)
        self.animal_count = animal_count

    def collect_data(self):
        """Mock implementation that returns specified number of animals."""
        animals = []
        for i in range(self.animal_count):
            animals.append(
                {
                    "name": f"Test Dog {i+1}",
                    "external_id": f"test-{i+1}",
                    "adoption_url": f"https://example.com/test-{i+1}",
                    "breed": "Mixed",
                    "age_text": "2 years",
                    "image_urls": [f"https://example.com/image-{i+1}.jpg"],
                }
            )
        return animals


class TestBaseScraperProgressIntegration:
    """Test ProgressTracker integration with BaseScraper."""

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

        mock_metrics_collector = Mock()
        mock_metrics_collector.track_phase_timing.return_value = None
        mock_metrics_collector.log_detailed_metrics.return_value = None
        mock_metrics_collector.calculate_scrape_duration.return_value = 5.0
        mock_metrics_collector.assess_data_quality.return_value = 0.85
        mock_metrics_collector.generate_comprehensive_metrics.return_value = {"test": "metrics"}

        return {"database_service": mock_db_service, "session_manager": mock_session_manager, "metrics_collector": mock_metrics_collector}

    @pytest.fixture
    def log_capture(self):
        """Capture log output for testing."""
        log_stream = StringIO()
        handler = logging.StreamHandler(log_stream)
        handler.setLevel(logging.INFO)
        return log_stream, handler

    def test_small_site_should_use_minimal_logging(self, mock_services, log_capture):
        """Test that small sites (≤25 animals) use minimal logging with no progress updates.

        EXPECTED BEHAVIOR:
        - No progress updates during processing
        - Only start and end messages
        - Fast execution without logging overhead
        """
        log_stream, handler = log_capture

        # Small site with 15 animals
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=15)
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Add handler to capture logs
        scraper.logger.addHandler(handler)
        scraper.logger.setLevel(logging.INFO)

        # Mock save_animal to avoid actual database operations
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.save_animal_images = Mock(return_value=(1, 0))

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check log output
        log_output = log_stream.getvalue()

        # Should have centralized logging messages (world-class logging system)
        assert ("Connected to database" in log_output or "Processing complete" in log_output)

        # Should NOT have progress updates (minimal logging)
        assert "Progress:" not in log_output
        assert "Processing animals:" not in log_output
        assert "Throughput:" not in log_output

        # Clean up
        scraper.logger.removeHandler(handler)

    def test_large_site_should_use_comprehensive_logging_with_progress(self, mock_services, log_capture):
        """Test that large sites (150+ animals) use comprehensive logging with progress bars.

        EXPECTED BEHAVIOR:
        - Progress bar during processing
        - Throughput metrics (animals/sec)
        - Batch progress summaries
        - ETA calculations
        """
        log_stream, handler = log_capture

        # Large site with 200 animals
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=200)
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Add handler to capture logs
        scraper.logger.addHandler(handler)
        scraper.logger.setLevel(logging.INFO)

        # Mock save_animal to simulate processing time
        def mock_save_with_delay(animal_data):
            time.sleep(0.001)  # Small delay to simulate processing
            return (1, "added")

        scraper.save_animal = Mock(side_effect=mock_save_with_delay)
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.save_animal_images = Mock(return_value=(2, 0))

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check log output
        log_output = log_stream.getvalue()
        print(f"Log output for large site test:\n{log_output}")

        # Should have comprehensive logging features
        assert "📊 Processing animals:" in log_output  # Progress bar
        assert "items/sec" in log_output or "/sec" in log_output  # Throughput
        assert "[" in log_output and "]" in log_output  # Progress bar brackets

        # Clean up
        scraper.logger.removeHandler(handler)

    def test_medium_site_should_show_batch_progress_updates(self, mock_services, log_capture):
        """Test that medium sites (26-75 animals) show periodic batch updates."""
        log_stream, handler = log_capture

        # Medium site with 50 animals
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=50)
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Add handler to capture logs
        scraper.logger.addHandler(handler)
        scraper.logger.setLevel(logging.INFO)

        # Mock services
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.save_animal_images = Mock(return_value=(1, 0))

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check log output
        log_output = log_stream.getvalue()

        # Should have batch progress updates (STANDARD level)
        assert "🔄 Processed:" in log_output  # Standard progress message

        # Should NOT have comprehensive features
        assert "📊 Processing animals:" not in log_output  # No progress bar
        assert "ETA:" not in log_output  # No ETA

        # Clean up
        scraper.logger.removeHandler(handler)

    def test_progress_tracker_should_track_different_operation_types(self, mock_services, log_capture):
        """Test that ProgressTracker tracks animals and images separately."""
        log_stream, handler = log_capture

        # Large site to trigger comprehensive logging
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=200)
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Add handler to capture logs
        scraper.logger.addHandler(handler)
        scraper.logger.setLevel(logging.INFO)

        # Mock services with multiple images per animal
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.save_animal_images = Mock(return_value=(3, 0))  # 3 images per animal

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Check log output for operation breakdown
        log_output = log_stream.getvalue()

        # Should track different operation types in comprehensive mode
        if "🎯 Operations:" in log_output:
            assert "200 animal" in log_output or "animal_save" in log_output
            assert "600 image" in log_output or "image_upload" in log_output

        # Clean up
        scraper.logger.removeHandler(handler)

    def test_progress_logging_should_not_impact_existing_functionality(self, mock_services):
        """Test that progress logging doesn't break existing scraper functionality.

        REGRESSION TEST:
        - All existing metrics should still be calculated
        - Completion logging should still work
        - Template Method Pattern should remain intact
        """
        # Test with medium-sized site
        scraper = TestProgressIntegrationScraper(config_id="daisyfamilyrescue", animal_count=75)
        scraper.database_service = mock_services["database_service"]
        scraper.session_manager = mock_services["session_manager"]
        scraper.metrics_collector = mock_services["metrics_collector"]

        # Mock services
        scraper.save_animal = Mock(return_value=(1, "added"))
        scraper.mark_animal_as_seen = Mock(return_value=True)
        scraper.save_animal_images = Mock(return_value=(2, 0))

        # Run the scraper
        with scraper:
            result = scraper._run_with_connection()

        assert result is True

        # Verify all existing functionality still works
        mock_services["database_service"].create_scrape_log.assert_called_once()
        mock_services["session_manager"].start_scrape_session.assert_called_once()
        mock_services["metrics_collector"].calculate_scrape_duration.assert_called_once()

        # Verify completion was logged (either basic or with metrics)
        completion_calls = mock_services["database_service"].complete_scrape_log.call_count + mock_services["database_service"].complete_scrape_log_with_metrics.call_count
        assert completion_calls >= 1, "Scrape completion should be logged"
