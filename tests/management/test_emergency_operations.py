"""
Test emergency operations and rollback procedures for production safety.

This module tests the operational commands that provide emergency recovery
capabilities and rollback procedures for scraper failures.
"""

from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from management.emergency.data_recovery_service import DataRecoveryService
from management.emergency.rollback_service import RollbackService
from management.emergency_operations import EmergencyOperations
from management.services.database_service import DatabaseService


@pytest.fixture
def mock_database_service():
    """Create mock DatabaseService for testing."""
    mock_service = Mock(spec=DatabaseService)

    # Create mock connection for context manager
    mock_connection = Mock()
    mock_cursor = Mock()
    mock_connection.cursor.return_value = mock_cursor

    # Configure cursor methods
    mock_cursor.execute = Mock()  # Accept any parameters
    mock_cursor.fetchone.return_value = (0,)  # Mock result for COUNT(*) queries
    mock_cursor.fetchall.return_value = []  # Mock result for SELECT multiple queries
    mock_cursor.close = Mock()

    # Configure context manager
    mock_service.__enter__ = Mock(return_value=mock_connection)
    mock_service.__exit__ = Mock(return_value=None)

    return mock_service


@pytest.mark.slow
@pytest.mark.integration
@pytest.mark.management
class TestEmergencyOperations:
    """Test core emergency operations functionality."""

    @pytest.fixture
    def emergency_ops(self, mock_database_service):
        """Create emergency operations manager for testing."""
        return EmergencyOperations(database_service=mock_database_service)

    def test_emergency_ops_initialization(self, emergency_ops):
        """Test that emergency operations manager initializes properly."""
        assert emergency_ops is not None
        assert hasattr(emergency_ops, "rollback_manager")
        assert hasattr(emergency_ops, "recovery_manager")
        assert hasattr(emergency_ops, "logger")

    def test_get_system_status(self, emergency_ops):
        """Test getting comprehensive system status."""
        status = emergency_ops.get_system_status()

        # Required status fields
        assert "timestamp" in status
        assert "database_status" in status
        assert "active_scrapers" in status
        assert "recent_failures" in status
        assert "system_health" in status

        # System health should be a classification
        assert status["system_health"] in ["healthy", "degraded", "critical"]

    def test_emergency_stop_all_scrapers(self, emergency_ops):
        """Test emergency stop functionality."""
        with patch.object(emergency_ops.coordinator, "emergency_stop_all_scrapers") as mock_stop:
            mock_stop.return_value = {"success": True, "stopped": 3, "failed": 0}

            result = emergency_ops.emergency_stop_all_scrapers()

            assert result["success"] is True
            assert "stopped" in result
            mock_stop.assert_called_once()

    def test_emergency_disable_organization(self, emergency_ops):
        """Test emergency disabling of specific organization."""
        org_id = 1
        reason = "Catastrophic failure detected"

        with patch.object(emergency_ops.coordinator, "emergency_disable_organization") as mock_disable:
            mock_disable.return_value = {
                "success": True,
                "organization_id": org_id,
                "reason": reason,
                "timestamp": datetime.now(),
            }

            result = emergency_ops.emergency_disable_organization(org_id, reason)

            assert result["success"] is True
            assert result["organization_id"] == org_id
            assert result["reason"] == reason
            mock_disable.assert_called_once_with(org_id, reason)


