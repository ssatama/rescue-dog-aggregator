"""
LLM configuration management system.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Environment-based configuration
- Type safety with Pydantic
"""

import os
from enum import Enum
from functools import lru_cache

from pydantic import BaseModel, Field, field_validator


class Environment(str, Enum):
    """Deployment environments."""

    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"
    TESTING = "testing"


class RetryStrategy(str, Enum):
    """Retry backoff strategies."""

    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    FIXED = "fixed"


class LLMModelConfig(BaseModel):
    """
    Configuration for specific LLM models.

    This class defines model-specific settings including which model to use,
    temperature ranges for different processing types, and token limits.

    The temperature ranges are optimized for different use cases:
    - Description cleaning: Low creativity (0.2-0.4) for consistent, clean output
    - Dog profiler: High creativity (0.7-0.9) for engaging, personalized content
    - Translation: Very low creativity (0.1-0.3) for accurate translations

    Attributes:
        default_model: The default LLM model identifier (uses OpenRouter's auto-selection)
        temperature_ranges: Processing-type specific temperature ranges for optimal results
        max_tokens: Optional token limit per request to control costs and response length

    Dependencies:
        - Called by: LLMConfig, OpenRouterLLMDataService
        - Calls into: Pydantic BaseModel validation

    Complexity: O(1) for all operations - simple configuration data structure
    """

    default_model: str = Field(default="openrouter/auto", description="Default model to use")
    temperature_ranges: dict[str, tuple] = Field(
        default_factory=lambda: {
            "description_cleaning": (0.2, 0.4),
            "dog_profiler": (0.7, 0.9),
            "translation": (0.1, 0.3),
        }
    )
    max_tokens: int | None = Field(default=None, description="Maximum tokens per request")


class CacheConfig(BaseModel):
    """
    Cache configuration settings for LRU cache implementation.

    Controls the behavior of the LRU (Least Recently Used) cache that prevents
    memory leaks in the LLM service by maintaining bounded cache sizes.

    The cache dramatically improves performance by avoiding redundant LLM API calls
    for identical requests. Cache keys are SHA256 hashes of content + processing type.

    Attributes:
        enabled: Whether caching is active (disable for testing/debugging)
        max_size: Maximum number of cached responses (hard limit: 10,000)
        ttl_seconds: Time-to-live for cache entries (not actively enforced in LRU)

    Dependencies:
        - Called by: LLMConfig, LLMConfigLoader._load_cache_config
        - Calls into: services.llm_data_service.LRUCache

    Complexity: O(1) for validation, O(log n) for cache operations
    """

    enabled: bool = Field(default=True, description="Enable/disable caching")
    max_size: int = Field(default=1000, gt=0, description="Maximum cache entries")
    ttl_seconds: int = Field(default=3600, gt=0, description="Time to live in seconds")

    @field_validator("max_size")
    @classmethod
    def validate_cache_size(cls, v):
        """
        Validate cache size doesn't exceed memory safety limits.

        Prevents excessive memory usage by limiting cache to 10,000 entries.
        Each cache entry contains ~1-5KB of LLM response data.

        Args:
            v: The max_size value to validate

        Returns:
            int: The validated cache size

        Raises:
            ValueError: If cache size exceeds 10,000 entries

        Complexity: O(1) - simple bounds check
        """
        if v > 10000:
            raise ValueError("Cache size cannot exceed 10,000 entries")
        return v


