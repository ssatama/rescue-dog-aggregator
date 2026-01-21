"""
SystemMonitoringService - Extracted from emergency_operations.py.

Handles system health monitoring and metrics calculation.
Follows CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Small functions <50 lines each
"""

import logging
from datetime import datetime, timedelta
from typing import Any

from management.services.database_service import DatabaseService


class SystemMonitoringService:
    """Service for system health monitoring and metrics calculation."""

    def __init__(self, database_service: DatabaseService):
        """Initialize SystemMonitoringService.

        Args:
            database_service: Database service for queries
        """
        self.database_service = database_service
        self.logger = logging.getLogger(__name__)

    def get_system_status(self) -> dict[str, Any]:
        """Get comprehensive system status for emergency assessment.

        Returns:
            Dictionary containing system health metrics
        """
        try:
            with self.database_service as conn:
                cursor = conn.cursor()

                status = {
                    "timestamp": datetime.now(),
                    "database_status": "connected",
                    "system_health": "healthy",
                }

                # Get active scrapers count
                active_scrapers = self._get_active_scrapers_count(cursor)
                status["active_scrapers"] = active_scrapers

                # Get failure metrics
                failure_metrics = self._get_failure_metrics_from_cursor(cursor)
                status.update(failure_metrics)

                # Determine system health
                status["system_health"] = self.check_system_health(
                    failure_rate=status["failure_rate_24h"],
                    active_scrapers=active_scrapers,
                    recent_failures=status["recent_failures"],
                )

                cursor.close()
                return status

        except Exception as e:
            self.logger.error(f"Error getting system status: {e}")
            return {
                "timestamp": datetime.now(),
                "database_status": "error",
                "system_health": "critical",
                "error": str(e),
            }

    def check_system_health(self, failure_rate: float, active_scrapers: int, recent_failures: int) -> str:
        """Determine system health based on metrics.

        Args:
            failure_rate: Failure rate percentage (0-100)
            active_scrapers: Number of currently active scrapers
            recent_failures: Number of recent failures

        Returns:
            Health status: "healthy", "degraded", or "critical"
        """
        if failure_rate > 50 or active_scrapers > 5:
            return "critical"
        if failure_rate > 20 or recent_failures > 10:
            return "degraded"
        return "healthy"

    def get_failure_metrics(self) -> dict[str, Any]:
        """Get failure metrics for the last 24 hours.

        Returns:
            Dictionary containing failure metrics
        """
        try:
            with self.database_service as conn:
                cursor = conn.cursor()
                metrics = self._get_failure_metrics_from_cursor(cursor)
                cursor.close()
                return metrics

        except Exception as e:
            self.logger.error(f"Error getting failure metrics: {e}")
            return {
                "recent_failures": 0,
                "total_scrapes": 0,
                "failure_rate_24h": 0.0,
                "error": str(e),
            }

    def is_system_degraded(self, failure_rate: float, active_scrapers: int) -> bool:
        """Check if system is degraded or critical.

        Args:
            failure_rate: Failure rate percentage
            active_scrapers: Number of active scrapers

        Returns:
            True if system is degraded or critical, False if healthy
        """
        return failure_rate > 20 or active_scrapers > 5

    def _get_active_scrapers_count(self, cursor) -> int:
        """Get count of currently active scrapers.

        Args:
            cursor: Database cursor

        Returns:
            Number of active scrapers
        """
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM scrape_logs
            WHERE status = 'running'
            AND started_at >= %s
            """,
            (datetime.now() - timedelta(hours=4),),
        )
        return cursor.fetchone()[0] or 0

    def _get_failure_metrics_from_cursor(self, cursor) -> dict[str, Any]:
        """Get failure metrics using provided cursor.

        Args:
            cursor: Database cursor

        Returns:
            Dictionary containing failure metrics
        """
        # Get recent failures (last 24 hours)
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM scrape_logs
            WHERE status IN ('error', 'warning')
            AND started_at >= %s
            """,
            (datetime.now() - timedelta(hours=24),),
        )
        recent_failures = cursor.fetchone()[0] or 0

        # Get total scrapes for failure rate calculation
        cursor.execute(
            """
            SELECT COUNT(*)
            FROM scrape_logs
            WHERE started_at >= %s
            """,
            (datetime.now() - timedelta(hours=24),),
        )
        total_scrapes = cursor.fetchone()[0] or 0
        failure_rate = (recent_failures / max(total_scrapes, 1)) * 100

        return {
            "recent_failures": recent_failures,
            "total_scrapes": total_scrapes,
            "failure_rate_24h": round(failure_rate, 2),
        }
