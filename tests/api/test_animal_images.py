"""The API returns photo galleries from animals.images (#488).

The dog page gets the whole gallery, lists the first 3 photos sliced in SQL,
and a dog without a gallery gets its hero, so `images` is never empty.
"""

import json

import pytest
from fastapi.testclient import TestClient

from tests.conftest import override_get_db_cursor

CDN = "https://images.rescuedogs.me/rescue_dogs/test"


def photo(n: int) -> dict:
    return {"url": f"{CDN}/p{n}.jpg", "original_url": f"https://rescue.example/p{n}.jpg", "width": 800 + n, "height": 600}


DOGS = {
    9911: ("Many", [photo(n) for n in range(1, 6)]),
    9912: ("Single", [photo(1)]),
    9913: ("Legacy", None),
}


@pytest.fixture
def gallery_dogs():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    for dog_id, (name, images) in DOGS.items():
        cursor.execute(
            """
            INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                                 organization_id, adoption_url, primary_image_url, images, properties)
            VALUES (%s, %s, %s, 'dog', 'available', TRUE, 'high', 901, %s, %s, %s, '{}')
            """,
            (dog_id, name, f"{name.lower()}-{dog_id}", f"http://example.com/{dog_id}", f"{CDN}/hero-{dog_id}.jpg", json.dumps(images) if images else None),
        )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass
    yield DOGS


def listed(client: TestClient) -> dict[int, dict]:
    dogs = client.get("/api/animals/?organization_id=901&limit=1000").json()
    return {d["id"]: d for d in dogs if d["id"] in DOGS}


@pytest.mark.database
@pytest.mark.integration
class TestAnimalImages:
    def test_the_dog_page_returns_the_whole_gallery_in_order(self, client: TestClient, gallery_dogs):
        data = client.get("/api/animals/many-9911").json()

        assert [p["url"] for p in data["images"]] == [f"{CDN}/p{n}.jpg" for n in range(1, 6)]
        assert data["images"][0] == {"url": f"{CDN}/p1.jpg", "width": 801, "height": 600}

    def test_lists_carry_the_first_three_photos_without_source_urls(self, client: TestClient, gallery_dogs):
        many = listed(client)[9911]

        assert [p["url"] for p in many["images"]] == [f"{CDN}/p1.jpg", f"{CDN}/p2.jpg", f"{CDN}/p3.jpg"]
        assert all(set(p) == {"url", "width", "height"} for p in many["images"])

    def test_a_one_photo_gallery_is_a_one_element_list(self, client: TestClient, gallery_dogs):
        assert client.get("/api/animals/single-9912").json()["images"] == [{"url": f"{CDN}/p1.jpg", "width": 801, "height": 600}]
        assert len(listed(client)[9912]["images"]) == 1

    def test_a_dog_without_a_gallery_gets_its_hero(self, client: TestClient, gallery_dogs):
        hero = {"url": f"{CDN}/hero-9913.jpg", "width": None, "height": None}

        assert client.get("/api/animals/legacy-9913").json()["images"] == [hero]
        assert listed(client)[9913]["images"] == [hero]

    def test_batch_and_random_carry_galleries_too(self, client: TestClient, gallery_dogs):
        batch = client.get("/api/animals/batch?ids=9911&ids=9913").json()
        assert {d["id"]: len(d["images"]) for d in batch} == {9911: 3, 9913: 1}

        for dog in client.get("/api/animals/random?limit=10").json():
            assert 1 <= len(dog["images"]) <= 3
