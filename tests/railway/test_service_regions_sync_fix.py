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

    def test_service_regions_uses_composite_key_conflict_resolution(self):
        """Test that service_regions sync uses ON CONFLICT (organization_id, country) to match the database constraint."""
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

            # CRITICAL TEST: Should use ON CONFLICT (organization_id, country) to match database constraint
            assert "ON CONFLICT (organization_id, country)" in executed_sql, f"Expected 'ON CONFLICT (organization_id, country)' but got: {executed_sql}"
            assert "ON CONFLICT (id) DO UPDATE SET" not in executed_sql, f"Should not use 'ON CONFLICT (id)' - found in: {executed_sql}"

            # Verify UPDATE SET clause doesn't try to update the constraint columns
            update_set_section = executed_sql.split("ON CONFLICT (organization_id, country) DO UPDATE SET")[1]

            # These should NOT be updated (they're part of the constraint)
            assert "organization_id = EXCLUDED.organization_id" not in update_set_section, "Should not update organization_id in conflict"
            assert "country = EXCLUDED.country" not in update_set_section, "Should not update country in conflict"

            # These SHOULD be updated
            required_updates = [
                "active = EXCLUDED.active",
                "notes = EXCLUDED.notes",
                "updated_at = EXCLUDED.updated_at",
                "region = EXCLUDED.region",
            ]

            for required_update in required_updates:
                assert required_update in update_set_section, f"Missing '{required_update}' in UPDATE SET clause: {update_set_section}"

    def test_service_regions_sync_preserves_appropriate_field_updates(self):
        """Test that service_regions conflict resolution updates only non-constraint fields."""
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

            # Verify the SQL includes appropriate field updates
            executed_sql = mock_session.execute.call_args[0][0].text

            # Should update these fields
            assert "active = EXCLUDED.active" in executed_sql, "Should update active field"
            assert "notes = EXCLUDED.notes" in executed_sql, "Should update notes field"
            assert "updated_at = EXCLUDED.updated_at" in executed_sql, "Should update updated_at field"
            assert "region = EXCLUDED.region" in executed_sql, "Should update region field"

            # Should NOT update constraint fields
            assert "organization_id = EXCLUDED.organization_id" not in executed_sql, "Should NOT update organization_id (part of constraint)"
            assert "country = EXCLUDED.country" not in executed_sql, "Should NOT update country (part of constraint)"

    def test_service_regions_transaction_function_also_uses_composite_key_conflict(self):
        """Test that the transaction version also uses ON CONFLICT (organization_id, country)."""
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

            # CRITICAL TEST: Transaction version should also use ON CONFLICT (organization_id, country)
            assert "ON CONFLICT (organization_id, country)" in service_regions_call, f"Transaction version should use 'ON CONFLICT (organization_id, country)': {service_regions_call}"
            assert "ON CONFLICT (id) DO UPDATE SET" not in service_regions_call, f"Should not use 'ON CONFLICT (id)' in transaction version: {service_regions_call}"
