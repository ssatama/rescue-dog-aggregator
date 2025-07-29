import os
from datetime import datetime
from unittest.mock import MagicMock, call, patch

import pytest

from services.railway.sync import (
    RailwayDataSyncer,
    get_local_data_count,
    get_railway_data_count,
    sync_all_data_to_railway,
    sync_animals_to_railway,
    sync_organizations_to_railway,
    validate_sync_integrity,
)


@pytest.mark.complex_setup
@pytest.mark.requires_migrations
class TestRailwayDataSync:

    def test_get_local_data_count_organizations(self):
        with patch("services.railway.sync.get_pooled_connection") as mock_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = (5,)
            mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            count = get_local_data_count("organizations")

            assert count == 5
            mock_cursor.execute.assert_called_with("SELECT COUNT(*) FROM organizations")

    def test_get_local_data_count_animals(self):
        with patch("services.railway.sync.get_pooled_connection") as mock_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = (800,)
            mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            count = get_local_data_count("animals")

            assert count == 800
            mock_cursor.execute.assert_called_with("SELECT COUNT(*) FROM animals")

    def test_get_local_data_count_invalid_table(self):
        count = get_local_data_count("invalid_table")
        assert count == 0

    def test_get_railway_data_count_success(self):
        with patch("services.railway.sync.railway_session") as mock_session:
            mock_result = MagicMock()
            mock_result.scalar.return_value = 10
            mock_session.return_value.__enter__.return_value.execute.return_value = mock_result

            count = get_railway_data_count("organizations")

            assert count == 10

    def test_get_railway_data_count_failure(self):
        with patch("services.railway.sync.railway_session") as mock_session:
            mock_session.return_value.__enter__.side_effect = Exception("Connection failed")

            count = get_railway_data_count("organizations")

            assert count == 0

    def test_sync_organizations_to_railway_success(self):
        mock_orgs = [
            ("Org 1", "https://org1.com", "Description 1", "US", "City1", "logo1.png", datetime.now(), "{}", "{}", "org-1"),
            ("Org 2", "https://org2.com", "Description 2", "UK", "City2", "logo2.png", datetime.now(), "{}", "{}", "org-2"),
        ]

        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_cursor = MagicMock()
                mock_cursor.fetchall.return_value = mock_orgs
                mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

                mock_railway_conn = MagicMock()
                mock_railway_session.return_value.__enter__.return_value = mock_railway_conn

                result = sync_organizations_to_railway()

                assert result is True
                assert mock_railway_conn.execute.call_count == 2  # One insert per organization

    def test_sync_organizations_to_railway_failure(self):
        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_local_conn.return_value.__enter__.side_effect = Exception("Local DB error")

                result = sync_organizations_to_railway()

                assert result is False

    def test_sync_animals_to_railway_with_batch_size(self):
        # Create mock animals data
        mock_animals = []
        for i in range(150):  # More than default batch size of 100
            mock_animals.append(
                (
                    f"Animal{i}",
                    "Dog",
                    "Large",
                    2,
                    "Male",
                    "Black",
                    f"Description {i}",
                    "Available",
                    f"https://image{i}.jpg",
                    1,
                    datetime.now(),
                    datetime.now(),
                    "High",
                    datetime.now(),
                    0,
                    "status",
                    "{}",
                    "breed",
                )
            )

        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_cursor = MagicMock()
                mock_cursor.fetchall.return_value = mock_animals
                mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

                mock_railway_conn = MagicMock()
                mock_railway_session.return_value.__enter__.return_value = mock_railway_conn

                result = sync_animals_to_railway(batch_size=50)

                assert result is True
                # Should have 3 batches (50, 50, 50) = 150 animals
                assert mock_railway_conn.execute.call_count == 3

    def test_sync_animals_to_railway_failure(self):
        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_railway_session.return_value.__enter__.side_effect = Exception("Railway connection failed")

                result = sync_animals_to_railway()

                assert result is False

    def test_sync_all_data_to_railway_success(self):
        with patch("services.railway.sync.sync_organizations_to_railway") as mock_sync_orgs:
            with patch("services.railway.sync.sync_animals_to_railway") as mock_sync_animals:
                with patch("services.railway.sync.validate_sync_integrity") as mock_validate:
                    mock_sync_orgs.return_value = True
                    mock_sync_animals.return_value = True
                    mock_validate.return_value = True

                    result = sync_all_data_to_railway()

                    assert result is True
                    mock_sync_orgs.assert_called_once()
                    mock_sync_animals.assert_called_once()
                    mock_validate.assert_called_once()

    def test_sync_all_data_to_railway_org_failure(self):
        with patch("services.railway.sync.sync_organizations_to_railway") as mock_sync_orgs:
            mock_sync_orgs.return_value = False

            result = sync_all_data_to_railway()

            assert result is False

    def test_sync_all_data_to_railway_validation_failure(self):
        with patch("services.railway.sync.sync_organizations_to_railway") as mock_sync_orgs:
            with patch("services.railway.sync.sync_animals_to_railway") as mock_sync_animals:
                with patch("services.railway.sync.validate_sync_integrity") as mock_validate:
                    mock_sync_orgs.return_value = True
                    mock_sync_animals.return_value = True
                    mock_validate.return_value = False

                    result = sync_all_data_to_railway()

                    assert result is False

    def test_validate_sync_integrity_success(self):
        with patch("services.railway.sync.get_local_data_count") as mock_local:
            with patch("services.railway.sync.get_railway_data_count") as mock_railway:
                mock_local.side_effect = [5, 800]  # orgs, animals
                mock_railway.side_effect = [5, 800]

                result = validate_sync_integrity()

                assert result is True

    def test_validate_sync_integrity_mismatch(self):
        with patch("services.railway.sync.get_local_data_count") as mock_local:
            with patch("services.railway.sync.get_railway_data_count") as mock_railway:
                mock_local.side_effect = [5, 800]
                mock_railway.side_effect = [4, 750]  # Different counts

                result = validate_sync_integrity()

                assert result is False

    def test_railway_data_syncer_full_sync(self):
        with patch("services.railway.sync.check_railway_connection") as mock_check:
            with patch("services.railway.sync.sync_all_data_to_railway") as mock_sync:
                with patch("services.railway.sync.validate_sync_integrity") as mock_validate:
                    mock_check.return_value = True
                    mock_sync.return_value = True
                    mock_validate.return_value = True

                    syncer = RailwayDataSyncer()
                    result = syncer.perform_full_sync()

                    assert result is True
                    mock_check.assert_called_once()
                    mock_sync.assert_called_once()

    def test_railway_data_syncer_connection_failure(self):
        with patch("services.railway.sync.check_railway_connection") as mock_check:
            mock_check.return_value = False

            syncer = RailwayDataSyncer()
            result = syncer.perform_full_sync()

            assert result is False

    def test_railway_data_syncer_dry_run(self):
        with patch("services.railway.sync.check_railway_connection") as mock_check:
            with patch("services.railway.sync.get_local_data_count") as mock_local:
                with patch("services.railway.sync.get_railway_data_count") as mock_railway:
                    mock_check.return_value = True
                    mock_local.side_effect = [7, 850]
                    mock_railway.side_effect = [0, 0]

                    syncer = RailwayDataSyncer()
                    result = syncer.perform_full_sync(dry_run=True)

                    assert result is True
                    # Should not call actual sync functions in dry run
                    mock_local.assert_called()
                    mock_railway.assert_called()

    def test_railway_data_syncer_with_validation_skip(self):
        with patch("services.railway.sync.check_railway_connection") as mock_check:
            with patch("services.railway.sync.sync_all_data_to_railway") as mock_sync:
                mock_check.return_value = True
                mock_sync.return_value = True

                syncer = RailwayDataSyncer()
                result = syncer.perform_full_sync(validate_after=False)

                assert result is True


