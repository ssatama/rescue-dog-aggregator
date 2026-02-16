"""
Test suite for compatibility filter fields (good_with_kids, good_with_dogs, good_with_cats).

These filters work on the dog_profiler_data JSONB column. They accept boolean
query params and match against string values in the JSONB:
- good_with_kids=true -> good_with_children IN ('yes', 'older_children')
- good_with_dogs=true -> good_with_dogs = 'yes'
- good_with_cats=true -> good_with_cats IN ('yes', 'with_training')
"""

import pytest

from api.models.requests import AnimalFilterCountRequest, AnimalFilterRequest


@pytest.mark.unit
class TestCompatibilityFilterValidation:

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_accepts_true(self, field):
        request = AnimalFilterRequest(**{field: True})
        assert getattr(request, field) is True

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_accepts_false(self, field):
        request = AnimalFilterRequest(**{field: False})
        assert getattr(request, field) is False

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_defaults_to_none(self, field):
        request = AnimalFilterRequest()
        assert getattr(request, field) is None

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_accepts_none_explicitly(self, field):
        request = AnimalFilterRequest(**{field: None})
        assert getattr(request, field) is None

    @pytest.mark.parametrize(
        "field,string_value",
        [
            ("good_with_kids", "true"),
            ("good_with_dogs", "false"),
            ("good_with_cats", "true"),
        ],
    )
    def test_coerces_string_booleans(self, field, string_value):
        request = AnimalFilterRequest(**{field: string_value})
        expected = string_value == "true"
        assert getattr(request, field) is expected

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_coerces_truthy_string(self, field):
        request = AnimalFilterRequest(**{field: "yes"})
        assert getattr(request, field) is True


@pytest.mark.unit
class TestCompatibilityFilterCountRequestValidation:

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_accepts_true(self, field):
        request = AnimalFilterCountRequest(**{field: True})
        assert getattr(request, field) is True

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_defaults_to_none(self, field):
        request = AnimalFilterCountRequest()
        assert getattr(request, field) is None


@pytest.mark.unit
class TestCompatibilityFilterCombinations:

    def test_combine_all_compatibility_filters(self):
        request = AnimalFilterRequest(
            good_with_kids=True,
            good_with_dogs=True,
            good_with_cats=True,
        )
        assert request.good_with_kids is True
        assert request.good_with_dogs is True
        assert request.good_with_cats is True

    def test_combine_compatibility_with_profiler_filters(self):
        request = AnimalFilterRequest(
            good_with_kids=True,
            energy_level="low",
            home_type="apartment_ok",
        )
        assert request.good_with_kids is True
        assert request.energy_level == "low"
        assert request.home_type == "apartment_ok"

    def test_combine_compatibility_with_traditional_filters(self):
        request = AnimalFilterRequest(
            good_with_dogs=True,
            sex="Male",
            age_category="Adult",
            standardized_size="Medium",
        )
        assert request.good_with_dogs is True
        assert request.sex == "Male"

    def test_false_filters_do_not_activate_filtering(self):
        request = AnimalFilterRequest(
            good_with_kids=False,
            good_with_dogs=False,
            good_with_cats=False,
        )
        assert request.good_with_kids is False
        assert request.good_with_dogs is False
        assert request.good_with_cats is False


@pytest.mark.unit
class TestCompatibilityFilterSQLConditions:

    def _get_service_with_mock_cursor(self):
        from unittest.mock import MagicMock

        from api.services.animal_service import AnimalService

        cursor = MagicMock()
        return AnimalService(cursor)

    def test_good_with_kids_true_adds_jsonb_condition(self):
        service = self._get_service_with_mock_cursor()
        filters = AnimalFilterRequest(good_with_kids=True, status="all")
        query, params = service._build_animals_query(filters)
        assert "good_with_children" in query
        assert "yes" in params
        assert "older_children" in params

    def test_good_with_dogs_true_adds_jsonb_condition(self):
        service = self._get_service_with_mock_cursor()
        filters = AnimalFilterRequest(good_with_dogs=True, status="all")
        query, params = service._build_animals_query(filters)
        assert "good_with_dogs" in query
        assert "yes" in params

    def test_good_with_cats_true_adds_jsonb_condition(self):
        service = self._get_service_with_mock_cursor()
        filters = AnimalFilterRequest(good_with_cats=True, status="all")
        query, params = service._build_animals_query(filters)
        assert "good_with_cats" in query
        assert "yes" in params
        assert "with_training" in params

    def test_none_filters_add_no_conditions(self):
        service = self._get_service_with_mock_cursor()
        filters = AnimalFilterRequest(status="all")
        query, _ = service._build_animals_query(filters)
        assert "good_with_children" not in query
        assert "good_with_cats" not in query

    def test_false_filters_add_no_conditions(self):
        service = self._get_service_with_mock_cursor()
        filters = AnimalFilterRequest(
            good_with_kids=False,
            good_with_dogs=False,
            good_with_cats=False,
            status="all",
        )
        query, _ = service._build_animals_query(filters)
        assert "good_with_children" not in query

    def test_count_conditions_include_compatibility(self):
        service = self._get_service_with_mock_cursor()
        filters = AnimalFilterCountRequest(good_with_kids=True, status="all")
        conditions, params = service._build_count_base_conditions(filters)
        condition_str = " ".join(conditions)
        assert "good_with_children" in condition_str
        assert "yes" in params


@pytest.mark.slow
@pytest.mark.database
class TestCompatibilityFilterAPI:

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_filter_true_returns_200(self, client, field):
        response = client.get(f"/api/animals?{field}=true")
        assert response.status_code == 200

    @pytest.mark.parametrize("field", ["good_with_kids", "good_with_dogs", "good_with_cats"])
    def test_filter_false_returns_200(self, client, field):
        response = client.get(f"/api/animals?{field}=false")
        assert response.status_code == 200

    def test_combined_compatibility_filters(self, client):
        response = client.get(
            "/api/animals?good_with_kids=true&good_with_dogs=true&good_with_cats=true"
        )
        assert response.status_code == 200

    def test_compatibility_with_traditional_filters(self, client):
        response = client.get(
            "/api/animals?good_with_kids=true&sex=Male&age_category=Adult&limit=5"
        )
        assert response.status_code == 200

    def test_compatibility_with_profiler_filters(self, client):
        response = client.get(
            "/api/animals?good_with_kids=true&energy_level=low&home_type=apartment_ok"
        )
        assert response.status_code == 200

    def test_mcp_server_style_request(self, client):
        response = client.get(
            "/api/animals?status=available"
            "&availability_confidence=high,medium"
            "&good_with_kids=true"
            "&good_with_cats=true"
            "&limit=5"
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 5
