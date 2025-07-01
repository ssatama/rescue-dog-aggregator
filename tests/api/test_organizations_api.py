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

    def test_get_organizations_list_includes_social_media(self, client: TestClient):
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

    def test_organizations_api_consistency_with_statistics(self, client: TestClient):
        """Test that organizations API returns consistent service_regions data with statistics API."""
        # Test against live API since test database doesn't have PIT
        import requests

        try:
            # Get data from organizations API
            org_response = requests.get("http://localhost:8000/api/organizations")
            if org_response.status_code != 200:
                pytest.skip("Live API not available for consistency test")

            organizations = org_response.json()

            # Get data from statistics API
            stats_response = requests.get("http://localhost:8000/api/animals/statistics")
            if stats_response.status_code != 200:
                pytest.skip("Statistics API not available for consistency test")

            stats_data = stats_response.json()

            if "organizations" not in stats_data:
                pytest.skip("No organizations in statistics response")

            # Compare service_regions for each organization
            org_lookup = {org["name"]: org["service_regions"] for org in organizations}
            stats_lookup = {org["name"]: org["service_regions"] for org in stats_data["organizations"]}

            # Check that PIT specifically shows only Turkey
            if "Pets in Turkey" in org_lookup:
                pit_regions = org_lookup["Pets in Turkey"]
                assert pit_regions == ["TR"], f"PIT should only show Turkey, got {pit_regions}"

                # Verify consistency between APIs
                if "Pets in Turkey" in stats_lookup:
                    stats_pit_regions = stats_lookup["Pets in Turkey"]
                    assert pit_regions == stats_pit_regions, f"API inconsistency: orgs={pit_regions}, stats={stats_pit_regions}"

        except requests.RequestException:
            pytest.skip("Could not connect to live API for consistency test")