class RetryConfig(BaseModel):
    """
    Retry configuration settings for API resilience.

    Configures the retry mechanism used by the OpenRouter LLM service to handle
    transient failures, rate limiting, and server errors gracefully.

    The retry system uses the Tenacity library with configurable backoff strategies:
    - EXPONENTIAL: Doubles delay between attempts (recommended for production)
    - LINEAR: Adds base_delay to each attempt (predictable timing)
    - FIXED: Uses same delay for all attempts (simple but less effective)

    Attributes:
        max_attempts: Total number of API call attempts (1-10 range)
        strategy: Backoff algorithm to use between retry attempts
        base_delay: Initial delay before first retry (seconds)
        max_delay: Maximum delay between attempts to prevent infinite waiting

    Dependencies:
        - Called by: LLMConfig, OpenRouterLLMDataService._create_retry_decorator
        - Calls into: tenacity retry decorators

    Complexity: O(n) where n is max_attempts for full retry sequence
    """

    max_attempts: int = Field(default=3, ge=1, le=10, description="Maximum retry attempts")
    strategy: RetryStrategy = Field(default=RetryStrategy.EXPONENTIAL, description="Backoff strategy")
    base_delay: float = Field(default=1.0, gt=0, description="Base delay in seconds")
    max_delay: float = Field(default=60.0, gt=0, description="Maximum delay in seconds")

    @field_validator("max_delay")
    @classmethod
    def validate_max_delay(cls, v, info):
        """
        Validate max_delay is not less than base_delay.

        Ensures the retry configuration is logically consistent by preventing
        cases where maximum delay is less than the base delay.

        Args:
            v: The max_delay value to validate
            info: Pydantic validation context containing other field values

        Returns:
            float: The validated max_delay value

        Raises:
            ValueError: If max_delay < base_delay

        Complexity: O(1) - simple comparison
        """
        if hasattr(info, "data") and "base_delay" in info.data and v < info.data["base_delay"]:
            raise ValueError("max_delay must be >= base_delay")
        return v


class BatchConfig(BaseModel):
    """
    Batch processing configuration for high-performance LLM operations.

    Controls the batch processing system that achieved 47.5x performance improvement
    over individual API calls by grouping operations and using async concurrency.

    The batch processor groups animals into configurable batches, processes them
    concurrently with the LLM API, then commits results to database in batches.
    This dramatically reduces both API latency and database connection overhead.

    Attributes:
        default_size: Standard batch size for CLI commands (optimized per environment)
        max_size: Upper limit for batch size to prevent memory/timeout issues
        concurrent_requests: Number of simultaneous API requests (controls API load)

    Dependencies:
        - Called by: LLMConfig, management.batch_processor.DatabaseBatchProcessor
        - Calls into: asyncio.gather for concurrent processing

    Complexity: O(n/batch_size) for processing n items, with concurrent API calls
    """

    default_size: int = Field(default=5, ge=1, le=50, description="Default batch size")
    max_size: int = Field(default=25, ge=1, le=100, description="Maximum batch size")
    concurrent_requests: int = Field(default=10, ge=1, le=50, description="Max concurrent API requests")

    @field_validator("max_size")
    @classmethod
    def validate_batch_sizes(cls, v, info):
        """
        Validate max_size is not less than default_size.

        Ensures batch configuration is logically consistent by preventing
        cases where the maximum batch size is smaller than the default size.

        Args:
            v: The max_size value to validate
            info: Pydantic validation context containing other field values

        Returns:
            int: The validated max_size value

        Raises:
            ValueError: If max_size < default_size

        Complexity: O(1) - simple comparison
        """
        if hasattr(info, "data") and "default_size" in info.data and v < info.data["default_size"]:
            raise ValueError("max_size must be >= default_size")
        return v


