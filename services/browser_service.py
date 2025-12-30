"""Centralized browser service for Selenium WebDriver management.

Provides unified browser creation that auto-detects environment:
- Local development: Uses local Chrome/chromedriver
- Railway/Production: Uses Browserless via webdriver.Remote()

This service is required because Chrome/chromedriver cannot run directly on Railway
(exit status 127 due to missing system libs). Browserless provides a hosted Chrome
instance accessible via WebDriver protocol.
"""

import logging
import os
import random
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Iterator, List, Optional

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.remote.webdriver import WebDriver

logger = logging.getLogger(__name__)


DEFAULT_USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
]


@dataclass
class BrowserOptions:
    """Configuration options for browser creation."""

    headless: bool = True
    window_size: tuple = (1920, 1080)
    user_agent: Optional[str] = None
    random_user_agent: bool = True
    page_load_timeout: int = 60
    implicit_wait: int = 10
    stealth_mode: bool = False
    disable_images: bool = False
    extra_arguments: List[str] = field(default_factory=list)


@dataclass
class BrowserResult:
    """Result of browser creation with metadata."""

    driver: WebDriver
    supports_cdp: bool
    is_remote: bool

    def quit(self) -> None:
        """Safely quit the driver."""
        try:
            self.driver.quit()
        except Exception:
            pass


class BrowserService:
    """Service for creating and managing browser instances.

    Auto-detects environment:
    - If BROWSER_WEBDRIVER_ENDPOINT is set: Uses Browserless (remote)
    - Otherwise: Uses local Chrome

    CDP (Chrome DevTools Protocol) commands only work with local Chrome,
    not with remote Browserless. The supports_cdp flag indicates whether
    CDP commands can be used.
    """

    def __init__(self):
        self._endpoint = os.environ.get("BROWSER_WEBDRIVER_ENDPOINT")
        self._token = os.environ.get("BROWSER_TOKEN")

    @property
    def is_remote_mode(self) -> bool:
        """Check if using remote Browserless."""
        return bool(self._endpoint)

    def create_driver(self, options: Optional[BrowserOptions] = None) -> BrowserResult:
        """Create a WebDriver instance based on environment.

        Args:
            options: Browser configuration options. Uses defaults if not provided.

        Returns:
            BrowserResult containing the driver and metadata.
        """
        opts = options or BrowserOptions()

        if self.is_remote_mode:
            return self._create_remote_driver(opts)
        return self._create_local_driver(opts)

    def _create_local_driver(self, opts: BrowserOptions) -> BrowserResult:
        """Create a local Chrome WebDriver instance."""
        chrome_options = self._build_chrome_options(opts)

        driver = webdriver.Chrome(options=chrome_options)
        self._configure_driver(driver, opts)

        if opts.stealth_mode:
            self._apply_stealth_mode(driver)

        return BrowserResult(
            driver=driver,
            supports_cdp=True,
            is_remote=False,
        )

    def _create_remote_driver(self, opts: BrowserOptions) -> BrowserResult:
        """Create a remote Browserless WebDriver instance."""
        chrome_options = self._build_chrome_options(opts)

        if self._token:
            chrome_options.set_capability("browserless:token", self._token)

        driver = webdriver.Remote(
            command_executor=self._endpoint,
            options=chrome_options,
        )
        self._configure_driver(driver, opts)

        logger.info(f"Created remote browser via Browserless: {self._endpoint}")

        return BrowserResult(
            driver=driver,
            supports_cdp=False,
            is_remote=True,
        )

    def _build_chrome_options(self, opts: BrowserOptions) -> Options:
        """Build Chrome options from BrowserOptions."""
        chrome_options = Options()

        if opts.headless:
            chrome_options.add_argument("--headless=new")

        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument(
            f"--window-size={opts.window_size[0]},{opts.window_size[1]}"
        )

        user_agent = opts.user_agent
        if not user_agent and opts.random_user_agent:
            user_agent = random.choice(DEFAULT_USER_AGENTS)
        if user_agent:
            chrome_options.add_argument(f"--user-agent={user_agent}")

        if opts.stealth_mode:
            chrome_options.add_argument("--disable-blink-features=AutomationControlled")
            chrome_options.add_experimental_option(
                "excludeSwitches", ["enable-automation"]
            )
            chrome_options.add_experimental_option("useAutomationExtension", False)

        if opts.disable_images:
            chrome_options.add_argument("--disable-images")
            prefs = {"profile.managed_default_content_settings.images": 2}
            chrome_options.add_experimental_option("prefs", prefs)

        for arg in opts.extra_arguments:
            chrome_options.add_argument(arg)

        return chrome_options

    def _configure_driver(self, driver: WebDriver, opts: BrowserOptions) -> None:
        """Configure driver with timeouts."""
        driver.set_page_load_timeout(opts.page_load_timeout)
        driver.implicitly_wait(opts.implicit_wait)

    def _apply_stealth_mode(self, driver: WebDriver) -> None:
        """Apply stealth JavaScript to bypass bot detection.

        Only works with local Chrome (CDP commands required).
        """
        try:
            driver.execute_cdp_cmd(
                "Emulation.setScriptExecutionDisabled", {"value": False}
            )

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
            driver.execute_script(stealth_js)
            logger.debug("Applied stealth mode to local browser")
        except Exception as e:
            logger.warning(f"Failed to apply stealth mode: {e}")

    @contextmanager
    def get_browser(
        self, options: Optional[BrowserOptions] = None
    ) -> Iterator[BrowserResult]:
        """Context manager for browser lifecycle.

        Usage:
            browser_service = BrowserService()
            with browser_service.get_browser(BrowserOptions(headless=True)) as browser:
                browser.driver.get("https://example.com")
                if browser.supports_cdp:
                    # CDP commands only work locally
                    browser.driver.execute_cdp_cmd(...)

        Args:
            options: Browser configuration options.

        Yields:
            BrowserResult with driver and metadata.
        """
        browser = None
        try:
            browser = self.create_driver(options)
            yield browser
        finally:
            if browser:
                browser.quit()

    def health_check(self) -> dict:
        """Check browser service health.

        Returns:
            Dictionary with health status and configuration info.
        """
        return {
            "mode": "remote" if self.is_remote_mode else "local",
            "endpoint": self._endpoint if self.is_remote_mode else None,
            "token_configured": bool(self._token),
        }


_browser_service_instance: Optional[BrowserService] = None


def get_browser_service() -> BrowserService:
    """Get the singleton BrowserService instance."""
    global _browser_service_instance
    if _browser_service_instance is None:
        _browser_service_instance = BrowserService()
    return _browser_service_instance
