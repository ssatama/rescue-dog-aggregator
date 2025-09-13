"""Tests for breed images endpoint."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from api.main import app

# Remove the client fixture as it conflicts with the global one
# @pytest.fixture
# def client():
#     """Create test client."""
#     return TestClient(app)


@pytest.fixture
def mock_db_cursor():
    """Create mock database cursor for breed tests."""
    cursor = MagicMock()
    return cursor


class TestBreedImagesEndpoint:
    """Test breed images endpoint."""

    def test_get_breeds_with_images_success(self, client, mock_db_cursor):
        """Test successful retrieval of breeds with sample dog images."""
        # Mock database response with breeds and sample dogs
        mock_breeds_data = [
            {
                "primary_breed": "Mixed Breed",
                "breed_slug": "mixed-breed",
                "breed_type": "mixed",
                "breed_group": "Mixed",
                "count": 1462,
                "sample_dogs": [
                    {"name": "Luna", "slug": "luna-123", "primary_image_url": "https://example.com/luna.jpg", "age_text": "2 years", "sex": "Female", "personality_traits": ["Playful", "Friendly"]},
                    {"name": "Max", "slug": "max-456", "primary_image_url": "https://example.com/max.jpg", "age_text": "3 years", "sex": "Male", "personality_traits": ["Calm", "Loyal"]},
                    {"name": "Bella", "slug": "bella-789", "primary_image_url": "https://example.com/bella.jpg", "age_text": "1 year", "sex": "Female", "personality_traits": ["Energetic", "Smart"]},
                ],
            },
            {
                "primary_breed": "Galgo",
                "breed_slug": "galgo",
                "breed_type": "purebred",
                "breed_group": "Hound",
                "count": 120,
                "sample_dogs": [
                    {"name": "Shadow", "slug": "shadow-111", "primary_image_url": "https://example.com/shadow.jpg", "age_text": "4 years", "sex": "Male", "personality_traits": ["Gentle", "Calm"]}
                ],
            },
        ]

        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            with patch("api.services.animal_service.AnimalService.get_breeds_with_images", return_value=mock_breeds_data):
                response = client.get("/api/animals/breeds/with-images?limit=10")

        assert response.status_code == 200
        data = response.json()

        # Verify response structure
        assert len(data) == 2
        assert data[0]["primary_breed"] == "Mixed Breed"
        assert data[0]["count"] == 1462
        assert len(data[0]["sample_dogs"]) == 3
        assert data[0]["sample_dogs"][0]["name"] == "Luna"
        assert data[0]["sample_dogs"][0]["primary_image_url"] == "https://example.com/luna.jpg"

    def test_get_breeds_with_images_mixed_only(self, client, mock_db_cursor):
        """Test retrieval of only mixed breed dogs with images."""
        mock_mixed_data = [
            {
                "primary_breed": "Mixed Breed",
                "breed_slug": "mixed-breed",
                "breed_type": "mixed",
                "breed_group": "Mixed",
                "count": 1462,
                "sample_dogs": [
                    {"name": "Luna", "slug": "luna-123", "primary_image_url": "https://example.com/luna.jpg", "age_text": "2 years", "sex": "Female", "personality_traits": ["Playful", "Friendly"]}
                ],
            }
        ]

        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            with patch("api.services.animal_service.AnimalService.get_breeds_with_images", return_value=mock_mixed_data):
                response = client.get("/api/animals/breeds/with-images?breed_type=mixed&limit=5")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["breed_type"] == "mixed"

    def test_get_breeds_with_images_popular_only(self, client, mock_db_cursor):
        """Test retrieval of popular breeds (15+ dogs) with images."""
        mock_popular_data = [
            {
                "primary_breed": "Galgo",
                "breed_slug": "galgo",
                "breed_type": "purebred",
                "breed_group": "Hound",
                "count": 120,
                "sample_dogs": [
                    {"name": "Shadow", "slug": "shadow-111", "primary_image_url": "https://example.com/shadow.jpg", "age_text": "4 years", "sex": "Male", "personality_traits": ["Gentle", "Calm"]}
                ],
            },
            {
                "primary_breed": "Podenco",
                "breed_slug": "podenco",
                "breed_type": "purebred",
                "breed_group": "Hound",
                "count": 66,
                "sample_dogs": [
                    {"name": "Spot", "slug": "spot-222", "primary_image_url": "https://example.com/spot.jpg", "age_text": "2 years", "sex": "Female", "personality_traits": ["Active", "Alert"]}
                ],
            },
        ]

        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            with patch("api.services.animal_service.AnimalService.get_breeds_with_images", return_value=mock_popular_data):
                response = client.get("/api/animals/breeds/with-images?min_count=15&limit=10")

        assert response.status_code == 200
        data = response.json()
        assert all(breed["count"] >= 15 for breed in data)

    def test_get_breeds_with_images_by_group(self, client, mock_db_cursor):
        """Test retrieval of breeds by group with images."""
        mock_hound_data = [
            {
                "primary_breed": "Galgo",
                "breed_slug": "galgo",
                "breed_type": "purebred",
                "breed_group": "Hound",
                "count": 120,
                "sample_dogs": [
                    {"name": "Shadow", "slug": "shadow-111", "primary_image_url": "https://example.com/shadow.jpg", "age_text": "4 years", "sex": "Male", "personality_traits": ["Gentle", "Calm"]}
                ],
            }
        ]

        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            with patch("api.services.animal_service.AnimalService.get_breeds_with_images", return_value=mock_hound_data):
                response = client.get("/api/animals/breeds/with-images?breed_group=Hound&limit=5")

        assert response.status_code == 200
        data = response.json()
        assert all(breed["breed_group"] == "Hound" for breed in data)

    def test_get_breeds_with_images_empty_result(self, client, mock_db_cursor):
        """Test empty result when no breeds match criteria."""
        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            with patch("api.services.animal_service.AnimalService.get_breeds_with_images", return_value=[]):
                response = client.get("/api/animals/breeds/with-images?breed_group=NonExistent")

        assert response.status_code == 200
        data = response.json()
        assert data == []

    def test_get_breeds_with_images_database_error(self, client, mock_db_cursor):
        """Test database error handling."""
        import psycopg2

        with patch("api.routes.animals.get_pooled_db_cursor", return_value=mock_db_cursor):
            with patch("api.services.animal_service.AnimalService.get_breeds_with_images", side_effect=psycopg2.Error("Database connection failed")):
                response = client.get("/api/animals/breeds/with-images")

        assert response.status_code == 500
        assert "Database error" in response.json()["detail"] or "Failed to fetch breeds with images" in response.json()["detail"]
