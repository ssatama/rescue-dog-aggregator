"""
Test suite for api/routes/animals.py filtering edge cases

Tests complex filtering combinations, edge cases, and boundary conditions.
"""

import urllib.parse

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAnimalsFilteringEdgeCases:
    """Test edge cases and complex filtering in animals endpoints."""

    @pytest.mark.parametrize(
        "confidence_levels,expected",
        [
            ("high,medium", ["high", "medium"]),
            ("low", ["low"]),
            ("high", ["high"]),
        ],
    )
    def test_availability_confidence_levels(self, client, confidence_levels, expected):
        """Test filtering by availability confidence levels."""
        response = client.get(f"/api/animals?availability_confidence={confidence_levels}")
        assert response.status_code == 200
        data = response.json()
        for animal in data:
            assert animal["availability_confidence"] in expected

    @pytest.mark.parametrize("category", ["Puppy", "Young", "Adult", "Senior"])
    def test_age_category_filtering(self, client, category):
        """Test all age categories work correctly."""
        response = client.get(f"/api/animals?age_category={category}")
        assert response.status_code == 200
        # Should not error, regardless of results

    @pytest.mark.parametrize("search_term", ["O'Malley", "María", "test-dog", "dog@rescue", "", "   ", "\t", "\n"])
    def test_search_term_edge_cases(self, client, search_term):
        """Test search functionality with special characters and whitespace."""
        encoded_term = urllib.parse.quote(search_term)
        response = client.get(f"/api/animals?search={encoded_term}")
        assert response.status_code == 200
        # Should handle all search terms gracefully

    @pytest.mark.parametrize("breed_group", ["Sporting", "Herding", "Working", "Non-Sporting", "Mixed"])
    def test_breed_group_filtering(self, client, breed_group):
        """Test breed group filtering with various inputs."""
        response = client.get(f"/api/animals?breed_group={breed_group}")
        assert response.status_code == 200
        data = response.json()
        for animal in data:
            assert animal.get("breed_group") == breed_group

    @pytest.mark.parametrize(
        "limit,offset,expected_status",
        [
            (1, 0, 200),  # Min limit
            (100, 0, 200),  # Max limit
            (10, 1000, 200),  # Large offset
            (-1, 0, 422),  # Negative limit
            (0, -1, 422),  # Negative offset
            (20000, 0, 422),  # Over max limit
        ],
    )
    def test_pagination_edge_cases(self, client, limit, offset, expected_status):
        """Test pagination with edge case values."""
        response = client.get(f"/api/animals?limit={limit}&offset={offset}")
        assert response.status_code == expected_status

        if expected_status == 200 and limit > 0:
            data = response.json()
            assert len(data) <= limit

    def test_complex_filter_combination(self, client):
        """Test complex combination of multiple filters."""
        filters = {"sex": "Male", "size": "large", "availability_confidence": "high", "age_category": "Adult", "breed_group": "Sporting", "limit": 10}
        query_string = "&".join(f"{k}={v}" for k, v in filters.items())
        response = client.get(f"/api/animals?{query_string}")
        assert response.status_code == 200

        data = response.json()
        for animal in data:
            assert animal.get("sex") == "Male"
            assert animal.get("size") == "large"
            assert animal.get("availability_confidence") == "high"
            assert animal.get("breed_group") == "Sporting"

    def test_location_filtering_combinations(self, client):
        """Test location filtering combinations."""
        response = client.get("/api/animals?location_country=Test Country&available_to_country=Test Country")
        assert response.status_code == 200

        response = client.get("/api/animals?available_to_country=Test Country&available_to_region=Test Region")
        assert response.status_code == 200
