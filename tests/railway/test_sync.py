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
    RailwayDataSyncer,
    get_local_data_count,
    get_railway_data_count,
    sync_organizations_to_railway,
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
