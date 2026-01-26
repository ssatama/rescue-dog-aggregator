import os
from unittest.mock import MagicMock, Mock, patch

import pytest
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.starlette import StarletteIntegration


class TestSentryConfiguration:
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self):
        yield
        # Use modern Sentry API instead of deprecated Hub
        client = sentry_sdk.get_client()
        if client.is_active():
            sentry_sdk.get_global_scope().clear()

    def test_sentry_initialization_with_correct_integrations(self):
        from api.monitoring import init_sentry

        with patch.object(sentry_sdk, "init") as mock_init:
            with patch.dict(os.environ, {"SENTRY_DSN_BACKEND": "https://test@sentry.io/123"}):
                init_sentry("production")  # Use production environment

                mock_init.assert_called_once()
                call_kwargs = mock_init.call_args.kwargs

                integrations = call_kwargs["integrations"]
                integration_types = [type(i) for i in integrations]

                assert StarletteIntegration in integration_types
                assert FastApiIntegration in integration_types
                # SqlalchemyIntegration removed - codebase uses psycopg2 directly

    def test_sentry_environment_configuration(self):
        from api.monitoring import init_sentry

        with patch.object(sentry_sdk, "init") as mock_init:
            with patch.dict(os.environ, {"SENTRY_DSN_BACKEND": "https://test@sentry.io/123"}):
                init_sentry("production")

                mock_init.assert_called_once()
                call_kwargs = mock_init.call_args.kwargs

                assert call_kwargs["environment"] == "production"
                assert call_kwargs["send_default_pii"] is False

    def test_sentry_sampling_rates_for_low_traffic(self):
        from api.monitoring import init_sentry

        with patch.object(sentry_sdk, "init") as mock_init:
            with patch.dict(os.environ, {"SENTRY_DSN_BACKEND": "https://test@sentry.io/123"}):
                init_sentry("production")

                mock_init.assert_called_once()
                call_kwargs = mock_init.call_args.kwargs

                assert call_kwargs["traces_sample_rate"] == 1.0
                assert call_kwargs["profiles_sample_rate"] == 1.0

    def test_sentry_dsn_from_environment(self):
        from api.monitoring import init_sentry

        test_dsn = "https://test@sentry.io/123456"
        with patch.object(sentry_sdk, "init") as mock_init:
            with patch.dict(os.environ, {"SENTRY_DSN_BACKEND": test_dsn}):
                init_sentry("production")

                mock_init.assert_called_once()
                call_kwargs = mock_init.call_args.kwargs

                assert call_kwargs["dsn"] == test_dsn

    def test_sensitive_data_scrubbing(self):
        from api.monitoring import scrub_sensitive_data

        event = {
            "request": {
                "headers": {
                    "authorization": "Bearer token123",
                    "x-api-key": "secret",
                    "content-type": "application/json",
                },
                "cookies": {"session": "abc123"},
            },
            "extra": {
                "password_hash": "hash123",
                "api_token": "token456",
                "normal_field": "value",
            },
        }

        scrubbed = scrub_sensitive_data(event, {})

        assert scrubbed["request"]["headers"]["authorization"] == "[REDACTED]"
        assert scrubbed["request"]["headers"]["x-api-key"] == "[REDACTED]"
        assert scrubbed["request"]["headers"]["content-type"] == "application/json"
        assert scrubbed["request"]["cookies"] == "[REDACTED]"
        assert scrubbed["extra"]["password_hash"] == "[REDACTED]"
        assert scrubbed["extra"]["api_token"] == "[REDACTED]"
        assert scrubbed["extra"]["normal_field"] == "value"

    def test_404_filtering_only_filters_http_exceptions(self):
        """Test that 404 filtering only drops HTTP exceptions, not arbitrary errors."""
        from api.monitoring import scrub_sensitive_data

        # HTTP 404 exception should be filtered (return None)
        http_404_event = {"exception": {"values": [{"type": "HTTPException", "value": "404: Not Found"}]}}
        assert scrub_sensitive_data(http_404_event, {}) is None

        # StarletteHTTPException should also be filtered
        starlette_404_event = {"exception": {"values": [{"type": "StarletteHTTPException", "value": "404 Not Found"}]}}
        assert scrub_sensitive_data(starlette_404_event, {}) is None

    def test_404_filtering_does_not_drop_legitimate_errors(self):
        """Test that errors containing '404' but not HTTP exceptions are NOT filtered."""
        from api.monitoring import scrub_sensitive_data

        # ValueError with "404" in message should NOT be filtered
        value_error_event = {"exception": {"values": [{"type": "ValueError", "value": "User with ID 404 not found"}]}}
        result = scrub_sensitive_data(value_error_event, {})
        assert result is not None

        # Database error with "Not Found" should NOT be filtered
        db_error_event = {"exception": {"values": [{"type": "DatabaseError", "value": "Record not found in table users"}]}}
        result = scrub_sensitive_data(db_error_event, {})
        assert result is not None

        # FileNotFoundError should NOT be filtered (different exception type)
        file_error_event = {"exception": {"values": [{"type": "FileNotFoundError", "value": "Config file not found"}]}}
        result = scrub_sensitive_data(file_error_event, {})
        assert result is not None

    def test_transaction_style_is_endpoint(self):
        from api.monitoring import init_sentry

        with patch.object(sentry_sdk, "init") as mock_init:
            with patch.dict(os.environ, {"SENTRY_DSN_BACKEND": "https://test@sentry.io/123"}):
                init_sentry("production")

                mock_init.assert_called_once()
                call_kwargs = mock_init.call_args.kwargs

                integrations = call_kwargs["integrations"]
                starlette_integration = None
                for integration in integrations:
                    if isinstance(integration, StarletteIntegration):
                        starlette_integration = integration
                        break

                assert starlette_integration is not None
                assert starlette_integration.transaction_style == "endpoint"

    def test_error_status_codes_configuration(self):
        from api.monitoring import init_sentry

        with patch.object(sentry_sdk, "init") as mock_init:
            with patch.dict(os.environ, {"SENTRY_DSN_BACKEND": "https://test@sentry.io/123"}):
                init_sentry("production")

                mock_init.assert_called_once()
                call_kwargs = mock_init.call_args.kwargs

                integrations = call_kwargs["integrations"]
                fastapi_integration = None
                for integration in integrations:
                    if isinstance(integration, FastApiIntegration):
                        fastapi_integration = integration
                        break

                assert fastapi_integration is not None
                # Updated to include 401, 403, 429 in addition to 5xx
                expected_codes = {401, 403, 429, *range(500, 600)}
                assert fastapi_integration.failed_request_status_codes == expected_codes

    def test_sentry_not_initialized_in_non_production(self):
        """Test that Sentry is NOT initialized in non-production environments."""
        from api.monitoring import init_sentry

        with patch.object(sentry_sdk, "init") as mock_init:
            with patch.dict(os.environ, {"SENTRY_DSN_BACKEND": "https://test@sentry.io/123"}):
                # Test with development environment
                init_sentry("development")
                mock_init.assert_not_called()

                # Test with test environment
                init_sentry("test")
                mock_init.assert_not_called()

                # Test with staging environment
                init_sentry("staging")
                mock_init.assert_not_called()


