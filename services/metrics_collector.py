"""
MetricsCollector - Extracted from BaseScraper for Single Responsibility.

Handles all metrics collection and calculation including:
- Retry attempt/success tracking
- Phase timing collection
- Performance metric calculations
- Quality score assessment
- Detailed metrics logging

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional


class MetricsCollector:
    """Service for metrics collection and calculation extracted from BaseScraper."""

    def __init__(self, logger: Optional[logging.Logger] = None):
        """Initialize MetricsCollector with minimal dependencies.

        Args:
            logger: Optional logger instance
        """
        self.logger = logger or logging.getLogger(__name__)

        # Initialize metrics tracking (immutable pattern)
        self._retry_attempts = 0
        self._retry_successes = 0
        self._phase_timings = {}
        self._animal_counts = {}

    def track_retry(self, success: bool) -> None:
        """Track a retry attempt and its outcome.

        Args:
            success: True if the retry was successful, False otherwise
        """
        self._retry_attempts += 1
        if success:
            self._retry_successes += 1

    def track_phase_timing(self, phase: str, duration: float) -> None:
        """Track the duration of a specific phase.

        Args:
            phase: Name of the phase (e.g., 'data_collection', 'database_operations')
            duration: Duration in seconds
        """
        self._phase_timings[phase] = duration

    def track_animal_counts(self, before_filter: int, skipped: int) -> None:
        """Track animal count metrics for filtering analysis.

        Args:
            before_filter: Total animals found before filtering
            skipped: Number of animals skipped due to filtering
        """
        self._animal_counts = {"total_before_filter": before_filter, "total_skipped": skipped, "processing_efficiency": self._calculate_processing_efficiency(before_filter, skipped)}

    def calculate_scrape_duration(self, start_time: datetime, end_time: datetime) -> float:
        """Calculate scrape duration in seconds.

        Args:
            start_time: When the scrape started
            end_time: When the scrape ended

        Returns:
            Duration in seconds as float
        """
        duration = end_time - start_time
        return duration.total_seconds()

    def assess_data_quality(self, animals_data: List[Dict[str, Any]]) -> float:
        """Assess the quality of scraped animal data.

        Args:
            animals_data: List of animal data dictionaries

        Returns:
            Quality score between 0 and 1 (1 = perfect quality)
        """
        if not animals_data:
            return 0.0

        total_score = 0.0
        required_fields = ["name", "breed", "age_text", "external_id"]
        optional_fields = ["sex", "size", "primary_image_url", "adoption_url"]

        for animal in animals_data:
            animal_score = 0.0

            # Check required fields (70% of score)
            required_present = 0
            for field in required_fields:
                if animal.get(field) and str(animal[field]).strip():
                    required_present += 1
            animal_score += (required_present / len(required_fields)) * 0.7

            # Check optional fields (30% of score)
            optional_present = 0
            for field in optional_fields:
                if animal.get(field) and str(animal[field]).strip():
                    optional_present += 1
            animal_score += (optional_present / len(optional_fields)) * 0.3

            total_score += animal_score

        final_score = total_score / len(animals_data)
        return round(final_score, 3)

    def log_detailed_metrics(self, metrics: Dict[str, Any]) -> None:
        """Log detailed metrics in a structured format.

        Args:
            metrics: Dictionary containing comprehensive metrics
        """
        try:
            self.logger.info("=== DETAILED SCRAPE METRICS ===")

            # Core metrics
            self.logger.info(f"Animals Found: {metrics.get('animals_found', 0)}")
            self.logger.info(f"Animals Added: {metrics.get('animals_added', 0)}")
            self.logger.info(f"Animals Updated: {metrics.get('animals_updated', 0)}")
            self.logger.info(f"Animals Unchanged: {metrics.get('animals_unchanged', 0)}")

            # Image metrics
            if "images_uploaded" in metrics or "images_failed" in metrics:
                self.logger.info(f"Images Uploaded: {metrics.get('images_uploaded', 0)}")
                self.logger.info(f"Images Failed: {metrics.get('images_failed', 0)}")

            # Performance metrics
            if "duration_seconds" in metrics:
                self.logger.info(f"Duration: {metrics['duration_seconds']:.1f}s")
            if "data_quality_score" in metrics:
                self.logger.info(f"Data Quality Score: {metrics['data_quality_score']:.3f}")

            # Retry metrics
            retry_metrics = self.get_retry_metrics()
            if retry_metrics["retry_attempts"] > 0:
                self.logger.info(f"Retry Attempts: {retry_metrics['retry_attempts']}")
                self.logger.info(f"Retry Successes: {retry_metrics['retry_successes']}")
                self.logger.info(f"Retry Failure Rate: {retry_metrics['retry_failure_rate']:.3f}")

            # Phase timings
            phase_timings = self.get_phase_timings()
            if phase_timings:
                self.logger.info("Phase Timings:")
                for phase, duration in phase_timings.items():
                    self.logger.info(f"  {phase}: {duration:.2f}s")

            # Operational metrics
            if "skip_existing_animals" in metrics:
                self.logger.info(f"Skip Existing Animals: {metrics['skip_existing_animals']}")
            if "batch_size" in metrics:
                self.logger.info(f"Batch Size: {metrics['batch_size']}")
            if "rate_limit_delay" in metrics:
                self.logger.info(f"Rate Limit Delay: {metrics['rate_limit_delay']}s")

            self.logger.info("=== END METRICS ===")

        except Exception as e:
            self.logger.error(f"Error logging detailed metrics: {e}")

    def get_retry_metrics(self) -> Dict[str, Any]:
        """Get retry-related metrics.

        Returns:
            Dictionary with retry statistics
        """
        return {"retry_attempts": self._retry_attempts, "retry_successes": self._retry_successes, "retry_failure_rate": self._calculate_retry_failure_rate()}

    def get_phase_timings(self) -> Dict[str, float]:
        """Get phase timing metrics.

        Returns:
            Dictionary with phase durations
        """
        return self._phase_timings.copy()  # Return copy for immutability

    def get_animal_count_metrics(self) -> Dict[str, Any]:
        """Get animal count and filtering metrics.

        Returns:
            Dictionary with animal count statistics
        """
        return self._animal_counts.copy()  # Return copy for immutability

    def reset_metrics(self) -> None:
        """Reset all metrics to initial state."""
        self._retry_attempts = 0
        self._retry_successes = 0
        self._phase_timings = {}
        self._animal_counts = {}

    def _calculate_retry_failure_rate(self) -> float:
        """Calculate retry failure rate (pure function).

        Returns:
            Failure rate between 0 and 1
        """
        if self._retry_attempts == 0:
            return 0.0

        failures = self._retry_attempts - self._retry_successes
        return failures / self._retry_attempts

    def _calculate_processing_efficiency(self, before_filter: int, skipped: int) -> float:
        """Calculate processing efficiency (pure function).

        Args:
            before_filter: Total animals before filtering
            skipped: Number of animals skipped

        Returns:
            Efficiency score between 0 and 1
        """
        if before_filter == 0:
            return 1.0  # Perfect efficiency if no animals to process

        processed = before_filter - skipped
        return processed / before_filter

    def generate_comprehensive_metrics(
        self,
        animals_found: int,
        animals_added: int,
        animals_updated: int,
        animals_unchanged: int,
        images_uploaded: int,
        images_failed: int,
        duration_seconds: float,
        quality_score: float,
        **additional_metrics,
    ) -> Dict[str, Any]:
        """Generate comprehensive metrics dictionary (pure function).

        Args:
            animals_found: Number of animals found
            animals_added: Number of animals added
            animals_updated: Number of animals updated
            animals_unchanged: Number of animals unchanged
            images_uploaded: Number of images uploaded successfully
            images_failed: Number of image uploads that failed
            duration_seconds: Total scrape duration
            quality_score: Data quality score
            **additional_metrics: Additional metrics to include

        Returns:
            Comprehensive metrics dictionary
        """
        base_metrics = {
            "animals_found": animals_found,
            "animals_added": animals_added,
            "animals_updated": animals_updated,
            "animals_unchanged": animals_unchanged,
            "images_uploaded": images_uploaded,
            "images_failed": images_failed,
            "duration_seconds": duration_seconds,
            "data_quality_score": quality_score,
        }

        # Add retry metrics
        retry_metrics = self.get_retry_metrics()
        base_metrics.update(retry_metrics)

        # Add phase timings
        base_metrics["phase_timings"] = self.get_phase_timings()

        # Add animal count metrics
        animal_metrics = self.get_animal_count_metrics()
        base_metrics.update(animal_metrics)

        # Add additional metrics
        base_metrics.update(additional_metrics)

        return base_metrics
