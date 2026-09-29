"""Only a failure that belongs to the dog counts toward #633's cap.

An OpenRouter outage (429s, 5xx, timeouts, no credits) fails every dog it
touches. Counting those would drop ~10 dogs per rescue from the backlog for
good after three bad runs, the opposite of #622's promise that a transient
failure is profiled next run.
"""

from unittest.mock import AsyncMock, Mock

import httpx
import pytest

from services.llm.dog_profiler import DogProfilerPipeline, ProfileValidationError
from services.llm.llm_client import TruncatedLLMResponseError, UpstreamLLMError

GROUNDED = {"id": 11227, "name": "Gabi", "breed": "Springer", "properties": {"description": "Gabi is a sweet but sensitive Springer who loves tennis balls. " * 5}}
OUTAGE = httpx.HTTPStatusError("503", request=httpx.Request("POST", "https://openrouter.ai"), response=httpx.Response(503))


@pytest.fixture
def pipeline(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "test-key-never-used")
    p = DogProfilerPipeline(organization_id=11, dry_run=True)
    p.database_updater = Mock()
    p.database_updater.record_failed_runs.return_value = {}
    return p


@pytest.mark.unit
@pytest.mark.asyncio
class TestOnlyDogSpecificFailuresAreCounted:
    @pytest.mark.parametrize("error", [ProfileValidationError("energy_level: bad", prompt_adjustment=""), TruncatedLLMResponseError("cut off")])
    async def test_a_bad_answer_for_this_dog_is_counted(self, pipeline, error):
        pipeline.retry_handler.execute_with_retry = AsyncMock(side_effect=error)

        await pipeline.process_dog(GROUNDED)
        pipeline.record_failed_runs()

        pipeline.database_updater.record_failed_runs.assert_called_once_with([11227])

    @pytest.mark.parametrize("error", [OUTAGE, TimeoutError(), UpstreamLLMError("429 upstream"), httpx.ConnectError("down")])
    async def test_a_service_wide_failure_is_not_counted(self, pipeline, error):
        pipeline.retry_handler.execute_with_retry = AsyncMock(side_effect=error)

        await pipeline.process_dog(GROUNDED)
        pipeline.record_failed_runs()

        pipeline.database_updater.record_failed_runs.assert_called_once_with([])
