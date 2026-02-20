"""
Dog Profiler Pipeline for enriching dog data with LLM.

Default Model: google/gemini-3-flash-preview
- 2.5x faster than GPT-4
- 85% cheaper (~$0.0015/dog vs $0.01/dog)
- 90% success rate (with retry logic can reach 100%)

Following CLAUDE.md principles:
- Pure functions, no mutations
- Clear error handling
- Dependency injection
- Context manager support
"""

import asyncio
import logging
import time
from datetime import datetime
from typing import TYPE_CHECKING, Any, Optional

from dotenv import load_dotenv

if TYPE_CHECKING:
    from services.connection_pool import ConnectionPoolService

from services.llm.database_updater import DatabaseUpdater
from services.llm.extracted_profile_normalizer import ExtractedProfileNormalizer
from services.llm.llm_client import LLMClient
from services.llm.prompt_builder import PromptBuilder
from services.llm.retry_handler import RetryConfig, RetryHandler
from services.llm.schemas.dog_profiler import DogProfilerData
from services.llm.statistics_tracker import StatisticsTracker
from services.llm_data_service import OpenRouterLLMDataService

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


class DogProfilerPipeline:
    """Pipeline for enriching dog data with LLM-generated profiles."""

    def __init__(
        self,
        organization_id: int,
        llm_service: OpenRouterLLMDataService | None = None,
        dry_run: bool = False,
        retry_config: RetryConfig | None = None,
        connection_pool: Optional["ConnectionPoolService"] = None,
    ):
        """
        Initialize the dog profiler pipeline.

        Args:
            organization_id: ID of the organization to process
            llm_service: Optional LLM service instance (creates one if not provided)
            dry_run: If True, don't save to database
            retry_config: Optional retry configuration
            connection_pool: Optional connection pool service for database operations
        """
        self.org_id = organization_id
        self.dry_run = dry_run
        self.connection_pool = connection_pool
        self.llm_service = llm_service or OpenRouterLLMDataService()
        self.prompt_builder = PromptBuilder(organization_id)
        self.llm_client = LLMClient()
        self.normalizer = ExtractedProfileNormalizer()
        self.database_updater = DatabaseUpdater(connection_pool, dry_run)
        self.statistics = StatisticsTracker()

        # Setup retry handler with fallback models
        if retry_config is None:
            retry_config = RetryConfig(
                max_attempts=3,
                initial_delay=2.0,
                backoff_factor=2.0,
                fallback_models=[
                    "google/gemini-3-flash-preview",
                    "openai/gpt-4-turbo-preview",
                ],
            )
        self.retry_handler = RetryHandler(retry_config)

    def _normalize_profile_data(self, data: dict[str, Any]) -> dict[str, Any]:
        """
        Normalize model output to match our schema requirements.

        Delegates to ExtractedProfileNormalizer for all normalization logic.
        This keeps the pipeline focused on orchestration.

        Args:
            data: Raw data from LLM response

        Returns:
            Normalized data matching schema requirements
        """
        return self.normalizer.normalize(data)

    async def _call_llm_api(
        self,
        dog_data: dict[str, Any],
        model: str = "google/gemini-3-flash-preview",
        timeout: float = 30.0,
        prompt_adjustment: str = "",
    ) -> dict[str, Any]:
        """
        Make LLM API call with specified model.

        This is separated out to be retryable.

        Args:
            dog_data: Dog information dictionary
            model: Model to use
            timeout: Request timeout
            prompt_adjustment: Optional prompt adjustment for retries

        Returns:
            Parsed JSON response

        Raises:
            Various exceptions that trigger retries
        """
        # Build messages using PromptBuilder
        messages = self.prompt_builder.build_messages(dog_data, prompt_adjustment)

        # Use LLMClient to make the API call and parse response
        return await self.llm_client.call_api_and_parse(
            messages=messages,
            model=model,
            temperature=0.7,
            max_tokens=4000,
            timeout=timeout,
        )

    async def process_dog(self, dog_data: dict[str, Any]) -> dict[str, Any] | None:
        """
        Process a single dog with error handling and retry logic.

        Args:
            dog_data: Dog information from database

        Returns:
            Profiler data dictionary or None if failed
        """
        dog_id = dog_data.get("id", "unknown")
        dog_name = dog_data.get("name", "Unknown")

        try:
            start_time = time.time()

            # Call LLM service with retry logic
            logger.info(f"Processing dog {dog_id} ({dog_name})")

            # Use retry handler to call the API with automatic retries and model fallback
            profiler_result = await self.retry_handler.execute_with_retry(
                self._call_llm_api,
                dog_data=dog_data,
                model="google/gemini-3-flash-preview",
                timeout=30.0,
                prompt_adjustment="",  # Start with preferred model  # Will be modified by retry handler if needed
            )

            # Calculate processing time
            processing_time_ms = int((time.time() - start_time) * 1000)

            # Ensure we have the required metadata
            if "dog_profiler_data" in profiler_result:
                profile_data = profiler_result["dog_profiler_data"]
            else:
                profile_data = profiler_result

            # Add processing time before normalization
            profile_data["processing_time_ms"] = processing_time_ms

            # Normalize values to match our schema enums
            profile_data = self._normalize_profile_data(profile_data)

            # Add/update metadata fields
            profile_data["profiled_at"] = datetime.utcnow().isoformat()
            profile_data["prompt_version"] = self.prompt_builder.get_prompt_version()
            profile_data["model_used"] = profiler_result.get("model_used", "google/gemini-3-flash-preview")

            # Add confidence scores if not present (using defaults)
            if "confidence_scores" not in profile_data:
                profile_data["confidence_scores"] = {
                    "description": 0.8,
                    "energy_level": 0.7,
                    "trainability": 0.7,
                }
            else:
                required_defaults = {"description": 0.5, "energy_level": 0.5, "trainability": 0.5}
                for field, default in required_defaults.items():
                    if field not in profile_data["confidence_scores"]:
                        profile_data["confidence_scores"][field] = default

            # Add source references if not present
            if "source_references" not in profile_data:
                profile_data["source_references"] = {
                    "description": str(dog_data.get("properties", {}).get("description", "")),
                    "personality_traits": "inferred from description",
                }

            # Validate against schema
            validated_data = DogProfilerData(**profile_data)

            self.statistics.record_success()
            logger.info(f"Successfully processed dog {dog_id} ({dog_name})")

            # Convert to dict with proper datetime serialization
            result = validated_data.dict()
            # Ensure datetime is serialized
            if "profiled_at" in result and isinstance(result["profiled_at"], datetime):
                result["profiled_at"] = result["profiled_at"].isoformat()

            # Add original dog data fields that aren't in the schema
            result["dog_id"] = dog_id  # Database updater expects dog_id
            result["name"] = dog_name
            result["breed"] = dog_data.get("breed", "Mixed Breed")
            result["external_id"] = dog_data.get("external_id")

            # Calculate quality score if rubric is available
            if hasattr(self, "quality_rubric"):
                from .quality_rubric import DogProfileQualityRubric

                if not hasattr(self, "_rubric_instance"):
                    self._rubric_instance = DogProfileQualityRubric()
                # Score returns 0-1, multiply by 100 for percentage
                result["quality_score"] = self._rubric_instance.calculate_quality_score(result, dog_data) * 100
            else:
                # Default quality score for basic validation (80%)
                result["quality_score"] = 80

            return result

        except Exception as e:
            error_info = {"dog_id": dog_id, "dog_name": dog_name, "error": str(e)}
            self.statistics.record_error(error_info)
            error_msg = f"Failed to process dog {dog_id} ({dog_name}): {str(e)}"
            logger.error(error_msg)
            return None

    async def process_batch(self, dogs: list[dict[str, Any]], batch_size: int = 5) -> list[dict[str, Any]]:
        """
        Process multiple dogs in batches.

        Args:
            dogs: List of dog data dictionaries
            batch_size: Number of dogs to process concurrently

        Returns:
            List of successful results
        """
        results = []

        for i in range(0, len(dogs), batch_size):
            batch = dogs[i : i + batch_size]
            logger.info(f"Processing batch {i // batch_size + 1} ({len(batch)} dogs)")

            # Process batch concurrently
            tasks = [self.process_dog(dog) for dog in batch]
            batch_results = await asyncio.gather(*tasks)

            # Filter out None results (failures)
            successful = [r for r in batch_results if r is not None]
            results.extend(successful)

            # Log progress
            logger.info(f"Batch complete: {len(successful)}/{len(batch)} successful")

            # Small delay between batches to avoid rate limits
            if i + batch_size < len(dogs):
                await asyncio.sleep(1)

        return results

    def get_summary(self) -> dict[str, Any]:
        """
        Get processing summary statistics.

        Returns:
            Summary dictionary
        """
        return self.statistics.get_summary()

    def get_statistics(self) -> dict[str, Any]:
        """
        Get processing statistics (alias for get_summary).

        Returns:
            Statistics dictionary
        """
        return self.statistics.get_statistics()

    async def save_results(self, results: list[dict[str, Any]]) -> bool:
        """
        Save profiler results to database.

        Args:
            results: List of profiler data dictionaries

        Returns:
            True if successful
        """
        return await self.database_updater.save_results(results)

    # Context manager support
    async def __aenter__(self):
        """Enter context manager."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Exit context manager."""
        if self.llm_service:
            await self.llm_service.__aexit__(exc_type, exc_val, exc_tb)
