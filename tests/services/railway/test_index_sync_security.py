"""Test security fixes in Railway index sync module."""

from unittest.mock import MagicMock, patch

import pytest

from services.railway.index_sync import sync_indexes_to_railway


class TestIndexSyncSecurity:
    """Test security improvements in index sync."""

    @pytest.mark.unit
    def test_index_name_validation_prevents_sql_injection(self):
        """Test that malicious index names are rejected."""
        with patch("services.railway.index_sync.get_local_indexes") as mock_local:
            with patch("services.railway.index_sync.get_railway_indexes") as mock_railway:
                with patch("services.railway.index_sync.railway_session") as mock_session:
                    # Setup mocks
                    mock_local.return_value = [
                        {
                            "name": "idx_valid_name",
                            "definition": "CREATE INDEX idx_valid_name ON animals (id)",
                            "table": "animals",
                        },
                        {
                            "name": "idx_malicious'; DROP TABLE animals; --",
                            "definition": "CREATE INDEX malicious ON animals (id)",
                            "table": "animals",
                        },
                    ]
                    mock_railway.return_value = []

                    # Create a mock session
                    session_mock = MagicMock()
                    mock_session.return_value.__enter__.return_value = session_mock

                    # Run sync
                    _result = sync_indexes_to_railway("animals", dry_run=False)

                    # Check that only valid index was executed
                    executed_queries = [call[0][0]._text if hasattr(call[0][0], "_text") else str(call[0][0]) for call in session_mock.execute.call_args_list]

                    # Should have attempted to create valid index
                    assert any("idx_valid_name" in query for query in executed_queries)

                    # Should NOT have attempted malicious index
                    assert not any("DROP TABLE" in query for query in executed_queries)

    @pytest.mark.unit
    def test_table_name_validation(self):
        """Test that table names are validated to prevent SQL injection."""
        with patch("services.railway.index_sync.get_local_indexes") as mock_local:
            with patch("services.railway.index_sync.get_railway_indexes") as mock_railway:
                with patch("services.railway.index_sync.railway_session") as mock_session:
                    # Setup mocks
                    mock_local.return_value = []
                    mock_railway.return_value = []

                    # Create a mock session
                    session_mock = MagicMock()
                    mock_session.return_value.__enter__.return_value = session_mock

                    # Try with malicious table name
                    malicious_table = "animals; DROP TABLE users; --"
                    _result = sync_indexes_to_railway(malicious_table, dry_run=False)

                    # Check that ANALYZE was not executed for malicious table
                    executed_queries = [call[0][0]._text if hasattr(call[0][0], "_text") else str(call[0][0]) for call in session_mock.execute.call_args_list]

                    # Should not have DROP TABLE in any query
                    assert not any("DROP TABLE" in query for query in executed_queries)

    @pytest.mark.unit
    def test_dry_run_mode_prevents_execution(self):
        """Test that dry_run mode doesn't execute any changes."""
        with patch("services.railway.index_sync.get_local_indexes") as mock_local:
            with patch("services.railway.index_sync.get_railway_indexes") as mock_railway:
                with patch("services.railway.index_sync.railway_session") as mock_session:
                    # Setup mocks
                    mock_local.return_value = [
                        {
                            "name": "idx_new_index",
                            "definition": "CREATE INDEX idx_new_index ON animals (id)",
                            "table": "animals",
                        }
                    ]
                    mock_railway.return_value = []

                    # Run in dry_run mode
                    result = sync_indexes_to_railway("animals", dry_run=True)

                    # Session should not be created in dry_run mode
                    mock_session.assert_not_called()

                    # Should return True for successful dry run
                    assert result is True
