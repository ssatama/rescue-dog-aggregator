"""The Browserless token must never reach logs or health output.

Production sets BROWSERLESS_WS_ENDPOINT with the token embedded as a query
parameter, and both browser services logged that endpoint verbatim on every
browser launch, so the scraper cron wrote its Browserless credential to the
Railway logs several times per run.
"""

import logging
import os
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from scrapers.sentry_integration import init_scraper_sentry
from services.browser_service import BrowserOptions, BrowserService
from services.playwright_browser_service import PlaywrightBrowserService, PlaywrightOptions, redact_endpoint

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

    def test_keeps_the_port(self):
        assert redact_endpoint(f"wss://browserless.internal:3000?token={SECRET}") == "wss://browserless.internal:3000"

    def test_keeps_ipv6_brackets(self):
        assert redact_endpoint(f"wss://[::1]:3000?token={SECRET}") == "wss://[::1]:3000"

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

    @pytest.mark.asyncio
    async def test_playwright_remote_launch_log_omits_the_token(self, caplog):
        """The launch log that leaked the token on every cron scrape."""
        playwright = MagicMock()
        playwright.chromium.connect_over_cdp = AsyncMock(return_value=MagicMock())
        with patch.dict(os.environ, {"BROWSERLESS_WS_ENDPOINT": ENDPOINT_WITH_TOKEN}):
            service = PlaywrightBrowserService()
            service._get_or_start_playwright = AsyncMock(return_value=playwright)
            service._create_context = AsyncMock(return_value=MagicMock(new_page=AsyncMock()))

            with caplog.at_level(logging.INFO, logger="services.playwright_browser_service"):
                await service._create_remote_browser(PlaywrightOptions())

        assert "Created remote Playwright browser via Browserless" in caplog.text
        assert SECRET not in caplog.text, caplog.text


@pytest.mark.unit
class TestScraperSentryDropsFrameLocals:
    def test_frame_locals_are_not_sent(self):
        """A failed connect_over_cdp would otherwise ship ws_url, token included,
        as a stack-frame local; the scrubber only matches key names."""
        with patch.dict(os.environ, {"SENTRY_DSN_BACKEND": "https://key@example.ingest.sentry.io/1"}), patch("scrapers.sentry_integration._sentry_initialized", False), patch("scrapers.sentry_integration.sentry_sdk.init") as init:
            init_scraper_sentry()

        assert init.call_args.kwargs["include_local_variables"] is False
