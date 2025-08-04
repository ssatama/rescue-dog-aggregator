# tests/services/test_animal_description_filtering.py

"""
Tests for animal description quality filtering for SEO sitemap optimization.

These tests validate that only animals with meaningful descriptions are included
in sitemap generation to improve Google crawl budget usage and indexing rates.
"""

from unittest.mock import Mock, patch

import pytest

from api.models.dog import AnimalWithImages
from api.models.requests import AnimalFilterRequest
from api.services.animal_service import AnimalService


class TestAnimalDescriptionFiltering:
    """Test description quality filtering for sitemap generation."""

    def setup_method(self):
        """Set up test dependencies."""
        self.mock_cursor = Mock()
        with patch("api.database.create_batch_executor"):
            self.animal_service = AnimalService(self.mock_cursor)

    def test_filter_animals_with_meaningful_descriptions(self):
        """Should include animals with descriptions longer than 200 characters."""
        # Arrange: Create mock animal with long description
        long_description = "This is a wonderful dog with an amazing personality. " * 5  # >200 chars
        mock_animal = AnimalWithImages(
            id=1,
            name="Test Dog",
            slug="test-dog",
            organization_id=1,
            adoption_url="https://example.com/dogs/test-dog",
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
            properties={"description": long_description},
            animal_type="dog",
            status="available",
            images=[],
        )

        # Mock get_animals to return our test animal
        with patch.object(self.animal_service, "get_animals") as mock_get_animals:
            mock_get_animals.return_value = [mock_animal]

            # Act
            filters = AnimalFilterRequest(sitemap_quality_filter=True)
            result = self.animal_service.get_animals_for_sitemap(filters)

            # Assert
            assert len(result) == 1
            assert result[0].name == "Test Dog"

    def test_exclude_animals_with_no_description(self):
        """Should exclude animals with no description property."""
        # Arrange: Create mock animal with no description
        mock_animal = AnimalWithImages(
            id=1,
            name="Test Dog",
            slug="test-dog-no-desc",
            organization_id=1,
            adoption_url="https://example.com/dogs/test-dog-no-desc",
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
            properties={},
            animal_type="dog",
            status="available",
            images=[],
        )

        # Mock get_animals to return our test animal
        with patch.object(self.animal_service, "get_animals") as mock_get_animals:
            mock_get_animals.return_value = [mock_animal]

            # Act
            filters = AnimalFilterRequest(sitemap_quality_filter=True)
            result = self.animal_service.get_animals_for_sitemap(filters)

            # Assert
            assert len(result) == 0

    def test_exclude_animals_with_null_description(self):
        """Should exclude animals with null description."""
        # Arrange: Create mock animal with null description
        mock_animal = AnimalWithImages(
            id=1,
            name="Test Dog",
            slug="test-dog-null",
            organization_id=1,
            adoption_url="https://example.com/dogs/test-dog-null",
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
            properties={"description": None},
            animal_type="dog",
            status="available",
            images=[],
        )

        # Mock get_animals to return our test animal
        with patch.object(self.animal_service, "get_animals") as mock_get_animals:
            mock_get_animals.return_value = [mock_animal]

            # Act
            filters = AnimalFilterRequest(sitemap_quality_filter=True)
            result = self.animal_service.get_animals_for_sitemap(filters)

            # Assert
            assert len(result) == 0

    def test_exclude_animals_with_short_descriptions(self):
        """Should exclude animals with descriptions shorter than 200 characters."""
        # Arrange: Create mock animal with short description
        short_description = "Ready to fly"  # 12 chars
        mock_animal = AnimalWithImages(
            id=1,
            name="Test Dog",
            slug="test-dog-short",
            organization_id=1,
            adoption_url="https://example.com/dogs/test-dog-short",
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
            properties={"description": short_description},
            animal_type="dog",
            status="available",
            images=[],
        )

        # Mock get_animals to return our test animal
        with patch.object(self.animal_service, "get_animals") as mock_get_animals:
            mock_get_animals.return_value = [mock_animal]

            # Act
            filters = AnimalFilterRequest(sitemap_quality_filter=True)
            result = self.animal_service.get_animals_for_sitemap(filters)

            # Assert
            assert len(result) == 0

    def test_exclude_animals_with_fallback_content_patterns(self):
        """Should exclude animals with generic fallback content."""
        # Arrange: Create mock animal with fallback content
        fallback_description = (
            "This dog is looking for a loving forever home. Contact the rescue organization to learn more about this wonderful dog's personality, needs, and how you can provide the perfect home."
        )
        mock_animal = AnimalWithImages(
            id=1,
            name="Test Dog",
            slug="test-dog-fallback",
            organization_id=1,
            adoption_url="https://example.com/dogs/test-dog-fallback",
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
            properties={"description": fallback_description},
            animal_type="dog",
            status="available",
            images=[],
        )

        # Mock get_animals to return our test animal
        with patch.object(self.animal_service, "get_animals") as mock_get_animals:
            mock_get_animals.return_value = [mock_animal]

            # Act
            filters = AnimalFilterRequest(sitemap_quality_filter=True)
            result = self.animal_service.get_animals_for_sitemap(filters)

            # Assert
            assert len(result) == 0

    def test_mixed_quality_descriptions_filtering(self):
        """Should only return animals with high-quality descriptions from mixed dataset."""
        # Arrange: Create mock animals with mixed quality descriptions
        good_description = "Meet Bella, a wonderful Labrador mix with a fantastic personality. She loves playing fetch, going on long walks, and cuddling with her favorite humans. Bella is house-trained, great with children, and has been living happily with other dogs in her foster home. She's looking for an active family who can give her the exercise and attention she craves. Bella knows basic commands and is eager to learn more. Her ideal home would have a secure yard where she can run and play safely."

        mock_animals = [
            AnimalWithImages(
                id=1,
                name="Good Dog",
                slug="good-dog",
                organization_id=1,
                adoption_url="https://example.com/dogs/good-dog",
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z",
                properties={"description": good_description},
                animal_type="dog",
                status="available",
                images=[],
            ),
            AnimalWithImages(
                id=2,
                name="No Description Dog",
                slug="no-desc-dog",
                organization_id=1,
                adoption_url="https://example.com/dogs/no-desc-dog",
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z",
                properties={},
                animal_type="dog",
                status="available",
                images=[],
            ),
            AnimalWithImages(
                id=3,
                name="Short Description Dog",
                slug="short-desc-dog",
                organization_id=1,
                adoption_url="https://example.com/dogs/short-desc-dog",
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z",
                properties={"description": "Ready to fly"},
                animal_type="dog",
                status="available",
                images=[],
            ),
        ]

        # Mock get_animals to return our test animals
        with patch.object(self.animal_service, "get_animals") as mock_get_animals:
            mock_get_animals.return_value = mock_animals

            # Act
            filters = AnimalFilterRequest(sitemap_quality_filter=True)
            result = self.animal_service.get_animals_for_sitemap(filters)

            # Assert
            assert len(result) == 1  # Only the good description dog
            assert result[0].name == "Good Dog"

    def test_regular_get_animals_unaffected(self):
        """Should not affect regular get_animals calls without sitemap filter."""
        # Arrange: Mock database response with mixed quality descriptions
        mock_animals = [
            {"id": 1, "name": "Good Dog", "properties": {"description": "A" * 300}},  # Long description
            {"id": 2, "name": "Short Description Dog", "properties": {"description": "Ready to fly"}},
        ]
        self.mock_cursor.fetchall.return_value = mock_animals

        # Act - regular call without sitemap filter
        filters = AnimalFilterRequest()
        with patch.object(self.animal_service, "_build_animals_query") as mock_query:
            mock_query.return_value = ("SELECT * FROM animals", [])
            with patch.object(self.animal_service, "_build_animals_response") as mock_response:
                mock_response.return_value = mock_animals
                result = self.animal_service.get_animals(filters)

        # Assert - should return all animals
        assert len(result) == 2
