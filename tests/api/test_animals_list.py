import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAnimalsList:

    def test_pagination_offset(self):
        # page 1
        r1 = client.get("/api/animals?limit=2&offset=0")
        assert r1.status_code == 200, r1.text
        a1 = r1.json()
        # page 2
        r2 = client.get("/api/animals?limit=2&offset=2")
        assert r2.status_code == 200, r2.text
        a2 = r2.json()

        # no overlap
        ids1 = {x["id"] for x in a1}
        ids2 = {x["id"] for x in a2}
        assert ids1.isdisjoint(ids2)

    @pytest.mark.parametrize("sex", ["Male", "Female"])
    def test_filter_by_sex(self, sex):
        resp = client.get(f"/api/animals?sex={sex}")
        assert resp.status_code == 200, resp.text
        for animal in resp.json():
            assert animal["sex"] == sex

    def test_filter_by_breed(self):
        # pick the first real breed from meta (skip placeholder)
        breeds = client.get("/api/animals/meta/breeds").json()
        if len(breeds) < 2:
            pytest.skip("not enough breeds to test")
        breed = breeds[1]
        resp = client.get(f"/api/animals?standardized_breed={breed}")
        assert resp.status_code == 200, resp.text
        for animal in resp.json():
            assert animal["standardized_breed"] == breed

    def test_filter_by_organization(self):
        # grab one animal to pick its org_id
        base = client.get("/api/animals?limit=1").json()
        if not base:
            pytest.skip("no animals to test")
        # prefer top‐level organization_id, else nested.organization.id
        org_id = base[0].get("organization_id") or base[0].get("organization", {}).get("id")
        assert org_id is not None, "Response did not include an org ID"

        # now filter by that ID
        resp = client.get(f"/api/animals?organization_id={org_id}")
        assert resp.status_code == 200, resp.text
        for animal in resp.json():
            # again prefer top‐level
            got = animal.get("organization_id") or animal.get("organization", {}).get("id")
            assert got == org_id, f"Expected org_id={org_id}, got {got}"
