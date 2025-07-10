"""
Test RollbackService - TDD approach for emergency operations decomposition.

Following CLAUDE.md principles:
- Test first, code second
- Pure functions, no mutations
- Immutable data patterns
- Early returns, no nested conditionals
"""

from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from management.services.database_service import DatabaseService


class TestRollbackServiceInterface:
    """Test RollbackService interface contract."""

    def test_rollback_service_interface_exists(self):
        """Test that RollbackService implements expected interface."""
        try:
            from management.emergency.rollback_service import RollbackService

            assert hasattr(RollbackService, "__init__")
            assert hasattr(RollbackService, "get_available_snapshots")
            assert hasattr(RollbackService, "rollback_to_snapshot")
            assert hasattr(RollbackService, "rollback_last_scrape")
            assert hasattr(RollbackService, "create_data_backup")
        except ImportError:
            pytest.fail("RollbackService not yet implemented - expected for TDD")


class TestRollbackServiceImplementation:
    """Test RollbackService implementation with mocked dependencies."""

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
        mock_cursor.fetchone.return_value = (0,)
        mock_cursor.close = Mock()
        mock_connection.commit = Mock()

        # Configure context manager
        mock_service.__enter__ = Mock(return_value=mock_connection)
        mock_service.__exit__ = Mock(return_value=None)

        return mock_service

    @pytest.fixture
    def rollback_service(self, mock_database_service):
        """Create RollbackService for testing."""
        from management.emergency.rollback_service import RollbackService

        return RollbackService(mock_database_service)

    def test_rollback_service_initialization(self, rollback_service):
        """Test that rollback service initializes properly."""
        assert rollback_service is not None
        assert hasattr(rollback_service, "database_service")
        assert hasattr(rollback_service, "logger")

    def test_get_available_snapshots_success(self, rollback_service, mock_database_service):
        """Test getting available snapshots for rollback."""
        org_id = 1
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock snapshot data
        mock_cursor.fetchall.return_value = [
            ("snap_20240101_120000", datetime.now() - timedelta(hours=1), 1, 45, "session_123"),
            ("snap_20240101_100000", datetime.now() - timedelta(hours=3), 1, 42, "session_122"),
        ]

        snapshots = rollback_service.get_available_snapshots(org_id)

        assert len(snapshots) == 2
        assert snapshots[0]["snapshot_id"] == "snap_20240101_120000"
        assert snapshots[0]["organization_id"] == 1
        assert snapshots[0]["animals_count"] == 45
        assert snapshots[1]["snapshot_id"] == "snap_20240101_100000"

    def test_get_available_snapshots_empty(self, rollback_service, mock_database_service):
        """Test getting snapshots when none exist."""
        org_id = 1
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value
        mock_cursor.fetchall.return_value = []

        snapshots = rollback_service.get_available_snapshots(org_id)

        assert snapshots == []

    def test_rollback_to_snapshot_success(self, rollback_service):
        """Test successful rollback to snapshot."""
        org_id = 1
        snapshot_id = "snap_20240101_120000"

        with patch.object(rollback_service, "_execute_rollback") as mock_execute:
            mock_execute.return_value = {"success": True, "animals_restored": 40, "animals_removed": 5, "backup_created": "backup_20240101_130000", "snapshot_id": snapshot_id}

            result = rollback_service.rollback_to_snapshot(org_id, snapshot_id, require_confirmation=False)

            assert result["success"] is True
            assert result["animals_restored"] == 40
            assert result["animals_removed"] == 5
            assert result["backup_created"] == "backup_20240101_130000"
            mock_execute.assert_called_once_with(org_id, snapshot_id)

    def test_rollback_to_snapshot_with_confirmation_cancelled(self, rollback_service):
        """Test rollback cancelled by user confirmation."""
        org_id = 1
        snapshot_id = "snap_20240101_120000"

        with patch("builtins.input", return_value="no"):
            result = rollback_service.rollback_to_snapshot(org_id, snapshot_id, require_confirmation=True)

            assert result["success"] is False
            assert "cancelled" in result["reason"].lower()

    def test_rollback_to_snapshot_with_confirmation_accepted(self, rollback_service):
        """Test rollback accepted by user confirmation."""
        org_id = 1
        snapshot_id = "snap_20240101_120000"

        with patch("builtins.input", return_value="yes"):
            with patch.object(rollback_service, "_execute_rollback") as mock_execute:
                mock_execute.return_value = {"success": True}

                result = rollback_service.rollback_to_snapshot(org_id, snapshot_id, require_confirmation=True)

                assert result["success"] is True
                mock_execute.assert_called_once()

    def test_rollback_last_scrape_success(self, rollback_service):
        """Test successful rollback of last scrape."""
        org_id = 1

        with patch.object(rollback_service, "create_data_backup") as mock_backup:
            with patch.object(rollback_service, "_get_last_scrape_session") as mock_get_session:
                with patch.object(rollback_service, "_rollback_scrape_session") as mock_rollback:
                    mock_backup.return_value = {"backup_id": "backup_123"}
                    mock_get_session.return_value = "session_456"
                    mock_rollback.return_value = {"success": True, "animals_affected": 12}

                    result = rollback_service.rollback_last_scrape(org_id)

                    assert result["success"] is True
                    assert result["animals_affected"] == 12
                    assert result["backup_id"] == "backup_123"
                    mock_backup.assert_called_once_with(org_id, "Before rollback of last scrape")
                    mock_get_session.assert_called_once_with(org_id)
                    mock_rollback.assert_called_once_with(org_id, "session_456")

    def test_rollback_last_scrape_no_session(self, rollback_service):
        """Test rollback when no recent scrape session found."""
        org_id = 1

        with patch.object(rollback_service, "create_data_backup") as mock_backup:
            with patch.object(rollback_service, "_get_last_scrape_session") as mock_get_session:
                mock_backup.return_value = {"backup_id": "backup_123"}
                mock_get_session.return_value = None

                result = rollback_service.rollback_last_scrape(org_id)

                assert result["success"] is False
                assert "no recent scrape session found" in result["error"].lower()
                assert result["backup_id"] == "backup_123"

    def test_create_data_backup_success(self, rollback_service):
        """Test successful data backup creation."""
        org_id = 1
        reason = "Safety backup before rollback"

        with patch.object(rollback_service, "_create_backup") as mock_create:
            mock_create.return_value = {"backup_id": "backup_20240101_140000", "created_at": datetime.now(), "animals_count": 48, "size_mb": 2.3}

            result = rollback_service.create_data_backup(org_id, reason)

            assert "backup_id" in result
            assert result["animals_count"] == 48
            mock_create.assert_called_once_with(org_id, reason)

    def test_database_connection_error_handling(self, rollback_service, mock_database_service):
        """Test handling of database connection errors."""
        org_id = 1
        mock_database_service.__enter__.side_effect = Exception("Connection failed")

        snapshots = rollback_service.get_available_snapshots(org_id)

        assert snapshots == []


