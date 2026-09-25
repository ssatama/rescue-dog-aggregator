"""One size scale everywhere: Small, Medium, Large, Giant (#494).

Only a handful of dogs are stored as Tiny, so Tiny sits inside Small; XLarge
is shown as Giant. The catalog filter, its counts and swipe all use the scale.
"""

import pytest
from fastapi.testclient import TestClient

from api.routes.swipe import apply_filters_to_query
from tests.conftest import override_get_db_cursor


@pytest.fixture
def sized_dogs():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute(
        """
        INSERT INTO organizations (id, name, slug, website_url, country, active)
        VALUES (905, 'Size Rescue', 'size-rescue', 'http://example.com/size', 'GB', TRUE);
        INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                             organization_id, adoption_url, standardized_size)
        VALUES (9501, 'Pip', 'pip-9501', 'dog', 'available', TRUE, 'high', 905, 'http://example.com/1', 'Tiny'),
               (9502, 'Bea', 'bea-9502', 'dog', 'available', TRUE, 'high', 905, 'http://example.com/2', 'Small'),
               (9503, 'Moose', 'moose-9503', 'dog', 'available', TRUE, 'high', 905, 'http://example.com/3', 'XLarge');
        """
    )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("sized_dogs")
class TestCatalogSizeScale:
    def test_small_includes_tiny_dogs(self, client: TestClient):
        response = client.get("/api/animals/", params={"standardized_size": "Small", "organization_id": 905})
        assert response.status_code == 200
        assert sorted(dog["name"] for dog in response.json()) == ["Bea", "Pip"]

    def test_counts_fold_tiny_into_small_and_call_xlarge_giant(self, client: TestClient):
        response = client.get("/api/animals/meta/filter_counts", params={"organization_id": 905})
        assert response.status_code == 200
        options = [(opt["value"], opt["label"], opt["count"]) for opt in response.json()["size_options"]]
        assert options == [("Small", "Small", 2), ("XLarge", "Giant", 1)]


@pytest.mark.unit
class TestSwipeSizeScale:
    def test_swipe_sizes_filter_the_standardized_scale(self):
        query_parts, params = apply_filters_to_query([], [], None, ["small", "giant"], None, None)
        assert query_parts == ["AND a.standardized_size = ANY(%s)"]
        assert params == [["Tiny", "Small", "XLarge"]]

    def test_unknown_swipe_size_is_ignored(self):
        assert apply_filters_to_query([], [], None, ["enormous"], None, None) == ([], [])
