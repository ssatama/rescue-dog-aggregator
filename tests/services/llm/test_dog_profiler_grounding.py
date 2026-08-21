"""Grounding floor for LLM profiling.

The prompt serialises the whole properties dict into the request, so a dog with
no real narrative text still gets a fluent, confident, invented profile. In
production this produced profiles asserting temperament for Dogs Trust dogs
whose only source text was a breed guide, and gave Santer Paws 347 characters of
profile from 108 characters of source.
"""

import pytest

from services.llm.grounding import MIN_SOURCE_TEXT_CHARS, is_sufficiently_grounded, source_text_length


@pytest.mark.unit
class TestSourceTextLength:
    def test_uses_the_longest_narrative_field_whatever_it_is_called(self):
        dog = {"properties": {"Beschreibung": "x" * 400, "Rasse": "Mischling"}}

        assert source_text_length(dog) == 400

    def test_ignores_non_string_values(self):
        dog = {"properties": {"age_min_months": 24, "tags": ["a", "b"], "description": "y" * 200}}

        assert source_text_length(dog) == 200

    def test_returns_zero_when_there_are_no_properties(self):
        assert source_text_length({}) == 0
        assert source_text_length({"properties": None}) == 0


@pytest.mark.unit
class TestGroundingFloor:
    def test_rejects_a_dog_with_no_narrative_source(self):
        assert is_sufficiently_grounded({"properties": {"weight": "12kg"}}) is False

    def test_rejects_the_duplicated_dogs_trust_breed_promo(self):
        promo = "Everything you need to know about Border Collies"
        dog = {"properties": {"description": f"{promo}\n\n{promo}"}}

        assert is_sufficiently_grounded(dog) is False

    def test_accepts_a_real_narrative(self):
        dog = {"properties": {"description": "Noodle can live with teenagers but will need to be the only dog at home. " * 4}}

        assert is_sufficiently_grounded(dog) is True

    def test_threshold_is_the_documented_one(self):
        assert MIN_SOURCE_TEXT_CHARS == 150


@pytest.mark.unit
class TestPipelineSkipsUngroundedDogs:
    """An ungrounded dog must cost nothing and produce nothing."""

    @pytest.fixture
    def pipeline(self):
        from services.llm.dog_profiler import DogProfilerPipeline

        return DogProfilerPipeline(organization_id=11, dry_run=True)

    @pytest.mark.asyncio
    async def test_returns_none_without_calling_the_model(self, pipeline):
        from unittest.mock import AsyncMock

        pipeline.retry_handler.execute_with_retry = AsyncMock()
        ungrounded = {"id": 1, "name": "Boston", "properties": {"description": "Everything you need to know about Lurchers"}}

        result = await pipeline.process_dog(ungrounded)

        assert result is None
        pipeline.retry_handler.execute_with_retry.assert_not_called()

    @pytest.mark.asyncio
    async def test_still_profiles_a_grounded_dog(self, pipeline):
        from unittest.mock import AsyncMock

        pipeline.retry_handler.execute_with_retry = AsyncMock(side_effect=RuntimeError("reached the model"))
        grounded = {"id": 2, "name": "Noodle", "properties": {"description": "Noodle can live with teenagers and is house trained. " * 5}}

        await pipeline.process_dog(grounded)

        pipeline.retry_handler.execute_with_retry.assert_called_once()