class TestSentryErrorHandling:
    @pytest.fixture
    def mock_sentry(self):
        with patch("sentry_sdk.capture_exception") as mock_capture:
            yield mock_capture

    def test_database_error_captured(self, mock_sentry):
        from sqlalchemy.exc import OperationalError

        from api.monitoring import handle_database_error

        error = OperationalError("Connection failed", None, None)
        handle_database_error(error, "test_operation")

        # Verify capture_exception was called with the error (scope is passed as kwarg)
        mock_sentry.assert_called_once()
        call_args = mock_sentry.call_args
        assert call_args[0][0] is error  # First positional arg is the error

    def test_api_endpoint_error_captured(self, mock_sentry):
        from api.monitoring import handle_api_error

        error = ValueError("Invalid input")
        handle_api_error(error, "/api/test", "GET")

        # Verify capture_exception was called with the error (scope is passed as kwarg)
        mock_sentry.assert_called_once()
        call_args = mock_sentry.call_args
        assert call_args[0][0] is error  # First positional arg is the error


class TestPerformanceMonitoring:
    def test_slow_query_tracking(self):
        from api.monitoring import track_slow_query

        with patch("sentry_sdk.add_breadcrumb") as mock_breadcrumb:
            track_slow_query("SELECT * FROM animals", 3500)

            mock_breadcrumb.assert_called_once()
            call_args = mock_breadcrumb.call_args.kwargs
            assert call_args["category"] == "database"
            assert call_args["level"] == "warning"
            assert "Slow query" in call_args["message"]

    def test_transaction_span_creation(self):
        from api.monitoring import create_transaction_span

        with patch("sentry_sdk.start_transaction") as mock_transaction:
            mock_span = MagicMock()
            mock_transaction.return_value.__enter__ = Mock(return_value=mock_span)
            mock_transaction.return_value.__exit__ = Mock(return_value=None)

            with create_transaction_span("test_operation", "db"):
                pass

            mock_transaction.assert_called_once_with(name="test_operation", op="db")
