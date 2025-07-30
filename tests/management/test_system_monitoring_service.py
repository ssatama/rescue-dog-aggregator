"""
Test SystemMonitoringService - TDD approach for emergency operations decomposition.

Following CLAUDE.md principles:
- Test first, code second
- Pure functions, no mutations
- Immutable data patterns
- Early returns, no nested conditionals
"""

from datetime import datetime, timedelta
from unittest.mock import Mock

import pytest

from management.services.database_service import DatabaseService


@pytest.mark.integration
@pytest.mark.management
@pytest.mark.slow
class TestSystemMonitoringServiceInterface:
    """Test SystemMonitoringService interface contract."""

    def test_system_monitoring_service_interface_exists(self):
        """Test that SystemMonitoringService implements expected interface."""
        try:
            from management.emergency.system_monitoring_service import SystemMonitoringService

            assert hasattr(SystemMonitoringService, "__init__")
            assert hasattr(SystemMonitoringService, "get_system_status")
            assert hasattr(SystemMonitoringService, "check_system_health")
            assert hasattr(SystemMonitoringService, "get_failure_metrics")
            assert hasattr(SystemMonitoringService, "is_system_degraded")
        except ImportError:
            pytest.fail("SystemMonitoringService not yet implemented - expected for TDD")


class TestSystemMonitoringServiceImplementation:
    """Test SystemMonitoringService implementation with mocked dependencies."""

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

        # Configure context manager
        mock_service.__enter__ = Mock(return_value=mock_connection)
        mock_service.__exit__ = Mock(return_value=None)

        return mock_service

    @pytest.fixture
    def monitoring_service(self, mock_database_service):
        """Create SystemMonitoringService for testing."""
        from management.emergency.system_monitoring_service import SystemMonitoringService

        return SystemMonitoringService(mock_database_service)

    def test_monitoring_service_initialization(self, monitoring_service):
        """Test that monitoring service initializes properly."""
        assert monitoring_service is not None
        assert hasattr(monitoring_service, "database_service")
        assert hasattr(monitoring_service, "logger")

    def test_get_system_status_healthy_system(self, monitoring_service, mock_database_service):
        """Test getting system status when system is healthy."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock healthy system: few active scrapers, no recent failures
        mock_cursor.fetchone.side_effect = [
            (2,),  # active scrapers
            (1,),  # recent failures
            (10,),  # total scrapes
        ]

        status = monitoring_service.get_system_status()

        assert "timestamp" in status
        assert "database_status" in status
        assert "active_scrapers" in status
        assert "recent_failures" in status
        assert "failure_rate_24h" in status
        assert "system_health" in status

        assert status["active_scrapers"] == 2
        assert status["recent_failures"] == 1
        assert status["failure_rate_24h"] == 10.0
        assert status["system_health"] == "healthy"

    def test_get_system_status_degraded_system(self, monitoring_service, mock_database_service):
        """Test getting system status when system is degraded."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock degraded system: moderate failures
        mock_cursor.fetchone.side_effect = [
            (3,),  # active scrapers
            (12,),  # recent failures (>10)
            (40,),  # total scrapes
        ]

        status = monitoring_service.get_system_status()

        assert status["active_scrapers"] == 3
        assert status["recent_failures"] == 12
        assert status["failure_rate_24h"] == 30.0
        assert status["system_health"] == "degraded"

    def test_get_system_status_critical_system(self, monitoring_service, mock_database_service):
        """Test getting system status when system is critical."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock critical system: high failure rate
        mock_cursor.fetchone.side_effect = [
            (6,),  # active scrapers (>5)
            (25,),  # recent failures
            (40,),  # total scrapes
        ]

        status = monitoring_service.get_system_status()

        assert status["active_scrapers"] == 6
        assert status["recent_failures"] == 25
        assert status["failure_rate_24h"] == 62.5
        assert status["system_health"] == "critical"

    def test_check_system_health_healthy(self, monitoring_service):
        """Test system health check for healthy system."""
        health_status = monitoring_service.check_system_health(failure_rate=5.0, active_scrapers=2, recent_failures=2)

        assert health_status == "healthy"

    def test_check_system_health_degraded(self, monitoring_service):
        """Test system health check for degraded system."""
        health_status = monitoring_service.check_system_health(failure_rate=25.0, active_scrapers=3, recent_failures=15)

        assert health_status == "degraded"

    def test_check_system_health_critical(self, monitoring_service):
        """Test system health check for critical system."""
        health_status = monitoring_service.check_system_health(failure_rate=60.0, active_scrapers=7, recent_failures=30)

        assert health_status == "critical"

    def test_get_failure_metrics(self, monitoring_service, mock_database_service):
        """Test getting failure metrics calculation."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        mock_cursor.fetchone.side_effect = [
            (8,),  # recent failures
            (50,),  # total scrapes
        ]

        metrics = monitoring_service.get_failure_metrics()

        assert "recent_failures" in metrics
        assert "total_scrapes" in metrics
        assert "failure_rate_24h" in metrics

        assert metrics["recent_failures"] == 8
        assert metrics["total_scrapes"] == 50
        assert metrics["failure_rate_24h"] == 16.0

    def test_get_failure_metrics_no_scrapes(self, monitoring_service, mock_database_service):
        """Test failure metrics when no scrapes exist."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        mock_cursor.fetchone.side_effect = [
            (0,),  # recent failures
            (0,),  # total scrapes
        ]

        metrics = monitoring_service.get_failure_metrics()

        assert metrics["recent_failures"] == 0
        assert metrics["total_scrapes"] == 0
        assert metrics["failure_rate_24h"] == 0.0

    def test_is_system_degraded_healthy(self, monitoring_service):
        """Test degradation check for healthy system."""
        is_degraded = monitoring_service.is_system_degraded(failure_rate=10.0, active_scrapers=2)

        assert is_degraded is False

    def test_is_system_degraded_true(self, monitoring_service):
        """Test degradation check for degraded system."""
        is_degraded = monitoring_service.is_system_degraded(failure_rate=25.0, active_scrapers=4)

        assert is_degraded is True

    def test_database_connection_error_handling(self, monitoring_service, mock_database_service):
        """Test handling of database connection errors."""
        mock_database_service.__enter__.side_effect = Exception("Connection failed")

        status = monitoring_service.get_system_status()

        assert status["database_status"] == "error"
        assert status["system_health"] == "critical"
        assert "error" in status


class TestSystemMonitoringServiceBoundaryConditions:
    """Test SystemMonitoringService boundary conditions and edge cases."""

    @pytest.fixture
    def mock_database_service(self):
        """Create mock DatabaseService for testing."""
        mock_service = Mock(spec=DatabaseService)
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.execute = Mock()
        mock_cursor.close = Mock()
        mock_service.__enter__ = Mock(return_value=mock_connection)
        mock_service.__exit__ = Mock(return_value=None)
        return mock_service

    @pytest.fixture
    def monitoring_service(self, mock_database_service):
        """Create SystemMonitoringService for testing."""
        from management.emergency.system_monitoring_service import SystemMonitoringService

        return SystemMonitoringService(mock_database_service)

    def test_health_thresholds_boundary_values(self, monitoring_service):
        """Test system health at exact threshold boundary values."""
        # Exactly at degraded threshold (20% failure rate)
        health = monitoring_service.check_system_health(failure_rate=20.0, active_scrapers=3, recent_failures=10)
        assert health == "healthy"

        # Just above degraded threshold
        health = monitoring_service.check_system_health(failure_rate=20.1, active_scrapers=3, recent_failures=11)
        assert health == "degraded"

        # Exactly at critical threshold (50% failure rate)
        health = monitoring_service.check_system_health(failure_rate=50.0, active_scrapers=3, recent_failures=25)
        assert health == "degraded"

        # Just above critical threshold
        health = monitoring_service.check_system_health(failure_rate=50.1, active_scrapers=3, recent_failures=26)
        assert health == "critical"

    def test_active_scrapers_threshold(self, monitoring_service):
        """Test active scrapers threshold for critical status."""
        # Exactly at threshold (5 active scrapers)
        health = monitoring_service.check_system_health(failure_rate=10.0, active_scrapers=5, recent_failures=5)
        assert health == "healthy"

        # Above threshold (6 active scrapers)
        health = monitoring_service.check_system_health(failure_rate=10.0, active_scrapers=6, recent_failures=5)
        assert health == "critical"

    def test_query_error_handling(self, monitoring_service, mock_database_service):
        """Test handling of database query errors."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value
        mock_cursor.execute.side_effect = Exception("Query failed")

        status = monitoring_service.get_system_status()

        assert status["database_status"] == "error"
        assert status["system_health"] == "critical"
