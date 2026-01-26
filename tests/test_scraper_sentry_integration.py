"""Tests for scraper Sentry integration functions."""

import json
from unittest.mock import MagicMock, patch


class TestClassifyError:
    """Tests for the _classify_error function."""

    def test_classify_error_network_connection_error(self) -> None:
        """ConnectionError should be classified as network/high."""
        from scrapers.sentry_integration import _classify_error

        error = ConnectionError("Connection refused")
        category, severity = _classify_error(error)
        assert category == "network"
        assert severity == "high"

    def test_classify_error_network_timeout_error(self) -> None:
        """TimeoutError should be classified as network/high."""
        from scrapers.sentry_integration import _classify_error

        error = TimeoutError("Connection timed out")
        category, severity = _classify_error(error)
        # TimeoutError matches "timeout" in type name
        assert category in ("network", "timeout")
        assert severity == "high"

    def test_classify_error_network_by_message(self) -> None:
        """Error with 'connection refused' in message should be network/high."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("connection refused by server")
        category, severity = _classify_error(error)
        assert category == "network"
        assert severity == "high"

    def test_classify_error_parsing_json_decode(self) -> None:
        """JSONDecodeError should be classified as parsing/medium."""
        from scrapers.sentry_integration import _classify_error

        try:
            json.loads("invalid json")
        except json.JSONDecodeError as e:
            category, severity = _classify_error(e)
            assert category == "parsing"
            assert severity == "medium"

    def test_classify_error_parsing_attribute_error(self) -> None:
        """AttributeError should be classified as parsing/medium."""
        from scrapers.sentry_integration import _classify_error

        error = AttributeError("'NoneType' object has no attribute 'text'")
        category, severity = _classify_error(error)
        assert category == "parsing"
        assert severity == "medium"

    def test_classify_error_parsing_by_message(self) -> None:
        """Error with 'selector' in message should be parsing/medium."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("CSS selector not found: .dog-card")
        category, severity = _classify_error(error)
        assert category == "parsing"
        assert severity == "medium"

    def test_classify_error_database_psycopg2(self) -> None:
        """Database-related errors should be classified as database/critical."""
        from scrapers.sentry_integration import _classify_error

        # Create a mock psycopg2-like error
        # Note: message must NOT contain network keywords like "connection"
        class Psycopg2Error(Exception):
            pass

        error = Psycopg2Error("Database query failed")
        category, severity = _classify_error(error)
        assert category == "database"
        assert severity == "critical"

    def test_classify_error_database_sql_error(self) -> None:
        """SQLError should be classified as database/critical."""
        from scrapers.sentry_integration import _classify_error

        class SQLError(Exception):
            pass

        error = SQLError("Invalid SQL syntax")
        category, severity = _classify_error(error)
        assert category == "database"
        assert severity == "critical"

    def test_classify_error_timeout_by_message(self) -> None:
        """Error with 'timeout' in message is classified as network (not timeout category).

        Note: The network check comes before timeout and includes 'timeout' in its
        message patterns, so timeout-by-message errors are classified as network.
        Only errors with 'timeout' in the type name (but not matching other patterns)
        would be classified as 'timeout' category.
        """
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("Request timeout after 30 seconds")
        category, severity = _classify_error(error)
        # "timeout" in message matches network pattern first
        assert category == "network"
        assert severity == "high"

    def test_classify_error_unknown_default(self) -> None:
        """Unknown errors should be classified as unknown/medium."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("Something unexpected happened")
        category, severity = _classify_error(error)
        assert category == "unknown"
        assert severity == "medium"

    def test_classify_error_value_error_unknown(self) -> None:
        """ValueError without special keywords should be unknown/medium."""
        from scrapers.sentry_integration import _classify_error

        error = ValueError("Invalid input value")
        category, severity = _classify_error(error)
        assert category == "unknown"
        assert severity == "medium"

    def test_classify_error_auth_401(self) -> None:
        """Error with '401' in message should be auth/critical."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("HTTP 401 Unauthorized")
        category, severity = _classify_error(error)
        assert category == "auth"
        assert severity == "critical"

    def test_classify_error_auth_403_forbidden(self) -> None:
        """Error with '403' or 'forbidden' should be auth/critical."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("Access forbidden: 403")
        category, severity = _classify_error(error)
        assert category == "auth"
        assert severity == "critical"

    def test_classify_error_rate_limit_429(self) -> None:
        """Error with '429' should be rate_limit/high."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("HTTP 429 Too Many Requests")
        category, severity = _classify_error(error)
        assert category == "rate_limit"
        assert severity == "high"

    def test_classify_error_rate_limit_throttle(self) -> None:
        """Error with 'throttle' should be rate_limit/high."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("Request was throttled")
        category, severity = _classify_error(error)
        assert category == "rate_limit"
        assert severity == "high"

    def test_classify_error_browser_playwright(self) -> None:
        """Playwright errors should be browser/high."""
        from scrapers.sentry_integration import _classify_error

        class PlaywrightError(Exception):
            pass

        error = PlaywrightError("Page crashed")
        category, severity = _classify_error(error)
        assert category == "browser"
        assert severity == "high"

    def test_classify_error_browser_navigation(self) -> None:
        """Error with 'navigation' should be browser/high."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("Navigation failed: timeout")
        category, severity = _classify_error(error)
        assert category == "browser"
        assert severity == "high"

    def test_classify_error_resource_memory(self) -> None:
        """MemoryError should be resource/critical."""
        from scrapers.sentry_integration import _classify_error

        error = MemoryError("Out of memory")
        category, severity = _classify_error(error)
        assert category == "resource"
        assert severity == "critical"


