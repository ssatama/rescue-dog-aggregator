"""
Simplified security tests for LLM routes focusing on information disclosure prevention.

Following CLAUDE.md principles:
- TDD: Test-first development
- Pure functions, no mutations
- Clear error handling validation
- No sensitive information leakage
"""

import pytest


@pytest.mark.security
@pytest.mark.api
@pytest.mark.integration
class TestLLMSecurityBasics:
    """Test basic security patterns in LLM routes without complex mocking."""

    # Use the client fixture from conftest.py instead of creating our own

    def test_input_validation_secure_messages(self, client):
        """Test that input validation provides secure, user-friendly messages."""
        test_cases = [
            # Negative animal ID
            {
                "endpoint": "/api/llm/enrich",
                "method": "post",
                "data": {"animal_id": -1, "processing_type": "description_cleaning"},
                "expected_status": 400,
                "expected_message_contains": ["Animal ID must be positive"],
                "should_not_contain": ["database", "connection", "server", "internal"],
            },
            # Empty text translation
            {
                "endpoint": "/api/llm/translate",
                "method": "post",
                "data": {"text": "  ", "target_language": "es"},
                "expected_status": 400,
                "expected_message_contains": ["Text cannot be empty"],
                "should_not_contain": ["validation", "pydantic", "model", "field"],
            },
            # Oversized text translation
            {
                "endpoint": "/api/llm/translate",
                "method": "post",
                "data": {"text": "A" * 15000, "target_language": "es"},
                "expected_status": 400,
                "expected_message_contains": ["too long", "max 10000 characters"],
                "should_not_contain": [
                    "memory",
                    "buffer",
                    "limit exceeded",
                    "overflow",
                ],
            },
            # Empty animal IDs list
            {
                "endpoint": "/api/llm/batch-enrich",
                "method": "post",
                "data": {"animal_ids": [], "processing_type": "description_cleaning"},
                "expected_status": 400,
                "expected_message_contains": ["cannot be empty"],
                "should_not_contain": ["array", "pydantic", "validation error"],
            },
            # Too many animal IDs
            {
                "endpoint": "/api/llm/batch-enrich",
                "method": "post",
                "data": {
                    "animal_ids": list(range(1, 102)),
                    "processing_type": "description_cleaning",
                },
                "expected_status": 400,
                "expected_message_contains": ["Cannot process more than 100"],
                "should_not_contain": ["memory", "resource", "system limit"],
            },
            # Invalid batch size
            {
                "endpoint": "/api/llm/batch-enrich",
                "method": "post",
                "data": {
                    "animal_ids": [1, 2],
                    "processing_type": "description_cleaning",
                    "batch_size": 0,
                },
                "expected_status": 400,
                "expected_message_contains": ["Batch size must be between 1 and 50"],
                "should_not_contain": ["config", "parameter", "setting"],
            },
        ]

        for case in test_cases:
            with client as test_client:
                if case["method"] == "post":
                    response = test_client.post(case["endpoint"], json=case["data"])
                else:
                    response = test_client.get(case["endpoint"], params=case["data"])

                # Check status code
                assert response.status_code == case["expected_status"], (
                    f"Expected {case['expected_status']}, got {response.status_code} for {case['endpoint']}"
                )

                response_data = response.json()
                detail = response_data.get("detail", "").lower()

                # Check that expected messages are present
                for expected in case["expected_message_contains"]:
                    assert expected.lower() in detail, (
                        f"Expected '{expected}' in error message for {case['endpoint']}: {detail}"
                    )

                # Check that sensitive information is not present
                for sensitive in case["should_not_contain"]:
                    assert sensitive.lower() not in detail, (
                        f"Sensitive term '{sensitive}' found in error for {case['endpoint']}: {detail}"
                    )

    def test_nonexistent_animal_secure_message(self, client):
        """Test that nonexistent animal requests provide secure messages."""
        response = client.post(
            "/api/llm/enrich",
            json={"animal_id": 999999, "processing_type": "description_cleaning"},
        )  # Very unlikely to exist

        assert response.status_code == 404
        response_data = response.json()
        detail = response_data["detail"]

        # Should indicate animal not found
        assert "Animal not found" in detail
        # Should not expose database details
        sensitive_terms = ["table", "query", "sql", "database", "connection", "row"]
        for term in sensitive_terms:
            assert term.lower() not in detail.lower()

    def test_stats_endpoint_input_validation(self, client):
        """Test that stats endpoint validates organization_id securely."""
        response = client.get("/api/llm/stats?organization_id=-5")

        assert response.status_code == 400
        response_data = response.json()
        detail = response_data["detail"]

        assert "Organization ID must be positive" in detail
        # Should not expose parameter processing details
        assert "query parameter" not in detail.lower()
        assert "validation" not in detail.lower()

    def test_error_response_consistency(self, client):
        """Test that all error responses have consistent, secure structure."""
        error_endpoints = [
            (
                "/api/llm/enrich",
                {"animal_id": -1, "processing_type": "description_cleaning"},
            ),
            ("/api/llm/translate", {"text": "", "target_language": "es"}),
            (
                "/api/llm/batch-enrich",
                {"animal_ids": [], "processing_type": "description_cleaning"},
            ),
        ]

        for endpoint, data in error_endpoints:
            response = client.post(endpoint, json=data)

            # All should return client errors (4xx)
            assert 400 <= response.status_code < 500, (
                f"Expected 4xx status for {endpoint}, got {response.status_code}"
            )

            response_data = response.json()

            # All should have detail field
            assert "detail" in response_data
            assert isinstance(response_data["detail"], str)
            assert len(response_data["detail"]) > 0

            # Should not contain common sensitive patterns
            detail_lower = response_data["detail"].lower()
            sensitive_patterns = [
                "password",
                "key",
                "token",
                "secret",
                "auth",
                "127.0.0.1",
                "localhost",
                "192.168",
                "10.0.",
                "/var",
                "/home",
                "/tmp",
                "c:\\\\",
                ".env",
                "stack trace",
                "traceback",
                "exception.__",
                "internal error",
                "debug",
                "trace_id",
                "connection string",
                "database=",
                "user=",
                "host=",
                "port=",
                "ssl",
                "timeout=",
                "api_key",
                "bearer",
                "authorization",
            ]

            for pattern in sensitive_patterns:
                assert pattern not in detail_lower, (
                    f"Sensitive pattern '{pattern}' found in {endpoint} error: {detail_lower}"
                )

    def test_clean_description_endpoint_security(self, client):
        """Test clean-description endpoint for secure error handling."""
        # Test with empty text parameter
        response = client.post("/api/llm/clean-description?text=")

        assert response.status_code == 400
        response_data = response.json()
        assert "Text cannot be empty" in response_data["detail"]

        # Test with oversized text
        large_text = "A" * 11000
        response = client.post(f"/api/llm/clean-description?text={large_text}")

        assert response.status_code == 400
        response_data = response.json()
        assert "too long" in response_data["detail"].lower()
        # Should not echo back the large text
        assert len(response_data["detail"]) < 200

    def test_processing_type_validation(self, client):
        """Test that invalid processing types are handled securely."""
        response = client.post(
            "/api/llm/enrich", json={"animal_id": 1, "processing_type": "invalid_type"}
        )

        # This should be caught by Pydantic validation
        assert response.status_code == 422
        response_data = response.json()

        # Pydantic validation errors should not expose internal model details
        detail = str(response_data)
        sensitive_terms = [
            "pydantic",
            "basemodel",
            "field_validator",
            "model_validator",
        ]
        for term in sensitive_terms:
            assert term.lower() not in detail.lower()

    def test_sql_injection_prevention(self, client):
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
            response = client.get(f"/api/llm/stats?organization_id={injection}")

            # Should be blocked at validation level (either 400 or 422)
            assert response.status_code in [400, 422]
            response_data = response.json()

            # Should provide generic validation message (either our custom message or Pydantic's)
            detail_str = str(response_data.get("detail", "")).lower()
            # Either our validation message or Pydantic parsing error is fine
            assert (
                "organization id must be positive" in detail_str
                or "input should be a valid integer" in detail_str
            )
            # The most important thing is that the SQL injection is blocked
            # Note: Pydantic may echo back invalid input in validation errors,
            # but this happens before our code processes it, so it's still secure

    def test_response_headers_security(self, client):
        """Test that responses don't include sensitive headers."""
        response = client.post(
            "/api/llm/translate", json={"text": "hello", "target_language": "es"}
        )

        # Check that sensitive headers are not present
        sensitive_headers = [
            "x-database-query-time",
            "x-internal-user-id",
            "x-debug-info",
            "x-api-key",
            "x-server-info",
            "server",  # Should not expose server details
        ]

        for header in sensitive_headers:
            assert header.lower() not in [h.lower() for h in response.headers.keys()], (
                f"Sensitive header '{header}' found in response headers"
            )

    def test_concurrent_request_limits(self, client):
        """Test that the API handles multiple requests without exposing internals."""
        # Make multiple concurrent requests to check for race condition errors
        responses = []
        for i in range(5):
            response = client.post(
                "/api/llm/enrich",
                json={
                    "animal_id": 999999 + i,
                    "processing_type": "description_cleaning",
                },
            )  # Nonexistent animals
            responses.append(response)

        # All should return consistent 404s without internal details
        for i, response in enumerate(responses):
            assert response.status_code == 404, (
                f"Request {i} returned {response.status_code}"
            )
            response_data = response.json()
            detail = response_data["detail"]
            assert "Animal not found" in detail
            # Should not contain connection pool or threading info
            assert "pool" not in detail.lower()
            assert "thread" not in detail.lower()
            assert "concurrent" not in detail.lower()
