"""Centralized Playwright browser service for browser automation.

Provides unified browser creation that auto-detects environment:
- Local development: Uses local Chromium via playwright
- Railway/Production: Uses Browserless v2 via WebSocket

This service replaces browser_service.py (Selenium) for Browserless v2 compatibility.
Browserless v2 removed Selenium/WebDriver support, only Playwright/Puppeteer work.
"""

import asyncio
import logging
import os
import random
from contextlib import asynccontextmanager
from dataclasses import dataclass, field
from typing import AsyncIterator, List, Optional

from playwright.async_api import Browser, BrowserContext, Page, Playwright, async_playwright

logger = logging.getLogger(__name__)


DEFAULT_USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


@dataclass
class PlaywrightOptions:
    """Configuration options for Playwright browser creation."""

    headless: bool = True
    viewport_width: int = 1920
    viewport_height: int = 1080
    user_agent: Optional[str] = None
    random_user_agent: bool = True
    timeout: int = 60000
    stealth_mode: bool = False
    disable_images: bool = False
    extra_args: List[str] = field(default_factory=list)
    wait_until: str = "domcontentloaded"  # networkidle, load, domcontentloaded, commit


@dataclass
class PlaywrightResult:
    """Result of browser creation with metadata."""

    browser: Browser
    context: BrowserContext
    page: Page
    is_remote: bool
    _playwright: Optional[Playwright] = field(default=None, repr=False)
    _owns_playwright: bool = field(default=False, repr=False)  # Track if we should stop playwright

    async def close(self) -> None:
        """Safely close browser resources including playwright instance if owned."""
        try:
            await self.page.close()
            await self.context.close()
            await self.browser.close()
        except Exception:
            pass
        finally:
            # Only stop playwright if this result owns it (non-singleton usage)
            if self._owns_playwright and self._playwright:
                try:
                    await self._playwright.stop()
                except Exception:
                    pass


@dataclass
class PageContentResult:
    """Result of page content fetch operation."""

    success: bool
    content: str = ""
    error: Optional[str] = None
    url: Optional[str] = None


