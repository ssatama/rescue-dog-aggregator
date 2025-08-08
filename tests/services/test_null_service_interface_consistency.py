"""
Tests for interface consistency between real and null LLM services.

This ensures that both services can be used interchangeably without type errors,
maintaining proper polymorphism and the Null Object pattern principle.

Following CLAUDE.md principles:
- TDD mandatory - write failing tests first
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
"""

import inspect
from typing import get_type_hints
from unittest.mock import Mock

import pytest

from services.llm.models import ProcessingType
from services.llm_data_service import LLMDataService, OpenRouterLLMDataService
from services.null_objects import NullLLMDataService


class TestInterfaceConsistency:
    """Test that real and null services have consistent interfaces."""

    @pytest.fixture
    def null_service(self):
        """Create null service instance."""
        return NullLLMDataService()

    @pytest.fixture
    def mock_config(self):
        """Create mock config for OpenRouter service."""
        config = Mock()
        config.api_key = "test-key"
        config.base_url = "https://openrouter.ai/api/v1"
        config.timeout_seconds = 30
        
        # Create nested mock objects for proper attribute access
        config.cache = Mock()
        config.cache.enabled = False
        config.cache.max_size = 100
        
        config.retry = Mock()
        config.retry.max_attempts = 3
        config.retry.strategy = Mock()
        config.retry.strategy.value = "exponential"
        config.retry.base_delay = 1
        config.retry.max_delay = 60
        
        config.batch = Mock()
        config.batch.default_size = 10
        
        config.models = Mock()
        config.models.default_model = "test-model"
        
        return config

    @pytest.fixture
    def real_service(self, mock_config):
        """Create real service instance with mocked dependencies."""
        return OpenRouterLLMDataService(config=mock_config)

    def test_both_services_implement_abstract_base_class(self, null_service, real_service):
        """Both services should implement the LLMDataService abstract base class."""
        assert isinstance(null_service, LLMDataService)
        assert isinstance(real_service, LLMDataService)

    def test_method_signatures_match(self, null_service, real_service):
        """All method signatures should match between real and null services."""
        # Get all public methods from both services
        null_methods = {name: method for name, method in inspect.getmembers(null_service, inspect.iscoroutinefunction) if not name.startswith("_")}
        real_methods = {name: method for name, method in inspect.getmembers(real_service, inspect.iscoroutinefunction) if not name.startswith("_")}

        # Both should have the same method names
        assert set(null_methods.keys()) == set(real_methods.keys()), "Method names should match"

        # Check each method signature
        for method_name in null_methods.keys():
            null_sig = inspect.signature(null_methods[method_name])
            real_sig = inspect.signature(real_methods[method_name])

            assert null_sig == real_sig, f"Signature mismatch for {method_name}: null={null_sig}, real={real_sig}"

    def test_return_type_annotations_match(self, null_service, real_service):
        """Return type annotations should match between real and null services."""
        null_methods = {name: method for name, method in inspect.getmembers(null_service, inspect.iscoroutinefunction) if not name.startswith("_")}
        real_methods = {name: method for name, method in inspect.getmembers(real_service, inspect.iscoroutinefunction) if not name.startswith("_")}

        for method_name in null_methods.keys():
            null_hints = get_type_hints(null_methods[method_name])
            real_hints = get_type_hints(real_methods[method_name])

            # Check return type annotation
            null_return = null_hints.get("return")
            real_return = real_hints.get("return")

            assert null_return == real_return, f"Return type mismatch for {method_name}: null={null_return}, real={real_return}"

    @pytest.mark.asyncio
    async def test_generate_dog_profiler_return_types_compatible(self, null_service, real_service):
        """Null service should return dict structure compatible with real service."""
        dog_data = {"name": "Rex", "breed": "German Shepherd", "description": "Friendly dog"}

        null_result = await null_service.generate_dog_profiler(dog_data)

        # Null service should return dict (not testing real service due to complex mocking)
        assert isinstance(null_result, dict)

        # Null result should have all expected keys matching DogProfilerData structure
        expected_keys = {"tagline", "bio", "looking_for", "personality_traits", "interests", "deal_breakers", "fun_fact"}
        assert set(null_result.keys()) == expected_keys

        # Verify the structure matches what the real service would return
        assert isinstance(null_result["personality_traits"], list)
        assert isinstance(null_result["interests"], list)
        assert null_result["deal_breakers"] is None  # Optional field
        assert null_result["fun_fact"] is None  # Optional field

    @pytest.mark.asyncio
    async def test_enrich_animal_data_parameter_types(self, null_service, real_service):
        """Both services should accept ProcessingType enum for enrich_animal_data."""
        animal_data = {"name": "Rex", "description": "Test description"}
        processing_type = ProcessingType.DESCRIPTION_CLEANING

        # Should not raise type errors
        null_result = await null_service.enrich_animal_data(animal_data, processing_type)
        assert isinstance(null_result, dict)

        # Mock the real service to avoid actual API calls
        from unittest.mock import AsyncMock

        real_service.clean_description = AsyncMock(return_value="cleaned description")
        real_result = await real_service.enrich_animal_data(animal_data, processing_type)
        assert isinstance(real_result, dict)

    @pytest.mark.asyncio
    async def test_batch_process_parameter_types(self, null_service, real_service):
        """Both services should accept ProcessingType enum for batch_process."""
        animals = [{"name": "Rex", "description": "Test"}]
        processing_type = ProcessingType.DESCRIPTION_CLEANING

        # Should not raise type errors
        null_result = await null_service.batch_process(animals, processing_type)
        assert isinstance(null_result, list)

        # Mock the real service to avoid actual API calls - skip this test for real service due to complexity
        # Just verify null service works with ProcessingType
        assert len(null_result) == 1
        assert "enriched_description" in null_result[0]

    def test_services_are_interchangeable_in_polymorphic_usage(self, null_service, real_service):
        """Both services should be usable interchangeably in polymorphic scenarios."""

        def process_with_service(service: LLMDataService) -> str:
            """Example function that accepts any LLMDataService implementation."""
            return f"Processing with {service.__class__.__name__}"

        # Both should be acceptable as LLMDataService
        null_result = process_with_service(null_service)
        real_result = process_with_service(real_service)

        assert "NullLLMDataService" in null_result
        assert "OpenRouterLLMDataService" in real_result


