"""
Statistics tracker for LLM dog profiler.

Following CLAUDE.md principles:
- Single responsibility: Track processing metrics
- Immutable data structures where possible
- Clear interfaces
"""

from typing import Any, Dict, List


class StatisticsTracker:
    """Tracks processing statistics for dog profiler."""

    def __init__(self):
        """Initialize statistics tracker."""
        self.processed_count = 0
        self.success_count = 0
        self.error_count = 0
        self.errors: List[Dict[str, Any]] = []

    def record_success(self) -> None:
        """Record a successful processing."""
        self.processed_count += 1
        self.success_count += 1

    def record_error(self, error_info: Dict[str, Any]) -> None:
        """
        Record a processing error.

        Args:
            error_info: Dictionary with error details
        """
        self.processed_count += 1
        self.error_count += 1
        self.errors.append(error_info)

    def get_summary(self) -> Dict[str, Any]:
        """
        Get processing summary.

        Returns:
            Summary statistics dictionary
        """
        return {
            "processed": self.processed_count,
            "successful": self.success_count,
            "failed": self.error_count,
            "success_rate": (
                self.success_count / self.processed_count
                if self.processed_count > 0
                else 0
            ),
            "errors": self.errors[:10],  # First 10 errors
        }

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get processing statistics (alias for get_summary).

        Returns:
            Statistics dictionary
        """
        return self.get_summary()

    def reset(self) -> None:
        """Reset all statistics."""
        self.processed_count = 0
        self.success_count = 0
        self.error_count = 0
        self.errors = []
