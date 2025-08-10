# tests/api/test_animal_model_refactored.py

import pytest
from fastapi.testclient import TestClient


class TestAnimalModelRefactored:
    """Test the refactored Animal model without images."""

    def test_get_animals_response_structure(self, client: TestClient):
        """Test that /api/animals returns Animal objects with correct structure."""
        response = client.get("/api/animals?limit=2")
        assert response.status_code == 200

        animals = response.json()
        assert isinstance(animals, list)
        assert len(animals) >= 1

        animal = animals[0]

        # Core animal fields
        assert "id" in animal
        assert "name" in animal
        assert "primary_image_url" in animal
        assert "adoption_url" in animal
        assert "organization_id" in animal

        # Organization should be included for backwards compatibility
        assert "organization" in animal
        assert isinstance(animal["organization"], dict)

        # Should NOT have images array
        assert "images" not in animal

    def test_get_animal_detail_response_structure(self, client: TestClient):
        """Test that /api/animals/{slug} returns Animal object with correct structure."""
        # Get an animal first
        response = client.get("/api/animals?limit=1")
        animals = response.json()
        animal_slug = animals[0]["slug"]

        # Get the detail
        detail_response = client.get(f"/api/animals/{animal_slug}")
        assert detail_response.status_code == 200

        animal = detail_response.json()

        # Core animal fields
        assert "id" in animal
        assert "name" in animal
        assert "primary_image_url" in animal
        assert "adoption_url" in animal

        # Organization should be included for backwards compatibility
        assert "organization" in animal
        assert isinstance(animal["organization"], dict)
        assert "id" in animal["organization"]
        assert "name" in animal["organization"]

        # Should NOT have images array
        assert "images" not in animal

    def test_animal_model_excludes_images(self, client: TestClient):
        """Ensure the API no longer returns image arrays."""
        response = client.get("/api/animals?limit=5")
        assert response.status_code == 200

        animals = response.json()
        for animal in animals:
            # Every animal should NOT have an images field
            assert "images" not in animal
            # But should have primary_image_url
            assert "primary_image_url" in animal
