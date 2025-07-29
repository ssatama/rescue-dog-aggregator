import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestRandomAnimals:
    def test_default_limit(self):
        """GET /api/animals/random should return 3 dogs by default."""
        resp = client.get("/api/animals/random")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == 3
        for a in data:
            assert isinstance(a, dict)
            assert a["animal_type"] == "dog"
            assert a["status"] == "available"

    @pytest.mark.parametrize("limit", [1, 5, 10])
    def test_custom_limit(self, limit):
        """Respect the `limit` query param within 1–10."""
        resp = client.get(f"/api/animals/random?limit={limit}")
        assert resp.status_code == 200, resp.text
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) == limit

    def test_limit_bounds(self):
        """Out‐of‐range limit should yield 422."""
        resp_low = client.get("/api/animals/random?limit=0")
        assert resp_low.status_code == 422
        resp_high = client.get("/api/animals/random?limit=11")
        assert resp_high.status_code == 422
