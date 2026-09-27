"""A listing page that fails raises; no scraper keeps a partial listing (#559).

Stale detection takes a dog the listing didn't show for gone, so a skipped
page would retire every dog on it. Each scraper below used to skip the page,
keep the pages before it, or turn the failure into zero dogs.
"""

import asyncio
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
import requests
from bs4 import BeautifulSoup

from scrapers.animalrescuebosnia.animalrescuebosnia_scraper import AnimalRescueBosniaScraper
from scrapers.base_scraper import ListingIncompleteError
from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper
from scrapers.rean.dogs_scraper import REANScraper
from scrapers.santerpawsbulgarianrescue.santerpawsbulgarianrescue_scraper import SanterPawsBulgarianRescueScraper
from scrapers.theunderdog.theunderdog_scraper import TheUnderdogScraper
from scrapers.tierschutzverein_europa.dogs_scraper import TierschutzvereinEuropaScraper
from scrapers.woof_project.dogs_scraper import WoofProjectScraper

LISTINGS = Path(__file__).parent.parent / "fixtures" / "listings"


def _response(text="", status=200):
    response = Mock(text=text, content=text.encode(), status_code=status)
    if status >= 400:
        response.raise_for_status.side_effect = requests.HTTPError(f"{status}", response=response)
    return response


def _pages(pages):
    """A requests.get stand-in: each URL's response, or the exception it raises."""

    def get(url, **kwargs):
        outcome = pages[url]
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    return Mock(side_effect=get)


@pytest.mark.unit
class TestGetListingPage:
    @pytest.fixture
    def scraper(self):
        return SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

    def test_a_server_error_is_retried_with_backoff(self, scraper, stub_clock):
        get = Mock(side_effect=[_response(status=503), _response("ok")])
        with patch("requests.get", get):
            assert scraper.get_listing_page("https://example.org/list").text == "ok"

        assert get.call_count == 2
        # The back-off, then the retry's turn on the request clock (#567)
        assert stub_clock.calls[0] == scraper.retry_backoff_factor

    def test_a_page_that_keeps_failing_raises(self, scraper):
        get = Mock(side_effect=requests.ConnectionError("reset"))
        with patch("requests.get", get), pytest.raises(ListingIncompleteError, match="reset"):
            scraper.get_listing_page("https://example.org/list")

        assert get.call_count == scraper.max_retries + 1

    def test_a_not_found_page_fails_at_once(self, scraper):
        get = Mock(return_value=_response(status=404))
        with patch("requests.get", get), pytest.raises(ListingIncompleteError, match="404"):
            scraper.get_listing_page("https://example.org/list")

        assert get.call_count == 1

    def test_a_connection_dropped_mid_body_is_retried(self, scraper):
        get = Mock(side_effect=[requests.exceptions.ChunkedEncodingError("connection broken"), _response("ok")])
        with patch("requests.get", get):
            assert scraper.get_listing_page("https://example.org/list").text == "ok"

    def test_a_malformed_url_fails_at_once(self, scraper):
        get = Mock(side_effect=requests.exceptions.MissingSchema("No scheme supplied"))
        with patch("requests.get", get), pytest.raises(ListingIncompleteError, match="No scheme"):
            scraper.get_listing_page("example.org/list")

        assert get.call_count == 1


@pytest.mark.unit
class TestTierschutzverein:
    BASE = "https://tierschutzverein-europa.de/tiervermittlung/"

    @staticmethod
    def _page(slug, next_page=True):
        next_link = '<a class="prev-next" href="#">→</a>' if next_page else ""
        return f'<html><body><article class="tiervermittlung"><a href="/tiervermittlung/{slug}/"><h2>{slug}</h2></a></article>{next_link}</body></html>'

    @pytest.fixture
    def scraper(self):
        return TierschutzvereinEuropaScraper()

    def test_a_failing_page_2_raises(self, scraper):
        get = _pages({self.BASE: _response(self._page("bonsai")), f"{self.BASE}page/2/": requests.ConnectionError("reset")})
        with patch("requests.get", get), pytest.raises(ListingIncompleteError):
            scraper.collect_data()

    def test_a_linked_page_that_lists_no_dogs_raises(self, scraper):
        get = _pages({self.BASE: _response(self._page("bonsai")), f"{self.BASE}page/2/": _response("<html><body></body></html>")})
        with patch("requests.get", get), pytest.raises(ListingIncompleteError, match="page 2"):
            scraper.get_animal_list()

    def test_the_page_without_a_next_link_is_the_last(self, scraper):
        get = _pages({self.BASE: _response(self._page("bonsai")), f"{self.BASE}page/2/": _response(self._page("pontos", next_page=False))})
        with patch("requests.get", get):
            assert [a["name"] for a in scraper.get_animal_list()] == ["bonsai", "pontos"]


