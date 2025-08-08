"""
Tests for LLM configuration management system.

Following CLAUDE.md principles:
- TDD approach - test first, then implement
- Pure functions, no mutations
- Clear error handling
- Fast unit tests
"""

import os
from unittest.mock import patch

import pytest

from services.llm.config import BatchConfig, CacheConfig, Environment, LLMConfig, LLMConfigLoader, LLMModelConfig, RetryConfig, RetryStrategy, get_llm_config, get_model_temperature, validate_config


class TestLLMModelConfig:
    """Test LLM model configuration."""

    def test_default_model_config(self):
        """Test default model configuration values."""
        config = LLMModelConfig()

        assert config.default_model == "openrouter/auto"
        assert "description_cleaning" in config.temperature_ranges
        assert "dog_profiler" in config.temperature_ranges
        assert "translation" in config.temperature_ranges
        assert config.max_tokens is None

    def test_custom_model_config(self):
        """Test custom model configuration."""
        config = LLMModelConfig(default_model="anthropic/claude-3-haiku", max_tokens=4000)

        assert config.default_model == "anthropic/claude-3-haiku"
        assert config.max_tokens == 4000


class TestCacheConfig:
    """Test cache configuration validation."""

    def test_default_cache_config(self):
        """Test default cache configuration values."""
        config = CacheConfig()

        assert config.enabled is True
        assert config.max_size == 1000
        assert config.ttl_seconds == 3600

    def test_valid_cache_config(self):
        """Test valid cache configuration."""
        config = CacheConfig(enabled=True, max_size=2000, ttl_seconds=7200)

        assert config.enabled is True
        assert config.max_size == 2000
        assert config.ttl_seconds == 7200

    def test_invalid_cache_size(self):
        """Test validation of cache size limits."""
        with pytest.raises(ValueError, match="Cache size cannot exceed 10,000 entries"):
            CacheConfig(max_size=15000)

    def test_cache_size_bounds(self):
        """Test cache size validation bounds."""
        # Should work at boundary
        config = CacheConfig(max_size=10000)
        assert config.max_size == 10000

        # Should fail below minimum
        with pytest.raises(ValueError):
            CacheConfig(max_size=0)


class TestRetryConfig:
    """Test retry configuration validation."""

    def test_default_retry_config(self):
        """Test default retry configuration values."""
        config = RetryConfig()

        assert config.max_attempts == 3
        assert config.strategy == RetryStrategy.EXPONENTIAL
        assert config.base_delay == 1.0
        assert config.max_delay == 60.0

    def test_valid_retry_config(self):
        """Test valid retry configuration."""
        config = RetryConfig(max_attempts=5, strategy=RetryStrategy.LINEAR, base_delay=2.0, max_delay=120.0)

        assert config.max_attempts == 5
        assert config.strategy == RetryStrategy.LINEAR
        assert config.base_delay == 2.0
        assert config.max_delay == 120.0

    def test_retry_delay_validation(self):
        """Test validation of retry delay constraints."""
        with pytest.raises(ValueError, match="max_delay must be >= base_delay"):
            RetryConfig(base_delay=10.0, max_delay=5.0)

    def test_retry_attempts_bounds(self):
        """Test retry attempts validation bounds."""
        # Should work at boundaries
        config_min = RetryConfig(max_attempts=1)
        assert config_min.max_attempts == 1

        config_max = RetryConfig(max_attempts=10)
        assert config_max.max_attempts == 10

        # Should fail outside bounds
        with pytest.raises(ValueError):
            RetryConfig(max_attempts=0)

        with pytest.raises(ValueError):
            RetryConfig(max_attempts=11)


class TestBatchConfig:
    """Test batch configuration validation."""

    def test_default_batch_config(self):
        """Test default batch configuration values."""
        config = BatchConfig()

        assert config.default_size == 5
        assert config.max_size == 25
        assert config.concurrent_requests == 10

    def test_valid_batch_config(self):
        """Test valid batch configuration."""
        config = BatchConfig(default_size=8, max_size=30, concurrent_requests=15)

        assert config.default_size == 8
        assert config.max_size == 30
        assert config.concurrent_requests == 15

    def test_batch_size_validation(self):
        """Test validation of batch size constraints."""
        with pytest.raises(ValueError, match="max_size must be >= default_size"):
            BatchConfig(default_size=10, max_size=5)