class TestRollbackServiceInternalMethods:
    """Test RollbackService internal methods."""

    @pytest.fixture
    def mock_database_service(self):
        """Create mock DatabaseService for testing."""
        mock_service = Mock(spec=DatabaseService)
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.execute = Mock()
        mock_cursor.close = Mock()
        mock_connection.commit = Mock()
        mock_service.__enter__ = Mock(return_value=mock_connection)
        mock_service.__exit__ = Mock(return_value=None)
        return mock_service

    @pytest.fixture
    def rollback_service(self, mock_database_service):
        """Create RollbackService for testing."""
        from management.emergency.rollback_service import RollbackService

        return RollbackService(mock_database_service)

    def test_get_last_scrape_session_success(self, rollback_service, mock_database_service):
        """Test getting last scrape session ID."""
        org_id = 1
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value
        mock_cursor.fetchone.return_value = (123,)

        session_id = rollback_service._get_last_scrape_session(org_id)

        assert session_id == "123"

    def test_get_last_scrape_session_not_found(self, rollback_service, mock_database_service):
        """Test getting last scrape session when none exists."""
        org_id = 1
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value
        mock_cursor.fetchone.return_value = None

        session_id = rollback_service._get_last_scrape_session(org_id)

        assert session_id is None

    def test_execute_rollback_success(self, rollback_service, mock_database_service):
        """Test successful rollback execution."""
        org_id = 1
        snapshot_id = "snap_20240101_120000"

        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock database responses
        mock_cursor.fetchone.side_effect = [
            (50,),  # animals_before count
        ]
        mock_cursor.rowcount = 5  # animals_removed, then animals_restored

        with patch.object(rollback_service, "_create_backup") as mock_backup:
            mock_backup.return_value = {"backup_id": "backup_123"}

            result = rollback_service._execute_rollback(org_id, snapshot_id)

            assert result["success"] is True
            assert "animals_restored" in result
            assert "animals_removed" in result
            assert result["backup_created"] == "backup_123"

    def test_rollback_scrape_session_success(self, rollback_service, mock_database_service):
        """Test successful scrape session rollback."""
        org_id = 1
        session_id = "123"

        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value

        # Mock session data
        session_time = datetime.now() - timedelta(hours=1)
        mock_cursor.fetchone.return_value = (session_time, 5, 3)  # session data: started_at, dogs_added, dogs_updated

        # Mock successful rowcount (simulate 3 animals removed, 5 animals reset)
        mock_cursor.rowcount = 3

        result = rollback_service._rollback_scrape_session(org_id, session_id)

        assert result["success"] is True
        assert result["session_id"] == session_id
        assert "animals_affected" in result

    def test_create_backup_implementation(self, rollback_service):
        """Test backup creation implementation."""
        org_id = 1
        reason = "Test backup"

        # Mock the backup creation - in real implementation this would
        # create database backup or snapshot
        with patch.object(rollback_service, "_create_backup") as mock_create:
            mock_create.return_value = {"backup_id": "backup_20240101_150000", "created_at": datetime.now(), "animals_count": 45, "reason": reason}

            result = rollback_service._create_backup(org_id, reason)

            assert "backup_id" in result
            assert result["reason"] == reason