class TestRollbackManager:
    """Test rollback functionality for scraper data."""

    @pytest.fixture
    def rollback_manager(self, mock_database_service):
        """Create rollback manager for testing."""
        return RollbackService(database_service=mock_database_service)

    def test_rollback_manager_initialization(self, rollback_manager):
        """Test rollback manager initializes properly."""
        assert rollback_manager is not None
        assert hasattr(rollback_manager, "logger")

    def test_get_available_snapshots(self, rollback_manager, mock_database_service):
        """Test getting available data snapshots for rollback."""
        org_id = 1
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock snapshot data from database
        mock_cursor.fetchall.return_value = [("snap_20231201_120000", datetime.now() - timedelta(hours=1), org_id, 45, "session_123")]

        snapshots = rollback_manager.get_available_snapshots(org_id)

        assert len(snapshots) == 1
        assert snapshots[0]["organization_id"] == org_id
        assert snapshots[0]["animals_count"] == 45

    def test_rollback_to_snapshot(self, rollback_manager):
        """Test rolling back organization data to a specific snapshot."""
        org_id = 1
        snapshot_id = "snap_20231201_120000"

        with patch.object(rollback_manager, "_execute_rollback") as mock_rollback:
            mock_rollback.return_value = {"success": True, "animals_restored": 45, "animals_removed": 3, "backup_created": "backup_20231201_130000"}

            result = rollback_manager.rollback_to_snapshot(org_id, snapshot_id, require_confirmation=False)

            assert result["success"] is True
            assert "animals_restored" in result
            assert "backup_created" in result
            mock_rollback.assert_called_once_with(org_id, snapshot_id)

    def test_rollback_last_scrape(self, rollback_manager):
        """Test rolling back the most recent scrape for an organization."""
        org_id = 1

        with patch.object(rollback_manager, "_get_last_scrape_session") as mock_get_session:
            with patch.object(rollback_manager, "_rollback_scrape_session") as mock_rollback:
                mock_get_session.return_value = "session_456"
                mock_rollback.return_value = {"success": True, "session_id": "session_456", "animals_affected": 12}

                result = rollback_manager.rollback_last_scrape(org_id)

                assert result["success"] is True
                assert result["session_id"] == "session_456"
                mock_get_session.assert_called_once_with(org_id)
                mock_rollback.assert_called_once_with(org_id, "session_456")

    def test_create_data_backup(self, rollback_manager):
        """Test creating emergency data backup."""
        org_id = 1
        backup_reason = "Before emergency rollback"

        with patch.object(rollback_manager, "_create_backup") as mock_backup:
            mock_backup.return_value = {"backup_id": "backup_20231201_140000", "created_at": datetime.now(), "animals_count": 48, "size_mb": 2.3}

            result = rollback_manager.create_data_backup(org_id, backup_reason)

            assert "backup_id" in result
            assert "animals_count" in result
            mock_backup.assert_called_once_with(org_id, backup_reason)


class TestDataRecoveryManager:
    """Test data recovery and repair functionality."""

    @pytest.fixture
    def recovery_manager(self, mock_database_service):
        """Create data recovery manager for testing."""
        return DataRecoveryService(database_service=mock_database_service)

    def test_recovery_manager_initialization(self, recovery_manager):
        """Test recovery manager initializes properly."""
        assert recovery_manager is not None
        assert hasattr(recovery_manager, "logger")

    def test_detect_data_corruption(self, recovery_manager):
        """Test detecting data corruption or inconsistencies."""
        org_id = 1

        with patch.object(recovery_manager, "_analyze_data_integrity") as mock_analyze:
            mock_analyze.return_value = {"corrupted_records": 2, "missing_required_fields": 5, "duplicate_external_ids": 1, "orphaned_images": 3, "integrity_score": 0.92}

            result = recovery_manager.detect_data_corruption(org_id)

            assert "integrity_score" in result
            assert "corrupted_records" in result
            assert result["integrity_score"] < 1.0  # Some issues detected
            mock_analyze.assert_called_once_with(org_id)

    def test_repair_data_corruption(self, recovery_manager):
        """Test repairing detected data corruption."""
        org_id = 1
        corruption_report = {"missing_required_fields": 5, "duplicate_external_ids": 1}

        with patch.object(recovery_manager, "_repair_missing_fields") as mock_repair_fields:
            with patch.object(recovery_manager, "_resolve_duplicates") as mock_resolve_dupes:
                mock_repair_fields.return_value = {"repaired": 3, "failed": 2}
                mock_resolve_dupes.return_value = {"resolved": 1, "failed": 0}

                result = recovery_manager.repair_data_corruption(org_id, corruption_report)

                assert result["success"] is True
                assert "repairs_performed" in result
                mock_repair_fields.assert_called_once()
                mock_resolve_dupes.assert_called_once()

    def test_recover_from_backup(self, recovery_manager):
        """Test recovering organization data from backup."""
        org_id = 1
        backup_id = "backup_20231201_140000"

        with patch.object(recovery_manager, "_restore_from_backup") as mock_restore:
            mock_restore.return_value = {"success": True, "animals_restored": 48, "images_restored": 120, "restoration_time": "2023-12-01 15:30:00"}

            result = recovery_manager.recover_from_backup(org_id, backup_id)

            assert result["success"] is True
            assert "animals_restored" in result
            mock_restore.assert_called_once_with(org_id, backup_id)

    def test_validate_data_consistency(self, recovery_manager):
        """Test validating data consistency after recovery."""
        org_id = 1

        with patch.object(recovery_manager, "_validate_consistency") as mock_validate:
            mock_validate.return_value = {"consistent": True, "total_animals": 48, "animals_with_images": 45, "external_id_uniqueness": 1.0, "validation_timestamp": datetime.now()}

            result = recovery_manager.validate_data_consistency(org_id)

            assert result["consistent"] is True
            assert "total_animals" in result
            assert "external_id_uniqueness" in result
            mock_validate.assert_called_once_with(org_id)


