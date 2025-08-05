import json
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAnimalsAPI:
    @pytest.fixture
    def client(self):
        """Create test client."""
        return TestClient(app)

    # Sample animal data (useful for potential future tests or reference)
    sample_animal = {
        "id": 1,
        "name": "Buddy",
        "animal_type": "dog",
        "breed": "Labrador Mix",
        "standardized_breed": "Labrador Retriever Mix",
        "breed_group": "Sporting",
        "age_text": "2 years",
        "age_min_months": 24,
        "age_max_months": 36,
        "sex": "Male",
        "size": "Large",
        "standardized_size": "Large",
        "status": "available",
        "adoption_url": "http://example.com/adopt/buddy",
        "primary_image_url": "http://example.com/images/buddy.jpg",
        "organization_id": 1,
        "external_id": "buddy-1234",
        "properties": json.dumps(
            {
                "weight": "30kg",
                "neutered_spayed": "Yes",
                "description": "Friendly, energetic dog who loves to play.",
            }
        ),
        "created_at": datetime(2023, 1, 1).isoformat(),
        "updated_at": datetime(2023, 1, 15).isoformat(),
        "last_scraped_at": datetime(2023, 1, 15).isoformat(),
        "language": "en",
    }

    sample_animal_image = {
        "id": 1,
        "animal_id": 1,
        "image_url": "http://example.com/images/buddy.jpg",
        "is_primary": True,
        "created_at": datetime(2023, 1, 1).isoformat(),
    }

    # --- Test Methods ---
    # Note: All tests now accept the 'client' fixture as an argument

    def test_get_animals(self, client: TestClient):  # Add client fixture
        """Test GET /api/animals endpoint."""
        response = client.get("/api/animals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Consider adding an assertion if the test DB should always have data
        if len(data) > 0:
            first_dog = data[0]
            assert "id" in first_dog  # Good to check for ID
            assert "name" in first_dog
            assert "breed" in first_dog or "standardized_breed" in first_dog
            assert "adoption_url" in first_dog
        else:
            # Or handle the empty case if it's valid under some conditions
            print("Warning: No animals returned from /api/animals")

    # Add client fixture
    def test_get_animals_with_filters(self, client: TestClient):
        """Test GET /api/animals with various filters."""
        # Test basic breeds filter
        response = client.get("/api/animals?breed=Lab")
        assert response.status_code == 200
        # Potential improvement: Assert that results actually contain 'Lab' if
        # possible

        # Test sex filter
        response = client.get("/api/animals?sex=Male")
        assert response.status_code == 200
        # Potential improvement: Assert that results are actually 'Male'

        # Test multiple filters
        response = client.get("/api/animals?size=Large&sex=Male&status=available")
        assert response.status_code == 200

        # Test standardized size if supported
        response = client.get("/api/animals?standardized_size=Large")
        assert response.status_code == 200

        # Test with limit parameter
        response = client.get("/api/animals?limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)  # Ensure it's still a list
        assert len(data) <= 5

    def test_get_animals_with_sitemap_quality_filter(self, client: TestClient):
        """Test that sitemap quality filter returns fewer animals with quality descriptions."""
        # Get total animals without filter
        response_all = client.get("/api/animals?limit=1000")
        assert response_all.status_code == 200
        all_animals = response_all.json()

        # Get animals with sitemap quality filter
        response_quality = client.get("/api/animals?limit=1000&sitemap_quality_filter=true")
        assert response_quality.status_code == 200
        quality_animals = response_quality.json()

        # Quality filtered results should be fewer or equal to total
        # Based on SEO docs, should be ~206 quality animals out of 891 total
        assert len(quality_animals) <= len(all_animals)

        # If we have quality animals, verify they have meaningful descriptions
        if quality_animals:
            for animal in quality_animals[:5]:  # Check first 5 animals
                if "properties" in animal and animal["properties"]:
                    # Parse properties JSON if it's a string
                    props = animal["properties"]
                    if isinstance(props, str):
                        import json

                        props = json.loads(props)

                    # Check for description quality if present
                    if "description" in props and props["description"]:
                        description = props["description"]
                        # Quality descriptions should be >200 chars
                        assert len(description.strip()) >= 200, f"Animal {animal['id']} has short description: {len(description)} chars"

    def test_get_animal_by_id(self, client: TestClient):  # Add client fixture
        """Test GET /api/animals/{id} or /api/dogs/{id} endpoint."""
        response = client.get("/api/animals?limit=1")  # Get just one animal to test
        assert response.status_code == 200
        animals = response.json()

        if not animals:
            pytest.skip("No animals available in the database to test individual retrieval.")

        animal_id = animals[0]["id"]

        # Try the primary endpoint first
        detail_response = client.get(f"/api/animals/{animal_id}")

        # Fallback to legacy if needed (optional, depends if you want to keep
        # supporting it)
        if detail_response.status_code == 404:
            print(f"Note: /api/animals/{animal_id} not found, trying /api/dogs/{animal_id}")
            detail_response = client.get(f"/api/dogs/{animal_id}")

        # Assert success after potential fallback
        assert detail_response.status_code == 200
        dog_data = detail_response.json()

        # Check structure of response
        assert dog_data["id"] == animal_id  # Check ID matches
        assert "name" in dog_data
        assert "breed" in dog_data or "standardized_breed" in dog_data
        assert "adoption_url" in dog_data
        if "images" in dog_data:
            assert isinstance(dog_data["images"], list)

    def test_get_animal_not_found(self, client: TestClient):  # Add client fixture
        """Test GET /api/animals/{id} with non-existent ID."""
        non_existent_id = 999999  # Or generate a truly unique non-existent ID
        response = client.get(f"/api/animals/{non_existent_id}")

        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_get_random_animals(self, client: TestClient):
        """Test GET /api/animals/random endpoint."""
        response = client.get("/api/animals/random?limit=2")  # Request 2 random animals
        assert response.status_code == 200  # Check route exists and is successful
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 2  # Check limit is respected (can be 0, 1, or 2)
        if len(data) > 0:
            # Check structure of the first animal if any are returned
            first_dog = data[0]
            assert "id" in first_dog
            assert "name" in first_dog
            assert "images" not in first_dog  # /random uses Animal model, not AnimalWithImages
            assert "organization_id" in first_dog  # Check for organization ID

    def test_get_animals_includes_organization_social_media(self, client: TestClient):
        """Test that animals list response includes organization social_media field."""
        response = client.get("/api/animals?limit=5")
        assert response.status_code == 200

        animals = response.json()
        assert isinstance(animals, list)

        # Find an animal that has an organization
        animal_with_org = None
        for animal in animals:
            if animal.get("organization") is not None:
                animal_with_org = animal
                break

        # If we found an animal with organization, test the structure
        if animal_with_org:
            org = animal_with_org["organization"]
            assert isinstance(org, dict)
            assert "id" in org
            assert "name" in org
            assert "social_media" in org
            assert isinstance(org["social_media"], dict)

            # Test that animal still has expected fields
            assert "id" in animal_with_org
            assert "name" in animal_with_org
            assert "breed" in animal_with_org

    def test_get_animal_by_id_includes_organization_social_media(self, client):
        """Test that animal detail response includes organization.social_media."""
        # grab one animal
        resp = client.get("/api/animals?limit=1")
        assert resp.status_code == 200
        animals = resp.json()
        assert animals, "Expected at least one animal in the list"

        animal_id = animals[0]["id"]
        detail = client.get(f"/api/animals/{animal_id}")
        assert detail.status_code == 200
        a = detail.json()

        # must have nested org dict
        assert "organization" in a and a["organization"] is not None
        org = a["organization"]
        assert isinstance(org, dict)
        assert "id" in org
        assert "name" in org
        assert "social_media" in org and isinstance(org["social_media"], dict)

    def test_get_animals_with_curation_type_recent(self, client: TestClient):
        """Test GET /api/animals with curation_type=recent."""
        response = client.get("/api/animals?curation_type=recent&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # If we have data, check that it's ordered by created_at DESC
        if len(data) >= 2:
            for i in range(len(data) - 1):
                # Parse ISO datetime strings for comparison
                created_at_current = datetime.fromisoformat(data[i]["created_at"].replace("Z", "+00:00"))
                created_at_next = datetime.fromisoformat(data[i + 1]["created_at"].replace("Z", "+00:00"))
                assert created_at_current >= created_at_next, "Recent dogs should be ordered by created_at DESC"

        # Check that all dogs are from last 7 days (if any returned)
        if len(data) > 0:
            from datetime import timedelta

            seven_days_ago = datetime.now() - timedelta(days=7)
            for dog in data:
                created_at = datetime.fromisoformat(dog["created_at"].replace("Z", "+00:00"))
                # Allow some timezone flexibility
                assert created_at.replace(tzinfo=None) >= seven_days_ago.replace(tzinfo=None) - timedelta(hours=24), f"Dog {dog['name']} created at {created_at} should be within last 7 days"

    def test_get_animals_with_curation_type_diverse(self, client: TestClient):
        """Test GET /api/animals with curation_type=diverse."""
        response = client.get("/api/animals?curation_type=diverse&limit=10")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Check that we have at most one dog per organization
        org_ids = []
        for dog in data:
            if dog.get("organization_id"):
                assert dog["organization_id"] not in org_ids, f"Organization {dog['organization_id']} appears more than once in diverse results"
                org_ids.append(dog["organization_id"])

    def test_get_animals_with_curation_type_random(self, client: TestClient):
        """Test GET /api/animals with curation_type=random (default behavior)."""
        # Test explicit random
        response = client.get("/api/animals?curation_type=random&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Test that default behavior (no curation_type) still works
        response_default = client.get("/api/animals?limit=5")
        assert response_default.status_code == 200
        data_default = response_default.json()
        assert isinstance(data_default, list)

    def test_get_animals_curation_with_filters(self, client: TestClient):
        """Test that curation types work with other filters."""
        # Test recent + size filter
        response = client.get("/api/animals?curation_type=recent&size=Medium&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned dogs should be Medium size
        for dog in data:
            if dog.get("size"):
                assert dog["size"] == "Medium"

        # Test diverse + breed filter
        response = client.get("/api/animals?curation_type=diverse&standardized_breed=Labrador%20Retriever&limit=5")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_animals_invalid_curation_type(self, client: TestClient):
        """Test that invalid curation_type is properly validated."""
        # This test verifies that invalid curation types are rejected
        # The actual validation error handling is tested elsewhere
        import pytest

        with pytest.raises(Exception) as exc_info:
            response = client.get("/api/animals?curation_type=invalid&limit=5")
        # Verify that the error mentions curation_type validation
        assert "curation_type" in str(exc_info.value)

    def test_statistics_endpoint(self, client: TestClient):
        """Test GET /api/statistics endpoint."""
        response = client.get("/api/animals/statistics")
        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "total_dogs" in data
        assert "total_organizations" in data
        assert "countries" in data
        assert "organizations" in data

        # Check data types
        assert isinstance(data["total_dogs"], int)
        assert isinstance(data["total_organizations"], int)
        assert isinstance(data["countries"], list)
        assert isinstance(data["organizations"], list)

        # Check countries structure
        if len(data["countries"]) > 0:
            country = data["countries"][0]
            assert "country" in country
            assert "count" in country
            assert isinstance(country["count"], int)

        # Check organizations structure
        if len(data["organizations"]) > 0:
            org = data["organizations"][0]
            assert "id" in org
            assert "name" in org
            assert "dog_count" in org
            assert isinstance(org["dog_count"], int)

        # Verify counts are non-negative
        assert data["total_dogs"] >= 0
        assert data["total_organizations"] >= 0

    def test_get_animals_with_curation_type_recent_with_fallback_normal_case(self, client: TestClient):
        """Test recent_with_fallback when recent dogs exist - should return recent dogs."""
        response = client.get("/api/animals?curation_type=recent_with_fallback&limit=4")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # If we have data, verify it's properly ordered by created_at DESC
        if len(data) >= 2:
            for i in range(len(data) - 1):
                created_at_current = datetime.fromisoformat(data[i]["created_at"].replace("Z", "+00:00"))
                created_at_next = datetime.fromisoformat(data[i + 1]["created_at"].replace("Z", "+00:00"))
                assert created_at_current >= created_at_next, "Dogs should be ordered by created_at DESC"

    def test_get_animals_with_curation_type_recent_with_fallback_fallback_case(self, client: TestClient):
        """Test recent_with_fallback when no recent dogs exist - should return latest available dogs."""
        # This test assumes there might be periods with no dogs added in last 7 days
        # but some dogs exist in the system (older than 7 days)
        response = client.get("/api/animals?curation_type=recent_with_fallback&limit=4")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Should return some dogs (fallback to latest available) or empty list if no dogs at all
        # This test verifies the API doesn't error out when no recent dogs exist
        if len(data) > 0:
            # Verify structure of returned dogs
            first_dog = data[0]
            assert "id" in first_dog
            assert "name" in first_dog
            assert "created_at" in first_dog

            # Verify ordered by created_at DESC (latest first)
            if len(data) >= 2:
                for i in range(len(data) - 1):
                    created_at_current = datetime.fromisoformat(data[i]["created_at"].replace("Z", "+00:00"))
                    created_at_next = datetime.fromisoformat(data[i + 1]["created_at"].replace("Z", "+00:00"))
                    assert created_at_current >= created_at_next, "Fallback dogs should be ordered by created_at DESC"

    def test_get_animals_with_curation_type_recent_with_fallback_empty_case(self, client: TestClient):
        """Test recent_with_fallback when no dogs exist at all - should return empty list gracefully."""
        # This test verifies graceful handling when database has no dogs
        # Note: In real testing environment, this might not trigger since test data usually exists
        response = client.get("/api/animals?curation_type=recent_with_fallback&limit=4")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should handle empty case without errors

    def test_pagination_offset(self, client: TestClient):
        """Test pagination with offset - consolidated from test_animals_list.py."""
        # page 1
        r1 = client.get("/api/animals?limit=2&offset=0")
        assert r1.status_code == 200, r1.text
        a1 = r1.json()
        # page 2
        r2 = client.get("/api/animals?limit=2&offset=2")
        assert r2.status_code == 200, r2.text
        a2 = r2.json()

        # no overlap
        ids1 = {x["id"] for x in a1}
        ids2 = {x["id"] for x in a2}
        assert ids1.isdisjoint(ids2)

    @pytest.mark.parametrize("sex", ["Male", "Female"])
    def test_filter_by_sex(self, sex, client: TestClient):
        """Test filtering by sex - consolidated from test_animals_list.py."""
        resp = client.get(f"/api/animals?sex={sex}")
        assert resp.status_code == 200, resp.text
        for animal in resp.json():
            assert animal["sex"] == sex

    def test_filter_by_breed(self, client: TestClient):
        """Test filtering by breed - consolidated from test_animals_list.py."""
        # pick the first real breed from meta (skip placeholder)
        breeds = client.get("/api/animals/meta/breeds").json()
        if len(breeds) < 2:
            pytest.skip("not enough breeds to test")
        breed = breeds[1]
        resp = client.get(f"/api/animals?standardized_breed={breed}")
        assert resp.status_code == 200, resp.text
        for animal in resp.json():
            assert animal["standardized_breed"] == breed

    def test_filter_by_organization(self, client: TestClient):
        """Test filtering by organization - consolidated from test_animals_list.py."""
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

    def test_get_animal_by_valid_id_detailed(self, client: TestClient):
        """Test GET /api/animals/{id} with detailed validation - consolidated from test_animals_detail.py."""
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
        # images key should be present and a list of AnimalImage objects
        assert isinstance(data.get("images"), list)
        for img in data["images"]:
            assert isinstance(img, dict)
            assert "id" in img and isinstance(img["id"], int)
            assert "image_url" in img and isinstance(img["image_url"], str)
            assert img["image_url"].startswith("http")
            assert "is_primary" in img and isinstance(img["is_primary"], bool)

    def test_get_animal_by_invalid_id_detailed(self, client: TestClient):
        """Test GET /api/animals/{id} with invalid ID - consolidated from test_animals_detail.py."""
        resp = client.get("/api/animals/999999")
        assert resp.status_code == 404
        err = resp.json()
        assert err.get("detail") == "Animal not found"

    # API Response Consistency Tests - consolidated from test_response_consistency.py
    def test_all_endpoints_return_json_content_type(self, client: TestClient):
        """Test that all endpoints return proper JSON content type - consolidated from test_response_consistency.py."""
        endpoints = [
            "/api/animals",
            "/api/organizations",
        ]

        for endpoint in endpoints:
            response = client.get(endpoint)
            assert "application/json" in response.headers.get("content-type", "")

    def test_error_responses_have_consistent_format(self, client: TestClient):
        """Test that error responses follow consistent format - consolidated from test_response_consistency.py."""
        # Test 404 responses
        response = client.get("/api/animals/999999")
        assert response.status_code == 404
        error_data = response.json()
        assert "detail" in error_data
        assert isinstance(error_data["detail"], str)

        response = client.get("/api/organizations/999999")
        assert response.status_code == 404
        error_data = response.json()
        assert "detail" in error_data
        assert isinstance(error_data["detail"], str)

    def test_success_responses_have_expected_structure(self, client: TestClient):
        """Test that successful responses have expected structure - consolidated from test_response_consistency.py."""
        # Test organizations list
        response = client.get("/api/organizations")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

        # Test animals list
        response = client.get("/api/animals")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
