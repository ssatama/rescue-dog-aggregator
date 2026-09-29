"""Furry Rescue Italy and Galgos del Sol raise on a listing failure (#630).

Both are disabled, but each turned a listing failure into partial results or
[], where every active scraper raises ListingIncompleteError (#559). Re-enabling
either would have brought back the silent-stale bug: stale detection takes the
dogs on the pages it never read for gone.
"""

from unittest.mock import Mock, patch

import pytest
import requests

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper
from scrapers.galgosdelsol.galgosdelsol_scraper import GalgosDelSolScraper
from scrapers.request_pacing import ListingIncompleteError


def page(html: str) -> Mock:
    response = Mock(status_code=200, text=html, content=html.encode())
    response.raise_for_status.return_value = None
    return response


FRI_PAGE_1 = """
<html>
  <article><h6 class="adoption-header">BILLO</h6><a href="/adoption/billo/" class="btn">More Info</a></article>
  <div class="pagination"><a href="/adoptions/page/2/">2</a></div>
</html>
"""
FRI_SINGLE_PAGE = """
<html>
  <article><h6 class="adoption-header">THOR</h6><a href="/adoption/thor/" class="btn">More Info</a></article>
</html>
"""
GDS_PAGE = """
<html><main><a href="https://galgosdelsol.org/adoptable-dogs/andres-2/">ANDRES</a></main></html>
"""


@pytest.mark.unit
class TestFurryRescueItaly:
    @pytest.fixture
    def scraper(self):
        return FurryRescueItalyScraper(config_id="furryrescueitaly")

    def test_a_page_that_never_loads_raises(self, scraper, stub_clock):
        with patch("scrapers.request_pacing.requests.get", side_effect=requests.ConnectionError("reset")), pytest.raises(ListingIncompleteError):
            scraper.get_animal_list()

    def test_a_later_page_that_fails_raises_instead_of_returning_page_one(self, scraper, stub_clock):
        with patch("scrapers.request_pacing.requests.get", side_effect=[page(FRI_PAGE_1), *[requests.ConnectionError("reset")] * 10]), pytest.raises(ListingIncompleteError):
            scraper.get_animal_list()

    def test_an_empty_page_the_pagination_says_exists_raises(self, scraper, stub_clock):
        """Review of #640: a page 2 that renders without dog cards ended the listing quietly."""
        with patch("scrapers.request_pacing.requests.get", side_effect=[page(FRI_PAGE_1), page("<html><body></body></html>")]), pytest.raises(ListingIncompleteError):
            scraper.get_animal_list()

    def test_a_page_of_reserved_dogs_is_not_an_empty_page(self, scraper, stub_clock):
        """Round-2 review of #640: page_dogs has reserved dogs removed, so a page of
        them read as empty and would have failed every run until they left."""
        page_1 = FRI_PAGE_1.replace('<a href="/adoptions/page/2/">2</a>', '<a href="/adoptions/page/2/">2</a><a href="/adoptions/page/3/">3</a>')
        reserved = '<html><article><h6 class="adoption-header">LUNA (RESERVED)</h6><a href="/adoption/luna/" class="btn">More Info</a></article></html>'
        with patch("scrapers.request_pacing.requests.get", side_effect=[page(page_1), page(reserved), page(FRI_SINGLE_PAGE)]):
            animals = scraper.get_animal_list()

        assert [a["name"] for a in animals] == ["Billo", "Thor"]

    def test_a_listing_without_pagination_is_one_page(self, scraper, stub_clock):
        # A page 2 request fails the test rather than looping on the same page
        with patch("scrapers.request_pacing.requests.get", side_effect=[page(FRI_SINGLE_PAGE), AssertionError("read a page 2")]) as get:
            animals = scraper.get_animal_list()

        assert [a["name"] for a in animals] == ["Thor"]
        assert get.call_count == 1


@pytest.mark.unit
class TestGalgosDelSol:
    @pytest.fixture
    def scraper(self):
        scraper = GalgosDelSolScraper(config_id="galgosdelsol")
        # Listing pages go through get_listing_page; the session must not reach the network
        scraper.session.get = Mock(side_effect=AssertionError("listing fetched outside get_listing_page"))
        return scraper

    def test_one_listing_page_that_fails_raises(self, scraper, stub_clock):
        responses = [page(GDS_PAGE), *[requests.ConnectionError("reset")] * 10]
        with patch("scrapers.request_pacing.requests.get", side_effect=responses), pytest.raises(ListingIncompleteError):
            scraper.collect_data()

    def test_a_page_without_its_content_raises(self, scraper, stub_clock):
        """No <main> means the page didn't render as expected, not that there are no dogs."""
        with patch("scrapers.request_pacing.requests.get", return_value=page("<html><body>maintenance</body></html>")), pytest.raises(ListingIncompleteError):
            scraper.collect_data()

    def test_every_listing_page_is_read(self, scraper, stub_clock):
        scraper.filtering_service = Mock(filter_existing_animals=lambda animals: [])
        with patch("scrapers.request_pacing.requests.get", return_value=page(GDS_PAGE)) as get:
            scraper.collect_data()

        assert get.call_count == len(scraper.listing_urls)
