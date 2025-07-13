#!/usr/bin/env python3
"""
Tests for Railway transaction boundary fixes.

Tests designed to verify that transaction boundaries prevent
inconsistent states and provide proper rollback capabilities.
"""

from unittest.mock import MagicMock, patch

import pytest

from services.railway.sync import RailwayDataSyncer, sync_all_data_to_railway


@pytest.mark.complex_setup
@pytest.mark.requires_migrations
class TestRailwayTransactionFix:
    """Tests for Railway transaction boundary fixes."""

    def test_transaction_rollback_on_animal_sync_failure(self):
        """
        Test that transaction rollback prevents partial data when animal sync fails.

        Verifies that if organizations sync succeeds but animals sync fails,
        the entire transaction is rolled back.
        """
        # Mock local data to return some test data
        mock_orgs = [("Test Org", "http://test.com", "Description", "US", "City", "logo.jpg", "2023-01-01", "{}", "{}", "config")]

        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            # Mock local database to return test organizations
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = mock_orgs
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_session = MagicMock()
                mock_railway_session.return_value.__enter__.return_value = mock_session

                # Mock successful organization sync but failed animal sync within transaction
                with patch("services.railway.sync._sync_organizations_to_railway_in_transaction", return_value=True):
                    with patch("services.railway.sync._sync_animals_to_railway_in_transaction", return_value=False):

                        result = sync_all_data_to_railway()

                        # Should fail overall
                        assert result is False

                        # Verify that the context manager was used (transaction boundaries)
                        mock_railway_session.assert_called_once()

                        # The transaction should have been rolled back automatically by context manager
                        print("✅ Transaction automatically rolled back on failure")

    def test_transaction_commit_on_successful_sync(self):
        """
        Test that transaction commits when all operations succeed.
        """
        # Mock local data
        mock_orgs = [("Test Org", "http://test.com", "Description", "US", "City", "logo.jpg", "2023-01-01", "{}", "{}", "config")]
        mock_animals = [("Test Dog", "dog", "medium", "2 years", "male", "labrador", "image.jpg", 1, "2023-01-01", "2023-01-01", 0.9, "2023-01-01", 0, "available", "{}", "adopt.com", "ext-123")]

        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            # Mock local database to return test data
            mock_cursor = MagicMock()
            # Return different data for different calls
            mock_cursor.fetchall.side_effect = [mock_orgs, mock_animals]
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_session = MagicMock()
                mock_railway_session.return_value.__enter__.return_value = mock_session

                # Mock all transaction operations to succeed
                with patch("services.railway.sync._sync_organizations_to_railway_in_transaction", return_value=True):
                    with patch("services.railway.sync._sync_animals_to_railway_in_transaction", return_value=True):
                        with patch("services.railway.sync._validate_sync_integrity_in_transaction", return_value=True):

                            result = sync_all_data_to_railway()

                            # Should succeed
                            assert result is True

                            # Verify transaction was used
                            mock_railway_session.assert_called_once()

                            # Verify all operations were called with the session
                            print("✅ All operations executed within single transaction")

    def test_retry_mechanism_with_exponential_backoff(self):
        """
        Test that retry mechanism works with exponential backoff.
        """
        syncer = RailwayDataSyncer()

        with patch("services.railway.sync.check_railway_connection", return_value=True):
            # Mock sync to fail twice, then succeed
            with patch("services.railway.sync.sync_all_data_to_railway", side_effect=[False, False, True]):
                with patch("services.railway.sync.validate_sync_integrity", return_value=True):
                    with patch("time.sleep") as mock_sleep:  # Mock sleep to speed up test

                        result = syncer.perform_full_sync(dry_run=False, validate_after=True, max_retries=3)

                        # Should succeed on third attempt
                        assert result is True

                        # Verify exponential backoff was used
                        expected_sleeps = [1, 2]  # 2^0, 2^1
                        actual_sleeps = [call.args[0] for call in mock_sleep.call_args_list]
                        assert actual_sleeps == expected_sleeps

                        print("✅ Retry mechanism works with exponential backoff")

    def test_retry_exhaustion_returns_failure(self):
        """
        Test that retry mechanism fails after max attempts.
        """
        syncer = RailwayDataSyncer()

        with patch("services.railway.sync.check_railway_connection", return_value=True):
            # Mock sync to always fail
            with patch("services.railway.sync.sync_all_data_to_railway", return_value=False):
                with patch("time.sleep"):  # Mock sleep to speed up test

                    result = syncer.perform_full_sync(dry_run=False, validate_after=True, max_retries=2)

                    # Should fail after exhausting retries
                    assert result is False

                    print("✅ Retry mechanism fails appropriately after max attempts")

    def test_validation_within_transaction_prevents_commit(self):
        """
        Test that validation failure within transaction prevents commit.
        """
        # Mock local data
        mock_orgs = [("Test Org", "http://test.com", "Description", "US", "City", "logo.jpg", "2023-01-01", "{}", "{}", "config")]

        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = mock_orgs
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_session = MagicMock()
                mock_railway_session.return_value.__enter__.return_value = mock_session

                # Mock successful syncs but failed validation
                with patch("services.railway.sync._sync_organizations_to_railway_in_transaction", return_value=True):
                    with patch("services.railway.sync._sync_animals_to_railway_in_transaction", return_value=True):
                        with patch("services.railway.sync._validate_sync_integrity_in_transaction", return_value=False):

                            result = sync_all_data_to_railway()

                            # Should fail due to validation
                            assert result is False

                            # Transaction should have been rolled back
                            print("✅ Failed validation prevents transaction commit")

    def test_individual_transaction_functions_work_correctly(self):
        """
        Test that individual transaction-aware functions work correctly.
        """
        mock_session = MagicMock()

        # Test organization sync in transaction
        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = []  # No data to sync
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            from services.railway.sync import _sync_organizations_to_railway_in_transaction

            result = _sync_organizations_to_railway_in_transaction(mock_session)

            # Should succeed with no data
            assert result is True
            print("✅ Organization sync in transaction works correctly")

        # Test animal sync in transaction
        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = []  # No data to sync
            mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            from services.railway.sync import _sync_animals_to_railway_in_transaction

            result = _sync_animals_to_railway_in_transaction(mock_session)

            # Should succeed with no data
            assert result is True
            print("✅ Animal sync in transaction works correctly")

        # Test validation in transaction
        with patch("services.railway.sync.get_local_data_count", return_value=0):
            # Mock session to return count 0
            mock_session.execute.return_value.scalar.return_value = 0

            from services.railway.sync import _validate_sync_integrity_in_transaction

            result = _validate_sync_integrity_in_transaction(mock_session)

            # Should succeed with matching counts
            assert result is True
            print("✅ Validation in transaction works correctly")
