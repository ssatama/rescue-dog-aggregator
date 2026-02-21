import pytest
from fastapi.testclient import TestClient


@pytest.mark.unit
class TestBatchEndpointValidation:
    def test_no_ids_returns_422(self, client: TestClient):
        response = client.get("/api/animals/batch")
        assert response.status_code == 422

    def test_negative_id_returns_422(self, client: TestClient):
        response = client.get("/api/animals/batch?ids=-1")
        assert response.status_code == 422

    def test_zero_id_returns_422(self, client: TestClient):
        response = client.get("/api/animals/batch?ids=0")
        assert response.status_code == 422

    def test_over_100_ids_returns_422(self, client: TestClient):
        ids_param = "&".join(f"ids={i}" for i in range(1, 102))
        response = client.get(f"/api/animals/batch?{ids_param}")
        assert response.status_code == 422


@pytest.mark.slow
@pytest.mark.database
class TestBatchEndpointIntegration:
    def test_single_id_returns_matching_animal(self, client: TestClient):
        response = client.get("/api/animals/batch?ids=9001")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["id"] == 9001
        assert data[0]["animal_type"] == "dog"

    def test_multiple_ids_returns_all_found(self, client: TestClient):
        response = client.get("/api/animals/batch?ids=9001&ids=9002&ids=9003")
        assert response.status_code == 200
        data = response.json()
        returned_ids = {animal["id"] for animal in data}
        assert returned_ids == {9001, 9002, 9003}

    def test_missing_ids_silently_omitted(self, client: TestClient):
        response = client.get("/api/animals/batch?ids=9001&ids=999999")
        assert response.status_code == 200
        data = response.json()
        returned_ids = {animal["id"] for animal in data}
        assert 9001 in returned_ids
        assert 999999 not in returned_ids

    def test_all_missing_ids_returns_empty_list(self, client: TestClient):
        response = client.get("/api/animals/batch?ids=999998&ids=999999")
        assert response.status_code == 200
        assert response.json() == []

    def test_response_includes_organization_data(self, client: TestClient):
        response = client.get("/api/animals/batch?ids=9001")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        org = data[0].get("organization")
        assert org is not None
        assert "name" in org

    def test_response_includes_profiler_data(self, client: TestClient):
        response = client.get("/api/animals/batch?ids=9001")
        assert response.status_code == 200
        data = response.json()
        assert "dog_profiler_data" in data[0]
