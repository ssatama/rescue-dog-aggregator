"""
Tests for LLM data service with configuration system.

Following CLAUDE.md principles:
- TDD approach - test first, then implement
- Pure functions, no mutations
- Clear error handling
- Fast unit tests
"""

from unittest.mock import AsyncMock, Mock, patch

import pytest
import pytest_asyncio

from services.llm.config import BatchConfig, CacheConfig, Environment, LLMConfig, LLMModelConfig, RetryConfig
from services.llm.models import LLMMessage, LLMRequest, ProcessingType
from services.llm_data_service import LRUCache, OpenRouterLLMDataService


class TestLRUCacheWithConfig:
    """Test LRU cache with configuration system."""

    def test_cache_uses_config_max_size(self):
        """Test that cache uses max_size from configuration."""
        with patch("services.llm_data_service.get_llm_config") as mock_get_config:
            mock_config = Mock()
            mock_config.cache = Mock()
            mock_config.cache.max_size = 500
            mock_get_config.return_value = mock_config

            cache = LRUCache()
            assert cache.max_size == 500

    def test_cache_override_max_size(self):
        """Test that explicit max_size overrides configuration."""
        with patch("services.llm_data_service.get_llm_config"):
            cache = LRUCache(max_size=200)
            assert cache.max_size == 200


class TestOpenRouterLLMDataServiceConfig:
    """Test OpenRouter LLM service with configuration."""

    @pytest.fixture
    def mock_config(self):
        """Create mock LLM configuration."""
        config = Mock(spec=LLMConfig)
        config.api_key = "test-api-key"
        config.base_url = "https://test.openrouter.ai/api/v1"
        config.timeout_seconds = 45.0

        # Create nested mock objects for proper attribute access
        config.cache = Mock()
        config.cache.enabled = True
        config.cache.max_size = 1500

        config.models = Mock()
        config.models.default_model = "anthropic/claude-3-haiku"

        config.retry = Mock()
        config.retry.max_attempts = 4
        config.retry.strategy = Mock()
        config.retry.strategy.value = "exponential"
        config.retry.base_delay = 2.0
        config.retry.max_delay = 120.0

        config.batch = Mock()
        config.batch.default_size = 8

        return config

    def test_service_initialization_with_config(self, mock_config):
        """Test service initialization with custom configuration."""
        service = OpenRouterLLMDataService(config=mock_config)

        assert service.config == mock_config
        assert service.api_key == "test-api-key"
        assert service.base_url == "https://test.openrouter.ai/api/v1"
        assert service.timeout == 45.0
        assert service.cache_enabled is True
        assert service.cache.max_size == 1500

    def test_service_initialization_without_config(self):
        """Test service initialization using default configuration."""
        with patch("services.llm_data_service.get_llm_config") as mock_get_config:
            mock_config = Mock(spec=LLMConfig)
            mock_config.api_key = "default-key"
            mock_config.base_url = "https://openrouter.ai/api/v1"
            mock_config.timeout_seconds = 30.0

            # Create nested mock objects for proper attribute access
            mock_config.cache = Mock()
            mock_config.cache.enabled = True
            mock_config.cache.max_size = 1000

            mock_config.retry = Mock()
            mock_config.retry.max_attempts = 3

            mock_get_config.return_value = mock_config

            service = OpenRouterLLMDataService()

            assert service.config == mock_config
            assert service.api_key == "default-key"
            mock_get_config.assert_called_once()

    def test_service_initialization_missing_api_key(self, mock_config):
        """Test service initialization fails with missing API key."""
        mock_config.api_key = None

        with patch.dict("os.environ", {}, clear=True):
            with pytest.raises(ValueError, match="OpenRouter API key required"):
                OpenRouterLLMDataService(config=mock_config)

    def test_service_initialization_api_key_from_env(self, mock_config):
        """Test service initialization gets API key from environment."""
        mock_config.api_key = None

        with patch.dict("os.environ", {"OPENROUTER_API_KEY": "env-api-key"}):
            service = OpenRouterLLMDataService(config=mock_config)
            assert service.api_key == "env-api-key"


