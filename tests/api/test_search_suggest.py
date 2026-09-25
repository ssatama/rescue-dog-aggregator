"""GET /api/search/suggest and synonym expansion in the catalog search (#491).

The base fixture has one org (901, "Mock Test Org") and dogs 9001-9014, among
them a German Shepherd Dog, a Labrador Retriever and a Yorkshire Terrier. The
fixture below adds a second rescue with a Staffy, a Frenchie and one dog that
is no longer listed.
"""

import pytest
from fastapi.testclient import TestClient

from api.services.search_service import _match_breeds, match_score
from tests.conftest import override_get_db_cursor


@pytest.fixture
def dogs_trust():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute(
        """
        INSERT INTO organizations (id, name, slug, website_url, country, active)
        VALUES (902, 'Dogs Trust', 'dogs-trust', 'http://example.com/dt', 'GB', TRUE);
        INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                             organization_id, adoption_url, breed, standardized_breed, primary_breed, breed_slug, breed_type)
        VALUES
            (9201, 'Rocky', 'rocky-9201', 'dog', 'available', TRUE, 'high', 902, 'http://example.com/9201',
             'Staffie', 'Staffordshire Bull Terrier', 'Staffordshire Bull Terrier', 'staffordshire-bull-terrier', 'purebred'),
            (9202, 'Bella', 'bella-9202', 'dog', 'available', TRUE, 'high', 902, 'http://example.com/9202',
             'French Bulldog', 'French Bulldog', 'French Bulldog', 'french-bulldog', 'purebred'),
            (9203, 'Gone Staffy', 'gone-9203', 'dog', 'unknown', TRUE, 'high', 902, 'http://example.com/9203',
             'Staffie', 'Staffordshire Bull Terrier', 'Staffordshire Bull Terrier', 'staffordshire-bull-terrier', 'purebred');
        """
    )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass


def suggest(client: TestClient, q: str, **params) -> dict:
    response = client.get("/api/search/suggest", params={"q": q, **params})
    assert response.status_code == 200
    return response.json()


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("dogs_trust")
class TestSuggest:
    def test_staffy_finds_the_breed_through_its_synonym(self, client: TestClient):
        breeds = suggest(client, "staffy")["breeds"]
        # The dog that is no longer listed is not counted
        assert breeds[0] == {
            "name": "Staffordshire Bull Terrier",
            "slug": "staffordshire-bull-terrier",
            "count": 1,
            "matched_synonym": "staffy",
        }

    def test_gsd_finds_german_shepherd(self, client: TestClient):
        assert [(b["name"], b["matched_synonym"]) for b in suggest(client, "gsd")["breeds"]] == [("German Shepherd Dog", "gsd")]

    def test_lab_finds_labrador_without_naming_a_synonym(self, client: TestClient):
        breeds = suggest(client, "lab")["breeds"]
        assert breeds[0]["name"] == "Labrador Retriever"
        assert breeds[0]["matched_synonym"] is None

    def test_frenchie_finds_french_bulldog(self, client: TestClient):
        assert suggest(client, "Frenchie")["breeds"][0]["slug"] == "french-bulldog"

    def test_rescue_by_name(self, client: TestClient):
        assert suggest(client, "dogs trust")["rescues"] == [{"name": "Dogs Trust", "slug": "dogs-trust", "count": 2}]

    def test_dog_by_name(self, client: TestClient):
        assert suggest(client, "roc")["dogs"] == [{"name": "Rocky", "slug": "rocky-9201", "breed": "Staffordshire Bull Terrier", "rescue": "Dogs Trust", "image": None}]

    def test_typo_still_finds_the_breed_and_the_dog(self, client: TestClient):
        body = suggest(client, "labardor")
        assert body["breeds"][0]["name"] == "Labrador Retriever"
        assert suggest(client, "Rockyy")["dogs"][0]["name"] == "Rocky"

    def test_nothing_matches(self, client: TestClient):
        assert suggest(client, "zzqx") == {"breeds": [], "rescues": [], "dogs": [], "filters": []}

    def test_trait_phrases_map_to_filters(self, client: TestClient):
        assert suggest(client, "good with cats")["filters"] == [{"label": "Good with cats", "params": {"good_with_cats": "true"}}]
        assert suggest(client, "pupp")["filters"] == [{"label": "Puppies", "params": {"age_category": "Puppy"}}]

    def test_limit_applies_per_group(self, client: TestClient):
        body = suggest(client, "terrier", limit=1)
        assert len(body["breeds"]) == 1

    def test_query_of_only_punctuation_returns_nothing(self, client: TestClient):
        assert suggest(client, "%") == {"breeds": [], "rescues": [], "dogs": [], "filters": []}


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("dogs_trust")
class TestCatalogSearchSynonyms:
    def test_synonym_finds_dogs_whose_text_never_says_it(self, client: TestClient):
        # Bella's breed text is "French Bulldog"; nothing in it contains "frenchie"
        dogs = client.get("/api/animals/", params={"search": "frenchie"}).json()
        assert [d["name"] for d in dogs] == ["Bella"]

    def test_filter_counts_use_the_same_expansion(self, client: TestClient):
        counts = client.get("/api/animals/meta/filter_counts", params={"search": "gsd"}).json()
        assert [(o["value"], o["count"]) for o in counts["organization_options"]] == [("901", 1)]

    def test_plain_text_search_is_unchanged(self, client: TestClient):
        dogs = client.get("/api/animals/", params={"search": "rock"}).json()
        assert [d["name"] for d in dogs] == ["Rocky"]


@pytest.mark.unit
class TestMatchScore:
    @pytest.mark.parametrize(
        ("query", "term", "expected"),
        [
            ("collie", "collie", 1.0),
            ("coll", "collie", 0.9),
            ("collie", "border collie", 0.8),
            ("lab", "black labrador", 0.8),
        ],
    )
    def test_exact_beats_prefix_beats_later_word(self, query, term, expected):
        assert match_score(query, term) == expected

    def test_short_typos_do_not_match(self):
        assert match_score("lbr", "labrador") == 0.0

    def test_long_typo_matches_below_any_prefix(self):
        assert 0 < match_score("labardor", "labrador retriever") < 0.8

    def test_middle_of_a_word_does_not_match(self):
        assert match_score("lab", "black") == 0.0


@pytest.mark.unit
class TestMatchBreeds:
    ROWS = [
        {"name": "German Shepherd Dog", "slug": "german-shepherd-dog", "count": 3},
        {"name": "Dalmatian", "slug": "dalmatian", "count": 9},
    ]

    def test_typo_matches_are_dropped_when_a_real_match_exists(self):
        # "alsatian" is one letter from "dalmatian" but names German Shepherd Dog
        assert [b["name"] for b in _match_breeds("alsatian", self.ROWS, 5)] == ["German Shepherd Dog"]

    def test_typo_matches_are_kept_when_nothing_else_matches(self):
        assert [b["name"] for b in _match_breeds("dalmatien", self.ROWS, 5)] == ["Dalmatian"]
