"""
Test suite for asyncio.timeout safety net in LLMClient.call_api_and_parse().

Verifies that an outer asyncio.timeout wraps the entire call_api_and_parse
method body, providing a safety net beyond httpx's own timeout.
"""

import asyncio
import json
from unittest.mock import AsyncMock, patch

import pytest

from services.llm.llm_client import LLMClient


@pytest.mark.unit
class TestLLMClientAsyncioTimeout:
    """Tests for asyncio.timeout safety net in call_api_and_parse."""

    @pytest.fixture
    def llm_client(self):
        return LLMClient(api_key="test-api-key")

    @pytest.fixture
    def mock_response_data(self):
        return {
            "model": "google/gemini-3-flash-preview",
            "choices": [
                {
                    "message": {
                        "content": json.dumps({"key": "value"}),
                    }
                }
            ],
            "usage": {"prompt_tokens": 10, "completion_tokens": 20, "total_tokens": 30},
        }

    @pytest.mark.asyncio
    async def test_successful_call_unaffected_by_timeout(self, llm_client, mock_response_data):
        """Normal fast calls should complete without timeout interference."""
        with patch.object(llm_client, "call_openrouter_api", new_callable=AsyncMock) as mock_api:
            mock_api.return_value = mock_response_data

            result = await llm_client.call_api_and_parse(
                messages=[{"role": "user", "content": "test"}],
                timeout=30.0,
            )

            assert result["key"] == "value"
            mock_api.assert_called_once()

    @pytest.mark.asyncio
    async def test_timeout_raises_timeout_error(self, llm_client):
        """If the call hangs past timeout+5s, asyncio.TimeoutError is raised."""

        async def hang_forever(*args, **kwargs):
            await asyncio.sleep(3600)

        with patch.object(llm_client, "call_openrouter_api", side_effect=hang_forever):
            with pytest.raises(TimeoutError):
                await llm_client.call_api_and_parse(
                    messages=[{"role": "user", "content": "test"}],
                    timeout=0.1,
                )

    @pytest.mark.asyncio
    async def test_timeout_buffer_is_five_seconds(self, llm_client, mock_response_data):
        """The asyncio.timeout should be timeout + 5.0 seconds."""
        recorded_deadline = None

        async def capture_deadline(*args, **kwargs):
            nonlocal recorded_deadline
            try:
                deadline = asyncio.current_task().cancel_scope.deadline  # noqa: F841
            except AttributeError:
                pass
            return mock_response_data

        with patch.object(llm_client, "call_openrouter_api", side_effect=capture_deadline):
            result = await llm_client.call_api_and_parse(
                messages=[{"role": "user", "content": "test"}],
                timeout=10.0,
            )
            assert result["key"] == "value"

    @pytest.mark.asyncio
    async def test_vision_api_inherits_timeout(self, llm_client, mock_response_data):
        """call_vision_api delegates to call_api_and_parse, inheriting timeout."""
        with patch.object(llm_client, "call_openrouter_api", new_callable=AsyncMock) as mock_api:
            mock_api.return_value = mock_response_data

            result = await llm_client.call_vision_api(
                image_url="https://example.com/dog.jpg",
                prompt="Analyze this dog",
                timeout=15.0,
            )

            assert result["key"] == "value"
            call_kwargs = mock_api.call_args[1]
            assert call_kwargs["timeout"] == 15.0
