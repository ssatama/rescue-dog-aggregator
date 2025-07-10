"""
Test EmergencyCoordinator - TDD approach for emergency operations decomposition.

Following CLAUDE.md principles:
- Test first, code second
- Pure functions, no mutations
- Immutable data patterns
- Early returns, no nested conditionals
"""

from datetime import datetime
from unittest.mock import Mock, patch

import pytest

from management.services.database_service import DatabaseService


class TestEmergencyCoordinatorInterface:
    """Test EmergencyCoordinator interface contract."""

    def test_emergency_coordinator_interface_exists(self):
        """Test that EmergencyCoordinator implements expected interface."""
        try:
            from management.emergency.emergency_coordinator import EmergencyCoordinator

            assert hasattr(EmergencyCoordinator, "__init__")
            assert hasattr(EmergencyCoordinator, "get_system_status")
            assert hasattr(EmergencyCoordinator, "emergency_stop_all_scrapers")
            assert hasattr(EmergencyCoordinator, "emergency_disable_organization")
            assert hasattr(EmergencyCoordinator, "execute_emergency_recovery")
            assert hasattr(EmergencyCoordinator, "get_recovery_status")
        except ImportError:
            pytest.fail("EmergencyCoordinator not yet implemented - expected for TDD")


class TestEmergencyCoordinatorImplementation:
    """Test EmergencyCoordinator implementation with mocked dependencies."""

    @pytest.fixture
    def mock_database_service(self):
        """Create mock DatabaseService for testing."""
        mock_service = Mock(spec=DatabaseService)

        # Create mock connection for context manager
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor

        # Configure cursor methods
        mock_cursor.execute = Mock()
        mock_cursor.fetchone.return_value = (0,)
        mock_cursor.fetchall.return_value = []
        mock_cursor.close = Mock()
        mock_connection.commit = Mock()

        # Configure context manager
        mock_service.__enter__ = Mock(return_value=mock_connection)
        mock_service.__exit__ = Mock(return_value=None)

        return mock_service

    @pytest.fixture
    def mock_system_monitoring(self):
        """Create mock SystemMonitoringService."""
        mock_monitoring = Mock()
        mock_monitoring.get_system_status.return_value = {"database_status": "connected", "active_scrapers": 0, "recent_failures": 0, "system_health": "healthy"}
        return mock_monitoring

    @pytest.fixture
    def mock_scraper_control(self):
        """Create mock ScraperControlService."""
        mock_control = Mock()
        mock_control.emergency_stop_all_scrapers.return_value = {"success": True, "stopped": 0, "failed": 0}
        return mock_control

    @pytest.fixture
    def mock_rollback_service(self):
        """Create mock RollbackService."""
        mock_rollback = Mock()
        mock_rollback.create_data_backup.return_value = {"backup_id": "backup_123", "created_at": datetime.now()}
        mock_rollback.rollback_last_scrape.return_value = {"success": True, "animals_affected": 5}
        return mock_rollback

    @pytest.fixture
    def mock_recovery_service(self):
        """Create mock DataRecoveryService."""
        mock_recovery = Mock()
        mock_recovery.validate_data_consistency.return_value = {"consistent": True, "total_animals": 48}
        return mock_recovery

    @pytest.fixture
    def coordinator(self, mock_database_service, mock_system_monitoring, mock_scraper_control, mock_rollback_service, mock_recovery_service):
        """Create EmergencyCoordinator for testing."""
        from management.emergency.emergency_coordinator import EmergencyCoordinator

        # Inject all mocked services
        coordinator = EmergencyCoordinator(mock_database_service)
        coordinator.system_monitoring = mock_system_monitoring
        coordinator.scraper_control = mock_scraper_control
        coordinator.rollback_service = mock_rollback_service
        coordinator.recovery_service = mock_recovery_service

        return coordinator

    def test_coordinator_initialization(self, mock_database_service):
        """Test that coordinator initializes properly."""
        from management.emergency.emergency_coordinator import EmergencyCoordinator

        coordinator = EmergencyCoordinator(mock_database_service)

        assert coordinator is not None
        assert hasattr(coordinator, "database_service")
        assert hasattr(coordinator, "system_monitoring")
        assert hasattr(coordinator, "scraper_control")
        assert hasattr(coordinator, "rollback_service")
        assert hasattr(coordinator, "recovery_service")
        assert hasattr(coordinator, "logger")

    def test_get_system_status_delegates_properly(self, coordinator, mock_system_monitoring):
        """Test system status delegates to monitoring service."""
        result = coordinator.get_system_status()

        assert "database_status" in result
        assert "system_health" in result
        mock_system_monitoring.get_system_status.assert_called_once()

    def test_get_system_status_adds_critical_errors(self, coordinator, mock_database_service):
        """Test system status adds emergency-specific critical errors."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock critical errors data
        mock_cursor.fetchall.return_value = [("Test Org", "Connection timeout", datetime.now()), ("Another Org", "Parse error", datetime.now())]

        result = coordinator.get_system_status()

        assert "critical_errors" in result
        assert len(result["critical_errors"]) == 2
        assert result["critical_errors"][0]["organization"] == "Test Org"

    def test_emergency_stop_all_scrapers_delegates(self, coordinator, mock_scraper_control):
        """Test emergency stop delegates to scraper control."""
        result = coordinator.emergency_stop_all_scrapers()

        assert result["success"] is True
        mock_scraper_control.emergency_stop_all_scrapers.assert_called_once()

    def test_emergency_disable_organization_delegates(self, coordinator, mock_scraper_control):
        """Test emergency disable delegates to scraper control."""
        org_id = 1
        reason = "Critical failure"

        mock_scraper_control.emergency_disable_organization.return_value = {"success": True, "organization_id": org_id, "reason": reason}

        result = coordinator.emergency_disable_organization(org_id, reason)

        assert result["success"] is True
        assert result["organization_id"] == org_id
        mock_scraper_control.emergency_disable_organization.assert_called_once_with(org_id, reason)

    def test_execute_emergency_recovery_success(self, coordinator, mock_scraper_control, mock_rollback_service, mock_recovery_service):
        """Test successful emergency recovery workflow."""
        org_id = 1

        with patch.object(coordinator, "_validate_operation_safety") as mock_safety:
            mock_safety.return_value = {"safe": True}

            result = coordinator.execute_emergency_recovery(org_id)

            assert result["success"] is True
            assert "backup_id" in result
            assert "recovery_summary" in result

            # Verify workflow order
            mock_safety.assert_called_once()
            mock_scraper_control.emergency_stop_all_scrapers.assert_called_once()
            mock_rollback_service.create_data_backup.assert_called_once()
            mock_rollback_service.rollback_last_scrape.assert_called_once()
            mock_recovery_service.validate_data_consistency.assert_called_once()

    def test_execute_emergency_recovery_safety_failure(self, coordinator):
        """Test emergency recovery aborts on safety check failure."""
        org_id = 1

        with patch.object(coordinator, "_validate_operation_safety") as mock_safety:
            mock_safety.return_value = {"safe": False, "reasons": ["Active scraper running", "No recent backup"]}

            result = coordinator.execute_emergency_recovery(org_id)

            assert result["success"] is False
            assert "safety validation failed" in result["error"].lower()
            assert result["safety_reasons"] == ["Active scraper running", "No recent backup"]

    def test_execute_emergency_recovery_rollback_failure(self, coordinator, mock_scraper_control, mock_rollback_service):
        """Test emergency recovery handles rollback failure."""
        org_id = 1

        mock_rollback_service.rollback_last_scrape.return_value = {"success": False, "error": "Database error"}

        with patch.object(coordinator, "_validate_operation_safety") as mock_safety:
            mock_safety.return_value = {"safe": True}

            result = coordinator.execute_emergency_recovery(org_id)

            assert result["success"] is False
            assert "rollback failed" in result["error"].lower()
            assert result["backup_id"] == "backup_123"  # Backup was created

    def test_get_recovery_status(self, coordinator):
        """Test getting recovery operation status."""
        with patch.object(coordinator, "_check_recovery_operations") as mock_check:
            mock_check.return_value = {"active_recoveries": 1, "completed_recoveries": 3, "failed_recoveries": 0, "operations": []}

            result = coordinator.get_recovery_status()

            assert "active_recoveries" in result
            assert result["active_recoveries"] == 1
            mock_check.assert_called_once()

    def test_validate_operation_safety_all_clear(self, coordinator, mock_database_service):
        """Test safety validation when all checks pass."""
        org_id = 1
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock no active scrapers and recent backup exists
        mock_cursor.fetchone.side_effect = [
            (0,),  # No active scrapers
            (1,),  # Recent backup exists
        ]

        result = coordinator._validate_operation_safety(org_id)

        assert result["safe"] is True
        assert len(result["reasons"]) == 0

    def test_validate_operation_safety_with_issues(self, coordinator, mock_database_service):
        """Test safety validation when issues are found."""
        org_id = 1
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock active scrapers and no recent backup
        mock_cursor.fetchone.side_effect = [
            (2,),  # 2 active scrapers
            (0,),  # No recent backup
        ]

        result = coordinator._validate_operation_safety(org_id)

        assert result["safe"] is False
        assert len(result["reasons"]) == 2
        assert "active scraper running" in result["reasons"][0].lower()
        assert "no recent backup" in result["reasons"][1].lower()


class TestEmergencyCoordinatorErrorHandling:
    """Test EmergencyCoordinator error handling patterns."""

    @pytest.fixture
    def mock_database_service(self):
        """Create mock DatabaseService for testing."""
        mock_service = Mock(spec=DatabaseService)
        mock_service.__enter__ = Mock(return_value=Mock())
        mock_service.__exit__ = Mock(return_value=None)
        return mock_service

    @pytest.fixture
    def coordinator(self, mock_database_service):
        """Create EmergencyCoordinator for testing."""
        from management.emergency.emergency_coordinator import EmergencyCoordinator

        return EmergencyCoordinator(mock_database_service)

    def test_database_error_in_system_status(self, coordinator, mock_database_service):
        """Test handling of database errors in system status."""
        mock_database_service.__enter__.side_effect = Exception("Connection failed")

        result = coordinator.get_system_status()

        # Should still return basic status even if critical errors fail
        assert "database_status" in result
        assert "critical_errors" in result
        assert result["critical_errors"] == []

    def test_validation_error_handling(self, coordinator, mock_database_service):
        """Test handling of errors during safety validation."""
        org_id = 1
        mock_database_service.__enter__.side_effect = Exception("Validation query failed")

        result = coordinator._validate_operation_safety(org_id)

        assert result["safe"] is False
        assert "safety validation error" in result["reasons"][0].lower()

    def test_recovery_workflow_exception_handling(self, coordinator):
        """Test handling of unexpected exceptions in recovery workflow."""
        org_id = 1

        with patch.object(coordinator, "_validate_operation_safety") as mock_safety:
            mock_safety.side_effect = Exception("Unexpected error")

            result = coordinator.execute_emergency_recovery(org_id)

            assert result["success"] is False
            assert "error" in result
            assert "Unexpected error" in result["error"]
