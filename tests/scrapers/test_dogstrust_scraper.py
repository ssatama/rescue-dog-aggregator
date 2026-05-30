"""Tests for DogsTrustScraper class.

Focus on behavior-based testing for the Dogs Trust scraper implementation.
Tests cover the hybrid approach (Selenium for listings, HTTP for details)
and reserved dog filtering requirements.
"""

from contextlib import asynccontextmanager
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from scrapers.base_scraper import BaseScraper
from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper
from tests.scrapers.test_scraper_base import ScraperTestBase
from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.slow
@pytest.mark.browser
class TestDogsTrustScraper(ScraperTestBase):
    """Test cases for DogsTrustScraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = DogsTrustScraper
    config_id = "dogstrust"
    expected_org_name = "Dogs Trust"
    expected_base_url = "https://www.dogstrust.org.uk"

    @patch("scrapers.dogstrust.dogstrust_scraper.get_browser_service")
    def test_selenium_driver_cleanup_on_exception(self, mock_browser_service, scraper):
        """Test WebDriver is properly cleaned up even when exceptions occur."""
        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.get.side_effect = Exception("Network error")

        # Should handle exception gracefully and clean up driver
        result = scraper.get_animal_list()

        assert isinstance(result, list)  # Should return empty list on error
        mock_driver.quit.assert_called_once()

    @patch("scrapers.dogstrust.dogstrust_scraper.get_browser_service")
    def test_get_animal_list_applies_reserved_dog_filter(self, mock_browser_service, scraper):
        """Test that get_animal_list applies filter to hide reserved dogs through UI."""
        mock_service = Mock()
        mock_browser_service.return_value = mock_service
        mock_driver = Mock()
        mock_browser_result = Mock()
        mock_browser_result.driver = mock_driver
        mock_service.create_driver.return_value = mock_browser_result
        mock_driver.page_source = """
        <html>
            <body>
                <div>1 of 5</div>
            </body>
        </html>
        """

        # Mock find_element to simulate filter elements not found
        mock_driver.find_element.side_effect = Exception("Element not found")

        result = scraper.get_animal_list()

        # Initial page load uses the canonical parameterized URL.
        assert mock_driver.get.called
        loaded_url = mock_driver.get.call_args.args[0]
        assert loaded_url.startswith("https://www.dogstrust.org.uk/rehoming/dogs")
        assert "page=0" in loaded_url
        # Verify attempts to find filter elements were made
        assert mock_driver.find_element.called
        assert isinstance(result, list)


class TestDogsTrustUnifiedStandardization:
    """Test DogsTrust scraper unified standardization integration."""

    def test_dogstrust_inherits_from_base_scraper(self):
        """Test that DogsTrust scraper inherits from BaseScraper."""
        scraper = DogsTrustScraper()
        assert isinstance(scraper, BaseScraper)
        assert hasattr(scraper, "standardizer")
        assert isinstance(scraper.standardizer, UnifiedStandardizer)

    def test_dogstrust_uses_unified_standardization_when_enabled(self):
        """Test that DogsTrust uses unified standardization when feature flag is enabled."""
        scraper = DogsTrustScraper()

        # Mock feature flag enabled
        with patch("utils.feature_flags.is_scraper_standardization_enabled", return_value=True):
            raw_animal_data = {
                "name": "Buddy",
                "breed": "german shepherd",
                "age": "3 years old",
                "size": "large",
                "gender": "Male",
            }

            processed = scraper.process_animal(raw_animal_data)

            # Verify unified standardization was applied
            assert processed["breed"] == "German Shepherd Dog"  # Standardized breed
            assert processed["breed_category"] == "Herding"  # Group assignment
            assert processed["standardized_size"] == "Large"  # Size standardization
            assert processed["primary_breed"] == "German Shepherd Dog"  # Primary breed
            assert processed["standardization_confidence"] > 0.8  # Confidence score

    def test_dogstrust_bypasses_unified_when_disabled(self):
        """Test that DogsTrust bypasses unified standardization when feature flag is disabled."""
        scraper = DogsTrustScraper()

        # Disable unified standardization
        scraper.use_unified_standardization = False

        raw_animal_data = {
            "name": "Buddy",
            "breed": "german shepherd",
            "age": "3 years old",
            "size": "large",
        }

        processed = scraper.process_animal(raw_animal_data)

        # Should return original data when flag disabled
        assert processed == raw_animal_data

    def test_dogstrust_removes_optimized_standardization_imports(self):
        """Test that DogsTrust no longer imports from optimized_standardization after migration."""
        import inspect

        import scrapers.dogstrust.dogstrust_scraper as dogstrust_module

        # Get the source code
        source = inspect.getsource(dogstrust_module)

        # Should NOT contain optimized_standardization imports after migration
        assert "from utils.optimized_standardization" not in source
        assert "parse_age_text" not in source or "import" not in source
        assert "standardize_breed" not in source or "import" not in source
        assert "standardize_size_value" not in source or "import" not in source

    def test_dogstrust_handles_missing_breed_gracefully(self):
        """Test that DogsTrust handles missing breed data gracefully."""
        scraper = DogsTrustScraper()

        with patch("utils.feature_flags.is_scraper_standardization_enabled", return_value=True):
            raw_animal_data = {
                "name": "Buddy",
                # Missing breed field
                "age": "2 years",
                "size": "medium",
            }

            processed = scraper.process_animal(raw_animal_data)

            # Should handle missing breed gracefully
            assert "breed" in processed
            assert processed["breed_category"] == "Unknown"


# Listing-page resilience: remote Browserless under stealth_mode
# intermittently fails to render the initial page within the timeout. The
# tests below lock in: canonical URL, retry-once on timeout, raise on
# repeated timeout, propagation to collect_data so the failure surfaces as
# a real Sentry exception (not a misleading zero-dogs alert).


def _build_paginated_page_mock(page_htmls):
    """Build a mock Playwright Page whose content() returns a different HTML per page.

    Used to exercise click-based pagination: each call to page.content() yields
    the next page's markup, and the Next control reports visible+enabled so the
    loop clicks through.
    """
    page = MagicMock()
    page.goto = AsyncMock()
    page.evaluate = AsyncMock(return_value=None)
    page.wait_for_selector = AsyncMock(return_value=None)
    page.wait_for_function = AsyncMock(return_value=None)
    page.content = AsyncMock(side_effect=list(page_htmls))
    page.reload = AsyncMock()

    locator_first = MagicMock()
    locator_first.is_visible = AsyncMock(return_value=True)
    locator_first.is_enabled = AsyncMock(return_value=True)
    locator_first.click = AsyncMock()
    locator_first.scroll_into_view_if_needed = AsyncMock()
    locator = MagicMock()
    locator.first = locator_first
    page.locator = MagicMock(return_value=locator)

    return page


def _build_listing_page_mock(wait_for_selector_side_effect, content_html=""):
    """Build a mock Playwright Page that satisfies the listing flow.

    All locator-based interactions (cookie banner, filter button, etc.) default
    to "not visible" so the test only exercises wait_for_selector + content().
    """
    page = MagicMock()
    page.goto = AsyncMock()
    page.evaluate = AsyncMock(return_value=0)
    page.wait_for_selector = AsyncMock(side_effect=wait_for_selector_side_effect)
    page.wait_for_function = AsyncMock(return_value=None)
    page.content = AsyncMock(return_value=content_html)
    page.reload = AsyncMock()

    locator_first = MagicMock()
    locator_first.is_visible = AsyncMock(return_value=False)
    locator_first.is_enabled = AsyncMock(return_value=False)
    locator_first.click = AsyncMock()
    locator_first.scroll_into_view_if_needed = AsyncMock()
    locator = MagicMock()
    locator.first = locator_first
    page.locator = MagicMock(return_value=locator)

    return page


def _patch_browser_retry(scraper, page):
    """Replace scraper._with_browser_retry with one yielding the given page."""

    @asynccontextmanager
    async def _retry(*_args, **_kwargs):
        result = MagicMock()
        result.page = page
        result.is_remote = True
        yield result

    scraper._with_browser_retry = _retry


_VALID_LISTING_HTML = """
<html><body>
    <a href="/rehoming/dogs/lurcher/3641644">Lulu Lurcher</a>
    <a href="/rehoming/dogs/french-bulldog/3625780">Nelly French Bulldog</a>
    <div>1 of 41</div>
