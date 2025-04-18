import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)


class TestAnimalDetail:
    def test_get_animal_by_valid_id(self):
        # First fetch one animal to know a valid ID
        list_resp = client.get("/api/animals?limit=1")
        assert list_resp.status_code == 200, list_resp.text
        animals = list_resp.json()
        assert animals, "No animals in database to test with"
        test_id = animals[0]["id"]

        # Now fetch detail by that ID
        resp = client.get(f"/api/animals/{test_id}")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        # core fields
        assert data["id"] == test_id
        assert isinstance(data.get("name"), str) and data["name"]
        assert data["animal_type"] == "dog"
        assert data["status"] == "available"
        # images key should be present and a list
        assert isinstance(data.get("images"), list)
        for img in data["images"]:
            assert isinstance(img, str) and img.startswith("http")

    def test_get_animal_by_invalid_id(self):
        resp = client.get("/api/animals/999999")
        assert resp.status_code == 404
        err = resp.json()
        assert err.get("detail") == "Animal not found"