class TestScraperScrubSensitiveData:
    """Tests for the scraper scrub_sensitive_data function."""

    def test_scrub_sensitive_data_extra_field(self) -> None:
        """Should scrub sensitive keys in extra field."""
        from scrapers.sentry_integration import scrub_sensitive_data

        event = {
            "extra": {
                "api_key": "secret123",
                "password": "mypassword",
                "normal_field": "value",
            }
        }

        result = scrub_sensitive_data(event, {})

        assert result is not None
        assert result["extra"]["api_key"] == "[REDACTED]"
        assert result["extra"]["password"] == "[REDACTED]"
        assert result["extra"]["normal_field"] == "value"

    def test_scrub_sensitive_data_breadcrumbs(self) -> None:
        """Should scrub sensitive data in breadcrumbs."""
        from scrapers.sentry_integration import scrub_sensitive_data

        event = {
            "breadcrumbs": {
                "values": [
                    {"data": {"api_key": "secret123", "action": "fetch"}},
                    {"data": {"auth_token": "bearer_xyz", "url": "/api/dogs"}},
                ]
            }
        }

        result = scrub_sensitive_data(event, {})

        assert result is not None
        assert result["breadcrumbs"]["values"][0]["data"]["api_key"] == "[REDACTED]"
        assert result["breadcrumbs"]["values"][0]["data"]["action"] == "fetch"
        assert result["breadcrumbs"]["values"][1]["data"]["auth_token"] == "[REDACTED]"
        assert result["breadcrumbs"]["values"][1]["data"]["url"] == "/api/dogs"

    def test_scrub_sensitive_data_contexts(self) -> None:
        """Should scrub sensitive data in contexts."""
        from scrapers.sentry_integration import scrub_sensitive_data

        event = {
            "contexts": {
                "app": {"dsn": "https://key@sentry.io/123"},
                "runtime": {"name": "python", "secret_config": "xyz"},
            }
        }

        result = scrub_sensitive_data(event, {})

        assert result is not None
        assert result["contexts"]["app"]["dsn"] == "[REDACTED]"
        assert result["contexts"]["runtime"]["secret_config"] == "[REDACTED]"
        assert result["contexts"]["runtime"]["name"] == "python"

    def test_scrub_sensitive_data_nested_dict(self) -> None:
        """Should scrub nested dictionaries recursively."""
        from scrapers.sentry_integration import scrub_sensitive_data

        event = {
            "extra": {
                "config": {
                    "database": {
                        "password": "dbpassword",
                        "host": "localhost",
                    },
                    "api_token": "token123",
                }
            }
        }

        result = scrub_sensitive_data(event, {})

        assert result is not None
        assert result["extra"]["config"]["database"]["password"] == "[REDACTED]"
        assert result["extra"]["config"]["database"]["host"] == "localhost"
        assert result["extra"]["config"]["api_token"] == "[REDACTED]"

    def test_scrub_sensitive_data_empty_event(self) -> None:
        """Should handle empty events gracefully."""
        from scrapers.sentry_integration import scrub_sensitive_data

        event: dict = {}
        result = scrub_sensitive_data(event, {})

        assert result is not None
        assert result == {}

    def test_scrub_sensitive_data_all_patterns(self) -> None:
        """Should scrub all sensitive patterns."""
        from scrapers.sentry_integration import scrub_sensitive_data

        event = {
            "extra": {
                "password": "pass",
                "token": "tok",
                "secret": "sec",
                "key": "k",
                "dsn": "d",
                "api_key": "ak",
                "auth": "a",
                "safe_field": "safe",
            }
        }

        result = scrub_sensitive_data(event, {})

        assert result is not None
        assert result["extra"]["password"] == "[REDACTED]"
        assert result["extra"]["token"] == "[REDACTED]"
        assert result["extra"]["secret"] == "[REDACTED]"
        assert result["extra"]["key"] == "[REDACTED]"
        assert result["extra"]["dsn"] == "[REDACTED]"
        assert result["extra"]["api_key"] == "[REDACTED]"
        assert result["extra"]["auth"] == "[REDACTED]"
        assert result["extra"]["safe_field"] == "safe"


