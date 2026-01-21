"""
Pydantic models for LLM Data Service.

Following CLAUDE.md principles:
- Immutable data patterns
- Clear data contracts
- Type safety and validation
"""

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class ProcessingType(str, Enum):
    """
    Types of LLM processing available in the system.

    This enum defines the different types of AI processing that can be performed
    on animal data through the LLM service. Each type has specific optimizations:

    - DESCRIPTION_CLEANING: Enhances readability and fixes grammar/formatting
    - DOG_PROFILER: Creates engaging personality profiles for matching features
    - TRANSLATION: Translates descriptions to multiple languages for accessibility
    - BATCH_ENRICHMENT: Processes multiple animals efficiently with batch optimization

    The enum values are used throughout the system for:
    - API endpoint routing
    - Temperature configuration selection
    - Caching key generation
    - Performance metrics tracking

    Dependencies:
        - Called by: API endpoints, CLI commands, batch processing
        - Calls into: LLM service method dispatch, configuration lookups

    Complexity: O(1) for enum value access and comparison
    """

    DESCRIPTION_CLEANING = "description_cleaning"
    DOG_PROFILER = "dog_profiler"
    TRANSLATION = "translation"
    BATCH_ENRICHMENT = "batch_enrichment"


class LLMMessage(BaseModel):
    """
    Single message in LLM conversation following OpenAI chat format.

    Represents one message in the conversation history sent to the LLM API.
    This follows the OpenAI/OpenRouter chat completion format where conversations
    are structured as arrays of role-based messages.

    The role determines how the message is interpreted:
    - "system": Instructions and context for the AI (e.g., "You are a helpful assistant")
    - "user": Input from the human user (e.g., "Clean this description: ...")
    - "assistant": Previous AI responses (for multi-turn conversations)

    Attributes:
        role: The message sender type (system/user/assistant)
        content: The actual message text content

    Dependencies:
        - Called by: LLMRequest, OpenRouterLLMDataService message construction
        - Calls into: Pydantic validation for role and content

    Complexity: O(1) for construction and validation
    """

    role: Literal["system", "user", "assistant"]
    content: str


class LLMRequest(BaseModel):
    """
    Request to LLM API in OpenAI/OpenRouter format.

    Represents a complete request to the OpenRouter API for chat completions.
    This model encapsulates all parameters needed to control LLM behavior
    and ensure consistent, validated API calls.

    The model uses OpenRouter's "auto" selection by default, which automatically
    chooses the best available model based on the request characteristics.
    Temperature is dynamically set based on processing type for optimal results.

    Attributes:
        messages: Conversation history as array of role-based messages
        model: LLM model identifier (default: "openrouter/auto" for auto-selection)
        temperature: Creativity level (0.0=deterministic, 2.0=highly creative)
        max_tokens: Maximum response length (None=unlimited, respects model limits)
        top_p: Nucleus sampling parameter for alternative to temperature

    Dependencies:
        - Called by: OpenRouterLLMDataService._make_api_call
        - Calls into: OpenRouter API chat/completions endpoint

    Complexity: O(n) for validation where n is number of messages
    """

    messages: list[LLMMessage]
    model: str = Field(default="openrouter/auto", description="Model to use for the request")
    temperature: float | None = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: int | None = Field(default=None, gt=0)
    top_p: float | None = Field(default=None, ge=0.0, le=1.0)


class LLMResponse(BaseModel):
    """
    Response from LLM API with processing metadata.

    Represents the response from OpenRouter API after successful processing.
    This model extracts and normalizes key information from the OpenAI-format
    response for internal use throughout the application.

    The content field contains the actual LLM-generated text, while usage
    provides token consumption data for cost tracking and performance monitoring.
    The finish_reason indicates why the model stopped generating (length, stop token, etc).

    Attributes:
        id: Unique identifier for this specific API response
        model: Actual model used by OpenRouter (may differ from requested model)
        content: The generated text content from the LLM
        usage: Token usage statistics (prompt_tokens, completion_tokens, total_tokens)
        finish_reason: Why generation stopped (stop, length, content_filter, etc)

    Dependencies:
        - Called by: OpenRouterLLMDataService._make_api_call response parsing
        - Calls into: LLM service caching and metrics collection

    Complexity: O(1) for construction and field access
    """

    id: str
    model: str
    content: str
    usage: dict[str, Any] | None = None
    finish_reason: str | None = None


class AnimalEnrichmentRequest(BaseModel):
    """
    Request to enrich animal data with LLM processing.

    Represents a request to enhance animal data through various LLM-powered
    transformations. This is the main interface for processing individual
    animals through the LLM service.

    The animal_data should contain at minimum: name, description, and any
    relevant metadata. The processing_type determines which enhancement
    is applied (cleaning, profiling, translation, etc).

    Organization-specific configuration allows customization of prompts
    and processing behavior based on the source organization's preferences.

    Attributes:
        animal_data: Complete animal record with name, description, breed, etc
        processing_type: Type of LLM enhancement to perform
        organization_config: Optional org-specific settings for customization
        language: Language code for processing context (default: English)

    Dependencies:
        - Called by: API endpoints, CLI commands for individual processing
        - Calls into: OpenRouterLLMDataService.enrich_animal_data

    Complexity: O(1) for construction, O(n) for processing based on content size
    """

    animal_data: dict[str, Any]
    processing_type: ProcessingType
    organization_config: dict[str, Any] | None = None
    language: str | None = "en"


