"""
Simplified tests for LLM Data Service - focusing on core functionality.

Following CLAUDE.md principles:
- TDD mandatory - write failing tests first
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
"""

from unittest.mock import AsyncMock, Mock

import pytest

from services.llm.models import ProcessingType
from services.llm_data_service import OpenRouterLLMDataService
from services.null_objects import NullLLMDataService


class TestLLMServiceContracts:
    """Test that services implement expected contracts."""

    @pytest.fixture
    def null_service(self):
        return NullLLMDataService()

    @pytest.fixture
    def openrouter_service(self):
        return OpenRouterLLMDataService(api_key="test-key")

    @pytest.mark.asyncio
    async def test_null_service_clean_description_returns_unchanged(self, null_service):
        """Null service should return input unchanged."""
        original = "messy description!!! needs cleaning..."
        result = await null_service.clean_description(original)
        assert result == original

    @pytest.mark.asyncio
    async def test_null_service_generates_empty_profile(self, null_service):
        """Null service should return empty profile data structure."""
        animal_data = {"name": "Rex", "breed": "German Shepherd"}
        result = await null_service.generate_dog_profiler(animal_data)
        expected = {"tagline": "", "bio": "", "looking_for": "", "personality_traits": [], "interests": [], "deal_breakers": None, "fun_fact": None}
        assert result == expected
        assert isinstance(result, dict)

    @pytest.mark.asyncio
    async def test_null_service_returns_original_translation(self, null_service):
        """Null service should return original text for translation."""
        original = "Hello world"
        result = await null_service.translate_text(original, "es")
        assert result == original


class TestOpenRouterServiceInit:
    """Test OpenRouter service initialization."""

    def test_service_initializes_with_defaults(self):
        """Service should initialize with sensible defaults."""
        from services.llm.config import get_llm_config

        # Clear config cache to ensure clean state
        get_llm_config.cache_clear()

        service = OpenRouterLLMDataService(api_key="test-key")
        assert service.api_key == "test-key"
        assert service.base_url == "https://openrouter.ai/api/v1"
        assert service.timeout == 30.0
        # Development environment defaults to 3 retries (production gets 5)
        assert service.max_retries == 3

    def test_service_initializes_with_custom_params(self):
        """Service should accept custom parameters."""
        service = OpenRouterLLMDataService(api_key="custom-key", base_url="https://custom.api.com/v1", timeout=30.0, max_retries=5)
        assert service.api_key == "custom-key"
        assert service.base_url == "https://custom.api.com/v1"
        assert service.timeout == 30.0
        assert service.max_retries == 5


@pytest.mark.asyncio
class TestLLMServiceIntegration:
    """Integration tests focusing on database operations."""

    @pytest.fixture
    def service(self):
        """Create service for integration testing."""
        return OpenRouterLLMDataService(api_key="test-key")

    async def test_service_context_manager_support(self, service):
        """Service should support context manager pattern."""
        # Test that async context manager works without errors
        async with service:
            # Just verify the context manager pattern works
            assert service.client is not None

    async def test_batch_processing_interface(self, service):
        """Batch processing should handle empty lists gracefully."""
        # Test with empty list - should not fail
        result = await service.batch_process([], ProcessingType.DESCRIPTION_CLEANING)
        assert isinstance(result, list)
        assert len(result) == 0


class TestLLMDataModels:
    """Test the data models used by LLM services."""

    def test_processing_type_enum_values(self):
        """Verify ProcessingType enum has expected values."""
        assert ProcessingType.DESCRIPTION_CLEANING == "description_cleaning"
        assert ProcessingType.DOG_PROFILER == "dog_profiler"
        assert ProcessingType.TRANSLATION == "translation"
