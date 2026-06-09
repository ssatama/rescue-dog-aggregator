"""Tests for ScraperBrowserManager extracted from BaseScraper."""

import asyncio
from unittest.mock import AsyncMock, Mock, patch

import pytest

from scrapers.browser_manager import ScraperBrowserManager
from scrapers.validation.animal_validator import AnimalValidator
from services.null_objects import NullMetricsCollector


@pytest.fixture
def browser_manager():
    """Create a ScraperBrowserManager with mocked dependencies."""
    return ScraperBrowserManager(
        logger=Mock(),
        metrics_collector=NullMetricsCollector(),
        rate_limit_delay=0.0,
        max_retries=3,
        retry_backoff_factor=2.0,
        animal_validator=AnimalValidator(logger=Mock()),
    )


@pytest.mark.unit
class TestScrapeWithRetry:
    @patch.dict("os.environ", {"USE_PLAYWRIGHT": "true"})
    def test_returns_result_on_success(self, browser_manager):
        scrape_fn = Mock(return_value={"name": "Buddy", "breed": "Lab"})

        result = browser_manager.scrape_with_retry(scrape_fn)

        scrape_fn.assert_called_once()
        assert result == {"name": "Buddy", "breed": "Lab"}

    @patch.dict("os.environ", {"USE_PLAYWRIGHT": "true"})
    def test_retries_on_failure_then_succeeds(self, browser_manager):
        scrape_fn = Mock(side_effect=[Exception("timeout"), {"name": "Max", "breed": "Poodle"}])

        result = browser_manager.scrape_with_retry(scrape_fn)

        assert scrape_fn.call_count == 2
        assert result == {"name": "Max", "breed": "Poodle"}

    @patch.dict("os.environ", {"USE_PLAYWRIGHT": "true"})
    def test_returns_none_after_exhausted_retries(self, browser_manager):
        scrape_fn = Mock(side_effect=Exception("always fails"))

        result = browser_manager.scrape_with_retry(scrape_fn)

        assert scrape_fn.call_count == 3
        assert result is None

    @patch.dict("os.environ", {"USE_PLAYWRIGHT": "true"})
    def test_rejects_invalid_name(self, browser_manager):
        scrape_fn = Mock(return_value={"name": "", "breed": "Lab"})

        result = browser_manager.scrape_with_retry(scrape_fn)

        assert result is None

    @patch.dict("os.environ", {"USE_PLAYWRIGHT": "true"})
    def test_returns_non_dict_result_directly(self, browser_manager):
        scrape_fn = Mock(return_value=["item1", "item2"])

        result = browser_manager.scrape_with_retry(scrape_fn)

        assert result == ["item1", "item2"]


@pytest.mark.unit
class TestNavigateWithRetry:
    def test_returns_true_on_success(self, browser_manager):
        page = AsyncMock()
        page.goto = AsyncMock()

        result = asyncio.run(browser_manager.navigate_with_retry(page, "https://example.com", max_retries=2))

        assert result is True
        page.goto.assert_called_once()

    def test_returns_false_after_exhausted_retries(self, browser_manager):
        page = AsyncMock()
        page.goto = AsyncMock(side_effect=Exception("navigation failed"))

        result = asyncio.run(browser_manager.navigate_with_retry(page, "https://example.com", max_retries=2))

        assert result is False
        assert page.goto.call_count == 2


@pytest.mark.unit
class TestWithBrowserRetry:
    """Pins the async-generator retry contract: a previous implementation
    yielded twice across retries inside an @asynccontextmanager, raising
    `RuntimeError: generator didn't stop after athrow()` and masking the
    real exception when the caller's body raised.
    """

    def _patch_service(self, get_browser_factory):
        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def fake_get_browser(_opts):
            async with get_browser_factory() as result:
                yield result

        service = Mock()
        service.get_browser = fake_get_browser
        return patch("scrapers.browser_manager.get_playwright_service", return_value=service)

    def test_body_exception_propagates_without_runtime_error(self, browser_manager):
        from contextlib import asynccontextmanager

        close_called = False

        @asynccontextmanager
        async def get_browser_factory():
            nonlocal close_called
            try:
                yield Mock(name="PlaywrightResult")
            finally:
                close_called = True

        async def run():
            with self._patch_service(get_browser_factory):
                async with browser_manager.with_browser_retry(max_retries=3, base_delay=0.0):
                    raise ValueError("simulated body failure")

        with pytest.raises(ValueError, match="simulated body failure"):
            asyncio.new_event_loop().run_until_complete(run())

        assert close_called, "browser cleanup must run even when the body raises"

    def test_retries_browser_acquisition_failure(self, browser_manager):
        from contextlib import asynccontextmanager

        attempts = {"count": 0}

        @asynccontextmanager
        async def get_browser_factory():
            attempts["count"] += 1
            if attempts["count"] == 1:
                raise ConnectionError("browserless cold start")
            yield Mock(name="PlaywrightResult")

        async def run():
            with self._patch_service(get_browser_factory):
                async with browser_manager.with_browser_retry(max_retries=3, base_delay=0.0) as result:
                    return result

        result = asyncio.new_event_loop().run_until_complete(run())
        assert result is not None
        assert attempts["count"] == 2

    def test_raises_last_error_after_exhausted_acquisition_retries(self, browser_manager):
        from contextlib import asynccontextmanager

        @asynccontextmanager
        async def get_browser_factory():
            raise ConnectionError("browserless unreachable")
            yield  # pragma: no cover

        async def run():
            with self._patch_service(get_browser_factory):
                async with browser_manager.with_browser_retry(max_retries=2, base_delay=0.0):
                    pass

        with pytest.raises(ConnectionError, match="browserless unreachable"):
            asyncio.new_event_loop().run_until_complete(run())

    def test_does_not_retry_after_yield(self, browser_manager):
        from contextlib import asynccontextmanager

        attempts = {"count": 0}

        @asynccontextmanager
        async def get_browser_factory():
            attempts["count"] += 1
            yield Mock(name="PlaywrightResult")

        async def run():
            with self._patch_service(get_browser_factory):
                async with browser_manager.with_browser_retry(max_retries=3, base_delay=0.0):
                    raise RuntimeError("after yield")

        with pytest.raises(RuntimeError, match="after yield"):
            asyncio.new_event_loop().run_until_complete(run())

        assert attempts["count"] == 1
