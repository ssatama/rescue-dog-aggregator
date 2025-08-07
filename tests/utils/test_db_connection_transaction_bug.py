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

            # Commands that don't return data (DELETE and INSERT without RETURNING)
            commands = [
                ("DELETE FROM service_regions WHERE organization_id = %s", (1,)),
                ("INSERT INTO service_regions (organization_id, country) VALUES (%s, %s)", (1, "US")),
            ]

            # This should work now that bug is fixed
            results = execute_transaction(commands)

            # Should return None for both DELETE and INSERT without RETURNING
            assert results == [None, None]

            # fetchone should not be called at all for these commands
            assert mock_cursor.fetchone.call_count == 0

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
                None,  # INSERT without RETURNING - no fetchone() called
                {"id": 1, "name": "test"},  # INSERT with RETURNING - fetchone() called
                {"count": 5},  # SELECT - fetchone() called
            ]

            assert results == expected_results

            # fetchone should only be called 2 times (INSERT with RETURNING, SELECT)
            # NOT called for DELETE or INSERT without RETURNING
            assert mock_cursor.fetchone.call_count == 2


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
