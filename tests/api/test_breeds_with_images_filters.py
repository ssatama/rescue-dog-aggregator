"""/breeds/with-images with a breed_type or breed_group filter (#605).

The count query and the sample-dogs query each take the filter values, with
min_count and limit between them. The parameters used to be appended in
pairs, so ?breed_type=purebred put 'purebred' into HAVING COUNT(...) >= %s.
The seeded dogs (tests/conftest.py) have 11 purebreds over 5 breed groups.
"""

import pytest
from fastapi.testclient import TestClient


def breeds(client: TestClient, **params) -> list[dict]:
    response = client.get("/api/animals/breeds/with-images", params={"min_count": 1, "limit": 50, **params})
    assert response.status_code == 200, response.text
    return response.json()


@pytest.mark.database
@pytest.mark.integration
class TestBreedsWithImagesFilters:
    def test_breed_type_keeps_only_that_type(self, client: TestClient):
        found = breeds(client, breed_type="purebred")
        assert {b["breed_type"] for b in found} == {"purebred"}
        assert "Golden Retriever" in {b["primary_breed"] for b in found}

    def test_breed_group_keeps_only_that_group(self, client: TestClient):
        found = breeds(client, breed_group="Herding")
        assert {b["primary_breed"] for b in found} == {"German Shepherd Dog", "Border Collie"}
        assert all(b["sample_dogs"] for b in found)

    def test_both_filters_and_min_count_apply(self, client: TestClient):
        # Each Herding breed has one dog, so min_count=2 leaves none
        assert breeds(client, breed_type="purebred", breed_group="Herding", min_count=2) == []

    def test_mixed_with_a_group_filter(self, client: TestClient):
        found = breeds(client, breed_type="mixed", breed_group="Mixed")
        assert [b["primary_breed"] for b in found] == ["Mixed Breed"]
        assert found[0]["count"] == 3
