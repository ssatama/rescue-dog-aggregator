"""MISIs dogs come from the post body only (#562).

Fixtures are three real posts saved on 2026-09-26, trimmed to the Wix post:
- Tea: "Things you have to know" and no story; the old parser missed the
  heading and stored the site menu as her facts.
- Olly: a 2026 post whose "✔️DOB January 2026" had no age.
- Yuk: a 2026 post with a story and one fact per list.
"""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock, patch

import pytest
from bs4 import BeautifulSoup

from scrapers.misis_rescue.detail_parser import MisisRescueDetailParser, split_post
from scrapers.misis_rescue.scraper import MisisRescueScraper
from tests.scrapers.test_scraper_base import ScraperTestBase

FIXTURES = Path(__file__).parent.parent / "fixtures" / "misis"
NAV = ("Home", "Our Dogs", "Sponsorship Needed", "Success Stories", "Application Form")


def _html(name: str) -> str:
    return (FIXTURES / f"{name}.html").read_text()


def _parse(name: str) -> dict:
    return MisisRescueDetailParser().parse_detail_page(BeautifulSoup(_html(name), "html.parser"))


@pytest.mark.unit
class TestPostBody:
    def test_tea_reads_things_you_have_to_know_not_the_menu(self):
        dog = _parse("tea_things_you_have_to_know")

        assert dog["name"] == "Tea"
        assert dog["bullet_points"][:3] == ["2 years old", "mixed breed", "around 21-2 kg"]
        assert not any(item in fact for fact in dog["bullet_points"] for item in NAV)
        assert (dog["age_text"], dog["sex"], dog["breed"]) == ("2 years", "Female", "Mixed Breed")

    def test_a_post_without_a_story_is_described_by_its_facts(self):
        description = _parse("tea_things_you_have_to_know")["properties"]["description"]

        assert description.startswith("2 years old\nmixed breed")
        assert "How do you adopt" not in description
        assert len(description) > 200

    def test_the_story_is_the_description(self):
        description = _parse("yuk_2026_story")["properties"]["description"]

        assert description.startswith("He was found as a tiny puppy curled up in the grass beside a busy road.")
        assert "Things you should know" not in description
        assert "pre-adoption questionnaire" not in description

    def test_a_2026_dob_without_colon_or_dash_is_the_age(self):
        """ "✔️DOB January 2026" matched none of the old patterns, so new posts had no age."""
        dog = _parse("olly_2026_dob")

        assert dog["date_of_birth"] == "DOB January 2026"
        assert dog["age_text"] == "DOB January 2026"
        assert dog["bullet_points"][0] == "DOB January 2026"

    def test_facts_stop_at_the_adoption_boilerplate(self):
        facts = _parse("olly_2026_dob")["bullet_points"]

        assert facts[-1] == "Castration is mandatory once he’s old enough"
        assert not any("adopt" in fact.lower() for fact in facts)

    def test_gallery_cells_are_not_facts(self):
        for name in ("tea_things_you_have_to_know", "olly_2026_dob", "yuk_2026_story"):
            assert all(fact.strip() for fact in _parse(name)["bullet_points"])

    def test_weight_with_a_space_sets_the_size(self):
        """Yuk: "current weight is 10 kg"."""
        dog = _parse("yuk_2026_story")

        assert dog["properties"]["weight"] == "10.0kg"
        assert dog["size"] == "Small"

    def test_no_page_text_excerpt_is_stored(self):
        """It was the first 2,000 characters of the page, which start with the menu."""
        assert "page_text_excerpt" not in _parse("olly_2026_dob")["properties"]

    def test_a_page_without_a_post_body_is_not_a_dog(self):
        """The old fallback took any <div> with a list, and the site menu qualified."""
        menu = "<html><body><h1>Tea</h1><div><ul>" + "".join(f"<li>{item}</li>" for item in NAV) + "</ul></div></body></html>"

        assert MisisRescueDetailParser().parse_detail_page(BeautifulSoup(menu, "html.parser")) is None


@pytest.mark.unit
class TestSplitPost:
    def test_without_a_facts_heading_list_items_are_facts(self):
        blocks = [("p", "Found by the road."), ("li", "✔️DOB 2022"), ("li", "mixed breed"), ("p", "How do you adopt Rex?"), ("p", "Fill in the form.")]

        assert split_post(blocks) == (["Found by the road."], ["DOB 2022", "mixed breed"])

    def test_a_long_paragraph_mentioning_the_heading_is_not_the_heading(self):
        story = "There are many things you should know about rescue dogs before you adopt one, and we will tell you all of them here."
        blocks = [("p", story), ("h2", "Things you should know about Rex"), ("li", "2 years old")]

        assert split_post(blocks) == ([story], ["2 years old"])


