"""A profile that fails schema validation must be retried, not thrown away.

Validation ran after `execute_with_retry` returned, so a model that wrote a
`description` under the schema's 150-character floor lost the dog outright -
no retry, no second model, nothing stored. It accounted for 2 of 9 dogs in the
verification run for the reasoning-flag fix, and it predates that incident.

The retry handler already rewrites the prompt for malformed JSON. Validation
failures now feed the same mechanism, carrying the field the model got wrong.
"""

import json
from unittest.mock import AsyncMock, patch

import pytest

from services.llm.dog_profiler import DogProfilerPipeline, ProfileValidationError
from services.llm.retry_handler import RetryConfig, RetryHandler

VALID_PROFILE = {
    "description": (
        "Gabi is a sweet but sensitive Springer Spaniel who takes her time warming up to new people. "
        "Once she trusts you she is a devoted companion who lights up for tennis balls and dinner time. "
        "She needs a calm home that will build her confidence gently."
    ),
    "tagline": "Sweet, sensitive, and tennis-ball obsessed",
    "energy_level": "medium",
    "trainability": "moderate",
    "sociability": "selective",
    "confidence": "shy",
    "home_type": "house_preferred",
    "yard_required": False,
    "experience_level": "some_experience",
    "exercise_needs": "moderate",
    "grooming_needs": "weekly",
    "personality_traits": ["gentle", "shy", "playful"],
    "favorite_activities": ["fetch", "sniffy walks"],
    "ready_to_travel": False,
    "vaccinated": True,
    "neutered": True,
    "prompt_version": "1.0.0",
}

TOO_SHORT = {**VALID_PROFILE, "description": "Dapper senior Xander is looking for a sofa."}

GROUNDED = {
    "id": 11223,
    "name": "Xander",
    "breed": "Jack Russell Terrier",
    "properties": {"description": "Xander is a dapper 12 year old Jack Russell who walks well on lead. " * 5},
}


@pytest.fixture
def pipeline(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-never-used")
    return DogProfilerPipeline(organization_id=28, dry_run=True)


@pytest.mark.unit
class TestRetryHandlerHonoursExceptionGuidance:
    """The handler is generic; the guidance rides on the exception."""

    @pytest.mark.asyncio
    async def test_applies_the_adjustment_the_exception_carries(self):
        handler = RetryHandler(RetryConfig(max_attempts=2, initial_delay=0, fallback_models=["openrouter/auto"]))
        seen = []

        async def flaky(prompt_adjustment="", model=None):
            seen.append(prompt_adjustment)
            if len(seen) == 1:
                raise ProfileValidationError("bad", prompt_adjustment="description: String should have at least 150 characters")
            return "ok"

        result = await handler.execute_with_retry(flaky, prompt_adjustment="")

        assert result == "ok"
        assert seen[0] == ""
        assert "at least 150 characters" in seen[1]

    @pytest.mark.asyncio
    async def test_leaves_the_prompt_alone_for_an_exception_without_guidance(self):
        handler = RetryHandler(RetryConfig(max_attempts=2, initial_delay=0, fallback_models=["openrouter/auto"]))
        seen = []

        async def flaky(prompt_adjustment="", model=None):
            seen.append(prompt_adjustment)
            if len(seen) == 1:
                raise RuntimeError("connection reset")
            return "ok"

        await handler.execute_with_retry(flaky, prompt_adjustment="")

        assert seen == ["", ""]

    @pytest.mark.asyncio
    async def test_malformed_json_still_gets_its_own_adjustment(self):
        handler = RetryHandler(RetryConfig(max_attempts=2, initial_delay=0, fallback_models=["openrouter/auto"]))
        seen = []

        async def flaky(prompt_adjustment="", model=None):
            seen.append(prompt_adjustment)
            if len(seen) == 1:
                raise json.JSONDecodeError("bad", "", 0)
            return "ok"

        await handler.execute_with_retry(flaky, prompt_adjustment="")

        assert "JSON" in seen[1]


@pytest.mark.unit
class TestValidationFailureIsRetried:
    @pytest.mark.asyncio
    async def test_a_short_description_is_retried_and_recovered(self, pipeline):
        pipeline._call_llm_api = AsyncMock(side_effect=[dict(TOO_SHORT), dict(VALID_PROFILE)])
        pipeline.retry_handler.config.initial_delay = 0

        result = await pipeline.process_dog(dict(GROUNDED))

        assert result is not None
        assert result["description"] == VALID_PROFILE["description"]
        assert pipeline._call_llm_api.await_count == 2

    @pytest.mark.asyncio
    async def test_the_retry_tells_the_model_which_field_was_wrong(self, pipeline):
        pipeline._call_llm_api = AsyncMock(side_effect=[dict(TOO_SHORT), dict(VALID_PROFILE)])
        pipeline.retry_handler.config.initial_delay = 0

        await pipeline.process_dog(dict(GROUNDED))

        adjustment = pipeline._call_llm_api.await_args_list[1].kwargs["prompt_adjustment"]
        assert "description" in adjustment
        assert "150" in adjustment

    @pytest.mark.asyncio
    async def test_a_dog_that_never_validates_is_dropped_loudly(self, pipeline):
        pipeline._call_llm_api = AsyncMock(return_value=dict(TOO_SHORT))
        pipeline.retry_handler.config.initial_delay = 0

        with patch("services.llm.dog_profiler.sentry_sdk") as sentry:
            result = await pipeline.process_dog(dict(GROUNDED))

        assert result is None
        assert pipeline._call_llm_api.await_count > 1
        sentry.capture_exception.assert_called_once()

    @pytest.mark.asyncio
    async def test_a_valid_profile_is_not_retried(self, pipeline):
        pipeline._call_llm_api = AsyncMock(return_value=dict(VALID_PROFILE))

        result = await pipeline.process_dog(dict(GROUNDED))

        assert result is not None
        assert pipeline._call_llm_api.await_count == 1
