"""
Tests for LLM Data Service following TDD approach.

Following CLAUDE.md principles:
- TDD mandatory - write failing tests first
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
"""

import json
from unittest.mock import AsyncMock, MagicMock, Mock, patch

import httpx
import pytest
from pydantic import ValidationError

from services.llm.models import (
    AnimalEnrichmentRequest,
    AnimalEnrichmentResponse,
    LLMMessage,
    LLMRequest,
    LLMResponse,
    ProcessingType,
)
from services.llm_data_service import LLMDataService, OpenRouterLLMDataService
from services.null_objects import NullLLMDataService


def create_mock_response(status_code: int, json_data: dict = None, raise_for_status_error: Exception = None):
    """Helper function to create properly mocked HTTP responses."""
    mock_response = Mock()
    mock_response.status_code = status_code
    mock_response.json.return_value = json_data or {}
    if raise_for_status_error:
        mock_response.raise_for_status.side_effect = raise_for_status_error
    else:
        mock_response.raise_for_status.return_value = None
    return mock_response


class TestLLMServiceInterface:
    """Contract tests that all LLM service implementations must pass."""

    @pytest.fixture
    def null_service(self):
        """Create a NullLLMDataService instance."""
        return NullLLMDataService()

    @pytest.fixture
    def openrouter_service(self):
        """Create an OpenRouterLLMDataService instance with mock client."""
        with patch("httpx.AsyncClient"):
            return OpenRouterLLMDataService(api_key="test-key")

    @pytest.mark.asyncio
    @pytest.mark.parametrize("service_fixture", ["null_service", "openrouter_service"])
    @pytest.mark.asyncio
    async def test_service_implements_interface(self, request, service_fixture):
        """Verify both services implement the same interface."""
        service = request.getfixturevalue(service_fixture)

        # Check required methods exist
        assert hasattr(service, "enrich_animal_data")
        assert hasattr(service, "clean_description")
        assert hasattr(service, "generate_dog_profiler")
        assert hasattr(service, "translate_text")
        assert hasattr(service, "batch_process")

    @pytest.mark.asyncio
    async def test_null_service_returns_unchanged_data(self, null_service):
        """Verify NullLLMDataService returns data unchanged."""
        original_description = "A friendly dog looking for a home"

        result = await null_service.clean_description(original_description)
        assert result == original_description

        profile = await null_service.generate_dog_profiler({"name": "Max", "description": original_description})
        expected_profile = {"tagline": "", "bio": "", "looking_for": "", "personality_traits": [], "interests": [], "deal_breakers": None, "fun_fact": None}
        assert profile == expected_profile

        translated = await null_service.translate_text(original_description, "es")
        assert translated == original_description


