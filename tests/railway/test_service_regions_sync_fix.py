#!/usr/bin/env python3
"""
TDD Test for Service Regions Sync Conflict Resolution Fix

This test addresses the Railway sync failure where service_regions has a count mismatch.
Root cause: service_regions uses ON CONFLICT (organization_id, country) instead of ON CONFLICT (id)
like other tables, causing duplicate records.
"""

from unittest.mock import MagicMock, patch

import pytest

from services.railway.sync import _sync_service_regions_with_mapping


@pytest.mark.unit
class TestServiceRegionsSyncConflictResolution:
    """Test service_regions sync uses consistent conflict resolution strategy."""

    def test_service_regions_uses_id_conflict_resolution_not_composite_key(self):
        """Test that service_regions sync uses ON CONFLICT (id) like other tables (TDD - SHOULD FAIL INITIALLY)."""
        mock_session = MagicMock()
        mock_org_id_mapping = {1: 101, 2: 102}  # local_id -> railway_id

        # Mock service_regions data
        mock_regions = [
            (1, 1, "US", True, "Notes 1", "2023-01-01", "2023-01-02", "North America"),
            (2, 2, "CA", True, "Notes 2", "2023-01-01", "2023-01-02", "North America"),
        ]

        with patch("services.railway.sync.get_pooled_connection") as mock_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = mock_regions
            mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            # Call the function
            result = _sync_service_regions_with_mapping(mock_session, mock_org_id_mapping)

            # Verify the function was called
            assert result is True
            mock_session.execute.assert_called_once()

            # Get the SQL statement that was executed
            executed_sql = mock_session.execute.call_args[0][0].text

            # CRITICAL TEST: Should use ON CONFLICT (id) not (organization_id, country)
            assert "ON CONFLICT (id)" in executed_sql, f"Expected 'ON CONFLICT (id)' but got: {executed_sql}"
            assert "ON CONFLICT (organization_id, country)" not in executed_sql, f"Found problematic 'ON CONFLICT (organization_id, country)' in: {executed_sql}"

            # Verify all fields are in the UPDATE SET clause for completeness
            update_set_section = executed_sql.split("ON CONFLICT (id) DO UPDATE SET")[1]
            required_updates = [
                "organization_id = EXCLUDED.organization_id",
                "country = EXCLUDED.country",
                "active = EXCLUDED.active",
                "notes = EXCLUDED.notes",
                "updated_at = EXCLUDED.updated_at",
                "region = EXCLUDED.region",
            ]

            for required_update in required_updates:
                assert required_update in update_set_section, f"Missing '{required_update}' in UPDATE SET clause: {update_set_section}"

    def test_service_regions_sync_preserves_all_field_updates(self):
        """Test that service_regions conflict resolution updates ALL synced fields (TDD - SHOULD FAIL INITIALLY)."""
        mock_session = MagicMock()
        mock_org_id_mapping = {3: 103}

        # Mock single service region
        mock_regions = [(3, 3, "UK", False, "Updated notes", "2023-01-01", "2023-12-31", "Europe")]

        with patch("services.railway.sync.get_pooled_connection") as mock_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = mock_regions
            mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            result = _sync_service_regions_with_mapping(mock_session, mock_org_id_mapping)

            assert result is True

            # Verify the SQL includes comprehensive field updates
            executed_sql = mock_session.execute.call_args[0][0].text

            # Should NOT only update 3 fields like the current broken implementation
            broken_partial_update = "active = EXCLUDED.active,\n                notes = EXCLUDED.notes,\n                updated_at = EXCLUDED.updated_at"
            assert broken_partial_update not in executed_sql, "Found old partial UPDATE SET clause - should update ALL fields"

            # Should include created_at in UPDATE (missing in current implementation)
            assert "created_at = EXCLUDED.created_at" in executed_sql, "Missing created_at in UPDATE SET clause"

    def test_service_regions_transaction_function_also_uses_id_conflict(self):
        """Test that the transaction version also uses ON CONFLICT (id) (TDD - SHOULD FAIL INITIALLY)."""
        from services.railway.sync import _sync_service_regions_to_railway_in_transaction

        mock_session = MagicMock()

        # Mock organization mapping data
        mock_orgs = [(1, "test-org")]
        railway_org_result = MagicMock()
        railway_org_result.fetchone.return_value = (101,)  # railway org id
        mock_session.execute.return_value = railway_org_result

        # Mock service_regions data
        mock_regions = [(1, 1, "US", True, "Notes", "2023-01-01", "2023-01-02", "North America")]

        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            mock_cursor = MagicMock()

            # First call for org mapping, second for service_regions
            mock_cursor.fetchall.side_effect = [mock_orgs, mock_regions]
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            result = _sync_service_regions_to_railway_in_transaction(mock_session)

            assert result is True

            # Find the service_regions INSERT call (should be the last execute call)
            execute_calls = mock_session.execute.call_args_list
            service_regions_call = None

            for call in execute_calls:
                sql_text = call[0][0].text if hasattr(call[0][0], "text") else str(call[0][0])
                if "INSERT INTO service_regions" in sql_text:
                    service_regions_call = sql_text
                    break

            assert service_regions_call is not None, "No service_regions INSERT found in execute calls"

            # CRITICAL TEST: Transaction version should also use ON CONFLICT (id)
            assert "ON CONFLICT (id)" in service_regions_call, f"Transaction version should use 'ON CONFLICT (id)': {service_regions_call}"
            assert "ON CONFLICT (organization_id, country)" not in service_regions_call, f"Found problematic composite key conflict in transaction version: {service_regions_call}"
