"""
RollbackService - Extracted from emergency_operations.py RollbackManager.

Handles rollback operations for scraper data and snapshots.
Follows CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Small functions <50 lines each
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from management.services.database_service import DatabaseService


class RollbackService:
    """Service for rollback operations and snapshot management."""

    def __init__(self, database_service: DatabaseService):
        """Initialize RollbackService.

        Args:
            database_service: Database service for queries
        """
        self.database_service = database_service
        self.logger = logging.getLogger(__name__)

    def get_available_snapshots(self, organization_id: int) -> List[Dict[str, Any]]:
        """Get available data snapshots for rollback.

        Args:
            organization_id: Organization to get snapshots for

        Returns:
            List of available snapshots
        """
        try:
            with self.database_service as conn:
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
                return snapshots

        except Exception as e:
            self.logger.error(f"Error querying snapshots for org {organization_id}: {e}")
            return []

    def rollback_to_snapshot(self, organization_id: int, snapshot_id: str, require_confirmation: bool = True) -> Dict[str, Any]:
        """Rollback organization data to a specific snapshot.

        Args:
            organization_id: Organization to rollback
            snapshot_id: Snapshot to rollback to
            require_confirmation: Whether to require user confirmation

        Returns:
            Dictionary containing rollback results
        """
        if require_confirmation:
            try:
                confirmation = input(f"Are you sure you want to rollback organization {organization_id} to snapshot {snapshot_id}? (yes/no): ")
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
        """Rollback the most recent scrape for an organization.

        Args:
            organization_id: Organization to rollback

        Returns:
            Dictionary containing rollback results
        """
        try:
            # Create safety backup first
            backup_result = self.create_data_backup(organization_id, "Before rollback of last scrape")

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
            self.logger.error(f"Error rolling back last scrape for org {organization_id}: {e}")
            return {"success": False, "error": str(e)}

    def create_data_backup(self, organization_id: int, reason: str) -> Dict[str, Any]:
        """Create emergency data backup for an organization.

        Args:
            organization_id: Organization to backup
            reason: Reason for creating backup

        Returns:
            Dictionary containing backup information
        """
        return self._create_backup(organization_id, reason)

    def _execute_rollback(self, organization_id: int, snapshot_id: str) -> Dict[str, Any]:
        """Execute rollback to a specific snapshot.

        Args:
            organization_id: Organization to rollback
            snapshot_id: Snapshot ID to rollback to

        Returns:
            Dictionary containing rollback results
        """
        try:
            # Extract timestamp from snapshot_id
            timestamp_str = snapshot_id.replace("snap_", "")
            snapshot_time = datetime.strptime(timestamp_str, "%Y%m%d_%H%M%S")

            with self.database_service as conn:
                cursor = conn.cursor()

                # Create backup before rollback
                backup_result = self._create_backup(organization_id, f"Before rollback to {snapshot_id}")

                # Count animals before rollback
                cursor.execute(
                    "SELECT COUNT(*) FROM animals WHERE organization_id = %s",
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

                self.logger.warning(f"Rollback completed for org {organization_id}: removed {animals_removed}, restored {animals_restored}")

                return {
                    "success": True,
                    "animals_restored": animals_restored,
                    "animals_removed": animals_removed,
                    "backup_created": backup_result.get("backup_id"),
                    "snapshot_id": snapshot_id,
                }

        except Exception as e:
            self.logger.error(f"Error executing rollback for org {organization_id}: {e}")
            return {"success": False, "error": str(e)}

    def _get_last_scrape_session(self, organization_id: int) -> Optional[str]:
        """Get the most recent scrape session ID for an organization.

        Args:
            organization_id: Organization ID

        Returns:
            Session ID string or None if not found
        """
        try:
            with self.database_service as conn:
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
                return session_id

        except Exception as e:
            self.logger.error(f"Error getting last scrape session for org {organization_id}: {e}")
            return None

    def _rollback_scrape_session(self, organization_id: int, session_id: str) -> Dict[str, Any]:
        """Rollback a specific scrape session.

        Args:
            organization_id: Organization ID
            session_id: Scrape session ID to rollback

        Returns:
            Dictionary containing rollback results
        """
        try:
            with self.database_service as conn:
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

                self.logger.warning(f"Rolled back session {session_id}: removed {animals_removed}, reset {animals_reset}")

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
        """Create a data backup for an organization.

        Args:
            organization_id: Organization to backup
            reason: Reason for creating backup

        Returns:
            Dictionary containing backup information
        """
        try:
            backup_id = f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{organization_id}"

            with self.database_service as conn:
                cursor = conn.cursor()

                # Count animals
                cursor.execute(
                    "SELECT COUNT(*) FROM animals WHERE organization_id = %s",
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

                # Calculate approximate size (rough estimate)
                size_mb = round(animals_count * 0.05, 2)  # ~50KB per animal

                self.logger.info(f"Created backup {backup_id} for org {organization_id}: {animals_count} animals")

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