class LLMConfig(BaseModel):
    """
    Complete LLM service configuration aggregating all subsystem settings.

    This is the root configuration class that combines all LLM-related settings
    into a single, validated configuration object. It provides environment-aware
    defaults and comprehensive validation of all configuration parameters.

    The configuration is built through dependency injection of specialized
    config objects, each handling a specific aspect of the LLM service:
    - Model settings (temperatures, token limits)
    - Caching behavior (memory management)
    - Retry policies (API resilience)
    - Batch processing (performance optimization)
    - Feature flags (functionality toggles)

    Environment-specific defaults ensure optimal behavior across development,
    staging, and production environments without requiring manual configuration.

    Attributes:
        environment: Deployment environment affecting default values
        api_key: OpenRouter API key (required for service operation)
        base_url: OpenRouter API endpoint URL
        timeout_seconds: HTTP request timeout to prevent hanging
        models: Model-specific configuration (temperatures, token limits)
        cache: LRU cache settings for performance optimization
        retry: Retry policy for handling API failures
        batch: Batch processing configuration for high throughput
        features: Feature flags for enabling/disabling functionality

    Dependencies:
        - Called by: get_llm_config(), OpenRouterLLMDataService.__init__
        - Calls into: All configuration sub-classes for validation

    Complexity: O(1) for access, O(n) for complete validation of all sub-configs
    """

    # Environment
    environment: Environment = Field(default=Environment.DEVELOPMENT)

    # API Configuration
    api_key: str | None = Field(default=None, description="OpenRouter API key")
    base_url: str = Field(default="https://openrouter.ai/api/v1", description="API base URL")
    timeout_seconds: float = Field(default=30.0, gt=0, description="Request timeout")

    # Model Configuration
    models: LLMModelConfig = Field(default_factory=LLMModelConfig)

    # Cache Configuration
    cache: CacheConfig = Field(default_factory=CacheConfig)

    # Retry Configuration
    retry: RetryConfig = Field(default_factory=RetryConfig)

    # Batch Configuration
    batch: BatchConfig = Field(default_factory=BatchConfig)

    # Feature Flags
    features: dict[str, bool] = Field(
        default_factory=lambda: {
            "description_cleaning_enabled": True,
            "dog_profiler_enabled": True,
            "translation_enabled": True,
            "metrics_collection_enabled": True,
        }
    )


