#!/usr/bin/env python3
"""
Essential Railway sync tests - streamlined for core functionality only.

Focused on testing the most critical sync operations with fast unit tests.
"""
import os
from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from services.railway.sync import (
    SAFETY_THRESHOLDS,
    RailwayDataSyncer,
    SyncMode,
    get_local_data_count,
    get_railway_data_count,
    sync_organizations_to_railway,
    validate_sync_by_mode,
)


@pytest.mark.unit
class TestRailwayDataSyncEssential:
    """Essential Railway sync functionality tests."""

    def test_get_local_data_count_success(self):
        """Test local data counting works correctly."""
        with patch("services.railway.sync.get_pooled_connection") as mock_conn:
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = (5,)
            mock_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

            count = get_local_data_count("organizations")

            assert count == 5
            mock_cursor.execute.assert_called_with("SELECT COUNT(*) FROM organizations")

    def test_get_local_data_count_invalid_table(self):
        """Test invalid table returns 0."""
        count = get_local_data_count("invalid_table")
        assert count == 0

    def test_get_railway_data_count_success(self):
        """Test Railway data counting works correctly."""
        with patch("services.railway.sync.railway_session") as mock_session:
            mock_result = MagicMock()
            mock_result.scalar.return_value = 10
            mock_session.return_value.__enter__.return_value.execute.return_value = mock_result

            count = get_railway_data_count("organizations")

            assert count == 10

    def test_sync_organizations_to_railway_success(self):
        """Test organization sync works with minimal data."""
        mock_orgs = [
            # All 20 columns: id, name, website_url, description, country, city, logo_url, active, created_at, updated_at, social_media, config_id, last_config_sync, established_year, ships_to, service_regions, total_dogs, new_this_week, recent_dogs, slug
            (
                1,
                "Test Org",
                "https://test.com",
                "Test Description",
                "US",
                "Test City",
                "logo.png",
                True,
                datetime.now(),
                datetime.now(),
                "{}",
                "test-org",
                datetime.now(),
                2020,
                "{}",
                "{}",
                100,
                5,
                "{}",
                "test-org-slug",
            ),
        ]

        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_cursor = MagicMock()
                # Mock fetchmany to return data once, then empty to end loop
                mock_cursor.fetchmany.side_effect = [mock_orgs, []]
                mock_local_conn.return_value.__enter__.return_value.cursor.return_value.__enter__.return_value = mock_cursor

                mock_railway_conn = MagicMock()
                mock_railway_session.return_value.__enter__.return_value = mock_railway_conn

                result = sync_organizations_to_railway()

                assert result is True

    def test_sync_organizations_to_railway_failure(self):
        """Test organization sync handles failures gracefully."""
        with patch("services.railway.sync.get_pooled_connection") as mock_local_conn:
            with patch("services.railway.sync.railway_session") as mock_railway_session:
                mock_local_conn.return_value.__enter__.side_effect = Exception("Local DB error")

                result = sync_organizations_to_railway()

                assert result is False

    def test_railway_data_syncer_connection_failure(self):
        """Test syncer handles connection failures."""
        with patch("services.railway.sync.check_railway_connection") as mock_check:
            mock_check.return_value = False

            syncer = RailwayDataSyncer()
            result = syncer.perform_full_sync()

            assert result is False


@pytest.mark.unit
class TestSyncModeValidation:
    """Test sync mode validation functionality."""

    def test_sync_mode_enum_exists(self):
        """Test SyncMode enum has expected values."""
        assert SyncMode.INCREMENTAL.value == "incremental"
        assert SyncMode.REBUILD.value == "rebuild"
        assert SyncMode.FORCE.value == "force"

    def test_safety_thresholds_exist(self):
        """Test SAFETY_THRESHOLDS configuration exists."""
        assert SAFETY_THRESHOLDS["organizations"] >= 1
        assert SAFETY_THRESHOLDS["animals"] >= 10
        assert SAFETY_THRESHOLDS["scrape_logs"] >= 1
        assert SAFETY_THRESHOLDS["service_regions"] >= 0
        assert SAFETY_THRESHOLDS["animal_images"] >= 0

    def test_validate_sync_by_mode_incremental(self):
        """Test incremental mode validation."""
        # Local count >= Railway count should pass
        assert validate_sync_by_mode(SyncMode.INCREMENTAL, "animals", 100, 90) is True
        assert validate_sync_by_mode(SyncMode.INCREMENTAL, "animals", 100, 100) is True

        # Local count < Railway count should fail
        assert validate_sync_by_mode(SyncMode.INCREMENTAL, "animals", 90, 100) is False

    def test_validate_sync_by_mode_rebuild(self):
        """Test rebuild mode validation."""
        # Should pass if local count meets safety threshold
        assert validate_sync_by_mode(SyncMode.REBUILD, "organizations", 10, 100) is True
        assert validate_sync_by_mode(SyncMode.REBUILD, "animals", 50, 500) is True

        # Should fail if local count below safety threshold
        assert validate_sync_by_mode(SyncMode.REBUILD, "organizations", 2, 100) is False
        assert validate_sync_by_mode(SyncMode.REBUILD, "animals", 5, 500) is False

    def test_validate_sync_by_mode_force(self):
        """Test force mode validation."""
        # Force mode should always pass
        assert validate_sync_by_mode(SyncMode.FORCE, "animals", 0, 100) is True
        assert validate_sync_by_mode(SyncMode.FORCE, "animals", 100, 0) is True

    def test_validate_sync_by_mode_invalid_table(self):
        """Test validation with invalid table name."""
        assert validate_sync_by_mode(SyncMode.INCREMENTAL, "invalid_table", 10, 10) is False


@pytest.mark.unit
class TestRailwayDataSyncerModes:
    """Test RailwayDataSyncer with sync modes."""

    def test_sync_mode_validation_methods_exist(self):
        """Test that sync mode validation methods exist."""
        syncer = RailwayDataSyncer()
        assert hasattr(syncer, "_validate_sync_mode")
        assert hasattr(syncer, "_clear_railway_tables")

    def test_invalid_sync_mode_returns_false(self):
        """Test that invalid sync mode returns False."""
        with patch("services.railway.sync.check_railway_connection") as mock_check:
            mock_check.return_value = True

            syncer = RailwayDataSyncer()
            result = syncer.perform_full_sync(sync_mode="invalid_mode")

            assert result is False
