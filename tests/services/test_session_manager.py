"""
Tests for SessionManager - TDD approach for BaseScraper refactoring.

Consolidates all SessionManager tests:
- test_session_manager.py (original TDD tests)
- test_session_manager_pooled.py (connection pool tests)

Following CLAUDE.md principles:
- Test first, code second
- Pure functions, no mutations
- Immutable data patterns
- Early returns, no nested conditionals
"""

from datetime import datetime
from typing import Any, Dict, Optional, Tuple
from unittest.mock import Mock, patch

import pytest

from services.connection_pool import ConnectionPoolService

# Import fixtures
from tests.fixtures.database_fixtures import (
    animal_quality_test_data,
    failure_scenario_generator,
    historical_scrape_data,
    mock_db_connection,
    mock_db_error_scenarios,
    mock_session_manager_db,
    sample_animal_data,
)

# Import will be created after interface design
# from services.session_manager import SessionManager


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestSessionManagerInterface:
    """Test SessionManager interface contract."""

    def test_session_manager_interface_exists(self):
        """Test that SessionManager implements expected interface."""
        # This test will fail initially - TDD approach
        try:
            from services.session_manager import SessionManager

            assert hasattr(SessionManager, "__init__")
            assert hasattr(SessionManager, "start_scrape_session")
            assert hasattr(SessionManager, "mark_animal_as_seen")
            assert hasattr(SessionManager, "update_stale_data_detection")
            assert hasattr(SessionManager, "mark_animals_unavailable")
            assert hasattr(SessionManager, "restore_available_animal")
            assert hasattr(SessionManager, "mark_skipped_animals_as_seen")
            assert hasattr(SessionManager, "get_stale_animals_summary")
            assert hasattr(SessionManager, "detect_partial_failure")
            assert hasattr(SessionManager, "get_current_session")
            assert hasattr(SessionManager, "close")
        except ImportError:
            pytest.fail("SessionManager not yet implemented - expected for TDD")

    def test_start_scrape_session_signature(self):
        """Test start_scrape_session method signature and return type."""
        from services.session_manager import SessionManager

        # Test with mock config
        mock_config = {"host": "localhost", "user": "test", "database": "test", "password": ""}
        session_manager = SessionManager(mock_config, organization_id=1)

        # Test method exists and returns boolean
        result = session_manager.start_scrape_session()
        assert isinstance(result, bool)

    def test_detect_partial_failure_signature(self):
        """Test detect_partial_failure method signature and return type."""
        from services.session_manager import SessionManager

        mock_config = {"host": "localhost", "user": "test", "database": "test", "password": ""}
        session_manager = SessionManager(mock_config, organization_id=1)

        # Test method exists and returns boolean
        result = session_manager.detect_partial_failure(10, 0.5, 3, 3, 20, 5)
        assert isinstance(result, bool)

    def test_stale_data_detection_signature(self):
        """Test update_stale_data_detection method signature and return type."""
        from services.session_manager import SessionManager

        mock_config = {"host": "localhost", "user": "test", "database": "test", "password": ""}
        session_manager = SessionManager(mock_config, organization_id=1)

        # Test method exists and returns boolean
        result = session_manager.update_stale_data_detection()
        assert isinstance(result, bool)


