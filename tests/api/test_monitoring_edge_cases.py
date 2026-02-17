import os
from unittest.mock import patch

import pytest

ADMIN_KEY = "test-admin-key-for-monitoring"


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.requires_migrations
class TestMonitoringAuthRequirements:
    PROTECTED_ENDPOINTS = [
        "/api/monitoring/scrapers",
        "/api/monitoring/failures",
        "/api/monitoring/performance",
        "/api/monitoring/alerts/config",
        "/api/monitoring/alerts/active",
        "/api/monitoring/scrapers/901",
    ]

    @pytest.mark.parametrize("endpoint", PROTECTED_ENDPOINTS)
    def test_no_auth_rejected(self, api_client_no_auth, endpoint):
        with patch.dict(os.environ, {"ADMIN_API_KEY": ADMIN_KEY}):
            response = api_client_no_auth.get(endpoint)
        assert response.status_code == 401, f"{endpoint} returned {response.status_code}, expected 401"

    @pytest.mark.parametrize("endpoint", PROTECTED_ENDPOINTS)
    def test_invalid_api_key_rejected(self, api_client_no_auth, endpoint):
        with patch.dict(os.environ, {"ADMIN_API_KEY": ADMIN_KEY}):
            response = api_client_no_auth.get(endpoint, headers={"X-API-Key": "completely-wrong-key"})
        assert response.status_code == 401, f"{endpoint} returned {response.status_code} with invalid key"


@pytest.mark.slow
@pytest.mark.database
class TestHealthCheckPublicAccess:
    def test_health_accessible_without_auth(self, api_client_no_auth):
        response = api_client_no_auth.get("/health")
        assert response.status_code == 200

    def test_health_response_time_is_numeric(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        db_status = data["database"]
        assert db_status["status"] == "connected", "Database should be connected in test environment"
        assert isinstance(db_status["response_time_ms"], (int, float))
        assert db_status["response_time_ms"] >= 0

    def test_health_status_is_valid_enum(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] in ["healthy", "degraded", "unhealthy"]

    def test_health_head_returns_empty_body(self, client):
        response = client.head("/health")
        assert response.status_code == 200
        assert response.content == b""

    def test_health_includes_version(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "version" in data
        assert isinstance(data["version"], str)

    def test_health_includes_timestamp(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "timestamp" in data
        assert data["timestamp"] is not None
