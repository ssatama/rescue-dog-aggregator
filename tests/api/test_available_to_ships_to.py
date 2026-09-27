""" "Available to" a country means the rescue rehomes there: its ships_to (#539).

The catalog filter, its counts and the "I live in" country list used to read
the service_regions table, which also holds where the dogs live. So "30
adoptable to you in Spain" sat above 30 cards without the "Adoptable to you"
badge, which reads ships_to. The maintainer chose ships_to for both.
Seeded org 901 ships to Testland and Otherland.
"""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import override_get_db_cursor


@pytest.fixture
def dogs_live_in_dogland():
    """Org 901's dogs also live in Dogland, which it doesn't rehome to."""
    cursor_generator = override_get_db_cursor()
    cursor = next(cursor_generator)
    cursor.execute("INSERT INTO service_regions (organization_id, country) VALUES (901, 'Dogland')")
    try:
        cursor_generator.send(None)  # commit and close
    except StopIteration:
        pass
    yield "Dogland"


@pytest.mark.database
@pytest.mark.integration
class TestAvailableToIsShipsTo:
    def test_the_filter_follows_ships_to(self, client: TestClient, dogs_live_in_dogland):
        assert client.get("/api/animals", params={"available_to_country": "Testland"}).json()
        assert client.get("/api/animals", params={"available_to_country": dogs_live_in_dogland}).json() == []

    def test_the_count_matches_the_filter(self, client: TestClient, dogs_live_in_dogland):
        counts = client.get("/api/animals/meta/filter_counts", params={"available_to_country": dogs_live_in_dogland}).json()
        assert counts["total"] == 0

    def test_country_options_are_where_rescues_rehome(self, client: TestClient, dogs_live_in_dogland):
        counts = client.get("/api/animals/meta/filter_counts").json()
        options = {option["value"] for option in counts["available_country_options"]}
        assert {"Testland", "Otherland"} <= options
        assert dogs_live_in_dogland not in options

    def test_the_i_live_in_list_is_where_rescues_rehome(self, client: TestClient, dogs_live_in_dogland):
        countries = client.get("/api/animals/meta/available_countries").json()
        assert {"Testland", "Otherland"} <= set(countries)
        assert dogs_live_in_dogland not in countries
