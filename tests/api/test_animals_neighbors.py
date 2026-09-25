"""GET /api/animals/{slug}/neighbors: prev/next for the dog page (#490).

The seeded dogs are 9001-9014, all available, so the default newest-first
order is 9014 ... 9001.
"""

import pytest
from fastapi.testclient import TestClient


def neighbors(client: TestClient, slug: str, **params) -> dict:
    response = client.get(f"/api/animals/{slug}/neighbors", params=params)
    assert response.status_code == 200
    return response.json()


def slugs(body: dict) -> tuple:
    return tuple(side and side["slug"] for side in (body["prev"], body["next"]))


@pytest.mark.database
@pytest.mark.integration
class TestAnimalNeighbors:
    def test_middle_dog_gets_the_dogs_either_side_in_list_order(self, client: TestClient):
        # 9003 German Shepherd sits between 9004 (newer) and 9002 (older)
        assert slugs(neighbors(client, "german-shepherd")) == ("labrador-mix", "mixed-breed-dog")

    def test_returns_only_what_a_link_and_prefetch_need(self, client: TestClient):
        body = neighbors(client, "german-shepherd")
        assert body["prev"] == {
            "slug": "labrador-mix",
            "name": "Labrador Mix",
            "primary_image_url": "http://example.com/lab.jpg",
        }

    def test_newest_dog_wraps_back_to_the_oldest(self, client: TestClient):
        assert slugs(neighbors(client, "ageless-wonder")) == ("test-male-dog", "straddler-pup")

    def test_oldest_dog_wraps_forward_to_the_newest(self, client: TestClient):
        assert slugs(neighbors(client, "test-male-dog")) == ("mixed-breed-dog", "ageless-wonder")

    def test_follows_the_requested_sort(self, client: TestClient):
        # By name: ... Bulldog, Chihuahua, German Shepherd ...
        assert slugs(neighbors(client, "chihuahua", sort="name-asc")) == ("bulldog", "german-shepherd")

    def test_stays_within_the_same_filters_as_the_list(self, client: TestClient):
        # Small dogs, newest first: 9012 Yorkshire Terrier, 9008 Chihuahua
        assert slugs(neighbors(client, "chihuahua", size="small")) == ("yorkshire-terrier", "yorkshire-terrier")

    def test_filters_that_join_service_regions_do_not_duplicate_dogs(self, client: TestClient):
        # The org serves two countries; the join must not make a dog its own neighbour
        assert slugs(neighbors(client, "german-shepherd", available_to_country="Testland")) == (
            "labrador-mix",
            "mixed-breed-dog",
        )

    def test_dog_outside_the_filtered_list_has_no_neighbors(self, client: TestClient):
        assert neighbors(client, "chihuahua", size="large") == {"prev": None, "next": None}

    def test_only_dog_in_the_list_has_no_neighbors(self, client: TestClient):
        assert neighbors(client, "poodle", breed="Poodle") == {"prev": None, "next": None}

    def test_unknown_slug_has_no_neighbors(self, client: TestClient):
        assert neighbors(client, "no-such-dog") == {"prev": None, "next": None}
