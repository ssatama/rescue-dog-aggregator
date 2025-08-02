"""
ScraperControlService - Extracted from emergency_operations.py.

Handles scraper control and emergency stop operations.
Follows CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Small functions <50 lines each
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict

from management.services.database_service import DatabaseService
from utils.config_loader import ConfigLoader


class ScraperControlService:
    """Service for scraper control and emergency stop operations."""

    def __init__(self, database_service: DatabaseService, config_loader: ConfigLoader):
        """Initialize ScraperControlService.

        Args:
            database_service: Database service for queries
            config_loader: Configuration loader for scraper management
        """
        self.database_service = database_service
        self.config_loader = config_loader
        self.logger = logging.getLogger(__name__)

    def emergency_stop_all_scrapers(self) -> Dict[str, Any]:
        """Emergency stop all running scrapers.

        Returns:
            Dictionary containing stop operation results
        """
        try:
            self.logger.warning("EMERGENCY STOP: Stopping all scrapers")

            result = self.stop_running_scrapers()

            self.logger.warning(f"Emergency stop completed: {result}")
            return {"success": True, "timestamp": datetime.now(), **result}

        except Exception as e:
            self.logger.error(f"Error during emergency stop: {e}")
            return {"success": False, "error": str(e), "timestamp": datetime.now()}

    def emergency_disable_organization(self, organization_id: int, reason: str) -> Dict[str, Any]:
        """Emergency disable scraping for a specific organization.

        Args:
            organization_id: Organization to disable
            reason: Reason for emergency disable

        Returns:
            Dictionary containing disable operation results
        """
        try:
            self.logger.warning(f"EMERGENCY DISABLE: Organization {organization_id} - {reason}")

            success = self.disable_organization_scrapers(organization_id, reason)

            return {
                "success": success,
                "organization_id": organization_id,
                "reason": reason,
                "timestamp": datetime.now(),
            }

        except Exception as e:
            self.logger.error(f"Error disabling organization {organization_id}: {e}")
            return {
                "success": False,
                "organization_id": organization_id,
                "error": str(e),
                "timestamp": datetime.now(),
            }

    def stop_running_scrapers(self) -> Dict[str, Any]:
        """Stop all currently running scrapers.

        Returns:
            Dictionary containing stopped and failed counts
        """
        try:
            with self.database_service as conn:
                cursor = conn.cursor()

                # Get running scraper sessions for process termination
                cursor.execute(
                    """
                    SELECT organization_id, id
                    FROM scrape_logs
                    WHERE status = 'running'
                    AND started_at >= %s
                """,
                    (datetime.now() - timedelta(hours=4),),
                )

                running_sessions = cursor.fetchall()
                stopped_count = 0
                failed_count = 0

                # Attempt to stop each running session
                for org_id, session_id in running_sessions:
                    try:
                        self._terminate_scraper_process(org_id, session_id)
                        stopped_count += 1
                    except Exception as e:
                        self.logger.error(f"Failed to stop session {session_id}: {e}")
                        failed_count += 1

                # Mark all running scrapes as 'stopped' in database
                cursor.execute(
                    """
                    UPDATE scrape_logs
                    SET status = 'stopped',
                        completed_at = %s,
                        error_message = 'Emergency stop initiated'
                    WHERE status = 'running'
                    AND started_at >= %s
                """,
                    (datetime.now(), datetime.now() - timedelta(hours=4)),
                )

                conn.commit()
                cursor.close()

                return {"stopped": stopped_count, "failed": failed_count}

        except Exception as e:
            self.logger.error(f"Error stopping scrapers: {e}")
            return {"stopped": 0, "failed": 1, "error": str(e)}

    def disable_organization_scrapers(self, organization_id: int, reason: str) -> bool:
        """Disable scraping for a specific organization.

        Args:
            organization_id: Organization to disable
            reason: Reason for disable

        Returns:
            True if successful, False otherwise
        """
        try:
            with self.database_service as conn:
                cursor = conn.cursor()

                # Stop any running scrapes for this organization
                cursor.execute(
                    """
                    UPDATE scrape_logs
                    SET status = 'stopped',
                        completed_at = %s,
                        error_message = %s
                    WHERE organization_id = %s
                    AND status = 'running'
                """,
                    (datetime.now(), f"Emergency disable: {reason}", organization_id),
                )

                conn.commit()
                cursor.close()

                # TODO: Integration with config system to disable organization
                # This would involve updating the organization configuration
                # to mark it as disabled for future scraping

                return True

        except Exception as e:
            self.logger.error(f"Error disabling organization {organization_id}: {e}")
            return False

    def _terminate_scraper_process(self, organization_id: int, session_id: int) -> None:
        """Terminate a specific scraper process.

        Args:
            organization_id: Organization ID
            session_id: Scrape session ID
        """
        try:
            # For safety, we'll use a graceful approach
            # In a real implementation, this would use process IDs or other mechanisms
            # to actually terminate running scraper processes

            # Placeholder for process termination logic
            # This could involve:
            # 1. Looking up process ID from session tracking
            # 2. Sending SIGTERM signal to process
            # 3. Waiting for graceful shutdown
            # 4. Sending SIGKILL if needed

            # For now, we'll simulate this with a simple approach
            self.logger.info(f"Terminating scraper process for org {organization_id}, session {session_id}")

        except Exception as e:
            self.logger.error(f"Error terminating scraper process: {e}")
            raise
