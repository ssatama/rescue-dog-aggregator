import asyncio
import logging
import sys
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from playwright.async_api import Page

from services.playwright_browser_service import (
    PlaywrightOptions,
    PlaywrightResult,
    get_playwright_service,
)


class ScraperBrowserManager:
    """Retries Playwright browser acquisition and page navigation for scrapers."""

    # Detail pages go through BaseScraper.fetch_details, which reads the
    # scraper's live rate_limit_delay (#567); this only retries the browser.
    def __init__(self, logger: logging.Logger):
        self.logger = logger

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

        cm = None
        result: PlaywrightResult | None = None
        last_error: Exception | None = None
        for attempt in range(max_retries):
            candidate = playwright_service.get_browser(opts)
            try:
                result = await candidate.__aenter__()
                cm = candidate
                break
            except Exception as e:
                last_error = e
                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    self.logger.warning(f"Browser acquisition failed (attempt {attempt + 1}/{max_retries}), retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    self.logger.error(f"Browser acquisition failed after {max_retries} attempts: {e}")

        if cm is None or result is None:
            assert last_error is not None
            raise last_error

        try:
            yield result
        except BaseException:
            if not await cm.__aexit__(*sys.exc_info()):
                raise
        else:
            await cm.__aexit__(None, None, None)

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
