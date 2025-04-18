import pytest
from fastapi.testclient import TestClient
from api.main import app  # adjust import if your FastAPI app lives elsewhere

client = TestClient(app)


class TestAnimalsMeta:
    @pytest.mark.parametrize(
        "endpoint, key",
        [
            ("/api/animals/meta/breeds", None),
            ("/api/animals/meta/breed_groups", None),
            ("/api/animals/meta/location_countries", None),
            ("/api/animals/meta/available_countries", None),
        ],
    )
    def test_get_meta_lists_are_string_arrays(self, endpoint, key):
        resp = client.get(endpoint)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)
        # every element is a non-empty string
        assert all(isinstance(x, str) and x for x in data)

    def test_breeds_contains_known_value(self):
        """Ensure the breeds meta endpoint returns 'Mixed Breed'."""
        resp = client.get("/api/animals/meta/breeds")
        assert resp.status_code == 200, resp.text
        breeds = resp.json()
        assert "Mixed Breed" in breeds, f"Expected 'Mixed Breed' in {breeds}"

    def test_available_regions_requires_country(self):
        """GET /api/animals/meta/available_regions without country => 422."""
        resp = client.get("/api/animals/meta/available_regions")
        assert resp.status_code == 422

    def test_available_regions_with_country(self):
        """GET /api/animals/meta/available_regions?country=<X> returns string list."""
        # First grab any valid country
        countries = client.get("/api/animals/meta/location_countries").json()
        if not countries:
            pytest.skip("No countries present to test regions")
        country = countries[0]

        resp = client.get(f"/api/animals/meta/available_regions?country={country}")
        assert resp.status_code == 200, resp.text
        regions = resp.json()
        assert isinstance(regions, list)
        # every element is a non-empty string
        assert all(isinstance(r, str) and r for r in regions)
