"""Tests for DogsTrustScraper class.

Focus on behavior-based testing for the Dogs Trust scraper implementation.
Tests cover the hybrid approach (Selenium for listings, HTTP for details)
and reserved dog filtering requirements.
"""

from contextlib import asynccontextmanager
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import pytest
from playwright.async_api import Error as PlaywrightError
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from scrapers.base_scraper import BaseScraper
from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper
from scrapers.request_pacing import ListingIncompleteError
from scrapers.scrape_stats import ScrapeStats
from tests.scrapers.test_scraper_base import ScraperTestBase
from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.browser
class TestDogsTrustScraper(ScraperTestBase):
    """Test cases for DogsTrustScraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = DogsTrustScraper
    config_id = "dogstrust"
    expected_org_name = "Dogs Trust"
    expected_base_url = "https://www.dogstrust.org.uk"

    def test_the_listing_loads_the_available_dogs_url(self, scraper):
        """The first load is the canonical filtered URL, page 0; pages after it are clicked."""
        page = _build_paginated_page_mock(['<html><body><a href="/rehoming/dogs/breed/111">Dog</a><div>1 / 1</div></body></html>'])
        _patch_browser_retry(scraper, page)

        with patch("scrapers.dogstrust.dogstrust_scraper.asyncio.sleep", new=AsyncMock()):
            result = scraper.get_animal_list()

        loaded_url = page.goto.await_args.args[0]
        assert loaded_url.startswith("https://www.dogstrust.org.uk/rehoming/dogs")
        assert "page=0" in loaded_url
        assert [dog["external_id"] for dog in result] == ["111"]


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

        raw_animal_data = {
            "name": "Buddy",
            # Missing breed field
            "age": "2 years",
            "size": "medium",
        }

        processed = scraper.process_animal(raw_animal_data)

        # Should handle missing breed gracefully
        assert processed["breed"] is None  # not "Unknown" (#568)
        assert processed["breed_category"] is None


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
    """Replace browser_manager.with_browser_retry with one yielding the given page."""

    @asynccontextmanager
    async def _retry(*_args, **_kwargs):
        result = MagicMock()
        result.page = page
        result.is_remote = True
        yield result

    scraper.browser_manager.with_browser_retry = _retry


LISTINGS = Path(__file__).resolve().parents[1] / "fixtures" / "listings"
LIVE_PAGE_1 = (LISTINGS / "dogstrust_page1.html").read_text()
LIVE_PAGE_36 = (LISTINGS / "dogstrust_page36.html").read_text()

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
class TestDogsTrustBrowserDropRetry:
    """Browserless v2 sessions occasionally close mid-pagination, surfacing as a
    TargetClosedError at page.content(). get_animal_list must retry the whole
    scrape from a fresh browser rather than losing the run on a transient drop.
    """

    _CLOSED_MESSAGE = "Page.content: Target page, context or browser has been closed"

    @patch("scrapers.dogstrust.dogstrust_scraper.time.sleep")
    def test_retries_whole_scrape_on_browser_drop(self, mock_sleep):
        scraper = DogsTrustScraper()
        dogs = [{"external_id": "1"}, {"external_id": "2"}]
        attempt = AsyncMock(side_effect=[PlaywrightError(self._CLOSED_MESSAGE), dogs])
        scraper._get_animal_list_playwright = attempt

        result = scraper.get_animal_list()

        assert result == dogs
        assert attempt.await_count == 2
        mock_sleep.assert_called_once()

    @patch("scrapers.dogstrust.dogstrust_scraper.time.sleep")
    def test_reraises_after_exhausting_retries(self, mock_sleep):
        scraper = DogsTrustScraper()
        attempt = AsyncMock(side_effect=PlaywrightError(self._CLOSED_MESSAGE))
        scraper._get_animal_list_playwright = attempt

        with pytest.raises(PlaywrightError):
            scraper.get_animal_list()

        assert attempt.await_count == 3

    @patch("scrapers.dogstrust.dogstrust_scraper.time.sleep")
    def test_does_not_retry_non_browser_closed_error(self, mock_sleep):
        scraper = DogsTrustScraper()
        attempt = AsyncMock(side_effect=PlaywrightTimeoutError("initial page load timed out"))
        scraper._get_animal_list_playwright = attempt

        with pytest.raises(PlaywrightTimeoutError):
            scraper.get_animal_list()

        assert attempt.await_count == 1
        mock_sleep.assert_not_called()


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
        # No guessed ceiling: without a count, the listing ends on an empty page or no Next
        assert scraper._detect_max_pages(soup) is None


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

    @pytest.fixture(autouse=True)
    def _no_real_sleep(self):
        """Skip the rate-limit/scroll sleeps so these stay unit-fast (<10ms)."""
        with patch("scrapers.dogstrust.dogstrust_scraper.asyncio.sleep", new=AsyncMock()):
            yield

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
    async def test_no_next_button_before_the_last_page_raises(self):
        """Review of #641: with an exact indicator ("1 / 38"), a missing Next
        control on page 1 means the listing stopped early, not that it ended."""
        scraper = DogsTrustScraper()
        page = _build_paginated_page_mock([self._page_html("1 / 38", 111)])
        page.locator.return_value.first.is_visible = AsyncMock(return_value=False)
        page.locator.return_value.first.is_enabled = AsyncMock(return_value=False)
        _patch_browser_retry(scraper, page)

        with pytest.raises(ListingIncompleteError):
            await scraper._get_animal_list_playwright()

    @pytest.mark.asyncio
    async def test_without_an_indicator_no_next_button_is_the_end(self):
        scraper = DogsTrustScraper()
        page = _build_paginated_page_mock(['<html><body><a href="/rehoming/dogs/breed/111">Dog</a></body></html>'])
        page.locator.return_value.first.is_visible = AsyncMock(return_value=False)
        page.locator.return_value.first.is_enabled = AsyncMock(return_value=False)
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright()

        assert [d["external_id"] for d in result] == ["111"]

    @pytest.mark.asyncio
    async def test_an_empty_page_before_the_last_raises(self):
        scraper = DogsTrustScraper()
        page = _build_paginated_page_mock([self._page_html("1 / 47", 111), "<html><body><div>2 / 47</div></body></html>"])
        _patch_browser_retry(scraper, page)

        with pytest.raises(ListingIncompleteError):
            await scraper._get_animal_list_playwright()

    @pytest.mark.asyncio
    async def test_a_page_of_reserved_dogs_is_read_past(self):
        """Review of #641: the hide-reserved filter isn't applied on the live site
        (page 1 shows "0 filters active", 6 of 15 cards reserved), so a page of
        only reserved dogs is a real page, not the end."""
        scraper = DogsTrustScraper()
        reserved = '<html><body><a href="/rehoming/dogs/breed/222"><span>Reserved</span> Dog</a><div>2 / 3</div></body></html>'
        page = _build_paginated_page_mock([self._page_html("1 / 3", 111), reserved, self._page_html("3 / 3", 333)])
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright()

        assert sorted(d["external_id"] for d in result) == ["111", "333"]

    @pytest.mark.asyncio
    async def test_falls_back_to_js_click_when_playwright_click_fails(self):
        """If the Playwright click raises (e.g. overlay intercept), the JS-click
        fallback must run and pagination must still advance, not silently stop."""
        scraper = DogsTrustScraper()
        page = _build_paginated_page_mock([self._page_html("1 / 2", 111), self._page_html("2 / 2", 222)])
        page.locator.return_value.first.click = AsyncMock(side_effect=Exception("intercepted"))
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright()

        # Both pages still collected despite the failed Playwright click.
        assert sorted(d["external_id"] for d in result) == ["111", "222"]
        # The pagination fallback script (unique 'Go to next page' selector) ran.
        evaluated = [call.args[0] for call in page.evaluate.await_args_list if call.args]
        assert any("Go to next page" in script for script in evaluated)

    @pytest.mark.asyncio
    async def test_a_page_that_never_renders_after_next_raises(self):
        """#628: it stopped and returned page 1's dogs, so stale detection retired
        the dogs on every page it never read. Page 1 saved from the live site
        (2026-09-29): "1 / 36", 9 available dogs."""
        scraper = DogsTrustScraper()
        page = _build_paginated_page_mock([LIVE_PAGE_1])
        page.wait_for_function = AsyncMock(side_effect=PlaywrightTimeoutError("no re-render"))
        _patch_browser_retry(scraper, page)

        with pytest.raises(ListingIncompleteError):
            await scraper._get_animal_list_playwright()

    @pytest.mark.asyncio
    async def test_the_live_listing_ends_on_its_count(self):
        """On the live site the indicator read "N / 36" exactly, so page 36 ends
        the listing without another click: the end never waits on a render."""
        scraper = DogsTrustScraper()
        page = _build_paginated_page_mock([LIVE_PAGE_1] * 35 + [LIVE_PAGE_36])
        _patch_browser_retry(scraper, page)

        result = await scraper._get_animal_list_playwright()

        assert len(result) == 9 * 35 + 7
        assert page.content.await_count == 36
        # 35 clicks, each followed by one wait for the next page to render
        assert page.wait_for_function.await_count == 35


@pytest.mark.unit
class TestDogsTrustPrimaryImage:
    """The detail page now renders promotional/nav images before the dog's own
    photos. The extractor must return the dog's photo, not a promo placeholder.
    """

    # Real dog photos live under /images/{size}/dogs/{dogId}/; promo art and
    # breed illustrations live under /images/{size}/assets/.
    DETAIL_HTML = """
    <html><body>
      <img src="https://www.dogstrust.org.uk/images/400x300/assets/2026-05/nds-promo-nav-setter-2026.jpg"
           alt="Illustration of three yellow dogs smiling against a colourful background" />
      <img src="https://www.dogstrust.org.uk/images/400x300/assets/2026-05/BSL-Promo.png"
           alt="Illustration of dog barking at the door" />
      <img class="HeroWithCarousel-module--slideImage--ebe4d"
           src="https://www.dogstrust.org.uk/images/800x600/dogs/3632928/068Sh00000ba4MNIAY.jpg"
           alt="undefined | Rottweiler | undefined - 1" />
      <img class="HeroWithCarousel-module--slideImage--ebe4d"
           src="https://www.dogstrust.org.uk/images/800x600/dogs/3632928/068Sh00000ba41OIAQ.jpg"
           alt="undefined | Rottweiler | undefined - 2" />
      <img class="DogListingCard-module--dogCardImage--401c8"
           src="https://www.dogstrust.org.uk/images/400x300/dogs/3621230/068Sh00000ZNN35IAH.jpg"
           alt="Milo | Shih Tzu | Manchester" />
    </body></html>
    """

    def test_extracts_dog_photo_not_promo_placeholder(self):
        from bs4 import BeautifulSoup

        scraper = DogsTrustScraper()
        soup = BeautifulSoup(self.DETAIL_HTML, "html.parser")

        result = scraper._extract_primary_image(soup, dog_id="3632928")

        assert result == "https://www.dogstrust.org.uk/images/800x600/dogs/3632928/068Sh00000ba4MNIAY.jpg"

    def test_ignores_related_dog_card_images(self):
        from bs4 import BeautifulSoup

        scraper = DogsTrustScraper()
        # Only a different dog's related-card image plus promos are present.
        html = """
        <html><body>
          <img src="https://www.dogstrust.org.uk/images/400x300/assets/2026-05/nds-promo-nav-setter-2026.jpg"
               alt="Illustration of three yellow dogs smiling against a colourful background" />
          <img class="DogListingCard-module--dogCardImage--401c8"
               src="https://www.dogstrust.org.uk/images/400x300/dogs/3621230/068Sh00000ZNN35IAH.jpg"
               alt="Milo | Shih Tzu | Manchester" />
        </body></html>
        """
        soup = BeautifulSoup(html, "html.parser")

        result = scraper._extract_primary_image(soup, dog_id="3632928")

        assert result == ""


DETAIL_PAGE_HTML = """
<html><body>
  <div class="DogPage-module--contentBlock--7017c">
    <h2 class="DogPage-module--contentHeading--ee730">Are you right for <span>Noodle</span>?</h2>
    <div class="DogPage-module--contentBody--7b69a">
      <span>Noodle can live with teenagers but will need to be the only dog at home for now.</span>
    </div>
  </div>
  <div class="DogPage-module--contentBlock--7017c">
    <h2 class="DogPage-module--contentHeading--ee730">Is <span>Noodle</span> right for you?</h2>
    <div class="DogPage-module--contentBody--7b69a">
      <span>Noodle is only two years old and loves to be stroked on her nose.</span>
    </div>
  </div>
  <div class="breed-promo">
    <h2>More about collie (border) crosss</h2>
    <p>Everything you need to know about Border Collies</p>
  </div>
  <div class="rehoming">
    <h2>How our rehoming process works</h2>
    <p>In our form you can tell us all about your home, your lifestyle and the kind of dog you want.</p>
  </div>
