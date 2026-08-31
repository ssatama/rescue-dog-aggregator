"""Every dropped dog must reach Sentry.

A per-dog LLM failure used to be a `logger.error` inside the cron container and
nothing else. The 400 that stopped 156 dogs from ever getting a profile ran for
five days across four scrape runs without raising an alert, because the only
Sentry signal was a batch-level warning that fires with no error detail.
"""

from unittest.mock import AsyncMock, patch

import pytest

from services.llm.dog_profiler import DogProfilerPipeline

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

GROUNDED = {
    "id": 11227,
    "name": "Gabi",
    "breed": "English Springer Spaniel",
    "properties": {"description": "Gabi is a sweet but sensitive Springer who loves tennis balls. " * 5},
}


@pytest.fixture
def pipeline(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-never-used")
    return DogProfilerPipeline(organization_id=11, dry_run=True)


@pytest.mark.unit
class TestPerDogFailureReachesSentry:
    @pytest.mark.asyncio
    async def test_captures_the_exception(self, pipeline):
        failure = RuntimeError("400 Reasoning is mandatory for this endpoint")
        pipeline.retry_handler.execute_with_retry = AsyncMock(side_effect=failure)

        with patch("services.llm.dog_profiler.sentry_sdk") as sentry:
            result = await pipeline.process_dog(dict(GROUNDED))

        assert result is None
        sentry.capture_exception.assert_called_once()
        assert sentry.capture_exception.call_args.args[0] is failure

    @pytest.mark.asyncio
    async def test_tags_the_dog_and_organization_for_triage(self, pipeline):
        pipeline.retry_handler.execute_with_retry = AsyncMock(side_effect=RuntimeError("boom"))

        with patch("services.llm.dog_profiler.sentry_sdk") as sentry:
            await pipeline.process_dog(dict(GROUNDED))

        scope = sentry.new_scope.return_value.__enter__.return_value
        tags = {call.args[0]: call.args[1] for call in scope.set_tag.call_args_list}
        assert tags["llm.dog_id"] == "11227"
        assert tags["llm.org_id"] == "11"
        assert tags["llm.stage"] == "dog_profiler"

    @pytest.mark.asyncio
    async def test_a_success_raises_no_alert(self, pipeline):
        pipeline._call_llm_api = AsyncMock(return_value=dict(VALID_PROFILE))

        with patch("services.llm.dog_profiler.sentry_sdk") as sentry:
            await pipeline.process_dog(dict(GROUNDED))

        sentry.capture_exception.assert_not_called()

    @pytest.mark.asyncio
    async def test_an_ungrounded_skip_is_reported_as_a_data_problem(self, pipeline):
        """A dog with no usable source text needs a scraper fix, not a retry, so
        it must be visible rather than swallowed by the grounding guard."""
        pipeline.retry_handler.execute_with_retry = AsyncMock()

        with patch("services.llm.dog_profiler.sentry_sdk") as sentry:
            result = await pipeline.process_dog({"id": 9, "name": "Boston", "properties": {"description": "short"}})

        assert result is None
        pipeline.retry_handler.execute_with_retry.assert_not_called()
        sentry.capture_message.assert_called_once()