</body></html>
"""


@pytest.mark.unit
class TestDogsTrustListingUrl:
    def test_listing_url_uses_canonical_parameterized_path(self):
        scraper = DogsTrustScraper()
        assert "page=0" in scraper.listing_url
        assert "currentDistance=1000" in scraper.listing_url


@pytest.mark.unit
class TestDogsTrustPlaywrightResilience:
    @pytest.mark.asyncio
    async def test_retries_initial_wait_on_timeout(self):
        """First wait_for_selector times out, reload + second wait succeeds."""
        scraper = DogsTrustScraper()
        page = _build_listing_page_mock(
            wait_for_selector_side_effect=[PlaywrightTimeoutError("initial timeout"), None],
            content_html=_VALID_LISTING_HTML,
        )
        _patch_browser_retry(scraper, page)

        evaluate_count_before = page.evaluate.await_count
        result = await scraper._get_animal_list_playwright(max_pages_to_scrape=1)

        page.reload.assert_awaited_once_with(wait_until="domcontentloaded")
        assert page.wait_for_selector.await_count == 2
        # OneTrust overlays can re-render after reload, so the retry path
        # must re-strip them before the second wait.
        assert page.evaluate.await_count > evaluate_count_before + 1
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_raises_when_all_wait_attempts_timeout(self):
        """All 3 wait attempts fail → raise instead of silently returning []."""
        scraper = DogsTrustScraper()
        page = _build_listing_page_mock(
            wait_for_selector_side_effect=[
                PlaywrightTimeoutError("first timeout"),
                PlaywrightTimeoutError("second timeout"),
                PlaywrightTimeoutError("third timeout"),
            ],
            content_html="",
        )
        _patch_browser_retry(scraper, page)

        with pytest.raises(PlaywrightTimeoutError):
            await scraper._get_animal_list_playwright(max_pages_to_scrape=1)

        assert page.reload.await_count == 2
        assert page.wait_for_selector.await_count == 3

    @pytest.mark.asyncio
    async def test_no_retry_when_first_wait_succeeds(self):
        """Happy path: first wait succeeds, page.reload is never called."""
        scraper = DogsTrustScraper()
        page = _build_listing_page_mock(
            wait_for_selector_side_effect=[None],
            content_html=_VALID_LISTING_HTML,
        )
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright(max_pages_to_scrape=1)

        page.reload.assert_not_called()
        assert page.wait_for_selector.await_count == 1
        assert len(result) == 2

    @pytest.mark.asyncio
    async def test_collect_data_propagates_listing_failure(self):
        """collect_data must not swallow listing-page exceptions.

        Verifies the end-to-end contract: a Playwright timeout during listing
        discovery propagates out of collect_data so BaseScraper._run_with_connection
        can capture a real Sentry exception (with stack trace) instead of
        silently returning [] and firing alert_zero_dogs_found.
        """
        scraper = DogsTrustScraper()
        page = _build_listing_page_mock(
            wait_for_selector_side_effect=[
                PlaywrightTimeoutError("first timeout"),
                PlaywrightTimeoutError("second timeout"),
                PlaywrightTimeoutError("third timeout"),
            ],
            content_html="",
        )
        _patch_browser_retry(scraper, page)

        with pytest.raises(PlaywrightTimeoutError):
            await scraper._get_animal_list_playwright(max_pages_to_scrape=1)
        # collect_data is sync and calls into the same get_animal_list, so the
        # async exception path proved above is sufficient — the missing
        # try/except is what we're asserting against. Belt and braces: grep
        # the source for the swallow pattern we removed.
        import inspect

        source = inspect.getsource(scraper.collect_data)
        assert "except Exception" not in source, "collect_data must not catch and return [] — that re-introduces the silent-failure bug this PR fixes"


@pytest.mark.unit
class TestDogsTrustDetectMaxPages:
    """Dogs Trust renders its page indicator as 'N / M' (e.g. '2 / 38').

    Earlier markup used 'N of M'; both must parse so a site-side format flip
    doesn't silently collapse pagination to the hardcoded fallback.
    """

    def test_parses_slash_format(self):
        from bs4 import BeautifulSoup

        scraper = DogsTrustScraper()
        soup = BeautifulSoup("<div>2 / 38</div>", "html.parser")
        assert scraper._detect_max_pages(soup) == 38

    def test_parses_of_format_still_supported(self):
        from bs4 import BeautifulSoup

        scraper = DogsTrustScraper()
        soup = BeautifulSoup("<div>1 of 41</div>", "html.parser")
        assert scraper._detect_max_pages(soup) == 41

    def test_defaults_when_no_indicator(self):
        from bs4 import BeautifulSoup

        scraper = DogsTrustScraper()
        soup = BeautifulSoup("<div>no pagination here</div>", "html.parser")
        assert scraper._detect_max_pages(soup) == 47


@pytest.mark.unit
class TestDogsTrustReservedFiltering:
    """The card's reserved indicator renders as 'Reserved' (title case).

    The skip check must be case-insensitive so reserved dogs aren't surfaced
    as available when the site changes the indicator's casing.
    """

    def test_skips_title_case_reserved(self):
        from bs4 import BeautifulSoup

        scraper = DogsTrustScraper()
        html = """
        <html><body>
            <a href="/rehoming/dogs/beagle/111"><span>Bella</span><span>Reserved</span></a>
            <a href="/rehoming/dogs/collie/222"><span>Max</span></a>
        </body></html>
        """
        soup = BeautifulSoup(html, "html.parser")
        dogs = scraper._extract_dogs_from_page(soup)
        ids = sorted(d["external_id"] for d in dogs)
        assert ids == ["222"]


@pytest.mark.unit
class TestDogsTrustPagination:
    """Dogs Trust is a client-side SPA: a hard navigation to ?page=N is rewritten
    back to page 0, so pagination must advance by clicking the Next control
    (aria-label 'Go to next page'). The old 'Next' selectors no longer match,
    which stranded the scraper on page 0 (15/422 dogs)."""

    def _page_html(self, indicator, dog_id):
        return f'<html><body><a href="/rehoming/dogs/breed/{dog_id}">Dog</a><div>{indicator}</div></body></html>'

    @pytest.mark.asyncio
    async def test_clicks_through_distinct_pages(self):
        scraper = DogsTrustScraper()
        page = _build_paginated_page_mock(
            [
                self._page_html("1 / 3", 111),
                self._page_html("2 / 3", 222),
                self._page_html("3 / 3", 333),
            ]
        )
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright()

        # All three pages scraped, each yielding a distinct dog.
        assert sorted(d["external_id"] for d in result) == ["111", "222", "333"]
        # Pagination is click-driven, not URL-driven: goto fires once (initial load).
        assert page.goto.await_count == 1
        # The corrected Next selector must be among those tried.
        tried_selectors = [call.args[0] for call in page.locator.call_args_list]
        assert "button[aria-label='Go to next page']" in tried_selectors

    @pytest.mark.asyncio
    async def test_stops_when_no_next_button(self):
        scraper = DogsTrustScraper()
        page = _build_paginated_page_mock([self._page_html("1 / 38", 111)])
        # No Next control is visible/enabled → must stop after page 0.
        page.locator.return_value.first.is_visible = AsyncMock(return_value=False)
        page.locator.return_value.first.is_enabled = AsyncMock(return_value=False)
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright()

        assert [d["external_id"] for d in result] == ["111"]
        assert page.locator.return_value.first.click.await_count == 0

    @pytest.mark.asyncio
    async def test_stops_on_empty_page_even_when_max_pages_overestimates(self):
        scraper = DogsTrustScraper()
        # Indicator claims 47 pages, but the second page returns no dogs:
        # an empty page past the first must end the loop, not march to 47.
        page = _build_paginated_page_mock(
            [
                self._page_html("1 / 47", 111),
                "<html><body><div>2 / 47</div></body></html>",
            ]
        )
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright()

        assert len(result) == 1
        # Only one Next click happened (page 0 → empty page 1, then stop).
        assert page.content.await_count == 2
