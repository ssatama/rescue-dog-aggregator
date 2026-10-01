"""Country pages group dogs by where they are, not where the rescue is (#702).

The fixture rescue (901) is based in "Testland". Three of its dogs get a
per-dog country, plus one low-confidence dog the lists hide; the rest have
none and are on no country page.
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import override_get_db_cursor


@pytest.fixture
def located_dogs():
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute('UPDATE animals SET properties = properties || \'{"location_country": "RO"}\' WHERE id IN (9001, 9002)')
    cursor.execute('UPDATE animals SET properties = properties || \'{"location_country": "DE"}\' WHERE id = 9003')
    cursor.execute(
        """
        INSERT INTO animals (id, name, slug, animal_type, status, active, availability_confidence,
                             organization_id, adoption_url, properties)
        VALUES (9902, 'Ghost', 'ghost-9902', 'dog', 'available', TRUE, 'low', 901,
                'http://example.com/9902', '{"location_country": "RO"}')
        """
    )
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass


@pytest.mark.database
@pytest.mark.integration
@pytest.mark.usefixtures("located_dogs")
class TestDogCountry:
    def test_stats_count_dogs_where_they_are(self, client: TestClient):
        stats = client.get("/api/animals/stats/by-country").json()

        assert {c["code"]: c["count"] for c in stats["countries"]} == {"RO": 2, "DE": 1}
        assert stats["total"] == 3

    def test_the_filter_matches_the_dogs_country_not_the_rescues(self, client: TestClient):
        romania = client.get("/api/animals/?location_country=RO&limit=100").json()
        testland = client.get("/api/animals/?location_country=Testland&limit=100").json()

        assert {d["id"] for d in romania} == {9001, 9002}
        assert testland == []

    def test_filter_counts_agree_with_the_list(self, client: TestClient):
        counts = client.get("/api/animals/meta/filter_counts").json()

        assert {o["value"]: o["count"] for o in counts["location_country_options"]} == {"RO": 2, "DE": 1}
