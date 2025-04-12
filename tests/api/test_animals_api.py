import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
from datetime import datetime
import json

# Import the FastAPI app
from api.main import app

# Create test client
client = TestClient(app)


class TestAnimalsAPI:
    # Sample animal data
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

    def test_get_animals(self):
        """Test GET /api/animals endpoint."""
        # Make request to the endpoint
        response = client.get("/api/animals")

        # Check response status
        assert response.status_code == 200
        data = response.json()

        # Verify it returns a list with data
        assert isinstance(data, list)
        assert len(data) > 0  # Just check we have some data

        # Check structure of first item
        first_dog = data[0]
        assert "name" in first_dog
        assert "breed" in first_dog or "standardized_breed" in first_dog
        assert "adoption_url" in first_dog

    def test_get_animals_with_filters(self):
        """Test GET /api/animals with various filters."""
        # Test basic breeds filter
        response = client.get("/api/animals?breed=Lab")
        assert response.status_code == 200

        # Test sex filter
        response = client.get("/api/animals?sex=Male")
        assert response.status_code == 200

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
        assert len(data) <= 5

    def test_get_animal_by_id(self):
        """Test GET /api/animals/{id} or /api/dogs/{id} endpoint."""
        # First, get a list of dogs to find a valid ID
        response = client.get("/api/animals")
        assert response.status_code == 200
        dogs = response.json()

        if len(dogs) > 0:
            # Get the ID of the first dog
            dog_id = dogs[0]["id"]

            # Try to get that specific dog
            detail_response = client.get(f"/api/animals/{dog_id}")
            if detail_response.status_code != 200:
                # Try the legacy endpoint if animals endpoint doesn't work
                detail_response = client.get(f"/api/dogs/{dog_id}")

            # At least one path should work
            assert detail_response.status_code == 200
            dog_data = detail_response.json()

            # Check structure of response
            assert "name" in dog_data
            assert "breed" in dog_data or "standardized_breed" in dog_data
            assert "adoption_url" in dog_data

            # If images are included in the endpoint
            if "images" in dog_data:
                assert isinstance(dog_data["images"], list)
        else:
            pytest.skip("No dogs available to test individual dog retrieval")

    def test_get_animal_not_found(self):
        """Test GET /api/animals/{id} with non-existent ID."""
        # Use a very high ID that's unlikely to exist
        response = client.get("/api/animals/999999")

        # Check response
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data
        assert "not found" in data["detail"].lower()

    def test_legacy_dogs_endpoint(self):
        """Test the legacy /api/dogs endpoint works."""
        # Make request to the legacy endpoint
        response = client.get("/api/dogs")

        # Check that it works
        assert response.status_code == 200
        data = response.json()

        # Check we get data
        assert isinstance(data, list)
        assert len(data) > 0

        # Check first item structure
        first_dog = data[0]
        assert "name" in first_dog
        assert "breed" in first_dog or "standardized_breed" in first_dog
