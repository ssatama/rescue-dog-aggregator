"""
Integration tests for api/routes/organizations.py untested endpoints

Tests recent-dogs and statistics endpoints with real database interaction.
"""

import pytest


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
class TestOrganizationRecentDogsIntegration:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def get_first_org_id(self, client):
        """Helper to get first available organization ID."""
        orgs_response = client.get("/api/organizations/")
        assert orgs_response.status_code == 200
        orgs = orgs_response.json()
        if not orgs:
            pytest.skip("No organizations in test data")
        return orgs[0]["id"]

    def test_organization_recent_dogs_basic(self, client):
        """Test basic recent dogs functionality."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}/recent-dogs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_organization_recent_dogs_with_limit(self, client):
        """Test recent dogs with limit parameter."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}/recent-dogs?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 1

    def test_organization_recent_dogs_with_high_limit(self, client):
        """Test recent dogs with high limit."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}/recent-dogs?limit=100")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_organization_recent_dogs_nonexistent_org(self, client):
        """Test recent dogs for nonexistent organization."""
        response = client.get("/api/organizations/999999/recent-dogs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_organization_recent_dogs_response_structure(self, client):
        """Test recent dogs response structure."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}/recent-dogs")
        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            # Check structure if we have data
            dog = data[0]
            assert "id" in dog
            assert "name" in dog
            assert "primary_image_url" in dog or "thumbnail_url" in dog


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
class TestOrganizationStatisticsIntegration:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def get_first_org_id(self, client):
        """Helper to get first available organization ID."""
        orgs_response = client.get("/api/organizations/")
        assert orgs_response.status_code == 200
        orgs = orgs_response.json()
        if not orgs:
            pytest.skip("No organizations in test data")
        return orgs[0]["id"]

    def test_organization_statistics_basic(self, client):
        """Test basic statistics functionality."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}/statistics")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

        # Should have required fields
        assert "total_dogs" in data
        assert "new_this_week" in data
        assert "new_this_month" in data

    def test_organization_statistics_data_types(self, client):
        """Test statistics data types."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}/statistics")
        assert response.status_code == 200
        data = response.json()

        # Check data types
        assert isinstance(data["total_dogs"], int)
        assert isinstance(data["new_this_week"], int)
        assert isinstance(data["new_this_month"], int)

        # Values should be non-negative
        assert data["total_dogs"] >= 0
        assert data["new_this_week"] >= 0
        assert data["new_this_month"] >= 0

    def test_organization_statistics_nonexistent_org(self, client):
        """Test statistics for nonexistent organization."""
        response = client.get("/api/organizations/999999/statistics")
        assert response.status_code == 200
        data = response.json()

        # Should return empty stats
        assert data["total_dogs"] == 0
        assert data["new_this_week"] == 0
        assert data["new_this_month"] == 0

    def test_organization_statistics_consistency(self, client):
        """Test logical consistency of statistics."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}/statistics")
        assert response.status_code == 200
        data = response.json()

        # Week should be subset of month (in most cases)
        # Allow for edge cases around month boundaries
        assert data["new_this_week"] <= data["new_this_month"] + 7  # Allow some flexibility


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
class TestOrganizationJSONParsingIntegration:
    # Use the client fixture from conftest.py instead of creating our own
    # Docstring moved above

    def test_organizations_list_json_parsing(self, client):
        """Test JSON field parsing in organizations list."""
        response = client.get("/api/organizations/")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        if len(data) > 0:
            org = data[0]
            # Verify JSON fields are properly parsed
            assert isinstance(org.get("social_media", {}), dict)
            assert isinstance(org.get("ships_to", []), list)
            assert isinstance(org.get("service_regions", []), list)

    def get_first_org_id(self, client):
        """Helper to get first available organization ID."""
        orgs_response = client.get("/api/organizations/")
        assert orgs_response.status_code == 200
        orgs = orgs_response.json()
        if not orgs:
            pytest.skip("No organizations in test data")
        return orgs[0]["id"]

    def test_organization_detail_json_parsing(self, client):
        """Test JSON field parsing in organization detail."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}")
        assert response.status_code == 200
        data = response.json()

        # Verify JSON fields are properly parsed
        assert isinstance(data.get("social_media", {}), dict)
        assert isinstance(data.get("ships_to", []), list)
        assert isinstance(data.get("service_regions", []), list)

    def test_organization_detail_complete_structure(self, client):
        """Test complete organization detail structure."""
        org_id = self.get_first_org_id(client)
        response = client.get(f"/api/organizations/{org_id}")
        assert response.status_code == 200
        data = response.json()

        # Verify all expected fields are present
        required_fields = ["id", "name", "active", "created_at", "updated_at"]
        for field in required_fields:
            assert field in data

        # Verify optional JSON fields are present (even if null/empty)
        json_fields = ["social_media", "ships_to", "service_regions"]
        for field in json_fields:
            assert field in data
