"""
Test health check and monitoring authentication endpoints.

Extracted from test_monitoring_endpoints.py — only the tests with real value.
"""

import pytest


@pytest.mark.slow
@pytest.mark.database
class TestHealthCheckEndpoint:
    """Test basic health check functionality."""

    def test_health_check_endpoint_exists(self, client):
        """Test that health check endpoint is accessible."""
        response = client.get("/health")
        assert response.status_code == 200

    def test_health_check_response_format(self, client):
        """Test health check response includes required fields."""
        response = client.get("/health")
        data = response.json()

        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
        assert "database" in data

        assert data["status"] in ["healthy", "degraded", "unhealthy"]

    def test_health_check_database_status(self, client):
        """Test health check includes database connectivity status."""
        response = client.get("/health")
        data = response.json()

        db_status = data["database"]
        assert "status" in db_status
        assert "response_time_ms" in db_status
        assert db_status["status"] in ["connected", "error"]

    def test_health_check_head_method(self, client):
        """Test HEAD method works for uptime monitoring services like UptimeRobot."""
        response = client.head("/health")
        assert response.status_code == 200
        assert response.content == b""


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.requires_migrations
class TestMonitoringAuthentication:
    """Test that monitoring endpoints have appropriate security."""

    def test_monitoring_endpoints_require_authentication(self, api_client_no_auth):
        """Test that all monitoring endpoints require admin API key."""
        protected_endpoints = [
            "/api/monitoring/scrapers",
            "/api/monitoring/failures",
            "/api/monitoring/performance",
            "/api/monitoring/alerts/config",
            "/api/monitoring/alerts/active",
        ]

        for endpoint in protected_endpoints:
            response = api_client_no_auth.get(endpoint)
            assert response.status_code in [401, 500]

    def test_health_check_is_public(self, api_client_no_auth):
        """Test that basic health check doesn't require auth."""
        response = api_client_no_auth.get("/health")
        assert response.status_code == 200
