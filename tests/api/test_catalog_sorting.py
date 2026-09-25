"""Catalog sorts and the matching-dog total (#494).

The base fixture's dogs 9001-9014 all belong to org 901 and share one
created_at. This fixture adds two busier rescues whose dogs were listed on
different days, so the orders can be told apart.
"""

from itertools import groupby

import pytest
from fastapi.testclient import TestClient

from tests.conftest import override_get_db_cursor


@pytest.fixture
def two_more_rescues():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute(
        """
        INSERT INTO organizations (id, name, slug, website_url, country, active)
        VALUES (903, 'Busy Rescue', 'busy-rescue', 'http://example.com/busy', 'GB', TRUE),
               (904, 'Other Rescue', 'other-rescue', 'http://example.com/other', 'DE', TRUE);
        INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                             organization_id, adoption_url, created_at, age_min_months, age_max_months)
        SELECT 9300 + n, 'Busy ' || n, 'busy-' || n, 'dog', 'available', TRUE, 'high', 903,
               'http://example.com/busy/' || n, NOW() - (n || ' days')::interval, n, n + 2
        FROM generate_series(1, 12) AS n;
        INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                             organization_id, adoption_url, created_at)
        SELECT 9400 + n, 'Other ' || n, 'other-' || n, 'dog', 'available', TRUE, 'high', 904,
               'http://example.com/other/' || n, NOW() - ((100 + n) || ' days')::interval
        FROM generate_series(1, 4) AS n;
        """
    )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass


def dogs(client: TestClient, **params) -> list[dict]:
    response = client.get("/api/animals/", params={"limit": 20, **params})
    assert response.status_code == 200
    return response.json()


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("two_more_rescues")
class TestCatalogSorting:
    def test_waiting_longest_lists_the_oldest_listing_first(self, client: TestClient):
        names = [dog["name"] for dog in dogs(client, sort="oldest")[:4]]
        assert names == ["Other 4", "Other 3", "Other 2", "Other 1"]

    def test_recommended_never_lets_one_rescue_run_more_than_three_in_a_row(self, client: TestClient):
        page = dogs(client, sort="recommended")
        assert len(page) == 20
        longest_run = max(len(list(run)) for _, run in groupby(dog["organization_id"] for dog in page))
        assert longest_run <= 3

    def test_recommended_pages_do_not_repeat_or_skip_dogs(self, client: TestClient):
        first = dogs(client, sort="recommended", limit=15)
        second = dogs(client, sort="recommended", limit=15, offset=15)
        everything = dogs(client, sort="recommended", limit=100)
        assert [d["id"] for d in first + second] == [d["id"] for d in everything]

    def test_youngest_first_with_unknown_ages_last(self, client: TestClient):
        page = dogs(client, sort="age-asc", limit=100)
        ages = [dog["age_min_months"] for dog in page]
        known = [age for age in ages if age is not None]
        assert known == sorted(known)
        assert ages[len(known) :] == [None] * (len(ages) - len(known))

    def test_oldest_dogs_first(self, client: TestClient):
        page = dogs(client, sort="age-desc", limit=3)
        assert [dog["age_max_months"] for dog in page] == [96, 84, 60]

    def test_unknown_sort_is_rejected(self, client: TestClient):
        assert client.get("/api/animals/", params={"sort": "random"}).status_code == 422

    def test_prev_next_follow_the_recommended_order(self, client: TestClient):
        page = dogs(client, sort="recommended", limit=3)
        middle = page[1]["slug"]
        body = client.get(f"/api/animals/{middle}/neighbors", params={"sort": "recommended"}).json()
        assert (body["prev"]["slug"], body["next"]["slug"]) == (page[0]["slug"], page[2]["slug"])


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("two_more_rescues")
class TestMatchingTotal:
    @pytest.mark.parametrize(
        "params",
        [{}, {"organization_id": 903}, {"search": "busy"}, {"age_category": "Senior"}, {"available_to_country": "Testland"}],
    )
    def test_total_is_what_the_list_returns(self, client: TestClient, params: dict):
        listed = dogs(client, limit=1000, **params)
        counts = client.get("/api/animals/meta/filter_counts", params=params).json()
        assert counts["total"] == len(listed)
