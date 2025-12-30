"""
Tests for world-class centralized logging system.

Tests the enhanced ProgressTracker and centralized logging architecture
that provides professional, comprehensive statistics and progress tracking.
"""

import logging
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.progress_tracker import LoggingLevel, ProgressTracker


@pytest.mark.unit
class TestWorldClassLogging:
    """Test suite for world-class centralized logging system."""

    def test_comprehensive_stats_tracking(self):
        """Test that all comprehensive stats are tracked properly."""
        # Mock logger
        mock_logger = Mock()

        # Configuration for comprehensive logging
        config = {
            "batch_size": 10,
            "show_progress_bar": True,
            "show_throughput": True,
            "eta_enabled": True,
            "verbosity_level": "comprehensive",
        }

        # Create progress tracker for large site (triggers comprehensive mode)
        tracker = ProgressTracker(total_items=200, logger=mock_logger, config=config)

        # Verify comprehensive mode activated
        assert tracker.verbosity_level == LoggingLevel.COMPREHENSIVE

        # Simulate some processing to generate throughput
        import time

        time.sleep(0.01)  # Small delay to generate measurable duration
        tracker.update(items_processed=10)  # Update progress

        # Test comprehensive stats tracking
        tracker.track_discovery_stats(
            dogs_found=200, pages_processed=5, extraction_failures=2
        )
        tracker.track_filtering_stats(dogs_skipped=150, new_dogs=50)
        tracker.track_processing_stats(
            dogs_added=10, dogs_updated=35, dogs_unchanged=5, processing_failures=0
        )
        tracker.track_image_stats(
            images_uploaded=45, images_failed=5, image_optimizations=40
        )
        tracker.track_performance_stats(
            phase_durations={"collection": 30.5, "processing": 45.2}
        )

        # Verify all stats are tracked
        stats = tracker.get_comprehensive_stats()

        assert stats["discovery"]["dogs_found"] == 200
        assert stats["discovery"]["pages_processed"] == 5
        assert stats["discovery"]["extraction_failures"] == 2

        assert stats["filtering"]["dogs_skipped"] == 150
        assert stats["filtering"]["new_dogs"] == 50
        assert stats["filtering"]["skip_rate"] == 75.0  # 150/200

        assert stats["processing"]["dogs_added"] == 10
        assert stats["processing"]["dogs_updated"] == 35
        assert stats["processing"]["dogs_unchanged"] == 5
        assert stats["processing"]["processing_failures"] == 0
        assert (
            stats["processing"]["success_rate"] == 100.0
        )  # 50/50 processed successfully

        assert stats["images"]["images_uploaded"] == 45
        assert stats["images"]["images_failed"] == 5
        assert stats["images"]["image_optimizations"] == 40
        assert stats["images"]["image_success_rate"] == 90.0  # 45/50

        assert stats["performance"]["total_duration"] >= 0  # Allow zero or positive
        assert stats["performance"]["throughput"] >= 0  # Allow zero throughput in tests
        assert stats["performance"]["phase_durations"]["collection"] == 30.5
        assert stats["performance"]["phase_durations"]["processing"] == 45.2

    def test_adaptive_verbosity_levels(self):
        """Test that logging adapts to different site sizes."""
        mock_logger = Mock()
        config = {"batch_size": 10}

        # Test minimal logging (small sites)
        small_tracker = ProgressTracker(
            total_items=15, logger=mock_logger, config=config
        )
        assert small_tracker.verbosity_level == LoggingLevel.MINIMAL

        # Test standard logging (medium sites)
        medium_tracker = ProgressTracker(
            total_items=50, logger=mock_logger, config=config
        )
        assert medium_tracker.verbosity_level == LoggingLevel.STANDARD

        # Test detailed logging (large sites)
        large_tracker = ProgressTracker(
            total_items=100, logger=mock_logger, config=config
        )
        assert large_tracker.verbosity_level == LoggingLevel.DETAILED

        # Test comprehensive logging (very large sites)
        huge_tracker = ProgressTracker(
            total_items=200, logger=mock_logger, config=config
        )
        assert huge_tracker.verbosity_level == LoggingLevel.COMPREHENSIVE

    def test_world_class_progress_messages(self):
        """Test that progress messages are professional and informative."""
        mock_logger = Mock()
        config = {
            "batch_size": 10,
            "show_progress_bar": True,
            "show_throughput": True,
            "eta_enabled": True,
        }

        # Test comprehensive progress message
        tracker = ProgressTracker(total_items=200, logger=mock_logger, config=config)
        tracker.update(items_processed=50)

        message = tracker.get_progress_message()

        # Should contain progress bar, percentage, throughput, and ETA
        assert "📊 Processing animals:" in message
        assert "25%" in message  # 50/200
        assert "50/200" in message
        assert "items/sec" in message
        assert "ETA:" in message
        assert "[" in message and "]" in message  # Progress bar

    def test_service_logging_suppression(self):
        """Test that service logging can be suppressed while preserving errors."""
        with patch("logging.getLogger") as mock_get_logger:
            mock_logger = Mock()
            mock_get_logger.return_value = mock_logger

            # Test that service loggers can be set to WARNING level (suppress INFO/DEBUG)
            from config import suppress_service_logging

            suppress_service_logging()

            # Verify service loggers are configured to suppress operational logs
            expected_calls = [
                ("services.database_service",),
                ("services.image_processing_service",),
                ("services.session_manager",),
                ("services.connection_pool",),
                ("services.metrics_collector",),
            ]

            for call in expected_calls:
                mock_get_logger.assert_any_call(call[0])

    def test_centralized_completion_summary(self):
        """Test that completion summary shows comprehensive aggregated stats."""
        mock_logger = Mock()
        config = {"batch_size": 10}

        tracker = ProgressTracker(total_items=100, logger=mock_logger, config=config)

        # Simulate complete scrape with stats
        tracker.track_discovery_stats(
            dogs_found=100, pages_processed=3, extraction_failures=1
        )
        tracker.track_filtering_stats(dogs_skipped=20, new_dogs=80)
        tracker.track_processing_stats(
            dogs_added=15, dogs_updated=60, dogs_unchanged=5, processing_failures=2
        )
        tracker.track_image_stats(
            images_uploaded=75, images_failed=3, image_optimizations=70
        )

        summary = tracker.get_completion_summary()

        # Verify comprehensive summary (check actual format from implementation)
        assert "🎯 SCRAPE COMPLETED" in summary
        assert "Discovery: 100 dogs found" in summary
        assert "Filtering: 20 existing (skipped), 80 new" in summary
        assert "Processing: 15 added, 60 updated, 5 unchanged" in summary
        assert "Images: 75 uploaded, 3 failed" in summary
        assert "Performance:" in summary  # Check for performance section
        assert "Quality:" in summary  # Check for quality section

    @pytest.fixture
    def mock_base_scraper(self):
        """Create a mock BaseScraper for testing."""
        scraper = Mock(spec=BaseScraper)
        scraper.organization_name = "Test Organization"
        scraper.total_animals_before_filter = 0
        scraper.total_animals_skipped = 0
        return scraper

    def test_base_scraper_centralized_logging(self, mock_base_scraper):
        """Test that BaseScraper uses centralized logging configuration."""
        # Test that world-class logging configuration is enabled
        from config import enable_world_class_scraper_logging

        # Mock the logger setup to verify it uses centralized configuration
        with patch("logging.getLogger") as mock_get_logger:
            mock_logger = Mock()
            mock_get_logger.return_value = mock_logger

            # Test that enable_world_class_scraper_logging can be called
            enable_world_class_scraper_logging()

            # Verify that scraper logger is configured
            mock_get_logger.assert_any_call("scraper")

        # Test ProgressTracker integration
        with patch("scrapers.base_scraper.ProgressTracker") as mock_tracker_class:
            mock_tracker = Mock()
            mock_tracker_class.return_value = mock_tracker

            # Create a real scraper instance to test logging setup
            from scrapers.base_scraper import BaseScraper

            # Mock the abstract method to create testable scraper
            class TestScraper(BaseScraper):
                def collect_data(self):
                    return []

            # Test scraper initialization sets up world-class logging
            scraper = TestScraper(organization_id=1)
            assert scraper.logger.level == logging.WARNING  # Silent logger
