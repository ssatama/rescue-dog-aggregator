"""Critical tests for available-countries endpoint."""

from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from api.main import app


class TestAvailableCountriesEndpoint:
    """Test the available-countries endpoint which had no tests."""

    def test_available_countries_returns_list(self, client):
        """Test that endpoint returns list of countries with dog counts."""
        from api.dependencies import get_pooled_db_cursor

        # Create mock cursor
        mock_db_cursor = MagicMock()

        # Mock data from database
        mock_countries_data = [
            {"country": "UK", "total_dogs": 100},
            {"country": "DE", "total_dogs": 50},
            {"country": "US", "total_dogs": 25},
        ]

        def mock_get_cursor():
            yield mock_db_cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor

        try:
            mock_db_cursor.fetchall.return_value = mock_countries_data

            response = client.get("/api/dogs/available-countries")

            assert response.status_code == 200
            data = response.json()

            # Should return list of countries
            assert isinstance(data, list)
            assert len(data) == 3

            # Check first country format
            uk = data[0]
            assert uk["code"] == "UK"
            assert uk["name"] == "United Kingdom"
            assert uk["dogCount"] == 100

        finally:
            app.dependency_overrides.pop(get_pooled_db_cursor, None)

    def test_available_countries_handles_empty_database(self, client):
        """Test endpoint handles empty database gracefully."""
        from api.dependencies import get_pooled_db_cursor

        # Create mock cursor
        mock_db_cursor = MagicMock()

        def mock_get_cursor():
            yield mock_db_cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor

        try:
            mock_db_cursor.fetchall.return_value = []

            response = client.get("/api/dogs/available-countries")

            assert response.status_code == 200
            data = response.json()
            assert data == []

        finally:
            app.dependency_overrides.pop(get_pooled_db_cursor, None)

    def test_available_countries_database_error_handling(self, client):
        """Test that database errors are handled and sent to Sentry."""
        import psycopg2

        from api.dependencies import get_pooled_db_cursor

        # Create mock cursor
        mock_db_cursor = MagicMock()

        def mock_get_cursor():
            yield mock_db_cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor

        try:
            # Simulate database error
            mock_db_cursor.execute.side_effect = psycopg2.OperationalError("Connection lost")

            response = client.get("/api/dogs/available-countries")

            # Should return 500 with error message
            assert response.status_code == 500
            data = response.json()
            assert "Database error" in data["detail"]

        finally:
            app.dependency_overrides.pop(get_pooled_db_cursor, None)

    def test_available_countries_returns_correct_country_names(self, client):
        """Test that country codes are properly mapped to names."""
        from api.dependencies import get_pooled_db_cursor

        # Create mock cursor
        mock_db_cursor = MagicMock()

        # Test various country codes
        mock_countries_data = [
            {"country": "US", "total_dogs": 10},
            {"country": "GB", "total_dogs": 10},  # Should also map to UK
            {"country": "DE", "total_dogs": 10},
            {"country": "XX", "total_dogs": 10},  # Unknown country
        ]

        def mock_get_cursor():
            yield mock_db_cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor

        try:
            mock_db_cursor.fetchall.return_value = mock_countries_data

            response = client.get("/api/dogs/available-countries")

            assert response.status_code == 200
            data = response.json()

            # Check country name mappings
            country_map = {item["code"]: item["name"] for item in data}

            assert country_map["US"] == "United States"
            assert country_map["GB"] == "United Kingdom"
            assert country_map["DE"] == "Germany"
            assert country_map["XX"] == "XX"  # Unknown codes return as-is

        finally:
            app.dependency_overrides.pop(get_pooled_db_cursor, None)
