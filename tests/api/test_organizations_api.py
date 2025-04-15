import pytest
from fastapi.testclient import TestClient

# Import the FastAPI app (adjust path if necessary)
# Assuming conftest.py adds the project root to sys.path
from api.main import app

# TestClient fixture will be injected from tests/conftest.py


class TestOrganizationsAPI:

    def test_get_organizations_success(self, client: TestClient):
        """Test GET /api/organizations returns a list successfully."""
        response = client.get("/api/organizations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Check if the test organization (ID 901) is in the list
        assert any(org["id"] == 901 for org in data)
        # Check structure of the first organization if list is not empty
        if data:
            org = data[0]
            assert "id" in org
            assert "name" in org
            assert "website_url" in org
            assert "active" in org
            assert org["active"] is True  # Endpoint should only return active ones

    def test_get_organization_by_id_success(self, client: TestClient):
        """Test GET /api/organizations/{id} for an existing organization."""
        test_org_id = 901  # ID inserted by conftest.py
        response = client.get(f"/api/organizations/{test_org_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)
        assert data["id"] == test_org_id
        assert data["name"] == "Test Organization"  # Name from conftest.py
        assert "website_url" in data
        assert "active" in data