class TestEmergencyOperationsIntegration:
    """Test integration between emergency operations components."""

    @pytest.fixture
    def emergency_ops(self):
        """Create emergency operations manager for testing."""
        return EmergencyOperations()

    def test_complete_emergency_recovery_workflow(self, emergency_ops):
        """Test complete emergency recovery workflow."""
        org_id = 1

        # Mock the coordinator's execute_emergency_recovery method
        with patch.object(emergency_ops.coordinator, "execute_emergency_recovery") as mock_recovery:
            mock_recovery.return_value = {"success": True, "backup_id": "backup_123", "recovery_summary": {"animals_affected": 5, "data_consistent": True}}

            result = emergency_ops.execute_emergency_recovery(org_id)

            assert result["success"] is True
            assert "backup_id" in result
            assert "recovery_summary" in result

            # Verify coordinator was called
            mock_recovery.assert_called_once_with(org_id)

    def test_emergency_recovery_with_failure(self, emergency_ops):
        """Test emergency recovery handles intermediate failures gracefully."""
        org_id = 1

        # Mock the coordinator's execute_emergency_recovery method to return failure
        with patch.object(emergency_ops.coordinator, "execute_emergency_recovery") as mock_recovery:
            mock_recovery.return_value = {"success": False, "backup_id": "backup_123", "error": "Rollback failed: Database connection failed"}

            result = emergency_ops.execute_emergency_recovery(org_id)

            assert result["success"] is False
            assert "backup_id" in result  # Backup should still be created
            assert "error" in result
            assert "rollback" in result["error"].lower()
            mock_recovery.assert_called_once_with(org_id)

    def test_get_recovery_status(self, emergency_ops):
        """Test getting status of ongoing recovery operations."""
        with patch.object(emergency_ops.coordinator, "get_recovery_status") as mock_status:
            mock_status.return_value = {
                "active_recoveries": 1,
                "completed_recoveries": 3,
                "failed_recoveries": 0,
                "operations": [{"operation_id": "recovery_789", "organization_id": 1, "status": "in_progress", "started_at": datetime.now() - timedelta(minutes=5)}],
            }

            status = emergency_ops.get_recovery_status()

            assert "active_recoveries" in status
            assert "operations" in status
            assert len(status["operations"]) == 1
            mock_status.assert_called_once()


