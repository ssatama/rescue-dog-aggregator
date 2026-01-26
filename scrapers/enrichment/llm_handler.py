"""LLM Enrichment Handler for post-processing animals with AI profiles."""

import logging
from collections.abc import Callable
from pathlib import Path
from typing import Any

import sentry_sdk


class LLMEnrichmentHandler:
    """Handles LLM-based enrichment of animal data.

    Encapsulates all LLM profiling logic including:
    - Configuration checking
    - Batch processing with DogProfilerPipeline
    - Statistics collection
    - Error handling and alerting
    """

    def __init__(
        self,
        organization_id: int,
        organization_name: str,
        org_config=None,
        alert_callback: Callable | None = None,
        logger: logging.Logger | None = None,
    ):
        self.organization_id = organization_id
        self.organization_name = organization_name
        self.org_config = org_config
        self.alert_callback = alert_callback
        self.logger = logger or logging.getLogger(__name__)
        self._last_stats: dict[str, Any] | None = None

    def is_enrichment_enabled(self) -> bool:
        """Check if LLM enrichment is enabled for this organization."""
        if not self.org_config:
            return False

        scraper_config = self.org_config.get_scraper_config_dict()
        return scraper_config.get("enable_llm_profiling", False)

    def get_llm_organization_id(self) -> int:
        """Get the LLM organization ID (may differ from scraper org ID)."""
        if not self.org_config:
            return self.organization_id

        scraper_config = self.org_config.get_scraper_config_dict()
        return scraper_config.get("llm_organization_id", self.organization_id)

    def is_significant_update(self, existing_animal) -> bool:
        """Determine if an update is significant enough to warrant re-profiling.

        Args:
            existing_animal: Tuple from database with existing animal data

        Returns:
            bool: True if update is significant
        """
        return True

    def enrich_animals(self, animals_for_enrichment: list[dict[str, Any]]) -> bool:
        """Process animals with LLM enrichment.

        Args:
            animals_for_enrichment: List of dicts with 'id', 'data', 'action' keys

        Returns:
            bool: True if enrichment was successful
        """
        if not self.is_enrichment_enabled():
            return True

        if not animals_for_enrichment:
            self.logger.info("No animals need LLM enrichment")
            return True

        llm_org_id = self.get_llm_organization_id()

        try:
            return self._process_enrichment_batch(animals_for_enrichment, llm_org_id)
        except ImportError as e:
            self.logger.warning(f"LLM profiler modules not available: {e}")
            # Capture to Sentry - missing modules in production is a deployment issue
            sentry_sdk.capture_exception(e)
            return False
        except Exception as e:
            self.logger.error(f"Error during LLM enrichment post-processing: {e}")
            # Capture exception to Sentry before alerting
            sentry_sdk.capture_exception(e)
            self._alert_failure(
                batch_size=len(animals_for_enrichment),
                failed_count=len(animals_for_enrichment),
                error_message=str(e),
            )
            return False

    def _process_enrichment_batch(self, animals_for_enrichment: list[dict[str, Any]], llm_org_id: int) -> bool:
        """Process a batch of animals with LLM enrichment."""
        import asyncio

        from services.llm.dog_profiler import DogProfilerPipeline
        from services.llm.organization_config_loader import get_config_loader

        loader = get_config_loader()
        org_config = loader.load_config(llm_org_id)

        if not org_config:
            self.logger.warning(f"No LLM configuration found for organization {llm_org_id}")
            return False

        template_path = Path("prompts/organizations") / org_config.prompt_file
        if not template_path.exists():
            self.logger.warning(f"Prompt template not found for organization {llm_org_id}: {org_config.prompt_file}")
            return False

        self.logger.info(f"Starting LLM enrichment for {len(animals_for_enrichment)} animals")

        dogs_to_profile = self._prepare_dogs_for_profiling(animals_for_enrichment)
        pipeline = DogProfilerPipeline(organization_id=llm_org_id, dry_run=False)

        self.logger.info(f"Processing {len(dogs_to_profile)} dogs with LLM profiler...")
        results = asyncio.run(pipeline.process_batch(dogs_to_profile, batch_size=5))

        if results:
            success = asyncio.run(pipeline.save_results(results))
            if success:
                self.logger.info(f"Successfully enriched {len(results)} animals with LLM profiles")
            else:
                self.logger.warning("Failed to save some LLM enrichment results")

        self._collect_and_log_statistics(pipeline, len(animals_for_enrichment))
        return True

    def _prepare_dogs_for_profiling(self, animals_for_enrichment: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Prepare animal data for LLM profiling pipeline."""
        dogs_to_profile = []

        for item in animals_for_enrichment:
            animal_data = item["data"]
            dog_data = {
                "id": item["id"],
                "name": animal_data.get("name", "Unknown"),
                "breed": animal_data.get("breed", "Mixed Breed"),
                "age_text": animal_data.get("age_text", "Unknown"),
                "properties": animal_data.get("properties", {}),
            }

            description = animal_data.get("description", "")
            if not description and "properties" in animal_data:
                description = animal_data["properties"].get("description", "")
            if description:
                dog_data["properties"]["description"] = description

            dogs_to_profile.append(dog_data)

        return dogs_to_profile

    def _collect_and_log_statistics(self, pipeline, batch_size: int):
        """Collect and log statistics from the pipeline."""
        stats = pipeline.get_statistics()
        self._last_stats = stats

        if not stats:
            return

        self.logger.info(f"LLM enrichment stats - Success rate: {stats.get('success_rate', 0):.1f}%, Processed: {stats.get('total_processed', 0)}, Failed: {stats.get('total_failed', 0)}")

        failed_count = stats.get("total_failed", 0)
        if failed_count > 0:
            self._alert_failure(
                batch_size=stats.get("total_processed", 0) + failed_count,
                failed_count=failed_count,
                error_message=f"Partial LLM enrichment failure - {stats.get('success_rate', 0):.1f}% success rate",
            )

    def _alert_failure(self, batch_size: int, failed_count: int, error_message: str):
        """Alert about LLM enrichment failure."""
        if self.alert_callback:
            self.alert_callback(
                org_name=self.organization_name,
                batch_size=batch_size,
                failed_count=failed_count,
                error_message=error_message,
                org_id=self.organization_id,
            )

    def get_last_statistics(self) -> dict[str, Any] | None:
        """Get statistics from the last enrichment run."""
        return self._last_stats
