import pytest


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAPIResponseConsistency:
    """Test that all API endpoints return consistent response formats."""

    def test_all_endpoints_return_json_content_type(self, client):
        """Test that all endpoints return proper JSON content type."""
        endpoints = [
            "/api/animals",
            "/api/organizations",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert "application/json" in response.headers.get("content-type", "")

    def test_error_responses_have_consistent_format(self, client):
        """Test that error responses follow consistent format."""
        # Test 404 responses
        response = client.get("/api/animals/999999")
        assert response.status_code == 404
        error_data = response.json()
        assert "detail" in error_data
        assert isinstance(error_data["detail"], str)

        response = client.get("/api/organizations/999999")
        assert response.status_code == 404
        error_data = response.json()
        assert "detail" in error_data
        assert isinstance(error_data["detail"], str)

    def test_success_responses_have_expected_structure(self, client):
        """Test that successful responses have expected structure."""
        # Test organizations list
        response = client.get("/api/organizations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Test animals list
        response = client.get("/api/animals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
