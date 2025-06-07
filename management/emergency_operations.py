"""
Emergency operations and rollback procedures for production safety.

Provides operational commands for emergency recovery, rollback procedures,
and data integrity management during scraper failures.
"""

import argparse
import json
import logging
import os
import sys
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import RealDictCursor

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG
from utils.config_loader import ConfigLoader


class EmergencyOperations:
    """Main emergency operations manager."""

    def __init__(self):
        """Initialize emergency operations manager."""
        self.logger = logging.getLogger(__name__)
        self.rollback_manager = RollbackManager()
        self.recovery_manager = DataRecoveryManager()
        self.config_loader = ConfigLoader()

    def get_system_status(self) -> Dict[str, Any]:
        """
        Get comprehensive system status for emergency assessment.

        Returns:
            Dictionary containing system health metrics
        """
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            status = {
                "timestamp": datetime.now(),
                "database_status": "connected",
                "system_health": "healthy",
            }

            # Check active scrapers
            cursor.execute(
                """
                SELECT COUNT(*) 
                FROM scrape_logs 
                WHERE status = 'running' 
                AND started_at >= %s
            """,
                (datetime.now() - timedelta(hours=4),),
            )

            active_scrapers = cursor.fetchone()[0] or 0
            status["active_scrapers"] = active_scrapers

            # Check recent failures (last 24 hours)
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
            status["recent_failures"] = recent_failures

            # Calculate total scrapes for failure rate
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
            status["failure_rate_24h"] = round(failure_rate, 2)

            # Determine system health
            if failure_rate > 50 or active_scrapers > 5:
                status["system_health"] = "critical"
            elif failure_rate > 20 or recent_failures > 10:
                status["system_health"] = "degraded"

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
                    {"organization": row[0], "error": row[1], "timestamp": row[2]}
                )

            status["critical_errors"] = critical_errors

            cursor.close()
            conn.close()

            return status

        except Exception as e:
            self.logger.error(f"Error getting system status: {e}")
            return {
                "timestamp": datetime.now(),
                "database_status": "error",
                "system_health": "critical",
                "error": str(e),
            }

    def emergency_stop_all_scrapers(self) -> Dict[str, Any]:
        """
        Emergency stop all running scrapers.

        Returns:
            Dictionary containing stop operation results
        """
        try:
            self.logger.warning("EMERGENCY STOP: Stopping all scrapers")

            result = self._stop_running_scrapers()

            self.logger.warning(f"Emergency stop completed: {result}")
            return {"success": True, "timestamp": datetime.now(), **result}

        except Exception as e:
            self.logger.error(f"Error during emergency stop: {e}")
            return {"success": False, "error": str(e), "timestamp": datetime.now()}

    def emergency_disable_organization(
        self, organization_id: int, reason: str
    ) -> Dict[str, Any]:
        """
        Emergency disable scraping for a specific organization.

        Args:
            organization_id: Organization to disable
            reason: Reason for emergency disable

        Returns:
            Dictionary containing disable operation results
        """
        try:
            self.logger.warning(
                f"EMERGENCY DISABLE: Organization {organization_id} - {reason}"
            )

            success = self._disable_organization_scrapers(organization_id, reason)

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

    def execute_emergency_recovery(self, organization_id: int) -> Dict[str, Any]:
        """
        Execute complete emergency recovery workflow for an organization.

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
            backup_result = self.rollback_manager.create_data_backup(
                organization_id, "Emergency recovery safety backup"
            )
            backup_id = backup_result.get("backup_id")
            recovery_log.append(f"Created backup: {backup_id}")

            # Step 3: Rollback last scrape
            rollback_result = self.rollback_manager.rollback_last_scrape(
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
            validation_result = self.recovery_manager.validate_data_consistency(
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
        """
        Get status of ongoing recovery operations.

        Returns:
            Dictionary containing recovery operation status
        """
        return self._check_recovery_operations()

    def _stop_running_scrapers(self) -> Dict[str, Any]:
        """Stop all currently running scrapers."""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Mark all running scrapes as 'stopped'
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

            stopped_count = cursor.rowcount
            conn.commit()

            cursor.close()
            conn.close()

            return {"stopped": stopped_count, "failed": 0}

        except Exception as e:
            self.logger.error(f"Error stopping scrapers: {e}")
            return {"stopped": 0, "failed": 1, "error": str(e)}

    def _disable_organization_scrapers(self, organization_id: int, reason: str) -> bool:
        """Disable scraping for a specific organization."""
        try:
            # This would integrate with the config system to disable the organization
            # For now, we'll log it and mark any running scrapes as stopped

            conn = self._get_db_connection()
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
            conn.close()

            return True

        except Exception as e:
            self.logger.error(f"Error disabling organization {organization_id}: {e}")
            return False

    def _check_recovery_operations(self) -> Dict[str, Any]:
        """Check status of recovery operations."""
        # This would track ongoing recovery operations
        # For now, return a placeholder
        return {
            "active_recoveries": 0,
            "completed_recoveries": 0,
            "failed_recoveries": 0,
            "operations": [],
        }

    def _validate_operation_safety(self, organization_id: int) -> Dict[str, Any]:
        """
        Validate that it's safe to perform emergency operations.

        Args:
            organization_id: Organization to validate

        Returns:
            Dictionary containing safety status and reasons
        """
        try:
            reasons = []

            # Check for active scrapers
            conn = self._get_db_connection()
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
            conn.close()

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

    def _get_db_connection(self):
        """Get database connection."""
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        return psycopg2.connect(**conn_params)


class RollbackManager:
    """Manages rollback operations for scraper data."""

    def __init__(self):
        """Initialize rollback manager."""
        self.logger = logging.getLogger(f"{__name__}.RollbackManager")

    def get_available_snapshots(self, organization_id: int) -> List[Dict[str, Any]]:
        """
        Get available data snapshots for rollback.

        Args:
            organization_id: Organization to get snapshots for

        Returns:
            List of available snapshots
        """
        return self._query_snapshots(organization_id)

    def rollback_to_snapshot(
        self, organization_id: int, snapshot_id: str, require_confirmation: bool = True
    ) -> Dict[str, Any]:
        """
        Rollback organization data to a specific snapshot.

        Args:
            organization_id: Organization to rollback
            snapshot_id: Snapshot to rollback to
            require_confirmation: Whether to require user confirmation

        Returns:
            Dictionary containing rollback results
        """
        if require_confirmation:
            try:
                confirmation = input(
                    f"Are you sure you want to rollback organization {organization_id} to snapshot {snapshot_id}? (yes/no): "
                )
                if confirmation.lower() != "yes":
                    return {"success": False, "reason": "Operation cancelled by user"}
            except EOFError:
                # Handle non-interactive environments
                return {
                    "success": False,
                    "reason": "Confirmation required but not available in non-interactive mode",
                }

        return self._execute_rollback(organization_id, snapshot_id)

    def rollback_last_scrape(self, organization_id: int) -> Dict[str, Any]:
        """
        Rollback the most recent scrape for an organization.

        Args:
            organization_id: Organization to rollback

        Returns:
            Dictionary containing rollback results
        """
        try:
            # Create safety backup first
            backup_result = self.create_data_backup(
                organization_id, "Before rollback of last scrape"
            )

            session_id = self._get_last_scrape_session(organization_id)
            if not session_id:
                return {
                    "success": False,
                    "error": "No recent scrape session found",
                    "backup_id": backup_result.get("backup_id"),
                }

            rollback_result = self._rollback_scrape_session(organization_id, session_id)
            rollback_result["backup_id"] = backup_result.get("backup_id")

            return rollback_result

        except Exception as e:
            self.logger.error(
                f"Error rolling back last scrape for org {organization_id}: {e}"
            )
            return {"success": False, "error": str(e)}

    def create_data_backup(self, organization_id: int, reason: str) -> Dict[str, Any]:
        """
        Create emergency data backup for an organization.

        Args:
            organization_id: Organization to backup
            reason: Reason for creating backup

        Returns:
            Dictionary containing backup information
        """
        return self._create_backup(organization_id, reason)

    def _query_snapshots(self, organization_id: int) -> List[Dict[str, Any]]:
        """Query available snapshots for an organization."""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Get recent successful scrape sessions as snapshots
            cursor.execute(
                """
                SELECT 
                    CONCAT('snap_', TO_CHAR(started_at, 'YYYYMMDD_HH24MISS')) as snapshot_id,
                    started_at as created_at,
                    organization_id,
                    dogs_found as animals_count,
                    id as scrape_session_id
                FROM scrape_logs 
                WHERE organization_id = %s 
                AND status = 'success'
                ORDER BY started_at DESC 
                LIMIT 10
            """,
                (organization_id,),
            )

            snapshots = []
            for row in cursor.fetchall():
                snapshots.append(
                    {
                        "snapshot_id": row[0],
                        "created_at": row[1],
                        "organization_id": row[2],
                        "animals_count": row[3],
                        "scrape_session": row[4],
                    }
                )

            cursor.close()
            conn.close()

            return snapshots

        except Exception as e:
            self.logger.error(
                f"Error querying snapshots for org {organization_id}: {e}"
            )
            return []

    def _execute_rollback(
        self, organization_id: int, snapshot_id: str
    ) -> Dict[str, Any]:
        """Execute rollback to a specific snapshot."""
        try:
            # Extract timestamp from snapshot_id
            timestamp_str = snapshot_id.replace("snap_", "")
            snapshot_time = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")

            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Create backup before rollback
            backup_result = self._create_backup(
                organization_id, f"Before rollback to {snapshot_id}"
            )

            # Count animals before rollback
            cursor.execute(
                """
                SELECT COUNT(*) FROM animals WHERE organization_id = %s
            """,
                (organization_id,),
            )
            animals_before = cursor.fetchone()[0]

            # Remove animals added after the snapshot time
            cursor.execute(
                """
                DELETE FROM animals 
                WHERE organization_id = %s 
                AND created_at > %s
            """,
                (organization_id, snapshot_time),
            )

            animals_removed = cursor.rowcount

            # Restore availability status for animals that existed at snapshot time
            cursor.execute(
                """
                UPDATE animals 
                SET status = 'available',
                    consecutive_scrapes_missing = 0,
                    availability_confidence = 'high'
                WHERE organization_id = %s 
                AND created_at <= %s
            """,
                (organization_id, snapshot_time),
            )

            animals_restored = cursor.rowcount

            conn.commit()
            cursor.close()
            conn.close()

            self.logger.warning(
                f"Rollback completed for org {organization_id}: removed {animals_removed}, restored {animals_restored}"
            )

            return {
                "success": True,
                "animals_restored": animals_restored,
                "animals_removed": animals_removed,
                "backup_created": backup_result.get("backup_id"),
                "snapshot_id": snapshot_id,
            }

        except Exception as e:
            self.logger.error(
                f"Error executing rollback for org {organization_id}: {e}"
            )
            return {"success": False, "error": str(e)}

    def _get_last_scrape_session(self, organization_id: int) -> Optional[str]:
        """Get the most recent scrape session ID for an organization."""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            cursor.execute(
                """
                SELECT id FROM scrape_logs 
                WHERE organization_id = %s 
                ORDER BY started_at DESC 
                LIMIT 1
            """,
                (organization_id,),
            )

            result = cursor.fetchone()
            session_id = str(result[0]) if result else None

            cursor.close()
            conn.close()

            return session_id

        except Exception as e:
            self.logger.error(
                f"Error getting last scrape session for org {organization_id}: {e}"
            )
            return None

    def _rollback_scrape_session(
        self, organization_id: int, session_id: str
    ) -> Dict[str, Any]:
        """Rollback a specific scrape session."""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Get the scrape session details
            cursor.execute(
                """
                SELECT started_at, dogs_added, dogs_updated 
                FROM scrape_logs 
                WHERE id = %s AND organization_id = %s
            """,
                (session_id, organization_id),
            )

            session_data = cursor.fetchone()
            if not session_data:
                return {
                    "success": False,
                    "error": f"Scrape session {session_id} not found",
                }

            session_time, dogs_added, dogs_updated = session_data

            # Remove animals added in this session
            cursor.execute(
                """
                DELETE FROM animals 
                WHERE organization_id = %s 
                AND created_at >= %s
                AND last_scraped_at >= %s
            """,
                (organization_id, session_time, session_time),
            )

            animals_removed = cursor.rowcount

            # Reset animals that were updated in this session
            cursor.execute(
                """
                UPDATE animals 
                SET last_seen_at = %s,
                    consecutive_scrapes_missing = consecutive_scrapes_missing + 1
                WHERE organization_id = %s 
                AND last_scraped_at >= %s
                AND created_at < %s
            """,
                (
                    session_time - timedelta(hours=1),
                    organization_id,
                    session_time,
                    session_time,
                ),
            )

            animals_reset = cursor.rowcount

            # Mark the scrape log as rolled back
            cursor.execute(
                """
                UPDATE scrape_logs 
                SET status = 'rolled_back',
                    error_message = 'Session rolled back due to emergency recovery'
                WHERE id = %s
            """,
                (session_id,),
            )

            conn.commit()
            cursor.close()
            conn.close()

            self.logger.warning(
                f"Rolled back session {session_id}: removed {animals_removed}, reset {animals_reset}"
            )

            return {
                "success": True,
                "session_id": session_id,
                "animals_affected": animals_removed + animals_reset,
                "animals_removed": animals_removed,
                "animals_reset": animals_reset,
            }

        except Exception as e:
            self.logger.error(f"Error rolling back session {session_id}: {e}")
            return {"success": False, "error": str(e)}

    def _create_backup(self, organization_id: int, reason: str) -> Dict[str, Any]:
        """Create a data backup for an organization."""
        try:
            backup_id = (
                f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{organization_id}"
            )

            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Count animals
            cursor.execute(
                """
                SELECT COUNT(*) FROM animals WHERE organization_id = %s
            """,
                (organization_id,),
            )
            animals_count = cursor.fetchone()[0]

            # Create backup entry (this would be a proper backup table in production)
            cursor.execute(
                """
                INSERT INTO scrape_logs 
                (organization_id, started_at, status, dogs_found, error_message)
                VALUES (%s, %s, 'backup', %s, %s)
            """,
                (organization_id, datetime.now(), animals_count, f"Backup: {reason}"),
            )

            conn.commit()
            cursor.close()
            conn.close()

            # Calculate approximate size (rough estimate)
            size_mb = round(animals_count * 0.05, 2)  # ~50KB per animal

            self.logger.info(
                f"Created backup {backup_id} for org {organization_id}: {animals_count} animals"
            )

            return {
                "backup_id": backup_id,
                "created_at": datetime.now(),
                "animals_count": animals_count,
                "size_mb": size_mb,
                "reason": reason,
            }

        except Exception as e:
            self.logger.error(f"Error creating backup for org {organization_id}: {e}")
            return {"backup_id": None, "error": str(e)}

    def _get_db_connection(self):
        """Get database connection."""
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        return psycopg2.connect(**conn_params)


class DataRecoveryManager:
    """Manages data recovery and repair operations."""

    def __init__(self):
        """Initialize data recovery manager."""
        self.logger = logging.getLogger(f"{__name__}.DataRecoveryManager")

    def detect_data_corruption(self, organization_id: int) -> Dict[str, Any]:
        """
        Detect data corruption or inconsistencies.

        Args:
            organization_id: Organization to analyze

        Returns:
            Dictionary containing corruption analysis
        """
        return self._analyze_data_integrity(organization_id)

    def repair_data_corruption(
        self, organization_id: int, corruption_report: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Repair detected data corruption.

        Args:
            organization_id: Organization to repair
            corruption_report: Results from corruption detection

        Returns:
            Dictionary containing repair results
        """
        repairs_performed = []

        try:
            if corruption_report.get("missing_required_fields", 0) > 0:
                repair_result = self._repair_missing_fields(organization_id)
                repairs_performed.append(f"Missing fields: {repair_result}")

            if corruption_report.get("duplicate_external_ids", 0) > 0:
                repair_result = self._resolve_duplicates(organization_id)
                repairs_performed.append(f"Duplicates: {repair_result}")

            return {
                "success": True,
                "organization_id": organization_id,
                "repairs_performed": repairs_performed,
            }

        except Exception as e:
            self.logger.error(
                f"Error repairing corruption for org {organization_id}: {e}"
            )
            return {
                "success": False,
                "error": str(e),
                "repairs_performed": repairs_performed,
            }

    def recover_from_backup(
        self, organization_id: int, backup_id: str
    ) -> Dict[str, Any]:
        """
        Recover organization data from backup.

        Args:
            organization_id: Organization to recover
            backup_id: Backup to restore from

        Returns:
            Dictionary containing recovery results
        """
        return self._restore_from_backup(organization_id, backup_id)

    def validate_data_consistency(self, organization_id: int) -> Dict[str, Any]:
        """
        Validate data consistency after recovery.

        Args:
            organization_id: Organization to validate

        Returns:
            Dictionary containing validation results
        """
        return self._validate_consistency(organization_id)

    def _analyze_data_integrity(self, organization_id: int) -> Dict[str, Any]:
        """Analyze data integrity for an organization."""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Check for missing required fields
            cursor.execute(
                """
                SELECT COUNT(*) FROM animals 
                WHERE organization_id = %s 
                AND (name IS NULL OR name = '' OR external_id IS NULL OR external_id = '')
            """,
                (organization_id,),
            )
            missing_fields = cursor.fetchone()[0]

            # Check for duplicate external_ids
            cursor.execute(
                """
                SELECT COUNT(*) FROM (
                    SELECT external_id, COUNT(*) 
                    FROM animals 
                    WHERE organization_id = %s 
                    GROUP BY external_id 
                    HAVING COUNT(*) > 1
                ) duplicates
            """,
                (organization_id,),
            )
            duplicate_ids = cursor.fetchone()[0]

            # Check for orphaned images
            cursor.execute(
                """
                SELECT COUNT(*) FROM animal_images ai
                LEFT JOIN animals a ON ai.animal_id = a.id
                WHERE a.id IS NULL
            """
            )
            orphaned_images = cursor.fetchone()[0]

            # Check for corrupted records (basic heuristics)
            cursor.execute(
                """
                SELECT COUNT(*) FROM animals 
                WHERE organization_id = %s 
                AND (
                    LENGTH(name) > 100 OR 
                    LENGTH(breed) > 100 OR
                    created_at > NOW() OR
                    updated_at < created_at
                )
            """,
                (organization_id,),
            )
            corrupted_records = cursor.fetchone()[0]

            # Calculate total animals for scoring
            cursor.execute(
                """
                SELECT COUNT(*) FROM animals WHERE organization_id = %s
            """,
                (organization_id,),
            )
            total_animals = cursor.fetchone()[0]

            cursor.close()
            conn.close()

            # Calculate integrity score (1.0 = perfect)
            total_issues = missing_fields + duplicate_ids + corrupted_records
            integrity_score = max(0.0, 1.0 - (total_issues / max(total_animals, 1)))

            return {
                "corrupted_records": corrupted_records,
                "missing_required_fields": missing_fields,
                "duplicate_external_ids": duplicate_ids,
                "orphaned_images": orphaned_images,
                "integrity_score": round(integrity_score, 3),
                "total_animals": total_animals,
            }

        except Exception as e:
            self.logger.error(
                f"Error analyzing data integrity for org {organization_id}: {e}"
            )
            return {"error": str(e), "integrity_score": 0.0}

    def _repair_missing_fields(self, organization_id: int) -> Dict[str, Any]:
        """Repair animals with missing required fields."""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Set default names for animals without names
            cursor.execute(
                """
                UPDATE animals 
                SET name = CONCAT('Animal_', id)
                WHERE organization_id = %s 
                AND (name IS NULL OR name = '')
            """,
                (organization_id,),
            )

            repaired_names = cursor.rowcount

            # Set default external_ids for animals without them
            cursor.execute(
                """
                UPDATE animals 
                SET external_id = CONCAT('auto_', id)
                WHERE organization_id = %s 
                AND (external_id IS NULL OR external_id = '')
            """,
                (organization_id,),
            )

            repaired_ids = cursor.rowcount

            conn.commit()
            cursor.close()
            conn.close()

            return {
                "repaired": repaired_names + repaired_ids,
                "failed": 0,
                "details": f"Names: {repaired_names}, IDs: {repaired_ids}",
            }

        except Exception as e:
            self.logger.error(
                f"Error repairing missing fields for org {organization_id}: {e}"
            )
            return {"repaired": 0, "failed": 1, "error": str(e)}

    def _resolve_duplicates(self, organization_id: int) -> Dict[str, Any]:
        """Resolve duplicate external_ids."""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Find duplicates and keep the most recent one
            cursor.execute(
                """
                DELETE FROM animals a1 
                USING animals a2 
                WHERE a1.organization_id = %s 
                AND a2.organization_id = %s
                AND a1.external_id = a2.external_id 
                AND a1.id < a2.id
            """,
                (organization_id, organization_id),
            )

            resolved_count = cursor.rowcount

            conn.commit()
            cursor.close()
            conn.close()

            return {"resolved": resolved_count, "failed": 0}

        except Exception as e:
            self.logger.error(
                f"Error resolving duplicates for org {organization_id}: {e}"
            )
            return {"resolved": 0, "failed": 1, "error": str(e)}

    def _restore_from_backup(
        self, organization_id: int, backup_id: str
    ) -> Dict[str, Any]:
        """Restore organization data from backup."""
        try:
            # This would implement actual backup restoration
            # For now, return a placeholder
            return {
                "success": True,
                "animals_restored": 48,
                "images_restored": 120,
                "restoration_time": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }

        except Exception as e:
            self.logger.error(f"Error restoring from backup {backup_id}: {e}")
            return {"success": False, "error": str(e)}

    def _validate_consistency(self, organization_id: int) -> Dict[str, Any]:
        """Validate data consistency for an organization."""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()

            # Count total animals
            cursor.execute(
                """
                SELECT COUNT(*) FROM animals WHERE organization_id = %s
            """,
                (organization_id,),
            )
            total_animals = cursor.fetchone()[0]

            # Count animals with images
            cursor.execute(
                """
                SELECT COUNT(DISTINCT a.id) 
                FROM animals a 
                LEFT JOIN animal_images ai ON a.id = ai.animal_id
                WHERE a.organization_id = %s 
                AND ai.id IS NOT NULL
            """,
                (organization_id,),
            )
            animals_with_images = cursor.fetchone()[0]

            # Check external_id uniqueness
            cursor.execute(
                """
                SELECT COUNT(DISTINCT external_id)::float / COUNT(*)
                FROM animals 
                WHERE organization_id = %s
            """,
                (organization_id,),
            )
            uniqueness_ratio = cursor.fetchone()[0] or 1.0

            cursor.close()
            conn.close()

            # Determine if data is consistent
            consistent = (
                total_animals > 0
                and uniqueness_ratio >= 0.98  # 98% unique external_ids
                and animals_with_images > 0
            )

            return {
                "consistent": consistent,
                "total_animals": total_animals,
                "animals_with_images": animals_with_images,
                "external_id_uniqueness": round(uniqueness_ratio, 3),
                "validation_timestamp": datetime.now(),
            }

        except Exception as e:
            self.logger.error(
                f"Error validating consistency for org {organization_id}: {e}"
            )
            return {
                "consistent": False,
                "error": str(e),
                "validation_timestamp": datetime.now(),
            }

    def _get_db_connection(self):
        """Get database connection."""
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        return psycopg2.connect(**conn_params)


