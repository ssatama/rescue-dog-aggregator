"""The Browserless token must never reach logs or health output.

Production sets BROWSERLESS_WS_ENDPOINT with the token embedded as a query
parameter, and both browser services logged that endpoint verbatim on every
browser launch, so the scraper cron wrote its Browserless credential to the
Railway logs several times per run.
"""

import logging
import os
from unittest.mock import MagicMock, patch

import pytest

from services.browser_service import BrowserOptions, BrowserService
from services.playwright_browser_service import PlaywrightBrowserService, redact_endpoint

SECRET = "s3cr3t-browserless-token"
ENDPOINT_WITH_TOKEN = f"wss://browserless-production.up.railway.app?token={SECRET}"


@pytest.mark.unit
class TestRedactEndpoint:
    def test_strips_the_token_query_parameter(self):
        assert redact_endpoint(ENDPOINT_WITH_TOKEN) == "wss://browserless-production.up.railway.app"

    def test_keeps_the_path(self):
        assert redact_endpoint(f"wss://host.internal/webdriver?token={SECRET}") == "wss://host.internal/webdriver"

    def test_strips_userinfo_credentials(self):
        assert redact_endpoint(f"https://user:{SECRET}@host.internal/webdriver") == "https://host.internal/webdriver"

    def test_leaves_a_credential_free_endpoint_unchanged(self):
        assert redact_endpoint("wss://browserless.railway.internal/webdriver") == "wss://browserless.railway.internal/webdriver"


@pytest.mark.unit
class TestTokenStaysOutOfOutput:
    def test_playwright_health_check_omits_the_token(self):
        with patch.dict(os.environ, {"BROWSERLESS_WS_ENDPOINT": ENDPOINT_WITH_TOKEN}):
            health = PlaywrightBrowserService().health_check()

        assert SECRET not in str(health)
        assert health["endpoint"] == "wss://browserless-production.up.railway.app"

    def test_selenium_health_check_omits_the_token(self):
        with patch.dict(os.environ, {"BROWSER_WEBDRIVER_ENDPOINT": f"https://browserless.internal/webdriver?token={SECRET}"}):
            health = BrowserService().health_check()

        assert SECRET not in str(health)

    @patch("services.browser_service.webdriver.Remote", return_value=MagicMock())
    def test_selenium_remote_launch_log_omits_the_token(self, _remote, caplog):
        with patch.dict(os.environ, {"BROWSER_WEBDRIVER_ENDPOINT": f"https://browserless.internal/webdriver?token={SECRET}"}):
            with caplog.at_level(logging.INFO, logger="services.browser_service"):
                BrowserService().create_driver(BrowserOptions())

        assert "Created remote browser via Browserless" in caplog.text
        assert SECRET not in caplog.text, caplog.text