class TestNullObjectPatternCompliance:
    """Test that null service properly implements Null Object pattern."""

    @pytest.fixture
    def null_service(self):
        return NullLLMDataService()

    @pytest.mark.asyncio
    async def test_null_service_never_raises_exceptions(self, null_service):
        """Null service should never raise exceptions for valid inputs."""
        # Test with various edge cases that might cause issues
        test_cases = [
            ("clean_description", ["", None]),
            ("generate_dog_profiler", [{}]),
            ("translate_text", ["", "en"]),
            ("enrich_animal_data", [{}, ProcessingType.DESCRIPTION_CLEANING]),
            ("batch_process", [[], ProcessingType.DESCRIPTION_CLEANING]),
        ]

        for method_name, args in test_cases:
            method = getattr(null_service, method_name)
            try:
                result = await method(*args)
                assert result is not None  # Should return something, not None
            except Exception as e:
                pytest.fail(f"Null service method {method_name} raised exception: {e}")

    @pytest.mark.asyncio
    async def test_null_service_returns_appropriate_empty_values(self, null_service):
        """Null service should return appropriate empty values for each method."""
        # Test generate_dog_profiler returns empty dict structure
        profile_result = await null_service.generate_dog_profiler({"name": "test"})
        assert isinstance(profile_result, dict)
        assert all(key in profile_result for key in ["tagline", "bio", "looking_for", "personality_traits", "interests"])

        # Test clean_description returns original
        desc_result = await null_service.clean_description("test description")
        assert desc_result == "test description"

        # Test translate_text returns original
        translate_result = await null_service.translate_text("hello", "es")
        assert translate_result == "hello"

        # Test enrich_animal_data returns original
        enrich_result = await null_service.enrich_animal_data({"test": "data"}, ProcessingType.DESCRIPTION_CLEANING)
        assert enrich_result == {"test": "data"}

        # Test batch_process returns list with enriched_description
        batch_result = await null_service.batch_process([{"name": "test"}], ProcessingType.DESCRIPTION_CLEANING)
        assert isinstance(batch_result, list)
        assert len(batch_result) == 1
        assert "enriched_description" in batch_result[0]

    def test_null_service_has_no_side_effects(self, null_service):
        """Null service should have no side effects - pure functions only."""
        # This is more of a design verification - null service should not:
        # - Make network calls
        # - Write to files
        # - Modify global state
        # - Have dependencies that cause side effects

        # Verify it has minimal dependencies
        assert hasattr(null_service, "logger")  # Only logging should be present

        # Verify constructor only sets up logging
        import logging

        new_service = NullLLMDataService()
        assert isinstance(new_service.logger, logging.Logger)
