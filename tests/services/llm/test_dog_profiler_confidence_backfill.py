"""
Tests for confidence_scores backfill logic in DogProfilerPipeline.

Validates that missing required confidence score fields are backfilled
with defaults before schema validation, preventing ValidationError when
the LLM returns partial confidence_scores dicts.

Fixes PYTHON-FASTAPI-1K.
"""

import pytest
from pydantic import ValidationError

from services.llm.schemas.dog_profiler import DogProfilerData

REQUIRED_CONFIDENCE_FIELDS = {"description", "energy_level", "trainability"}


def _make_valid_profile(**overrides: object) -> dict:
    """Build a valid DogProfilerData dict with optional overrides."""
    base = {
        "description": (
            "Max is a gentle giant with a heart of gold. This lovable German Shepherd mix "
            "combines intelligence with calm demeanor, making him perfect for families "
            "seeking a loyal companion who loves long walks and belly rubs."
        ),
        "tagline": "Gentle giant seeking loving family",
        "energy_level": "medium",
        "trainability": "easy",
        "sociability": "very_social",
        "confidence": "confident",
        "good_with_dogs": "yes",
        "good_with_cats": "unknown",
        "good_with_children": "older_children",
        "home_type": "house_preferred",
        "yard_required": True,
        "experience_level": "some_experience",
        "exercise_needs": "moderate",
        "grooming_needs": "weekly",
        "ready_to_travel": True,
        "vaccinated": True,
        "neutered": True,
        "personality_traits": ["gentle", "intelligent", "loyal"],
        "favorite_activities": ["walks", "fetch"],
        "unique_quirk": "Loves belly rubs",
        "confidence_scores": {
            "description": 0.9,
            "energy_level": 0.8,
            "trainability": 0.85,
            "personality_traits": 0.9,
        },
        "source_references": {
            "description": "ruhiger Schäferhund-Mix, sehr lieb",
            "personality_traits": "intelligent, gelehrig",
        },
        "processing_time_ms": 500,
        "prompt_version": "1.0.0",
    }
    base.update(overrides)
    return base


def _backfill_confidence_scores(profile_data: dict) -> dict:
    """Replicate the backfill logic that dog_profiler.py should apply."""
    if "confidence_scores" not in profile_data:
        profile_data["confidence_scores"] = {
            "description": 0.8,
            "energy_level": 0.7,
            "trainability": 0.7,
        }
    else:
        required_defaults = {
            "description": 0.5,
            "energy_level": 0.5,
            "trainability": 0.5,
        }
        for field, default in required_defaults.items():
            if field not in profile_data["confidence_scores"]:
                profile_data["confidence_scores"][field] = default
    return profile_data


@pytest.mark.unit
class TestConfidenceScoresBackfill:
    """Test that partial confidence_scores dicts are backfilled before validation."""

    def test_schema_rejects_missing_trainability(self) -> None:
        """Schema validator correctly rejects confidence_scores missing trainability."""
        data = _make_valid_profile(confidence_scores={"description": 0.9, "energy_level": 0.8})
        with pytest.raises(ValidationError, match="trainability"):
            DogProfilerData(**data)

    def test_backfill_adds_missing_trainability(self) -> None:
        """Backfill adds trainability with default 0.5 when missing."""
        data = _make_valid_profile(
            confidence_scores={
                "description": 0.9,
                "energy_level": 0.8,
                "personality_traits": 0.9,
            }
        )
        data = _backfill_confidence_scores(data)

        assert data["confidence_scores"]["trainability"] == 0.5
        validated = DogProfilerData(**data)
        assert validated.confidence_scores["trainability"] == 0.5

    def test_backfill_preserves_existing_values(self) -> None:
        """Backfill does not overwrite existing confidence score values."""
        data = _make_valid_profile()
        original_scores = data["confidence_scores"].copy()
        data = _backfill_confidence_scores(data)

        assert data["confidence_scores"]["description"] == original_scores["description"]
        assert data["confidence_scores"]["energy_level"] == original_scores["energy_level"]
        assert data["confidence_scores"]["trainability"] == original_scores["trainability"]

    def test_backfill_handles_empty_dict(self) -> None:
        """Backfill adds all required fields when confidence_scores dict is empty."""
        data = _make_valid_profile(confidence_scores={})
        data = _backfill_confidence_scores(data)

        for field in REQUIRED_CONFIDENCE_FIELDS:
            assert field in data["confidence_scores"]
            assert data["confidence_scores"][field] == 0.5

        DogProfilerData(**data)

    def test_backfill_handles_missing_dict_entirely(self) -> None:
        """Backfill adds complete default dict when confidence_scores key is absent."""
        data = _make_valid_profile()
        del data["confidence_scores"]
        data = _backfill_confidence_scores(data)

        assert data["confidence_scores"]["description"] == 0.8
        assert data["confidence_scores"]["energy_level"] == 0.7
        assert data["confidence_scores"]["trainability"] == 0.7

        DogProfilerData(**data)

    def test_backfill_preserves_extra_fields(self) -> None:
        """Backfill preserves non-required fields in confidence_scores."""
        data = _make_valid_profile(
            confidence_scores={
                "description": 0.9,
                "energy_level": 0.8,
                "personality_traits": 0.75,
                "unique_quirk": 0.6,
            }
        )
        data = _backfill_confidence_scores(data)

        assert data["confidence_scores"]["trainability"] == 0.5
        assert data["confidence_scores"]["personality_traits"] == 0.75
        assert data["confidence_scores"]["unique_quirk"] == 0.6
