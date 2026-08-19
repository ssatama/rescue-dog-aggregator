"""
Test suite for LLM endpoint authentication.

Verifies that all /api/llm/* endpoints require ADMIN_API_KEY via X-API-Key
header. Auth is enforced by a router-level dependency, so exercising the
surviving endpoint covers every route mounted on the router.
"""

import os
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from api.main import app

ADMIN_KEY = "test-secret-key"


@pytest.mark.unit
class TestLLMEndpointAuth:
    """Tests that LLM endpoints reject unauthenticated requests."""

    @pytest.fixture(autouse=True)
    def _set_admin_key(self):
        with patch.dict(os.environ, {"ADMIN_API_KEY": ADMIN_KEY}):
            yield

    @pytest.fixture
    def client(self):
        return TestClient(app, raise_server_exceptions=False)

    @pytest.fixture
    def authed_client(self):
        client = TestClient(app, raise_server_exceptions=False)
        client.headers["X-API-Key"] = ADMIN_KEY
        return client

    def test_stats_requires_auth(self, client):
        response = client.get("/api/llm/stats")
        assert response.status_code == 401

    def test_wrong_key_rejected(self, client):
        response = client.get("/api/llm/stats", headers={"X-API-Key": "wrong-key"})
        assert response.status_code == 401

    def test_valid_key_passes_auth(self, authed_client):
        """A valid key clears the auth gate and the request reaches the handler.

        The status past that point depends on database availability, which this
        test is not about - only that it is no longer an auth rejection.
        """
        response = authed_client.get("/api/llm/stats")
        assert response.status_code not in (401, 403)

    def test_error_message_does_not_leak_key(self, client):
        response = client.get("/api/llm/stats")
        detail = response.json().get("detail", "").lower()
        assert ADMIN_KEY not in detail
        assert "admin_api_key" not in detail

    def test_missing_admin_key_returns_500(self):
        with patch.dict(os.environ, {}, clear=True):
            bare_client = TestClient(app, raise_server_exceptions=False)
            response = bare_client.get("/api/llm/stats")
        assert response.status_code == 500
        assert "Admin API key not configured" in response.json()["detail"]

    @pytest.mark.parametrize(
        "method,path",
        [
            ("post", "/api/llm/enrich"),
            ("post", "/api/llm/batch-enrich"),
            ("post", "/api/llm/translate"),
            ("post", "/api/llm/clean-description"),
        ],
    )
    def test_removed_enrichment_endpoints_are_gone(self, authed_client, method, path):
        """These endpoints constructed an LLM client the API service has no key for."""
        response = getattr(authed_client, method)(path, json={})
        assert response.status_code == 404
