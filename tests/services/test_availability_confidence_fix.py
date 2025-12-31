"""
Test for the availability confidence logic fix.

This test verifies that the SQL logic in update_stale_data_detection()
correctly handles availability confidence transitions.
"""

from datetime import datetime
from unittest.mock import Mock

import pytest

from services.session_manager import SessionManager


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.slow
class TestAvailabilityConfidenceFix:
    """Test the availability confidence SQL logic."""

    def test_availability_confidence_progression_correct(self):
        """Test that availability confidence progresses correctly through missing scrapes."""
        db_config = {
            "host": "localhost",
            "user": "test",
            "database": "test",
            "password": "",
        }
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

        # Verify the simplified logic: first miss = medium, subsequent = low
        assert "WHEN consecutive_scrapes_missing = 0 THEN 'medium'" in executed_query
        assert "ELSE 'low'" in executed_query

        # Verify the status/active transitions at >= 2 consecutive misses
        assert "WHEN consecutive_scrapes_missing >= 2 THEN 'unknown'" in executed_query
        assert "WHEN consecutive_scrapes_missing >= 2 THEN false" in executed_query

    def test_animal_confidence_scenarios(self):
        """Test specific scenarios for availability confidence logic."""
        db_config = {
            "host": "localhost",
            "user": "test",
            "database": "test",
            "password": "",
        }
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
        # ELSE → low (any subsequent miss)
        # consecutive_scrapes_missing >= 2 → status becomes unknown, active becomes false

        # Check availability_confidence CASE uses simplified logic
        assert "availability_confidence = CASE" in executed_query
        assert "WHEN consecutive_scrapes_missing = 0 THEN 'medium'" in executed_query

        # Status transitions
        assert "status = CASE" in executed_query
        assert "WHEN consecutive_scrapes_missing >= 2 THEN 'unknown'" in executed_query

        # Active flag transitions
        assert "active = CASE" in executed_query
        assert "WHEN consecutive_scrapes_missing >= 2 THEN false" in executed_query

    def test_mark_animal_as_seen_sets_high_confidence(self):
        """Test that marking an animal as seen correctly sets high confidence."""
        db_config = {
            "host": "localhost",
            "user": "test",
            "database": "test",
            "password": "",
        }
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
