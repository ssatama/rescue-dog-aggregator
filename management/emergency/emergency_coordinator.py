"""
EmergencyCoordinator - Extracted from emergency_operations.py EmergencyOperations.

Coordinates emergency operations across all emergency services.
Follows CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Small functions <50 lines each
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from config import DB_CONFIG
from management.emergency.data_recovery_service import DataRecoveryService
from management.emergency.rollback_service import RollbackService
from management.emergency.scraper_control_service import ScraperControlService
from management.emergency.system_monitoring_service import SystemMonitoringService
from management.services.database_service import (
    DatabaseService,
    create_database_service_from_config,
)
from utils.config_loader import ConfigLoader


class EmergencyCoordinator:
    """Coordinates emergency operations across all services."""

    def __init__(self, database_service: Optional[DatabaseService] = None):
        """Initialize EmergencyCoordinator.

        Args:
            database_service: Optional database service, creates default if not provided
        """
        self.logger = logging.getLogger(__name__)
        self.database_service = database_service or create_database_service_from_config(
            DB_CONFIG
        )
        self.config_loader = ConfigLoader()

        # Initialize all emergency services
        self.system_monitoring = SystemMonitoringService(self.database_service)
        self.scraper_control = ScraperControlService(
            self.database_service, self.config_loader
        )
        self.rollback_service = RollbackService(self.database_service)
        self.recovery_service = DataRecoveryService(self.database_service)

    def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status for emergency assessment.

        Returns:
            Dictionary containing system health metrics
        """
        # Delegate core monitoring to SystemMonitoringService
        status = self.system_monitoring.get_system_status()

        # Add emergency-specific critical errors if status is successful
        if status.get("database_status") == "connected":
            try:
                with self.database_service as conn:
                    cursor = conn.cursor()

                    # Get recent critical errors
                    cursor.execute(
                        """
                        SELECT o.name, sl.error_message, sl.started_at
                        FROM scrape_logs sl
                        JOIN organizations o ON sl.organization_id = o.id
                        WHERE sl.status = 'error'
                        AND sl.started_at >= %s
                        ORDER BY sl.started_at DESC
                        LIMIT 5
                    """,
                        (datetime.now() - timedelta(hours=6),),
                    )

                    critical_errors = []
                    for row in cursor.fetchall():
                        critical_errors.append(
                            {
                                "organization": row[0],
                                "error": row[1],
                                "timestamp": row[2],
                            }
                        )

                    status["critical_errors"] = critical_errors
                    cursor.close()

            except Exception as e:
                self.logger.error(f"Error getting critical errors: {e}")
                status["critical_errors"] = []
        else:
            # Ensure critical_errors is always present
            status["critical_errors"] = []

        return status

    def emergency_stop_all_scrapers(self) -> Dict[str, Any]:
        """Emergency stop all running scrapers.

        Returns:
            Dictionary containing stop operation results
        """
        return self.scraper_control.emergency_stop_all_scrapers()

    def emergency_disable_organization(
        self, organization_id: int, reason: str
    ) -> Dict[str, Any]:
        """Emergency disable scraping for a specific organization.

        Args:
            organization_id: Organization to disable
            reason: Reason for emergency disable

        Returns:
            Dictionary containing disable operation results
        """
        return self.scraper_control.emergency_disable_organization(
            organization_id, reason
        )

    def execute_emergency_recovery(self, organization_id: int) -> Dict[str, Any]:
        """Execute complete emergency recovery workflow for an organization.

        Args:
            organization_id: Organization to recover

        Returns:
            Dictionary containing recovery operation results
        """
        recovery_log = []
        backup_id = None

        try:
            self.logger.warning(
                f"EMERGENCY RECOVERY: Starting for organization {organization_id}"
            )

            # Step 0: Validate operation safety
            safety_check = self._validate_operation_safety(organization_id)
            if not safety_check.get("safe", True):
                reasons = safety_check.get("reasons", ["Unknown safety issue"])
                error_msg = f"Safety validation failed: {', '.join(reasons)}"
                self.logger.error(error_msg)
                return {
                    "success": False,
                    "organization_id": organization_id,
                    "error": error_msg,
                    "safety_reasons": reasons,
                }

            # Step 1: Stop any running scrapers
            stop_result = self.emergency_stop_all_scrapers()
            recovery_log.append(f"Stopped scrapers: {stop_result}")

            if not stop_result["success"]:
                return {
                    "success": False,
                    "error": "Failed to stop scrapers",
                    "recovery_log": recovery_log,
                }

            # Step 2: Create safety backup
            backup_result = self.rollback_service.create_data_backup(
                organization_id, "Emergency recovery safety backup"
            )
            backup_id = backup_result.get("backup_id")
            recovery_log.append(f"Created backup: {backup_id}")

            # Step 3: Rollback last scrape
            rollback_result = self.rollback_service.rollback_last_scrape(
                organization_id
            )
            recovery_log.append(f"Rollback result: {rollback_result}")

            if not rollback_result["success"]:
                return {
                    "success": False,
                    "error": f"Rollback failed: {rollback_result.get('error')}",
                    "backup_id": backup_id,
                    "recovery_log": recovery_log,
                }

            # Step 4: Validate data consistency
            validation_result = self.recovery_service.validate_data_consistency(
                organization_id
            )
            recovery_log.append(f"Validation result: {validation_result}")

            recovery_summary = {
                "backup_created": backup_id,
                "animals_affected": rollback_result.get("animals_affected", 0),
                "data_consistent": validation_result.get("consistent", False),
                "completed_at": datetime.now(),
            }

            self.logger.warning(f"EMERGENCY RECOVERY COMPLETED: {recovery_summary}")

            return {
                "success": True,
                "organization_id": organization_id,
                "backup_id": backup_id,
                "recovery_summary": recovery_summary,
                "recovery_log": recovery_log,
            }

        except Exception as e:
            self.logger.error(
                f"Emergency recovery failed for org {organization_id}: {e}"
            )
            return {
                "success": False,
                "organization_id": organization_id,
                "error": str(e),
                "backup_id": backup_id,
                "recovery_log": recovery_log,
            }

    def get_recovery_status(self) -> Dict[str, Any]:
        """Get status of ongoing recovery operations.

        Returns:
            Dictionary containing recovery operation status
        """
        return self._check_recovery_operations()

    def _check_recovery_operations(self) -> Dict[str, Any]:
        """Check status of recovery operations.

        Returns:
            Dictionary containing recovery operation status
        """
        # This would track ongoing recovery operations
        # For now, return a placeholder
        return {
            "active_recoveries": 0,
            "completed_recoveries": 0,
            "failed_recoveries": 0,
            "operations": [],
        }

    def _validate_operation_safety(self, organization_id: int) -> Dict[str, Any]:
        """Validate that it's safe to perform emergency operations.

        Args:
            organization_id: Organization to validate

        Returns:
            Dictionary containing safety status and reasons
        """
        try:
            reasons = []

            # Check for active scrapers
            with self.database_service as conn:
                cursor = conn.cursor()

                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM scrape_logs
                    WHERE organization_id = %s
                    AND status = 'running'
                    AND started_at >= %s
                """,
                    (organization_id, datetime.now() - timedelta(hours=2)),
                )

                active_scrapers = cursor.fetchone()[0] or 0
                if active_scrapers > 0:
                    reasons.append(f"Active scraper running ({active_scrapers} found)")

                # Check for recent backup
                cursor.execute(
                    """
                    SELECT COUNT(*)
                    FROM scrape_logs
                    WHERE organization_id = %s
                    AND status = 'backup'
                    AND started_at >= %s
                """,
                    (organization_id, datetime.now() - timedelta(hours=24)),
                )

                recent_backups = cursor.fetchone()[0] or 0
                if recent_backups == 0:
                    reasons.append("No recent backup found in last 24 hours")

                cursor.close()

            # Operation is safe if no blocking reasons found
            is_safe = len(reasons) == 0

            return {
                "safe": is_safe,
                "reasons": reasons,
                "active_scrapers": active_scrapers,
                "recent_backups": recent_backups,
            }

        except Exception as e:
            self.logger.error(f"Error validating operation safety: {e}")
            return {"safe": False, "reasons": [f"Safety validation error: {str(e)}"]}
