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
from typing import Any, Dict, Optional

from management.emergency.emergency_cli import EmergencyCLI
from management.emergency.emergency_coordinator import EmergencyCoordinator
from management.services.database_service import DatabaseService

# Add the project root directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class EmergencyOperations:
    """Main emergency operations manager - delegates to EmergencyCoordinator."""

    def __init__(self, database_service: Optional[DatabaseService] = None):
        """Initialize emergency operations manager."""
        self.logger = logging.getLogger(__name__)
        self.coordinator = EmergencyCoordinator(database_service)

        # Keep these for backward compatibility with tests
        self.database_service = self.coordinator.database_service
        self.rollback_manager = self.coordinator.rollback_service
        self.recovery_manager = self.coordinator.recovery_service
        self.system_monitoring = self.coordinator.system_monitoring
        self.scraper_control = self.coordinator.scraper_control

    def get_system_status(self) -> Dict[str, Any]:
        """
        Get comprehensive system status for emergency assessment.

        Returns:
            Dictionary containing system health metrics
        """
        return self.coordinator.get_system_status()

    def emergency_stop_all_scrapers(self) -> Dict[str, Any]:
        """
        Emergency stop all running scrapers.

        Returns:
            Dictionary containing stop operation results
        """
        return self.coordinator.emergency_stop_all_scrapers()

    def emergency_disable_organization(self, organization_id: int, reason: str) -> Dict[str, Any]:
        """
        Emergency disable scraping for a specific organization.

        Args:
            organization_id: Organization to disable
            reason: Reason for emergency disable

        Returns:
            Dictionary containing disable operation results
        """
        return self.coordinator.emergency_disable_organization(organization_id, reason)

    def execute_emergency_recovery(self, organization_id: int) -> Dict[str, Any]:
        """
        Execute complete emergency recovery workflow for an organization.

        Args:
            organization_id: Organization to recover

        Returns:
            Dictionary containing recovery operation results
        """
        return self.coordinator.execute_emergency_recovery(organization_id)

    def get_recovery_status(self) -> Dict[str, Any]:
        """
        Get status of ongoing recovery operations.

        Returns:
            Dictionary containing recovery operation status
        """
        return self.coordinator.get_recovery_status()

    def _check_recovery_operations(self) -> Dict[str, Any]:
        """Check status of recovery operations."""
        return self.coordinator._check_recovery_operations()

    def _validate_operation_safety(self, organization_id: int) -> Dict[str, Any]:
        """
        Validate that it's safe to perform emergency operations.

        Args:
            organization_id: Organization to validate

        Returns:
            Dictionary containing safety status and reasons
        """
        return self.coordinator._validate_operation_safety(organization_id)


class EmergencyOperationsCommands:
    """Command-line interface for emergency operations - delegates to EmergencyCLI."""

    def __init__(self):
        """Initialize emergency operations CLI."""
        self.cli = EmergencyCLI()
        # Keep emergency_ops for backward compatibility
        self.emergency_ops = EmergencyOperations()

    def emergency_stop(self) -> Dict[str, Any]:
        """Execute emergency stop command."""
        return self.cli.emergency_stop()

    def rollback_organization(self, organization_id: int) -> Dict[str, Any]:
        """Execute rollback command for organization."""
        return self.cli.rollback_organization(organization_id)

    def create_backup(self, organization_id: int, reason: str = "Manual backup") -> Dict[str, Any]:
        """Execute backup creation command."""
        return self.cli.create_backup(organization_id, reason)

    def system_status(self) -> Dict[str, Any]:
        """Execute system status command."""
        return self.cli.system_status()


def main():
    """Main CLI entry point for emergency operations."""
    parser = argparse.ArgumentParser(description="Emergency operations for rescue dog aggregator")
    subparsers = parser.add_subparsers(dest="command", help="Available emergency commands")

    # Emergency stop command
    stop_parser = subparsers.add_parser("emergency-stop", help="Stop all running scrapers immediately")

    # System status command
    status_parser = subparsers.add_parser("status", help="Get system status")

    # Rollback command
    rollback_parser = subparsers.add_parser("rollback", help="Rollback organization data")
    rollback_parser.add_argument("organization_id", type=int, help="Organization ID to rollback")

    # Backup command
    backup_parser = subparsers.add_parser("backup", help="Create data backup")
    backup_parser.add_argument("organization_id", type=int, help="Organization ID to backup")
    backup_parser.add_argument("--reason", default="Manual backup", help="Reason for backup")

    # Recovery command
    recovery_parser = subparsers.add_parser("recover", help="Execute emergency recovery")
    recovery_parser.add_argument("organization_id", type=int, help="Organization ID to recover")

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
            print(f"🚨 Emergency Recovery Results for Organization {args.organization_id}:")
            print(json.dumps(result, indent=2, default=str))

    except Exception as e:
        print(f"❌ Error executing command: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