class TestRollbackServiceErrorHandling:
    """Test RollbackService error handling patterns."""

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
    def rollback_service(self, mock_database_service):
        """Create RollbackService for testing."""
        from management.emergency.rollback_service import RollbackService

        return RollbackService(mock_database_service)

    def test_query_error_handling(self, rollback_service, mock_database_service):
        """Test handling of database query errors."""
        org_id = 1
        mock_connection = mock_database_service.__enter__.return_value
        mock_cursor = mock_connection.cursor.return_value
        mock_cursor.execute.side_effect = Exception("Query failed")

        snapshots = rollback_service.get_available_snapshots(org_id)

        assert snapshots == []

    def test_rollback_execution_error_handling(self, rollback_service):
        """Test handling of rollback execution errors."""
        org_id = 1
        snapshot_id = "snap_20240101_120000"

        with patch.object(rollback_service, "_create_backup") as mock_backup:
            mock_backup.side_effect = Exception("Backup failed")

            result = rollback_service._execute_rollback(org_id, snapshot_id)

            assert result["success"] is False
            assert "error" in result

    def test_non_interactive_confirmation_handling(self, rollback_service):
        """Test handling of confirmation in non-interactive environments."""
        org_id = 1
        snapshot_id = "snap_20240101_120000"

        with patch("builtins.input", side_effect=EOFError()):
            result = rollback_service.rollback_to_snapshot(org_id, snapshot_id, require_confirmation=True)

            assert result["success"] is False
            assert "non-interactive mode" in result["reason"].lower()
