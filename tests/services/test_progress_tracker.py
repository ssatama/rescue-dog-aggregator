"""
Test for ProgressTracker service - world-class logging with adaptive verbosity.

This test addresses the silent processing issue where _process_animals_data()
provides no feedback during long-running operations (10-20 minutes of silence
for large sites).
"""

from datetime import datetime, timedelta
from unittest.mock import Mock

import pytest

from services.progress_tracker import LoggingLevel, ProgressTracker


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestProgressTracker:
    """Test for ProgressTracker service with adaptive verbosity levels."""

    @pytest.fixture
    def mock_logger(self):
        """Create a mock logger for testing."""
        return Mock()

    @pytest.fixture
    def default_config(self):
        """Default configuration for testing."""
        return {
            "batch_size": 10,
            "show_progress_bar": True,
            "show_throughput": True,
            "eta_enabled": True,
            "verbosity_level": "auto",
        }

    def test_should_select_minimal_level_for_small_sites(self, mock_logger, default_config):
        """Test that small sites (1-25 animals) use MINIMAL logging level.

        EXPECTED BEHAVIOR:
        - 1-25 animals: MINIMAL level (start/end only)
        - No progress updates during processing
        - Minimal verbosity for fast operations
        """
        # Test edge cases
        progress_5 = ProgressTracker(5, mock_logger, default_config)
        progress_25 = ProgressTracker(25, mock_logger, default_config)

        assert progress_5.verbosity_level == LoggingLevel.MINIMAL
        assert progress_25.verbosity_level == LoggingLevel.MINIMAL

        # Should not log progress for small sites
        assert not progress_5.should_log_progress()
        assert not progress_25.should_log_progress()

    def test_should_select_standard_level_for_medium_sites(self, mock_logger, default_config):
        """Test that medium sites (26-75 animals) use STANDARD logging level."""
        progress_26 = ProgressTracker(26, mock_logger, default_config)
        progress_50 = ProgressTracker(50, mock_logger, default_config)
        progress_75 = ProgressTracker(75, mock_logger, default_config)

        assert progress_26.verbosity_level == LoggingLevel.STANDARD
        assert progress_50.verbosity_level == LoggingLevel.STANDARD
        assert progress_75.verbosity_level == LoggingLevel.STANDARD

    def test_should_select_detailed_level_for_large_sites(self, mock_logger, default_config):
        """Test that large sites (76-150 animals) use DETAILED logging level."""
        progress_76 = ProgressTracker(76, mock_logger, default_config)
        progress_100 = ProgressTracker(100, mock_logger, default_config)
        progress_150 = ProgressTracker(150, mock_logger, default_config)

        assert progress_76.verbosity_level == LoggingLevel.DETAILED
        assert progress_100.verbosity_level == LoggingLevel.DETAILED
        assert progress_150.verbosity_level == LoggingLevel.DETAILED

    def test_should_select_comprehensive_level_for_massive_sites(self, mock_logger, default_config):
        """Test that massive sites (150+ animals) use COMPREHENSIVE logging level."""
        progress_151 = ProgressTracker(151, mock_logger, default_config)
        progress_500 = ProgressTracker(500, mock_logger, default_config)
        progress_1000 = ProgressTracker(1000, mock_logger, default_config)

        assert progress_151.verbosity_level == LoggingLevel.COMPREHENSIVE
        assert progress_500.verbosity_level == LoggingLevel.COMPREHENSIVE
        assert progress_1000.verbosity_level == LoggingLevel.COMPREHENSIVE

    def test_should_update_progress_and_track_completion(self, mock_logger, default_config):
        """Test basic progress update functionality."""
        progress = ProgressTracker(100, mock_logger, default_config)

        # Initial state
        assert progress.processed_items == 0
        assert progress.completion_percentage == 0.0

        # Update progress
        progress.update(items_processed=10)
        assert progress.processed_items == 10
        assert progress.completion_percentage == 10.0

        # Update with different operation type
        progress.update(items_processed=5, operation_type="image_upload")
        assert progress.processed_items == 15
        assert progress.completion_percentage == 15.0

    def test_should_calculate_throughput_accurately(self, mock_logger, default_config):
        """Test throughput calculation (items per second)."""
        progress = ProgressTracker(100, mock_logger, default_config)

        # Simulate processing with time delay
        start_time = datetime.now()
        progress.start_time = start_time - timedelta(seconds=10)  # 10 seconds ago
        progress.update(items_processed=50)  # 50 items in 10 seconds

        throughput = progress.get_throughput()
        assert throughput == pytest.approx(5.0, rel=0.1)  # 5 items/second

    def test_should_calculate_eta_accurately(self, mock_logger, default_config):
        """Test ETA calculation based on current throughput."""
        progress = ProgressTracker(100, mock_logger, default_config)

        # Simulate 25% completion in 10 seconds
        progress.start_time = datetime.now() - timedelta(seconds=10)
        progress.update(items_processed=25)

        eta = progress.get_eta()
        assert eta is not None

        # Should estimate ~30 more seconds (75 items at 2.5 items/sec)
        expected_eta = datetime.now() + timedelta(seconds=30)

        # Check that ETA is within reasonable range (allow 10 seconds tolerance)
        eta_diff = abs((eta - expected_eta).total_seconds())
        assert eta_diff < 10, f"ETA calculation off by {eta_diff} seconds"

    def test_should_determine_when_to_log_progress_based_on_batch_size(self, mock_logger, default_config):
        """Test progress logging decision based on batch size and verbosity level."""
        default_config["batch_size"] = 20
        progress = ProgressTracker(100, mock_logger, default_config)  # DETAILED level

        # Should not log initially
        assert not progress.should_log_progress()

        # Should not log before batch size
        progress.update(items_processed=10)
        assert not progress.should_log_progress()

        # Should log at batch size
        progress.update(items_processed=10)  # Total: 20
        assert progress.should_log_progress()

        # Should reset logging flag after logging
        progress.log_batch_progress()
        assert not progress.should_log_progress()

    def test_should_generate_comprehensive_progress_message(self, mock_logger, default_config):
        """Test generation of world-class progress messages."""
        progress = ProgressTracker(200, mock_logger, default_config)
        progress.start_time = datetime.now() - timedelta(seconds=16)
        progress.update(items_processed=100)

        message = progress.get_progress_message()

        # Should include progress bar, percentage, throughput, and ETA
        assert "[" in message  # Progress bar
        assert "50%" in message  # Percentage
        assert "100/200" in message  # Current/total
        assert "items/sec" in message or "/sec" in message  # Throughput
        assert "ETA:" in message  # ETA

    def test_should_handle_zero_throughput_gracefully(self, mock_logger, default_config):
        """Test handling of zero throughput (no items processed yet)."""
        progress = ProgressTracker(100, mock_logger, default_config)

        # No items processed yet
        throughput = progress.get_throughput()
        assert throughput == 0.0

        eta = progress.get_eta()
        assert eta is None  # Cannot estimate without throughput

    def test_should_respect_custom_batch_size_configuration(self, mock_logger):
        """Test that batch size configuration is respected."""
        config_batch_5 = {"batch_size": 5}
        config_batch_25 = {"batch_size": 25}

        progress_5 = ProgressTracker(100, mock_logger, config_batch_5)
        progress_25 = ProgressTracker(100, mock_logger, config_batch_25)

        assert progress_5.batch_size == 5
        assert progress_25.batch_size == 25

    def test_should_track_different_operation_types(self, mock_logger, default_config):
        """Test tracking of different operation types (animals, images, etc.)."""
        progress = ProgressTracker(100, mock_logger, default_config)

        # Track different operation types
        progress.update(items_processed=10, operation_type="animal_save")
        progress.update(items_processed=5, operation_type="image_upload")
        progress.update(items_processed=2, operation_type="database_update")

        # Should track total items regardless of operation type
        assert progress.processed_items == 17

        # Should track operation counts separately
        assert progress.get_operation_count("animal_save") == 10
        assert progress.get_operation_count("image_upload") == 5
        assert progress.get_operation_count("database_update") == 2