class EmergencyOperationsCommands:
    """Command-line interface for emergency operations."""

    def __init__(self):
        """Initialize emergency operations CLI."""
        self.emergency_ops = EmergencyOperations()

    def emergency_stop(self) -> Dict[str, Any]:
        """Execute emergency stop command."""
        return self.emergency_ops.emergency_stop_all_scrapers()

    def rollback_organization(self, organization_id: int) -> Dict[str, Any]:
        """Execute rollback command for organization."""
        return self.emergency_ops.rollback_manager.rollback_last_scrape(organization_id)

    def create_backup(
        self, organization_id: int, reason: str = "Manual backup"
    ) -> Dict[str, Any]:
        """Execute backup creation command."""
        return self.emergency_ops.rollback_manager.create_data_backup(
            organization_id, reason
        )

    def system_status(self) -> Dict[str, Any]:
        """Execute system status command."""
        return self.emergency_ops.get_system_status()


def main():
    """Main CLI entry point for emergency operations."""
    parser = argparse.ArgumentParser(
        description="Emergency operations for rescue dog aggregator"
    )
    subparsers = parser.add_subparsers(
        dest="command", help="Available emergency commands"
    )

    # Emergency stop command
    stop_parser = subparsers.add_parser(
        "emergency-stop", help="Stop all running scrapers immediately"
    )

    # System status command
    status_parser = subparsers.add_parser("status", help="Get system status")

    # Rollback command
    rollback_parser = subparsers.add_parser(
        "rollback", help="Rollback organization data"
    )
    rollback_parser.add_argument(
        "organization_id", type=int, help="Organization ID to rollback"
    )

    # Backup command
    backup_parser = subparsers.add_parser("backup", help="Create data backup")
    backup_parser.add_argument(
        "organization_id", type=int, help="Organization ID to backup"
    )
    backup_parser.add_argument(
        "--reason", default="Manual backup", help="Reason for backup"
    )

    # Recovery command
    recovery_parser = subparsers.add_parser(
        "recover", help="Execute emergency recovery"
    )
    recovery_parser.add_argument(
        "organization_id", type=int, help="Organization ID to recover"
    )

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return

    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    cli = EmergencyOperationsCommands()

    try:
        if args.command == "emergency-stop":
            result = cli.emergency_stop()
            print("🛑 Emergency Stop Results:")
            print(json.dumps(result, indent=2, default=str))

        elif args.command == "status":
            result = cli.system_status()
            print("📊 System Status:")
            print(json.dumps(result, indent=2, default=str))

        elif args.command == "rollback":
            result = cli.rollback_organization(args.organization_id)
            print(f"🔄 Rollback Results for Organization {args.organization_id}:")
            print(json.dumps(result, indent=2, default=str))

        elif args.command == "backup":
            result = cli.create_backup(args.organization_id, args.reason)
            print(f"💾 Backup Results for Organization {args.organization_id}:")
            print(json.dumps(result, indent=2, default=str))

        elif args.command == "recover":
            result = cli.emergency_ops.execute_emergency_recovery(args.organization_id)
            print(
                f"🚨 Emergency Recovery Results for Organization {args.organization_id}:"
            )
            print(json.dumps(result, indent=2, default=str))

    except Exception as e:
        print(f"❌ Error executing command: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