</body></html>
"""


@pytest.mark.unit
class TestDogsTrustDescriptionExtraction:
    """The two description sections live in a sibling div, not a <p>.

    Regression cover for the production bug where h2.find_next("p") walked past
    the section into the breed-guide promo, giving 385 of 512 available dogs a
    description of "Everything you need to know about <breed>".
    """

    @staticmethod
    def _extract(html: str) -> str:
        from bs4 import BeautifulSoup

        return DogsTrustScraper()._extract_description(BeautifulSoup(html, "html.parser"))

    def test_returns_the_dogs_own_narrative_from_both_sections(self):
        description = self._extract(DETAIL_PAGE_HTML)

        assert "Noodle can live with teenagers" in description
        assert "loves to be stroked on her nose" in description

    def test_never_returns_breed_guide_or_rehoming_boilerplate(self):
        description = self._extract(DETAIL_PAGE_HTML)

        assert "Everything you need to know" not in description
        assert "In our form you can tell us" not in description

    def test_does_not_duplicate_the_same_paragraph(self):
        description = self._extract(DETAIL_PAGE_HTML)
        parts = [part for part in description.split("\n\n") if part]

        assert len(parts) == len(set(parts))

    def test_returns_empty_string_when_sections_are_absent(self):
        assert self._extract("<html><body><h2>Key information</h2><p>Nope.</p></body></html>") == ""


@pytest.mark.unit
class TestDogsTrustResponseDecoding:
    """Dogs Trust serves text/html with no charset.

    requests then falls back to ISO-8859-1 per RFC 2616, so response.text
    decodes the UTF-8 bytes as Latin-1 and every smart quote becomes mojibake:
    "He'd" arrives as "Heâ€™d". This was invisible while descriptions were the
    breed-guide promo, which has no apostrophes; the dogs' real narratives do,
    and 183 of 478 available dogs were affected.
    """

    SMART_QUOTE_HTML = (
        '<html><body><div class="DogPage-module--contentBlock--7017c">'
        '<h2 class="DogPage-module--contentHeading--ee730">Are you right for Kevin?</h2>'
        '<div class="DogPage-module--contentBody--7b69a">'
        "<span>Kevin’s ready for a home he’d love.</span>"
        "</div></div></body></html>"
    )

    class FakeResponse:
        """Stands in for a requests.Response with no charset in Content-Type."""

        def __init__(self, html: str):
            self._body = html.encode("utf-8")

        @property
        def content(self) -> bytes:
            return self._body

        @property
        def text(self) -> str:
            return self._body.decode("iso-8859-1")

    def test_response_text_alone_would_corrupt_the_apostrophes(self):
        """Guards the premise: this is what the old code parsed."""
        assert "â" in self.FakeResponse(self.SMART_QUOTE_HTML).text

    def test_description_decodes_as_utf8(self):
        scraper = DogsTrustScraper()
        response = self.FakeResponse(self.SMART_QUOTE_HTML)

        description = scraper._extract_description(scraper._soup_from_response(response))

        assert "Kevin's ready for a home he'd love." == description
        assert "â" not in description


@pytest.mark.unit
class TestDogsTrustMayLiveWith:
    """#516: the compatibility facts come from the "May live with" chips.

    The fixtures are real detail pages (2026-09-27). The page's wrapper text
    says "dogs" everywhere, which used to make good_with_dogs true for nearly
    every dog, and Sonic's breed link leaked into may_live_with.
    """

    FIXTURES = Path(__file__).parent.parent / "fixtures" / "dogstrust"

    def _soup(self, name: str):
        from bs4 import BeautifulSoup

        return BeautifulSoup((self.FIXTURES / name).read_text(), "html.parser")

    def _with_chips(self, *chips: tuple[str, str]):
        """Pippa's page with its chips replaced: (parameter, label)."""
        from bs4 import BeautifulSoup

        soup = self._soup("may_live_with_all.html")
        chip_span = soup.find("a", href=lambda href: href and "liveWith" in href).parent
        chip_span.clear()
        for parameter, label in chips:
            chip_span.append(BeautifulSoup(f'<a href="/rehoming/dogs?liveWith{parameter}=true">{label}</a>', "html.parser"))
        return soup

    @staticmethod
    def _scraper():
        scraper = DogsTrustScraper()
        scraper.logger = Mock()
        return scraper

    def test_a_dog_listed_with_older_children_only(self):
        soup = self._soup("may_live_with_children_only.html")  # Sonic, German Shepherd Dog Cross

        assert self._scraper()._extract_compatibility(soup) == {"may_live_with": "Secondary school children", "good_with_children": "Yes (11+)"}

    def test_a_dog_listed_with_cats_dogs_and_children(self):
        soup = self._soup("may_live_with_all.html")  # Pippa

        assert self._scraper()._extract_compatibility(soup) == {
            "may_live_with": "Cats, Dogs, Primary school children, Secondary school children",
            "good_with_dogs": True,
            "good_with_cats": True,
            "good_with_children": "Yes (5+)",
        }

    def test_the_youngest_children_listed_win_whatever_the_order(self):
        soup = self._with_chips(("Secondary", "Secondary school children"), ("Preschool", "Preschool children"), ("Primary", "Primary school children"))

        assert self._scraper()._extract_compatibility(soup)["good_with_children"] is True

    def test_chips_are_read_by_parameter_not_label(self):
        """Until mid-2026 the labels were "Primary" and "Secondary"."""
        soup = self._with_chips(("Primary", "Primary"), ("Secondary", "Secondary"))

        assert self._scraper()._extract_compatibility(soup) == {"may_live_with": "Primary, Secondary", "good_with_children": "Yes (5+)"}

    def test_an_unknown_chip_is_logged_not_guessed(self):
        soup = self._with_chips(("Rabbits", "Rabbits"), ("Dogs", "Dogs"))
        scraper = self._scraper()

        assert scraper._extract_compatibility(soup) == {"may_live_with": "Rabbits, Dogs", "good_with_dogs": True}
        scraper.logger.warning.assert_called_once_with("Unknown 'May live with' chip: 'Rabbits' (liveWithRabbits)")

    def test_a_search_link_outside_the_card_is_ignored(self):
        from bs4 import BeautifulSoup

        soup = self._soup("may_live_with_children_only.html")
        soup.body.append(BeautifulSoup('<a href="/rehoming/dogs?liveWithCats=true">Dogs who live with cats</a>', "html.parser"))

        assert self._scraper()._extract_compatibility(soup) == {"may_live_with": "Secondary school children", "good_with_children": "Yes (11+)"}

    def test_a_repeated_or_empty_chip_is_listed_once(self):
        soup = self._with_chips(("Dogs", "Dogs"), ("Dogs", "Dogs"), ("Cats", ""))

        assert self._scraper()._extract_compatibility(soup) == {"may_live_with": "Dogs, Cats", "good_with_dogs": True, "good_with_cats": True}

    def test_a_card_without_chips_says_nothing_and_is_logged_once(self):
        soup = self._with_chips()
        scraper = self._scraper()

        assert scraper._extract_compatibility(soup) == {}
        scraper.logger.warning.assert_called_once()

    def test_a_label_outside_a_trait_card_is_logged(self):
        from bs4 import BeautifulSoup

        soup = BeautifulSoup('<div><span>May live with:</span><a href="/rehoming/dogs?liveWithDogs=true">Dogs</a></div>', "html.parser")
        scraper = self._scraper()

        assert scraper._extract_compatibility(soup) == {}
        scraper.logger.warning.assert_called_once_with("'May live with' label outside a trait card: the page layout changed")

    def test_a_page_without_the_card_says_nothing(self):
        from bs4 import BeautifulSoup

        scraper = self._scraper()

        assert scraper._extract_compatibility(BeautifulSoup("<html><body><p>Meet Rex</p></body></html>", "html.parser")) == {}
        scraper.logger.warning.assert_not_called()


