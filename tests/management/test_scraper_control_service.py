"""
Test ScraperControlService - TDD approach for emergency operations decomposition.

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


class TestScraperControlServiceInterface:
    """Test ScraperControlService interface contract."""

    def test_scraper_control_service_interface_exists(self):
        """Test that ScraperControlService implements expected interface."""
        try:
            from management.emergency.scraper_control_service import ScraperControlService

            assert hasattr(ScraperControlService, "__init__")
            assert hasattr(ScraperControlService, "emergency_stop_all_scrapers")
            assert hasattr(ScraperControlService, "emergency_disable_organization")
            assert hasattr(ScraperControlService, "stop_running_scrapers")
            assert hasattr(ScraperControlService, "disable_organization_scrapers")
        except ImportError:
            pytest.fail("ScraperControlService not yet implemented - expected for TDD")


class TestScraperControlServiceImplementation:
    """Test ScraperControlService implementation with mocked dependencies."""

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
        mock_cursor.fetchall.return_value = []
        mock_cursor.close = Mock()

        # Configure context manager
        mock_service.__enter__ = Mock(return_value=mock_connection)
        mock_service.__exit__ = Mock(return_value=None)

        return mock_service

    @pytest.fixture
    def mock_config_loader(self):
        """Create mock ConfigLoader for testing."""
        mock_loader = Mock()
        mock_loader.get_all_organizations.return_value = [{"id": "test-org", "name": "Test Organization", "enabled": True}]
        return mock_loader

    @pytest.fixture
    def control_service(self, mock_database_service, mock_config_loader):
        """Create ScraperControlService for testing."""
        from management.emergency.scraper_control_service import ScraperControlService

        return ScraperControlService(mock_database_service, mock_config_loader)

    def test_control_service_initialization(self, control_service):
        """Test that control service initializes properly."""
        assert control_service is not None
        assert hasattr(control_service, "database_service")
        assert hasattr(control_service, "config_loader")
        assert hasattr(control_service, "logger")

    def test_emergency_stop_all_scrapers_success(self, control_service):
        """Test successful emergency stop of all scrapers."""
        with patch.object(control_service, "stop_running_scrapers") as mock_stop:
            mock_stop.return_value = {"stopped": 3, "failed": 0}

            result = control_service.emergency_stop_all_scrapers()

            assert result["success"] is True
            assert result["stopped"] == 3
            assert result["failed"] == 0
            assert "timestamp" in result
            mock_stop.assert_called_once()

    def test_emergency_stop_all_scrapers_with_failures(self, control_service):
        """Test emergency stop when some scrapers fail to stop."""
        with patch.object(control_service, "stop_running_scrapers") as mock_stop:
            mock_stop.return_value = {"stopped": 2, "failed": 1}

            result = control_service.emergency_stop_all_scrapers()

            assert result["success"] is True  # Still successful even with some failures
            assert result["stopped"] == 2
            assert result["failed"] == 1

    def test_emergency_disable_organization_success(self, control_service):
        """Test successful emergency disabling of organization."""
        org_id = 1
        reason = "Critical failure detected"

        with patch.object(control_service, "disable_organization_scrapers") as mock_disable:
            mock_disable.return_value = True

            result = control_service.emergency_disable_organization(org_id, reason)

            assert result["success"] is True
            assert result["organization_id"] == org_id
            assert result["reason"] == reason
            assert "timestamp" in result
            mock_disable.assert_called_once_with(org_id, reason)

    def test_emergency_disable_organization_failure(self, control_service):
        """Test emergency disable when operation fails."""
        org_id = 1
        reason = "Critical failure detected"

        with patch.object(control_service, "disable_organization_scrapers") as mock_disable:
            mock_disable.return_value = False

            result = control_service.emergency_disable_organization(org_id, reason)

            assert result["success"] is False
            assert result["organization_id"] == org_id
            assert result["reason"] == reason

    def test_stop_running_scrapers_implementation(self, control_service, mock_database_service):
        """Test stop_running_scrapers implementation."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock running scrapers data
        mock_cursor.fetchall.return_value = [(1, "session_123"), (2, "session_456"), (3, "session_789")]

        with patch.object(control_service, "_terminate_scraper_process") as mock_terminate:
            result = control_service.stop_running_scrapers()

            assert "stopped" in result
            assert "failed" in result
            assert result["stopped"] == 3
            assert result["failed"] == 0
            # Should attempt to stop each scraper session
            assert mock_terminate.call_count == 3

    def test_disable_organization_scrapers_implementation(self, control_service, mock_database_service):
        """Test disable_organization_scrapers implementation."""
        org_id = 1
        reason = "Emergency disable"

        result = control_service.disable_organization_scrapers(org_id, reason)

        # Should return boolean indicating success/failure
        assert isinstance(result, bool)

    def test_database_connection_error_handling(self, control_service, mock_database_service):
        """Test handling of database connection errors."""
        mock_database_service.__enter__.side_effect = Exception("Connection failed")

        result = control_service.stop_running_scrapers()

        assert "stopped" in result
        assert "failed" in result
        assert result["failed"] > 0 or result["stopped"] == 0  # Should handle error gracefully