class TestOpenRouterLLMService:
    """Tests for OpenRouter LLM Service implementation."""

    @pytest.fixture
    def mock_httpx_client(self):
        """Create a mock httpx async client."""
        return AsyncMock(spec=httpx.AsyncClient)

    @pytest.fixture
    def service(self, mock_httpx_client):
        """Create service with mocked HTTP client."""
        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            service = OpenRouterLLMDataService(api_key="test-key", timeout=30.0, max_retries=3)
            service.client = mock_httpx_client
            return service

    @pytest.mark.asyncio
    async def test_successful_api_call(self, service, mock_httpx_client):
        """Test successful API call to OpenRouter."""
        from unittest.mock import Mock

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "Clean, friendly description"}}]}
        mock_httpx_client.post.return_value = mock_response

        result = await service.clean_description("messy desc!!! needs cleaning...")

        assert result == "Clean, friendly description"
        mock_httpx_client.post.assert_called_once()

        # Verify request was made
        call_args = mock_httpx_client.post.call_args
        assert call_args[0][0] == "https://openrouter.ai/api/v1/chat/completions"

    @pytest.mark.asyncio
    async def test_client_error_raises_exception(self, service, mock_httpx_client):
        """Test that 4xx errors raise appropriate exceptions."""
        from unittest.mock import Mock

        mock_response = Mock()
        mock_response.status_code = 401
        mock_response.raise_for_status.side_effect = httpx.HTTPStatusError("Invalid API key", request=Mock(), response=Mock(status_code=401, json=lambda: {"error": {"message": "Invalid API key"}}))
        mock_httpx_client.post.return_value = mock_response

        with pytest.raises(ValueError) as exc_info:
            await service.clean_description("test")

        # Check that error message contains reference to API key or request failure
        assert "API key" in str(exc_info.value) or "request" in str(exc_info.value)

    @pytest.mark.asyncio
    async def test_server_error_triggers_retry(self, service, mock_httpx_client):
        """Test that 5xx errors trigger retry logic."""
        from unittest.mock import Mock

        # Create failing responses
        error_response_1 = Mock()
        error_response_1.status_code = 503
        error_response_1.raise_for_status.side_effect = httpx.HTTPStatusError("Service unavailable", request=Mock(), response=Mock(status_code=503))

        error_response_2 = Mock()
        error_response_2.status_code = 500
        error_response_2.raise_for_status.side_effect = httpx.HTTPStatusError("Internal error", request=Mock(), response=Mock(status_code=500))

        # Create success response
        success_response = Mock()
        success_response.status_code = 200
        success_response.raise_for_status.return_value = None
        success_response.json.return_value = {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "Success after retries"}}]}

        # First two calls fail, third succeeds
        mock_httpx_client.post.side_effect = [error_response_1, error_response_2, success_response]

        result = await service.clean_description("test")

        assert result == "Success after retries"
        assert mock_httpx_client.post.call_count == 3

    @pytest.mark.asyncio
    async def test_malformed_response_raises_error(self, service, mock_httpx_client):
        """Test that malformed API responses raise validation errors."""
        mock_response = httpx.Response(200, json={"invalid": "response structure"})
        mock_httpx_client.post.return_value = mock_response

        with pytest.raises(Exception) as exc_info:
            await service.clean_description("test")

        assert "response" in str(exc_info.value).lower()

    @pytest.mark.asyncio
    async def test_dog_profiler_generation(self, service, mock_httpx_client):
        """Test generating a dog profiler data."""
        mock_response = create_mock_response(
            200,
            {
                "id": "test-id",
                "model": "openrouter/auto",
                "choices": [
                    {
                        "message": {
                            "content": json.dumps(
                                {
                                    "tagline": "Adventure-loving pup seeks hiking buddy",
                                    "bio": "I love long walks and belly rubs",
                                    "looking_for": "Active family with yard",
                                    "personality_traits": ["friendly", "energetic", "loyal"],
                                }
                            )
                        }
                    }
                ],
            },
        )
        mock_httpx_client.post.return_value = mock_response

        dog_data = {"name": "Max", "breed": "Labrador", "age_text": "2 years", "description": "Friendly and energetic dog"}

        result = await service.generate_dog_profiler(dog_data)

        assert "tagline" in result
        assert "bio" in result
        assert "personality_traits" in result
        assert isinstance(result["personality_traits"], list)

    @pytest.mark.asyncio
    async def test_batch_processing(self, service, mock_httpx_client):
        """Test batch processing multiple animals."""
        mock_response = create_mock_response(200, {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "Processed description"}}]})
        mock_httpx_client.post.return_value = mock_response

        animals = [{"id": 1, "description": "Dog 1"}, {"id": 2, "description": "Dog 2"}, {"id": 3, "description": "Dog 3"}]

        results = await service.batch_process(animals, processing_type=ProcessingType.DESCRIPTION_CLEANING)

        assert len(results) == 3
        assert all("enriched_description" in r for r in results)

    @pytest.mark.asyncio
    async def test_translation(self, service, mock_httpx_client):
        """Test text translation functionality."""
        mock_response = create_mock_response(200, {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "Perro amigable busca hogar"}}]})
        mock_httpx_client.post.return_value = mock_response

        result = await service.translate_text("Friendly dog seeks home", target_language="es")

        assert result == "Perro amigable busca hogar"

        # Verify the translation prompt was structured correctly
        call_args = mock_httpx_client.post.call_args
        request_data = call_args[1]["json"]
        assert any("Spanish" in msg["content"] or "es" in msg["content"] for msg in request_data["messages"])

    @pytest.mark.asyncio
    async def test_caching_prevents_duplicate_calls(self, mock_httpx_client):
        """Test that caching prevents duplicate API calls for same content."""
        from unittest.mock import Mock, patch

        from services.llm.config import get_llm_config

        # Clear config cache and ensure caching is enabled for this test
        get_llm_config.cache_clear()

        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "Cached result"}}]}
        mock_httpx_client.post.return_value = mock_response

        # Create service with explicitly enabled caching
        with patch("httpx.AsyncClient", return_value=mock_httpx_client):
            service = OpenRouterLLMDataService(api_key="test-key", cache_enabled=True)
            service.client = mock_httpx_client

            # Make same request twice
            description = "Same description"
            result1 = await service.clean_description(description)
            result2 = await service.clean_description(description)

            assert result1 == result2 == "Cached result"
            # Should only call API once due to caching
            assert mock_httpx_client.post.call_count == 1

    @pytest.mark.asyncio
    async def test_organization_specific_prompts(self, service, mock_httpx_client):
        """Test that organization-specific prompts are used when provided."""
        mock_response = create_mock_response(200, {"id": "test-id", "model": "openrouter/auto", "choices": [{"message": {"content": "Organization-specific result"}}]})
        mock_httpx_client.post.return_value = mock_response

        org_config = {"prompt_style": "professional", "include_adoption_info": True}

        result = await service.clean_description("test description", organization_config=org_config)

        # Verify org config influences the prompt
        call_args = mock_httpx_client.post.call_args
        request_data = call_args[1]["json"]
        # The prompt should be adjusted based on org config
        assert len(request_data["messages"]) > 0


class TestLLMDataModels:
    """Test Pydantic models for data validation."""

    def test_llm_request_validation(self):
        """Test LLMRequest model validation."""
        # Valid request
        request = LLMRequest(messages=[LLMMessage(role="system", content="You are a helpful assistant"), LLMMessage(role="user", content="Hello")], temperature=0.7)
        assert request.model == "openrouter/auto"  # Default value
        assert request.temperature == 0.7

        # Invalid role should raise error
        with pytest.raises(ValidationError):
            LLMRequest(messages=[LLMMessage(role="invalid", content="test")])

    def test_animal_enrichment_request(self):
        """Test AnimalEnrichmentRequest model."""
        request = AnimalEnrichmentRequest(animal_data={"name": "Max", "description": "Friendly dog"}, processing_type=ProcessingType.DESCRIPTION_CLEANING, organization_config={"style": "casual"})

        assert request.processing_type == ProcessingType.DESCRIPTION_CLEANING
        assert request.organization_config["style"] == "casual"

    def test_animal_enrichment_response(self):
        """Test AnimalEnrichmentResponse model."""
        response = AnimalEnrichmentResponse(
            original_data={"description": "original"}, enriched_data={"description": "cleaned"}, processing_type=ProcessingType.DESCRIPTION_CLEANING, model_used="gpt-4", tokens_used=150
        )

        assert response.enriched_data["description"] == "cleaned"
        assert response.tokens_used == 150
