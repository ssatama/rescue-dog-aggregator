#!/usr/bin/env python3
"""
Railway adoption_fees sync tests following TDD principles.
Tests the critical missing adoption_fees column in Railway sync queries.
"""

import json
from unittest.mock import MagicMock, patch

import pytest

from services.railway.sync import (
    _process_organizations_chunk,
    _sync_organizations_to_railway_in_transaction,
    sync_organizations_to_railway,
)


@pytest.mark.railway
@pytest.mark.unit
class TestRailwayAdoptionFeesSync:
    """Test Railway sync includes adoption_fees column in all organization queries."""

    def test_sync_organizations_select_includes_adoption_fees(self):
        """Test that organization SELECT query includes adoption_fees column (TDD Step 1 - SHOULD FAIL)."""
        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn, patch("services.railway.sync.railway_session") as mock_railway:

            # Setup mock local connection
            mock_cursor = MagicMock()
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            # Setup mock Railway connection
            mock_railway_session = MagicMock()
            mock_railway.return_value.__enter__.return_value = mock_railway_session

            # Mock empty results to focus on SQL query structure
            mock_cursor.fetchmany.return_value = []

            # Call the function
            result = sync_organizations_to_railway()

            # Verify the SELECT query was called
            mock_cursor.execute.assert_called_once()
            executed_query = mock_cursor.execute.call_args[0][0]

            # CRITICAL TEST: adoption_fees must be in SELECT query
            assert "adoption_fees" in executed_query.lower(), f"adoption_fees column missing from SELECT query: {executed_query}"

            assert result is True

    def test_process_organizations_chunk_insert_includes_adoption_fees(self):
        """Test that organization INSERT statement includes adoption_fees column (TDD Step 1 - SHOULD FAIL)."""
        mock_session = MagicMock()

        # Create test organization data with adoption_fees as the 21st column
        test_org_with_adoption_fees = (
            1,  # id
            "Test Organization",  # name
            "https://test.org",  # website_url
            "Test description",  # description
            "US",  # country
            "New York",  # city
            "https://logo.url",  # logo_url
            True,  # active
            "2023-01-01 00:00:00",  # created_at
            "2023-01-01 00:00:00",  # updated_at
            {"facebook": "https://facebook.com"},  # social_media
            "test-org",  # config_id
            "2023-01-01 00:00:00",  # last_config_sync
            2020,  # established_year
            ["US", "CA"],  # ships_to
            ["US"],  # service_regions
            150,  # total_dogs
            5,  # new_this_week
            [{"name": "Buddy"}],  # recent_dogs
            "test-organization",  # slug
            {"usual_fee": 500, "currency": "EUR"},  # adoption_fees (21st column)
        )

        organizations_chunk = [test_org_with_adoption_fees]

        # Call the function
        _process_organizations_chunk(mock_session, organizations_chunk)

        # Verify execute was called
        mock_session.execute.assert_called_once()
        executed_sql = mock_session.execute.call_args[0][0].text

        # CRITICAL TEST: adoption_fees must be in INSERT statement
        assert "adoption_fees" in executed_sql.lower(), f"adoption_fees column missing from INSERT statement: {executed_sql}"

        # CRITICAL TEST: adoption_fees must be in VALUES clause
        assert ":adoption_fees" in executed_sql.lower(), f"adoption_fees parameter missing from VALUES clause: {executed_sql}"

        # CRITICAL TEST: adoption_fees must be in UPDATE SET clause
        assert "adoption_fees = excluded.adoption_fees" in executed_sql.lower(), f"adoption_fees missing from ON CONFLICT UPDATE clause: {executed_sql}"

    def test_process_organizations_chunk_parameter_mapping_includes_adoption_fees(self):
        """Test that organization parameter mapping includes adoption_fees data (TDD Step 1 - SHOULD FAIL)."""
        mock_session = MagicMock()

        # Create test organization data with adoption_fees
        test_adoption_fees = {"usual_fee": 425, "currency": "GBP"}
        test_org_with_adoption_fees = (
            1,
            "Test Organization",
            "https://test.org",
            "Test description",
            "UK",
            "London",
            "https://logo.url",
            True,
            "2023-01-01 00:00:00",
            "2023-01-01 00:00:00",
            {"facebook": "https://facebook.com"},
            "test-org",
            "2023-01-01 00:00:00",
            2020,
            ["UK", "US"],
            ["UK"],
            100,
            3,
            [{"name": "Max"}],
            "test-organization",
            test_adoption_fees,  # adoption_fees as 21st column
        )

        organizations_chunk = [test_org_with_adoption_fees]

        # Call the function
        _process_organizations_chunk(mock_session, organizations_chunk)

        # Verify execute was called with parameters
        mock_session.execute.assert_called_once()
        call_args = mock_session.execute.call_args
        executed_params = call_args[0][1]  # Second argument should be the parameters dict

        # CRITICAL TEST: adoption_fees must be in parameter mapping
        assert "adoption_fees" in executed_params, f"adoption_fees parameter missing from parameter mapping: {list(executed_params.keys())}"

        # CRITICAL TEST: adoption_fees data must be JSON serialized
        adoption_fees_param = executed_params["adoption_fees"]
        assert adoption_fees_param is not None, "adoption_fees parameter should not be None"

        # Should be JSON string containing the adoption fees data
        if isinstance(adoption_fees_param, str):
            parsed_fees = json.loads(adoption_fees_param)
            assert parsed_fees["usual_fee"] == 425
            assert parsed_fees["currency"] == "GBP"

    def test_sync_organizations_transaction_select_includes_adoption_fees(self):
        """Test that transaction-based sync SELECT includes adoption_fees (TDD Step 1 - SHOULD FAIL)."""
        mock_session = MagicMock()

        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            # Setup mock local connection
            mock_cursor = MagicMock()
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            # Mock empty results to focus on SQL query structure
            mock_cursor.fetchmany.return_value = []

            # Call the function
            result = _sync_organizations_to_railway_in_transaction(mock_session)

            # Verify the SELECT query was called
            mock_cursor.execute.assert_called_once()
            executed_query = mock_cursor.execute.call_args[0][0]

            # CRITICAL TEST: adoption_fees must be in transaction SELECT query
            assert "adoption_fees" in executed_query.lower(), f"adoption_fees column missing from transaction SELECT query: {executed_query}"

            assert result is True

    def test_railway_sync_preserves_adoption_fees_data_integrity(self):
        """Test that adoption_fees data is preserved through Railway sync process (SHOULD FAIL)."""
        # This test verifies the complete data flow from local DB through Railway sync
        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn, patch("services.railway.sync.railway_session") as mock_railway:

            # Setup mock local connection with adoption_fees data
            mock_cursor = MagicMock()
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            # Mock organization with adoption_fees (21 columns total)
            test_org_data = (
                1,
                "REAN",
                "https://rean.org.uk",
                "European animal rescue",
                "UK",
                "London",
                "https://logo.url",
                True,
                "2023-01-01 00:00:00",
                "2023-01-01 00:00:00",
                {"facebook": "https://facebook.com/rean"},
                "rean",
                "2023-01-01 00:00:00",
                2015,
                ["UK", "EU"],
                ["UK"],
                200,
                8,
                [{"name": "Bella"}],
                "rean",
                {"usual_fee": 425, "currency": "GBP"},  # adoption_fees
            )

            # Return one batch of data, then empty
            mock_cursor.fetchmany.side_effect = [[test_org_data], []]

            # Setup mock Railway session
            mock_railway_session = MagicMock()
            mock_railway.return_value.__enter__.return_value = mock_railway_session

            # Call sync function
            result = sync_organizations_to_railway()

            # Verify adoption_fees data was passed to Railway
            mock_railway_session.execute.assert_called()

            # Get the parameters passed to Railway
            call_args = mock_railway_session.execute.call_args
            if len(call_args[0]) > 1:
                executed_params = call_args[0][1]

                # CRITICAL TEST: adoption_fees must be preserved in Railway sync
                assert "adoption_fees" in executed_params, "adoption_fees data lost during Railway sync process"

                # Verify the actual fees data is correct
                adoption_fees_param = executed_params["adoption_fees"]
                if isinstance(adoption_fees_param, str):
                    fees_data = json.loads(adoption_fees_param)
                    assert fees_data["usual_fee"] == 425
                    assert fees_data["currency"] == "GBP"

            assert result is True