class TestLLMConfigLoader:
    """Test LLM configuration loading from environment."""

    def test_get_environment_default(self):
        """Test environment detection with default value."""
        with patch.dict(os.environ, {}, clear=True):
            env = LLMConfigLoader._get_environment()
            assert env == Environment.DEVELOPMENT

    def test_get_environment_from_env(self):
        """Test environment detection from environment variable."""
        with patch.dict(os.environ, {"ENVIRONMENT": "production"}):
            env = LLMConfigLoader._get_environment()
            assert env == Environment.PRODUCTION

    def test_load_model_config_defaults(self):
        """Test loading model config with defaults."""
        with patch.dict(os.environ, {}, clear=True):
            config = LLMConfigLoader._load_model_config()

            assert config.default_model == "openrouter/auto"
            assert config.max_tokens is None

    def test_load_model_config_from_env(self):
        """Test loading model config from environment."""
        with patch.dict(os.environ, {"LLM_DEFAULT_MODEL": "anthropic/claude-3-haiku", "LLM_MAX_TOKENS": "4000"}):
            config = LLMConfigLoader._load_model_config()

            assert config.default_model == "anthropic/claude-3-haiku"
            assert config.max_tokens == 4000

    def test_load_cache_config_development(self):
        """Test loading cache config for development environment."""
        config = LLMConfigLoader._load_cache_config(Environment.DEVELOPMENT)

        assert config.enabled is True
        assert config.max_size == 500
        assert config.ttl_seconds == 1800

    def test_load_cache_config_production(self):
        """Test loading cache config for production environment."""
        config = LLMConfigLoader._load_cache_config(Environment.PRODUCTION)

        assert config.enabled is True
        assert config.max_size == 2000
        assert config.ttl_seconds == 7200

    def test_load_cache_config_testing(self):
        """Test loading cache config for testing environment."""
        config = LLMConfigLoader._load_cache_config(Environment.TESTING)

        assert config.enabled is False
        assert config.max_size == 100
        assert config.ttl_seconds == 300

    def test_load_cache_config_from_env(self):
        """Test loading cache config from environment variables."""
        with patch.dict(os.environ, {"LLM_CACHE_ENABLED": "false", "LLM_CACHE_MAX_SIZE": "1500", "LLM_CACHE_TTL_SECONDS": "5400"}):
            config = LLMConfigLoader._load_cache_config(Environment.DEVELOPMENT)

            assert config.enabled is False
            assert config.max_size == 1500
            assert config.ttl_seconds == 5400

    def test_load_retry_config_production(self):
        """Test loading retry config for production environment."""
        config = LLMConfigLoader._load_retry_config(Environment.PRODUCTION)

        assert config.max_attempts == 5
        assert config.strategy == RetryStrategy.EXPONENTIAL

    def test_load_retry_config_development(self):
        """Test loading retry config for development environment."""
        config = LLMConfigLoader._load_retry_config(Environment.DEVELOPMENT)

        assert config.max_attempts == 3

    def test_load_batch_config_environments(self):
        """Test loading batch config for different environments."""
        dev_config = LLMConfigLoader._load_batch_config(Environment.DEVELOPMENT)
        assert dev_config.default_size == 3
        assert dev_config.max_size == 10
        assert dev_config.concurrent_requests == 5

        prod_config = LLMConfigLoader._load_batch_config(Environment.PRODUCTION)
        assert prod_config.default_size == 10
        assert prod_config.max_size == 25
        assert prod_config.concurrent_requests == 15

    def test_load_features_defaults(self):
        """Test loading feature flags with defaults."""
        with patch.dict(os.environ, {}, clear=True):
            features = LLMConfigLoader._load_features(Environment.DEVELOPMENT)

            assert features["description_cleaning_enabled"] is True
            assert features["dog_profiler_enabled"] is True
            assert features["translation_enabled"] is True
            assert features["metrics_collection_enabled"] is True

    def test_load_features_from_env(self):
        """Test loading feature flags from environment."""
        with patch.dict(os.environ, {"LLM_FEATURE_DESCRIPTION_CLEANING": "false", "LLM_FEATURE_DOG_PROFILER": "false"}):
            features = LLMConfigLoader._load_features(Environment.DEVELOPMENT)

            assert features["description_cleaning_enabled"] is False
            assert features["dog_profiler_enabled"] is False
            assert features["translation_enabled"] is True  # Default

    @patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key"})
    def test_load_complete_config(self):
        """Test loading complete LLM configuration."""
        config = LLMConfigLoader.load_config()

        assert isinstance(config, LLMConfig)
        assert config.api_key == "test-key"
        assert config.base_url == "https://openrouter.ai/api/v1"
        assert config.timeout_seconds == 30.0
        assert isinstance(config.models, LLMModelConfig)
        assert isinstance(config.cache, CacheConfig)
        assert isinstance(config.retry, RetryConfig)
        assert isinstance(config.batch, BatchConfig)