class TestScraperAlertFunctions:
    """Tests for scraper alert functions that send to Sentry."""

    def test_alert_zero_dogs_found_sends_error(self) -> None:
        """alert_zero_dogs_found should send ERROR level with correct tags."""
        from scrapers.sentry_integration import alert_zero_dogs_found

        with patch("scrapers.sentry_integration.sentry_sdk") as mock_sentry:
            mock_scope = MagicMock()
            mock_sentry.new_scope.return_value.__enter__ = MagicMock(return_value=mock_scope)
            mock_sentry.new_scope.return_value.__exit__ = MagicMock(return_value=None)

            alert_zero_dogs_found("TestOrg", org_id=123)

            mock_sentry.capture_message.assert_called_once()
            call_args = mock_sentry.capture_message.call_args
            assert call_args.kwargs["level"] == "error"
            mock_scope.set_tag.assert_any_call("scraper.organization", "TestOrg")
            mock_scope.set_tag.assert_any_call("scraper.org_id", "123")
            mock_scope.set_tag.assert_any_call("scraper.alert_type", "zero_dogs_found")

    def test_alert_partial_failure_severity_critical(self) -> None:
        """alert_partial_failure with <10% of expected should be critical."""
        from scrapers.sentry_integration import alert_partial_failure

        with patch("scrapers.sentry_integration.sentry_sdk") as mock_sentry:
            mock_scope = MagicMock()
            mock_sentry.new_scope.return_value.__enter__ = MagicMock(return_value=mock_scope)
            mock_sentry.new_scope.return_value.__exit__ = MagicMock(return_value=None)

            alert_partial_failure("TestOrg", dogs_found=5, historical_average=100.0)

            mock_sentry.capture_message.assert_called_once()
            call_args = mock_sentry.capture_message.call_args
            assert call_args.kwargs["level"] == "error"
            mock_scope.set_tag.assert_any_call("scraper.error_severity", "critical")

    def test_alert_partial_failure_severity_high(self) -> None:
        """alert_partial_failure with 10-30% of expected should be high."""
        from scrapers.sentry_integration import alert_partial_failure

        with patch("scrapers.sentry_integration.sentry_sdk") as mock_sentry:
            mock_scope = MagicMock()
            mock_sentry.new_scope.return_value.__enter__ = MagicMock(return_value=mock_scope)
            mock_sentry.new_scope.return_value.__exit__ = MagicMock(return_value=None)

            alert_partial_failure("TestOrg", dogs_found=20, historical_average=100.0)

            mock_sentry.capture_message.assert_called_once()
            mock_scope.set_tag.assert_any_call("scraper.error_severity", "high")

    def test_alert_partial_failure_severity_medium(self) -> None:
        """alert_partial_failure with 30-50% of expected should be medium."""
        from scrapers.sentry_integration import alert_partial_failure

        with patch("scrapers.sentry_integration.sentry_sdk") as mock_sentry:
            mock_scope = MagicMock()
            mock_sentry.new_scope.return_value.__enter__ = MagicMock(return_value=mock_scope)
            mock_sentry.new_scope.return_value.__exit__ = MagicMock(return_value=None)

            alert_partial_failure("TestOrg", dogs_found=40, historical_average=100.0)

            mock_sentry.capture_message.assert_called_once()
            mock_scope.set_tag.assert_any_call("scraper.error_severity", "medium")

    def test_alert_llm_enrichment_failure_sends_warning(self) -> None:
        """alert_llm_enrichment_failure should send WARNING level."""
        from scrapers.sentry_integration import alert_llm_enrichment_failure

        with patch("scrapers.sentry_integration.sentry_sdk") as mock_sentry:
            mock_scope = MagicMock()
            mock_sentry.new_scope.return_value.__enter__ = MagicMock(return_value=mock_scope)
            mock_sentry.new_scope.return_value.__exit__ = MagicMock(return_value=None)

            alert_llm_enrichment_failure("TestOrg", batch_size=50, failed_count=10)

            mock_sentry.capture_message.assert_called_once()
            call_args = mock_sentry.capture_message.call_args
            assert call_args.kwargs["level"] == "warning"
            mock_scope.set_tag.assert_any_call("scraper.alert_type", "llm_enrichment_failure")
            mock_scope.set_context.assert_called()
