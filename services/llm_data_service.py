"""
LLM Data Service for enriching animal data using OpenRouter.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
- Dependency injection for testability
"""

import asyncio
import hashlib
import json
import logging
import os
from abc import ABC, abstractmethod
from collections import OrderedDict
from typing import Any, Dict, List, Optional

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from services.llm.config import get_llm_config, get_model_temperature
from services.llm.models import (
    AnimalEnrichmentRequest,
    AnimalEnrichmentResponse,
    DogProfilerData,
    LLMMessage,
    LLMRequest,
    LLMResponse,
    ProcessingType,
)


class LRUCache:
    """
    Least Recently Used (LRU) cache implementation.

    Prevents memory leaks by maintaining a bounded cache with size limits.
    When the cache is full, the least recently used items are evicted.

    Following CLAUDE.md principles:
    - Pure functions, no mutations (cache operations are atomic)
    - Clear error handling
    - Immutable data patterns
    """

    def __init__(self, max_size: int = None):
        """Initialize LRU cache with maximum size from config."""
        if max_size is None:
            config = get_llm_config()
            max_size = config.cache.max_size

        if max_size <= 0:
            raise ValueError("max_size must be positive")

        self.max_size = max_size
        self._cache = OrderedDict()
        self._hits = 0
        self._misses = 0

    def get(self, key: str) -> Any:
        """Get value from cache, marking as recently used."""
        if key not in self._cache:
            self._misses += 1
            return None

        # Move to end (mark as recently used)
        value = self._cache.pop(key)
        self._cache[key] = value
        self._hits += 1
        return value

    def put(self, key: str, value: Any) -> None:
        """Put value in cache, evicting oldest if necessary."""
        if key in self._cache:
            # Update existing key - move to end
            self._cache.pop(key)
        elif len(self._cache) >= self.max_size:
            # Remove oldest item (first in OrderedDict)
            self._cache.popitem(last=False)

        self._cache[key] = value

    def clear(self) -> None:
        """Clear all cache entries."""
        self._cache.clear()
        self._hits = 0
        self._misses = 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring."""
        total_requests = self._hits + self._misses
        hit_rate = self._hits / total_requests if total_requests > 0 else 0.0

        return {"size": len(self._cache), "max_size": self.max_size, "hits": self._hits, "misses": self._misses, "hit_rate": hit_rate, "total_requests": total_requests}

    def __contains__(self, key: str) -> bool:
        """Check if key exists in cache without updating access order."""
        return key in self._cache

    def __len__(self) -> int:
        """Return current cache size."""
        return len(self._cache)


class LLMDataService(ABC):
    """Abstract base class for LLM data services."""

    @abstractmethod
    async def enrich_animal_data(self, animal_data: Dict[str, Any], processing_type: ProcessingType) -> Dict[str, Any]:
        """Enrich animal data based on processing type."""
        pass

    @abstractmethod
    async def clean_description(self, description: str, organization_config: Optional[Dict] = None) -> str:
        """Clean and improve animal description."""
        pass

    @abstractmethod
    async def generate_dog_profiler(self, dog_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate dog profiler data for matching feature."""
        pass

    @abstractmethod
    async def translate_text(self, text: str, target_language: str, source_language: Optional[str] = None) -> str:
        """Translate text to target language."""
        pass

    @abstractmethod
    async def batch_process(self, animals: List[Dict[str, Any]], processing_type: ProcessingType) -> List[Dict[str, Any]]:
        """Process multiple animals in batch."""
        pass