class TestSessionManagerImplementation:
    """Test SessionManager implementation with mocked dependencies."""

    @pytest.fixture
    def mock_db_config(self):
        """Mock database configuration."""
        return {"host": "localhost", "user": "test_user", "database": "test_db", "password": "test_pass"}

    @pytest.fixture
    def mock_connection(self):
        """Mock database connection."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        return mock_conn, mock_cursor

    def test_start_scrape_session_success(self, mock_db_config):
        """Test successful scrape session start."""
        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        result = session_manager.start_scrape_session()

        assert result is True
        assert session_manager.get_current_session() is not None
        assert isinstance(session_manager.get_current_session(), datetime)

    def test_start_scrape_session_already_active(self, mock_db_config):
        """Test starting session when one is already active."""
        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        # Start first session
        first_result = session_manager.start_scrape_session()
        assert first_result is True
        first_session = session_manager.get_current_session()

        # Try to start another session (should return False or reuse existing)
        second_result = session_manager.start_scrape_session()
        second_session = session_manager.get_current_session()

        # Should either maintain same session or start new one
        assert isinstance(second_result, bool)
        assert second_session is not None

    def test_mark_animal_as_seen_with_session(self, mock_db_config, mock_connection):
        """Test marking animal as seen with active session."""
        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        # Start a session first
        session_manager.start_scrape_session()

        # Test marking animal as seen
        result = session_manager.mark_animal_as_seen(animal_id=12345)

        # Should return boolean indicating success/failure
        assert isinstance(result, bool)

    def test_mark_animal_as_seen_no_session(self, mock_db_config):
        """Test marking animal as seen without active session."""
        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        # Don't start a session, try to mark animal as seen
        result = session_manager.mark_animal_as_seen(animal_id=12345)

        # Should handle gracefully (likely return False)
        assert isinstance(result, bool)

    def test_update_stale_data_detection_success(self, mock_db_config, mock_connection):
        """Test successful stale data detection update."""
        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        # Start session and then update stale data detection
        session_manager.start_scrape_session()
        result = session_manager.update_stale_data_detection()

        # Should return boolean indicating success/failure
        assert isinstance(result, bool)

    def test_mark_skipped_animals_as_seen_with_skip_enabled(self, mock_db_config, mock_connection):
        """Test marking skipped animals as seen when skip_existing_animals is enabled."""
        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        # Start session and test marking skipped animals
        session_manager.start_scrape_session()
        result = session_manager.mark_skipped_animals_as_seen()

        # Should return number of animals marked (integer)
        assert isinstance(result, int)
        assert result >= 0  # Should be non-negative

    def test_mark_skipped_animals_as_seen_skip_disabled(self, mock_db_config):
        """Test mark_skipped_animals_as_seen when skip_existing_animals is disabled."""
        pytest.skip("SessionManager not yet implemented")

    def test_detect_partial_failure_algorithm(self, mock_db_config, failure_scenario_generator):
        """Test comprehensive partial failure detection algorithm with all scenarios."""
        from unittest.mock import Mock

        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        # Mock database connection with historical data
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        session_manager.conn = mock_conn

        # Test each failure scenario
        for scenario_name, scenario_data in failure_scenario_generator.items():
            # Set up mock cursor to return historical average (45.0) and count (5)
            mock_cursor.fetchone.return_value = (45.0, 5)

            # Set skip_existing_animals flag if scenario requires it
            if scenario_data.get("skip_existing_animals"):
                session_manager.skip_existing_animals = True
            else:
                session_manager.skip_existing_animals = False

            result = session_manager.detect_partial_failure(
                scenario_data["animals_found"],
                scenario_data["threshold_percentage"],
                scenario_data["absolute_minimum"],
                scenario_data["minimum_historical_scrapes"],
                scenario_data["total_animals_before_filter"],
                scenario_data["total_animals_skipped"],
            )

            assert isinstance(result, bool), f"Scenario {scenario_name} should return boolean"
            assert result == scenario_data["expected_result"], f"Scenario {scenario_name} failed: expected {scenario_data['expected_result']}, got {result}"

    def test_detect_partial_failure_no_history(self, mock_db_config):
        """Test partial failure detection without sufficient historical data."""
        from unittest.mock import Mock

        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        # Mock database connection with no historical data
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        session_manager.conn = mock_conn

        # No historical data - should return None or insufficient data
        mock_cursor.fetchone.return_value = None

        # Should fall back to absolute minimum threshold
        result = session_manager.detect_partial_failure(2, 0.5, 3, 3, 2, 0)
        assert result is True  # Below absolute minimum

        result = session_manager.detect_partial_failure(5, 0.5, 3, 3, 5, 0)
        assert result is False  # Above absolute minimum

    def test_detect_catastrophic_failure_scenarios(self, mock_db_config):
        """Test catastrophic failure detection with various edge cases."""
        from unittest.mock import Mock

        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1)

        # Test zero animals found
        result = session_manager._detect_catastrophic_failure(0, 3, 0, 0)
        assert result is True  # Should detect catastrophic failure

        # Test zero animals but with skip_existing_animals and animals found before filter
        session_manager.skip_existing_animals = True
        result = session_manager._detect_catastrophic_failure(0, 3, 50, 50)
        assert result is False  # Should not detect failure - normal skip behavior

        # Test below absolute minimum
        result = session_manager._detect_catastrophic_failure(2, 3, 2, 0)
        assert result is True  # Below absolute minimum

        # Test invalid negative count
        result = session_manager._detect_catastrophic_failure(-1, 3, 0, 0)
        assert result is True  # Invalid input should trigger failure detection

    def test_detect_catastrophic_failure_zero_animals(self, mock_db_config):
        """Test catastrophic failure detection with zero animals."""
        pytest.skip("SessionManager not yet implemented")

    def test_detect_catastrophic_failure_with_skip_filtering(self, mock_db_config):
        """Test catastrophic failure detection considering skip_existing_animals filtering."""
        pytest.skip("SessionManager not yet implemented")

    def test_connection_management(self, mock_db_config):
        """Test database connection and disconnection."""
        pytest.skip("SessionManager not yet implemented")

    def test_transaction_rollback_on_error(self, mock_db_config, mock_connection):
        """Test transaction rollback when errors occur."""
        pytest.skip("SessionManager not yet implemented")


class TestSessionManagerErrorHandling:
    """Test SessionManager error handling patterns."""

    def test_connection_error_handling(self):
        """Test handling of database connection errors."""
        pytest.skip("SessionManager not yet implemented")

    def test_query_error_recovery(self):
        """Test recovery from query execution errors."""
        pytest.skip("SessionManager not yet implemented")

    def test_session_error_handling(self):
        """Test session state management during errors."""
        pytest.skip("SessionManager not yet implemented")


class TestSessionManagerStaleDataLogic:
    """Test SessionManager stale data detection algorithms."""

    @pytest.fixture
    def mock_db_config(self):
        """Mock database configuration."""
        return {"host": "localhost", "user": "test_user", "database": "test_db", "password": "test_pass"}

    def test_stale_data_confidence_transitions(self):
        """Test availability confidence transitions (high -> medium -> low)."""
        pytest.skip("SessionManager not yet implemented")

    def test_consecutive_scrapes_missing_tracking(self):
        """Test consecutive_scrapes_missing increment logic."""
        pytest.skip("SessionManager not yet implemented")

    def test_animal_restoration_logic(self):
        """Test animal restoration when reappearing after being marked unavailable."""
        pytest.skip("SessionManager not yet implemented")

    def test_skip_existing_animals_bug_fix(self, mock_db_config):
        """Test fix for skip_existing_animals bug where existing animals get marked unavailable."""
        from datetime import datetime
        from unittest.mock import Mock

        from services.session_manager import SessionManager

        # Create session manager with skip_existing_animals enabled
        session_manager = SessionManager(mock_db_config, organization_id=1, skip_existing_animals=True)

        # Mock database connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        session_manager.conn = mock_conn

        # Start a scrape session
        session_manager.current_scrape_session = datetime.now()

        # Test that mark_skipped_animals_as_seen is called correctly
        mock_cursor.rowcount = 5  # Simulate 5 animals marked as seen

        result = session_manager.mark_skipped_animals_as_seen()

        # Should return the number of animals marked as seen
        assert result == 5

        # Verify the correct SQL was executed
        mock_cursor.execute.assert_called_once()
        executed_query = mock_cursor.execute.call_args[0][0]

        # Should update last_seen_at, consecutive_scrapes_missing, and availability_confidence
        assert "UPDATE animals" in executed_query
        assert "last_seen_at = %s" in executed_query
        assert "consecutive_scrapes_missing = 0" in executed_query
        assert "availability_confidence = 'high'" in executed_query
        assert "organization_id = %s" in executed_query
        assert "status = 'available'" in executed_query

        # Verify parameters include session timestamp and organization_id
        executed_params = mock_cursor.execute.call_args[0][1]
        assert executed_params == (session_manager.current_scrape_session, 1)

        # Verify commit was called
        mock_conn.commit.assert_called_once()

    def test_skip_existing_animals_bug_fix_disabled(self, mock_db_config):
        """Test that mark_skipped_animals_as_seen returns 0 when skip_existing_animals is disabled."""
        from datetime import datetime
        from unittest.mock import Mock

        from services.session_manager import SessionManager

        # Create session manager with skip_existing_animals disabled
        session_manager = SessionManager(mock_db_config, organization_id=1, skip_existing_animals=False)

        # Mock database connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        session_manager.conn = mock_conn

        # Start a scrape session
        session_manager.current_scrape_session = datetime.now()

        result = session_manager.mark_skipped_animals_as_seen()

        # Should return 0 since skip_existing_animals is disabled
        assert result == 0

        # Should not execute any database queries
        mock_cursor.execute.assert_not_called()
        mock_conn.commit.assert_not_called()

    def test_skip_existing_animals_bug_fix_no_session(self, mock_db_config):
        """Test mark_skipped_animals_as_seen when no scrape session is active."""
        from unittest.mock import Mock

        from services.session_manager import SessionManager

        session_manager = SessionManager(mock_db_config, organization_id=1, skip_existing_animals=True)

        # Mock database connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        session_manager.conn = mock_conn

        # No scrape session started
        session_manager.current_scrape_session = None

        result = session_manager.mark_skipped_animals_as_seen()

        # Should return 0 since no session is active
        assert result == 0

        # Should not execute any database queries
        mock_cursor.execute.assert_not_called()
        mock_conn.commit.assert_not_called()


# Integration tests will be added after SessionManager is implemented
class TestSessionManagerIntegration:
    """Integration tests for SessionManager with BaseScraper."""

    def test_basescraper_integration(self):
        """Test SessionManager integration with BaseScraper."""
        pytest.skip("Integration tests pending service implementation")

    def test_existing_functionality_preserved(self):
        """Test that existing BaseScraper functionality is preserved."""
        pytest.skip("Integration tests pending service implementation")

    def test_dependency_injection_pattern(self):
        """Test dependency injection follows established pattern."""
        pytest.skip("Integration tests pending service implementation")


@pytest.mark.slow
@pytest.mark.database
class TestSessionManagerWithConnectionPool:
    """Test SessionManager using connection pool.

    Consolidated from test_session_manager_pooled.py
    """

    def test_init_with_connection_pool(self):
        """Test SessionManager initialization with connection pool."""
        from services.session_manager import SessionManager

        # Mock ConnectionPoolService
        mock_pool_service = Mock(spec=ConnectionPoolService)

        # Test initialization
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Verify pool service is stored
        assert session_manager.connection_pool == mock_pool_service
        assert session_manager.conn is None  # No direct connection when using pool

    def test_mark_animal_as_seen_with_pool(self):
        """Test mark_animal_as_seen using connection pool."""
        from services.session_manager import SessionManager

        # Mock ConnectionPoolService and connection
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        # Setup connection context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Set current session
        session_manager.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

        # Test
        result = session_manager.mark_animal_as_seen(123)

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database operations
        mock_cursor.execute.assert_called_once()
        mock_connection.commit.assert_called_once()

        # Verify result
        assert result is True

    def test_update_stale_data_detection_with_pool(self):
        """Test update_stale_data_detection using connection pool."""
        from services.session_manager import SessionManager

        # Mock ConnectionPoolService and connection
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        # Setup connection context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.rowcount = 5  # 5 animals updated

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Set current session
        session_manager.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

        # Test
        result = session_manager.update_stale_data_detection()

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database operations
        mock_cursor.execute.assert_called_once()
        mock_connection.commit.assert_called_once()

        # Verify result
        assert result is True

    def test_detect_partial_failure_with_pool(self):
        """Test detect_partial_failure using connection pool."""
        from services.session_manager import SessionManager

        # Mock ConnectionPoolService and connection
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        # Setup connection context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (50.0, 5)  # Average of 50 animals, 5 historical scrapes

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Test with normal count (not a failure)
        result = session_manager.detect_partial_failure(45)

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database query
        mock_cursor.execute.assert_called_once()

        # Should not detect failure (45 > 50 * 0.5 = 25)
        assert result is False

    def test_get_stale_animals_summary_with_pool(self):
        """Test get_stale_animals_summary using connection pool."""
        from services.session_manager import SessionManager

        # Mock ConnectionPoolService and connection
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_connection = Mock()
        mock_cursor = Mock()

        # Setup connection context manager
        mock_context = Mock()
        mock_context.__enter__ = Mock(return_value=mock_connection)
        mock_context.__exit__ = Mock(return_value=None)
        mock_pool_service.get_connection_context.return_value = mock_context
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [("high", "available", 10), ("medium", "available", 5), ("low", "unavailable", 2)]

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Test
        result = session_manager.get_stale_animals_summary()

        # Verify pool context manager was used
        mock_pool_service.get_connection_context.assert_called_once()

        # Verify database query
        mock_cursor.execute.assert_called_once()

        # Verify result
        expected = {("high", "available"): 10, ("medium", "available"): 5, ("low", "unavailable"): 2}
        assert result == expected

    def test_fallback_to_direct_connection_when_no_pool(self):
        """Test SessionManager falls back to direct connection when no pool provided."""
        from services.session_manager import SessionManager

        # Mock successful database connection
        mock_connection = Mock()

        with patch("psycopg2.connect", return_value=mock_connection):
            # Create SessionManager without pool
            session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1)

            # Test connect method
            result = session_manager.connect()

            # Verify direct connection was established
            assert result is True
            assert session_manager.conn == mock_connection
            assert session_manager.connection_pool is None

    def test_connection_pool_error_handling(self):
        """Test error handling when connection pool operations fail."""
        from services.session_manager import SessionManager

        # Mock ConnectionPoolService with error
        mock_pool_service = Mock(spec=ConnectionPoolService)
        mock_pool_service.get_connection_context.side_effect = Exception("Pool error")

        # Create SessionManager with pool
        session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1, connection_pool=mock_pool_service)

        # Set current session
        session_manager.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

        # Test mark_animal_as_seen with pool error
        result = session_manager.mark_animal_as_seen(123)

        # Verify error is handled gracefully
        assert result is False
        mock_pool_service.get_connection_context.assert_called_once()

    def test_backward_compatibility_with_existing_usage(self):
        """Test that existing code using SessionManager continues to work."""
        from services.session_manager import SessionManager

        # Mock successful database connection
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor

        with patch("psycopg2.connect", return_value=mock_connection):
            # Create SessionManager in legacy mode (no pool)
            session_manager = SessionManager(db_config={"host": "localhost", "user": "test", "database": "test_db"}, organization_id=1)

            # Connect using legacy method
            session_manager.connect()
            session_manager.current_scrape_session = datetime(2024, 1, 15, 10, 30, 0)

            # Test existing method still works
            result = session_manager.mark_animal_as_seen(123)

            # Verify legacy functionality preserved
            assert result is True
            assert session_manager.conn == mock_connection
            mock_cursor.execute.assert_called_once()
            mock_connection.commit.assert_called_once()
