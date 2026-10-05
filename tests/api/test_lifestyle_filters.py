"""Lifestyle filters and their counts (#495).

The filters read the LLM profile and match only dogs whose profile records a
positive value: a missing profile, or a field stored as "unknown", is never a
yes. Each count says how many dogs the filter would show and how many have the
information at all, given every other active filter.
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import override_get_db_cursor

PROFILES = {
    # name: (sex, dog_profiler_data)
    "Ada": ("Male", '{"good_with_children": "yes", "good_with_dogs": "yes", "good_with_cats": "yes", "experience_level": "first_time_ok", "energy_level": "low"}'),
    "Bo": ("Female", '{"good_with_children": "older_children", "good_with_dogs": "no", "good_with_cats": "unknown", "experience_level": "some_experience", "energy_level": "very_high"}'),
    "Cy": ("Female", '{"good_with_children": "no", "good_with_dogs": "selective", "good_with_cats": "with_training", "experience_level": "first_time_ok", "energy_level": "high"}'),
    "Di": ("Male", '{"energy_level": "medium"}'),
    "Ed": ("Male", None),
}


@pytest.fixture
def profiled_dogs():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute(
        """
        INSERT INTO organizations (id, name, slug, website_url, country, active)
        VALUES (906, 'Profiled Rescue', 'profiled-rescue', 'http://example.com/p', 'GB', TRUE),
               (907, 'Unprofiled Rescue', 'unprofiled-rescue', 'http://example.com/u', 'GB', TRUE);
        """
    )
    for index, (name, (sex, profile)) in enumerate(PROFILES.items()):
        cursor.execute(
            """
            INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                                 organization_id, adoption_url, sex, dog_profiler_data)
            VALUES (%s, %s, %s, 'dog', 'available', TRUE, 'high', 906, %s, %s, %s::jsonb)
            """,
            (9601 + index, name, f"{name.lower()}-{9601 + index}", f"http://example.com/{index}", sex, profile),
        )
    cursor.execute(
        """
        INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                             organization_id, adoption_url)
        VALUES (9701, 'Fay', 'fay-9701', 'dog', 'available', TRUE, 'high', 907, 'http://example.com/f');
        """
    )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass


def names(client: TestClient, **params) -> list[str]:
    response = client.get("/api/animals/", params={"organization_id": 906, **params})
    assert response.status_code == 200
    return sorted(dog["name"] for dog in response.json())


def lifestyle(client: TestClient, **params) -> dict[str, tuple[int, int]]:
    response = client.get("/api/animals/meta/filter_counts", params=params)
    assert response.status_code == 200
    return {name: (value["count"], value["known"]) for name, value in response.json()["lifestyle"].items()}


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("profiled_dogs")
class TestLifestyleFilters:
    def test_children_match_yes_and_older_children_only(self, client: TestClient):
        assert names(client, good_with_kids="true") == ["Ada", "Bo"]

    def test_cats_match_yes_and_with_training_but_never_unknown(self, client: TestClient):
        assert names(client, good_with_cats="true") == ["Ada", "Cy"]

    def test_dogs_match_yes_only(self, client: TestClient):
        assert names(client, good_with_dogs="true") == ["Ada"]

    def test_first_time_friendly(self, client: TestClient):
        assert names(client, experience_level="first_time_ok") == ["Ada", "Cy"]

    @pytest.mark.parametrize(("band", "expected"), [("low", ["Ada"]), ("medium", ["Di"]), ("high", ["Bo", "Cy"])])
    def test_energy_bands_and_high_includes_very_high(self, client: TestClient, band, expected):
        assert names(client, energy=band) == expected

    def test_energy_level_stays_exact(self, client: TestClient):
        assert names(client, energy_level="high") == ["Cy"]

    def test_unknown_energy_band_is_rejected(self, client: TestClient):
        response = client.get("/api/animals/", params={"energy": "very_high"})
        assert response.status_code == 422

    def test_toggles_combine(self, client: TestClient):
        assert names(client, good_with_kids="true", good_with_cats="true", energy="low") == ["Ada"]


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("profiled_dogs")
class TestLifestyleCounts:
    def test_counts_and_known_counts(self, client: TestClient):
        assert lifestyle(client, organization_id=906) == {
            "good_with_kids": (2, 3),
            "good_with_dogs": (1, 3),
            "good_with_cats": (2, 2),
            "first_time_friendly": (2, 3),
            "energy_low": (1, 4),
            "energy_medium": (1, 4),
            "energy_high": (2, 4),
        }

    def test_rescue_with_no_profiles_counts_nothing(self, client: TestClient):
        assert set(lifestyle(client, organization_id=907).values()) == {(0, 0)}

    def test_counts_reflect_other_lifestyle_filters_but_not_their_own(self, client: TestClient):
        counts = lifestyle(client, organization_id=906, good_with_cats="true")
        assert counts["good_with_cats"] == (2, 2)  # its own filter is left out
        assert counts["good_with_kids"] == (1, 2)  # Ada and Cy only
        assert counts["energy_high"] == (1, 2)  # Cy

    def test_energy_counts_ignore_the_chosen_band(self, client: TestClient):
        counts = lifestyle(client, organization_id=906, energy="high")
        assert counts["energy_low"] == (1, 4)
        assert counts["good_with_kids"] == (1, 2)  # Bo and Cy, Bo matches

    def test_counts_reflect_other_filters(self, client: TestClient):
        counts = lifestyle(client, organization_id=906, sex="Male")
        assert counts["good_with_kids"] == (1, 1)
        assert counts["energy_medium"] == (1, 2)

    def test_total_agrees_with_the_list(self, client: TestClient):
        response = client.get("/api/animals/meta/filter_counts", params={"organization_id": 906, "good_with_kids": "true", "energy": "high"})
        assert response.json()["total"] == len(names(client, good_with_kids="true", energy="high")) == 1


# Behind an AI "unknown", or an AI answer scored 0.5 or less, the rescue's own
# answer (scraped properties) decides, as it does on the dog's card (#658).
RESCUE_ANSWERS = {
    # name: (dog_profiler_data, properties)
    "Gus": ('{"good_with_cats": "unknown"}', '{"good_with_cats": true}'),
    "Hal": ('{"good_with_dogs": "yes", "confidence_scores": {"good_with_dogs": 0.4}}', '{"good_with_dogs": false}'),
    "Ivy": ('{"good_with_children": "no", "confidence_scores": {"good_with_children": 0.9}}', '{"good_with_children": "Yes (11+)"}'),
    "Jo": (None, '{"good_with_children": "Yes (11+)", "good_with_dogs": "Yes (female dogs)"}'),
    "Kit": ('{"good_with_cats": "yes", "confidence_scores": {"good_with_cats": 0.5}}', '{"good_with_children": "Unknown"}'),
}


@pytest.fixture
def rescue_answer_dogs():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute(
        """
        INSERT INTO organizations (id, name, slug, website_url, country, active)
        VALUES (908, 'Scraped Rescue', 'scraped-rescue', 'http://example.com/s', 'GB', TRUE);
        """
    )
    for index, (name, (profile, properties)) in enumerate(RESCUE_ANSWERS.items()):
        cursor.execute(
            """
            INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                                 organization_id, adoption_url, dog_profiler_data, properties)
            VALUES (%s, %s, %s, 'dog', 'available', TRUE, 'high', 908, %s, %s::jsonb, %s::jsonb)
            """,
            (9801 + index, name, f"{name.lower()}-{9801 + index}", f"http://example.com/r{index}", profile, properties),
        )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("rescue_answer_dogs")
class TestRescueAnswerFallback:
    def test_rescue_yes_fills_in_behind_an_ai_unknown(self, client: TestClient):
        assert names(client, organization_id=908, good_with_cats="true") == ["Gus"]

    def test_rescue_no_stands_in_for_a_low_confidence_ai_yes(self, client: TestClient):
        assert "Hal" not in names(client, organization_id=908, good_with_dogs="true")

    def test_confident_ai_answer_wins_over_the_rescue(self, client: TestClient):
        assert "Ivy" not in names(client, organization_id=908, good_with_kids="true")

    def test_rescue_age_qualified_yes_matches_children(self, client: TestClient):
        assert names(client, organization_id=908, good_with_kids="true") == ["Jo"]

    def test_rescue_qualified_dogs_answer_is_not_a_yes(self, client: TestClient):
        assert names(client, organization_id=908, good_with_dogs="true") == []

    def test_counts_use_the_same_rule(self, client: TestClient):
        counts = lifestyle(client, organization_id=908)
        assert counts["good_with_kids"] == (1, 2)  # Jo; Ivy known, Kit's "Unknown" isn't
        assert counts["good_with_dogs"] == (0, 2)  # Hal's rescue no, Jo's qualified yes
        assert counts["good_with_cats"] == (1, 1)  # Gus; Kit's 0.5 is a guess
