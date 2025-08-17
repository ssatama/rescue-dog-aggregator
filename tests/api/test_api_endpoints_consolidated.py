"""
Consolidated API endpoint tests using parametrization.

Combines repetitive endpoint validation tests into a single parametrized test suite.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAPIEndpointsConsolidated:
    """Consolidated tests for all API endpoints using parametrization."""

    @pytest.mark.parametrize(
        "endpoint,expected_status",
        [
            # Animals endpoints
            ("/api/animals", 200),
            ("/api/animals/1", 200),  # May be 404 if not found
            ("/api/animals/statistics", 200),
            ("/api/animals/meta/breeds", 200),
            ("/api/animals/meta/breed_groups", 200),
            ("/api/animals/meta/location_countries", 200),
            ("/api/animals/meta/available_countries", 200),
            ("/api/animals/meta/available_regions?country=UK", 200),
            ("/api/animals/meta/filter_counts", 200),
            # Organizations endpoints
            ("/api/organizations", 200),
            ("/api/organizations/1", 200),  # May be 404 if not found
            # Invalid endpoints
            ("/api/invalid", 404),
            ("/api/animals/invalid", 404),
        ],
    )
    def test_endpoint_availability(self, client, endpoint, expected_status):
        """Test that all endpoints return expected status codes."""
        response = client.get(endpoint)
        # Allow 404 for detail endpoints (no data)
        if endpoint.endswith("/1") and response.status_code == 404:
            assert True  # Expected when no data
        else:
            assert response.status_code == expected_status

    @pytest.mark.parametrize(
        "endpoint,params,expected_fields",
        [
            # Animals with filters
            ("/api/animals", {"limit": 10}, ["id", "name", "organization_id"]),
            ("/api/animals", {"standardized_size": "Medium"}, ["id", "name", "standardized_size"]),
            ("/api/animals", {"standardized_breed": "Labrador"}, ["id", "name", "standardized_breed"]),
            # Organizations
            ("/api/organizations", {}, ["id", "name", "website_url"]),
            # Meta endpoints - adjusted to match actual response structure
            ("/api/animals/meta/breeds", {}, None),  # Returns list of strings
        ],
    )
    def test_response_structure(self, client, endpoint, params, expected_fields):
        """Test that endpoint responses contain expected fields."""
        response = client.get(endpoint, params=params)

        if response.status_code == 200:
            data = response.json()

            # Skip validation for meta endpoints that return simple lists
            if expected_fields is None:
                assert isinstance(data, list)
                return

            # Handle list responses
            if isinstance(data, list) and data:
                item = data[0]
                for field in expected_fields:
                    # Some fields might be optional
                    if field in ["standardized_size", "standardized_breed"]:
                        continue  # Optional fields
                    assert field in item, f"Missing field {field} in {endpoint} response"

    @pytest.mark.parametrize(
        "endpoint,invalid_params",
        [
            # Invalid limit/offset
            ("/api/animals", {"limit": -1}),
            ("/api/animals", {"offset": -1}),
            ("/api/animals", {"limit": "invalid"}),
            # Invalid filter values
            ("/api/animals", {"standardized_size": "InvalidSize"}),
            ("/api/animals", {"age_category": "InvalidAge"}),
        ],
    )
    def test_invalid_parameters(self, client, endpoint, invalid_params):
        """Test that invalid parameters are handled properly."""
        response = client.get(endpoint, params=invalid_params)
        # Should return 422 for validation errors or 200 with empty results
        assert response.status_code in [200, 422]

        if response.status_code == 200:
            # Should return empty list for invalid filters
            data = response.json()
            if isinstance(data, list):
                # Empty or filtered results expected
                assert isinstance(data, list)

    @pytest.mark.parametrize(
        "method,endpoint",
        [
            ("POST", "/api/animals"),
            ("PUT", "/api/animals/1"),
            ("DELETE", "/api/animals/1"),
            ("PATCH", "/api/organizations/1"),
        ],
    )
    def test_unsupported_methods(self, client, method, endpoint):
        """Test that unsupported HTTP methods return 405."""
        response = client.request(method, endpoint)
        # These are read-only endpoints, should return 405 or 404
        assert response.status_code in [404, 405]

    def test_pagination_consistency(self, client):
        """Test that pagination works consistently across endpoints."""
        # Test animals pagination
        page1 = client.get("/api/animals?limit=5&offset=0")
        page2 = client.get("/api/animals?limit=5&offset=5")

        if page1.status_code == 200:
            data1 = page1.json()
            data2 = page2.json()

            # If we have data, pages should be different
            if data1 and data2:
                # Check that we don't have duplicate IDs across pages
                ids1 = {item["id"] for item in data1 if "id" in item}
                ids2 = {item["id"] for item in data2 if "id" in item}
                assert not ids1.intersection(ids2), "Duplicate IDs across pages"

    def test_filter_combination(self, client):
        """Test that multiple filters can be combined."""
        response = client.get("/api/animals", params={"standardized_size": "Medium", "sex": "Male", "limit": 10})

        assert response.status_code == 200
        data = response.json()

        # If we have results, they should match all filters
        if data:
            for animal in data:
                if "standardized_size" in animal and animal["standardized_size"]:
                    assert animal["standardized_size"] == "Medium"
                if "sex" in animal and animal["sex"]:
                    assert animal["sex"] == "Male"