class TestEmergencyOperationsCommands:
    """Test command-line interface for emergency operations."""

    def test_emergency_cli_commands_exist(self):
        """Test that emergency CLI commands are available."""
        # This would test the actual CLI commands
        # For now, just verify the structure exists
        from management.emergency_operations import EmergencyOperationsCommands

        cli = EmergencyOperationsCommands()
        assert hasattr(cli, "emergency_stop")
        assert hasattr(cli, "rollback_organization")
        assert hasattr(cli, "create_backup")
        assert hasattr(cli, "system_status")

    def test_emergency_stop_command(self):
        """Test emergency stop CLI command."""
        from management.emergency_operations import EmergencyOperationsCommands

        cli = EmergencyOperationsCommands()

        with patch.object(cli.cli, "emergency_stop") as mock_stop:
            mock_stop.return_value = {"success": True, "stopped": 2}

            result = cli.emergency_stop()

            assert result["success"] is True
            mock_stop.assert_called_once()

    def test_rollback_command(self):
        """Test rollback CLI command."""
        from management.emergency_operations import EmergencyOperationsCommands

        cli = EmergencyOperationsCommands()
        org_id = 1

        with patch.object(cli.cli, "rollback_organization") as mock_rollback:
            mock_rollback.return_value = {"success": True, "animals_affected": 10}

            result = cli.rollback_organization(org_id)

            assert result["success"] is True
            mock_rollback.assert_called_once_with(org_id)

    def test_system_status_command(self):
        """Test system status CLI command."""
        from management.emergency_operations import EmergencyOperationsCommands

        cli = EmergencyOperationsCommands()

        with patch.object(cli.cli, "system_status") as mock_status:
            mock_status.return_value = {"system_health": "healthy", "active_scrapers": 0, "recent_failures": 0}

            result = cli.system_status()

            assert "system_health" in result
            mock_status.assert_called_once()


class TestEmergencyOperationsSafety:
    """Test safety mechanisms in emergency operations."""

    @pytest.fixture
    def emergency_ops(self):
        """Create emergency operations manager for testing."""
        return EmergencyOperations()

    def test_requires_confirmation_for_destructive_operations(self, emergency_ops):
        """Test that destructive operations require confirmation."""
        org_id = 1

        # This should require confirmation before proceeding
        with patch("builtins.input", return_value="no"):
            result = emergency_ops.rollback_manager.rollback_to_snapshot(org_id, "snap_123", require_confirmation=True)

            assert result["success"] is False
            assert "cancelled" in result["reason"].lower()

    def test_creates_backup_before_destructive_operations(self, emergency_ops):
        """Test that backups are created before destructive operations."""
        org_id = 1

        with patch.object(emergency_ops.rollback_manager, "_create_backup") as mock_backup:
            with patch.object(emergency_ops.rollback_manager, "_get_last_scrape_session") as mock_get_session:
                with patch.object(emergency_ops.rollback_manager, "_rollback_scrape_session") as mock_rollback:
                    mock_backup.return_value = {"backup_id": "safety_backup_123"}
                    mock_get_session.return_value = "session_123"
                    mock_rollback.return_value = {"success": True}

                    emergency_ops.rollback_manager.rollback_last_scrape(org_id)

                    # Should create safety backup first
                    mock_backup.assert_called()
                    mock_rollback.assert_called()

    def test_validates_operation_safety(self, emergency_ops):
        """Test that operations validate safety before execution."""
        org_id = 1

        with patch.object(emergency_ops.coordinator, "_validate_operation_safety") as mock_validate:
            mock_validate.return_value = {"safe": False, "reasons": ["Active scraper running", "Recent backup not found"]}

            result = emergency_ops.execute_emergency_recovery(org_id)

            assert result["success"] is False
            assert "safety validation failed" in result["error"].lower()
            mock_validate.assert_called_once()

    def test_logs_all_emergency_operations(self, emergency_ops):
        """Test that all emergency operations are comprehensively logged."""
        org_id = 1

        with patch.object(emergency_ops.scraper_control.logger, "warning") as mock_warning:
            with patch.object(emergency_ops.scraper_control, "stop_running_scrapers") as mock_stop_impl:
                mock_stop_impl.return_value = {"stopped": 1, "failed": 0}

                emergency_ops.emergency_stop_all_scrapers()

                # Should log the emergency operation
                assert mock_warning.called
