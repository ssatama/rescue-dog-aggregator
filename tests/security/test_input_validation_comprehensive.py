import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestInputValidationComprehensive:
    """Test comprehensive input validation across all endpoints."""

    def test_animals_endpoint_sql_injection_prevention(self, client):
        """Test that animals endpoint prevents SQL injection."""
        # Test various SQL injection attempts
        injection_attempts = [
            "'; DROP TABLE animals; --",
            "1' OR '1'='1",
            "' UNION SELECT * FROM organizations --",
        ]

        for injection in injection_attempts:
            # Test in search parameter
            response = client.get(f"/api/animals?search={injection}")
            # Should not crash and should return safe response
            assert response.status_code in [
                200,
                422,
            ]  # 422 for validation error is acceptable

            # Test in breed parameter
            response = client.get(f"/api/animals?breed={injection}")
            assert response.status_code in [200, 422]

    def test_parameter_validation_limits(self, client):
        """Test that parameter validation enforces proper limits."""
        # Test limit parameter validation
        response = client.get("/api/animals?limit=0")
        assert response.status_code == 422  # Should reject invalid limit

        response = client.get("/api/animals?limit=20000")
        assert response.status_code == 422  # Should reject excessive limit

        response = client.get("/api/animals?limit=50")
        assert response.status_code == 200  # Should accept valid limit

        # Test offset parameter validation
        response = client.get("/api/animals?offset=-1")
        assert response.status_code == 422  # Should reject negative offset

        response = client.get("/api/animals?offset=0")
        assert response.status_code == 200  # Should accept valid offset

    def test_numeric_parameter_type_validation(self, client):
        """Test slug-based URL validation."""
        # Test invalid organization slug
        response = client.get("/api/organizations/not_a_number")
        assert response.status_code == 404  # Should return not found for invalid slug

        # Test invalid animal slug
        response = client.get("/api/animals/not_a_number")
        assert response.status_code == 404  # Should return not found for invalid slug

        # Test valid numeric IDs
        response = client.get("/api/organizations/1")
        assert response.status_code in [200, 404]  # Either found or not found

        response = client.get("/api/animals/1")
        assert response.status_code in [200, 404]  # Either found or not found

    def test_search_parameter_handling(self, client):
        """Test search parameter validation and handling."""
        # Test empty search
        response = client.get("/api/animals?search=")
        assert response.status_code == 200

        # Test normal search
        response = client.get("/api/animals?search=dog")
        assert response.status_code == 200

        # Test very long search string
        long_search = "a" * 1000
        response = client.get(f"/api/animals?search={long_search}")
        assert response.status_code in [200, 422]  # Should handle gracefully
