"""Tests for Railway index synchronization."""

from unittest.mock import MagicMock, patch

import pytest

from services.railway.index_sync import (
    get_local_indexes,
    get_railway_indexes,
    sync_all_table_indexes,
    sync_indexes_to_railway,
)


@pytest.mark.integration
@pytest.mark.slow
@pytest.mark.unit
class TestIndexSync:
    """Test suite for index synchronization functionality."""

    @patch("psycopg2.connect")
    def test_get_local_indexes_success(self, mock_connect):
        """Test successfully getting local indexes."""
        # Setup mock
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        mock_cursor.fetchall.return_value = [
            (
                "idx_animals_status",
                "CREATE INDEX idx_animals_status ON animals(status)",
                "animals",
            ),
            (
                "idx_animals_org",
                "CREATE INDEX idx_animals_org ON animals(organization_id)",
                "animals",
            ),
        ]

        # Execute
        result = get_local_indexes("animals")

        # Assert
        assert len(result) == 2
        assert result[0]["name"] == "idx_animals_status"
        assert result[1]["name"] == "idx_animals_org"
        mock_cursor.execute.assert_called_once()
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()

    @patch("services.railway.index_sync.railway_session")
    def test_get_railway_indexes_success(self, mock_railway_session):
        """Test successfully getting Railway indexes."""
        # Setup mock
        mock_session = MagicMock()
        mock_railway_session.return_value.__enter__.return_value = mock_session

        mock_result = [
            (
                "idx_animals_status",
                "CREATE INDEX idx_animals_status ON animals(status)",
                "animals",
            ),
            (
                "idx_animals_breed",
                "CREATE INDEX idx_animals_breed ON animals(breed)",
                "animals",
            ),
        ]
        mock_session.execute.return_value = mock_result

        # Execute
        result = get_railway_indexes("animals")

        # Assert
        assert len(result) == 2
        assert result[0]["name"] == "idx_animals_status"
        assert result[1]["name"] == "idx_animals_breed"

    @patch("services.railway.index_sync.get_railway_indexes")
    @patch("services.railway.index_sync.get_local_indexes")
    @patch("services.railway.index_sync.railway_session")
    def test_sync_indexes_dry_run(self, mock_railway_session, mock_get_local, mock_get_railway):
        """Test dry run mode shows what would be done without executing."""
        # Setup mocks
        mock_get_local.return_value = [
            {
                "name": "idx_animals_status",
                "definition": "CREATE INDEX idx_animals_status ON animals(status)",
                "table": "animals",
            },
            {
                "name": "idx_animals_new",
                "definition": "CREATE INDEX idx_animals_new ON animals(name)",
                "table": "animals",
            },
        ]

        mock_get_railway.return_value = [
            {
                "name": "idx_animals_status",
                "definition": "CREATE INDEX idx_animals_status ON animals(status)",
                "table": "animals",
            },
            {
                "name": "idx_animals_old",
                "definition": "CREATE INDEX idx_animals_old ON animals(old_field)",
                "table": "animals",
            },
        ]

        # Execute
        result = sync_indexes_to_railway("animals", dry_run=True)

        # Assert
        assert result is True
        # In dry run, session should not be used
        mock_railway_session.assert_not_called()

    @patch("services.railway.index_sync.get_railway_indexes")
    @patch("services.railway.index_sync.get_local_indexes")
    @patch("services.railway.index_sync.railway_session")
    def test_sync_indexes_creates_missing(self, mock_railway_session, mock_get_local, mock_get_railway):
        """Test sync creates indexes that exist locally but not in Railway."""
        # Setup mocks
        mock_session = MagicMock()
        mock_railway_session.return_value.__enter__.return_value = mock_session

        mock_get_local.return_value = [
            {
                "name": "idx_animals_status",
                "definition": "CREATE INDEX CONCURRENTLY idx_animals_status ON animals(status)",
                "table": "animals",
            },
            {
                "name": "idx_animals_new",
                "definition": "CREATE INDEX CONCURRENTLY idx_animals_new ON animals(name)",
                "table": "animals",
            },
        ]

        mock_get_railway.return_value = [
            {
                "name": "idx_animals_status",
                "definition": "CREATE INDEX idx_animals_status ON animals(status)",
                "table": "animals",
            },
        ]

        # Execute
        result = sync_indexes_to_railway("animals", dry_run=False)

        # Assert
        assert result is True
        # Should create the missing index (without CONCURRENTLY)
        calls = mock_session.execute.call_args_list
        # Check if any call contains the CREATE INDEX command
        executed_sqls = []
        for call in calls:
            if call and call[0] and hasattr(call[0][0], "text"):
                executed_sqls.append(call[0][0].text)

        assert any("CREATE INDEX idx_animals_new" in sql for sql in executed_sqls)
        assert not any("CONCURRENTLY" in sql for sql in executed_sqls)
        mock_session.commit.assert_called()

    @patch("services.railway.index_sync.get_railway_indexes")
    @patch("services.railway.index_sync.get_local_indexes")
    @patch("services.railway.index_sync.railway_session")
    def test_sync_indexes_drops_extra(self, mock_railway_session, mock_get_local, mock_get_railway):
        """Test sync drops indexes that exist in Railway but not locally."""
        # Setup mocks
        mock_session = MagicMock()
        mock_railway_session.return_value.__enter__.return_value = mock_session

        mock_get_local.return_value = [
            {
                "name": "idx_animals_status",
                "definition": "CREATE INDEX idx_animals_status ON animals(status)",
                "table": "animals",
            },
        ]

        mock_get_railway.return_value = [
            {
                "name": "idx_animals_status",
                "definition": "CREATE INDEX idx_animals_status ON animals(status)",
                "table": "animals",
            },
            {
                "name": "idx_animals_old",
                "definition": "CREATE INDEX idx_animals_old ON animals(old_field)",
                "table": "animals",
            },
        ]

        # Execute
        result = sync_indexes_to_railway("animals", dry_run=False)

        # Assert
        assert result is True
        # Should drop the extra index
        calls = mock_session.execute.call_args_list
        # Check if any call contains the DROP INDEX command
        executed_sqls = []
        for call in calls:
            if call and call[0] and hasattr(call[0][0], "text"):
                executed_sqls.append(call[0][0].text)

        assert any("DROP INDEX IF EXISTS idx_animals_old" in sql for sql in executed_sqls)

    @patch("services.railway.index_sync.get_railway_indexes")
    @patch("services.railway.index_sync.get_local_indexes")
    @patch("services.railway.index_sync.railway_session")
    def test_sync_indexes_preserves_unique_constraints(self, mock_railway_session, mock_get_local, mock_get_railway):
        """Test sync does not drop primary keys or unique constraints."""
        # Setup mocks
        mock_session = MagicMock()
        mock_railway_session.return_value.__enter__.return_value = mock_session

        mock_get_local.return_value = []

        mock_get_railway.return_value = [
            {
                "name": "animals_pkey",
                "definition": "CREATE UNIQUE INDEX animals_pkey ON animals(id)",
                "table": "animals",
            },
            {
                "name": "animals_slug_unique",
                "definition": "CREATE UNIQUE INDEX animals_slug_unique ON animals(slug)",
                "table": "animals",
            },
            {
                "name": "animals_external_key",
                "definition": "CREATE UNIQUE INDEX animals_external_key ON animals(external_id)",
                "table": "animals",
            },
            {
                "name": "idx_animals_old",
                "definition": "CREATE INDEX idx_animals_old ON animals(old_field)",
                "table": "animals",
            },
        ]

        # Execute
        result = sync_indexes_to_railway("animals", dry_run=False)

        # Assert
        # Should only drop idx_animals_old, not the unique constraints
        calls = mock_session.execute.call_args_list
        # Check if any call contains the DROP INDEX command
        executed_sqls = []
        for call in calls:
            if call and call[0] and hasattr(call[0][0], "text"):
                executed_sqls.append(call[0][0].text)

        assert any("DROP INDEX IF EXISTS idx_animals_old" in sql for sql in executed_sqls)
        assert not any("animals_pkey" in sql for sql in executed_sqls)
        assert not any("animals_slug_unique" in sql for sql in executed_sqls)
        assert not any("animals_external_key" in sql for sql in executed_sqls)

    @patch("services.railway.index_sync.sync_indexes_to_railway")
    def test_sync_all_table_indexes(self, mock_sync_indexes):
        """Test syncing indexes for all main tables."""
        # Setup mock
        mock_sync_indexes.return_value = True

        # Execute
        result = sync_all_table_indexes(dry_run=False)

        # Assert
        assert result is True
        # Should be called for each table
        assert mock_sync_indexes.call_count == 4
        mock_sync_indexes.assert_any_call("animals", dry_run=False)
        mock_sync_indexes.assert_any_call("organizations", dry_run=False)
        mock_sync_indexes.assert_any_call("scrape_logs", dry_run=False)
        mock_sync_indexes.assert_any_call("service_regions", dry_run=False)

    @patch("services.railway.index_sync.sync_indexes_to_railway")
    def test_sync_all_table_indexes_partial_failure(self, mock_sync_indexes):
        """Test sync_all returns False if any table fails."""
        # Setup mock - first table succeeds, second fails
        mock_sync_indexes.side_effect = [True, False, True, True]

        # Execute
        result = sync_all_table_indexes(dry_run=False)

        # Assert
        assert result is False
        assert mock_sync_indexes.call_count == 4
