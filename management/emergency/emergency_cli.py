"""
EmergencyCLI - Command-line interface for emergency operations.

Provides clean CLI interface for emergency operations commands.
Follows CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Small functions <50 lines each
"""

from typing import Any, Dict

from management.emergency.emergency_coordinator import EmergencyCoordinator


class EmergencyCLI:
    """Command-line interface for emergency operations."""

    def __init__(self):
        """Initialize emergency CLI with coordinator."""
        self.coordinator = EmergencyCoordinator()

    def emergency_stop(self) -> Dict[str, Any]:
        """Execute emergency stop command.

        Returns:
            Dictionary containing stop operation results
        """
        result = self.coordinator.emergency_stop_all_scrapers()

        # Ensure we always return a Dict[str, Any]
        if not isinstance(result, dict):
            return {"success": False, "error": "Invalid emergency stop result type"}

        return result

    def rollback_organization(self, organization_id: int) -> Dict[str, Any]:
        """Execute rollback command for organization.

        Args:
            organization_id: Organization to rollback

        Returns:
            Dictionary containing rollback results
        """
        result = self.coordinator.rollback_service.rollback_last_scrape(organization_id)

        # Ensure we always return a Dict[str, Any]
        if not isinstance(result, dict):
            return {"success": False, "error": "Invalid rollback result type"}

        return result

    def create_backup(self, organization_id: int, reason: str = "Manual backup") -> Dict[str, Any]:
        """Execute backup creation command.

        Args:
            organization_id: Organization to backup
            reason: Reason for creating backup

        Returns:
            Dictionary containing backup information
        """
        result = self.coordinator.rollback_service.create_data_backup(organization_id, reason)

        # Ensure we always return a Dict[str, Any]
        if not isinstance(result, dict):
            return {"success": False, "error": "Invalid backup result type"}

        return result

    def system_status(self) -> Dict[str, Any]:
        """Execute system status command.

        Returns:
            Dictionary containing system status
        """
        result = self.coordinator.get_system_status()

        # Ensure we always return a Dict[str, Any]
        if not isinstance(result, dict):
            return {"success": False, "error": "Invalid system status result type"}

        return result