@pytest.mark.unit
@pytest.mark.parametrize(
    ("html", "expected"),
    [
        ("<div><div><span>Living off site</span><span>Yes</span></div><p>A long story about the dog that is not the label.</p></div>", {"living_off_site": "Yes"}),
        ("<div><span>Living off site:</span> No</div>", {"living_off_site": "No"}),
        ("<div><p>Nothing about it here.</p></div>", {}),
    ],
)
def test_living_off_site_is_read_from_its_label(html, expected):
    """#571: one pass over the label's text node, not every div."""
    from bs4 import BeautifulSoup

    assert DogsTrustScraper()._extract_living_situation(BeautifulSoup(html, "html.parser")) == expected


def _detailed(n_with_card: int, n_without: int) -> list[dict]:
    with_card = [{"properties": {"may_live_with": "Dogs"}}] * n_with_card
    return with_card + [{"properties": {"description": "A dog."}}] * n_without


@pytest.mark.unit
class TestMayLiveWithShare:
    """#628: a renamed "May live with" label would drop every dog's good_with_* silently."""

    def _scraper(self, historical_share):
        scraper = DogsTrustScraper()
        scraper.session_manager = Mock(get_historical_share=Mock(return_value=historical_share))
        return scraper

    def test_the_run_records_how_many_dogs_had_a_card(self):
        scraper = self._scraper(0.9)

        scraper._check_may_live_with_share(_detailed(9, 1))

        assert scraper.run_metrics == {"detail_pages": 10, "may_live_with_cards": 9}
        scraper.session_manager.get_historical_share.assert_called_once_with("may_live_with_cards", "detail_pages")

    def test_a_sharp_drop_alerts(self, caplog):
        scraper = self._scraper(0.9)

        with patch("scrapers.dogstrust.dogstrust_scraper.sentry_sdk") as sentry:
            scraper._check_may_live_with_share(_detailed(0, 12))

        sentry.capture_message.assert_called_once()
        assert "May live with" in sentry.capture_message.call_args.args[0]
        # A run note makes the run a "warning", which keeps it out of the history the
        # share is judged against: otherwise a lasting rename would silence itself
        assert any("May live with" in note for note in scraper._run_notes)

    @pytest.mark.parametrize(
        ("dogs", "historical"),
        [
            (_detailed(8, 4), 0.9),  # a normal spread
            (_detailed(0, 3), 0.9),  # too few pages to judge
            (_detailed(0, 12), None),  # no history yet
        ],
    )
    def test_no_alert(self, dogs, historical):
        scraper = self._scraper(historical)

        with patch("scrapers.dogstrust.dogstrust_scraper.sentry_sdk") as sentry:
            scraper._check_may_live_with_share(dogs)

        sentry.capture_message.assert_not_called()

    def test_run_metrics_reach_the_scrape_log(self):
        scraper = DogsTrustScraper()
        scraper.run_metrics = {"detail_pages": 10, "may_live_with_cards": 9}
        scraper.metrics_collector = Mock(
            calculate_scrape_duration=Mock(return_value=1.0),
            assess_data_quality=Mock(return_value=0.9),
            generate_comprehensive_metrics=Mock(return_value={"batch_size": 4}),
        )
        scraper.complete_scrape_log = Mock()
        scraper.scrape_start_time = None
        scraper.progress_tracker = None

        scraper._log_completion_metrics([], ScrapeStats())

        detailed = scraper.complete_scrape_log.call_args.kwargs["detailed_metrics"]
        assert detailed == {"batch_size": 4, "detail_pages": 10, "may_live_with_cards": 9}


