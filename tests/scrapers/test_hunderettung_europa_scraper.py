"""Hunderettung Europa: dogs from the WordPress REST API (#689).

Fixtures are the site's REST answers on 2026-10-01: the category tree and four
posts. Saskia is a puppy in the Romanian shelter whose page holds the editors'
template hidden on all devices; Motte's template facts and Molly's template
photo are hidden on desktop only; Tindra is in a German foster home.
"""

import json
import re
from pathlib import Path
from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import ListingIncompleteError
from scrapers.hunderettung_europa.dogs_scraper import HunderettungEuropaScraper, birth_text, size_from_height

FIXTURES = Path(__file__).parent.parent / "fixtures" / "hunderettung_europa"
CATEGORIES = json.loads((FIXTURES / "categories.json").read_text())
POSTS = json.loads((FIXTURES / "posts.json").read_text())


def _rest(categories=CATEGORIES, posts=POSTS, per_page_override=None, headers=True):
    """A get_listing_page stand-in serving the fixtures, paged as WordPress pages them."""
    calls = []

    def get(url, params=None, headers=None):
        calls.append((url, dict(params or {})))
        is_posts = url.endswith("/posts")
        # The category lookup asks for its slugs, as WordPress filters them
        slugs = set(params.get("slug", "").split(",")) if not is_posts else None
        data = posts if is_posts else [category for category in categories if category["slug"] in slugs]
        per_page = (is_posts and per_page_override) or params["per_page"]
        page = params["page"]
        # WordPress says 0 pages for no results
        paging = {"X-WP-TotalPages": str(-(-len(data) // per_page)), "X-WP-Total": str(len(data))} if send_headers else {}
        return Mock(json=Mock(return_value=data[(page - 1) * per_page : page * per_page]), headers=paging)

    send_headers = headers

    return get, calls


@pytest.fixture
def scraper():
    scraper = HunderettungEuropaScraper()
    scraper.skip_existing_animals = False
    scraper.session_manager = None
    return scraper


def _collect(scraper, **rest):
    get, calls = _rest(**rest)
    with patch.object(scraper, "get_listing_page", side_effect=get):
        return {dog["name"]: dog for dog in scraper.collect_data()}, calls


@pytest.mark.unit
class TestDogs:
    def test_a_shelter_puppy(self, scraper):
        saskia = _collect(scraper)[0]["Saskia"]

        assert saskia["external_id"] == "hre-116228"
        assert saskia["adoption_url"] == "https://hunderettung-europa.de/saskia/"
        assert saskia["sex"] == "Female"
        # "geb. ca. Februar 2026", in the form the age parser reads as a birth month
        assert saskia["age_text"] == "02/2026"
        assert saskia["date_of_birth"] == "geb. ca. Februar 2026"
        # "Geschätzte Endschulterhöhe: ca. 20 – 39 cm": small at both ends
        assert saskia["size"] == "Small"
        assert saskia["properties"]["location"] == "Romania"
        assert saskia["properties"]["Früheste Ausreise"] == "07.10."

    def test_the_story_runs_from_its_heading_to_the_adoption_button(self, scraper):
        story = _collect(scraper)[0]["Saskia"]["properties"]["description"]

        assert story.startswith("Sanfte Hündin Saskia sucht eine liebevolle Familie\nSaskia wurde nach einem Anruf")
        # Links stay inside their sentence
        assert "findest du in unserem Tierschutz-FAQ." in story
        assert "Zuhause gesucht" in story
        # Not the facts, the link to the video or the rescue's generic adoption text
        assert "Geschlecht:" not in story
        assert "Lerne hier" not in story
        assert "Vermittlungsablauf" not in story

    def test_no_template_text_or_photo_reaches_a_dog(self, scraper):
        dogs = _collect(scraper)[0]
        blob = json.dumps(dogs, ensure_ascii=False)

        assert "HUNDENAME" in json.dumps(POSTS) and "template-foto" in json.dumps(POSTS)
        assert "HUNDENAME" not in blob
        assert "xx –" not in blob
        assert "/template-" not in blob

    def test_template_facts_shown_only_on_phones_are_not_the_dogs(self, scraper):
        motte = _collect(scraper)[0]["Motte"]

        assert motte["properties"]["Im Tierheim seit"] == "August 2026"
        assert motte["age_text"] == "08/2019"
        assert motte["size"] == "Small"

    def test_photos_are_the_dogs_own_in_page_order(self, scraper):
        molly = _collect(scraper)[0]["Molly"]

        assert molly["primary_image_url"] == molly["image_urls"][0]
        assert molly["primary_image_url"].endswith("/2026/07/Grosse-Huendin-sucht-liebevolles-Zuhause-Molly-Hunderettung-Europa.jpg")
        assert all("/template-" not in url for url in molly["image_urls"])
        assert len(molly["image_urls"]) == len(set(molly["image_urls"])) == 5

    def test_a_foster_dog(self, scraper):
        tindra = _collect(scraper)[0]["Tindra"]

        # "Pflegehund Tindra" on the site
        assert tindra["external_id"] == "hre-115387"
        assert tindra["properties"]["raw_name"] == "Pflegehund Tindra"
        assert tindra["properties"]["location"] == "Blankenhof, Germany"
        assert tindra["size"] == "Medium"
        assert tindra["age_text"] == "05/2025"


@pytest.mark.unit
class TestFacts:
    @pytest.mark.parametrize(
        ("height", "size"),
        [
            ("ca. 50 – 59 cm", "Medium"),
            ("ca. 41-49cm", "Medium"),
            ("ca. 60 cm", "Large"),
            ("ca. 20 – 39 cm", "Small"),
            # A puppy's guess across two sizes is no size
            ("ca. 20 – 59 cm", None),
            ("ca. 40 – 79 cm", None),
            (None, None),
        ],
    )
    def test_size_from_height(self, height, size):
        assert size_from_height(height) == size

    @pytest.mark.parametrize(
        ("age", "text"),
        [("geb. ca. Februar 2026", "02/2026"), ("geb. Juni 2026", "06/2026"), ("geb. ca. 2016", "2016"), ("unbekannt", None), (None, None)],
    )
    def test_birth_text(self, age, text):
        assert birth_text(age) == text

    def test_categories_stand_in_for_missing_sex_and_height(self, scraper):
        post = {**POSTS[0], "content": {"rendered": re.sub(r"(Geschlecht|Geschätzte Endschulterhöhe):[^<]*", "", POSTS[0]["content"]["rendered"])}}
        # Weiblich (104) and Mittel (110)
        post["categories"] = [*post["categories"], 110]

        saskia = _collect(scraper, posts=[post])[0]["Saskia"]

        assert not {"Geschlecht", "Geschätzte Endschulterhöhe"} & set(saskia["properties"])
        assert saskia["sex"] == "Female"
        assert saskia["size"] == "Medium"


@pytest.mark.unit
class TestListing:
    def test_asks_for_every_location_without_adopted_dogs(self, scraper):
        _, calls = _collect(scraper)
        params = next(params for url, params in calls if url.endswith("/posts"))

        # Rumänien and Deutschland with its federal states; WordPress adds the children
        assert params["categories[terms]"] == "83,85"
        assert params["categories[include_children]"] == "true"
        # Happy-Ends Hunde and its subcategories
        assert params["categories_exclude[terms]"] == 36
        assert params["categories_exclude[include_children]"] == "true"

    def test_categories_are_found_by_slug_not_number(self, scraper):
        renumbered = [{**category, "id": category["id"] + 1000, "parent": category["parent"] + 1000 if category["parent"] else 0} for category in CATEGORIES]
        posts = [{**post, "categories": [category + 1000 for category in post["categories"]]} for post in POSTS]

        dogs, calls = _collect(scraper, categories=renumbered, posts=posts)

        assert dogs["Tindra"]["properties"]["location"] == "Blankenhof, Germany"
        assert next(params for url, params in calls if url.endswith("/posts"))["categories_exclude[terms]"] == 1036

    def test_a_missing_category_fails_loudly(self, scraper):
        categories = [category for category in CATEGORIES if category["slug"] != "rumaenien"]

        with pytest.raises(ListingIncompleteError, match="rumaenien"):
            _collect(scraper, categories=categories)

    def test_every_page_is_read(self, scraper):
        dogs, calls = _collect(scraper, per_page_override=3)

        assert len(dogs) == 4
        assert [params["page"] for url, params in calls if url.endswith("/posts")] == [1, 2]

    def test_every_route_is_read_in_id_order(self, scraper):
        _, calls = _collect(scraper)

        assert {(params["orderby"], params["order"]) for _, params in calls} == {("id", "asc")}

    def test_categories_are_one_lookup_by_slug(self, scraper):
        """2026-10-01: the site ignores orderby on categories, and paged lookups skipped the root."""
        _, calls = _collect(scraper)

        lookups = [params for url, params in calls if url.endswith("/categories")]
        assert len(lookups) == 1
        assert {"hundekategorien", "rumaenien", "deutschland", "happy-ends-hunde"} <= set(lookups[0]["slug"].split(","))

    def test_a_category_under_another_parent_fails_loudly(self, scraper):
        moved = [{**category, "parent": 0} if category["slug"] == "rumaenien" else category for category in CATEGORIES]

        with pytest.raises(ListingIncompleteError, match="rumaenien"):
            _collect(scraper, categories=moved)

    def test_pages_that_overlap_fail_loudly(self, scraper):
        get, _ = _rest(per_page_override=2)

        def overlapping(url, params=None, headers=None):
            response = get(url, params=params, headers=headers)
            if url.endswith("/posts") and params["page"] == 2:
                response.json = Mock(return_value=POSTS[:2])
            return response

        with patch.object(scraper, "get_listing_page", side_effect=overlapping), pytest.raises(ListingIncompleteError, match="distinct items"):
            scraper.collect_data()

    def test_an_empty_listing_fails_loudly(self, scraper):
        with pytest.raises(ListingIncompleteError, match="no dogs"):
            _collect(scraper, posts=[])

    def test_without_paging_headers_the_listing_fails_loudly(self, scraper):
        with pytest.raises(ListingIncompleteError, match="X-WP-TotalPages"):
            _collect(scraper, headers=False)

    def test_an_empty_page_within_the_count_fails_loudly(self, scraper):
        get, _ = _rest()

        def short(url, params=None, headers=None):
            response = get(url, params=params, headers=headers)
            if url.endswith("/posts"):
                response.headers = {"X-WP-TotalPages": "2"}
                if params["page"] == 2:
                    response.json = Mock(return_value=[])
            return response

        with patch.object(scraper, "get_listing_page", side_effect=short), pytest.raises(ListingIncompleteError, match="page 2 of 2 is empty"):
            scraper.collect_data()

    def test_a_missing_fallback_tree_only_loses_the_fallback(self, scraper):
        categories = [category for category in CATEGORIES if category["slug"] != "groesse"]

        assert len(_collect(scraper, categories=categories)[0]) == 4

    def test_a_post_without_facts_is_a_failed_dog(self, scraper):
        post = {**POSTS[0], "content": {"rendered": re.sub(r"(Im Tierheim seit|Geschlecht|Geschätzte?s? \w+|Herkunft|Früheste Ausreise):", r"\1", POSTS[0]["content"]["rendered"])}}

        dogs = _collect(scraper, posts=[post, *POSTS[1:]])[0]

        assert "Saskia" not in dogs
        assert scraper.detail_failures == ["https://hunderettung-europa.de/saskia/"]

    def test_a_post_that_cant_be_read_skips_one_dog_and_is_still_found(self, scraper):
        broken = {**POSTS[0], "title": None}
        found = []
        scraper._record_all_found_external_ids = found.extend

        dogs = _collect(scraper, posts=[broken, *POSTS[1:]])[0]

        assert set(dogs) == {"Motte", "Molly", "Tindra"}
        assert scraper.detail_failures == ["https://hunderettung-europa.de/saskia/"]
        assert {dog["external_id"] for dog in found} == {"hre-116228", "hre-114613", "hre-111259", "hre-115387"}
