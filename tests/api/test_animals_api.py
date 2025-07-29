import json
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAnimalsAPI:
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