@pytest.mark.unit
class TestManyTearsPlaywright:
    """The listing as Playwright saw it on 2026-09-26: 7 pages of 12, 79 dogs."""

    PAGE_1 = (LISTINGS / "manytears_page1.html").read_text()
    PAGE_7 = (LISTINGS / "manytears_page7.html").read_text()

    @pytest.fixture
    def scraper(self):
        return ManyTearsRescueScraper()

    def _listing(self, scraper, pages):
        """Run the Playwright listing, where pages maps page number to HTML, or None for a failed load."""

        async def get_page_content(url, options):
            number = int(url.split("page=")[1]) if "page=" in url else 1
            html = pages[number]
            return SimpleNamespace(success=html is not None, content=html or "", error=None if html else "Timeout 60000ms exceeded")

        service = Mock(get_page_content=AsyncMock(side_effect=get_page_content))
        with (
            patch("scrapers.manytearsrescue.manytearsrescue_scraper.get_playwright_service", return_value=service),
            patch("scrapers.manytearsrescue.manytearsrescue_scraper.PlaywrightOptions"),
        ):
            return asyncio.run(scraper._get_animal_list_playwright())

    def test_every_page_is_read(self, scraper):
        pages = {n: self.PAGE_1 for n in range(1, 7)} | {7: self.PAGE_7}
        assert len(self._listing(scraper, pages)) == 6 * 12 + 7

    def test_a_page_that_fails_to_load_raises(self, scraper):
        pages = {1: self.PAGE_1, 2: None}
        with pytest.raises(ListingIncompleteError, match="page 2 failed to load"):
            self._listing(scraper, pages)

    def test_a_page_that_lists_no_dogs_raises(self, scraper):
        pages = {1: self.PAGE_1, 2: self.PAGE_1, 3: "<html><body>Just a moment...</body></html>"}
        with pytest.raises(ListingIncompleteError, match="page 3 of 7"):
            self._listing(scraper, pages)

    def test_a_full_first_page_without_pagination_raises(self, scraper):
        soup = BeautifulSoup(self.PAGE_1, "html.parser")
        soup.find(class_="pagination__container").decompose()
        with pytest.raises(ListingIncompleteError, match="no pagination"):
            self._listing(scraper, {1: str(soup)})

    def test_a_short_first_page_without_pagination_is_the_whole_listing(self, scraper):
        soup = BeautifulSoup(self.PAGE_7, "html.parser")
        soup.find(class_="pagination__container").decompose()
        assert len(self._listing(scraper, {1: str(soup)})) == 7

    def test_collect_data_lets_the_failure_through(self, scraper):
        with patch.object(scraper, "get_animal_list", side_effect=ListingIncompleteError("page 2")), pytest.raises(ListingIncompleteError):
            scraper.collect_data()


@pytest.mark.unit
class TestWoofProject:
    BASE = "https://woofproject.eu/adoption/"
    # Page 1 ends in an available dog, so page 2 must be read
    PAGE_1 = (
        '<html><body><article class="type-adoption"><a href="https://woofproject.eu/adoption/buddy/">Buddy</a><h2>BUDDY</h2></article>'
        '<nav class="elementor-pagination"><span class="page-numbers current">1</span>'
        '<a class="page-numbers" href="https://woofproject.eu/adoption/page/2/">2</a></nav></body></html>'
    )

    @pytest.fixture
    def scraper(self):
        return WoofProjectScraper(config_id="woof-project")

    def test_a_failing_first_page_raises(self, scraper, stub_clock):
        with patch("requests.get", _pages({self.BASE: _response(status=503)})), pytest.raises(ListingIncompleteError):
            scraper.collect_data()

    def test_a_failing_page_2_raises(self, scraper, stub_clock):
        get = _pages({self.BASE: _response(self.PAGE_1), f"{self.BASE}page/2/": requests.ConnectionError("reset")})
        with patch("requests.get", get), pytest.raises(ListingIncompleteError, match="page/2"):
            scraper.get_animal_list()


