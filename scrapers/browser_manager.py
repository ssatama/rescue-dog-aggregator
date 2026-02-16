import asyncio
import logging
import os
import time
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.async_api import Page

from scrapers.validation.animal_validator import AnimalValidator
from services.null_objects import NullMetricsCollector
from services.playwright_browser_service import (
    PlaywrightOptions,
    PlaywrightResult,
    get_playwright_service,
)


class ScraperBrowserManager:
    """Manages browser retry logic for scrapers (Selenium and Playwright)."""

    def __init__(
        self,
        logger: logging.Logger,
        metrics_collector: NullMetricsCollector,
        rate_limit_delay: float,
        max_retries: int,
        retry_backoff_factor: float,
        animal_validator: AnimalValidator,
    ):
        self.logger = logger
        self.metrics_collector = metrics_collector
        self.rate_limit_delay = rate_limit_delay
        self.max_retries = max_retries
        self.retry_backoff_factor = retry_backoff_factor
        self.animal_validator = animal_validator

    def scrape_with_retry(self, scrape_method, *args, **kwargs):
        """Execute scraping method with retry logic for connection errors.

        Args:
            scrape_method: Method to call for scraping
            *args, **kwargs: Arguments to pass to scrape_method

        Returns:
            Result from scrape_method or None if all retries exhausted
        """
        use_playwright = os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true"

        if use_playwright:
            browser_exceptions = (Exception,)
        else:
            from selenium.common.exceptions import TimeoutException, WebDriverException

            browser_exceptions = (TimeoutException, WebDriverException, ValueError)

        for attempt in range(self.max_retries):
            try:
                result = scrape_method(*args, **kwargs)

                if result and isinstance(result, dict):
                    name = result.get("name", "")
                    if not self.animal_validator.is_valid_name(name):
                        self.logger.warning(f"Invalid name detected: {name}, treating as failure")
                        raise ValueError(f"Invalid animal name: {name}")

                if attempt > 0:
                    self.metrics_collector.track_retry(success=True)

                return result

            except browser_exceptions as e:
                self.metrics_collector.track_retry(success=False)
                self.logger.warning(f"Scraping attempt {attempt + 1}/{self.max_retries} failed: {e}")

                if attempt < self.max_retries - 1:
                    delay = self.rate_limit_delay * (self.retry_backoff_factor**attempt)
                    self.logger.info(f"Retrying in {delay}s...")
                    time.sleep(delay)
                else:
                    self.logger.error(f"All {self.max_retries} attempts failed for {args}")

        return None

    @asynccontextmanager
    async def with_browser_retry(
        self,
        options: PlaywrightOptions | None = None,
        max_retries: int = 3,
        base_delay: float = 2.0,
    ) -> AsyncIterator[PlaywrightResult]:
        """Browser context manager with retry on connection/navigation failures.

        Args:
            options: Playwright browser options
            max_retries: Maximum number of retry attempts
            base_delay: Base delay in seconds (doubled each retry)

        Yields:
            PlaywrightResult with browser, context, page, and metadata
        """
        playwright_service = get_playwright_service()
        opts = options or PlaywrightOptions()

        last_error: Exception | None = None
        for attempt in range(max_retries):
            try:
                async with playwright_service.get_browser(opts) as result:
                    yield result
                    return
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    self.logger.warning(f"Browser operation failed (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    self.logger.error(f"Browser operation failed after {max_retries} attempts: {e}")

        if last_error:
            raise last_error

    async def navigate_with_retry(
        self,
        page: "Page",
        url: str,
        max_retries: int = 3,
        wait_until: str = "domcontentloaded",
        timeout: int = 60000,
    ) -> bool:
        """Navigate to URL with retry logic for transient failures.

        Args:
            page: Playwright page object
            url: URL to navigate to
            max_retries: Maximum number of retry attempts
            wait_until: Playwright wait_until option
            timeout: Navigation timeout in milliseconds

        Returns:
            True if navigation succeeded, False otherwise
        """
        for attempt in range(max_retries):
            try:
                await page.goto(url, wait_until=wait_until, timeout=timeout)
                return True
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = 2**attempt
                    self.logger.warning(f"Navigation to {url} failed (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    self.logger.error(f"Navigation to {url} failed after {max_retries} attempts: {e}")
                    return False
        return False
