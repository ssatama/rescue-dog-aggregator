"""A stand-in for the Playwright browser service in scraper tests (#566).

Playwright is the only browser path, so scraper tests patch the module's
``get_playwright_service`` with this and serve saved HTML from ``page.content()``.
"""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock


def fake_page(html: str = "<html><body></body></html>") -> MagicMock:
    """A page whose navigation and scrolling do nothing and whose content is ``html``."""
    page = MagicMock()
    page.goto = AsyncMock()
    page.content = AsyncMock(return_value=html)
    page.evaluate = AsyncMock(return_value=0)
    page.wait_for_selector = AsyncMock()
    page.wait_for_load_state = AsyncMock()
    page.wait_for_timeout = AsyncMock()
    page.close = AsyncMock()
    return page


def fake_playwright_service(page: MagicMock | None = None, error: Exception | None = None) -> MagicMock:
    """A service whose ``get_browser`` yields ``page``, or raises ``error``."""
    page = page if page is not None else fake_page()

    @asynccontextmanager
    async def get_browser(options=None):
        if error:
            raise error
        yield MagicMock(page=page, context=MagicMock(new_page=AsyncMock(return_value=page)), is_remote=False)

    service = MagicMock()
    service.get_browser = MagicMock(side_effect=get_browser)
    service.page = page
    return service
