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

        result = asyncio.get_event_loop().run_until_complete(browser_manager.navigate_with_retry(page, "https://example.com", max_retries=2))

        assert result is True
        page.goto.assert_called_once()

    def test_returns_false_after_exhausted_retries(self, browser_manager):
        page = AsyncMock()
        page.goto = AsyncMock(side_effect=Exception("navigation failed"))

        result = asyncio.get_event_loop().run_until_complete(browser_manager.navigate_with_retry(page, "https://example.com", max_retries=2))

        assert result is False
        assert page.goto.call_count == 2