@pytest.mark.unit
class TestAnIncompleteListingIsRetried:
    """Review of #641: one slow render should get a fresh browser, as a session drop does."""

    @patch("scrapers.dogstrust.dogstrust_scraper.time.sleep")
    def test_retries_from_a_fresh_browser(self, mock_sleep):
        scraper = DogsTrustScraper()
        attempt = AsyncMock(side_effect=[ListingIncompleteError("page 5 did not render"), [{"external_id": "1"}]])
        scraper._get_animal_list_playwright = attempt

        assert scraper._run_playwright_pagination_with_retry() == [{"external_id": "1"}]
        assert attempt.await_count == 2

    @patch("scrapers.dogstrust.dogstrust_scraper.time.sleep")
    def test_raises_after_the_last_attempt(self, mock_sleep):
        scraper = DogsTrustScraper()
        scraper._get_animal_list_playwright = AsyncMock(side_effect=ListingIncompleteError("page 5 did not render"))

        with pytest.raises(ListingIncompleteError):
            scraper._run_playwright_pagination_with_retry()


@pytest.mark.unit
class TestCardShareAndRetryLogging:
    """#644: follow-ups from the review of #641."""

    def test_a_small_run_records_no_share(self):
        """Runs with too few pages ended "success" with their share, so they could become the baseline."""
        scraper = DogsTrustScraper()
        scraper.session_manager = Mock(get_historical_share=Mock(return_value=0.9))

        scraper._check_may_live_with_share(_detailed(0, 3))

        assert scraper.run_metrics == {}

    def test_the_alert_is_one_sentry_event(self):
        """An error log is a second Sentry event (LoggingIntegration), unfingerprinted."""
        scraper = DogsTrustScraper()
        scraper.session_manager = Mock(get_historical_share=Mock(return_value=0.9))
        scraper.logger = Mock()

        with patch("scrapers.dogstrust.dogstrust_scraper.sentry_sdk") as sentry:
            scraper._check_may_live_with_share(_detailed(0, 12))

        sentry.capture_message.assert_called_once()
        scraper.logger.error.assert_not_called()
        scraper.logger.warning.assert_called_once()

    @pytest.mark.asyncio
    async def test_an_incomplete_listing_is_a_warning_the_retry_may_recover(self):
        scraper = DogsTrustScraper()
        scraper.logger = Mock()
        page = _build_paginated_page_mock([LIVE_PAGE_1])
        page.wait_for_function = AsyncMock(side_effect=PlaywrightTimeoutError("no re-render"))
        _patch_browser_retry(scraper, page)

        with patch("scrapers.dogstrust.dogstrust_scraper.asyncio.sleep", new=AsyncMock()), pytest.raises(ListingIncompleteError):
            await scraper._get_animal_list_playwright()

        scraper.logger.error.assert_not_called()