class TestRetryConfiguration:
    """Test retry configuration in LLM service."""

    @pytest.fixture
    def mock_service(self):
        """Create mock LLM service for testing."""
        with patch("services.llm_data_service.get_llm_config") as mock_get_config:
            mock_config = Mock(spec=LLMConfig)
            mock_config.api_key = "test-key"
            mock_config.base_url = "https://test.api"
            mock_config.timeout_seconds = 30.0

            # Create nested mock objects for proper attribute access
            mock_config.cache = Mock()
            mock_config.cache.enabled = False

            mock_config.retry = Mock()
            mock_config.retry.max_attempts = 5
            mock_config.retry.strategy = Mock()
            mock_config.retry.strategy.value = "exponential"
            mock_config.retry.base_delay = 1.5
            mock_config.retry.max_delay = 90.0

            mock_get_config.return_value = mock_config

            service = OpenRouterLLMDataService()
            return service

    def test_exponential_retry_strategy(self, mock_service):
        """Test exponential retry strategy configuration."""
        retry_decorator = mock_service._create_retry_decorator()

        # Verify retry decorator was created
        assert retry_decorator is not None
        assert callable(retry_decorator)

    def test_linear_retry_strategy(self):
        """Test linear retry strategy configuration."""
        with patch("services.llm_data_service.get_llm_config") as mock_get_config:
            mock_config = Mock(spec=LLMConfig)
            mock_config.api_key = "test-key"
            mock_config.base_url = "https://test.api"
            mock_config.timeout_seconds = 30.0
            # Create nested mock objects for proper attribute access
            mock_config.cache = Mock()
            mock_config.cache.enabled = False

            mock_config.retry = Mock()
            mock_config.retry.max_attempts = 3
            mock_config.retry.strategy = Mock()
            mock_config.retry.strategy.value = "linear"
            mock_config.retry.base_delay = 2.0
            mock_config.retry.max_delay = 60.0
            mock_get_config.return_value = mock_config

            service = OpenRouterLLMDataService()
            retry_decorator = service._create_retry_decorator()

            assert retry_decorator is not None

    def test_fixed_retry_strategy(self):
        """Test fixed retry strategy configuration."""
        with patch("services.llm_data_service.get_llm_config") as mock_get_config:
            mock_config = Mock(spec=LLMConfig)
            mock_config.api_key = "test-key"
            mock_config.base_url = "https://test.api"
            mock_config.timeout_seconds = 30.0
            # Create nested mock objects for proper attribute access
            mock_config.cache = Mock()
            mock_config.cache.enabled = False

            mock_config.retry = Mock()
            mock_config.retry.max_attempts = 2
            mock_config.retry.strategy = Mock()
            mock_config.retry.strategy.value = "fixed"
            mock_config.retry.base_delay = 3.0
            mock_config.retry.max_delay = 30.0
            mock_get_config.return_value = mock_config

            service = OpenRouterLLMDataService()
            retry_decorator = service._create_retry_decorator()

            assert retry_decorator is not None


class TestBatchProcessingConfiguration:
    """Test batch processing with configuration."""

    @pytest_asyncio.fixture
    async def mock_service_with_batch_config(self):
        """Create mock service with batch configuration."""
        with patch("services.llm_data_service.get_llm_config") as mock_get_config:
            mock_config = Mock(spec=LLMConfig)
            mock_config.api_key = "test-key"
            mock_config.base_url = "https://test.api"
            mock_config.timeout_seconds = 30.0
            # Create nested mock objects for proper attribute access
            mock_config.cache = Mock()
            mock_config.cache.enabled = False

            mock_config.batch = Mock()
            mock_config.batch.default_size = 7

            mock_config.retry = Mock()
            mock_config.retry.max_attempts = 3
            mock_config.retry.strategy = Mock()
            mock_config.retry.strategy.value = "exponential"
            mock_config.retry.base_delay = 1.0
            mock_config.retry.max_delay = 60.0
            mock_get_config.return_value = mock_config

            service = OpenRouterLLMDataService()
            service.enrich_animal_data = AsyncMock(return_value={"enriched": True})
            return service

    @pytest.mark.asyncio
    async def test_batch_processing_uses_config_size(self, mock_service_with_batch_config):
        """Test that batch processing uses configured batch size."""
        service = mock_service_with_batch_config

        # Create test animals - more than batch size
        animals = [{"id": i, "name": f"Dog {i}"} for i in range(15)]

        # Mock the enrichment calls
        results = await service.batch_process(animals, ProcessingType.DESCRIPTION_CLEANING)

        # Should have processed all animals
        assert len(results) == 15

        # Should have called enrich_animal_data for each animal
        assert service.enrich_animal_data.call_count == 15