class TestScraperControlServiceErrorHandling:
    """Test ScraperControlService error handling patterns."""

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
    def mock_config_loader(self):
        """Create mock ConfigLoader for testing."""
        return Mock()

    @pytest.fixture
    def control_service(self, mock_database_service, mock_config_loader):
        """Create ScraperControlService for testing."""
        from management.emergency.scraper_control_service import ScraperControlService

        return ScraperControlService(mock_database_service, mock_config_loader)

    def test_query_error_handling(self, control_service, mock_database_service):
        """Test handling of database query errors."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value
        mock_cursor.execute.side_effect = Exception("Query failed")

        result = control_service.stop_running_scrapers()

        assert "stopped" in result
        assert "failed" in result

    def test_process_termination_error_handling(self, control_service, mock_database_service):
        """Test handling of process termination errors when stopping scrapers."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value
        mock_cursor.fetchall.return_value = [(1, "session_123")]

        with patch.object(control_service, "_terminate_scraper_process") as mock_terminate:
            mock_terminate.side_effect = Exception("Process failed")

            result = control_service.stop_running_scrapers()

            assert result["failed"] >= 1  # Should count failed processes

    def test_partial_failure_handling(self, control_service, mock_database_service):
        """Test handling when some scrapers stop successfully and some fail."""
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value
        mock_cursor.fetchall.return_value = [(1, "session_123"), (2, "session_456")]

        with patch.object(control_service, "_terminate_scraper_process") as mock_terminate:
            # First call succeeds, second fails
            mock_terminate.side_effect = [None, Exception("Process failed")]  # Success  # Failure

            result = control_service.stop_running_scrapers()

            assert result["stopped"] >= 1
            assert result["failed"] >= 1


class TestScraperControlServiceIntegration:
    """Test ScraperControlService integration scenarios."""

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
    def mock_config_loader(self):
        """Create mock ConfigLoader for testing."""
        mock_loader = Mock()
        mock_loader.get_all_organizations.return_value = [{"id": "test-org", "name": "Test Organization", "enabled": True}]
        return mock_loader

    @pytest.fixture
    def control_service(self, mock_database_service, mock_config_loader):
        """Create ScraperControlService for testing."""
        from management.emergency.scraper_control_service import ScraperControlService

        return ScraperControlService(mock_database_service, mock_config_loader)

    def test_emergency_workflow_integration(self, control_service):
        """Test complete emergency workflow integration."""
        with patch.object(control_service, "stop_running_scrapers") as mock_stop:
            with patch.object(control_service, "disable_organization_scrapers") as mock_disable:
                mock_stop.return_value = {"stopped": 2, "failed": 0}
                mock_disable.return_value = True

                # Test emergency stop followed by organization disable
                stop_result = control_service.emergency_stop_all_scrapers()
                disable_result = control_service.emergency_disable_organization(1, "Emergency")

                assert stop_result["success"] is True
                assert disable_result["success"] is True
                mock_stop.assert_called_once()
                mock_disable.assert_called_once()

    def test_logging_emergency_operations(self, control_service):
        """Test that emergency operations are properly logged."""
        with patch.object(control_service.logger, "warning") as mock_warning:
            with patch.object(control_service, "stop_running_scrapers") as mock_stop:
                mock_stop.return_value = {"stopped": 1, "failed": 0}

                control_service.emergency_stop_all_scrapers()

                # Should log emergency operation
                assert mock_warning.called
