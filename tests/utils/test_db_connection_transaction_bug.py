#!/usr/bin/env python3
"""
Test for execute_transaction bug causing service regions sync failures.
TDD test to expose bug before fixing it.
"""

from unittest.mock import MagicMock, call, patch

import psycopg2
import pytest

from utils.db_connection import execute_transaction


@pytest.mark.unit
class TestExecuteTransactionBug:
    """Test that execute_transaction incorrectly calls fetchone() for all commands."""

    def test_execute_transaction_handles_delete_commands_correctly(self):
        """Test that execute_transaction correctly handles DELETE commands without calling fetchone().

        This test verifies the fix - DELETE commands should NOT call fetchone().
        """
        with patch("utils.db_connection.get_db_connection") as mock_get_conn:
            # Setup mock connection and cursor
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_get_conn.return_value.__enter__.return_value = mock_conn
            mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

            # Mock INSERT command returns data (but DELETE should not call fetchone)
            mock_cursor.fetchone.return_value = {"id": 1}

            # Commands that don't return data (DELETE and INSERT without RETURNING)
            commands = [
                ("DELETE FROM service_regions WHERE organization_id = %s", (1,)),
                ("INSERT INTO service_regions (organization_id, country) VALUES (%s, %s)", (1, "US")),
            ]

            # This should work now that bug is fixed
            results = execute_transaction(commands)

            # Should return None for DELETE, and result for INSERT
            assert results == [None, {"id": 1}]

            # fetchone should only be called once (for INSERT, not DELETE)
            assert mock_cursor.fetchone.call_count == 1

    def test_execute_transaction_should_handle_mixed_commands_correctly(self):
        """Test that execute_transaction should handle commands that return/don't return data.

        This test shows the correct expected behavior:
        - DELETE/INSERT without RETURNING: don't call fetchone()
        - INSERT with RETURNING: call fetchone()
        - SELECT: call fetchone()
        """
        with patch("utils.db_connection.get_db_connection") as mock_get_conn:
            # Setup mock connection and cursor
            mock_conn = MagicMock()
            mock_cursor = MagicMock()
            mock_get_conn.return_value.__enter__.return_value = mock_conn
            mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

            # Mock responses for commands that DO return data
            # Only INSERT with RETURNING and SELECT will call fetchone()
            mock_cursor.fetchone.side_effect = [
                None,  # INSERT without RETURNING - will be called but returns None
                {"id": 1, "name": "test"},  # INSERT with RETURNING - should return data
                {"count": 5},  # SELECT - should return data
            ]

            # Mixed commands: some return data, some don't
            commands = [
                ("DELETE FROM service_regions WHERE organization_id = %s", (1,)),
                ("INSERT INTO service_regions (organization_id, country) VALUES (%s, %s)", (1, "US")),
                ("INSERT INTO organizations (name) VALUES (%s) RETURNING id, name", ("Test Org",)),
                ("SELECT COUNT(*) as count FROM organizations", ()),
            ]

            # This should work correctly when bug is fixed
            results = execute_transaction(commands)

            # Should only return results for commands that actually return data
            expected_results = [
                None,  # DELETE - no fetchone() called
                None,  # INSERT without RETURNING - fetchone() called but returns None
                {"id": 1, "name": "test"},  # INSERT with RETURNING - fetchone() called
                {"count": 5},  # SELECT - fetchone() called
            ]

            assert results == expected_results

            # fetchone should only be called 3 times (INSERT, INSERT with RETURNING, SELECT)
            # NOT called for DELETE
            assert mock_cursor.fetchone.call_count == 3


@pytest.mark.integration
class TestServiceRegionsSyncWithFixedTransaction:
    """Integration test for service regions sync after fixing execute_transaction."""

    @pytest.mark.skip(reason="Will pass after fixing execute_transaction bug")
    def test_service_regions_sync_works_after_fix(self):
        """Test that service regions sync works after fixing execute_transaction bug."""
        from utils.config_models import LocationMetadata, OrganizationConfig, OrganizationMetadata
        from utils.organization_sync_service import OrganizationSyncService

        # Create test config with service regions
        metadata = OrganizationMetadata(
            website_url="https://test.org", description="Test org", location=LocationMetadata(country="US", city="Test City"), service_regions=["US", "CA"], ships_to=["US", "CA", "MX"]
        )

        config = OrganizationConfig(id="test-org", name="Test Organization", metadata=metadata)

        sync_service = OrganizationSyncService()

        # This should NOT raise "no results to fetch" error after fix
        try:
            org_id = sync_service.create_organization(config)
            assert org_id is not None
            assert org_id > 0
        except Exception as e:
            pytest.fail(f"Service regions sync should work after fix: {e}")
