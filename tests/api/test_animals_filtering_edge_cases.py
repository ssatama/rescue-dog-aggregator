"""
Test suite for api/routes/animals.py filtering edge cases

Tests complex filtering combinations, edge cases, and boundary conditions.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAnimalsFilteringEdgeCases:
    """Test edge cases and complex filtering in animals endpoints."""

    def test_multiple_availability_confidence_levels(self):
        """Test filtering by multiple availability confidence levels."""
        response = client.get("/api/animals?availability_confidence=high,medium")
        assert response.status_code == 200
        data = response.json()
        for animal in data:
            assert animal["availability_confidence"] in ["high", "medium"]

    def test_availability_confidence_with_low_level(self):
        """Test filtering with low availability confidence."""
        response = client.get("/api/animals?availability_confidence=low")
        assert response.status_code == 200
        # Should return animals even if empty list

    def test_age_category_filtering_boundaries(self):
        """Test age category filtering boundary conditions."""
        # Test puppy category (0-12 months)
        response = client.get("/api/animals?age_category=Puppy")
        assert response.status_code == 200
        data = response.json()
        for animal in data:
            # All animals should be 12 months or younger
            assert animal.get("age_max_months", 0) <= 12

    def test_age_category_young_adult_senior(self):
        """Test all age categories work correctly."""
        categories = ["Puppy", "Young", "Adult", "Senior"]
        for category in categories:
            response = client.get(f"/api/animals?age_category={category}")
            assert response.status_code == 200
            # Should not error, regardless of results

    def test_combined_location_and_availability_filters(self):
        """Test combining location country and availability filters."""
        response = client.get("/api/animals?location_country=Test Country&available_to_country=Test Country")
        assert response.status_code == 200
        # Should handle combination without errors

    def test_available_to_region_requires_country(self):
        """Test that available_to_region filtering works with country."""
        # This should work (though may return empty)
        response = client.get("/api/animals?available_to_country=Test Country&available_to_region=Test Region")
        assert response.status_code == 200

    def test_search_term_with_special_characters(self):
        """Test search functionality with special characters."""
        special_chars = ["O'Malley", "María", "test-dog", "dog@rescue"]
        for search_term in special_chars:
            response = client.get(f"/api/animals?search={search_term}")
            assert response.status_code == 200
            # Should handle special characters gracefully

    def test_search_term_empty_and_whitespace(self):
        """Test search with empty and whitespace terms."""
        import urllib.parse

        test_cases = ["", "   ", "\t", "\n"]
        for search_term in test_cases:
            # URL encode the search term to handle special characters
            encoded_term = urllib.parse.quote(search_term)
            response = client.get(f"/api/animals?search={encoded_term}")
            assert response.status_code == 200
            # Should handle empty/whitespace search terms

    def test_breed_group_filtering_edge_cases(self):
        """Test breed group filtering with various inputs."""
        # Test with known breed groups
        breed_groups = ["Sporting", "Herding", "Working", "Non-Sporting", "Mixed"]
        for group in breed_groups:
            response = client.get(f"/api/animals?breed_group={group}")
            assert response.status_code == 200
            data = response.json()
            for animal in data:
                assert animal.get("breed_group") == group

    def test_pagination_edge_cases(self):
        """Test pagination with edge case values."""
        # Test limit boundaries
        response = client.get("/api/animals?limit=1")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 1

        # Test maximum limit
        response = client.get("/api/animals?limit=100")
        assert response.status_code == 200

        # Test large offset
        response = client.get("/api/animals?offset=1000")
        assert response.status_code == 200
        # Should return empty list if offset exceeds available animals

    def test_invalid_limit_and_offset_handling(self):
        """Test handling of invalid limit and offset values."""
        # Test negative values
        response = client.get("/api/animals?limit=-1")
        assert response.status_code == 422  # Validation error

        response = client.get("/api/animals?offset=-1")
        assert response.status_code == 422  # Validation error

        # Test limit over maximum
        response = client.get("/api/animals?limit=20000")
        assert response.status_code == 422  # Should enforce maximum limit

    def test_complex_filter_combinations(self):
        """Test complex combinations of multiple filters."""
        complex_query = "/api/animals?" "sex=Male&" "size=large&" "availability_confidence=high&" "age_category=Adult&" "breed_group=Sporting&" "limit=10"
        response = client.get(complex_query)
        assert response.status_code == 200
        data = response.json()
        # Verify all filters are applied correctly
        for animal in data:
            assert animal.get("sex") == "Male"
            assert animal.get("size") == "large"
            assert animal.get("availability_confidence") == "high"
            assert animal.get("breed_group") == "Sporting"

    def test_service_regions_filtering(self):
        """Test service regions join functionality."""
        # This tests the service regions JOIN that was missing coverage
        response = client.get("/api/animals?limit=50")
        assert response.status_code == 200
        # Should handle service regions data without errors

    def test_recent_curation_edge_cases(self):
        """Test recent curation functionality edge cases."""
        # Test with various recent_curation values
        response = client.get("/api/animals?recent_curation=true")
        assert response.status_code == 200

        response = client.get("/api/animals?recent_curation=false")
        assert response.status_code == 200

    def test_diverse_curation_functionality(self):
        """Test diverse curation functionality."""
        response = client.get("/api/animals?diverse_curation=true")
        assert response.status_code == 200

        response = client.get("/api/animals?diverse_curation=false")
        assert response.status_code == 200


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestAnimalsMetaEndpointsEdgeCases:
    """Test meta endpoints edge cases."""

    def test_breeds_with_breed_group_filter(self):
        """Test breeds endpoint with breed_group filter."""
        response = client.get("/api/animals/meta/breeds?breed_group=Sporting")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_breed_groups_fallback_behavior(self):
        """Test breed groups endpoint fallback when database has no data."""
        # This endpoint should always return some breed groups (including fallback)
        response = client.get("/api/animals/meta/breed_groups")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0  # Should have fallback breed groups

    def test_location_countries_endpoint(self):
        """Test location countries endpoint."""
        response = client.get("/api/animals/meta/location_countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_available_countries_endpoint(self):
        """Test available countries endpoint."""
        response = client.get("/api/animals/meta/available_countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_available_regions_with_country_filter(self):
        """Test available regions endpoint with country filter."""
        response = client.get("/api/animals/meta/available_regions?country=Test Country")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_available_regions_requires_country_validation(self):
        """Test available regions endpoint properly validates required country parameter."""
        response = client.get("/api/animals/meta/available_regions")
        assert response.status_code == 422  # Should require country parameter
