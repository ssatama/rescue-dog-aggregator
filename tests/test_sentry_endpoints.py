"""Test the Sentry verification endpoints."""

import os
import sys
from unittest.mock import MagicMock, patch

import pytest
import sentry_sdk
from fastapi.testclient import TestClient


class TestSentryEndpoints:
    """Test suite for Sentry verification endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Set up test environment."""
        # Ensure we're in test/development mode
        os.environ["ENVIRONMENT"] = "development"
        os.environ["TESTING"] = "true"

        # Clear modules to force reimport
        modules_to_clear = [
            "config",
            "api.main",
            "api.monitoring",
            "api.routes.sentry_test",
        ]
        for module in modules_to_clear:
            if module in sys.modules:
                del sys.modules[module]

        yield

        # Cleanup
        os.environ.pop("ENVIRONMENT", None)

    def test_sentry_test_endpoints_not_available_in_production(self):
        """Test that Sentry test endpoints are not available in production."""
        with patch.dict(
            os.environ,
            {
                "ENVIRONMENT": "production",
                "TESTING": "true",
                "ALLOWED_ORIGINS": "https://www.rescuedogs.me,https://rescuedogs.me",
            },
        ):
            # Clear modules to force reimport
            modules_to_clear = ["config", "api.main", "api.monitoring"]
            for module in modules_to_clear:
                if module in sys.modules:
                    del sys.modules[module]

            from api.main import app

            client = TestClient(app)

            # Test endpoints should return 404 in production
            response = client.get("/api/sentry-test/health")
            assert response.status_code == 404

    def test_sentry_health_endpoint(self):
        """Test the Sentry health check endpoint."""
        from api.main import app

        client = TestClient(app)

        response = client.get("/api/sentry-test/health")
        assert response.status_code == 200

        data = response.json()
        assert "message" in data
        assert "details" in data
        assert "sentry_initialized" in data["details"]
        assert "environment" in data["details"]
        assert "dsn_configured" in data["details"]
        assert "traces_sample_rate" in data["details"]

    def test_sentry_test_error_endpoint_exception(self):
        """Test the error endpoint triggers an exception."""
        from api.main import app

        client = TestClient(app, raise_server_exceptions=False)

        with patch.object(sentry_sdk, "capture_exception") as mock_capture:
            response = client.get("/api/sentry-test/test-error?error_type=exception")
            assert response.status_code == 500
            assert "Test error from Sentry verification endpoint" in response.json()["detail"]

    def test_sentry_test_error_endpoint_404(self):
        """Test the error endpoint triggers a 404."""
        from api.main import app

        client = TestClient(app)

        response = client.get("/api/sentry-test/test-error?error_type=http_404")
        assert response.status_code == 404
        assert "Test 404 error for Sentry" in response.json()["detail"]

    def test_sentry_test_error_endpoint_500(self):
        """Test the error endpoint triggers a 500."""
        from api.main import app

        client = TestClient(app)

        response = client.get("/api/sentry-test/test-error?error_type=http_500")
        assert response.status_code == 500
        assert "Test 500 error for Sentry" in response.json()["detail"]

    @pytest.mark.asyncio
    async def test_sentry_performance_endpoint(self):
        """Test the performance monitoring endpoint."""
        from api.main import app

        client = TestClient(app)

        with patch.object(sentry_sdk, "start_transaction") as mock_transaction:
            mock_span = MagicMock()
            mock_transaction.return_value.__enter__.return_value = mock_span

            response = client.get("/api/sentry-test/test-performance?delay_ms=50")
            assert response.status_code == 200

            data = response.json()
            assert data["details"]["requested_delay_ms"] == 50
            assert data["details"]["total_simulated_time_ms"] == 75
            assert data["details"]["transaction_recorded"] is True

            # Verify transaction was started
            mock_transaction.assert_called_once_with(name="test-performance", op="test")

    def test_sentry_breadcrumb_endpoint(self):
        """Test the breadcrumb recording endpoint."""
        from api.main import app

        client = TestClient(app)

        with patch.object(sentry_sdk, "add_breadcrumb") as mock_breadcrumb:
            response = client.get("/api/sentry-test/test-breadcrumb")
            assert response.status_code == 200

            data = response.json()
            assert data["details"]["breadcrumbs_added"] == 3

            # Verify breadcrumbs were added
            assert mock_breadcrumb.call_count == 3

            # Check the breadcrumb calls
            calls = mock_breadcrumb.call_args_list
            assert calls[0][1]["category"] == "test"
            assert calls[0][1]["level"] == "info"
            assert calls[1][1]["level"] == "warning"
            assert calls[2][1]["level"] == "error"

    def test_sentry_custom_event_endpoint(self):
        """Test the custom event capture endpoint."""
        from api.main import app

        client = TestClient(app)

        with patch.object(sentry_sdk, "capture_message") as mock_capture:
            # Test info event
            response = client.get("/api/sentry-test/test-custom-event?event_type=info")
            assert response.status_code == 200
            mock_capture.assert_called_with("Test info message from Sentry test endpoint", level="info")

            # Test warning event
            response = client.get("/api/sentry-test/test-custom-event?event_type=warning")
            assert response.status_code == 200
            mock_capture.assert_called_with("Test warning message from Sentry test endpoint", level="warning")

            # Test error event
            response = client.get("/api/sentry-test/test-custom-event?event_type=error")
            assert response.status_code == 200
            mock_capture.assert_called_with("Test error message from Sentry test endpoint", level="error")

    def test_sentry_user_context_endpoint(self):
        """Test the user context setting endpoint."""
        from api.main import app

        client = TestClient(app)

        with patch.object(sentry_sdk, "push_scope") as mock_push_scope:
            mock_scope = MagicMock()
            mock_push_scope.return_value.__enter__.return_value = mock_scope

            response = client.get("/api/sentry-test/test-user-context?user_id=test-123&email=test@example.com")
            assert response.status_code == 200

            data = response.json()
            assert data["details"]["user_id"] == "test-123"
            assert data["details"]["email"] == "test@example.com"

            # Verify user context was set
            mock_scope.set_user.assert_called_once_with(
                {
                    "id": "test-123",
                    "email": "test@example.com",
                    "username": "user_test-123",
                }
            )

    def test_sentry_tags_endpoint(self):
        """Test the tag setting endpoint."""
        from api.main import app

        client = TestClient(app)

        with patch.object(sentry_sdk, "push_scope") as mock_push_scope:
            mock_scope = MagicMock()
            mock_push_scope.return_value.__enter__.return_value = mock_scope

            response = client.get("/api/sentry-test/test-tags")
            assert response.status_code == 200

            data = response.json()
            assert data["details"]["tags"]["test_endpoint"] == "sentry-test"
            assert data["details"]["tags"]["feature"] == "monitoring"
            assert data["details"]["tags"]["test_type"] == "verification"

            # Verify tags were set
            assert mock_scope.set_tag.call_count == 3
            mock_scope.set_tag.assert_any_call("test_endpoint", "sentry-test")
            mock_scope.set_tag.assert_any_call("feature", "monitoring")
            mock_scope.set_tag.assert_any_call("test_type", "verification")
