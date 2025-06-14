import json
from datetime import datetime

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
        response = client.get(
            "/api/animals?size=Large&sex=Male&status=available")
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
        response = client.get(
            "/api/animals?limit=1")  # Get just one animal to test
        assert response.status_code == 200
        animals = response.json()

        if not animals:
            pytest.skip(
                "No animals available in the database to test individual retrieval."
            )

        animal_id = animals[0]["id"]

        # Try the primary endpoint first
        detail_response = client.get(f"/api/animals/{animal_id}")

        # Fallback to legacy if needed (optional, depends if you want to keep
        # supporting it)
        if detail_response.status_code == 404:
            print(
                f"Note: /api/animals/{animal_id} not found, trying /api/dogs/{animal_id}"
            )
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
        response = client.get(
            "/api/animals/random?limit=2")  # Request 2 random animals
        assert response.status_code == 200  # Check route exists and is successful
        data = response.json()
        assert isinstance(data, list)
        assert len(data) <= 2  # Check limit is respected (can be 0, 1, or 2)
        if len(data) > 0:
            # Check structure of the first animal if any are returned
            first_dog = data[0]
            assert "id" in first_dog
            assert "name" in first_dog
            assert (
                "images" not in first_dog
            )  # /random uses Animal model, not AnimalWithImages
            assert "organization_id" in first_dog  # Check for organization ID

    def test_get_animals_includes_organization_social_media(
            self, client: TestClient):
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