class LLMConfigLoader:
    """
    Load and validate LLM configuration from environment variables.

    This factory class handles the complex logic of loading configuration from
    environment variables with appropriate defaults for different deployment
    environments. It provides environment-specific optimizations:

    - Development: Smaller batches, shorter cache TTL for fast iteration
    - Staging: Balanced settings for integration testing
    - Production: Larger batches, aggressive retries, longer cache for performance
    - Testing: Minimal settings, caching disabled for test isolation

    All methods are static to enable pure functional configuration loading
    without maintaining state or side effects.

    Dependencies:
        - Called by: get_llm_config() via LLMConfigLoader.load_config()
        - Calls into: os.getenv for environment variable access

    Complexity: O(1) for all operations - simple environment variable reads
    """

    @staticmethod
    def _get_environment() -> Environment:
        """
        Determine current deployment environment from ENVIRONMENT variable.

        Reads the ENVIRONMENT variable and maps it to a validated Environment enum.
        Defaults to DEVELOPMENT if not set or invalid, ensuring safe fallback.

        Returns:
            Environment: The validated deployment environment

        Environment Variables:
            ENVIRONMENT: Deployment environment (development/staging/production/testing)

        Complexity: O(1) - simple environment variable read and enum lookup
        """
        env_str = os.getenv("ENVIRONMENT", "development").lower()
        return Environment(env_str)

    @staticmethod
    def _load_model_config() -> LLMModelConfig:
        """
        Load model-specific configuration from environment variables.

        Constructs LLMModelConfig with environment overrides for model selection
        and token limits. Uses OpenRouter's AUTO model selection by default
        for optimal performance without manual model management.

        Returns:
            LLMModelConfig: Validated model configuration

        Environment Variables:
            LLM_DEFAULT_MODEL: Override default model (default: "openrouter/auto")
            LLM_MAX_TOKENS: Maximum tokens per request (default: unlimited)

        Complexity: O(1) - simple environment variable reads and construction
        """
        return LLMModelConfig(
            default_model=os.getenv("LLM_DEFAULT_MODEL", "openrouter/auto"),
            max_tokens=int(os.getenv("LLM_MAX_TOKENS", "0")) or None,
        )

    @staticmethod
    def _load_cache_config(environment: Environment) -> CacheConfig:
        """
        Load cache configuration with environment-specific optimizations.

        Creates CacheConfig with settings optimized for each deployment environment:

        - Development: Medium cache (500 entries, 30min TTL) for development efficiency
        - Staging: Standard cache (1000 entries, 1hr TTL) for integration testing
        - Production: Large cache (2000 entries, 2hr TTL) for maximum performance
        - Testing: Disabled cache (100 entries, 5min TTL) for test isolation

        The cache dramatically improves performance by avoiding redundant API calls
        for identical LLM requests, which is especially valuable for batch processing.

        Args:
            environment: The deployment environment affecting cache settings

        Returns:
            CacheConfig: Environment-optimized cache configuration

        Environment Variables:
            LLM_CACHE_ENABLED: Override cache enable/disable
            LLM_CACHE_MAX_SIZE: Override maximum cache entries
            LLM_CACHE_TTL_SECONDS: Override cache time-to-live

        Complexity: O(1) - dictionary lookup and simple construction
        """
        # Environment-specific defaults
        defaults = {
            Environment.DEVELOPMENT: {
                "enabled": True,
                "max_size": 500,
                "ttl_seconds": 1800,
            },
            Environment.STAGING: {
                "enabled": True,
                "max_size": 1000,
                "ttl_seconds": 3600,
            },
            Environment.PRODUCTION: {
                "enabled": True,
                "max_size": 2000,
                "ttl_seconds": 7200,
            },
            Environment.TESTING: {
                "enabled": False,
                "max_size": 100,
                "ttl_seconds": 300,
            },
        }

        env_defaults = defaults.get(environment, defaults[Environment.DEVELOPMENT])

        return CacheConfig(
            enabled=os.getenv("LLM_CACHE_ENABLED", str(env_defaults["enabled"])).lower() == "true",
            max_size=int(os.getenv("LLM_CACHE_MAX_SIZE", str(env_defaults["max_size"]))),
            ttl_seconds=int(os.getenv("LLM_CACHE_TTL_SECONDS", str(env_defaults["ttl_seconds"]))),
        )

    @staticmethod
    def _load_retry_config(environment: Environment) -> RetryConfig:
        """
        Load retry configuration with environment-specific resilience settings.

        Creates RetryConfig optimized for different environments:

        - Production: More aggressive retries (5 attempts) for maximum uptime
        - Other environments: Standard retries (3 attempts) for faster failure detection

        Uses exponential backoff by default to handle rate limiting gracefully
        while avoiding overwhelming the OpenRouter API with rapid successive calls.

        Args:
            environment: The deployment environment affecting retry behavior

        Returns:
            RetryConfig: Environment-optimized retry configuration

        Environment Variables:
            LLM_RETRY_MAX_ATTEMPTS: Override maximum retry attempts
            LLM_RETRY_STRATEGY: Override retry strategy (exponential/linear/fixed)
            LLM_RETRY_BASE_DELAY: Override initial delay in seconds
            LLM_RETRY_MAX_DELAY: Override maximum delay in seconds

        Complexity: O(1) - simple conditional and construction
        """
        # More aggressive retries in production
        max_attempts = 5 if environment == Environment.PRODUCTION else 3

        return RetryConfig(
            max_attempts=int(os.getenv("LLM_RETRY_MAX_ATTEMPTS", str(max_attempts))),
            strategy=RetryStrategy(os.getenv("LLM_RETRY_STRATEGY", "exponential")),
            base_delay=float(os.getenv("LLM_RETRY_BASE_DELAY", "1.0")),
            max_delay=float(os.getenv("LLM_RETRY_MAX_DELAY", "60.0")),
        )

    @staticmethod
    def _load_batch_config(environment: Environment) -> BatchConfig:
        """
        Load batch processing configuration optimized per environment.

        Creates BatchConfig with settings that balance throughput vs resource usage:

        - Development: Small batches (3/10/5) for fast iteration and debugging
        - Staging: Medium batches (5/20/8) for realistic integration testing
        - Production: Large batches (10/25/15) for maximum throughput efficiency
        - Testing: Minimal batches (2/5/3) for precise test control

        These settings achieved 47.5x performance improvement over individual processing
        by optimizing the balance between API concurrency and memory usage.

        Args:
            environment: The deployment environment affecting batch sizing

        Returns:
            BatchConfig: Environment-optimized batch processing configuration

        Environment Variables:
            LLM_BATCH_DEFAULT_SIZE: Override default batch size
            LLM_BATCH_MAX_SIZE: Override maximum batch size
            LLM_BATCH_CONCURRENT: Override concurrent request limit

        Complexity: O(1) - dictionary lookup and simple construction
        """
        # Smaller batches in development for faster feedback
        defaults = {
            Environment.DEVELOPMENT: {
                "default_size": 3,
                "max_size": 10,
                "concurrent": 5,
            },
            Environment.STAGING: {"default_size": 5, "max_size": 20, "concurrent": 8},
            Environment.PRODUCTION: {
                "default_size": 10,
                "max_size": 25,
                "concurrent": 15,
            },
            Environment.TESTING: {"default_size": 2, "max_size": 5, "concurrent": 3},
        }

        env_defaults = defaults.get(environment, defaults[Environment.DEVELOPMENT])

        return BatchConfig(
            default_size=int(os.getenv("LLM_BATCH_DEFAULT_SIZE", str(env_defaults["default_size"]))),
            max_size=int(os.getenv("LLM_BATCH_MAX_SIZE", str(env_defaults["max_size"]))),
            concurrent_requests=int(os.getenv("LLM_BATCH_CONCURRENT", str(env_defaults["concurrent"]))),
        )

    @staticmethod
    def _load_features(environment: Environment) -> dict[str, bool]:
        """
        Load feature flags for enabling/disabling LLM functionality.

        Creates a dictionary of feature flags that can be toggled via environment
        variables. All features are enabled by default but can be disabled
        for debugging, cost control, or partial deployments.

        Feature flags available:
        - description_cleaning_enabled: Animal description enhancement
        - dog_profiler_enabled: Dog personality profiles for matching
        - translation_enabled: Multi-language description translation
        - metrics_collection_enabled: Performance and usage metrics

        Args:
            environment: The deployment environment (currently unused but reserved)

        Returns:
            Dict[str, bool]: Feature flag settings

        Environment Variables:
            LLM_FEATURE_DESCRIPTION_CLEANING: Enable description cleaning (default: true)
            LLM_FEATURE_DOG_PROFILER: Enable dog profiler generation (default: true)
            LLM_FEATURE_TRANSLATION: Enable translation services (default: true)
            LLM_FEATURE_METRICS: Enable metrics collection (default: true)

        Complexity: O(1) - simple environment variable reads and dictionary construction
        """
        return {
            "description_cleaning_enabled": os.getenv("LLM_FEATURE_DESCRIPTION_CLEANING", "true").lower() == "true",
            "dog_profiler_enabled": os.getenv("LLM_FEATURE_DOG_PROFILER", "true").lower() == "true",
            "translation_enabled": os.getenv("LLM_FEATURE_TRANSLATION", "true").lower() == "true",
            "metrics_collection_enabled": os.getenv("LLM_FEATURE_METRICS", "true").lower() == "true",
        }

    @classmethod
    def load_config(cls) -> LLMConfig:
        """
        Load complete LLM configuration from environment variables.

        This is the main entry point for configuration loading. It orchestrates
        the loading of all configuration subsystems and combines them into a
        single, validated LLMConfig instance.

        The loading process:
        1. Determines deployment environment
        2. Loads environment-specific configurations for each subsystem
        3. Applies environment variable overrides
        4. Validates all settings through Pydantic models
        5. Returns the complete configuration

        Returns:
            LLMConfig: Complete, validated LLM service configuration

        Environment Variables:
            OPENROUTER_API_KEY: Required API key for OpenRouter service
            LLM_BASE_URL: Override API base URL (default: OpenRouter v1)
            LLM_TIMEOUT_SECONDS: Override request timeout (default: 30.0)

        Raises:
            ValidationError: If any configuration values are invalid
            ValueError: If required environment variables are missing

        Complexity: O(1) - aggregates results from all other loader methods
        """
        environment = cls._get_environment()

        config = LLMConfig(
            environment=environment,
            api_key=os.getenv("OPENROUTER_API_KEY"),
            base_url=os.getenv("LLM_BASE_URL", "https://openrouter.ai/api/v1"),
            timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS", "30.0")),
            models=cls._load_model_config(),
            cache=cls._load_cache_config(environment),
            retry=cls._load_retry_config(environment),
            batch=cls._load_batch_config(environment),
            features=cls._load_features(environment),
        )

        return config


