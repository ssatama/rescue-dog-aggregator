"""
Dog profiler service layer.

Following CLAUDE.md principles:
- Service layer separation
- Business logic isolation
- Clean dependency injection
"""

import asyncio
import json
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from services.llm.async_database_pool import AsyncDatabasePool
from services.llm.organization_config_loader import get_config_loader
from services.llm.profile_normalizer import ProfileNormalizer

logger = logging.getLogger(__name__)


@dataclass
class ProfileRequest:
    """Request to profile a dog."""

    dog_id: int
    dog_data: dict[str, Any]
    organization_id: int
    force_regenerate: bool = False


@dataclass
class ProfileResult:
    """Result of profiling a dog."""

    dog_id: int
    success: bool
    profile: dict[str, Any] | None = None
    error: str | None = None
    processing_time_ms: int = 0
    model_used: str | None = None


@dataclass
class BatchProfileResult:
    """Result of batch profiling."""

    organization_id: int
    success: int
    failed: int
    total: int
    results: list[dict[str, Any]] = field(default_factory=list)
    processing_time_ms: int = 0

    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.total == 0:
            return 0.0
        return self.success / self.total


class DogProfilerService:
    """Service layer for dog profiling."""

    def __init__(
        self,
        pool: AsyncDatabasePool,
        llm_client: Any,
        normalizer: ProfileNormalizer | None = None,
        config_loader: Any | None = None,
        max_concurrent: int = 5,
        enable_retry: bool = False,
    ):
        """
        Initialize the profiler service.

        Args:
            pool: Database connection pool
            llm_client: LLM client for generation
            normalizer: Profile normalizer
            config_loader: Organization config loader
            max_concurrent: Max concurrent profiles
            enable_retry: Enable retry on failure
        """
        self.pool = pool
        self.llm_client = llm_client
        self.normalizer = normalizer or ProfileNormalizer()
        self.config_loader = config_loader or get_config_loader()
        self.max_concurrent = max_concurrent
        self.enable_retry = enable_retry

    async def profile_dog(self, request: ProfileRequest) -> ProfileResult:
        """
        Profile a single dog.

        Args:
            request: Profile request

        Returns:
            Profile result
        """
        start_time = datetime.now()

        try:
            # Load organization config
            config = self.config_loader.load_config(request.organization_id)
            if not config:
                return ProfileResult(
                    dog_id=request.dog_id,
                    success=False,
                    error=f"No configuration for organization {request.organization_id}",
                )

            # Load prompt template
            template = self.config_loader.load_prompt_template(config.prompt_file)
            if not template:
                return ProfileResult(
                    dog_id=request.dog_id,
                    success=False,
                    error=f"No prompt template found: {config.prompt_file}",
                )

            # Generate profile with retry
            profile = None
            last_error = None
            max_attempts = 2 if self.enable_retry else 1

            for attempt in range(max_attempts):
                try:
                    # Format prompt
                    user_prompt = template.user_prompt.format(dog_data=json.dumps(request.dog_data))

                    # Generate with LLM
                    profile = await self.llm_client.generate(
                        system_prompt=template.system_prompt,
                        user_prompt=user_prompt,
                        model=config.model_preference,
                    )
                    break
                except Exception as e:
                    last_error = str(e)
                    if attempt < max_attempts - 1:
                        await asyncio.sleep(1)  # Brief delay before retry

            if profile is None:
                return ProfileResult(
                    dog_id=request.dog_id,
                    success=False,
                    error=last_error or "Failed to generate profile",
                )

            # Normalize profile
            normalized = self.normalizer.normalize(profile)

            # Validate profile
            if not self._validate_profile(normalized):
                return ProfileResult(
                    dog_id=request.dog_id,
                    success=False,
                    error="Profile validation failed",
                )

            # Calculate processing time
            processing_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)

            return ProfileResult(
                dog_id=request.dog_id,
                success=True,
                profile=normalized,
                processing_time_ms=processing_time_ms,
                model_used=config.model_preference,
            )

        except Exception as e:
            logger.error(f"Error profiling dog {request.dog_id}: {e}")
            processing_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)

            return ProfileResult(
                dog_id=request.dog_id,
                success=False,
                error=str(e),
                processing_time_ms=processing_time_ms,
            )

    async def profile_batch(self, dogs: list[dict[str, Any]], organization_id: int) -> dict[str, Any]:
        """
        Profile multiple dogs in batch.

        Args:
            dogs: List of dog data
            organization_id: Organization ID

        Returns:
            Batch profile result
        """
        start_time = datetime.now()
        results = []
        success_count = 0
        failed_count = 0

        # Create semaphore for concurrency control
        semaphore = asyncio.Semaphore(self.max_concurrent)

        async def profile_with_semaphore(dog):
            async with semaphore:
                request = ProfileRequest(dog_id=dog["id"], dog_data=dog, organization_id=organization_id)
                result = await self.profile_dog(request)
                return {
                    "dog_id": result.dog_id,
                    "status": "success" if result.success else "error",
                    "error": result.error,
                    "profile": result.profile,
                }

        # Profile all dogs concurrently (limited by semaphore)
        tasks = [profile_with_semaphore(dog) for dog in dogs]
        batch_results = await asyncio.gather(*tasks)

        # Count results
        for result in batch_results:
            results.append(result)
            if result["status"] == "success":
                success_count += 1
            else:
                failed_count += 1

        processing_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)

        return {
            "organization_id": organization_id,
            "success": success_count,
            "failed": failed_count,
            "total": len(dogs),
            "results": results,
            "processing_time_ms": processing_time_ms,
        }

    async def save_profile(self, dog_id: int, profile: dict[str, Any]) -> None:
        """
        Save profile to database.

        Args:
            dog_id: Dog ID
            profile: Profile data
        """
        query = """
            UPDATE animals 
            SET dog_profiler_data = $1,
                updated_at = NOW()
            WHERE id = $2
        """

        profile_json = json.dumps(profile)
        await self.pool.execute(query, profile_json, dog_id)

    async def get_unprofiled_dogs(self, organization_id: int, limit: int = 100) -> list[dict[str, Any]]:
        """
        Get dogs without profiles (only high confidence available dogs).

        Args:
            organization_id: Organization ID
            limit: Maximum number of dogs

        Returns:
            List of unprofiled dogs with high availability confidence
        """
        query = """
            SELECT id, name, properties
            FROM animals
            WHERE organization_id = $1
              AND dog_profiler_data IS NULL
              AND availability_confidence = 'high'
            ORDER BY id
            LIMIT $2
        """

        rows = await self.pool.fetch(query, organization_id, limit)
        return [dict(row) for row in rows]

    def _validate_profile(self, profile: dict[str, Any]) -> bool:
        """
        Validate profile has minimum required fields.

        Args:
            profile: Profile to validate

        Returns:
            True if valid
        """
        # Check for required fields
        if "description" not in profile:
            return False

        # Check description length
        if len(profile.get("description", "")) < 20:
            return False

        return True
