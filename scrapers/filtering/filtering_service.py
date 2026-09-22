"""Filtering service for managing existing animal detection and filtering."""

import logging
from typing import Any


class FilteringService:
    """Handles filtering of existing animals and tracking of filtering stats.

    Encapsulates the skip_existing_animals logic and external ID recording
    for stale detection.
    """

    def __init__(
        self,
        database_service=None,
        session_manager=None,
        organization_id: int | None = None,
        skip_existing_animals: bool = False,
        logger: logging.Logger | None = None,
    ):
        self.database_service = database_service
        self.session_manager = session_manager
        self.organization_id = organization_id
        self.skip_existing_animals = skip_existing_animals
        self.logger = logger or logging.getLogger(__name__)

        self._total_animals_before_filter = 0
        self._total_animals_skipped = 0

    @property
    def total_animals_before_filter(self) -> int:
        return self._total_animals_before_filter

    @property
    def total_animals_skipped(self) -> int:
        return self._total_animals_skipped

    def get_existing_external_ids(self) -> set[str]:
        """Get external IDs of this organization's available animals."""
        if self.database_service:
            return self.database_service.get_existing_external_ids(self.organization_id)

        self.logger.warning("No DatabaseService available - cannot check existing animals")
        return set()

    def filter_existing_animals(self, animals: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Filter existing animals and record ALL found external_ids for stale detection.

        CRITICAL: Records all external_ids BEFORE filtering so stale detection
        knows which dogs were actually found on the website.

        Args:
            animals: List of animal data dicts, each containing 'external_id'

        Returns:
            Filtered list of animals (only new ones if skip_existing_animals is True)
        """
        if not animals:
            return []

        recorded_count = 0
        for animal in animals:
            external_id = animal.get("external_id")
            if external_id and self.session_manager:
                self.session_manager.record_found_animal(external_id)
                recorded_count += 1

        if recorded_count > 0:
            self.logger.info(f"Recorded {recorded_count} external IDs for stale detection")

        if not self.skip_existing_animals:
            self.logger.info(f"Processing all {len(animals)} animals")
            return animals

        existing_ids = self.get_existing_external_ids()
        filtered_animals = [animal for animal in animals if animal.get("external_id") not in existing_ids]

        skipped_count = len(animals) - len(filtered_animals)
        self._set_filtering_stats(len(animals), skipped_count)

        self.logger.info(f"Filtering: {skipped_count} existing (skipped), {len(filtered_animals)} new ({skipped_count / len(animals) * 100:.1f}% skip rate)")

        return filtered_animals

    def _set_filtering_stats(self, total_before_filter: int, total_skipped: int):
        """Set statistics about skip_existing_animals filtering."""
        self._total_animals_before_filter = total_before_filter
        self._total_animals_skipped = total_skipped
        self.logger.info(f"Filtering stats: {total_before_filter} found, {total_skipped} skipped, {total_before_filter - total_skipped} to process")

    def get_correct_animals_found_count(self, animals_data: list) -> int:
        """Get correct animals_found count for logging.

        Returns total_animals_before_filter if filtering was applied and stats were set,
        otherwise returns the length of animals_data.

        This ensures dogs_found shows total animals found on website (e.g., 35),
        not the filtered count (e.g., 0) when skip_existing_animals=true.
        """
        if self.skip_existing_animals and self._total_animals_before_filter > 0:
            return self._total_animals_before_filter
        return len(animals_data)

    def record_all_found_external_ids(self, animals_data: list[dict[str, Any]]) -> int:
        """Record all external_ids from discovered animals for accurate stale detection.

        This must be called BEFORE any skip_existing_animals filtering happens.

        Args:
            animals_data: List of animal data dictionaries

        Returns:
            Number of external IDs recorded
        """
        if not self.session_manager:
            return 0

        recorded_count = 0
        for animal_data in animals_data:
            external_id = animal_data.get("external_id")
            if external_id:
                self.session_manager.record_found_animal(external_id)
                recorded_count += 1

        if recorded_count > 0:
            self.logger.debug(f"Recorded {recorded_count} external IDs as found for stale detection")

        return recorded_count