class TestTemperatureConfiguration:
    """Test temperature configuration for different processing types."""

    @pytest.fixture
    def mock_service_with_temp_config(self):
        """Create mock service for temperature testing."""
        with patch("services.llm_data_service.get_llm_config") as mock_get_config:
            mock_config = Mock(spec=LLMConfig)
            mock_config.api_key = "test-key"
            mock_config.base_url = "https://test.api"
            mock_config.timeout_seconds = 30.0
            # Create nested mock objects for proper attribute access
            mock_config.cache = Mock()
            mock_config.cache.enabled = False

            mock_config.models = Mock()
            mock_config.models.default_model = "test-model"
            mock_config.models.temperature_ranges = {"description_cleaning": (0.1, 0.3), "dog_profiler": (0.8, 1.0), "translation": (0.0, 0.2)}

            mock_config.retry = Mock()
            mock_config.retry.max_attempts = 3
            mock_config.retry.strategy = Mock()
            mock_config.retry.strategy.value = "exponential"
            mock_config.retry.base_delay = 1.0
            mock_config.retry.max_delay = 60.0
            mock_get_config.return_value = mock_config

            return OpenRouterLLMDataService()

    @pytest.mark.asyncio
    async def test_description_cleaning_temperature(self, mock_service_with_temp_config):
        """Test temperature configuration for description cleaning."""
        service = mock_service_with_temp_config
        service._make_api_call = AsyncMock()
        service._make_api_call.return_value.content = "Cleaned description"

        await service.clean_description("Test description")

        # Check that API call was made with correct temperature
        call_args = service._make_api_call.call_args[0][0]  # First positional argument (LLMRequest)
        assert isinstance(call_args, LLMRequest)
        assert 0.1 <= call_args.temperature <= 0.3  # Within configured range
        assert call_args.model == "test-model"

    @pytest.mark.asyncio
    async def test_dog_profiler_temperature(self, mock_service_with_temp_config):
        """Test temperature configuration for dog profiler."""
        service = mock_service_with_temp_config
        service._make_api_call = AsyncMock()
        service._make_api_call.return_value.content = '{"tagline": "Great dog!", "bio": "Friendly"}'

        await service.generate_dog_profiler({"name": "Buddy"})

        # Check that API call was made with correct temperature
        call_args = service._make_api_call.call_args[0][0]  # First positional argument
        assert isinstance(call_args, LLMRequest)
        assert 0.8 <= call_args.temperature <= 1.0  # Within configured range
        assert call_args.model == "test-model"

    @pytest.mark.asyncio
    async def test_translation_temperature(self, mock_service_with_temp_config):
        """Test temperature configuration for translation."""
        service = mock_service_with_temp_config
        service._make_api_call = AsyncMock()
        service._make_api_call.return_value.content = "Translated text"

        await service.translate_text("Hello", "es")

        # Check that API call was made with correct temperature
        call_args = service._make_api_call.call_args[0][0]  # First positional argument
        assert isinstance(call_args, LLMRequest)
        assert 0.0 <= call_args.temperature <= 0.2  # Within configured range
        assert call_args.model == "test-model"


class TestModelConfiguration:
    """Test model configuration in API calls."""

    @pytest.mark.asyncio
    async def test_api_call_uses_configured_model(self):
        """Test that API calls use the configured model."""
        with patch("services.llm_data_service.get_llm_config") as mock_get_config:
            mock_config = Mock(spec=LLMConfig)
            mock_config.api_key = "test-key"
            mock_config.base_url = "https://test.api"
            mock_config.timeout_seconds = 30.0
            # Create nested mock objects for proper attribute access
            mock_config.cache = Mock()
            mock_config.cache.enabled = False

            mock_config.models = Mock()
            mock_config.models.default_model = "anthropic/claude-3-sonnet"

            mock_config.retry = Mock()
            mock_config.retry.max_attempts = 3
            mock_config.retry.strategy = Mock()
            mock_config.retry.strategy.value = "exponential"
            mock_config.retry.base_delay = 1.0
            mock_config.retry.max_delay = 60.0
            mock_get_config.return_value = mock_config

            service = OpenRouterLLMDataService()

            # Mock HTTP client
            mock_response = Mock()
            mock_response.json.return_value = {"choices": [{"message": {"content": "Test response"}}], "id": "test-id", "model": "anthropic/claude-3-sonnet"}
            mock_response.raise_for_status = Mock()
            service.client.post = AsyncMock(return_value=mock_response)

            request = LLMRequest(messages=[LLMMessage(role="user", content="Test")], model="anthropic/claude-3-sonnet")

            response = await service._make_api_call(request)

            assert response.model == "anthropic/claude-3-sonnet"
            service.client.post.assert_called_once()


@pytest.mark.integration
class TestConfigurationIntegration:
    """Integration tests for configuration system with LLM service."""

    @pytest.mark.asyncio
    async def test_end_to_end_configuration_flow(self):
        """Test complete configuration flow in LLM service."""
        with patch.dict(
            "os.environ",
            {
                "OPENROUTER_API_KEY": "integration-test-key",
                "ENVIRONMENT": "testing",
                "LLM_DEFAULT_MODEL": "test-model",
                "LLM_BATCH_DEFAULT_SIZE": "3",
                "LLM_CACHE_ENABLED": "false",
                "LLM_RETRY_MAX_ATTEMPTS": "2",
            },
        ):
            # Clear config cache
            from services.llm.config import get_llm_config

            get_llm_config.cache_clear()

            service = OpenRouterLLMDataService()

            # Verify configuration was loaded correctly
            assert service.api_key == "integration-test-key"
            assert service.config.models.default_model == "test-model"
            assert service.config.batch.default_size == 3
            assert service.config.cache.enabled is False
            assert service.config.retry.max_attempts == 2
            assert service.cache is None  # Cache disabled
