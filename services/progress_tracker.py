"""
ProgressTracker - World-class logging service with adaptive verbosity.

Addresses the silent processing issue in BaseScraper._process_animals_data()
where large sites (100+ animals) provide no feedback during long operations.

Features:
- Adaptive verbosity levels based on site size
- Progress bars and ETA for large sites
- Throughput metrics (animals/sec, images/sec)
- Batch progress summaries
- Smart logging decisions based on processing scale
"""

import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Dict, Optional


class LoggingLevel(Enum):
    """Adaptive logging levels based on processing scale."""

    MINIMAL = "minimal"  # 1-25 animals: Start/end only
    STANDARD = "standard"  # 26-75 animals: Batch updates every 25
    DETAILED = "detailed"  # 76-150 animals: Progress every 10, throughput
    COMPREHENSIVE = "comprehensive"  # 150+ animals: Progress bars, ETA, real-time stats


class ProgressTracker:
    """Tracks processing progress with adaptive verbosity and world-class logging."""

    def __init__(self, total_items: int, logger: logging.Logger, config: Dict[str, Any]):
        """Initialize progress tracker with adaptive logging level.

        Args:
            total_items: Total number of items to process
            logger: Logger instance for output
            config: Configuration dictionary with logging settings
        """
        self.total_items = total_items
        self.processed_items = 0
        self.logger = logger
        self.start_time = datetime.now()

        # Configuration
        self.batch_size = config.get("batch_size", 10)
        self.show_progress_bar = config.get("show_progress_bar", True)
        self.show_throughput = config.get("show_throughput", True)
        self.eta_enabled = config.get("eta_enabled", True)

        # Determine verbosity level based on total items
        self.verbosity_level = self._determine_logging_level(total_items)

        # Operation tracking
        self.operation_counts: Dict[str, int] = {}
        self.last_progress_logged = 0

    def _determine_logging_level(self, total_items: int) -> LoggingLevel:
        """Determine appropriate logging level based on processing scale.

        Args:
            total_items: Total number of items to process

        Returns:
            Appropriate LoggingLevel for the scale
        """
        if total_items <= 25:
            return LoggingLevel.MINIMAL
        elif total_items <= 75:
            return LoggingLevel.STANDARD
        elif total_items <= 150:
            return LoggingLevel.DETAILED
        else:
            return LoggingLevel.COMPREHENSIVE

    def update(self, items_processed: int = 1, operation_type: str = "item") -> None:
        """Update progress tracking.

        Args:
            items_processed: Number of items processed in this update
            operation_type: Type of operation (animal_save, image_upload, etc.)
        """
        self.processed_items += items_processed

        # Track operation counts
        if operation_type not in self.operation_counts:
            self.operation_counts[operation_type] = 0
        self.operation_counts[operation_type] += items_processed

    def track_operation(self, operation_type: str, count: int = 1) -> None:
        """Track operation statistics without affecting progress count.

        This method allows tracking operations (like image uploads) for statistical
        purposes without adding them to the overall progress percentage calculation.

        Args:
            operation_type: Type of operation (image_upload, etc.)
            count: Number of operations to track
        """
        # Track operation counts only (don't affect processed_items)
        if operation_type not in self.operation_counts:
            self.operation_counts[operation_type] = 0
        self.operation_counts[operation_type] += count

    def should_log_progress(self) -> bool:
        """Determine if progress should be logged based on verbosity level and batch size.

        Returns:
            True if progress should be logged, False otherwise
        """
        # MINIMAL level: no progress logging during processing
        if self.verbosity_level == LoggingLevel.MINIMAL:
            return False

        # Check if we've processed enough items since last log
        items_since_last_log = self.processed_items - self.last_progress_logged
        return items_since_last_log >= self.batch_size

    def log_batch_progress(self) -> None:
        """Mark that progress has been logged (resets the flag)."""
        self.last_progress_logged = self.processed_items

    def get_throughput(self) -> float:
        """Calculate current throughput (items per second).

        Returns:
            Items processed per second
        """
        elapsed_seconds = (datetime.now() - self.start_time).total_seconds()
        if elapsed_seconds <= 0:
            return 0.0
        return self.processed_items / elapsed_seconds

    def get_eta(self) -> Optional[datetime]:
        """Calculate estimated time of completion.

        Returns:
            Estimated completion time, or None if cannot be calculated
        """
        if not self.eta_enabled:
            return None

        throughput = self.get_throughput()
        if throughput <= 0:
            return None

        remaining_items = self.total_items - self.processed_items
        if remaining_items <= 0:
            return datetime.now()  # Already complete

        seconds_remaining = remaining_items / throughput
        return datetime.now() + timedelta(seconds=seconds_remaining)

    @property
    def completion_percentage(self) -> float:
        """Calculate completion percentage.

        Returns:
            Percentage complete (0.0 to 100.0)
        """
        if self.total_items == 0:
            return 100.0
        return (self.processed_items / self.total_items) * 100.0

    def get_operation_count(self, operation_type: str) -> int:
        """Get count for specific operation type.

        Args:
            operation_type: Type of operation to query

        Returns:
            Number of operations of this type processed
        """
        return self.operation_counts.get(operation_type, 0)

    def get_progress_message(self) -> str:
        """Generate world-class progress message based on verbosity level.

        Returns:
            Formatted progress message
        """
        completion_pct = self.completion_percentage

        if self.verbosity_level == LoggingLevel.COMPREHENSIVE:
            return self._get_comprehensive_message(completion_pct)
        elif self.verbosity_level == LoggingLevel.DETAILED:
            return self._get_detailed_message(completion_pct)
        elif self.verbosity_level == LoggingLevel.STANDARD:
            return self._get_standard_message(completion_pct)
        else:  # MINIMAL
            return self._get_minimal_message()

    def _get_comprehensive_message(self, completion_pct: float) -> str:
        """Generate comprehensive progress message with all features."""
        progress_bar = self._generate_progress_bar(completion_pct)
        throughput = self.get_throughput()
        eta = self.get_eta()

        message = f"📊 Processing animals: {progress_bar} {completion_pct:.0f}% ({self.processed_items}/{self.total_items})"

        if self.show_throughput and throughput > 0:
            message += f"\n⚡ Throughput: {throughput:.1f} items/sec"

        if eta:
            eta_str = eta.strftime("%H:%M:%S")
            message += f" | ETA: {eta_str}"

        # Add operation breakdown
        if len(self.operation_counts) > 1:
            breakdown = ", ".join([f"{count} {op}" for op, count in self.operation_counts.items()])
            message += f"\n🎯 Operations: {breakdown}"

        return message

    def _get_detailed_message(self, completion_pct: float) -> str:
        """Generate detailed progress message with throughput."""
        throughput = self.get_throughput()
        message = f"📈 Progress: {completion_pct:.0f}% ({self.processed_items}/{self.total_items})"

        if self.show_throughput and throughput > 0:
            message += f" | {throughput:.1f} items/sec"

        return message

    def _get_standard_message(self, completion_pct: float) -> str:
        """Generate standard progress message."""
        return f"🔄 Processed: {self.processed_items}/{self.total_items} ({completion_pct:.0f}%)"

    def _get_minimal_message(self) -> str:
        """Generate minimal progress message."""
        return f"Processing {self.total_items} items..."

    def _generate_progress_bar(self, completion_pct: float, width: int = 40) -> str:
        """Generate visual progress bar.

        Args:
            completion_pct: Completion percentage
            width: Width of progress bar in characters

        Returns:
            Visual progress bar string
        """
        if not self.show_progress_bar:
            return ""

        filled = int(width * completion_pct / 100)
        bar = "█" * filled + "░" * (width - filled)
        return f"[{bar}]"