@pytest.mark.railway
@pytest.mark.integration
class TestRailwayAdoptionFeesIntegration:
    """Integration tests for Railway adoption_fees sync with real Railway connection."""

    @pytest.mark.skip(reason="Requires RAILWAY_DATABASE_URL - run manually for integration testing")
    def test_railway_adoption_fees_schema_validation(self):
        """Test that Railway database schema includes adoption_fees column."""
        from sqlalchemy import text

        from services.railway.connection import railway_session

        with railway_session() as session:
            # Check if adoption_fees column exists in Railway organizations table
            result = session.execute(
                text(
                    """
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'organizations' AND column_name = 'adoption_fees'
            """
                )
            )

            columns = result.fetchall()
            assert len(columns) > 0, "adoption_fees column missing from Railway organizations table"
            assert columns[0][0] == "adoption_fees"

    @pytest.mark.skip(reason="Requires RAILWAY_DATABASE_URL - run manually for integration testing")
    def test_railway_adoption_fees_end_to_end_sync(self):
        """Test complete adoption_fees sync from local to Railway database."""
        from sqlalchemy import text

        from services.railway.connection import railway_session
        from services.railway.sync import sync_organizations_to_railway

        # Sync organizations to Railway
        result = sync_organizations_to_railway()
        assert result is True, "Railway organization sync failed"

        # Verify adoption_fees data exists in Railway
        with railway_session() as session:
            result = session.execute(
                text(
                    """
                SELECT name, adoption_fees 
                FROM organizations 
                WHERE adoption_fees IS NOT NULL 
                LIMIT 3
            """
                )
            )

            orgs_with_fees = result.fetchall()
            assert len(orgs_with_fees) > 0, "No organizations with adoption_fees found in Railway"

            # Verify data structure
            for org_name, adoption_fees in orgs_with_fees:
                assert adoption_fees is not None
                assert "usual_fee" in adoption_fees
                assert "currency" in adoption_fees
                assert adoption_fees["usual_fee"] > 0
                assert len(adoption_fees["currency"]) == 3  # Currency code like EUR, GBP
