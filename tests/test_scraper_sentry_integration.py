"""Tests for scraper Sentry integration functions."""

import json


class TestClassifyError:
    """Tests for the _classify_error function."""

    def test_classify_error_network_connection_error(self):
        """ConnectionError should be classified as network/high."""
        from scrapers.sentry_integration import _classify_error

        error = ConnectionError("Connection refused")
        category, severity = _classify_error(error)
        assert category == "network"
        assert severity == "high"

    def test_classify_error_network_timeout_error(self):
        """TimeoutError should be classified as network/high."""
        from scrapers.sentry_integration import _classify_error

        error = TimeoutError("Connection timed out")
        category, severity = _classify_error(error)
        # TimeoutError matches "timeout" in type name
        assert category in ("network", "timeout")
        assert severity == "high"

    def test_classify_error_network_by_message(self):
        """Error with 'connection refused' in message should be network/high."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("connection refused by server")
        category, severity = _classify_error(error)
        assert category == "network"
        assert severity == "high"

    def test_classify_error_parsing_json_decode(self):
        """JSONDecodeError should be classified as parsing/medium."""
        from scrapers.sentry_integration import _classify_error

        try:
            json.loads("invalid json")
        except json.JSONDecodeError as e:
            category, severity = _classify_error(e)
            assert category == "parsing"
            assert severity == "medium"

    def test_classify_error_parsing_attribute_error(self):
        """AttributeError should be classified as parsing/medium."""
        from scrapers.sentry_integration import _classify_error

        error = AttributeError("'NoneType' object has no attribute 'text'")
        category, severity = _classify_error(error)
        assert category == "parsing"
        assert severity == "medium"

    def test_classify_error_parsing_by_message(self):
        """Error with 'selector' in message should be parsing/medium."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("CSS selector not found: .dog-card")
        category, severity = _classify_error(error)
        assert category == "parsing"
        assert severity == "medium"

    def test_classify_error_database_psycopg2(self):
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

    def test_classify_error_database_sql_error(self):
        """SQLError should be classified as database/critical."""
        from scrapers.sentry_integration import _classify_error

        class SQLError(Exception):
            pass

        error = SQLError("Invalid SQL syntax")
        category, severity = _classify_error(error)
        assert category == "database"
        assert severity == "critical"

    def test_classify_error_timeout_by_message(self):
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

    def test_classify_error_unknown_default(self):
        """Unknown errors should be classified as unknown/medium."""
        from scrapers.sentry_integration import _classify_error

        error = RuntimeError("Something unexpected happened")
        category, severity = _classify_error(error)
        assert category == "unknown"
        assert severity == "medium"

    def test_classify_error_value_error_unknown(self):
        """ValueError without special keywords should be unknown/medium."""
        from scrapers.sentry_integration import _classify_error

        error = ValueError("Invalid input value")
        category, severity = _classify_error(error)
        assert category == "unknown"
        assert severity == "medium"


class TestScraperScrubSensitiveData:
    """Tests for the scraper scrub_sensitive_data function."""

    def test_scrub_sensitive_data_extra_field(self):
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

    def test_scrub_sensitive_data_breadcrumbs(self):
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

    def test_scrub_sensitive_data_contexts(self):
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

    def test_scrub_sensitive_data_nested_dict(self):
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

    def test_scrub_sensitive_data_empty_event(self):
        """Should handle empty events gracefully."""
        from scrapers.sentry_integration import scrub_sensitive_data

        event: dict = {}
        result = scrub_sensitive_data(event, {})

        assert result is not None
        assert result == {}

    def test_scrub_sensitive_data_all_patterns(self):
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
