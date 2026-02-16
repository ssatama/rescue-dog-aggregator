import urllib.parse

import pytest
from fastapi.testclient import TestClient

TOTAL_TEST_DOGS = 12
MALE_IDS = {9001, 9003, 9005, 9007, 9009, 9011}
FEMALE_IDS = {9002, 9004, 9006, 9008, 9010, 9012}
LARGE_IDS = {9001, 9003, 9004, 9009, 9011}
MEDIUM_IDS = {9002, 9005, 9006, 9007, 9010}
SMALL_IDS = {9008, 9012}

BREED_BY_ID = {
    9001: "Golden Retriever",
    9002: "Mixed Breed",
    9003: "German Shepherd",
    9004: "Labrador Retriever",
    9005: "Beagle",
    9006: "Poodle",
    9007: "Bulldog",
    9008: "Chihuahua",
    9009: "Rottweiler",
    9010: "Border Collie",
    9011: "Siberian Husky",
    9012: "Yorkshire Terrier",
}


@pytest.mark.slow
@pytest.mark.database
class TestPaginationEdgeCases:
    def test_offset_beyond_total_returns_empty_list(self, client: TestClient):
        response = client.get("/api/animals?limit=20&offset=10000")
        assert response.status_code == 200
        assert response.json() == []

    def test_limit_one_returns_exactly_one_animal(self, client: TestClient):
        response = client.get("/api/animals?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "id" in data[0]
        assert "name" in data[0]

    def test_default_pagination_returns_animals(self, client: TestClient):
        response = client.get("/api/animals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == TOTAL_TEST_DOGS


@pytest.mark.slow
@pytest.mark.database
class TestFilterValidation:
    def test_filter_by_sex_male_returns_only_males(self, client: TestClient):
        response = client.get("/api/animals?sex=Male")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == len(MALE_IDS)
        returned_ids = {animal["id"] for animal in data}
        assert returned_ids == MALE_IDS
        for animal in data:
            assert animal["sex"] == "Male"

    def test_filter_by_sex_female_returns_only_females(self, client: TestClient):
        response = client.get("/api/animals?sex=Female")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == len(FEMALE_IDS)
        returned_ids = {animal["id"] for animal in data}
        assert returned_ids == FEMALE_IDS
        for animal in data:
            assert animal["sex"] == "Female"

    def test_filter_by_breed_returns_only_matching(self, client: TestClient):
        response = client.get("/api/animals?standardized_breed=Golden Retriever")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id"] == 9001
        assert data[0]["standardized_breed"] == "Golden Retriever"

    def test_filter_by_size_large_returns_only_large(self, client: TestClient):
        response = client.get("/api/animals?size=large")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == len(LARGE_IDS)
        returned_ids = {animal["id"] for animal in data}
        assert returned_ids == LARGE_IDS
        for animal in data:
            assert animal["size"] == "large"

    def test_filter_by_size_small_returns_only_small(self, client: TestClient):
        response = client.get("/api/animals?size=small")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == len(SMALL_IDS)
        returned_ids = {animal["id"] for animal in data}
        assert returned_ids == SMALL_IDS

    def test_combined_sex_and_size_filter(self, client: TestClient):
        response = client.get("/api/animals?sex=Male&size=large")
        assert response.status_code == 200
        data = response.json()
        expected_ids = MALE_IDS & LARGE_IDS
        returned_ids = {animal["id"] for animal in data}
        assert returned_ids == expected_ids
        for animal in data:
            assert animal["sex"] == "Male"
            assert animal["size"] == "large"

    def test_combined_sex_and_size_medium_female(self, client: TestClient):
        response = client.get("/api/animals?sex=Female&size=medium")
        assert response.status_code == 200
        data = response.json()
        expected_ids = FEMALE_IDS & MEDIUM_IDS
        returned_ids = {animal["id"] for animal in data}
        assert returned_ids == expected_ids

    def test_filter_no_matches_returns_empty(self, client: TestClient):
        response = client.get("/api/animals?standardized_breed=Nonexistent Breed")
        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.slow
@pytest.mark.database
class TestSearchSafety:
    def test_search_with_percent_returns_200(self, client: TestClient):
        encoded = urllib.parse.quote("%wildcard%")
        response = client.get(f"/api/animals?search={encoded}")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_search_with_underscore_returns_200(self, client: TestClient):
        encoded = urllib.parse.quote("test_dog")
        response = client.get(f"/api/animals?search={encoded}")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_search_with_backslash_returns_200(self, client: TestClient):
        encoded = urllib.parse.quote("test\\dog")
        response = client.get(f"/api/animals?search={encoded}")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_search_with_combined_sql_wildcards(self, client: TestClient):
        encoded = urllib.parse.quote("%_\\%_")
        response = client.get(f"/api/animals?search={encoded}")
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    def test_search_by_name_finds_matching_dog(self, client: TestClient):
        response = client.get("/api/animals?search=Beagle")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 1
        matching_ids = {animal["id"] for animal in data}
        assert 9005 in matching_ids


@pytest.mark.slow
@pytest.mark.database
class TestSlugAndIdLookup:
    def test_nonexistent_slug_returns_404(self, client: TestClient):
        response = client.get("/api/animals/this-slug-does-not-exist-anywhere")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_known_slug_returns_correct_animal(self, client: TestClient):
        response = client.get("/api/animals/test-male-dog")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 9001
        assert data["name"] == "Test Male Dog"
        assert data["slug"] == "test-male-dog"
        assert data["sex"] == "Male"
        assert data["standardized_breed"] == "Golden Retriever"

    def test_slug_lookup_includes_organization(self, client: TestClient):
        response = client.get("/api/animals/german-shepherd")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == 9003
        org = data.get("organization")
        assert org is not None
        assert org["name"] == "Mock Test Org"

    def test_legacy_numeric_id_endpoint_redirects(self, client: TestClient):
        response = client.get("/api/animals/id/9001", follow_redirects=False)
        assert response.status_code == 301
        assert "/api/animals/test-male-dog" in response.headers["location"]

    def test_legacy_numeric_id_nonexistent_returns_404(self, client: TestClient):
        response = client.get("/api/animals/id/999999", follow_redirects=False)
        assert response.status_code == 404

    def test_numeric_slug_path_redirects_to_slug_url(self, client: TestClient):
        response = client.get("/api/animals/9001", follow_redirects=False)
        assert response.status_code == 301
        assert "/api/animals/test-male-dog" in response.headers["location"]