@pytest.mark.complex_setup
@pytest.mark.requires_migrations
class TestRailwayDataSyncIntegration:

    def test_data_sync_with_environment_variables(self):
        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("services.railway.sync.get_pooled_connection") as mock_local:
                with patch("services.railway.sync.railway_session") as mock_railway:
                    mock_cursor = MagicMock()
                    mock_cursor.fetchall.return_value = []
                    mock_local.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

                    mock_railway_session = MagicMock()
                    mock_railway.return_value.__enter__.return_value = mock_railway_session

                    result = sync_organizations_to_railway()

                    assert result is True

    def test_batch_sync_performance(self):
        # Test with large dataset to verify batching works
        large_dataset = [
            (f"Animal{i}", "Dog", "Large", 2, "Male", "Black", f"Desc {i}", "Available", f"img{i}.jpg", 1, datetime.now(), datetime.now(), "High", datetime.now(), 0, "status", "{}", "breed")
            for i in range(500)
        ]

        with patch("services.railway.sync.get_pooled_connection") as mock_local:
            with patch("services.railway.sync.railway_session") as mock_railway:
                mock_cursor = MagicMock()
                mock_cursor.fetchall.return_value = large_dataset
                mock_local.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

                mock_railway_conn = MagicMock()
                mock_railway.return_value.__enter__.return_value = mock_railway_conn

                result = sync_animals_to_railway(batch_size=100)

                assert result is True
                # Should have 5 batches (100 each) for 500 animals
                assert mock_railway_conn.execute.call_count == 5

    def test_error_recovery_and_rollback(self):
        with patch("services.railway.sync.get_pooled_connection") as mock_local:
            with patch("services.railway.sync.railway_session") as mock_railway:
                mock_cursor = MagicMock()
                mock_cursor.fetchall.return_value = [("Org1", "url", "desc", "US", "city", "logo", datetime.now(), "{}", "{}", "config")]
                mock_local.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

                # Simulate railway connection failure during execution
                mock_railway_conn = MagicMock()
                mock_railway_conn.execute.side_effect = Exception("Execution failed")
                mock_railway.return_value.__enter__.return_value = mock_railway_conn

                result = sync_organizations_to_railway()

                assert result is False

    def test_sync_validation_with_partial_failure(self):
        with patch("services.railway.sync.get_local_data_count") as mock_local:
            with patch("services.railway.sync.get_railway_data_count") as mock_railway:
                # Simulate partial sync - some data transferred but not all
                mock_local.side_effect = [5, 800]  # 5 orgs, 800 animals locally
                mock_railway.side_effect = [5, 650]  # 5 orgs, only 650 animals in Railway

                result = validate_sync_integrity()

                assert result is False

    def test_incremental_sync_detection(self):
        with patch("services.railway.sync.get_local_data_count") as mock_local:
            with patch("services.railway.sync.get_railway_data_count") as mock_railway:
                with patch("services.railway.sync.check_railway_connection") as mock_check:
                    mock_check.return_value = True
                    mock_local.side_effect = [7, 850]  # New data locally
                    mock_railway.side_effect = [7, 800]  # Existing data in Railway

                    syncer = RailwayDataSyncer()
                    result = syncer.perform_full_sync(dry_run=True)

                    assert result is True
                    # Dry run should detect differences without syncing
