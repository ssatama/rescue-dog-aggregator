"""
Tests for LLMClient class.

Following CLAUDE.md principles:
- Test-driven development
- Isolated unit tests
- Clear test names
"""

import json
from unittest.mock import AsyncMock, patch

import pytest

from services.llm.llm_client import LLMClient


class TestLLMClient:
    """Test suite for LLMClient class."""

    def test_init_with_api_key(self):
        """Test initialization with provided API key."""
        client = LLMClient(api_key="test-key")
        assert client.api_key == "test-key"

    def test_init_with_env_var(self):
        """Test initialization using environment variable."""
        with patch.dict("os.environ", {"OPENROUTER_API_KEY": "env-key"}):
            client = LLMClient()
            assert client.api_key == "env-key"

    def test_init_without_api_key_raises_error(self):
        """Test initialization without API key raises ValueError."""
        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="No OpenRouter API key found"):
                LLMClient()

    @pytest.mark.asyncio
    async def test_call_openrouter_api_success(self):
        """Test successful API call to OpenRouter."""
        client = LLMClient(api_key="test-key")

        mock_response = {"choices": [{"message": {"content": "test response"}}], "model": "google/gemini-2.5-flash"}

        with patch("httpx.AsyncClient") as mock_client:
            # Create a mock response object
            mock_resp = AsyncMock()
            mock_resp.status_code = 200
            mock_resp.json = lambda: mock_response

            # Make post return the mock response (not a coroutine)
            mock_post = AsyncMock(return_value=mock_resp)
            mock_client.return_value.__aenter__.return_value.post = mock_post

            messages = [{"role": "user", "content": "test"}]
            result = await client.call_openrouter_api(messages)

            assert result == mock_response
            mock_post.assert_called_once()

            # Verify request parameters
            call_kwargs = mock_post.call_args[1]
            assert call_kwargs["json"]["model"] == "google/gemini-2.5-flash"
            assert call_kwargs["json"]["messages"] == messages
            assert call_kwargs["json"]["temperature"] == 0.7
            assert call_kwargs["json"]["max_tokens"] == 4000

    @pytest.mark.asyncio
    async def test_call_openrouter_api_with_custom_params(self):
        """Test API call with custom parameters."""
        client = LLMClient(api_key="test-key")

        mock_response = {"choices": [{"message": {"content": "test"}}]}

        with patch("httpx.AsyncClient") as mock_client:
            mock_resp = AsyncMock()
            mock_resp.status_code = 200
            mock_resp.json = lambda: mock_response

            mock_post = AsyncMock(return_value=mock_resp)
            mock_client.return_value.__aenter__.return_value.post = mock_post

            messages = [{"role": "user", "content": "test"}]
            await client.call_openrouter_api(messages, model="custom-model", temperature=0.5, max_tokens=2000, timeout=60.0)

            call_kwargs = mock_post.call_args[1]
            assert call_kwargs["json"]["model"] == "custom-model"
            assert call_kwargs["json"]["temperature"] == 0.5
            assert call_kwargs["json"]["max_tokens"] == 2000
            assert call_kwargs["timeout"] == 60.0

    @pytest.mark.asyncio
    async def test_call_openrouter_api_error_response(self):
        """Test API call with error response."""
        client = LLMClient(api_key="test-key")

        with patch("httpx.AsyncClient") as mock_client:
            mock_resp = AsyncMock()
            mock_resp.status_code = 400
            mock_resp.json = lambda: {"error": "Bad request"}
            mock_resp.raise_for_status = lambda: (_ for _ in ()).throw(Exception("HTTP 400"))

            mock_post = AsyncMock(return_value=mock_resp)
            mock_client.return_value.__aenter__.return_value.post = mock_post

            messages = [{"role": "user", "content": "test"}]

            with pytest.raises(Exception, match="HTTP 400"):
                await client.call_openrouter_api(messages)

    def test_extract_content_from_response_simple(self):
        """Test content extraction from simple response."""
        client = LLMClient(api_key="test-key")

        response_data = {"choices": [{"message": {"content": "Simple response content"}}]}

        content = client.extract_content_from_response(response_data)
        assert content == "Simple response content"

    def test_extract_content_from_response_with_markdown(self):
        """Test content extraction from markdown-wrapped response."""
        client = LLMClient(api_key="test-key")

        markdown_content = """```json
{
  "test": "value",
  "number": 42
}
```"""

        response_data = {"choices": [{"message": {"content": markdown_content}}]}

        content = client.extract_content_from_response(response_data)
        expected = '{\n  "test": "value",\n  "number": 42\n}'
        assert content == expected

    def test_extract_json_from_markdown(self):
        """Test JSON extraction from markdown code blocks."""
        client = LLMClient(api_key="test-key")

        markdown = """Some text before
```json
{
  "key": "value"
}
```
Some text after"""

        result = client._extract_json_from_markdown(markdown)
        expected = '{\n  "key": "value"\n}'
        assert result == expected

    def test_extract_json_from_markdown_multiple_blocks(self):
        """Test JSON extraction with multiple code blocks."""
        client = LLMClient(api_key="test-key")

        markdown = """```python
print("hello")
```
```json
{
  "extracted": true
}
```
```javascript
console.log("world")
```"""

        result = client._extract_json_from_markdown(markdown)
        expected = '{\n  "extracted": true\n}'
        assert result == expected

    def test_parse_json_response_without_model(self):
        """Test JSON parsing without model metadata."""
        client = LLMClient(api_key="test-key")

        json_content = '{"test": "value", "number": 42}'
        result = client.parse_json_response(json_content)

        expected = {"test": "value", "number": 42}
        assert result == expected

    def test_parse_json_response_with_model(self):
        """Test JSON parsing with model metadata."""
        client = LLMClient(api_key="test-key")

        json_content = '{"test": "value"}'
        result = client.parse_json_response(json_content, "test-model")

        expected = {"test": "value", "model_used": "test-model"}
        assert result == expected

    def test_parse_json_response_invalid_json(self):
        """Test JSON parsing with invalid JSON raises error."""
        client = LLMClient(api_key="test-key")

        invalid_json = "not valid json"

        with pytest.raises(json.JSONDecodeError):
            client.parse_json_response(invalid_json)

    @pytest.mark.asyncio
    async def test_call_api_and_parse_complete_flow(self):
        """Test complete API call and parsing flow."""
        client = LLMClient(api_key="test-key")

        # Mock response with JSON content
        api_response = {"choices": [{"message": {"content": '{"result": "success"}'}}], "model": "google/gemini-2.5-flash"}

        with patch.object(client, "call_openrouter_api", return_value=api_response):
            messages = [{"role": "user", "content": "test"}]
            result = await client.call_api_and_parse(messages, model="google/gemini-2.5-flash")

            expected = {"result": "success", "model_used": "google/gemini-2.5-flash"}
            assert result == expected

    @pytest.mark.asyncio
    async def test_call_api_and_parse_with_markdown(self):
        """Test complete flow with markdown-wrapped JSON."""
        client = LLMClient(api_key="test-key")

        markdown_content = """```json
{
  "extracted": true,
  "source": "markdown"
}
```"""

        api_response = {"choices": [{"message": {"content": markdown_content}}], "model": "test-model"}

        with patch.object(client, "call_openrouter_api", return_value=api_response):
            messages = [{"role": "user", "content": "test"}]
            result = await client.call_api_and_parse(messages, model="test-model")

            expected = {"extracted": True, "source": "markdown", "model_used": "test-model"}
            assert result == expected