class TestLLMConfig:
    """Test complete LLM configuration."""

    @patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key"})
    def test_complete_config_creation(self):
        """Test creation of complete LLM configuration."""
        config = LLMConfig(api_key="test-key", environment=Environment.DEVELOPMENT)

        assert config.api_key == "test-key"
        assert config.environment == Environment.DEVELOPMENT
        assert isinstance(config.models, LLMModelConfig)
        assert isinstance(config.cache, CacheConfig)
        assert isinstance(config.retry, RetryConfig)
        assert isinstance(config.batch, BatchConfig)
        assert isinstance(config.features, dict)


class TestHelperFunctions:
    """Test helper functions."""

    def test_get_model_temperature(self):
        """Test getting model temperature for different processing types."""
        model_config = LLMModelConfig()

        # Test description cleaning (low temperature)
        temp = get_model_temperature("description_cleaning", model_config)
        assert 0.2 <= temp <= 0.4

        # Test dog profiler (high temperature)
        temp = get_model_temperature("dog_profiler", model_config)
        assert 0.7 <= temp <= 0.9

        # Test translation (low temperature)
        temp = get_model_temperature("translation", model_config)
        assert 0.1 <= temp <= 0.3

        # Test unknown type (default range)
        temp = get_model_temperature("unknown_type", model_config)
        assert 0.3 <= temp <= 0.7

    @patch("services.llm.config.get_llm_config")
    def test_validate_config_success(self, mock_get_config):
        """Test successful configuration validation."""
        mock_config = LLMConfig(api_key="test-key")
        mock_get_config.return_value = mock_config

        assert validate_config() is True
        mock_get_config.assert_called_once()

    @patch("services.llm.config.get_llm_config")
    def test_validate_config_failure(self, mock_get_config):
        """Test failed configuration validation."""
        mock_get_config.side_effect = ValueError("Invalid config")

        assert validate_config() is False

    @patch("services.llm.config.get_llm_config")
    def test_validate_config_no_api_key(self, mock_get_config):
        """Test configuration validation with missing API key."""
        mock_config = LLMConfig(api_key=None)
        mock_get_config.return_value = mock_config

        assert validate_config() is False


class TestCachedConfig:
    """Test cached configuration loading."""

    @patch.dict(os.environ, {"OPENROUTER_API_KEY": "test-key"})
    def test_get_llm_config_caching(self):
        """Test that configuration is properly cached."""
        # Clear the cache first
        get_llm_config.cache_clear()

        # First call should create config
        config1 = get_llm_config()
        assert isinstance(config1, LLMConfig)

        # Second call should return cached instance
        config2 = get_llm_config()
        assert config1 is config2  # Same object instance


@pytest.mark.integration
class TestConfigIntegration:
    """Integration tests for configuration system."""

    @patch.dict(
        os.environ,
        {
            "ENVIRONMENT": "production",
            "OPENROUTER_API_KEY": "prod-key",
            "LLM_DEFAULT_MODEL": "anthropic/claude-3-sonnet",
            "LLM_BATCH_DEFAULT_SIZE": "15",
            "LLM_CACHE_MAX_SIZE": "3000",
            "LLM_RETRY_MAX_ATTEMPTS": "7",
        },
    )
    def test_full_production_config(self):
        """Test full production configuration loading."""
        # Clear cache to ensure fresh load
        get_llm_config.cache_clear()

        config = get_llm_config()

        # Test environment-specific settings
        assert config.environment == Environment.PRODUCTION
        assert config.api_key == "prod-key"
        assert config.models.default_model == "anthropic/claude-3-sonnet"

        # Test environment overrides
        assert config.batch.default_size == 15
        assert config.cache.max_size == 3000
        assert config.retry.max_attempts == 7

        # Test production defaults
        assert config.cache.enabled is True
        assert config.batch.max_size == 25  # Production default
        assert config.batch.concurrent_requests == 15  # Production default

    @patch.dict(os.environ, {"ENVIRONMENT": "testing", "OPENROUTER_API_KEY": "test-key"})
    def test_testing_environment_config(self):
        """Test testing environment configuration."""
        # Clear cache to ensure fresh load
        get_llm_config.cache_clear()

        config = get_llm_config()

        # Test testing-specific settings
        assert config.environment == Environment.TESTING
        assert config.cache.enabled is False  # Disabled in testing
        assert config.batch.default_size == 2  # Small batches for testing
        assert config.cache.max_size == 100  # Small cache for testing
        assert config.retry.max_attempts == 3  # Standard retry for testing
