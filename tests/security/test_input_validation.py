import os
import sys

import pytest

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
class TestSecurity:
    """Test security aspects of the application."""

    def test_sql_injection_prevention(self, client):
        """Test that SQL injection attempts are prevented."""
        malicious_inputs = [
            "'; DROP TABLE animals; --",
            "1 OR 1=1",
            "UNION SELECT * FROM users",
            "<script>alert('xss')</script>",
            "' UNION SELECT password FROM users --",
            "1'; DELETE FROM animals; --",
        ]

        for malicious_input in malicious_inputs:
            # Test search parameter
            response = client.get(f"/api/animals?search={malicious_input}")
            assert response.status_code in [
                200,
                422,
            ], f"Unexpected status for search input: {malicious_input}"

            # Test breed parameter
            response = client.get(f"/api/animals?standardized_breed={malicious_input}")
            assert response.status_code in [
                200,
                422,
            ], f"Unexpected status for breed input: {malicious_input}"

            # If response is 200, verify it returns valid JSON and doesn't
            # crash
            if response.status_code == 200:
                data = response.json()
                assert isinstance(data, list), "Response should be a list of animals"

    def test_parameter_limits(self, client):
        """Test that API parameters have reasonable limits."""
        # Test very large limit
        response = client.get("/api/animals?limit=10000")
        # Should either reject or cap at reasonable limit
        if response.status_code == 200:
            # If accepted, should cap at reasonable limit
            animals = response.json()
            assert len(animals) <= 1000, "Should cap at reasonable limit"
        else:
            assert response.status_code == 422, "Should reject with validation error"

        # Test negative values
        response = client.get("/api/animals?limit=-1")
        assert response.status_code == 422, "Should reject negative limit"

        response = client.get("/api/animals?offset=-1")
        assert response.status_code == 422, "Should reject negative offset"

    def test_cors_headers(self, client):
        """Test CORS configuration is reasonable."""
        response = client.options("/api/animals")
        # Should handle OPTIONS request without crashing
        assert response.status_code in [200, 405], "Should handle OPTIONS request"

    def test_no_sensitive_data_exposure(self, client):
        """Test that sensitive data is not exposed in API responses."""
        response = client.get("/api/animals?limit=1")

        if response.status_code == 200:
            data = response.json()
            if data:  # If there are animals
                animal = data[0]

                # Should not expose sensitive fields
                sensitive_fields = [
                    "password",
                    "api_key",
                    "secret",
                    "token",
                    "internal_id",
                    "created_by",
                    "modified_by",
                ]

                for field in sensitive_fields:
                    assert field not in animal, f"Should not expose {field} in API response"

    def test_input_length_limits(self, client):
        """Test that extremely long inputs are handled properly."""
        # Very long search string
        long_string = "a" * 10000
        response = client.get(f"/api/animals?search={long_string}")
        assert response.status_code in [
            200,
            422,
            414,
        ], "Should handle very long search strings"

        # Very long breed string
        response = client.get(f"/api/animals?standardized_breed={long_string}")
        assert response.status_code in [
            200,
            422,
            414,
        ], "Should handle very long breed strings"

    def test_special_characters_handling(self, client):
        """Test handling of special characters in parameters."""
        special_chars = [
            "%",
            "&",
            "=",
            "+",
            " ",
            "?",
            "#",
            "中文",
            "🐕",
            "café",
            "naïve",
        ]

        for char in special_chars:
            response = client.get(f"/api/animals?search={char}")
            assert response.status_code in [
                200,
                422,
            ], f"Should handle special character: {char}"

            if response.status_code == 200:
                # Should return valid JSON
                data = response.json()
                assert isinstance(data, list), "Should return valid JSON list"
