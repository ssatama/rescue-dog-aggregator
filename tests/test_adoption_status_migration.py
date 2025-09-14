"""
Test adoption status migration and data consistency.

Tests the Phase 1 implementation:
- Migration script execution
- Status value transitions
- Data consistency checks
"""

from unittest.mock import Mock, patch

import psycopg2
import pytest

from management.update_status_consistency import StatusConsistencyUpdater


class TestAdoptionStatusMigration:
    """Test suite for adoption status tracking migration."""

    def test_status_enum_values(self, test_db_cursor):
        """Test that new status values are accepted."""
        # Test inserting with new status values
        test_cases = [("available", "high"), ("unknown", "low"), ("adopted", "low"), ("reserved", "low")]

        for status, confidence in test_cases:
            test_db_cursor.execute(
                """
                INSERT INTO animals (
                    name, external_id, organization_id, animal_type,
                    status, availability_confidence
                ) VALUES (%s, %s, 1, 'dog', %s, %s)
                RETURNING id
            """,
                (f"Test Dog {status}", f"test-{status}", status, confidence),
            )

            dog_id = test_db_cursor.fetchone()[0]
            assert dog_id is not None, f"Failed to insert dog with status={status}"

    def test_invalid_status_rejected(self, test_db_cursor):
        """Test that invalid status values are rejected."""
        with pytest.raises(psycopg2.errors.CheckViolation):
            test_db_cursor.execute(
                """
                INSERT INTO animals (
                    name, external_id, organization_id, animal_type, status
                ) VALUES ('Test Dog', 'test-invalid', 1, 'dog', 'invalid_status')
            """
            )

    def test_adoption_tracking_columns_exist(self, test_db_cursor):
        """Test that adoption tracking columns were created."""
        test_db_cursor.execute(
            """
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'animals' 
            AND column_name IN ('adoption_check_data', 'adoption_checked_at')
        """
        )

        columns = [row[0] for row in test_db_cursor.fetchall()]
        assert "adoption_check_data" in columns
        assert "adoption_checked_at" in columns

    def test_adoption_check_data_storage(self, test_db_cursor):
        """Test storing Firecrawl response in adoption_check_data."""
        import json

        test_data = {"evidence": "Dog marked as REHOMED on page", "confidence": 0.95, "checked_at": "2024-01-20T10:00:00Z"}

        test_db_cursor.execute(
            """
            INSERT INTO animals (
                name, external_id, organization_id, animal_type,
                status, adoption_check_data
            ) VALUES ('Adopted Dog', 'test-adopted', 1, 'dog', 'adopted', %s)
            RETURNING id, adoption_check_data
        """,
            (json.dumps(test_data),),
        )

        dog_id, stored_data = test_db_cursor.fetchone()
        assert stored_data == test_data
        assert stored_data["confidence"] == 0.95

    def test_status_consistency_logic(self, test_db_cursor):
        """Test that status and availability_confidence are properly decoupled."""
        # Create test scenarios
        test_cases = [
            # (status, confidence, consecutive_misses, expected_valid)
            ("available", "high", 0, True),
            ("available", "high", 1, True),  # Still available but confidence may drop
            ("unknown", "low", 3, True),
            ("unknown", "low", 10, True),
            ("adopted", "low", 5, True),  # Adopted can have any confidence
            ("reserved", "low", 5, True),  # Reserved can have any confidence
        ]

        for status, confidence, misses, expected_valid in test_cases:
            test_db_cursor.execute(
                """
                INSERT INTO animals (
                    name, external_id, organization_id, animal_type,
                    status, availability_confidence, consecutive_scrapes_missing
                ) VALUES (%s, %s, 1, 'dog', %s, %s, %s)
                RETURNING id
            """,
                (f"Test {status}-{misses}", f"test-{status}-{misses}", status, confidence, misses),
            )

            result = test_db_cursor.fetchone()
            if expected_valid:
                assert result is not None
            else:
                assert result is None

    def test_session_manager_status_transition(self):
        """Test that SessionManager uses 'unknown' instead of 'unavailable'."""
        from services.session_manager import SessionManager

        # Mock the connection
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_conn.cursor.return_value = mock_cursor

        manager = SessionManager(db_config={}, organization_id=1, logger=Mock())
        manager.conn = mock_conn

        # Test mark_missing_animals_unavailable
        manager.mark_missing_animals_unavailable(threshold=3)

        # Verify the SQL uses 'unknown' not 'unavailable'
        calls = mock_cursor.execute.call_args_list
        update_query = str(calls[-1][0][0])

        assert "SET status = 'unknown'" in update_query
        assert "SET status = 'unavailable'" not in update_query
        assert "AND status NOT IN ('unknown', 'adopted', 'reserved')" in update_query

    @patch("management.update_status_consistency.psycopg2.connect")
    def test_consistency_updater(self, mock_connect):
        """Test StatusConsistencyUpdater functionality."""
        mock_conn = Mock()
        mock_cursor = Mock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Mock query results
        mock_cursor.fetchall.side_effect = [
            # Status distribution
            [{"status": "available", "count": 100}],
            # Confidence distribution
            [{"availability_confidence": "high", "count": 100}],
            # Combinations
            [{"status": "available", "availability_confidence": "high", "count": 100}],
            # Final state
            [{"status": "available", "availability_confidence": "high", "count": 100}],
            # Issues check
            [],
        ]
        mock_cursor.fetchone.return_value = {"count": 0}

        updater = StatusConsistencyUpdater(dry_run=True)
        updater.run()

        # Verify it connected and ran checks
        assert mock_connect.called
        assert mock_cursor.execute.called


@pytest.fixture
def test_db_cursor(db_connection):
    """Provide a test database cursor with proper cleanup."""
    cursor = db_connection.cursor()
    yield cursor
    cursor.close()
    db_connection.rollback()  # Rollback any test changes
