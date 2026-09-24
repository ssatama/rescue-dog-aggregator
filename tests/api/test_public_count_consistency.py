"""Every public count agrees with what the lists return (#451).

Low-confidence dogs are hidden from the lists by default, so the organization header,
the statistics, breed and country totals must leave them out too. The fixture org
(901) gets one extra low-confidence dog on top of its seeded high-confidence ones.
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import override_get_db_cursor


@pytest.fixture
def low_confidence_dog():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute(
        """
        INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                             organization_id, adoption_url, primary_breed, breed_slug, breed_type)
        VALUES (9901, 'Ghost', 'ghost-9901', 'dog', 'available', TRUE, 'low', 901,
                'http://example.com/9901', 'Beagle', 'beagle', 'purebred')
        """
    )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass
    yield 9901


@pytest.mark.database
@pytest.mark.integration
def test_counts_agree_with_the_lists(client: TestClient, low_confidence_dog):
    listed = client.get("/api/animals/?organization_id=901&limit=1000").json()
    assert low_confidence_dog not in {d["id"] for d in listed}

    org = client.get("/api/organizations/mock-test-org").json()
    assert org["total_dogs"] == len(listed)

    beagle = next(b for b in client.get("/api/animals/breeds/with-images?min_count=1&limit=50").json() if b["breed_slug"] == "beagle")
    listed_beagles = client.get("/api/animals/?primary_breed=Beagle&limit=1000").json()
    assert beagle["count"] == len(listed_beagles)

    total = client.get("/api/animals/statistics").json()["total_dogs"]
    assert client.get("/api/animals/breeds/stats").json()["total_dogs"] == total
    assert client.get("/api/animals/stats/by-country").json()["total"] == total
