"""
Tests for adoption_fees database schema changes.

Following TDD principles - these tests validate that the database schema
correctly includes and handles the adoption_fees JSONB column.
"""

import json

import pytest

from utils.db_connection import execute_command, execute_query


@pytest.mark.database
@pytest.mark.integration
class TestAdoptionFeesSchema:
    """Test suite for adoption_fees column in organizations table."""

    def test_organizations_table_has_adoption_fees_column(self):
        """
        Test that organizations table includes adoption_fees column.

        GIVEN organizations table in database
        WHEN querying table schema
        THEN adoption_fees column should exist with JSONB type
        """
        query = """
            SELECT column_name, data_type, column_default
            FROM information_schema.columns
            WHERE table_name = 'organizations'
            AND column_name = 'adoption_fees'
        """

        result = execute_query(query)

        assert len(result) == 1
        column_info = result[0]
        assert column_info["column_name"] == "adoption_fees"
        assert "jsonb" in column_info["data_type"].lower()
        assert "'{}'" in column_info["column_default"] or "{}" in column_info["column_default"]

    def test_adoption_fees_column_accepts_json_data(self):
        """
        Test that adoption_fees column accepts and stores JSON data.

        GIVEN organizations table with adoption_fees column
        WHEN inserting organization with JSON adoption_fees
        THEN data should be stored and retrievable as JSON
        """
        # Test data
        test_adoption_fees = {
            "usual_fee": 450,
            "currency": "EUR",
            "special_rates": {"senior": 200, "puppy": 550},
        }

        # Insert test organization
        insert_query = """
            INSERT INTO organizations (name, config_id, website_url, adoption_fees, created_at, updated_at)
            VALUES (%s, %s, %s, %s::jsonb, NOW(), NOW())
            RETURNING id, adoption_fees
        """

        result = execute_command(
            insert_query,
            (
                "Test Schema Org",
                "test-schema-org",
                "https://example.com",
                json.dumps(test_adoption_fees),
            ),
        )

        assert result is not None
        org_id = result["id"]
        stored_fees = result["adoption_fees"]

        # Verify stored data matches input
        assert stored_fees == test_adoption_fees
        assert stored_fees["usual_fee"] == 450
        assert stored_fees["currency"] == "EUR"
        assert stored_fees["special_rates"]["senior"] == 200

        # Clean up
        execute_command("DELETE FROM organizations WHERE id = %s", (org_id,))

    def test_adoption_fees_column_defaults_to_empty_object(self):
        """
        Test that adoption_fees column defaults to empty JSON object.

        GIVEN organizations table with adoption_fees column having default
        WHEN inserting organization without specifying adoption_fees
        THEN adoption_fees should default to empty JSON object
        """
        # Insert without adoption_fees
        insert_query = """
            INSERT INTO organizations (name, config_id, website_url, created_at, updated_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            RETURNING id, adoption_fees
        """

        result = execute_command(
            insert_query,
            ("Test Default Org", "test-default-org", "https://example.com"),
        )

        assert result is not None
        org_id = result["id"]
        stored_fees = result["adoption_fees"]

        # Verify default empty object
        assert stored_fees == {}
        assert isinstance(stored_fees, dict)

        # Clean up
        execute_command("DELETE FROM organizations WHERE id = %s", (org_id,))

    def test_adoption_fees_column_handles_null_input(self):
        """
        Test that adoption_fees column handles NULL input appropriately.

        GIVEN adoption_fees column that accepts NULL
        WHEN inserting NULL value
        THEN it should be stored as NULL or default to empty object
        """
        # Insert with explicit NULL
        insert_query = """
            INSERT INTO organizations (name, config_id, website_url, adoption_fees, created_at, updated_at)
            VALUES (%s, %s, %s, %s, NOW(), NOW())
            RETURNING id, adoption_fees
        """

        result = execute_command(
            insert_query,
            ("Test Null Org", "test-null-org", "https://example.com", None),
        )

        assert result is not None
        org_id = result["id"]
        stored_fees = result["adoption_fees"]

        # Should either be None or default to empty object
        assert stored_fees is None or stored_fees == {}

        # Clean up
        execute_command("DELETE FROM organizations WHERE id = %s", (org_id,))

    def test_adoption_fees_column_supports_json_queries(self):
        """
        Test that adoption_fees column supports JSON querying operations.

        GIVEN organizations with JSON adoption_fees data
        WHEN using JSON operators in queries
        THEN should be able to query by JSON fields
        """
        # Insert test data with different fees
        test_orgs = [
            ("High Fee Org", "high-fee", {"usual_fee": 600, "currency": "EUR"}),
            ("Low Fee Org", "low-fee", {"usual_fee": 200, "currency": "USD"}),
            ("No Fee Org", "no-fee", {}),
        ]

        org_ids = []

        try:
            # Insert test organizations
            for name, config_id, fees in test_orgs:
                insert_query = """
                    INSERT INTO organizations (name, config_id, website_url, adoption_fees, created_at, updated_at)
                    VALUES (%s, %s, %s, %s::jsonb, NOW(), NOW())
                    RETURNING id
                """
                result = execute_command(
                    insert_query,
                    (name, config_id, "https://example.com", json.dumps(fees)),
                )
                org_ids.append(result["id"])

            # Test JSON field query
            query = """
                SELECT name, adoption_fees->'usual_fee' as fee_amount
                FROM organizations
                WHERE adoption_fees ? 'usual_fee'
                AND config_id IN ('high-fee', 'low-fee', 'no-fee')
                ORDER BY name
            """

            results = execute_query(query)

            # Should find organizations with usual_fee field
            assert len(results) == 2  # high-fee and low-fee, not no-fee

            # Verify fee amounts
            fee_amounts = [int(result["fee_amount"]) for result in results]
            assert 600 in fee_amounts
            assert 200 in fee_amounts

        finally:
            # Clean up all test organizations
            for org_id in org_ids:
                execute_command("DELETE FROM organizations WHERE id = %s", (org_id,))

    def test_adoption_fees_column_supports_json_updates(self):
        """
        Test that adoption_fees column supports JSON update operations.

        GIVEN organization with adoption_fees data
        WHEN updating specific JSON fields
        THEN changes should be applied correctly
        """
        # Insert initial organization
        initial_fees = {"usual_fee": 300, "currency": "USD"}

        insert_query = """
            INSERT INTO organizations (name, config_id, website_url, adoption_fees, created_at, updated_at)
            VALUES (%s, %s, %s, %s::jsonb, NOW(), NOW())
            RETURNING id
        """

        result = execute_command(
            insert_query,
            (
                "Update Test Org",
                "update-test-org",
                "https://example.com",
                json.dumps(initial_fees),
            ),
        )

        org_id = result["id"]

        try:
            # Update adoption_fees with new data
            updated_fees = {"usual_fee": 400, "currency": "EUR", "special_discount": 50}

            update_query = """
                UPDATE organizations
                SET adoption_fees = %s::jsonb, updated_at = NOW()
                WHERE id = %s
                RETURNING adoption_fees
            """

            result = execute_command(update_query, (json.dumps(updated_fees), org_id))

            # Verify update
            stored_fees = result["adoption_fees"]
            assert stored_fees["usual_fee"] == 400
            assert stored_fees["currency"] == "EUR"
            assert stored_fees["special_discount"] == 50

        finally:
            # Clean up
            execute_command("DELETE FROM organizations WHERE id = %s", (org_id,))

    def test_adoption_fees_column_json_validation(self):
        """
        Test that adoption_fees column validates JSON input properly.

        GIVEN invalid JSON string for adoption_fees
        WHEN attempting to insert
        THEN should raise appropriate database error
        """
        # This test may not be necessary if PostgreSQL automatically validates JSON
        # But it's good to verify the behavior
        invalid_json = "{invalid json syntax"  # Invalid JSON syntax - missing closing brace and quotes
        insert_query = """
            INSERT INTO organizations (name, config_id, website_url, adoption_fees, created_at, updated_at)
            VALUES (%s, %s, %s, %s::jsonb, NOW(), NOW())
            RETURNING id
        """

        # Should raise exception for invalid JSON
        with pytest.raises(Exception) as exc_info:
            execute_command(
                insert_query,
                (
                    "Invalid JSON Org",
                    "invalid-json-org",
                    "https://example.com",
                    invalid_json,
                ),
            )

        # Error should be related to JSON parsing
        error_msg = str(exc_info.value).lower()
        assert any(keyword in error_msg for keyword in ["json", "syntax", "invalid", "parse"])

    def test_adoption_fees_in_existing_organizations(self):
        """
        Test that existing organizations have adoption_fees column available.

        GIVEN existing organizations in database
        WHEN querying adoption_fees field
        THEN column should be accessible and return appropriate values
        """
        # Query existing organizations
        query = """
            SELECT id, name, adoption_fees
            FROM organizations
            LIMIT 5
        """

        results = execute_query(query)

        # Should be able to query without error
        assert isinstance(results, list)

        # Check each organization has adoption_fees field
        for org in results:
            assert "adoption_fees" in org
            # Should be either dict or None
            assert isinstance(org["adoption_fees"], (dict, type(None)))

            # If it's a dict, should be valid structure
            if isinstance(org["adoption_fees"], dict):
                # Could be empty dict or have fee structure
                if org["adoption_fees"]:
                    # If not empty, should have reasonable structure
                    if "usual_fee" in org["adoption_fees"]:
                        assert isinstance(org["adoption_fees"]["usual_fee"], (int, float))
                    if "currency" in org["adoption_fees"]:
                        assert isinstance(org["adoption_fees"]["currency"], str)
                        assert len(org["adoption_fees"]["currency"]) <= 5
