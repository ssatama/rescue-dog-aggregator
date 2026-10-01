"""How a scraped dog is saved: validate, upload images, standardise, save, mark
seen (#569). A mixin of BaseScraper."""

from datetime import datetime
from typing import Any

from scrapers.constants import (
    CONCURRENT_UPLOAD_THRESHOLD,
    MAX_PROFILE_FAILED_RUNS,
    MAX_R2_FAILURE_RATE,
    SMALL_BATCH_THRESHOLD,
)
from scrapers.contract import unknown_keys
from scrapers.scrape_stats import ScrapeStats
from services.llm.grounding import is_sufficiently_grounded


class DogSaving:
    """The save phase, from validation to marking each dog seen."""

    # Dogs from earlier runs profiled per run, so a backlog (or an LLM outage) can't stretch one run
    PROFILING_BACKLOG_CAP = 10

    def _profiling_backlog(self) -> list[dict[str, Any]]:
        """Stored dogs still without a profile, for this run to profile too.

        A dog is queued for profiling only when it is created, so one whose
        profile failed then (a timeout, an OpenRouter 429) would never get one.
        Dogs with too little story are left out: the profiler would skip them
        and alert on every run. So are dogs whose profile failed in
        MAX_PROFILE_FAILED_RUNS runs (#633).
        """
        if not self.database_service or not self.llm_handler.is_enrichment_enabled():
            return []

        queued = {item["id"] for item in self.animals_for_llm_enrichment}
        dogs = [dog for dog in self.database_service.get_unprofiled_animals(self.organization_id) if dog["id"] not in queued and is_sufficiently_grounded(dog)]
        given_up = [dog["id"] for dog in dogs if dog["profile_failed_runs"] >= MAX_PROFILE_FAILED_RUNS]
        if given_up:
            self.logger.warning(f"Not retrying {len(given_up)} dogs that failed profiling in {MAX_PROFILE_FAILED_RUNS} runs: {given_up}")
            dogs = [dog for dog in dogs if dog["profile_failed_runs"] < MAX_PROFILE_FAILED_RUNS]
        # The profiler purges each profiled dog's page itself
        return [{"id": dog["id"], "data": dog, "action": "backfill"} for dog in dogs[: self.PROFILING_BACKLOG_CAP]]

    def validate_external_id(self, external_id):
        """Validate that external_id follows organization prefix pattern.

        Delegates to AnimalValidator for validation logic.

        Args:
            external_id: The external_id to validate
        """
        org_config_id = self.org_config.id if self.org_config else None
        self.animal_validator.validate_external_id(external_id, org_config_id)

    def process_animal(self, animal_data: dict[str, Any]) -> dict[str, Any]:
        """
        Process animal data through unified standardization.

        Args:
            animal_data: Raw animal data dictionary

        Returns:
            Processed animal data with standardized breed fields
        """
        # Make a copy to avoid modifying the original
        processed_data = animal_data.copy()

        try:
            # Apply field normalization first (trimming, boolean conversion, defaults)
            processed_data = self.standardizer.apply_field_normalization(processed_data)

            # Preserve the organization's own breed text before standardization
            # rewrites it. Most scrapers call this in collect_data and save_animal
            # calls it again: the second pass must not record the standardized
            # name as breed_raw (#560).
            if "breed_raw" not in processed_data:
                processed_data["breed_raw"] = processed_data.get("breed")

            # Apply full standardization (handles breed, age, size)
            standardized = self.standardizer.apply_full_standardization(
                breed=processed_data.get("breed"),
                # Scrapers that only set age_text would otherwise have it overwritten with None
                age=processed_data.get("age") or processed_data.get("age_text"),
                size=processed_data.get("size"),
            )

            # Update processed_data with standardized fields (now returned flattened)
            size_source = standardized.pop("size_source", None)
            processed_data.update(standardized)
            # A breed-estimated size is labelled, so no page presents it as the rescue's (#568)
            properties = dict(processed_data.get("properties") or {})
            if size_source:
                properties["size_source"] = size_source
            else:
                properties.pop("size_source", None)
            if properties or "properties" in processed_data:
                processed_data["properties"] = properties

        except Exception as e:
            # If standardization fails, log the error and return the original data
            self.logger.warning(f"Standardization failed: {e}, using raw data")
            # Return the original data so scraping can continue
            return animal_data

        return processed_data

    def _check_contract(self, animal_data: dict[str, Any]) -> None:
        """Log, once per run, top-level keys the save path doesn't read (#568)."""
        new = unknown_keys(animal_data) - self._unknown_keys_logged
        if new:
            self._unknown_keys_logged |= new
            self.logger.warning(f"Scraped dogs carry keys the save path doesn't read, so their values are lost: {sorted(new)}. Move them into properties (scrapers/contract.py).")

    def save_animal(self, animal_data):
        """Save or update animal data in the database with R2 image upload."""
        if not self.database_service:
            self._log_service_unavailable("DatabaseService", "cannot save animals")
            return None, "error"

        try:
            self._check_contract(animal_data)
            # Process animal data through standardization if enabled
            animal_data = self.process_animal(animal_data)

            # Validate external_id pattern to prevent collisions
            if animal_data.get("external_id"):
                self.validate_external_id(animal_data["external_id"])

            # Check if animal already exists by external_id and organization FIRST
            existing_animal = self.database_service.get_existing_animal(animal_data.get("external_id"), animal_data.get("organization_id"))

            # Process primary image using ImageProcessingService if available
            # Skip if already processed (has original_image_url set from batch processing)
            if animal_data.get("primary_image_url") and not animal_data.get("original_image_url"):
                if self.image_processing_service:
                    if existing_animal:
                        # Only a stored dog's image is compared, so only it needs a connection
                        with self.database_service.connection() as conn:
                            animal_data = self.image_processing_service.process_primary_image(animal_data, existing_animal, conn, self.organization_name)
                    else:
                        animal_data = self.image_processing_service.process_primary_image(animal_data, None, None, self.organization_name)
                else:
                    self._log_service_unavailable("ImageProcessingService", "using original image URL")
                    animal_data["original_image_url"] = animal_data["primary_image_url"]

            if existing_animal:
                animal_id, action = self.database_service.update_animal(existing_animal[0], animal_data)
                # Don't enrich updates - only new animals get LLM profiling
                # This avoids unnecessary API calls for unchanged data
                return animal_id, action
            else:
                animal_id, action = self.database_service.create_animal(animal_data)
                # New animals always get profiled
                if animal_id:
                    self.animals_for_llm_enrichment.append({"id": animal_id, "data": animal_data, "action": "create"})
                return animal_id, action
        except Exception as e:
            self.logger.error(f"Error in save_animal: {e}")
            return None, "error"

    def _process_animals_data(self, animals_data):
        """Database operations phase: validate, upload images, save and mark each dog seen."""
        phase_start = datetime.now()

        stats = ScrapeStats()
        # Visible from the first save, so a run that fails mid-loop reports what it saved
        self._processing_stats = stats

        # Validate first, so a rejected dog costs no image upload (#569). The
        # validator also cleans the name and builds properties.display_location
        # in place (#573/#574), before the save.
        valid = []
        for animal_data in animals_data:
            animal_data["organization_id"] = self.organization_id
            animal_data.setdefault("animal_type", self.animal_type)
            if self._validate_animal_data(animal_data):
                valid.append(animal_data)
                continue
            reason = self.animal_validator.rejection_reason(animal_data) or "invalid"
            self.logger.warning(f"Skipping invalid animal: {animal_data.get('name', 'Unknown')} - {reason}")
            stats.reject(animal_data.get("external_id"), reason)

        # ALWAYS use batch image processing for ALL scrapers when ImageProcessingService is available
        # This ensures consistent batch uploading behavior across all organizations
        if self.image_processing_service and valid:
            # Check R2 health before batch processing
            health = self.r2_service.get_health_status()
            if health.get("failure_rate", 0) < MAX_R2_FAILURE_RATE:  # Only batch process if failure rate is reasonable
                self.logger.info(f"🚀 Using batch image processing for {len(valid)} animals")
                try:
                    # Use smaller batch size for small datasets, adaptive for larger ones
                    batch_size = min(SMALL_BATCH_THRESHOLD, len(valid)) if len(valid) <= SMALL_BATCH_THRESHOLD else self.r2_service.get_adaptive_batch_size()
                    with self.database_service.connection() as conn:
                        valid = self.image_processing_service.batch_process_images(
                            valid,
                            self.organization_name,
                            batch_size=batch_size,
                            use_concurrent=len(valid) > CONCURRENT_UPLOAD_THRESHOLD,
                            database_connection=conn,
                            counts=stats,
                        )
                except Exception as e:
                    self.logger.warning(f"Batch image processing failed; per-animal processing will handle images: {e}")

                # Galleries after heroes, so each hero's source URL is known. A failure
                # here leaves every dog's stored gallery as it is.
                try:
                    stored_images = self.database_service.get_images_by_external_id(self.organization_id) if self.database_service else {}
                    pace = self.wait_for_request_slot if getattr(self, "pace_photo_downloads", False) else None
                    self.image_processing_service.batch_process_galleries(valid, stored_images, self.organization_name, pace=pace)
                except Exception as e:
                    self.logger.warning(f"Gallery processing failed; keeping stored galleries: {e}")

        if not self.session_manager:
            self._log_service_unavailable("SessionManager", "mark animal as seen disabled")

        for i, animal_data in enumerate(valid):
            animal_id, action = self.save_animal(animal_data)
            self.progress_tracker.update(items_processed=1, operation_type="animal_save")

            if animal_id:
                # Mark animal as seen in current session for confidence tracking
                if self.session_manager:
                    self.session_manager.mark_animal_as_seen(animal_id)
                    self._purge_if_reactivated(animal_id)
                stats.saved(action)
                if action in ("added", "updated"):
                    self.mark_animal_changed(animal_id)
            else:
                stats.save_failed(animal_data.get("external_id"))

            # Log progress if needed (world-class progress tracking)
            if self.progress_tracker.should_log_progress():
                self.logger.info(self.progress_tracker.get_progress_message())
                self._log_batch_summary(self.progress_tracker, stats, stats.animals_rejected + i + 1)
                self.progress_tracker.log_batch_progress()

        # Log final completion
        if animals_data:
            self.logger.info(f"🎯 Processing complete: {self.progress_tracker.get_progress_message()}")

        phase_duration = (datetime.now() - phase_start).total_seconds()
        self.metrics_collector.track_phase_timing("database_operations", phase_duration)

        self._report_losses(len(animals_data), stats)
        return stats

    def _validate_animal_data(self, animal_data: dict[str, Any]) -> bool:
        """Validate animal data dictionary for required fields and invalid names.

        Delegates to AnimalValidator. Maintains backward compatibility by mutating
        animal_data in place (updating the cleaned name and, when the name was
        cleaned, properties.raw_name).
        """
        is_valid, normalized_data = self.animal_validator.validate_animal_data(animal_data)

        if is_valid:
            animal_data["name"] = normalized_data["name"]
            if "properties" in normalized_data:
                animal_data["properties"] = normalized_data["properties"]

        return is_valid
