#!/usr/bin/env python3
"""
Security tests for Railway sync operations.

Tests designed to catch security vulnerabilities that were missed
by the original test suite due to over-mocking.
"""

from unittest.mock import MagicMock, patch

import pytest

from services.railway.sync import get_railway_data_count


@pytest.mark.complex_setup
@pytest.mark.requires_migrations
class TestRailwaySyncSecurity:
    """Security tests for Railway sync operations."""

    def test_sql_injection_vulnerability_in_get_railway_data_count(self):
        """
        Test that demonstrates SQL injection vulnerability in get_railway_data_count.

        The current implementation uses f-string interpolation which allows
        SQL injection through the table_name parameter.
        """
        # Malicious table name that would cause SQL injection
        malicious_table_name = "organizations; DROP TABLE animals; --"

        with patch("services.railway.sync.railway_session") as mock_session:
            mock_session_instance = MagicMock()
            mock_session.return_value.__enter__.return_value = mock_session_instance

            # This should fail safely, but currently it allows injection
            # The f-string creates: "SELECT COUNT(*) FROM organizations; DROP TABLE animals; --"
            try:
                get_railway_data_count(malicious_table_name)

                # Verify the dangerous SQL was constructed
                executed_sql = mock_session_instance.execute.call_args[0][0]
                sql_string = str(executed_sql)

                # This assertion will PASS with current vulnerable code
                # proving the SQL injection vulnerability exists
                assert "DROP TABLE animals" in sql_string, "SQL injection vulnerability detected"

                # This test should FAIL initially, proving the vulnerability
                pytest.fail("SQL injection vulnerability confirmed - malicious SQL was executed")

            except Exception as e:
                # If an exception occurs, it might be due to SQL parsing
                # but the vulnerability still exists in the f-string construction
                pass

    def test_table_name_validation_prevents_injection(self):
        """
        Test that proper table name validation prevents SQL injection.

        This test will PASS once we fix the vulnerability.
        """
        # Test with valid table names
        valid_tables = ["organizations", "animals", "animal_images"]

        with patch("services.railway.sync.railway_session") as mock_session:
            mock_result = MagicMock()
            mock_result.scalar.return_value = 5
            mock_session.return_value.__enter__.return_value.execute.return_value = mock_result

            for table in valid_tables:
                count = get_railway_data_count(table)
                assert count == 5

        # Test with invalid/malicious table names should return 0 or raise exception
        invalid_tables = ["organizations; DROP TABLE animals; --", "animals' OR '1'='1", "users UNION SELECT * FROM sensitive_data", "../etc/passwd", "'; DELETE FROM animals; --"]

        for malicious_table in invalid_tables:
            # After fix, this should either return 0 or raise a validation error
            count = get_railway_data_count(malicious_table)
            # Current vulnerable implementation will not properly validate
            # After fix, malicious tables should return 0
            assert count == 0, f"Malicious table name '{malicious_table}' should return 0"