class PlaywrightBrowserService:
    """Service for creating and managing Playwright browser instances.

    Auto-detects environment:
    - If BROWSERLESS_WS_ENDPOINT is set: Uses Browserless v2 (remote)
    - Otherwise: Uses local Chromium

    Environment variables:
    - BROWSERLESS_WS_ENDPOINT: WebSocket URL for Browserless (e.g., wss://host:3000)
    - BROWSERLESS_TOKEN: Authentication token for Browserless
    - USE_PLAYWRIGHT: Set to 'true' to enable Playwright (default: false for safety)
    """

    def __init__(self):
        self._endpoint = os.environ.get("BROWSERLESS_WS_ENDPOINT")
        self._token = os.environ.get("BROWSERLESS_TOKEN")
        self._enabled = os.environ.get("USE_PLAYWRIGHT", "false").lower() == "true"
        # Singleton Playwright instance to prevent pthread_create exhaustion
        self._playwright: Optional[Playwright] = None
        self._playwright_lock = asyncio.Lock()

    async def _get_or_start_playwright(self) -> Playwright:
        """Get shared Playwright instance, starting if needed.

        This prevents pthread_create exhaustion by reusing a single
        Playwright/Node.js process across all browser operations.
        """
        if self._playwright is None:
            async with self._playwright_lock:
                if self._playwright is None:
                    self._playwright = await async_playwright().start()
                    logger.info("Started shared Playwright instance")
        return self._playwright

    async def shutdown(self) -> None:
        """Stop shared Playwright instance on service shutdown."""
        if self._playwright:
            try:
                await self._playwright.stop()
                logger.info("Stopped shared Playwright instance")
            except Exception as e:
                logger.warning(f"Error stopping Playwright: {e}")
            finally:
                self._playwright = None

    @property
    def is_enabled(self) -> bool:
        """Check if Playwright is enabled via USE_PLAYWRIGHT env var."""
        return self._enabled

    @property
    def is_remote_mode(self) -> bool:
        """Check if using remote Browserless."""
        return bool(self._endpoint)

    def _build_ws_url(self) -> str:
        """Build WebSocket URL with token for Browserless connection."""
        if not self._endpoint:
            raise ValueError("BROWSERLESS_WS_ENDPOINT not configured")

        url = self._endpoint
        if self._token:
            separator = "&" if "?" in url else "?"
            url = f"{url}{separator}token={self._token}"

        return url

    async def create_browser(self, options: Optional[PlaywrightOptions] = None) -> PlaywrightResult:
        """Create a Playwright browser instance based on environment.

        Args:
            options: Browser configuration options. Uses defaults if not provided.

        Returns:
            PlaywrightResult containing browser, context, page, and metadata.
        """
        opts = options or PlaywrightOptions()

        if self.is_remote_mode:
            return await self._create_remote_browser(opts)
        return await self._create_local_browser(opts)

    async def _create_local_browser(self, opts: PlaywrightOptions) -> PlaywrightResult:
        """Create a local Chromium browser instance using shared Playwright."""
        try:
            playwright = await self._get_or_start_playwright()

            launch_args = [
                "--no-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
            ]
            launch_args.extend(opts.extra_args)

            browser = await playwright.chromium.launch(
                headless=opts.headless,
                args=launch_args,
            )

            context = await self._create_context(browser, opts)
            page = await context.new_page()

            if opts.stealth_mode:
                await self._apply_stealth_mode(page)

            logger.info("Created local Playwright browser")

            return PlaywrightResult(
                browser=browser,
                context=context,
                page=page,
                is_remote=False,
                _playwright=playwright,
                _owns_playwright=False,  # Shared instance - don't stop on close
            )
        except Exception as e:
            logger.error(f"Failed to create local Playwright browser: {e}")
            raise

    async def _create_remote_browser(self, opts: PlaywrightOptions) -> PlaywrightResult:
        """Create a remote Browserless browser instance via CDP with retry logic.

        Implements exponential backoff to handle transient connection failures
        and resource exhaustion on the Browserless service.

        Uses shared Playwright instance to prevent pthread_create exhaustion.
        Note: Uses 2 retries to limit nested retry explosion since
        get_page_content() has its own 2-retry loop (total max: 2 × 2 = 4 attempts).
        """
        max_retries = 2
        base_delay = 2.0
        ws_url = self._build_ws_url()

        playwright = await self._get_or_start_playwright()

        for attempt in range(max_retries):
            try:
                browser = await playwright.chromium.connect_over_cdp(ws_url)

                context = await self._create_context(browser, opts)
                page = await context.new_page()

                if attempt > 0:
                    logger.info(f"Created remote Playwright browser via Browserless (succeeded on attempt {attempt + 1})")
                else:
                    logger.info(f"Created remote Playwright browser via Browserless: {self._endpoint}")

                return PlaywrightResult(
                    browser=browser,
                    context=context,
                    page=page,
                    is_remote=True,
                    _playwright=playwright,
                    _owns_playwright=False,  # Shared instance - don't stop on close
                )

            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    logger.warning(f"Browserless connection failed (attempt {attempt + 1}/{max_retries}), " f"retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Browserless connection failed after {max_retries} attempts: {e}")
                    raise

    async def _create_context(self, browser: Browser, opts: PlaywrightOptions) -> BrowserContext:
        """Create browser context with configured options."""
        user_agent = opts.user_agent
        if not user_agent and opts.random_user_agent:
            user_agent = random.choice(DEFAULT_USER_AGENTS)

        context_options = {
            "viewport": {"width": opts.viewport_width, "height": opts.viewport_height},
        }

        if user_agent:
            context_options["user_agent"] = user_agent

        return await browser.new_context(**context_options)

    async def _apply_stealth_mode(self, page: Page) -> None:
        """Apply stealth JavaScript to bypass bot detection."""
        try:
            stealth_js = """
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });

            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });

            Object.defineProperty(navigator, 'languages', {
                get: () => ['en-US', 'en']
            });

            window.chrome = {
                runtime: {}
            };

            Object.defineProperty(navigator, 'permissions', {
                get: () => ({
                    query: () => Promise.resolve({ state: 'granted' })
                })
            });
            """
            await page.add_init_script(stealth_js)
            logger.debug("Applied stealth mode to Playwright browser")
        except Exception as e:
            logger.warning(f"Failed to apply stealth mode: {e}")

    @asynccontextmanager
    async def get_browser(self, options: Optional[PlaywrightOptions] = None) -> AsyncIterator[PlaywrightResult]:
        """Async context manager for browser lifecycle.

        Usage:
            service = PlaywrightBrowserService()
            async with service.get_browser(PlaywrightOptions(headless=True)) as browser:
                await browser.page.goto("https://example.com")
                content = await browser.page.content()

        Args:
            options: Browser configuration options.

        Yields:
            PlaywrightResult with browser, context, page, and metadata.
        """
        browser_result = None
        try:
            browser_result = await self.create_browser(options)
            yield browser_result
        finally:
            if browser_result:
                await browser_result.close()

    async def get_page_content(self, url: str, options: Optional[PlaywrightOptions] = None) -> PageContentResult:
        """Convenience method to fetch page content with automatic browser lifecycle.

        Creates browser, navigates to URL, gets content, then closes browser.
        This is the common pattern used by most scrapers.
        Includes retry logic for navigation failures.

        Args:
            url: URL to navigate to and fetch content from.
            options: Browser configuration options.

        Returns:
            PageContentResult with success status, content, and error info.
        """
        max_retries = 2  # Reduced from 3 to limit retry explosion (2 × 2 = 4 total attempts)
        base_delay = 1.0
        opts = options or PlaywrightOptions()

        for attempt in range(max_retries):
            try:
                async with self.get_browser(opts) as browser_result:
                    page = browser_result.page
                    await page.goto(url, wait_until=opts.wait_until, timeout=opts.timeout)
                    content = await page.content()
                    if attempt > 0:
                        logger.info(f"Successfully fetched {url} on attempt {attempt + 1}")
                    return PageContentResult(
                        success=True,
                        content=content,
                        url=url,
                    )
            except Exception as e:
                if attempt < max_retries - 1:
                    delay = base_delay * (2**attempt)
                    logger.warning(f"Failed to get page content from {url} (attempt {attempt + 1}/{max_retries}), " f"retrying in {delay}s: {e}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Failed to get page content from {url} after {max_retries} attempts: {e}")
                    return PageContentResult(
                        success=False,
                        content="",
                        error=str(e),
                        url=url,
                    )

    def health_check(self) -> dict:
        """Check browser service health.

        Returns:
            Dictionary with health status and configuration info.
        """
        return {
            "enabled": self.is_enabled,
            "mode": "remote" if self.is_remote_mode else "local",
            "endpoint": self._endpoint if self.is_remote_mode else None,
            "token_configured": bool(self._token),
        }


_playwright_service_instance: Optional[PlaywrightBrowserService] = None


def get_playwright_service() -> PlaywrightBrowserService:
    """Get the singleton PlaywrightBrowserService instance."""
    global _playwright_service_instance
    if _playwright_service_instance is None:
        _playwright_service_instance = PlaywrightBrowserService()
    return _playwright_service_instance
