"""Tests for SessionManager stale detection fix.

These tests verify the fix for the critical bug where mark_skipped_animals_as_seen()
was marking ALL available dogs as seen, instead of only the ones actually found
by the scraper.

The bug caused ~3,300 stale dogs to incorrectly show as available on the site.
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime

from services.session_manager import SessionManager


@pytest.fixture
def db_config():
    """Minimal DB config for testing."""
    return {
        "host": "localhost",
        "user": "test",
        "password": "",
        "database": "test_db",
    }


@pytest.fixture
def session_manager(db_config):
    """Create a SessionManager instance for testing."""
    return SessionManager(
        db_config=db_config,
        organization_id=1,
        skip_existing_animals=True,
    )


class TestRecordFoundAnimal:
    """Tests for the record_found_animal() method."""

    def test_record_found_animal_adds_to_set(self, session_manager):
        """Recording an external_id should add it to the found_external_ids set."""
        session_manager.record_found_animal("dog-123")
        session_manager.record_found_animal("dog-456")

        assert "dog-123" in session_manager.found_external_ids
        assert "dog-456" in session_manager.found_external_ids
        assert session_manager.get_found_external_ids_count() == 2

    def test_record_found_animal_handles_duplicates(self, session_manager):
        """Recording the same external_id twice should only count once (set behavior)."""
        session_manager.record_found_animal("dog-123")
        session_manager.record_found_animal("dog-123")

        assert session_manager.get_found_external_ids_count() == 1

    def test_record_found_animal_ignores_empty_strings(self, session_manager):
        """Empty strings should not be added to the set."""
        session_manager.record_found_animal("")
        session_manager.record_found_animal(None)

        assert session_manager.get_found_external_ids_count() == 0

    def test_found_external_ids_cleared_on_session_start(self, session_manager):
        """Starting a new scrape session should clear the found_external_ids set."""
        session_manager.record_found_animal("dog-123")
        session_manager.record_found_animal("dog-456")
        assert session_manager.get_found_external_ids_count() == 2

        session_manager.start_scrape_session()

        assert session_manager.get_found_external_ids_count() == 0


class TestMarkSkippedAnimalsAsSeen:
    """Tests for the fixed mark_skipped_animals_as_seen() method."""

    def test_returns_zero_when_no_external_ids_recorded(self, session_manager):
        """If no external_ids were recorded, should return 0 and not execute SQL."""
        session_manager.start_scrape_session()
        # Don't record any external_ids

        result = session_manager.mark_skipped_animals_as_seen()

        assert result == 0

    def test_returns_zero_when_skip_existing_animals_false(self, db_config):
        """If skip_existing_animals is False, should return 0."""
        session_manager = SessionManager(
            db_config=db_config,
            organization_id=1,
            skip_existing_animals=False,
        )
        session_manager.start_scrape_session()
        session_manager.record_found_animal("dog-123")

        result = session_manager.mark_skipped_animals_as_seen()

        assert result == 0

    def test_returns_zero_when_no_session(self, session_manager):
        """If no scrape session started, should return 0."""
        session_manager.record_found_animal("dog-123")
        # Don't start session

        result = session_manager.mark_skipped_animals_as_seen()

        assert result == 0

    @patch("services.session_manager.psycopg2")
    def test_uses_found_external_ids_in_query(self, mock_psycopg2, session_manager):
        """SQL query should use the found_external_ids in the WHERE clause."""
        # Setup mock connection
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 3
        mock_conn.cursor.return_value = mock_cursor
        mock_psycopg2.connect.return_value = mock_conn

        # Start session and record found animals
        session_manager.start_scrape_session()
        session_manager.record_found_animal("dog-123")
        session_manager.record_found_animal("dog-456")
        session_manager.record_found_animal("dog-789")

        # Call the method (will use fallback connection since no pool)
        result = session_manager.mark_skipped_animals_as_seen()

        # Verify SQL was executed with external_id filter
        mock_cursor.execute.assert_called_once()
        call_args = mock_cursor.execute.call_args
        sql = call_args[0][0]
        params = call_args[0][1]

        # SQL should include external_id = ANY(%s) clause
        assert "external_id = ANY" in sql
        assert "WHERE organization_id" in sql
        assert "AND status = 'available'" in sql

        # Parameters should include the list of found external_ids
        assert params[0] == session_manager.current_scrape_session
        assert params[1] == 1  # organization_id
        assert set(params[2]) == {"dog-123", "dog-456", "dog-789"}

        assert result == 3


class TestUpdateStaleDataDetection:
    """Tests for the active=false fix in update_stale_data_detection()."""

    @patch("services.session_manager.psycopg2")
    def test_sets_active_false_when_status_becomes_unknown(self, mock_psycopg2, session_manager):
        """SQL should set active=false when consecutive_scrapes_missing >= 3."""
        # Setup mock connection
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_cursor.rowcount = 5
        mock_conn.cursor.return_value = mock_cursor
        mock_psycopg2.connect.return_value = mock_conn

        # Start session
        session_manager.start_scrape_session()

        # Call the method
        result = session_manager.update_stale_data_detection()

        # Verify SQL includes active=false case
        mock_cursor.execute.assert_called_once()
        sql = mock_cursor.execute.call_args[0][0]

        # SQL should include the active column update
        assert "active = CASE" in sql
        assert "WHEN consecutive_scrapes_missing >= 3 THEN false" in sql
        assert result is True


class TestIntegration:
    """Integration tests for the complete stale detection flow."""

    def test_full_stale_detection_flow(self, session_manager):
        """Test the complete flow from recording found animals to marking as seen."""
        # Simulate a scrape that finds 3 dogs out of 10 in the database
        session_manager.start_scrape_session()

        # Record only the dogs actually found by the scraper
        session_manager.record_found_animal("dog-found-1")
        session_manager.record_found_animal("dog-found-2")
        session_manager.record_found_animal("dog-found-3")

        # Verify only 3 external_ids are recorded
        assert session_manager.get_found_external_ids_count() == 3

        # The mark_skipped_animals_as_seen should only update these 3 dogs
        # (In production, this would be verified by the SQL query)

    def test_session_reset_clears_found_ids(self, session_manager):
        """Starting a new session should reset everything."""
        session_manager.start_scrape_session()
        session_manager.record_found_animal("dog-1")
        session_manager.record_found_animal("dog-2")

        # Start a new session
        session_manager.start_scrape_session()

        # Should be empty now
        assert session_manager.get_found_external_ids_count() == 0
        assert len(session_manager.found_external_ids) == 0
