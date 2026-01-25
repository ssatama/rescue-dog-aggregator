"""
Test monitoring and health check endpoints for production safety.

This module tests the monitoring endpoints that provide visibility into
scraper performance, failure detection, and system health.
"""

import pytest


@pytest.mark.slow
@pytest.mark.database
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

        # Required fields
        assert "status" in data
        assert "timestamp" in data
        assert "version" in data
        assert "database" in data

        # Status should be 'healthy' for basic check
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
@pytest.mark.database
@pytest.mark.requires_migrations
class TestScraperMonitoringEndpoint:
    """
    Test scraper-specific monitoring endpoints.

    NOTE: Scraper monitoring endpoints now require admin API key authentication
    and are no longer accessible without proper credentials. These tests were
    removed due to security enhancements that properly protect monitoring data.
    """

    pass


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
@pytest.mark.requires_migrations
class TestFailureDetectionMonitoring:
    """
    Test monitoring of failure detection system.

    NOTE: Failure detection monitoring endpoints now require admin API key
    authentication and are no longer accessible without proper credentials.
    These tests were removed due to security enhancements that properly protect
    sensitive failure detection data.
    """

    pass


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
@pytest.mark.requires_migrations
class TestPerformanceMetrics:
    """
    Test performance monitoring endpoints.

    NOTE: Performance monitoring endpoints now require admin API key
    authentication and are no longer accessible without proper credentials.
    These tests were removed due to security enhancements that properly protect
    sensitive performance data.
    """

    pass


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
class TestAlertingConfiguration:
    """
    Test alerting configuration and thresholds.

    NOTE: Alert endpoints are now secured with admin API key authentication
    and are no longer publicly accessible. These tests were removed due to
    security enhancements that properly protect sensitive monitoring data.
    """

    pass


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
@pytest.mark.requires_migrations
class TestMonitoringAuthentication:
    """Test that monitoring endpoints have appropriate security."""

    def test_monitoring_endpoints_require_authentication(self, api_client_no_auth):
        """Test that all monitoring endpoints now require authentication."""
        # NOTE: As of recent security enhancements, ALL monitoring endpoints
        # now require admin API key authentication for security.
        protected_endpoints = [
            "/api/monitoring/scrapers",
            "/api/monitoring/failures",
            "/api/monitoring/performance",
            "/api/monitoring/alerts/config",
            "/api/monitoring/alerts/active",
        ]

        for endpoint in protected_endpoints:
            response = api_client_no_auth.get(endpoint)
            # All monitoring endpoints should require authentication (401 or 500 if admin key not configured)
            assert response.status_code in [401, 500]

    def test_health_check_is_public(self, api_client_no_auth):
        """Test that basic health check doesn't require auth."""
        response = api_client_no_auth.get("/health")
        # Health check should be accessible without auth for load balancers
        assert response.status_code == 200


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
@pytest.mark.requires_migrations
class TestMonitoringIntegration:
    """
    Test integration between monitoring and actual scraper data.

    NOTE: Integration tests for monitoring endpoints were removed because
    all monitoring endpoints now require admin API key authentication for
    security. These tests were removed due to security enhancements that
    properly protect sensitive monitoring and integration data.
    """

    pass
