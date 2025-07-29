"""
Test for the availability confidence logic fix.

This test verifies that the SQL logic bug in update_stale_data_detection()
has been fixed and animals maintain correct confidence levels.
"""

from datetime import datetime, timedelta
from unittest.mock import Mock, patch

import pytest

from services.session_manager import SessionManager
from tests.fixtures.database_fixtures import mock_session_manager_db


class TestAvailabilityConfidenceFix:
    """Test the fix for availability confidence SQL logic bug."""

    def test_availability_confidence_progression_correct(self):
        """Test that availability confidence progresses correctly through missing scrapes."""
        db_config = {"host": "localhost", "user": "test", "database": "test", "password": ""}
        session_manager = SessionManager(db_config, organization_id=1)

        # Mock database connection and cursor
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        session_manager.conn = mock_conn
        session_manager.current_scrape_session = datetime.now()

        # Test update_stale_data_detection
        session_manager.update_stale_data_detection()

        # Verify the SQL query was called
        assert mock_cursor.execute.called
        executed_query = mock_cursor.execute.call_args[0][0]

        # Verify the fix: CASE statement should check specific values, not >= 1
        assert "WHEN consecutive_scrapes_missing = 0 THEN 'medium'" in executed_query
        assert "WHEN consecutive_scrapes_missing = 1 THEN 'low'" in executed_query
        assert "WHEN consecutive_scrapes_missing >= 2 THEN 'low'" in executed_query

        # Verify the bug is fixed: should NOT have "WHEN consecutive_scrapes_missing >= 1"
        assert "WHEN consecutive_scrapes_missing >= 1 THEN 'low'" not in executed_query

    def test_animal_confidence_scenarios(self):
        """Test specific scenarios for availability confidence logic."""
        db_config = {"host": "localhost", "user": "test", "database": "test", "password": ""}
        session_manager = SessionManager(db_config, organization_id=1)

        # Mock database connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        session_manager.conn = mock_conn
        session_manager.current_scrape_session = datetime.now()

        # Test the SQL logic by examining the query structure
        session_manager.update_stale_data_detection()

        executed_query = mock_cursor.execute.call_args[0][0]

        # Verify logical progression:
        # consecutive_scrapes_missing = 0 → medium (first miss)
        # consecutive_scrapes_missing = 1 → low (second miss)
        # consecutive_scrapes_missing >= 2 → low (subsequent misses)
        # consecutive_scrapes_missing >= 3 → unavailable (status change)

        lines = executed_query.split("\n")
        case_lines = [line.strip() for line in lines if "WHEN consecutive_scrapes_missing" in line]

        # Should have exactly 3 WHEN clauses for availability_confidence
        availability_case_lines = [line for line in case_lines if "THEN" in line and ("medium" in line or "low" in line)]
        assert len(availability_case_lines) == 3

        # Verify the specific logic
        assert any("= 0 THEN 'medium'" in line for line in availability_case_lines)
        assert any("= 1 THEN 'low'" in line for line in availability_case_lines)
        assert any(">= 2 THEN 'low'" in line for line in availability_case_lines)

    def test_mark_animal_as_seen_sets_high_confidence(self):
        """Test that marking an animal as seen correctly sets high confidence."""
        db_config = {"host": "localhost", "user": "test", "database": "test", "password": ""}
        session_manager = SessionManager(db_config, organization_id=1)

        # Mock database connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor
        session_manager.conn = mock_conn
        session_manager.current_scrape_session = datetime.now()

        # Test mark_animal_as_seen
        animal_id = 123
        result = session_manager.mark_animal_as_seen(animal_id)

        assert result is True
        assert mock_cursor.execute.called
        executed_query = mock_cursor.execute.call_args[0][0]

        # Verify it sets high confidence, resets counter, and updates timestamp
        assert "availability_confidence = 'high'" in executed_query
        assert "consecutive_scrapes_missing = 0" in executed_query
        assert "last_seen_at = %s" in executed_query
        assert "WHERE id = %s" in executed_query
