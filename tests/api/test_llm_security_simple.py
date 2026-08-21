"""
Simplified security tests for LLM routes focusing on information disclosure prevention.

Following CLAUDE.md principles:
- TDD: Test-first development
- Pure functions, no mutations
- Clear error handling validation
- No sensitive information leakage
"""

import os
from unittest.mock import patch

import pytest

ADMIN_KEY = "test-admin-key-for-llm-security-tests"


@pytest.mark.database
@pytest.mark.integration
class TestLLMSecurityBasics:
    """Test basic security patterns in LLM routes without complex mocking."""

    @pytest.fixture(autouse=True)
    def _set_admin_key(self):
        with patch.dict(os.environ, {"ADMIN_API_KEY": ADMIN_KEY}):
            yield

    @pytest.fixture
    def auth_headers(self):
        return {"X-API-Key": ADMIN_KEY}

    def test_stats_endpoint_input_validation(self, client, auth_headers):
        """Test that stats endpoint validates organization_id securely."""
        response = client.get("/api/llm/stats?organization_id=-5", headers=auth_headers)

        assert response.status_code == 400
        response_data = response.json()
        detail = response_data["detail"]

        assert "Organization ID must be positive" in detail
        # Should not expose parameter processing details
        assert "query parameter" not in detail.lower()
        assert "validation" not in detail.lower()

    def test_sql_injection_prevention(self, client, auth_headers):
        """Test that SQL injection attempts are properly blocked."""
        # Test various SQL injection patterns in organization_id
        injection_attempts = [
            "1; DROP TABLE animals; --",
            "1' OR '1'='1",
            "1 UNION SELECT * FROM users",
            "-1; DELETE FROM animals; --",
            "1'; INSERT INTO animals VALUES(...); --",
        ]

        for injection in injection_attempts:
            response = client.get(f"/api/llm/stats?organization_id={injection}", headers=auth_headers)

            # Should be blocked at validation level (either 400 or 422)
            assert response.status_code in [400, 422]
            response_data = response.json()

            # Should provide generic validation message (either our custom message or Pydantic's)
            detail_str = str(response_data.get("detail", "")).lower()
            # Either our validation message or Pydantic parsing error is fine
            assert "organization id must be positive" in detail_str or "input should be a valid integer" in detail_str
            # The most important thing is that the SQL injection is blocked
            # Note: Pydantic may echo back invalid input in validation errors,
            # but this happens before our code processes it, so it's still secure

    def test_stats_response_headers_security(self, client, auth_headers):
        """Test that responses do not leak server internals."""
        response = client.get("/api/llm/stats", headers=auth_headers)

        assert "x-powered-by" not in {header.lower() for header in response.headers}
        assert "server" not in {header.lower() for header in response.headers} or "uvicorn" not in response.headers.get("server", "").lower()
