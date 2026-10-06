"""A confidence score the model didn't send is left out, not invented.

The profiler used to fill a missing description, energy_level or trainability
score with 0.5 (and invent 0.8/0.7/0.7 when the model sent none) to satisfy
the schema (PYTHON-FASTAPI-1K). Since #517 and #696 a score of 0.5 or less
means "a guess": the dog page hides the answer, and the filters leave it out
(#716). So a backfilled 0.5 hid a real answer. A missing score now means
nothing is known about the model's confidence, which the site treats as it
treats profiles from before confidence scores: the answer is shown.
"""

from unittest.mock import AsyncMock

import pytest
from pydantic import ValidationError

from services.llm.dog_profiler import DogProfilerPipeline
from services.llm.schemas.dog_profiler import DogProfilerData

PROFILE = {
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
    "home_type": "house_preferred",
    "yard_required": True,
    "experience_level": "some_experience",
    "exercise_needs": "moderate",
    "grooming_needs": "weekly",
    "personality_traits": ["gentle", "intelligent", "loyal"],
    "favorite_activities": ["walks", "fetch"],
    "ready_to_travel": True,
    "vaccinated": True,
    "neutered": True,
    "prompt_version": "1.0.0",
}

DOG = {"id": 1, "name": "Max", "breed": "German Shepherd", "properties": {"description": "A calm shepherd mix who loves walks. " * 5}}


@pytest.fixture
def pipeline(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-never-used")
    return DogProfilerPipeline(organization_id=28, dry_run=True)


async def profile_from(pipeline, answer: dict) -> DogProfilerData:
    pipeline._call_llm_api = AsyncMock(return_value=answer)
    return await pipeline._generate_profile(DOG)


@pytest.mark.unit
class TestMissingConfidenceScores:
    @pytest.mark.asyncio
    async def test_a_missing_score_is_left_out_not_set_to_a_guess(self, pipeline):
        profile = await profile_from(pipeline, {**PROFILE, "confidence_scores": {"description": 0.9, "trainability": 0.8}})
        assert "energy_level" not in profile.confidence_scores

    @pytest.mark.asyncio
    async def test_the_models_own_scores_are_kept_as_sent(self, pipeline):
        scores = {"description": 0.9, "energy_level": 0.5, "trainability": 0.3, "good_with_cats": 0.2}
        profile = await profile_from(pipeline, {**PROFILE, "confidence_scores": dict(scores)})
        assert profile.confidence_scores == scores

    @pytest.mark.asyncio
    async def test_no_scores_at_all_invents_none(self, pipeline):
        profile = await profile_from(pipeline, dict(PROFILE))
        assert profile.confidence_scores == {}

    @pytest.mark.asyncio
    async def test_a_value_the_profiler_fills_in_is_scored_as_a_guess(self, pipeline):
        answer = {key: value for key, value in PROFILE.items() if key != "energy_level"}
        profile = await profile_from(pipeline, {**answer, "confidence_scores": {"description": 0.9}})
        assert profile.energy_level == "medium"
        assert profile.confidence_scores["energy_level"] <= 0.5

    @pytest.mark.asyncio
    async def test_null_scores_are_read_as_none(self, pipeline):
        profile = await profile_from(pipeline, {**PROFILE, "confidence_scores": None})
        assert profile.confidence_scores == {}


@pytest.mark.unit
class TestConfidenceScoreSchema:
    def test_accepts_a_partial_set(self):
        DogProfilerData(**PROFILE, source_references={"description": "calm shepherd mix", "personality_traits": "calm"}, processing_time_ms=1, confidence_scores={"description": 0.9})

    def test_rejects_a_score_outside_zero_to_one(self):
        with pytest.raises(ValidationError, match="energy_level"):
            DogProfilerData(**PROFILE, source_references={"description": "calm shepherd mix", "personality_traits": "calm"}, processing_time_ms=1, confidence_scores={"energy_level": 1.5})