class AnimalEnrichmentResponse(BaseModel):
    """
    Response from animal data enrichment with processing metadata.

    Contains the results of LLM processing applied to animal data, including
    both the original and enhanced data for comparison and debugging.

    The response preserves the original data while adding enriched fields
    based on the processing type:
    - DESCRIPTION_CLEANING: adds 'enriched_description'
    - DOG_PROFILER: adds 'dog_profiler_data' with personality info
    - TRANSLATION: adds 'translations' with multi-language content

    Processing metadata enables performance monitoring, cost tracking,
    and cache hit analysis for system optimization.

    Attributes:
        original_data: Unmodified animal data as received
        enriched_data: Enhanced data with new LLM-generated fields
        processing_type: Type of enhancement that was applied
        model_used: Actual LLM model used for processing
        tokens_used: Token consumption for cost tracking (None if cached)
        cached: Whether result came from cache (improves performance metrics)

    Dependencies:
        - Called by: OpenRouterLLMDataService processing methods
        - Calls into: API response serialization, metrics collection

    Complexity: O(1) for construction, O(n) for data serialization
    """

    original_data: dict[str, Any]
    enriched_data: dict[str, Any]
    processing_type: ProcessingType
    model_used: str
    tokens_used: int | None = None
    cached: bool = False


class DogProfilerData(BaseModel):
    """
    Data structure for dog profiler feature with personality insights.

    Represents the structured output from the dog profiler LLM processing,
    which creates engaging personality profiles to help potential adopters
    connect emotionally with rescue dogs.

    This model enforces a consistent structure for dog personality data
    that can be used in matching algorithms, frontend display components,
    and adoption recommendation systems.

    The profile is designed to be human-readable and emotionally engaging
    while providing practical information for adoption decisions.

    Attributes:
        tagline: Catchy one-liner summarizing the dog's personality (max 60 chars)
        bio: Engaging 2-3 sentence biography highlighting personality
        looking_for: Description of ideal home environment and family type
        personality_traits: List of 3-5 key personality characteristics
        interests: List of 2-4 hobbies, activities, or things the dog enjoys
        deal_breakers: Optional list of non-negotiable requirements or restrictions
        fun_fact: Optional unique or amusing fact about the dog

    Dependencies:
        - Called by: OpenRouterLLMDataService.generate_dog_profiler
        - Calls into: Frontend profile displays, matching algorithms

    Complexity: O(1) for construction and field access
    """

    tagline: str = Field(..., description="Catchy one-liner for the dog")
    bio: str = Field(..., description="Engaging biography")
    looking_for: str = Field(..., description="Ideal home description")
    personality_traits: list[str] = Field(..., description="Key personality traits")
    interests: list[str] = Field(default_factory=list, description="Hobbies and interests")
    deal_breakers: list[str] | None = Field(default=None, description="Non-negotiable requirements")
    fun_fact: str | None = Field(default=None, description="Unique or amusing fact")


class TranslationRequest(BaseModel):
    """
    Request for text translation with language and context specification.

    Represents a request to translate text from one language to another
    using the LLM service. Supports automatic source language detection
    and context-aware translation for improved accuracy.

    The translation service is optimized for animal descriptions and
    rescue organization content, maintaining appropriate tone and terminology
    for adoption-related contexts.

    Attributes:
        text: The text content to be translated
        source_language: Source language (optional, auto-detected if None)
        target_language: Target language code (e.g., "es", "fr", "de")
        context: Additional context to improve translation accuracy

    Dependencies:
        - Called by: CLI translation commands, API translation endpoints
        - Calls into: OpenRouterLLMDataService.translate_text

    Complexity: O(1) for construction, O(n) for processing based on text length
    """

    text: str
    source_language: str | None = None
    target_language: str
    context: str | None = None


class BatchProcessingRequest(BaseModel):
    """
    Request for batch processing multiple animals with performance optimization.

    Represents a request to process multiple animals efficiently through
    the batch processing system that achieved 47.5x performance improvement
    over individual processing.

    The batch processor groups animals into configurable batches, processes
    them concurrently with the LLM API, then commits results to the database
    in batches to minimize both API latency and database overhead.

    Batch size is constrained to prevent memory issues and API timeout problems
    while maintaining optimal throughput for different processing types.

    Attributes:
        animals: List of animal data dictionaries to process
        processing_type: Type of LLM enhancement to apply to all animals
        organization_config: Optional org-specific settings for customization
        batch_size: Number of animals to process per batch (1-100 range)

    Dependencies:
        - Called by: CLI batch commands, API batch endpoints
        - Calls into: OpenRouterLLMDataService.batch_process

    Complexity: O(n/batch_size) for n animals with concurrent processing
    """

    animals: list[dict[str, Any]]
    processing_type: ProcessingType
    organization_config: dict[str, Any] | None = None
    batch_size: int = Field(default=10, gt=0, le=100)


class BatchProcessingResponse(BaseModel):
    """
    Response from batch processing with comprehensive results and metrics.

    Contains the results of batch processing multiple animals through the LLM service,
    including both successful and failed processing attempts with detailed metrics
    for performance monitoring and cost tracking.

    The response provides granular visibility into batch processing results,
    enabling operators to identify patterns in failures, track token consumption,
    and optimize batch sizes for better throughput.

    Failed processing attempts include error details to help diagnose issues
    with specific animals or processing types.

    Attributes:
        processed_count: Total number of animals attempted for processing
        successful: List of successful enrichment responses with full metadata
        failed: List of failed attempts with animal data and error information
        total_tokens_used: Aggregate token consumption across all successful requests

    Dependencies:
        - Called by: OpenRouterLLMDataService.batch_process response aggregation
        - Calls into: Batch processing metrics, cost tracking systems

    Complexity: O(n) for construction where n is number of animals processed
    """

    processed_count: int
    successful: list[AnimalEnrichmentResponse]
    failed: list[dict[str, Any]]
    total_tokens_used: int | None = None
