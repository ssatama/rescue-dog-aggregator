import pytest


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestOrganizationsJSONParsing:
    """Test comprehensive JSON field parsing in organizations endpoints."""

    def test_organizations_list_basic_functionality(self, client):
        """Test that organizations list endpoint works and returns proper JSON structure."""
        response = client.get("/api/organizations")

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Test that each organization has the expected structure
        for org in data:
            assert "id" in org
            assert "name" in org
            assert "social_media" in org
            assert isinstance(org["social_media"], dict)  # Should be parsed as dict

    def test_organization_detail_json_structure(self, client):
        """Test organization detail endpoint JSON structure."""
        # Use the first organization from the test data
        response = client.get("/api/organizations")
        orgs = response.json()

        if len(orgs) > 0:
            org_id = orgs[0]["id"]
            detail_response = client.get(f"/api/organizations/{org_id}")

            assert detail_response.status_code == 200
            org = detail_response.json()

            # Verify structure
            assert "social_media" in org
            assert isinstance(org["social_media"], dict)

    def test_organization_not_found(self, client):
        """Test organization detail with non-existent ID."""
        response = client.get("/api/organizations/999999")
        assert response.status_code == 404
        assert "detail" in response.json()

    def test_organizations_social_media_parsing(self, client):
        """Test that social_media field is properly parsed from JSON."""
        response = client.get("/api/organizations")

        assert response.status_code == 200
        orgs = response.json()

        # Find an org with social media
        org_with_social = None
        for org in orgs:
            if org["social_media"]:  # Non-empty dict
                org_with_social = org
                break

        if org_with_social:
            # Verify it's parsed as dict, not string
            assert isinstance(org_with_social["social_media"], dict)
            # Should have at least some social media links
            assert len(org_with_social["social_media"]) > 0
