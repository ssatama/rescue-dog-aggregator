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

    def __init__(
        self, total_items: int, logger: logging.Logger, config: Dict[str, Any]
    ):
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

        # Determine verbosity level - check config override first
        config_verbosity = config.get("verbosity_level", "auto")
        if config_verbosity in ["minimal", "standard", "detailed", "comprehensive"]:
            # Use forced verbosity from config for consistent logging
            self.verbosity_level = LoggingLevel(config_verbosity)
        else:
            # Use automatic determination based on total items
            self.verbosity_level = self._determine_logging_level(total_items)

        # Operation tracking
        self.operation_counts: Dict[str, int] = {}
        self.last_progress_logged = 0

        # Comprehensive stats tracking for world-class logging
        self.stats = {
            "discovery": {
                "dogs_found": 0,
                "pages_processed": 0,
                "extraction_failures": 0,
                "success_rate": 0.0,
            },
            "filtering": {"dogs_skipped": 0, "new_dogs": 0, "skip_rate": 0.0},
            "processing": {
                "dogs_added": 0,
                "dogs_updated": 0,
                "dogs_unchanged": 0,
                "processing_failures": 0,
                "success_rate": 0.0,
            },
            "images": {
                "images_uploaded": 0,
                "images_failed": 0,
                "image_optimizations": 0,
                "image_success_rate": 0.0,
            },
            "performance": {
                "total_duration": 0.0,
                "throughput": 0.0,
                "phase_durations": {},
                "memory_usage": 0,
                "retry_attempts": 0,
            },
            "quality": {
                "data_quality_score": 0.0,
                "completion_rate": 0.0,
                "error_rate": 0.0,
            },
        }

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
            breakdown = ", ".join(
                [f"{count} {op}" for op, count in self.operation_counts.items()]
            )
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

    def track_discovery_stats(
        self, dogs_found: int, pages_processed: int = 0, extraction_failures: int = 0
    ) -> None:
        """Track discovery phase statistics.

        Args:
            dogs_found: Total number of dogs discovered on website
            pages_processed: Number of pages processed during discovery
            extraction_failures: Number of dogs that failed extraction
        """
        self.stats["discovery"]["dogs_found"] = dogs_found
        self.stats["discovery"]["pages_processed"] = pages_processed
        self.stats["discovery"]["extraction_failures"] = extraction_failures

        # Calculate success rate
        total_attempts = dogs_found + extraction_failures
        if total_attempts > 0:
            self.stats["discovery"]["success_rate"] = (
                dogs_found / total_attempts
            ) * 100.0

    def track_filtering_stats(self, dogs_skipped: int, new_dogs: int) -> None:
        """Track filtering phase statistics.

        Args:
            dogs_skipped: Number of existing dogs skipped
            new_dogs: Number of new dogs to process
        """
        self.stats["filtering"]["dogs_skipped"] = dogs_skipped
        self.stats["filtering"]["new_dogs"] = new_dogs

        # Calculate skip rate
        total_dogs = dogs_skipped + new_dogs
        if total_dogs > 0:
            self.stats["filtering"]["skip_rate"] = (dogs_skipped / total_dogs) * 100.0

    def track_processing_stats(
        self,
        dogs_added: int = 0,
        dogs_updated: int = 0,
        dogs_unchanged: int = 0,
        processing_failures: int = 0,
    ) -> None:
        """Track processing phase statistics.

        Args:
            dogs_added: Number of new dogs added to database
            dogs_updated: Number of existing dogs updated
            dogs_unchanged: Number of dogs with no changes
            processing_failures: Number of dogs that failed processing
        """
        self.stats["processing"]["dogs_added"] = dogs_added
        self.stats["processing"]["dogs_updated"] = dogs_updated
        self.stats["processing"]["dogs_unchanged"] = dogs_unchanged
        self.stats["processing"]["processing_failures"] = processing_failures

        # Calculate success rate
        total_attempted = (
            dogs_added + dogs_updated + dogs_unchanged + processing_failures
        )
        successful = dogs_added + dogs_updated + dogs_unchanged
        if total_attempted > 0:
            self.stats["processing"]["success_rate"] = (
                successful / total_attempted
            ) * 100.0

    def track_image_stats(
        self,
        images_uploaded: int = 0,
        images_failed: int = 0,
        image_optimizations: int = 0,
    ) -> None:
        """Track image processing statistics.

        Args:
            images_uploaded: Number of images successfully uploaded
            images_failed: Number of image uploads that failed
            image_optimizations: Number of images optimized/compressed
        """
        self.stats["images"]["images_uploaded"] = images_uploaded
        self.stats["images"]["images_failed"] = images_failed
        self.stats["images"]["image_optimizations"] = image_optimizations

        # Calculate success rate
        total_images = images_uploaded + images_failed
        if total_images > 0:
            self.stats["images"]["image_success_rate"] = (
                images_uploaded / total_images
            ) * 100.0

    def track_performance_stats(
        self,
        phase_durations: Dict[str, float] = None,
        memory_usage: int = 0,
        retry_attempts: int = 0,
        total_duration: float = None,
    ) -> None:
        """Track performance statistics.

        Args:
            phase_durations: Dictionary of phase names to duration in seconds
            memory_usage: Peak memory usage in MB
            retry_attempts: Total number of retry attempts
            total_duration: Override duration (use when start_time doesn't capture full scrape)
        """
        if phase_durations:
            self.stats["performance"]["phase_durations"].update(phase_durations)

        if memory_usage > 0:
            self.stats["performance"]["memory_usage"] = memory_usage

        if retry_attempts > 0:
            self.stats["performance"]["retry_attempts"] = retry_attempts

        # Update total duration - use provided value or calculate from start_time
        if total_duration is not None:
            elapsed = total_duration
        else:
            elapsed = (datetime.now() - self.start_time).total_seconds()
        self.stats["performance"]["total_duration"] = elapsed
        self.stats["performance"]["throughput"] = self.total_items / max(elapsed, 0.1)

    def track_quality_stats(
        self, data_quality_score: float, completion_rate: float = 100.0
    ) -> None:
        """Track quality statistics.

        Args:
            data_quality_score: Overall data quality score (0.0-1.0)
            completion_rate: Percentage of scrape completed successfully
        """
        self.stats["quality"]["data_quality_score"] = data_quality_score
        self.stats["quality"]["completion_rate"] = completion_rate

        # Calculate error rate based on processing failures
        total_dogs = (
            self.stats["processing"]["dogs_added"]
            + self.stats["processing"]["dogs_updated"]
            + self.stats["processing"]["dogs_unchanged"]
            + self.stats["processing"]["processing_failures"]
        )

        if total_dogs > 0:
            self.stats["quality"]["error_rate"] = (
                self.stats["processing"]["processing_failures"] / total_dogs
            ) * 100.0

    def get_comprehensive_stats(self) -> Dict[str, Any]:
        """Get all comprehensive statistics.

        Returns:
            Dictionary containing all tracked statistics
        """
        return self.stats.copy()

    def get_completion_summary(self) -> str:
        """Generate world-class completion summary with comprehensive stats.

        Returns:
            Professional completion summary with all key metrics
        """
        stats = self.stats
        duration = stats["performance"]["total_duration"]

        summary_lines = [
            "🎯 SCRAPE COMPLETED",
            "=" * 50,
            f"📊 Discovery: {stats['discovery']['dogs_found']} dogs found, {stats['discovery']['extraction_failures']} extraction failures",
            f"🔍 Filtering: {stats['filtering']['dogs_skipped']} existing (skipped), {stats['filtering']['new_dogs']} new ({stats['filtering']['skip_rate']:.1f}% skip rate)",
            f"💾 Processing: {stats['processing']['dogs_added']} added, {stats['processing']['dogs_updated']} updated, {stats['processing']['dogs_unchanged']} unchanged",
            f"🖼️  Images: {stats['images']['images_uploaded']} uploaded, {stats['images']['images_failed']} failed ({stats['images']['image_success_rate']:.1f}% success)",
            f"⚡ Performance: {duration:.1f}s duration, {stats['performance']['throughput']:.1f} dogs/sec",
            f"🏆 Quality: {stats['quality']['data_quality_score']:.3f} quality score, {stats['quality']['completion_rate']:.1f}% completion",
            "=" * 50,
        ]

        # Add phase durations if available
        if stats["performance"]["phase_durations"]:
            summary_lines.append("📋 Phase Breakdown:")
            for phase, duration in stats["performance"]["phase_durations"].items():
                summary_lines.append(f"   • {phase}: {duration:.1f}s")

        # Add memory usage if tracked
        if stats["performance"]["memory_usage"] > 0:
            summary_lines.append(
                f"💾 Peak Memory: {stats['performance']['memory_usage']} MB"
            )

        # Add retry information if any
        if stats["performance"]["retry_attempts"] > 0:
            summary_lines.append(
                f"🔄 Retry Attempts: {stats['performance']['retry_attempts']}"
            )

        return "\n".join(summary_lines)

    def log_phase_start(self, phase_name: str) -> None:
        """Log the start of a scrape phase with appropriate verbosity.

        Args:
            phase_name: Name of the phase starting
        """
        if self.verbosity_level in [LoggingLevel.DETAILED, LoggingLevel.COMPREHENSIVE]:
            self.logger.info(f"🚀 Starting {phase_name} phase...")
        elif self.verbosity_level == LoggingLevel.STANDARD:
            self.logger.info(f"▶️  {phase_name}")

    def log_phase_complete(
        self, phase_name: str, duration: float, summary: str = ""
    ) -> None:
        """Log the completion of a scrape phase.

        Args:
            phase_name: Name of the completed phase
            duration: Duration of the phase in seconds
            summary: Optional summary of phase results
        """
        if self.verbosity_level == LoggingLevel.COMPREHENSIVE:
            message = f"✅ {phase_name} complete: {duration:.1f}s"
            if summary:
                message += f" | {summary}"
            self.logger.info(message)
        elif self.verbosity_level in [LoggingLevel.DETAILED, LoggingLevel.STANDARD]:
            self.logger.info(f"✅ {phase_name}: {duration:.1f}s")

    def log_completion_summary(self) -> None:
        """Log the final completion summary with comprehensive stats."""
        if self.verbosity_level in [LoggingLevel.DETAILED, LoggingLevel.COMPREHENSIVE]:
            summary = self.get_completion_summary()
            for line in summary.split("\n"):
                self.logger.info(line)
        else:
            # Even minimal logging shows basic completion stats
            stats = self.stats
            self.logger.info(
                f"✅ Complete: {stats['processing']['dogs_added']} added, "
                f"{stats['processing']['dogs_updated']} updated, "
                f"{stats['performance']['total_duration']:.1f}s"
            )
