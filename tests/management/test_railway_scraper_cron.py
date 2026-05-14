"""Tests for the Browserless wake/stop wrappers in railway_scraper_cron.

These guard the PR's stated billing benefit: if the try/finally cleanup or the wake-failure
abort regress, Browserless can run indefinitely or scrapers can race a cold Chrome instance.
"""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from management.railway_scraper_cron import start_browserless, stop_browserless
from services.railway_service_controller import Deployment, RailwayApiError


@pytest.mark.unit
class TestStartBrowserless:
    def test_returns_false_when_health_url_missing(self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
        monkeypatch.delenv("BROWSERLESS_HEALTH_URL", raising=False)
        controller = MagicMock()

        with caplog.at_level("ERROR", logger="management.railway_scraper_cron"):
            assert start_browserless(controller) is False

        controller.redeploy.assert_not_called()
        assert any("BROWSERLESS_HEALTH_URL is required" in record.message for record in caplog.records)

    def test_returns_false_when_redeploy_raises(self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
        monkeypatch.setenv("BROWSERLESS_HEALTH_URL", "http://example/health")
        controller = MagicMock()
        controller.redeploy.side_effect = RailwayApiError("API down")

        with caplog.at_level("ERROR", logger="management.railway_scraper_cron"):
            assert start_browserless(controller) is False

        controller.wait_for_healthy.assert_not_called()
        assert any("Failed to redeploy Browserless" in record.message for record in caplog.records)

    def test_returns_false_when_health_check_times_out(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("BROWSERLESS_HEALTH_URL", "http://example/health")
        controller = MagicMock()
        controller.redeploy.return_value = Deployment(id="d1", status="DEPLOYING")
        controller.wait_for_healthy.return_value = False

        assert start_browserless(controller) is False

    def test_returns_true_on_success_and_passes_timeout(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("BROWSERLESS_HEALTH_URL", "http://example/health")
        monkeypatch.setenv("BROWSERLESS_HEALTH_TIMEOUT", "30")
        controller = MagicMock()
        controller.redeploy.return_value = Deployment(id="d1", status="DEPLOYING")
        controller.wait_for_healthy.return_value = True

        assert start_browserless(controller) is True
        controller.wait_for_healthy.assert_called_once_with("http://example/health", timeout=30.0)


@pytest.mark.unit
class TestStopBrowserless:
    def test_calls_stop(self) -> None:
        controller = MagicMock()
        stop_browserless(controller)
        controller.stop.assert_called_once()

    def test_swallows_exceptions(self, caplog: pytest.LogCaptureFixture) -> None:
        controller = MagicMock()
        controller.stop.side_effect = RailwayApiError("boom")

        with caplog.at_level("ERROR", logger="management.railway_scraper_cron"):
            stop_browserless(controller)  # must not raise

        assert any("Failed to stop Browserless" in record.message for record in caplog.records)

    def test_swallows_unexpected_exception_type(self) -> None:
        controller = MagicMock()
        controller.stop.side_effect = RuntimeError("anything")
        stop_browserless(controller)  # must not raise
