"""Test CORS configuration includes Sentry distributed tracing headers."""

import os
import sys
from unittest.mock import patch


class TestCORSSentryHeaders:
    """Test suite for CORS Sentry header configuration."""

    def test_production_cors_includes_sentry_headers(self):
        """Test that production CORS configuration includes sentry-trace and baggage headers."""
        with patch.dict(
            os.environ,
            {"ENVIRONMENT": "production", "ALLOWED_ORIGINS": "https://example.com"},
        ):
            # Clear the module from sys.modules to force reimport
            if "config" in sys.modules:
                del sys.modules["config"]

            import config

            assert "sentry-trace" in config.CORS_ALLOW_HEADERS
            assert "baggage" in config.CORS_ALLOW_HEADERS
            assert "Content-Type" in config.CORS_ALLOW_HEADERS
            assert "Authorization" in config.CORS_ALLOW_HEADERS

    def test_development_cors_allows_all_headers(self):
        """Test that development CORS configuration allows all headers including Sentry."""
        with patch.dict(os.environ, {"ENVIRONMENT": "development"}):
            # Clear the module from sys.modules to force reimport
            if "config" in sys.modules:
                del sys.modules["config"]

            import config

            # In development, all headers are allowed with ["*"]
            assert config.CORS_ALLOW_HEADERS == ["*"]

    def test_cors_headers_order_preserved(self):
        """Test that CORS headers maintain their order with Sentry headers at the end."""
        with patch.dict(
            os.environ,
            {"ENVIRONMENT": "production", "ALLOWED_ORIGINS": "https://example.com"},
        ):
            # Clear the module from sys.modules to force reimport
            if "config" in sys.modules:
                del sys.modules["config"]

            import config

            expected_headers = [
                "Content-Type",
                "Authorization",
                "Accept",
                "Origin",
                "X-Requested-With",
                "sentry-trace",
                "baggage",
            ]
            assert config.CORS_ALLOW_HEADERS == expected_headers

    def test_cors_middleware_receives_sentry_headers(self):
        """Test that the FastAPI CORS middleware is configured with Sentry headers."""
        from fastapi.testclient import TestClient

        with patch.dict(
            os.environ,
            {
                "ENVIRONMENT": "production",
                "ALLOWED_ORIGINS": "https://example.com",
                "TESTING": "true",
            },
        ):
            # Clear modules to force reimport with new env
            modules_to_clear = ["config", "api.main", "api.monitoring"]
            for module in modules_to_clear:
                if module in sys.modules:
                    del sys.modules[module]

            from api.main import app

            client = TestClient(app)

            # Make a preflight OPTIONS request to check CORS headers
            response = client.options(
                "/api/dogs/swipe",
                headers={
                    "Origin": "https://example.com",
                    "Access-Control-Request-Method": "GET",
                    "Access-Control-Request-Headers": "sentry-trace,baggage",
                },
            )

            # Check that the response allows the Sentry headers
            assert response.status_code == 200
            allowed_headers = response.headers.get("access-control-allow-headers", "")
            assert "sentry-trace" in allowed_headers.lower()
            assert "baggage" in allowed_headers.lower()

    def test_actual_request_with_sentry_headers(self):
        """Test that actual requests with Sentry headers are accepted."""
        from fastapi.testclient import TestClient

        with patch.dict(
            os.environ,
            {
                "ENVIRONMENT": "production",
                "ALLOWED_ORIGINS": "https://example.com",
                "TESTING": "true",
            },
        ):
            # Clear modules to force reimport
            modules_to_clear = ["config", "api.main", "api.monitoring"]
            for module in modules_to_clear:
                if module in sys.modules:
                    del sys.modules[module]

            from api.main import app

            client = TestClient(app)

            # Make a request with Sentry headers
            response = client.get(
                "/",
                headers={
                    "Origin": "https://example.com",
                    "sentry-trace": "12345678901234567890123456789012-1234567890123456-1",
                    "baggage": "sentry-environment=production,sentry-release=1.0.0",
                },
            )

            # Request should be successful
            assert response.status_code == 200
            assert (
                "Welcome to the Rescue Dog Aggregator API" in response.json()["message"]
            )
