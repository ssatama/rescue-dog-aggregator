"""
Test suite for LLMClient vision API support.

Following CLAUDE.md principles:
- TDD approach: Write tests first, see them FAIL, then implement
- Comprehensive coverage of message formatting, API calls, error handling
- Mock external dependencies (httpx)

These tests are written BEFORE implementation (Task 1.5).
They should ALL FAIL until the vision API method is implemented.
"""

import json
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from services.llm.llm_client import LLMClient


@pytest.mark.integration
class TestLLMClientVisionAPI:
    """Test the LLMClient vision API integration."""

    @pytest.fixture
    def llm_client(self):
        """Create LLMClient instance with mock API key."""
        return LLMClient(api_key="test-api-key")

    @pytest.fixture
    def sample_image_url(self):
        """Sample image URL for testing."""
        return "https://example.com/dog.jpg"

    @pytest.fixture
    def sample_prompt(self):
        """Sample analysis prompt."""
        return "Analyze this dog photo for Instagram quality"

    @pytest.fixture
    def mock_vision_response(self):
        """Mock successful vision API response."""
        return {
            "id": "gen-123",
            "model": "google/gemini-2.5-flash-image",
            "choices": [
                {
                    "message": {
                        "role": "assistant",
                        "content": json.dumps(
                            {
                                "quality_score": 8,
                                "visibility_score": 9,
                                "appeal_score": 7,
                                "background_score": 6,
                                "overall_score": 7.5,
                                "ig_ready": False,
                                "confidence": "high",
                                "reasoning": "Good photo with minor issues",
                                "flags": ["busy_background"],
                            }
                        ),
                    }
                }
            ],
            "usage": {
                "prompt_tokens": 150,
                "completion_tokens": 80,
                "total_tokens": 230,
            },
        }

    @pytest.mark.asyncio
    async def test_call_vision_api_formats_message_correctly(self, llm_client, sample_image_url, sample_prompt):
        """Test that call_vision_api formats messages with correct vision API structure."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"choices": [{"message": {"content": '{"test": "data"}'}}]}
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

            # Verify post was called
            assert mock_client.post.called
            call_args = mock_client.post.call_args

            # Verify the JSON payload structure
            json_payload = call_args.kwargs["json"]
            messages = json_payload["messages"]

            # Should have exactly one message
            assert len(messages) == 1
            message = messages[0]

            # Verify message structure
            assert message["role"] == "user"
            assert "content" in message
            assert isinstance(message["content"], list)

            # Content should have text and image_url parts
            content = message["content"]
            assert len(content) == 2

            # Find text and image parts
            text_part = next(part for part in content if part["type"] == "text")
            image_part = next(part for part in content if part["type"] == "image_url")

            # Verify text part
            assert text_part["text"] == sample_prompt

            # Verify image_url part structure
            assert "image_url" in image_part
            assert image_part["image_url"]["url"] == sample_image_url

    @pytest.mark.asyncio
    async def test_call_vision_api_success(self, llm_client, sample_image_url, sample_prompt, mock_vision_response):
        """Test successful vision API call with proper response parsing."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = mock_vision_response
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            result = await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

            # Verify result is parsed JSON
            assert isinstance(result, dict)
            assert result["quality_score"] == 8
            assert result["visibility_score"] == 9
            assert result["appeal_score"] == 7
            assert result["background_score"] == 6
            assert result["overall_score"] == 7.5
            assert result["ig_ready"] is False
            assert result["confidence"] == "high"

    @pytest.mark.asyncio
    async def test_call_vision_api_uses_correct_endpoint(self, llm_client, sample_image_url, sample_prompt):
        """Test that vision API calls the correct OpenRouter endpoint."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"choices": [{"message": {"content": '{"test": "data"}'}}]}
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

            # Verify correct endpoint
            call_args = mock_client.post.call_args
            assert call_args.args[0] == "https://openrouter.ai/api/v1/chat/completions"

    @pytest.mark.asyncio
    async def test_call_vision_api_includes_correct_headers(self, llm_client, sample_image_url, sample_prompt):
        """Test that vision API includes proper authentication and metadata headers."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"choices": [{"message": {"content": '{"test": "data"}'}}]}
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

            call_args = mock_client.post.call_args
            headers = call_args.kwargs["headers"]

            # Verify required headers
            assert "Authorization" in headers
            assert headers["Authorization"] == "Bearer test-api-key"
            assert headers["Content-Type"] == "application/json"
            assert headers["HTTP-Referer"] == "https://rescuedogs.me"
            assert headers["X-Title"] == "Rescue Dog Aggregator"

    @pytest.mark.asyncio
    async def test_call_vision_api_with_custom_model(self, llm_client, sample_image_url, sample_prompt):
        """Test vision API with custom model parameter."""
        custom_model = "google/gemini-2.0-flash-exp"

        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"choices": [{"message": {"content": '{"test": "data"}'}}]}
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt, model=custom_model)

            call_args = mock_client.post.call_args
            json_payload = call_args.kwargs["json"]

            assert json_payload["model"] == custom_model

    @pytest.mark.asyncio
    async def test_call_vision_api_with_custom_parameters(self, llm_client, sample_image_url, sample_prompt):
        """Test vision API with custom temperature, max_tokens, and timeout."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"choices": [{"message": {"content": '{"test": "data"}'}}]}
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            await llm_client.call_vision_api(
                image_url=sample_image_url,
                prompt=sample_prompt,
                temperature=0.2,
                max_tokens=500,
                timeout=60.0,
            )

            call_args = mock_client.post.call_args
            json_payload = call_args.kwargs["json"]

            assert json_payload["temperature"] == 0.2
            assert json_payload["max_tokens"] == 500
            assert call_args.kwargs["timeout"] == 60.0

    @pytest.mark.asyncio
    async def test_call_vision_api_handles_500_error(self, llm_client, sample_image_url, sample_prompt):
        """Test vision API handles 500 server error."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 500
            mock_response.json.return_value = {"error": "Internal server error"}
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError("500 Server Error", request=MagicMock(), response=mock_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with pytest.raises(httpx.HTTPStatusError):
                await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

    @pytest.mark.asyncio
    async def test_call_vision_api_handles_429_rate_limit(self, llm_client, sample_image_url, sample_prompt):
        """Test vision API handles 429 rate limit error."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 429
            mock_response.json.return_value = {"error": "Rate limit exceeded"}
            mock_response.raise_for_status.side_effect = httpx.HTTPStatusError("429 Too Many Requests", request=MagicMock(), response=mock_response)
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with pytest.raises(httpx.HTTPStatusError):
                await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

    @pytest.mark.asyncio
    async def test_call_vision_api_handles_timeout(self, llm_client, sample_image_url, sample_prompt):
        """Test vision API handles timeout errors."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.TimeoutException("Request timeout"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with pytest.raises(httpx.TimeoutException):
                await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt, timeout=1.0)

    @pytest.mark.asyncio
    async def test_call_vision_api_handles_network_error(self, llm_client, sample_image_url, sample_prompt):
        """Test vision API handles network connection errors."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_client.post = AsyncMock(side_effect=httpx.NetworkError("Connection failed"))
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with pytest.raises(httpx.NetworkError):
                await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

    @pytest.mark.asyncio
    async def test_call_vision_api_handles_invalid_json_response(self, llm_client, sample_image_url, sample_prompt):
        """Test vision API handles invalid JSON in response."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"choices": [{"message": {"content": "Not valid JSON at all"}}]}
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            with pytest.raises(json.JSONDecodeError):
                await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

    @pytest.mark.asyncio
    async def test_call_vision_api_reuses_existing_methods(self, llm_client, sample_image_url, sample_prompt):
        """Test that call_vision_api reuses call_api_and_parse for consistency."""
        # This test verifies the implementation approach
        # call_vision_api should format messages then delegate to call_api_and_parse

        with patch.object(llm_client, "call_api_and_parse", new_callable=AsyncMock) as mock_parse:
            mock_parse.return_value = {"test": "data"}

            result = await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

            # Verify call_api_and_parse was called
            assert mock_parse.called
            call_args = mock_parse.call_args

            # Verify messages parameter was passed
            assert "messages" in call_args.kwargs
            messages = call_args.kwargs["messages"]

            # Verify message structure
            assert len(messages) == 1
            assert messages[0]["role"] == "user"
            assert isinstance(messages[0]["content"], list)

    @pytest.mark.asyncio
    async def test_call_vision_api_default_parameters(self, llm_client, sample_image_url, sample_prompt):
        """Test that call_vision_api uses correct default parameters."""
        with patch("httpx.AsyncClient") as mock_client_class:
            mock_client = AsyncMock()
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {"choices": [{"message": {"content": '{"test": "data"}'}}]}
            mock_client.post = AsyncMock(return_value=mock_response)
            mock_client.__aenter__ = AsyncMock(return_value=mock_client)
            mock_client.__aexit__ = AsyncMock(return_value=None)
            mock_client_class.return_value = mock_client

            await llm_client.call_vision_api(image_url=sample_image_url, prompt=sample_prompt)

            call_args = mock_client.post.call_args
            json_payload = call_args.kwargs["json"]

            # Verify defaults from worklog spec
            assert json_payload["model"] == "google/gemini-2.5-flash-image"
            assert json_payload["temperature"] == 0.3  # Lower for consistent scoring
            assert json_payload["max_tokens"] == 1000
            assert call_args.kwargs["timeout"] == 30.0
