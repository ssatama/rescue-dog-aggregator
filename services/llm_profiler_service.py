"""
Enhanced LLM Data Service that uses DogProfilerPipeline for enrichment.

This service extends the base LLMDataService to integrate the full
DogProfilerPipeline for comprehensive dog profile generation.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Dependency injection for testability
"""

import logging
from typing import Any, Dict, Optional

from services.llm.dog_profiler import DogProfilerPipeline
from services.llm_data_service import OpenRouterLLMDataService


class LLMProfilerService(OpenRouterLLMDataService):
    """Enhanced LLM service that uses DogProfilerPipeline for dog profiling."""

    def __init__(self, organization_id: int = None, connection_pool=None, **kwargs):
        """Initialize with optional organization-specific profiler.

        Args:
            organization_id: ID of the organization for prompts
            connection_pool: Optional connection pool service for database operations
            **kwargs: Additional arguments for parent class
        """
        super().__init__(**kwargs)
        self.organization_id = organization_id
        self.connection_pool = connection_pool
        self.profiler_pipeline = None
        self.logger = logging.getLogger(__name__)

    async def generate_dog_profiler(self, dog_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate comprehensive dog profile using DogProfilerPipeline.

        This overrides the base implementation to use our enhanced pipeline
        with organization-specific prompts and quality scoring.
        """
        # Initialize pipeline for organization if not already done
        if self.profiler_pipeline is None and self.organization_id:
            try:
                self.profiler_pipeline = DogProfilerPipeline(
                    organization_id=self.organization_id,
                    dry_run=False,
                    connection_pool=self.connection_pool,
                )
                self.logger.info(f"Initialized DogProfilerPipeline for org {self.organization_id} " f"with pool: {bool(self.connection_pool)}")
            except Exception as e:
                self.logger.warning(f"Failed to initialize pipeline: {e}")
                # Fall back to base implementation
                return await super().generate_dog_profiler(dog_data)

        # Use pipeline if available
        if self.profiler_pipeline:
            try:
                # Process dog through pipeline
                profile_data = await self.profiler_pipeline.process_dog(dog_data)

                if profile_data:
                    self.logger.info(f"Generated profile for {dog_data.get('name')} using pipeline")
                    return profile_data
                else:
                    self.logger.warning(f"Pipeline returned empty profile for {dog_data.get('name')}")

            except Exception as e:
                self.logger.error(f"Pipeline processing failed: {e}")

        # Fall back to base implementation
        self.logger.info("Falling back to base profiler implementation")
        return await super().generate_dog_profiler(dog_data)

    async def enrich_animal_with_profile(self, animal_id: int, animal_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Enrich animal with comprehensive profile data.

        This is the method that BaseScraper can call to enrich animals.

        Args:
            animal_id: Database ID of the animal
            animal_data: Animal data dictionary

        Returns:
            Profile data dictionary or None if failed
        """
        # Check if we should profile this animal
        if not self._should_profile(animal_data):
            return None

        try:
            # Prepare data for profiler
            profile_input = {
                "id": animal_id,
                "name": animal_data.get("name"),
                "breed": animal_data.get("breed", "Mixed Breed"),
                "age_text": animal_data.get("age_text", "Unknown"),
                "properties": animal_data.get("properties", {}),
                "external_id": animal_data.get("external_id"),
                "description": animal_data.get("description", ""),
            }

            # Generate profile
            profile_data = await self.generate_dog_profiler(profile_input)

            if profile_data:
                self.logger.info(f"Successfully enriched animal {animal_id} with profile")
                return profile_data
            else:
                self.logger.warning(f"No profile generated for animal {animal_id}")
                return None

        except Exception as e:
            self.logger.error(f"Error enriching animal {animal_id}: {e}")
            return None

    def _should_profile(self, animal_data: Dict[str, Any]) -> bool:
        """
        Determine if an animal should be profiled.

        Args:
            animal_data: Animal data dictionary

        Returns:
            True if animal should be profiled
        """
        # Don't profile if already has profiler data
        if animal_data.get("dog_profiler_data"):
            return False

        # Only profile dogs
        animal_type = animal_data.get("animal_type", "dog").lower()
        if animal_type != "dog":
            return False

        # Need at least name
        if not animal_data.get("name"):
            return False

        # Check for meaningful content
        properties = animal_data.get("properties", {})
        description = animal_data.get("description", "")

        # Need either properties with content or a description
        has_properties = properties and isinstance(properties, dict) and any(key in properties and properties[key] for key in ["description", "Beschreibung", "details", "info"])

        has_description = description and len(description) > 50

        return has_properties or has_description
