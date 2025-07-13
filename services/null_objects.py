"""
Null Object implementations for services.

These classes implement the same interface as their real counterparts but
perform no-op operations, eliminating the need for conditional checks.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional


class NullMetricsCollector:
    """A Null Object implementation for the MetricsCollector service."""

    def __init__(self, logger: Optional[logging.Logger] = None):
        """Initialize NullMetricsCollector with minimal setup."""
        self.logger = logger or logging.getLogger(__name__)
        self.logger.info("NullMetricsCollector initialized - metrics collection disabled")

    def track_retry(self, success: bool) -> None:
        """Track a retry attempt - no-op implementation."""
        pass

    def track_phase_timing(self, phase: str, duration: float) -> None:
        """Track phase timing - no-op implementation."""
        pass

    def track_animal_counts(self, before_filter: int, skipped: int) -> None:
        """Track animal counts - no-op implementation."""
        pass

    def calculate_scrape_duration(self, start_time: datetime, end_time: datetime) -> float:
        """Calculate scrape duration - returns basic calculation."""
        return (end_time - start_time).total_seconds()

    def assess_data_quality(self, animals_data: List[Dict[str, Any]]) -> float:
        """Assess data quality - returns neutral score."""
        return 0.0

    def log_detailed_metrics(self, metrics: Dict[str, Any]) -> None:
        """Log detailed metrics - no-op implementation."""
        pass

    def get_retry_metrics(self) -> Dict[str, Any]:
        """Get retry metrics - returns empty dict."""
        return {}

    def get_phase_timings(self) -> Dict[str, float]:
        """Get phase timings - returns empty dict."""
        return {}

    def get_animal_count_metrics(self) -> Dict[str, Any]:
        """Get animal count metrics - returns empty dict."""
        return {}

    def reset_metrics(self) -> None:
        """Reset metrics - no-op implementation."""
        pass

    def generate_comprehensive_metrics(self, **kwargs) -> Dict[str, Any]:
        """Generate comprehensive metrics - returns empty dict."""
        return {}
