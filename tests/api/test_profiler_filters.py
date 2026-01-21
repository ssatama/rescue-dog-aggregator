"""
Test suite for profiler-based filter fields (energy_level, home_type, experience_level).

These filters work on the dog_profiler_data JSONB column which contains
LLM-enriched data about dog personality and requirements.
"""

import pytest
from pydantic import ValidationError

from api.models.requests import AnimalFilterCountRequest, AnimalFilterRequest


@pytest.mark.unit
class TestProfilerFilterValidation:
    """Test validation of profiler filter fields in request models."""

    @pytest.mark.parametrize(
        "energy_level",
        ["low", "medium", "high", "very_high", None],
    )
    def test_valid_energy_levels(self, energy_level):
        """Test that valid energy levels are accepted."""
        request = AnimalFilterRequest(energy_level=energy_level)
        assert request.energy_level == energy_level

    @pytest.mark.parametrize(
        "invalid_value",
        ["invalid", "super_high", "LOW", "MEDIUM", "", "123"],
    )
    def test_invalid_energy_level_rejected(self, invalid_value):
        """Test that invalid energy levels are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            AnimalFilterRequest(energy_level=invalid_value)
        assert "energy_level" in str(exc_info.value)

    @pytest.mark.parametrize(
        "home_type",
        ["apartment_ok", "house_preferred", "house_required", None],
    )
    def test_valid_home_types(self, home_type):
        """Test that valid home types are accepted."""
        request = AnimalFilterRequest(home_type=home_type)
        assert request.home_type == home_type

    @pytest.mark.parametrize(
        "invalid_value",
        ["apartment", "house", "APARTMENT_OK", "", "any"],
    )
    def test_invalid_home_type_rejected(self, invalid_value):
        """Test that invalid home types are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            AnimalFilterRequest(home_type=invalid_value)
        assert "home_type" in str(exc_info.value)

    @pytest.mark.parametrize(
        "experience_level",
        ["first_time_ok", "some_experience", "experienced_only", None],
    )
    def test_valid_experience_levels(self, experience_level):
        """Test that valid experience levels are accepted."""
        request = AnimalFilterRequest(experience_level=experience_level)
        assert request.experience_level == experience_level

    @pytest.mark.parametrize(
        "invalid_value",
        ["beginner", "expert", "FIRST_TIME_OK", "", "novice"],
    )
    def test_invalid_experience_level_rejected(self, invalid_value):
        """Test that invalid experience levels are rejected."""
        with pytest.raises(ValidationError) as exc_info:
            AnimalFilterRequest(experience_level=invalid_value)
        assert "experience_level" in str(exc_info.value)


@pytest.mark.unit
class TestProfilerFilterCountRequestValidation:
    """Test validation of profiler filter fields in count request model."""

    @pytest.mark.parametrize(
        "energy_level",
        ["low", "medium", "high", "very_high", None],
    )
    def test_valid_energy_levels_count_request(self, energy_level):
        """Test that valid energy levels are accepted in count request."""
        request = AnimalFilterCountRequest(energy_level=energy_level)
        assert request.energy_level == energy_level

    @pytest.mark.parametrize(
        "home_type",
        ["apartment_ok", "house_preferred", "house_required", None],
    )
    def test_valid_home_types_count_request(self, home_type):
        """Test that valid home types are accepted in count request."""
        request = AnimalFilterCountRequest(home_type=home_type)
        assert request.home_type == home_type

    @pytest.mark.parametrize(
        "experience_level",
        ["first_time_ok", "some_experience", "experienced_only", None],
    )
    def test_valid_experience_levels_count_request(self, experience_level):
        """Test that valid experience levels are accepted in count request."""
        request = AnimalFilterCountRequest(experience_level=experience_level)
        assert request.experience_level == experience_level


@pytest.mark.unit
class TestProfilerFilterCombinations:
    """Test combining profiler filters with other filters."""

    def test_combine_energy_with_size(self):
        """Test combining energy_level with size filter."""
        request = AnimalFilterRequest(
            energy_level="high",
            standardized_size="Medium",
        )
        assert request.energy_level == "high"

    def test_combine_all_profiler_filters(self):
        """Test combining all three profiler filters."""
        request = AnimalFilterRequest(
            energy_level="medium",
            home_type="apartment_ok",
            experience_level="first_time_ok",
        )
        assert request.energy_level == "medium"
        assert request.home_type == "apartment_ok"
        assert request.experience_level == "first_time_ok"

    def test_combine_profiler_with_breed_filters(self):
        """Test combining profiler filters with breed filters."""
        request = AnimalFilterRequest(
            energy_level="low",
            breed_group="Sporting",
            age_category="Adult",
        )
        assert request.energy_level == "low"
        assert request.breed_group == "Sporting"
        assert request.age_category == "Adult"


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.database
class TestProfilerFilterAPI:
    """Integration tests for profiler filter API endpoints."""

    @pytest.mark.parametrize("energy_level", ["low", "medium", "high", "very_high"])
    def test_energy_level_filter_endpoint(self, client, energy_level):
        """Test filtering by energy_level via API."""
        response = client.get(f"/api/animals?energy_level={energy_level}")
        assert response.status_code == 200

    @pytest.mark.parametrize("home_type", ["apartment_ok", "house_preferred", "house_required"])
    def test_home_type_filter_endpoint(self, client, home_type):
        """Test filtering by home_type via API."""
        response = client.get(f"/api/animals?home_type={home_type}")
        assert response.status_code == 200

    @pytest.mark.parametrize(
        "experience_level",
        ["first_time_ok", "some_experience", "experienced_only"],
    )
    def test_experience_level_filter_endpoint(self, client, experience_level):
        """Test filtering by experience_level via API."""
        response = client.get(f"/api/animals?experience_level={experience_level}")
        assert response.status_code == 200

    def test_combined_profiler_filters_endpoint(self, client):
        """Test combining multiple profiler filters."""
        response = client.get("/api/animals?energy_level=low&home_type=apartment_ok&experience_level=first_time_ok")
        assert response.status_code == 200

    def test_profiler_with_traditional_filters(self, client):
        """Test combining profiler filters with traditional filters."""
        response = client.get("/api/animals?energy_level=medium&sex=Male&age_category=Adult&limit=5")
        assert response.status_code == 200

    def test_invalid_energy_level_returns_422(self, client):
        """Test that invalid energy_level returns 422."""
        response = client.get("/api/animals?energy_level=invalid")
        assert response.status_code == 422

    def test_invalid_home_type_returns_422(self, client):
        """Test that invalid home_type returns 422."""
        response = client.get("/api/animals?home_type=mansion")
        assert response.status_code == 422

    def test_invalid_experience_level_returns_422(self, client):
        """Test that invalid experience_level returns 422."""
        response = client.get("/api/animals?experience_level=expert")
        assert response.status_code == 422