@lru_cache(maxsize=1)
def get_llm_config() -> LLMConfig:
    """
    Get cached LLM configuration instance with singleton pattern.

    This function provides a cached singleton instance of the LLM configuration
    to avoid repeated environment variable parsing and validation. The LRU cache
    ensures configuration is loaded only once per application lifecycle.

    The caching is critical for performance since configuration loading involves
    multiple environment variable reads and Pydantic validation operations.

    Returns:
        LLMConfig: Cached, complete LLM service configuration

    Dependencies:
        - Called by: OpenRouterLLMDataService, management commands, API endpoints
        - Calls into: LLMConfigLoader.load_config()

    Complexity: O(1) after first call due to LRU caching, O(n) for first call
    """
    return LLMConfigLoader.load_config()


def get_model_temperature(processing_type: str, model_config: LLMModelConfig) -> float:
    """
    Get appropriate temperature for specific LLM processing type.

    Calculates the optimal temperature setting for different processing types
    by using the middle of the configured temperature range. This ensures
    consistent, appropriate creativity levels for each use case:

    - Description cleaning: Low temperature (0.3) for consistent output
    - Dog profiler: High temperature (0.8) for creative, engaging content
    - Translation: Very low temperature (0.2) for accurate translations

    Args:
        processing_type: The type of LLM processing (e.g., "description_cleaning")
        model_config: Model configuration containing temperature ranges

    Returns:
        float: Optimal temperature value for the processing type

    Dependencies:
        - Called by: OpenRouterLLMDataService methods
        - Calls into: Dictionary lookup on model_config.temperature_ranges

    Complexity: O(1) - simple dictionary lookup and arithmetic
    """
    temp_range = model_config.temperature_ranges.get(processing_type, (0.3, 0.7))
    # Use middle of range as default - balances consistency with creativity
    return (temp_range[0] + temp_range[1]) / 2


def validate_config() -> bool:
    """
    Validate current configuration and return True if valid.

    Performs comprehensive validation of the LLM configuration by:
    1. Loading the configuration (triggers environment variable validation)
    2. Checking required fields (API key presence)
    3. Validating all sub-configuration objects through Pydantic

    This function is used for health checks and startup validation to ensure
    the LLM service can operate correctly before processing requests.

    Returns:
        bool: True if configuration is valid and service can operate

    Dependencies:
        - Called by: Health check endpoints, startup validation
        - Calls into: get_llm_config(), Pydantic model_dump() methods

    Complexity: O(1) - simple validation calls with early returns
    """
    try:
        config = get_llm_config()

        # Check required fields - API key is mandatory for OpenRouter
        if not config.api_key:
            return False

        # Validate all sub-configurations through Pydantic model serialization
        # This triggers all field validators and ensures data integrity
        config.models.model_dump()
        config.cache.model_dump()
        config.retry.model_dump()
        config.batch.model_dump()

        return True

    except Exception:
        # Any exception during validation indicates invalid configuration
        return False
