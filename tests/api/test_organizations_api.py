import pytest
from fastapi.testclient import TestClient

# TestClient fixture will be injected from tests/conftest.py


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
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
            # Endpoint should only return active ones
            assert org["active"] is True

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

    def test_get_organization_includes_social_media(self, client: TestClient):
        """Test that organization response includes social_media field."""
        # Use the test organization ID that should exist from conftest setup
        test_org_id = 901

        response = client.get(f"/api/organizations/{test_org_id}")
        assert response.status_code == 200

        organization = response.json()

        # Check that social_media field is present
        assert "social_media" in organization

        # Should be a dict (even if empty)
        assert isinstance(organization["social_media"], dict)

        # Check other expected fields are still there
        assert "id" in organization
        assert "name" in organization
        assert "website_url" in organization

    def test_get_organizations_list_includes_social_media(
            self, client: TestClient):
        """Test that organizations list response includes social_media field for each org."""
        response = client.get("/api/organizations")
        assert response.status_code == 200

        organizations = response.json()
        assert isinstance(organizations, list)
        assert len(organizations) > 0  # Should have at least our test org

        # Check that each organization has social_media field
        for org in organizations:
            assert "social_media" in org
            assert isinstance(org["social_media"], dict)

            # Check other expected fields are still there
            assert "id" in org
            assert "name" in org
            assert "active" in org