class OpenRouterLLMDataService(LLMDataService):
    """OpenRouter implementation of LLM Data Service."""

    def __init__(
        self,
        config: Optional[Any] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
        max_retries: Optional[int] = None,
        cache_enabled: Optional[bool] = None,
        max_cache_size: Optional[int] = None,
    ):
        """Initialize OpenRouter LLM service with configuration or individual parameters."""
        if config is None:
            config = get_llm_config()

        # Override config with individual parameters if provided
        if api_key is not None:
            config.api_key = api_key
        if base_url is not None:
            config.base_url = base_url
        if timeout is not None:
            config.timeout_seconds = timeout
        if max_retries is not None:
            config.retry.max_attempts = max_retries
        if cache_enabled is not None:
            config.cache.enabled = cache_enabled
        if max_cache_size is not None:
            config.cache.max_size = max_cache_size

        self.config = config
        self.api_key = config.api_key or os.environ.get("OPENROUTER_API_KEY")
        if not self.api_key:
            raise ValueError("OpenRouter API key required")

        self.base_url = config.base_url
        self.timeout = config.timeout_seconds
        self.max_retries = config.retry.max_attempts
        self.cache_enabled = config.cache.enabled
        self.max_cache_size = config.cache.max_size
        self.cache = LRUCache(config.cache.max_size) if self.cache_enabled else None
        self.logger = logging.getLogger(__name__)

        # Initialize async HTTP client
        self.client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout),
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://rescuedogs.me",
                "X-Title": "Rescue Dog Aggregator",
            },
        )

    async def __aenter__(self):
        """Context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit - close HTTP client."""
        await self.client.aclose()

    def _get_cache_key(self, content: str, processing_type: str) -> str:
        """Generate cache key for content."""
        return hashlib.sha256(f"{processing_type}:{content}".encode()).hexdigest()

    def _create_retry_decorator(self):
        """Create retry decorator based on configuration."""
        config = self.config.retry

        if config.strategy.value == "exponential":
            wait_strategy = wait_exponential(multiplier=1, min=config.base_delay, max=config.max_delay)
        elif config.strategy.value == "linear":
            from tenacity import wait_incrementing

            wait_strategy = wait_incrementing(start=config.base_delay, increment=config.base_delay)
        else:  # fixed
            from tenacity import wait_fixed

            wait_strategy = wait_fixed(config.base_delay)

        return retry(
            retry=retry_if_exception_type(httpx.HTTPStatusError),
            stop=stop_after_attempt(config.max_attempts),
            wait=wait_strategy,
        )

    async def _make_api_call(self, request: LLMRequest) -> LLMResponse:
        """Make API call to OpenRouter with retry logic."""
        # Apply retry decorator dynamically
        retry_decorator = self._create_retry_decorator()

        @retry_decorator
        async def _do_api_call():
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json=request.model_dump(),
            )
            response.raise_for_status()
            return response.json()

        try:
            data = await _do_api_call()

            # Extract content from OpenAI-style response
            content = data["choices"][0]["message"]["content"]

            return LLMResponse(
                id=data.get("id", ""),
                model=data.get("model", self.config.models.default_model),
                content=content,
                usage=data.get("usage"),
            )

        except httpx.HTTPStatusError as e:
            if e.response.status_code >= 500:
                # Server errors - will be retried
                self.logger.warning(f"Server error from OpenRouter: {e}")
                raise
            elif e.response.status_code == 401:
                # Authentication error
                raise ValueError("Invalid API key") from e
            else:
                # Client errors - don't retry
                error_data = e.response.json()
                error_msg = error_data.get("error", {}).get("message", str(e))
                raise ValueError(f"OpenRouter API error: {error_msg}") from e

        except Exception as e:
            self.logger.error(f"Unexpected error calling OpenRouter: {e}")
            raise ValueError(f"Failed to process LLM request: {e}") from e

    async def clean_description(self, description: str, organization_config: Optional[Dict] = None) -> str:
        """Clean and improve animal description."""
        if not description:
            return description

        # Check cache
        if self.cache_enabled:
            cache_key = self._get_cache_key(description, "clean_description")
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                return cached_result

        # Build prompt based on organization config
        system_prompt = self._build_cleaning_prompt(organization_config)

        temperature = get_model_temperature("description_cleaning", self.config.models)

        request = LLMRequest(
            messages=[
                LLMMessage(role="system", content=system_prompt),
                LLMMessage(role="user", content=f"Clean this dog description: {description}"),
            ],
            model=self.config.models.default_model,
            temperature=temperature,
        )

        response = await self._make_api_call(request)
        cleaned = response.content.strip()

        # Cache result
        if self.cache_enabled:
            self.cache.put(cache_key, cleaned)

        return cleaned

    def _build_cleaning_prompt(self, org_config: Optional[Dict]) -> str:
        """Build system prompt for description cleaning."""
        base_prompt = """You are an expert at cleaning and improving dog adoption descriptions.
Your task is to:
1. Fix grammar and spelling errors
2. Remove excessive punctuation and formatting issues
3. Make the description clear and engaging
4. Keep the original meaning and facts
5. Maintain appropriate length (not too short, not too long)
6. Use warm, friendly language suitable for adoption listings"""

        if org_config:
            style = org_config.get("prompt_style", "friendly")
            if style == "professional":
                base_prompt += "\n7. Use professional, informative tone"
            elif style == "playful":
                base_prompt += "\n7. Use playful, fun tone that appeals to families"

        return base_prompt

    async def generate_dog_profiler(self, dog_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate dog profiler data for matching feature."""
        if not dog_data.get("name"):
            return {}

        system_prompt = """You are creating engaging dog profiles for a matching feature.
Generate a JSON object with these fields:
- tagline: A catchy one-liner (max 60 chars)
- bio: An engaging 2-3 sentence biography
- looking_for: Description of ideal home (1-2 sentences)
- personality_traits: List of 3-5 personality traits
- interests: List of 2-4 hobbies/interests
- fun_fact: One unique or amusing fact (optional)

Make it engaging, honest, and help potential adopters connect emotionally."""

        user_prompt = f"""Create a profile for:
Name: {dog_data.get('name')}
Breed: {dog_data.get('breed', 'Mixed breed')}
Age: {dog_data.get('age_text', 'Unknown')}
Description: {dog_data.get('description', '')}"""

        temperature = get_model_temperature("dog_profiler", self.config.models)

        request = LLMRequest(
            messages=[
                LLMMessage(role="system", content=system_prompt),
                LLMMessage(role="user", content=user_prompt),
            ],
            model=self.config.models.default_model,
            temperature=temperature,
        )

        response = await self._make_api_call(request)

        try:
            # Parse JSON response
            profile_data = json.loads(response.content)
            # Validate against DogProfilerData model
            validated = DogProfilerData(**profile_data)
            return validated.model_dump()
        except (json.JSONDecodeError, ValueError) as e:
            self.logger.error(f"Failed to parse dog profiler response: {e}")
            return {}

    async def translate_text(self, text: str, target_language: str, source_language: Optional[str] = None) -> str:
        """Translate text to target language."""
        if not text:
            return text

        # Check cache
        if self.cache_enabled:
            cache_key = self._get_cache_key(f"{text}:{target_language}", "translate")
            cached_result = self.cache.get(cache_key)
            if cached_result is not None:
                return cached_result

        source_lang = source_language or "English"
        target_lang_full = self._get_language_name(target_language)

        temperature = get_model_temperature("translation", self.config.models)

        request = LLMRequest(
            messages=[
                LLMMessage(
                    role="system",
                    content=f"You are a professional translator. Translate from {source_lang} to {target_lang_full}. Maintain the tone and meaning.",
                ),
                LLMMessage(role="user", content=text),
            ],
            model=self.config.models.default_model,
            temperature=temperature,
        )

        response = await self._make_api_call(request)
        translated = response.content.strip()

        # Cache result
        if self.cache_enabled:
            self.cache.put(cache_key, translated)

        return translated

    def _get_language_name(self, code: str) -> str:
        """Convert language code to full name."""
        languages = {
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "nl": "Dutch",
            "pl": "Polish",
            "tr": "Turkish",
            "ru": "Russian",
            "ja": "Japanese",
            "zh": "Chinese",
            "ko": "Korean",
        }
        return languages.get(code, code)

    async def enrich_animal_data(self, animal_data: Dict[str, Any], processing_type: ProcessingType) -> Dict[str, Any]:
        """Enrich animal data based on processing type."""
        if processing_type == ProcessingType.DESCRIPTION_CLEANING:
            description = animal_data.get("description", "")
            cleaned = await self.clean_description(description)
            return {**animal_data, "enriched_description": cleaned}

        elif processing_type == ProcessingType.DOG_PROFILER:
            profile = await self.generate_dog_profiler(animal_data)
            return {**animal_data, "dog_profiler_data": profile}

        elif processing_type == ProcessingType.TRANSLATION:
            # Translate description to multiple languages
            description = animal_data.get("description", "")
            translations = {}
            for lang in ["es", "fr", "de"]:
                translations[lang] = await self.translate_text(description, lang)
            return {**animal_data, "translations": translations}

        return animal_data

    async def batch_process(self, animals: List[Dict[str, Any]], processing_type: ProcessingType) -> List[Dict[str, Any]]:
        """Process multiple animals in batch with concurrency control."""
        # Process in batches to avoid overwhelming the API
        batch_size = self.config.batch.default_size
        results = []

        for i in range(0, len(animals), batch_size):
            batch = animals[i : i + batch_size]
            tasks = [self.enrich_animal_data(animal, processing_type) for animal in batch]
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)

            for animal, result in zip(batch, batch_results):
                if isinstance(result, Exception):
                    self.logger.error(f"Failed to process animal {animal.get('id')}: {result}")
                    # Return original data on failure
                    results.append({**animal, "enriched_description": animal.get("description", "")})
                else:
                    results.append(result)

        return results

    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics for monitoring memory usage and performance."""
        if not self.cache_enabled or self.cache is None:
            return {"cache_enabled": False, "message": "Caching is disabled"}

        stats = self.cache.get_stats()
        stats["cache_enabled"] = True
        return stats
