from unittest.mock import MagicMock, patch

import psycopg2
import pytest

from api.dependencies import get_pooled_db_cursor
from api.main import app


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
class TestDatabaseErrorHandling:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def test_animal_detail_not_found(self, client):
        """Test animal detail endpoint handles not found gracefully."""
        response = client.get("/api/animals/999999")

        assert response.status_code == 404
        assert response.json()["detail"] == "Animal not found"

    def test_organization_detail_not_found(self, client):
        """Test organization detail endpoint handles not found gracefully."""
        response = client.get("/api/organizations/999999")

        assert response.status_code == 404
        assert response.json()["detail"] == "Organization not found"

    def test_invalid_animal_id_type(self, client):
        """Test invalid animal slug handling."""
        response = client.get("/api/animals/not_a_number")

        assert response.status_code == 404  # Not found (slug-based routing)

    def test_invalid_organization_id_type(self, client):
        """Test invalid organization slug handling."""
        response = client.get("/api/organizations/not_a_number")

        assert response.status_code == 404  # Not found (slug-based routing)

    def test_animals_endpoint_success(self, client):
        """Test animals endpoint works with test database."""
        response = client.get("/api/animals")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_organizations_endpoint_success(self, client):
        """Test organizations endpoint works with test database."""
        response = client.get("/api/organizations")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestDatabaseQueryErrors:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def test_get_animals_database_query_error(self, client):
        """Test animals endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_pooled_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/animals")
                assert response.status_code == 500
                error_detail = response.json()["detail"]
                assert "Failed to fetch animals" in error_detail
            finally:
                app.dependency_overrides.clear()

    def test_get_animal_detail_database_query_error(self, client):
        """Test animal detail endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Detail query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_pooled_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/animals/1")
                assert response.status_code == 500
                assert "Failed to fetch animal 1" in response.json()["detail"]
            finally:
                app.dependency_overrides.clear()

    def test_get_animals_statistics_database_query_error(self, client):
        """Test animals statistics endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Statistics query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_pooled_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/animals/statistics")
                assert response.status_code == 500
                assert "Failed to fetch statistics" in response.json()["detail"]
            finally:
                app.dependency_overrides.clear()

    def test_get_animals_random_database_query_error(self, client):
        """Test random animals endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Random query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_pooled_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/animals/random")
                assert response.status_code == 500
                assert "Database error" in response.json()["detail"]
            finally:
                app.dependency_overrides.clear()

    def test_get_distinct_breeds_database_query_error(self, client):
        """Test distinct breeds endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Breeds query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_pooled_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/animals/meta/breeds")
                assert response.status_code == 500
                assert "Failed to fetch breed list" in response.json()["detail"]
            finally:
                app.dependency_overrides.clear()

    def test_get_distinct_breed_groups_database_query_error(self, client):
        """Test distinct breed groups endpoint handles database query errors gracefully."""

        def mock_db_cursor_query_error():
            mock_cursor = MagicMock()
            mock_cursor.execute.side_effect = psycopg2.Error("Breed groups query failed")
            yield mock_cursor

        with patch.object(app, "dependency_overrides", {}):
            app.dependency_overrides[get_pooled_db_cursor] = mock_db_cursor_query_error

            try:
                response = client.get("/api/animals/meta/breed_groups")
                assert response.status_code == 500
                assert "Failed to fetch breed group list" in response.json()["detail"]
            finally:
                app.dependency_overrides.clear()
