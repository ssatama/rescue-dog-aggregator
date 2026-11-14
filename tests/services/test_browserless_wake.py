"""The cron wakes Browserless before scraping.

Browserless sleeps between cron runs (Railway Serverless), and a cold boot
outlasts the CDP connect's own retries, so the cron polls it first.
"""

import urllib.error
from unittest.mock import MagicMock, patch

import pytest

from services.playwright_browser_service import PlaywrightBrowserService

SECRET = "s3cr3t-browserless-token"
ENDPOINT = f"wss://browserless-production.up.railway.app?token={SECRET}"


def ok_response(status: int = 200) -> MagicMock:
    response = MagicMock(status=status)
    response.__enter__.return_value = response
    return response


@pytest.fixture
def service(monkeypatch):
    def make(endpoint: str | None = ENDPOINT) -> PlaywrightBrowserService:
        if endpoint:
            monkeypatch.setenv("BROWSERLESS_WS_ENDPOINT", endpoint)
        else:
            monkeypatch.delenv("BROWSERLESS_WS_ENDPOINT", raising=False)
        monkeypatch.delenv("BROWSERLESS_TOKEN", raising=False)
        return PlaywrightBrowserService()

    return make


@pytest.mark.unit
class TestWaitUntilReady:
    def test_local_mode_has_nothing_to_wake(self, service):
        with patch("urllib.request.urlopen") as urlopen:
            assert service(None).wait_until_ready() is True
        urlopen.assert_not_called()

    def test_polls_the_version_endpoint_over_https_with_the_token(self, service):
        with patch("urllib.request.urlopen", return_value=ok_response()) as urlopen:
            assert service().wait_until_ready() is True
        assert urlopen.call_args.args[0] == f"https://browserless-production.up.railway.app/json/version?token={SECRET}"

    def test_plain_ws_becomes_http(self, service):
        with patch("urllib.request.urlopen", return_value=ok_response()) as urlopen:
            service("ws://browserless.railway.internal:3000").wait_until_ready()
        assert urlopen.call_args.args[0] == "http://browserless.railway.internal:3000/json/version"

    def test_keeps_polling_while_it_boots(self, service, stub_clock):
        booting = urllib.error.URLError("connection refused")
        with patch("urllib.request.urlopen", side_effect=[booting, TimeoutError(), ok_response()]) as urlopen:
            assert service().wait_until_ready(interval=5.0) is True
        assert urlopen.call_count == 3
        assert stub_clock.calls == [5.0, 5.0]

    def test_gives_up_without_raising_so_the_scrapers_still_try(self, service, stub_clock, caplog):
        with patch("urllib.request.urlopen", side_effect=urllib.error.URLError("down")) as urlopen:
            assert service().wait_until_ready(attempts=3) is False
        assert urlopen.call_count == 3
        assert len(stub_clock.calls) == 2
        assert "did not answer" in caplog.text
        assert SECRET not in caplog.text

    def test_a_non_200_answer_is_not_ready(self, service, stub_clock):
        with patch("urllib.request.urlopen", return_value=ok_response(503)):
            assert service().wait_until_ready(attempts=2) is False
