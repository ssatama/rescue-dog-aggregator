"""Test that LLM profiling scopes its frontend cache invalidation.

The frontend tags every dog-detail fetch ``["animal", slug]`` and every
enhanced-detail fetch ``["enhanced", ...]``. Purging those bare tags
invalidates all ~1,300 dog detail pages, so a profiling batch that touched
20 dogs used to cost a full-site ISR regeneration. Profiling must purge
only the pages for the dogs it actually profiled.
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest

FANOUT_TAGS = {"animal", "enhanced"}


@pytest.fixture
def profiler():
    """DogProfiler with its DB layer stubbed out."""
    from services.llm.dog_profiler import DogProfilerPipeline

    pipeline = DogProfilerPipeline.__new__(DogProfilerPipeline)
    pipeline.database_updater = Mock()
    pipeline.database_updater.save_results = AsyncMock(return_value=True)
    pipeline.database_updater.get_slugs = Mock(return_value=[])
    return pipeline


@pytest.fixture
def mock_invalidate():
    with patch("services.revalidation_client.invalidate", new_callable=AsyncMock) as mock:
        yield mock


def _tags_from(mock_invalidate) -> list[str]:
    return mock_invalidate.await_args.kwargs["tags"]


@pytest.mark.unit
@pytest.mark.asyncio
class TestDogProfilerCacheInvalidation:
    async def test_never_sends_fanout_tags(self, profiler, mock_invalidate):
        profiler.database_updater.get_slugs.return_value = ["rex-terrier-101"]

        await profiler.save_results([{"dog_id": 101}])

        assert not (set(_tags_from(mock_invalidate)) & FANOUT_TAGS)

    async def test_sends_slug_tag_per_profiled_dog(self, profiler, mock_invalidate):
        profiler.database_updater.get_slugs.return_value = [
            "rex-terrier-101",
            "bella-lab-102",
        ]

        await profiler.save_results([{"dog_id": 101}, {"dog_id": 102}])

        profiler.database_updater.get_slugs.assert_called_once_with([101, 102])
        sent = set(_tags_from(mock_invalidate))
        assert {"rex-terrier-101", "bella-lab-102"}.issubset(sent)
        assert "animals" in sent

    async def test_skips_results_without_a_dog_id(self, profiler, mock_invalidate):
        await profiler.save_results([{"dog_id": 101}, {"description": "no id"}])

        profiler.database_updater.get_slugs.assert_called_once_with([101])

    async def test_does_not_invalidate_when_save_failed(self, profiler, mock_invalidate):
        profiler.database_updater.save_results = AsyncMock(return_value=False)

        result = await profiler.save_results([{"dog_id": 101}])

        assert result is False
        mock_invalidate.assert_not_awaited()

    async def test_slug_lookup_failure_still_invalidates_listings(self, profiler, mock_invalidate):
        profiler.database_updater.get_slugs.side_effect = RuntimeError("connection lost")

        await profiler.save_results([{"dog_id": 101}])

        mock_invalidate.assert_awaited_once()
        assert _tags_from(mock_invalidate) == ["animals"]
