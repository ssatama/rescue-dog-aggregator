import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestDatabaseErrorHandling:
    """Test database error handling with integration tests."""

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
        """Test invalid animal ID type handling."""
        response = client.get("/api/animals/not_a_number")

        assert response.status_code == 422  # Validation error

    def test_invalid_organization_id_type(self, client):
        """Test invalid organization ID type handling."""
        response = client.get("/api/organizations/not_a_number")

        assert response.status_code == 422  # Validation error

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