class TestFetch(ScraperTestBase):
    """Error pages are recognised by HTTP status and a missing post body, not by words on the page."""

    scraper_class = MisisRescueScraper
    config_id = "misisrescue"
    expected_org_name = "MISIs Animal Rescue"
    expected_base_url = "https://www.misisrescue.com"

    def _get(self, status: int, text: str = ""):
        return patch("scrapers.misis_rescue.scraper.requests.get", return_value=Mock(status_code=status, text=text))

    @pytest.mark.unit
    def test_a_post_is_scraped_with_plain_http(self, scraper):
        with self._get(200, _html("yuk_2026_story")), patch.object(scraper, "_scrape_dog_detail") as browser:
            dog = scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/__yuk")

        browser.assert_not_called()
        assert (dog["name"], dog["external_id"], dog["adoption_url"]) == ("Yuk", "mar-__yuk", "https://www.misisrescue.com/post/__yuk")
        assert dog["standardized_size"] == "Small"
        assert dog["primary_image_url"]

    @pytest.mark.unit
    def test_500_and_font_weight_500_are_not_mixed_up(self, scraper):
        """A "500" in the page's CSS used to drop the dog."""
        page = _html("olly_2026_dob").replace("<head>", "<head><style>.x{font-weight:500} /* not found */</style>", 1)
        with self._get(200, page):
            dog = scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/_olly")

        assert dog["name"] == "Olly"

    @pytest.mark.unit
    @pytest.mark.parametrize("status", [404, 410])
    def test_a_removed_post_is_skipped_without_the_browser(self, scraper, status):
        with self._get(status), patch.object(scraper, "_scrape_dog_detail") as browser:
            assert scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/gone") is None

        browser.assert_not_called()

    @pytest.mark.unit
    def test_rate_limited_backs_off_and_never_opens_the_browser(self, scraper):
        responses = [Mock(status_code=429, text=""), Mock(status_code=200, text=_html("yuk_2026_story"))]
        with patch("scrapers.misis_rescue.scraper.requests.get", side_effect=responses), patch.object(scraper, "_scrape_dog_detail") as browser:
            assert scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/__yuk")["name"] == "Yuk"

        browser.assert_not_called()

    @pytest.mark.unit
    def test_rate_limited_twice_skips_the_dog(self, scraper):
        with self._get(429), patch.object(scraper, "_scrape_dog_detail") as browser:
            assert scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/__yuk") is None

        browser.assert_not_called()

    @pytest.mark.unit
    def test_a_server_error_tries_the_browser(self, scraper):
        with self._get(503), patch.object(scraper, "_scrape_dog_detail", return_value={"name": "Rex"}) as browser:
            assert scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/rex") == {"name": "Rex"}

        browser.assert_called_once()

    @pytest.mark.unit
    def test_html_without_the_post_tries_the_browser(self, scraper):
        with self._get(200, "<html><body><div id='SITE_CONTAINER'></div></body></html>"), patch.object(scraper, "_scrape_dog_detail", return_value=None) as browser:
            assert scraper._scrape_dog_detail_fast("https://www.misisrescue.com/post/rex") is None

        browser.assert_called_once()

    @pytest.mark.unit
    @pytest.mark.parametrize("content,name", [(_html("tea_things_you_have_to_know"), "Tea"), ("<html><body><h1>Page not found</h1></body></html>", None)])
    def test_the_browser_path_skips_a_page_without_a_post_body(self, scraper, content, name):
        page = Mock(content=AsyncMock(return_value=content))

        @asynccontextmanager
        async def fake_retry(options=None, **kwargs):
            yield SimpleNamespace(page=page)

        with (
            patch("scrapers.misis_rescue.scraper.PlaywrightOptions", create=True),
            patch.object(scraper, "_with_browser_retry", fake_retry),
            patch.object(scraper.browser_manager, "navigate_with_retry", new=AsyncMock(return_value=True)),
            patch("scrapers.misis_rescue.scraper.asyncio.sleep", new=AsyncMock()),
        ):
            dog = asyncio.run(scraper._scrape_dog_detail_playwright("https://www.misisrescue.com/post/__tea"))

        assert (dog or {}).get("name") == name


