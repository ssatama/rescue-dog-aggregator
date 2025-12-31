"""
Comprehensive test suite for api/routes/organizations.py critical gaps

Tests missing endpoints, JSON parsing, error handling, and edge cases.
"""

from unittest.mock import MagicMock, patch

import psycopg2
import pytest

from api.dependencies import get_db_cursor
from api.main import app


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestOrganizationsJSONParsing:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def test_organizations_social_media_invalid_json(self, client):
        """Test organizations endpoint handles invalid social_media JSON gracefully."""

        def mock_db_cursor_invalid_social_media():
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = [
                {
                    "id": 1,
                    "name": "Test Org",
                    "slug": "test-org",
                    "website_url": "http://example.com",
                    "description": "Test description",
                    "country": "Test Country",
                    "city": "Test City",
                    "logo_url": None,
                    "social_media": "{invalid json}",  # Invalid JSON
                    "active": True,
                    "created_at": "2023-01-01T00:00:00",
                    "updated_at": "2023-01-01T00:00:00",
                    "ships_to": None,
                    "established_year": 2020,
                    "service_regions": None,
                    "total_dogs": 5,
                    "new_this_week": 2,
                }
            ]
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_invalid_social_media

            try:
                response = client.get("/api/organizations/")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 1
                # Should handle invalid JSON gracefully, likely keeping as string
                assert "social_media" in data[0]
            finally:
                app.dependency_overrides.clear()

    def test_organizations_ships_to_invalid_json(self, client):
        """Test organizations endpoint handles invalid ships_to JSON gracefully."""

        def mock_db_cursor_invalid_ships_to():
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = [
                {
                    "id": 1,
                    "name": "Test Org",
                    "slug": "test-org",
                    "website_url": "http://example.com",
                    "description": "Test description",
                    "country": "Test Country",
                    "city": "Test City",
                    "logo_url": None,
                    "social_media": None,
                    "active": True,
                    "created_at": "2023-01-01T00:00:00",
                    "updated_at": "2023-01-01T00:00:00",
                    "ships_to": "{invalid json}",  # Invalid JSON
                    "established_year": 2020,
                    "service_regions": None,
                    "total_dogs": 5,
                    "new_this_week": 2,
                }
            ]
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_invalid_ships_to

            try:
                response = client.get("/api/organizations/")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 1
                # Should handle invalid JSON gracefully
                assert "ships_to" in data[0]
            finally:
                app.dependency_overrides.clear()

    def test_organizations_service_regions_invalid_json(self, client):
        """Test organizations endpoint handles invalid service_regions JSON gracefully."""

        def mock_db_cursor_invalid_service_regions():
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = [
                {
                    "id": 1,
                    "name": "Test Org",
                    "slug": "test-org",
                    "website_url": "http://example.com",
                    "description": "Test description",
                    "country": "Test Country",
                    "city": "Test City",
                    "logo_url": None,
                    "social_media": None,
                    "active": True,
                    "created_at": "2023-01-01T00:00:00",
                    "updated_at": "2023-01-01T00:00:00",
                    "ships_to": None,
                    "established_year": 2020,
                    "service_regions": "{invalid json}",  # Invalid JSON
                    "total_dogs": 5,
                    "new_this_week": 2,
                }
            ]
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_invalid_service_regions

            try:
                response = client.get("/api/organizations/")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 1
                # Should handle invalid JSON gracefully
                assert "service_regions" in data[0]
            finally:
                app.dependency_overrides.clear()

    def test_organizations_all_json_fields_valid(self, client):
        """Test organizations endpoint with valid JSON in all fields."""

        def mock_db_cursor_valid_json():
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = [
                {
                    "id": 1,
                    "name": "Test Org",
                    "slug": "test-org",
                    "website_url": "http://example.com",
                    "description": "Test description",
                    "country": "Test Country",
                    "city": "Test City",
                    "logo_url": None,
                    "social_media": '{"facebook": "https://facebook.com/testorg"}',
                    "active": True,
                    "created_at": "2023-01-01T00:00:00",
                    "updated_at": "2023-01-01T00:00:00",
                    "ships_to": '["USA", "Canada"]',
                    "established_year": 2020,
                    "service_regions": '["North America"]',
                    "total_dogs": 5,
                    "new_this_week": 2,
                }
            ]
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_valid_json

            try:
                response = client.get("/api/organizations/")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 1

                org = data[0]
                # Verify JSON fields were parsed correctly
                assert org["social_media"] == {"facebook": "https://facebook.com/testorg"}
                assert org["ships_to"] == ["USA", "Canada"]
                assert org["service_regions"] == ["North America"]
            finally:
                app.dependency_overrides.clear()


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestOrganizationsDatabaseErrors:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def test_get_organizations_database_error(self, client):
        """Test organizations endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/organizations/")
                assert response.status_code == 500
                error_detail = response.json()["detail"]
                assert "Database error" in error_detail
            finally:
                app.dependency_overrides.clear()

    def test_get_organization_detail_database_error(self, client):
        """Test organization detail endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Detail query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/organizations/1")
                assert response.status_code == 500
                error_detail = response.json()["detail"]
                assert "Database error" in error_detail
            finally:
                app.dependency_overrides.clear()

    def test_get_organization_recent_dogs_database_error(self, client):
        """Test organization recent dogs endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Recent dogs query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/organizations/1/recent-dogs")
                assert response.status_code == 500
                error_detail = response.json()["detail"]
                assert "Database error" in error_detail
            finally:
                app.dependency_overrides.clear()

    def test_get_organization_statistics_database_error(self, client):
        """Test organization statistics endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Statistics query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/organizations/1/statistics")
                assert response.status_code == 500
                error_detail = response.json()["detail"]
                assert "Database error" in error_detail
            finally:
                app.dependency_overrides.clear()


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestOrganizationRecentDogsEndpoint:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def test_organization_recent_dogs_success(self, client):
        """Test successful retrieval of organization recent dogs."""

        def mock_db_cursor_recent_dogs():
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = [
                {
                    "id": 1,
                    "name": "Recent Dog 1",
                    "primary_image_url": "http://example.com/dog1.jpg",
                    "breed": "Labrador",
                    "age_text": "2 years",
                    "sex": "Male",
                    "created_at": "2023-12-01T00:00:00",
                },
                {
                    "id": 2,
                    "name": "Recent Dog 2",
                    "primary_image_url": "http://cloudinary.com/image.jpg",
                    "breed": "German Shepherd",
                    "age_text": "3 years",
                    "sex": "Female",
                    "created_at": "2023-12-02T00:00:00",
                },
            ]
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_recent_dogs

            try:
                response = client.get("/api/organizations/1/recent-dogs")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 2

                # Verify structure
                assert data[0]["name"] == "Recent Dog 1"
                assert data[1]["name"] == "Recent Dog 2"
                assert "primary_image_url" in data[0]
                assert "breed" in data[0]
            finally:
                app.dependency_overrides.clear()

    def test_organization_recent_dogs_with_limit(self, client):
        """Test recent dogs endpoint with limit parameter."""

        def mock_db_cursor_recent_dogs_limit():
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = [
                {
                    "id": 1,
                    "name": "Recent Dog 1",
                    "primary_image_url": "http://example.com/dog1.jpg",
                    "breed": "Labrador",
                    "age_text": "2 years",
                    "sex": "Male",
                    "created_at": "2023-12-01T00:00:00",
                }
            ]
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_recent_dogs_limit

            try:
                response = client.get("/api/organizations/1/recent-dogs?limit=1")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 1
            finally:
                app.dependency_overrides.clear()

    def test_organization_recent_dogs_no_dogs(self, client):
        """Test recent dogs endpoint when organization has no recent dogs."""

        def mock_db_cursor_no_recent_dogs():
            mock_cursor = MagicMock()
            mock_cursor.fetchall.return_value = []
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_no_recent_dogs

            try:
                response = client.get("/api/organizations/1/recent-dogs")
                assert response.status_code == 200
                data = response.json()
                assert isinstance(data, list)
                assert len(data) == 0
            finally:
                app.dependency_overrides.clear()

    def test_organization_recent_dogs_invalid_limit(self, client):
        """Test recent dogs endpoint with invalid limit values."""
        # Test negative limit - should cause database error
        response = client.get("/api/organizations/1/recent-dogs?limit=-1")
        assert response.status_code == 500  # Database error for negative limit

        # Test zero limit - should work but return empty results
        response = client.get("/api/organizations/1/recent-dogs?limit=0")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

        # Test very large limit - should work, database will limit results
        response = client.get("/api/organizations/1/recent-dogs?limit=1000")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestOrganizationStatisticsEndpoint:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def test_organization_statistics_success(self, client):
        """Test successful retrieval of organization statistics."""

        def mock_db_cursor_statistics():
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = {
                "total_dogs": 25,
                "available_dogs": 20,
                "adopted_this_month": 5,
                "new_this_week": 3,
                "avg_days_to_adoption": 30.5,
            }
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_statistics

            try:
                response = client.get("/api/organizations/1/statistics")
                assert response.status_code == 200
                data = response.json()

                # Verify structure and content
                assert data["total_dogs"] == 25
                assert data["available_dogs"] == 20
                assert data["adopted_this_month"] == 5
                assert data["new_this_week"] == 3
                assert data["avg_days_to_adoption"] == 30.5
            finally:
                app.dependency_overrides.clear()

    def test_organization_statistics_no_data(self, client):
        """Test statistics endpoint when organization has no data."""

        def mock_db_cursor_no_statistics():
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = {
                "total_dogs": 0,
                "available_dogs": 0,
                "adopted_this_month": 0,
                "new_this_week": 0,
                "avg_days_to_adoption": None,
            }
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_no_statistics

            try:
                response = client.get("/api/organizations/1/statistics")
                assert response.status_code == 200
                data = response.json()

                # Should handle zero values gracefully
                assert data["total_dogs"] == 0
                assert data["available_dogs"] == 0
                assert data["adopted_this_month"] == 0
                assert data["new_this_week"] == 0
                assert data["avg_days_to_adoption"] is None
            finally:
                app.dependency_overrides.clear()

    def test_organization_statistics_nonexistent_org(self, client):
        """Test statistics endpoint for nonexistent organization."""

        def mock_db_cursor_no_org():
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = None
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_no_org

            try:
                response = client.get("/api/organizations/999999/statistics")
                assert response.status_code == 200
                data = response.json()
                # Should return empty stats when no data found
                assert data == {
                    "total_dogs": 0,
                    "new_this_week": 0,
                    "new_this_month": 0,
                }
            finally:
                app.dependency_overrides.clear()


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestOrganizationDetailEdgeCases:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def test_organization_detail_json_parsing_all_fields(self, client):
        """Test organization detail with JSON parsing for all fields."""

        def mock_db_cursor_detail_json():
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = {
                "id": 1,
                "name": "Test Org",
                "slug": "test-org",
                "website_url": "http://example.com",
                "description": "Test description",
                "country": "Test Country",
                "city": "Test City",
                "logo_url": None,
                "social_media": '{"facebook": "https://facebook.com/testorg", "instagram": "https://instagram.com/testorg"}',
                "active": True,
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00",
                "ships_to": '["USA", "Canada", "Mexico"]',
                "established_year": 2020,
                "service_regions": '["North America", "Central America"]',
                "total_dogs": 15,
                "new_this_week": 4,
            }
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_detail_json

            try:
                response = client.get("/api/organizations/1")
                assert response.status_code == 200
                data = response.json()

                # Verify all JSON fields were parsed correctly
                assert data["social_media"] == {
                    "facebook": "https://facebook.com/testorg",
                    "instagram": "https://instagram.com/testorg",
                }
                assert data["ships_to"] == ["USA", "Canada", "Mexico"]
                assert data["service_regions"] == ["North America", "Central America"]
            finally:
                app.dependency_overrides.clear()

    def test_organization_detail_mixed_json_validity(self, client):
        """Test organization detail with mix of valid and invalid JSON."""

        def mock_db_cursor_mixed_json():
            mock_cursor = MagicMock()
            mock_cursor.fetchone.return_value = {
                "id": 1,
                "name": "Test Org",
                "slug": "test-org",
                "website_url": "http://example.com",
                "description": "Test description",
                "country": "Test Country",
                "city": "Test City",
                "logo_url": None,
                "social_media": '{"valid": "json"}',  # Valid JSON
                "active": True,
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00",
                "ships_to": "{invalid json}",  # Invalid JSON
                "established_year": 2020,
                "service_regions": '["valid", "json", "array"]',  # Valid JSON
                "total_dogs": 15,
                "new_this_week": 4,
            }
            mock_cursor.execute.return_value = None
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_db_cursor] = mock_db_cursor_mixed_json

            try:
                response = client.get("/api/organizations/1")
                assert response.status_code == 200
                data = response.json()

                # Valid JSON should be parsed
                assert data["social_media"] == {"valid": "json"}
                assert data["service_regions"] == ["valid", "json", "array"]
                # Invalid JSON should be handled gracefully
                assert "ships_to" in data
            finally:
                app.dependency_overrides.clear()
