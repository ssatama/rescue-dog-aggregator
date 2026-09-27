"""Dogs whose rescue states no breed are no breed group (#568, #572).

Since #568 a missing breed is NULL, not "Unknown". After the #572 backfill,
/breeds/with-images grouped 52 such dogs under a NULL primary_breed, and the
/breeds page's schema rejected the whole response (JAVASCRIPT-NEXTJS-88).
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import override_get_db_cursor


@pytest.fixture
def dogs_without_a_breed():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute(
        """
        INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                             organization_id, adoption_url, primary_image_url)
        VALUES (9911, 'Nobreed', 'nobreed-9911', 'dog', 'available', TRUE, 'high', 901,
                'http://example.com/9911', 'https://images.rescuedogs.me/9911.jpg'),
               (9912, 'Alsonone', 'alsonone-9912', 'dog', 'available', TRUE, 'high', 901,
                'http://example.com/9912', 'https://images.rescuedogs.me/9912.jpg')
        """
    )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass
    yield [9911, 9912]


@pytest.mark.database
@pytest.mark.integration
def test_dogs_without_a_breed_are_not_a_breed(client: TestClient, dogs_without_a_breed):
    breeds = client.get("/api/animals/breeds/with-images?min_count=1&limit=50").json()

    assert breeds, "the seeded breeds are still listed"
    assert all(breed["primary_breed"] for breed in breeds)
