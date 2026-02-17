import urllib.parse

import pytest


@pytest.mark.slow
@pytest.mark.database
class TestOrganizationSlugLookup:
    def test_nonexistent_slug_returns_404(self, client):
        response = client.get("/api/organizations/this-slug-does-not-exist")
        assert response.status_code == 404

    def test_known_slug_returns_200(self, client):
        response = client.get("/api/organizations/mock-test-org")
        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "mock-test-org"
        assert data["name"] == "Mock Test Org"
        assert data["id"] == 901

    def test_slug_with_special_characters_returns_404(self, client):
        response = client.get("/api/organizations/org-with-%C3%A9-accent")
        assert response.status_code == 404

    def test_empty_slug_does_not_match_list_endpoint(self, client):
        response = client.get("/api/organizations/")
        assert response.status_code == 200
        assert isinstance(response.json(), list)


@pytest.mark.slow
@pytest.mark.database
class TestOrganizationSearchFiltering:
    def test_search_with_sql_percent_wildcard(self, client):
        encoded = urllib.parse.quote("%")
        response = client.get(f"/api/organizations/?search={encoded}")
        assert response.status_code == 200
        data = response.json()
        assert data == [], "Literal '%' search should not match any org names"

    def test_search_with_sql_underscore_wildcard(self, client):
        encoded = urllib.parse.quote("_")
        response = client.get(f"/api/organizations/?search={encoded}")
        assert response.status_code == 200
        data = response.json()
        assert data == [], "Literal '_' search should not match any org names"

    def test_search_with_combined_sql_wildcards(self, client):
        encoded = urllib.parse.quote("%__%")
        response = client.get(f"/api/organizations/?search={encoded}")
        assert response.status_code == 200
        data = response.json()
        assert data == [], "Combined SQL wildcards should not match any org names"

    def test_search_with_backslash(self, client):
        encoded = urllib.parse.quote("\\")
        response = client.get(f"/api/organizations/?search={encoded}")
        assert response.status_code == 200
        data = response.json()
        assert data == [], "Backslash search should not match any org names"

    def test_search_matching_org_name(self, client):
        response = client.get("/api/organizations/?search=Mock")
        assert response.status_code == 200
        orgs = response.json()
        assert len(orgs) >= 1
        assert any(o["name"] == "Mock Test Org" for o in orgs)

    def test_search_no_results(self, client):
        response = client.get("/api/organizations/?search=zzzznonexistent")
        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.slow
@pytest.mark.database
class TestOrganizationListValidation:
    def test_org_list_contains_test_org(self, client):
        response = client.get("/api/organizations/")
        assert response.status_code == 200
        orgs = response.json()
        assert len(orgs) >= 1
        test_org = next((o for o in orgs if o["id"] == 901), None)
        assert test_org is not None
        assert test_org["slug"] == "mock-test-org"
        assert test_org["name"] == "Mock Test Org"

    def test_org_list_pagination_offset_beyond_data(self, client):
        response = client.get("/api/organizations/?offset=9999")
        assert response.status_code == 200
        assert response.json() == []

    def test_org_list_limit_one(self, client):
        response = client.get("/api/organizations/?limit=1")
        assert response.status_code == 200
        orgs = response.json()
        assert len(orgs) == 1


@pytest.mark.slow
@pytest.mark.database
class TestOrganizationRecentDogsEdgeCases:
    def test_recent_dogs_returns_list(self, client):
        response = client.get("/api/organizations/901/recent-dogs")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_recent_dogs_default_limit_is_three(self, client):
        response = client.get("/api/organizations/901/recent-dogs")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 3

    def test_recent_dogs_each_has_thumbnail(self, client):
        response = client.get("/api/organizations/901/recent-dogs")
        assert response.status_code == 200
        data = response.json()
        for dog in data:
            assert "thumbnail_url" in dog
            assert dog["thumbnail_url"] is not None


@pytest.mark.slow
@pytest.mark.database
class TestOrganizationStatisticsEdgeCases:
    def test_statistics_values_are_numeric(self, client):
        response = client.get("/api/organizations/901/statistics")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["total_dogs"], int)
        assert isinstance(data["new_this_week"], int)
        assert isinstance(data["new_this_month"], int)

    def test_statistics_total_dogs_matches_test_data(self, client):
        response = client.get("/api/organizations/901/statistics")
        assert response.status_code == 200
        data = response.json()
        assert data["total_dogs"] == 12

    def test_statistics_new_this_month_includes_all_recent(self, client):
        response = client.get("/api/organizations/901/statistics")
        assert response.status_code == 200
        data = response.json()
        assert data["new_this_week"] <= data["new_this_month"]