@pytest.mark.unit
class TestSanterPaws:
    BASE = "https://santerpawsbulgarianrescue.com/adopt/"

    @staticmethod
    def _page(slug, last_page=None):
        pagination = ""
        if last_page:
            links = "".join(f'<a class="phox-facet-pagination__link" data-page="{n}">{n}</a>' for n in range(2, last_page + 1))
            pagination = f'<div class="phox-facet-pagination">{links}</div>'
        return f'<html><body><article class="bde-loop-item"><a href="https://santerpawsbulgarianrescue.com/dog/{slug}/">{slug}</a></article>{pagination}</body></html>'

    EMPTY = "<html><body></body></html>"

    @pytest.fixture
    def scraper(self):
        return SanterPawsBulgarianRescueScraper(config_id="santerpawsbulgarianrescue")

    def test_reads_until_the_empty_page_after_the_last(self, scraper):
        get = _pages(
            {
                self.BASE: _response(self._page("pepper", last_page=3)),
                f"{self.BASE}page/2/": _response(self._page("daisy")),
                f"{self.BASE}page/3/": _response(self._page("dexter")),
                f"{self.BASE}page/4/": _response(self.EMPTY),
            }
        )
        with patch("requests.get", get):
            assert [a["name"] for a in scraper.get_animal_list()] == ["Pepper", "Daisy", "Dexter"]

    def test_a_twentieth_page_can_be_the_last(self, scraper):
        pages = {self.BASE: _response(self._page("dog1"))} | {f"{self.BASE}page/{n}/": _response(self._page(f"dog{n}")) for n in range(2, 21)}
        with patch("requests.get", _pages(pages | {f"{self.BASE}page/21/": _response(self.EMPTY)})):
            assert len(scraper.get_animal_list()) == 20

    def test_a_listing_past_the_safety_limit_raises(self, scraper):
        pages = {self.BASE: _response(self._page("dog1"))} | {f"{self.BASE}page/{n}/": _response(self._page(f"dog{n}")) for n in range(2, 22)}
        with patch("requests.get", _pages(pages)), pytest.raises(ListingIncompleteError, match="after 20 pages"):
            scraper.get_animal_list()

    def test_a_failing_page_2_raises(self, scraper):
        get = _pages({self.BASE: _response(self._page("pepper", last_page=3)), f"{self.BASE}page/2/": requests.ConnectionError("reset")})
        with patch("requests.get", get), pytest.raises(ListingIncompleteError):
            scraper.collect_data()

    def test_an_empty_page_before_the_last_numbered_one_raises(self, scraper):
        get = _pages({self.BASE: _response(self._page("pepper", last_page=3)), f"{self.BASE}page/2/": _response(self.EMPTY)})
        with patch("requests.get", get), pytest.raises(ListingIncompleteError, match="page 2 of 3"):
            scraper.get_animal_list()


@pytest.mark.unit
class TestAnimalRescueBosnia:
    def test_a_listing_that_fails_to_load_raises(self):
        scraper = AnimalRescueBosniaScraper(config_id="animalrescuebosnia")
        with patch("requests.get", Mock(return_value=_response(status=503))), pytest.raises(ListingIncompleteError, match="503"):
            scraper.collect_data()


@pytest.mark.unit
class TestTheUnderdog:
    def test_a_listing_that_fails_to_load_raises(self):
        scraper = TheUnderdogScraper(config_id="theunderdog")
        with patch("requests.get", Mock(side_effect=requests.Timeout("read timed out"))), pytest.raises(ListingIncompleteError, match="timed out"):
            scraper.collect_data()


@pytest.mark.unit
class TestREAN:
    @pytest.fixture
    def scraper(self):
        return REANScraper()

    @pytest.fixture
    def playwright_fails(self):
        """The browser can't load the page."""
        service = Mock()
        service.get_browser.side_effect = RuntimeError("Timeout 60000ms exceeded")
        with (
            patch("scrapers.rean.dogs_scraper.get_playwright_service", return_value=service),
            patch("scrapers.rean.dogs_scraper.PlaywrightOptions"),
        ):
            yield

    def test_the_requests_fallback_runs_outside_the_playwright_loop(self, scraper, playwright_fails):
        with (
            patch.object(scraper, "scrape_page", return_value="<html><body></body></html>"),
            patch.object(scraper, "_extract_images_with_browser_playwright", new=AsyncMock(return_value=[])) as images,
        ):
            assert scraper.extract_dogs_with_images_unified("https://rean.org.uk/dogs-in-romania", "romania") == []

        images.assert_awaited_once()  # its own asyncio.run, not nested in the failed one

    def test_a_page_that_fails_both_ways_raises(self, scraper, playwright_fails):
        with (
            patch.object(scraper, "scrape_page", return_value=None),
            patch.object(scraper, "handle_scraper_failure") as handle_failure,
            pytest.raises(ListingIncompleteError, match="failed to load"),
        ):
            scraper.collect_data()

        handle_failure.assert_not_called()  # BaseScraper completes the run, once (#557)

    def test_a_failing_second_page_raises_instead_of_keeping_the_first(self, scraper):
        first = [{"name": "Athena"}]
        with (
            patch.object(scraper, "extract_dogs_with_images_unified", side_effect=[first, ListingIncompleteError("uk_foster")]),
            patch.object(scraper, "standardize_animal_data", side_effect=lambda dog, page_type: {**dog, "external_id": "rean-athena"}),
            pytest.raises(ListingIncompleteError),
        ):
            scraper.scrape_animals()
