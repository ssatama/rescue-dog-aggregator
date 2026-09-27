"""WordPress post IDs for dog pages (#570)."""

from pathlib import Path
from unittest.mock import Mock

import pytest
import requests
from bs4 import BeautifulSoup

from scrapers.request_pacing import ListingIncompleteError
from scrapers.wordpress_ids import body_post_id, fetch_posts, key_on_post_ids, slug, url_key

GALLERIES = Path(__file__).parent.parent / "fixtures" / "galleries"


@pytest.mark.unit
class TestBodyPostId:
    @pytest.mark.parametrize(("page", "post_id"), [("santer_dexter", 232), ("arb_johny", 36251)])
    def test_saved_pages_carry_their_id(self, page, post_id):
        soup = BeautifulSoup((GALLERIES / f"{page}.html").read_text(), "html.parser")

        assert body_post_id(soup) == post_id

    def test_no_id_is_none(self):
        assert body_post_id(BeautifulSoup('<body class="home"></body>', "html.parser")) is None


@pytest.mark.unit
class TestFetchPosts:
    def test_every_page_is_read(self):
        pages = {1: [{"id": 1, "link": "https://x.org/dog/a/"}], 2: [{"id": 2, "link": "https://x.org/dog/b/"}]}
        calls = []

        def get_json(params):
            calls.append(params)
            return pages[params["page"]], 2

        assert [post["id"] for post in fetch_posts(get_json, ["b", "a", "a"])] == [1, 2]
        assert [(call["slug"], call["page"]) for call in calls] == [("a,b", 1), ("a,b", 2)]

    def test_a_failed_request_raises(self):
        def get_json(params):
            raise RuntimeError("REST down")

        with pytest.raises(RuntimeError):
            fetch_posts(get_json, ["a"])


def _scraper(pages):
    """get_listing_page answers the REST route with `rest`, and page URLs from `pages` (a 404 when missing)."""
    rest = [{"id": 36251, "link": "https://site.org/johny/"}]

    def get_listing_page(url, **kwargs):
        if "wp-json" in url:
            return Mock(headers={"X-WP-TotalPages": "1"}, json=Mock(return_value=rest))
        if url in pages:
            return Mock(content=pages[url].encode())
        error = requests.HTTPError(response=Mock(status_code=404))
        raise ListingIncompleteError(f"{url} failed") from error

    return Mock(get_listing_page=Mock(side_effect=get_listing_page), logger=Mock())


@pytest.mark.unit
class TestKeyOnPostIds:
    def test_listed_dogs_are_keyed_once_each(self):
        dogs = [{"url": "https://site.org/johny/"}, {"url": "https://site.org/Johny"}]

        keyed = key_on_post_ids(_scraper({}), dogs, route="https://site.org/wp-json/wp/v2/pages", url_of=lambda dog: dog["url"], prefix="arb-")

        assert [dog["external_id"] for dog in keyed] == ["arb-36251"]

    def test_a_link_the_answer_lacks_is_read_from_its_page(self):
        """A renamed page WordPress redirects keeps its dog listed (#558)."""
        pages = {"https://site.org/old-name/": '<body class="page page-id-40001"></body>'}

        keyed = key_on_post_ids(_scraper(pages), [{"url": "https://site.org/old-name/"}], route="https://site.org/wp-json/wp/v2/pages", url_of=lambda dog: dog["url"], prefix="arb-")

        assert [dog["external_id"] for dog in keyed] == ["arb-40001"]

    def test_a_page_that_is_gone_is_skipped_not_failed(self):
        scraper = _scraper({})

        keyed = key_on_post_ids(scraper, [{"url": "https://site.org/lexis/"}], route="https://site.org/wp-json/wp/v2/pages", url_of=lambda dog: dog["url"], prefix="arb-")

        assert keyed == []
        scraper.logger.warning.assert_called_once()


@pytest.mark.unit
def test_urls_match_by_path_and_slug():
    assert url_key("https://www.site.org/Johny/") == url_key("https://site.org/johny") == "/johny"
    assert slug("https://site.org/Mery Joy/") == "mery-joy"


@pytest.mark.unit
def test_a_redirect_never_takes_a_listed_dogs_id():
    """WordPress guesses /john/ -> /johny/: Johny keeps its ID, John is skipped (#570)."""
    pages = {"https://site.org/john/": '<body class="page page-id-36251"></body>'}
    scraper = _scraper(pages)
    dogs = [{"url": "https://site.org/john/"}, {"url": "https://site.org/johny/"}]

    keyed = key_on_post_ids(scraper, dogs, route="https://site.org/wp-json/wp/v2/pages", url_of=lambda dog: dog["url"], prefix="arb-")

    assert [(dog["url"], dog["external_id"]) for dog in keyed] == [("https://site.org/johny/", "arb-36251")]
