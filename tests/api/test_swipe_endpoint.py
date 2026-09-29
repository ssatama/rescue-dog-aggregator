from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from api.dependencies import get_pooled_db_cursor
from api.main import app
from api.routes.swipe import MIN_SWIPE_QUALITY_SCORE


class RecordingCursor:
    """Stands in for the database: returns the given rows and remembers every
    query, so a test can check the SQL a filter produces. The test database has
    no profiled dogs, so tests against it saw an empty stack and asserted
    nothing (#550)."""

    def __init__(self, rows=(), total=None):
        self.rows = list(rows)
        self.total = len(self.rows) if total is None else total
        self.executed: list[tuple[str, list]] = []

    def execute(self, query, params=None):
        self.executed.append((" ".join(query.split()), list(params or [])))

    def fetchall(self):
        return self.rows

    def fetchone(self):
        return {"total": self.total}

    @property
    def stack_query(self):
        return self.executed[0]

    @property
    def count_query(self):
        return self.executed[1]


def swipe_row(dog_id: int) -> dict:
    return {
        "id": dog_id,
        "name": f"Dog {dog_id}",
        "animal_type": "dog",
        "status": "available",
        "dog_profiler_data": {"quality_score": 90},
        "organization_id": 1,
        "organization_name": "Test Rescue",
        "organization_country": "GB",
    }


@pytest.fixture
def swipe(client: TestClient):
    """GET /api/dogs/swipe against a RecordingCursor: returns (response, cursor)."""

    def call(query: str = "", rows=(), total=None):
        cursor = RecordingCursor(rows, total)

        def mock_get_cursor():
            yield cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor
        try:
            return client.get(f"/api/dogs/swipe{query}"), cursor
        finally:
            app.dependency_overrides.pop(get_pooled_db_cursor, None)

    return call


class TestSwipeEndpoint:
    """Test suite for the /api/dogs/swipe endpoint"""

    def test_returns_the_stack_with_paging_fields(self, swipe):
        response, _ = swipe("?limit=2", rows=[swipe_row(1), swipe_row(2)], total=5)

        assert response.status_code == 200
        data = response.json()
        assert [dog["id"] for dog in data["dogs"]] == [1, 2]
        assert data["dogs"][0]["organization"]["country"] == "GB"
        assert (data["hasMore"], data["nextOffset"], data["total"]) == (True, 2, 5)

    def test_last_page_has_no_next_offset(self, swipe):
        response, cursor = swipe("?limit=10&offset=10", rows=[swipe_row(11)], total=11)

        data = response.json()
        assert (data["hasMore"], data["nextOffset"]) == (False, None)
        assert cursor.stack_query[1][-2:] == [10, 10]  # LIMIT, OFFSET

    def test_only_profiled_dogs_above_the_quality_bar(self, swipe):
        _, cursor = swipe()

        for sql, _ in cursor.executed:
            assert "a.dog_profiler_data IS NOT NULL" in sql
            assert f"(a.dog_profiler_data->>'quality_score')::float > {MIN_SWIPE_QUALITY_SCORE}" in sql

    @pytest.mark.parametrize("param", ["adoptable_to_country", "country"])
    def test_filters_by_where_the_rescue_ships(self, swipe, param):
        _, cursor = swipe(f"?{param}=GB")

        for sql, params in (cursor.stack_query, cursor.count_query):
            assert "AND o.ships_to ? %s" in sql
            assert "GB" in params

    def test_sizes_map_onto_the_catalog_scale(self, swipe):
        _, cursor = swipe("?size[]=small&size[]=giant")

        for sql, params in (cursor.stack_query, cursor.count_query):
            assert "AND a.standardized_size = ANY(%s)" in sql
            assert ["Tiny", "Small", "XLarge"] in params

    def test_unknown_size_adds_no_filter(self, swipe):
        _, cursor = swipe("?size[]=enormous")

        assert "standardized_size" not in cursor.stack_query[0]

    def test_ages_are_or_ed_together(self, swipe):
        _, cursor = swipe("?age[]=puppy&age[]=senior")

        sql = cursor.stack_query[0]
        assert "AND ((" in sql and ") OR (" in sql
        # Months, not age_text (#643): Puppy under 12, Senior from 96
        assert "a.age_min_months < 12" in sql and "a.age_min_months >= 96" in sql

    def test_excludes_swiped_dogs(self, swipe):
        _, cursor = swipe("?excluded=4,%207")

        for sql, params in (cursor.stack_query, cursor.count_query):
            assert "AND a.id NOT IN (%s,%s)" in sql
            assert params[-2:] == [4, 7] or params[-4:-2] == [4, 7]

    def test_rejects_excluded_ids_that_are_not_numbers(self, swipe):
        response, cursor = swipe("?excluded=1;DROP")

        assert response.status_code == 400
        assert cursor.executed == []


class TestSwipeGallery:
    """The swipe card's photos come from animals.images, not properties (#499)."""

    @pytest.mark.unit
    def test_keeps_the_first_photos_in_order(self):
        from api.routes.swipe import SWIPE_GALLERY_PHOTOS, swipe_gallery

        images = [{"url": f"https://img/{n}.jpg", "width": 800, "height": 600, "original_url": "x"} for n in range(10)]
        photos = swipe_gallery(images, "https://img/0.jpg")
        assert len(photos) == SWIPE_GALLERY_PHOTOS
        assert photos[0] == {"url": "https://img/0.jpg", "width": 800, "height": 600}
        assert [p["url"] for p in photos] == [f"https://img/{n}.jpg" for n in range(SWIPE_GALLERY_PHOTOS)]

    @pytest.mark.unit
    def test_falls_back_to_the_hero(self):
        from api.routes.swipe import swipe_gallery

        assert swipe_gallery(None, "https://img/hero.jpg") == [{"url": "https://img/hero.jpg", "width": None, "height": None}]
        assert swipe_gallery([], None) == []


class TestSwipeDetailsFacts:
    """The details sheet reads size and scraped facts the way the dog page does (#504)."""

    def test_sends_standardized_size_and_only_the_fact_properties(self, client: TestClient):
        cursor = MagicMock()
        cursor.fetchall.return_value = [
            {
                "id": 7,
                "name": "Rex",
                "animal_type": "dog",
                "status": "available",
                "size": "Giant",
                "standardized_size": "Large",
                "properties": {
                    "good_with_cats": "no",
                    "medical_status": "Vaccinated",
                    "description": "A long scraped story",
                },
                "dog_profiler_data": {"quality_score": 90},
                "organization_id": 1,
                "organization_name": "Test Rescue",
            }
        ]
        cursor.fetchone.return_value = {"total": 1}

        def mock_get_cursor():
            yield cursor

        app.dependency_overrides[get_pooled_db_cursor] = mock_get_cursor
        try:
            response = client.get("/api/dogs/swipe")
        finally:
            app.dependency_overrides.pop(get_pooled_db_cursor, None)

        assert response.status_code == 200
        dog = response.json()["dogs"][0]
        assert dog["standardized_size"] == "Large"
        assert dog["properties"] == {"good_with_cats": "no", "medical_status": "Vaccinated"}
