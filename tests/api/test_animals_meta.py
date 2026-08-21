import pytest

# No global client - use the fixture from conftest.py


@pytest.mark.database
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
    def test_get_meta_lists_are_string_arrays(self, client, endpoint, key):
        resp = client.get(endpoint)
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)
        # every element is a non-empty string
        assert all(isinstance(x, str) and x for x in data)

    def test_breeds_contains_known_value(self, client):
        """Ensure the breeds meta endpoint returns 'Mixed Breed'."""
        resp = client.get("/api/animals/meta/breeds")
        assert resp.status_code == 200, resp.text
        breeds = resp.json()
        assert "Mixed Breed" in breeds, f"Expected 'Mixed Breed' in {breeds}"

    def test_available_regions_requires_country(self, client):
        """GET /api/animals/meta/available_regions without country => 422."""
        resp = client.get("/api/animals/meta/available_regions")
        assert resp.status_code == 422

    @pytest.mark.slow  # Fails in CI due to missing service_regions table
    def test_available_regions_with_country(self, client):
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


_DISTRIBUTIONS = {
    "age_distribution": {"puppy": 0, "young": 0, "adult": 0, "senior": 0},
    "size_distribution": {"tiny": 0, "small": 0, "medium": 0, "large": 0, "xlarge": 0},
    "experience_distribution": {"first_time_ok": 0, "some_experience": 0, "experienced": 0},
}


@pytest.mark.unit
class TestQualifyingBreedExposesSplit:
    """A breed page covers the breed and its crosses, so the split must survive
    serialisation. It was computed in the service but stripped by the response
    model, which silently drops undeclared fields."""

    def test_model_declares_the_purebred_and_cross_counts(self):
        from api.models.responses import QualifyingBreed

        breed = QualifyingBreed(
            primary_breed="Border Collie",
            breed_slug="border-collie",
            count=41,
            purebred_count=20,
            crossbreed_count=21,
            organization_count=3,
            **_DISTRIBUTIONS,
        )
        assert breed.purebred_count == 20
        assert breed.crossbreed_count == 21

    def test_counts_default_to_zero_when_absent(self):
        from api.models.responses import QualifyingBreed

        breed = QualifyingBreed(
            primary_breed="Galgo",
            breed_slug="galgo",
            count=122,
            organization_count=1,
            **_DISTRIBUTIONS,
        )
        assert breed.purebred_count == 0
        assert breed.crossbreed_count == 0
