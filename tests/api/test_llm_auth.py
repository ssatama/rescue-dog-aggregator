"""
Test suite for LLM endpoint authentication.

Verifies that all /api/llm/* endpoints require ADMIN_API_KEY via X-API-Key header.
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

    def test_enrich_requires_auth(self, client):
        response = client.post(
            "/api/llm/enrich",
            json={"animal_id": 1, "processing_type": "description_cleaning"},
        )
        assert response.status_code == 401

    def test_batch_enrich_requires_auth(self, client):
        response = client.post(
            "/api/llm/batch-enrich",
            json={"animal_ids": [1], "processing_type": "description_cleaning"},
        )
        assert response.status_code == 401

    def test_translate_requires_auth(self, client):
        response = client.post(
            "/api/llm/translate",
            json={"text": "hello", "target_language": "es"},
        )
        assert response.status_code == 401

    def test_stats_requires_auth(self, client):
        response = client.get("/api/llm/stats")
        assert response.status_code == 401

    def test_clean_description_requires_auth(self, client):
        response = client.post("/api/llm/clean-description?text=hello")
        assert response.status_code == 401

    def test_wrong_key_rejected(self, client):
        response = client.post(
            "/api/llm/enrich",
            json={"animal_id": 1, "processing_type": "description_cleaning"},
            headers={"X-API-Key": "wrong-key"},
        )
        assert response.status_code == 401

    def test_valid_key_passes_auth(self, authed_client):
        """With valid key, auth passes and request reaches validation logic."""
        response = authed_client.post(
            "/api/llm/enrich",
            json={"animal_id": -1, "processing_type": "description_cleaning"},
        )
        assert response.status_code == 400

    def test_error_message_does_not_leak_key(self, client):
        response = client.post("/api/llm/enrich", json={"animal_id": 1})
        detail = response.json().get("detail", "").lower()
        assert ADMIN_KEY not in detail
        assert "admin_api_key" not in detail
