"""WordPress post IDs for dog pages (#570)."""

from pathlib import Path

import pytest
from bs4 import BeautifulSoup

from scrapers.wordpress_ids import body_post_id, post_ids, slugs, url_key

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
class TestPostIds:
    def test_every_page_is_read(self):
        pages = {1: [{"id": 1, "link": "https://x.org/dog/a/"}], 2: [{"id": 2, "link": "https://x.org/dog/B"}]}
        calls = []

        def get_json(params):
            calls.append(params)
            return pages[params["page"]], 2

        assert post_ids(get_json, {}) == {"/dog/a": 1, "/dog/b": 2}
        assert [call["page"] for call in calls] == [1, 2]

    def test_a_failed_request_raises(self):
        def get_json(params):
            raise RuntimeError("REST down")

        with pytest.raises(RuntimeError):
            post_ids(get_json, {})


@pytest.mark.unit
def test_urls_match_by_path_and_slug():
    assert url_key("https://www.site.org/Johny/") == url_key("https://site.org/johny") == "/johny"
    assert slugs(["https://site.org/johny/", "https://site.org/lexis", "https://site.org/johny"]) == ["johny", "lexis"]
