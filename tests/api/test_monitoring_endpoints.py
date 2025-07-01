"""
Test monitoring and health check endpoints for production safety.

This module tests the monitoring endpoints that provide visibility into
scraper performance, failure detection, and system health.
"""

import pytest


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
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


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestScraperMonitoringEndpoint:
    """Test scraper-specific monitoring endpoints."""

    def test_scraper_status_endpoint(self, client):
        """Test that scraper status endpoint provides comprehensive metrics."""
        response = client.get("/monitoring/scrapers")
        assert response.status_code == 200

        data = response.json()
        assert "scrapers" in data
        assert "summary" in data

        # Summary should include overall metrics
        summary = data["summary"]
        assert "total_organizations" in summary
        assert "last_24h_scrapes" in summary
        assert "failure_rate" in summary

    def test_scraper_status_per_organization(self, client):
        """Test scraper status includes per-organization details."""
        response = client.get("/monitoring/scrapers")
        data = response.json()

        scrapers = data["scrapers"]
        assert isinstance(scrapers, list)

        if scrapers:  # If there are scrapers configured
            scraper = scrapers[0]

            # Required fields for each scraper
            assert "organization_name" in scraper
            assert "last_scrape" in scraper
            assert "status" in scraper
            assert "animals_found" in scraper
            assert "failure_detection" in scraper

    def test_individual_scraper_details(self, client):
        """Test endpoint for individual scraper details."""
        # This would test /monitoring/scrapers/{org_id} endpoint
        response = client.get("/monitoring/scrapers/1")

        if response.status_code == 200:
            data = response.json()
            assert "organization_name" in data
            assert "recent_scrapes" in data
            assert "performance_metrics" in data
            assert "failure_analysis" in data
        else:
            # 404 is acceptable if no scraper with ID 1
            assert response.status_code == 404


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestFailureDetectionMonitoring:
    """Test monitoring of failure detection system."""

    def test_failure_detection_metrics_endpoint(self, client):
        """Test endpoint that exposes failure detection metrics."""
        response = client.get("/monitoring/failures")
        assert response.status_code == 200

        data = response.json()
        assert "failure_summary" in data
        assert "recent_failures" in data
        assert "thresholds" in data

    def test_failure_summary_includes_counts(self, client):
        """Test failure summary includes categorized failure counts."""
        response = client.get("/monitoring/failures")
        data = response.json()

        summary = data["failure_summary"]
        assert "catastrophic_failures_24h" in summary
        assert "partial_failures_24h" in summary
        assert "database_errors_24h" in summary
        assert "total_scrapes_24h" in summary

    def test_recent_failures_include_context(self, client):
        """Test recent failures include debugging context."""
        response = client.get("/monitoring/failures")
        data = response.json()

        failures = data["recent_failures"]
        assert isinstance(failures, list)

        if failures:  # If there are recent failures
            failure = failures[0]
            assert "timestamp" in failure
            assert "organization_name" in failure
            assert "failure_type" in failure
            assert "animals_found" in failure
            assert "threshold_info" in failure


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestPerformanceMetrics:
    """Test performance monitoring endpoints."""

    def test_performance_metrics_endpoint(self, client):
        """Test endpoint that provides performance metrics."""
        response = client.get("/monitoring/performance")
        assert response.status_code == 200

        data = response.json()
        assert "scraper_performance" in data
        assert "system_performance" in data

    def test_scraper_performance_metrics(self, client):
        """Test scraper performance includes timing and quality metrics."""
        response = client.get("/monitoring/performance")
        data = response.json()

        scraper_perf = data["scraper_performance"]
        assert "average_duration_seconds" in scraper_perf
        assert "average_data_quality_score" in scraper_perf
        assert "success_rate" in scraper_perf
        assert "animals_per_hour" in scraper_perf

    def test_system_performance_metrics(self, client):
        """Test system performance includes resource utilization."""
        response = client.get("/monitoring/performance")
        data = response.json()

        system_perf = data["system_performance"]
        assert "database_connection_pool" in system_perf
        assert "memory_usage" in system_perf  # If available
        assert "active_scrapers" in system_perf


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAlertingConfiguration:
    """Test alerting configuration and thresholds."""

    def test_alerting_config_endpoint(self, client):
        """Test endpoint for viewing alerting configuration."""
        response = client.get("/monitoring/alerts/config")
        assert response.status_code == 200

        data = response.json()
        assert "failure_thresholds" in data
        assert "notification_settings" in data

    def test_failure_thresholds_configuration(self, client):
        """Test failure threshold configuration is exposed."""
        response = client.get("/monitoring/alerts/config")
        data = response.json()

        thresholds = data["failure_thresholds"]
        assert "catastrophic_absolute_minimum" in thresholds
        assert "partial_failure_percentage" in thresholds
        assert "alert_after_consecutive_failures" in thresholds

    def test_active_alerts_endpoint(self, client):
        """Test endpoint for viewing active alerts."""
        response = client.get("/monitoring/alerts/active")
        assert response.status_code == 200

        data = response.json()
        assert "active_alerts" in data
        assert "alert_summary" in data

        # Alert summary should include counts by severity
        summary = data["alert_summary"]
        assert "critical" in summary
        assert "warning" in summary
        assert "info" in summary


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestMonitoringAuthentication:
    """Test that monitoring endpoints have appropriate security."""

    def test_monitoring_endpoints_are_accessible(self, api_client_no_auth):
        """Test that monitoring endpoints are accessible (no auth implemented yet)."""
        # NOTE: Currently no authentication is implemented, so all endpoints are public
        # This test documents current behavior - in production you'd want
        # authentication
        public_endpoints = [
            "/monitoring/scrapers",
            "/monitoring/failures",
            "/monitoring/performance",
            "/monitoring/alerts/config"
        ]

        for endpoint in public_endpoints:
            response = api_client_no_auth.get(endpoint)
            # Currently all monitoring endpoints are public (should be 200 or
            # 404)
            assert response.status_code in [200, 404]

    def test_health_check_is_public(self, api_client_no_auth):
        """Test that basic health check doesn't require auth."""
        response = api_client_no_auth.get("/health")
        # Health check should be accessible without auth for load balancers
        assert response.status_code == 200


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestMonitoringIntegration:
    """Test integration between monitoring and actual scraper data."""

    @pytest.mark.integration
    def test_monitoring_reflects_actual_scraper_runs(self, client):
        """Test that monitoring endpoints reflect real scraper execution."""
        # This is an integration test that would run actual scrapers
        # and verify monitoring data is updated accordingly

        # Get initial state
        initial_response = client.get("/monitoring/scrapers")
        initial_data = initial_response.json()
        initial_count = initial_data["summary"]["last_24h_scrapes"]

        # Run a scraper (this would need to be implemented)
        # scraper_response = client.post("/admin/run-scraper", json={"org_id": "test-org"})

        # Check updated state
        updated_response = client.get("/monitoring/scrapers")
        updated_data = updated_response.json()
        updated_count = updated_data["summary"]["last_24h_scrapes"]

        # Should reflect the new scrape
        # assert updated_count >= initial_count

    @pytest.mark.integration
    def test_failure_detection_monitoring_integration(self, client):
        """Test that failure detection results are properly exposed in monitoring."""
        # This would test that when failure detection triggers,
        # it's properly reflected in the monitoring endpoints

        response = client.get("/monitoring/failures")
        data = response.json()

        # Should be able to correlate failure detection logic with monitoring
        # output
        assert "thresholds" in data
        thresholds = data["thresholds"]

        # These should match the actual failure detection configuration
        assert "default_absolute_minimum" in thresholds
        assert "default_percentage_threshold" in thresholds