@pytest.mark.unit
@pytest.mark.parametrize(
    "facts,breed",
    [
        (["4 months old", "Cane Corso cross", "12kg"], "Cane Corso Mix"),
        (["Possibly Staff cross"], "Staff Mix"),
        (["a husky mix"], "Husky Mix"),
        (["Looks like a lab mix"], "Labrador Mix"),
        (["Medium size mix"], "Mixed Breed"),
        (["Unknown mix"], "Mixed Breed"),
        (["mixed breed, gun dog"], "Mixed Breed"),
        (["weights around 10kg, should be around 20 kg at full size", "mixed breed"], "Mixed Breed"),
    ],
)
def test_a_named_cross_is_the_breed(facts, breed):
    """ "Cane Corso cross" gave no breed, which the standardizer stores as "Unknown"."""
    from scrapers.misis_rescue.normalizer import extract_breed

    assert extract_breed(facts) == breed


@pytest.mark.unit
@pytest.mark.parametrize(
    "facts,age",
    [
        # Iris: the first fact that gives an age, not a later "3 years"
        (["Approx.2 years old", "hound", "fine with kids over 3 years old"], "2 years"),
        # Blacky: a range with a decimal comma
        (["Age: 1,5-2 years", "Sex: male"], "1-2 years"),
        (["2.5 y old", "20-22kg"], "2.5 years"),
        (["nearly 4 months old", "Mixed breed"], "4 months"),
        (["5.5 months old"], "6 months"),
        (["1 year old"], "1 year"),
        (["Mixed breed", "20kg"], None),
        # Durations and other people's ages are not the dog's
        (["mixed breed", "has been in the shelter for 3 years"], None),
        (["would suit children over 12 years old"], None),
        (["Between 2-3 years old"], "2-3 years"),
        (["mixed breed", "we'd prefer kids older than 7 years"], None),
    ],
)
def test_the_first_stated_age_is_the_age(facts, age):
    from scrapers.misis_rescue.detail_parser import stated_age

    assert stated_age(facts) == age


@pytest.mark.unit
def test_a_dob_fact_running_into_the_next_is_cut():
    html = "<html><body><h1 data-hook='post-title'>Kira</h1><div data-hook='post-description'><h2>Things you should know about Kira</h2><p>✔️DOB: April/May 2024 ❣️weights around 16kg ❣️hunting dog mix</p></div></body></html>"

    dog = MisisRescueDetailParser().parse_detail_page(BeautifulSoup(html, "html.parser"))

    assert dog["age_text"] == "DOB: April/May 2024"
    assert dog["date_of_birth"].startswith("DOB: April/May 2024")


@pytest.mark.unit
def test_the_age_is_dated_by_the_posts_last_edit():
    """Tea's "2 years old" was written on 2023-04-16, not on the day we read it."""
    assert _parse("tea_things_you_have_to_know")["age_stated_at"] == "2023-04-16"


@pytest.mark.unit
@pytest.mark.parametrize(
    "fact,kg",
    [("weighs 20kgs", 20.0), ("weighs 12,5kg", 12.5), ("around 21-2 kg", 21.0), ("15-20 kilos", 17.5), ("current weight is 10 kg", 10.0)],
)
def test_weights_as_the_rescue_writes_them(fact, kg):
    from scrapers.misis_rescue.normalizer import extract_weight_kg_legacy

    assert extract_weight_kg_legacy(fact) == kg


@pytest.mark.unit
@pytest.mark.parametrize("heading", ["How do you adopt Rex?", "How to adopt Rex?", "Want to adopt Rex?", "Adoption process"])
def test_the_adoption_text_is_cut_whatever_its_heading(heading):
    blocks = [("h2", "Things you should know about Rex"), ("li", "2 years old"), ("h2", heading), ("p", "Fill in the form.")]

    assert split_post(blocks) == ([], ["2 years old"])


@pytest.mark.unit
def test_the_name_falls_back_to_the_page_title():
    html = "<html><head><title>⭐Tea⭐ | MISI's Animal Rescue</title></head><body><div data-hook='post-description'><p>A story.</p></div></body></html>"

    assert MisisRescueDetailParser().parse_detail_page(BeautifulSoup(html, "html.parser"))["name"] == "Tea"
