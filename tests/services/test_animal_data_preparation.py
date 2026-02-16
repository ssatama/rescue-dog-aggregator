"""Tests for animal data preparation pure functions extracted from DatabaseService."""

from unittest.mock import MagicMock, patch

import pytest

from services.animal_data_preparation import (
    PreparedAnimalData,
    generate_temp_slug,
    prepare_animal_data,
    sanitize_properties,
    update_to_final_slug,
)


@pytest.mark.unit
class TestPrepareAnimalData:
    """Test breed standardization, age parsing, size fallback, and unified fields."""

    def test_basic_standardization(self):
        animal_data = {
            "name": "Max",
            "breed": "Golden Retriever",
            "age_text": "2 years",
            "size": "large",
        }
        result = prepare_animal_data(animal_data)
        assert isinstance(result, PreparedAnimalData)
        assert result.standardized_breed is not None
        assert result.language == "en"

    def test_pre_calculated_age_values_used(self):
        animal_data = {
            "name": "Buddy",
            "breed": "Poodle",
            "age_text": "3 years",
            "age_min_months": 36,
            "age_max_months": 48,
        }
        result = prepare_animal_data(animal_data)
        assert result.age_months_min == 36
        assert result.age_months_max == 48

    def test_age_parsed_from_text_when_no_pre_calculated(self):
        animal_data = {
            "name": "Rex",
            "breed": "Labrador",
            "age_text": "5 years",
        }
        result = prepare_animal_data(animal_data)
        assert result.age_months_min is not None

    def test_unified_standardizer_fields_take_precedence(self):
        animal_data = {
            "name": "Luna",
            "breed": "Mixed",
            "standardized_breed": "Labrador Mix",
            "breed_category": "Sporting",
            "breed_type": "mixed",
            "primary_breed": "Labrador Retriever",
            "secondary_breed": "Unknown",
            "breed_slug": "labrador-mix",
            "breed_confidence": 0.85,
        }
        result = prepare_animal_data(animal_data)
        assert result.standardized_breed == "Labrador Mix"
        assert result.breed_group == "Sporting"
        assert result.breed_type == "mixed"
        assert result.primary_breed == "Labrador Retriever"

    def test_size_fallback_chain(self):
        animal_data_with_size = {"name": "Tiny", "breed": "Chihuahua", "size": "small"}
        result = prepare_animal_data(animal_data_with_size)
        assert result.final_size == "small"

        animal_data_standardized = {"name": "Tiny", "breed": "Chihuahua", "standardized_size": "small"}
        result = prepare_animal_data(animal_data_standardized)
        assert result.final_size == "small"

    def test_short_description_defaults_to_english(self):
        animal_data = {"name": "A", "breed": ""}
        result = prepare_animal_data(animal_data)
        assert result.language == "en"

    def test_empty_breed(self):
        animal_data = {"name": "NoBreed"}
        result = prepare_animal_data(animal_data)
        assert result.standardized_breed is not None


@pytest.mark.unit
class TestGenerateTempSlug:
    def test_generates_slug_with_temp_suffix(self):
        conn = MagicMock()
        conn.cursor.return_value.fetchone.return_value = None
        result = generate_temp_slug({"name": "Max", "breed": "Labrador"}, "Labrador Retriever", conn)
        assert result.endswith("-temp")
        assert "max" in result.lower()

    @patch("services.animal_data_preparation.generate_unique_animal_slug", side_effect=Exception("Slug error"))
    def test_fallback_on_error(self, _mock_slug):
        conn = MagicMock()
        result = generate_temp_slug({"name": "Max", "external_id": "ext-123"}, "Lab", conn)
        assert result.endswith("-temp")
        assert "ext-123" in result


@pytest.mark.unit
class TestUpdateToFinalSlug:
    def test_updates_slug_with_id(self):
        cursor = MagicMock()
        conn = MagicMock()
        conn.cursor.return_value.fetchone.return_value = None
        logger = MagicMock()
        update_to_final_slug(cursor, 42, {"name": "Max", "breed": "Lab"}, "Labrador", conn, logger)
        cursor.execute.assert_called_once()
        call_args = cursor.execute.call_args
        assert call_args[0][1][1] == 42

    @patch("services.animal_data_preparation.generate_unique_animal_slug", side_effect=Exception("Slug error"))
    def test_continues_on_error(self, _mock_slug):
        cursor = MagicMock()
        conn = MagicMock()
        logger = MagicMock()
        update_to_final_slug(cursor, 42, {"name": "Max"}, "Lab", conn, logger)
        logger.error.assert_called_once()


@pytest.mark.unit
class TestSanitizeProperties:
    def test_none_input(self):
        assert sanitize_properties(None) is None

    def test_removes_null_bytes(self):
        result = sanitize_properties({"key": "value\x00with\u0000nulls"})
        assert "\x00" not in result
        assert "\u0000" not in result

    def test_valid_json_output(self):
        import json

        result = sanitize_properties({"color": "brown", "weight": 20})
        parsed = json.loads(result)
        assert parsed["color"] == "brown"
        assert parsed["weight"] == 20

    def test_empty_dict(self):
        result = sanitize_properties({})
        assert result == "{}"

    def test_nested_dict_with_null_bytes(self):
        import json

        result = sanitize_properties({"outer": {"inner": "val\x00ue"}})
        parsed = json.loads(result)
        assert parsed["outer"]["inner"] == "value"
        assert "\x00" not in result

    def test_nested_list_with_null_bytes(self):
        import json

        result = sanitize_properties({"tags": ["good\x00boy", "play\u0000ful"]})
        parsed = json.loads(result)
        assert parsed["tags"] == ["goodboy", "playful"]
        assert "\x00" not in result
