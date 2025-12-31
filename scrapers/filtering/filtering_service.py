"""Filtering service for managing existing animal detection and filtering."""

import logging
from typing import Any, Dict, List, Optional, Set


class FilteringService:
    """Handles filtering of existing animals and tracking of filtering stats.

    Encapsulates the skip_existing_animals logic and external ID recording
    for stale detection.
    """

    def __init__(
        self,
        database_service=None,
        session_manager=None,
        organization_id: Optional[int] = None,
        skip_existing_animals: bool = False,
        logger: Optional[logging.Logger] = None,
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

    def get_existing_animal_urls(self) -> Set[str]:
        """Get set of existing animal URLs for this organization."""
        if self.database_service:
            return self.database_service.get_existing_animal_urls(self.organization_id)

        self.logger.warning("No DatabaseService available - cannot check existing animals")
        return set()

    def filter_existing_urls(self, all_urls: List[str]) -> List[str]:
        """Filter out existing URLs if skip_existing_animals is enabled."""
        if not self.skip_existing_animals:
            self.logger.debug(f"skip_existing_animals is False, returning all {len(all_urls)} URLs")
            return all_urls

        self.logger.info("Checking database for existing animals...")
        existing_urls = self.get_existing_animal_urls()

        if not existing_urls:
            self.logger.info(f"No existing animals found in database, processing all {len(all_urls)} URLs")
            return all_urls

        filtered_urls = [url for url in all_urls if url not in existing_urls]
        skipped_count = len(all_urls) - len(filtered_urls)

        self.logger.info(f"Found {len(existing_urls)} existing animals in database")
        self.logger.info(f"Filtered results: Skipped {skipped_count} existing, will process {len(filtered_urls)} new animals")

        if skipped_count == 0 and len(existing_urls) > 0:
            self.logger.warning("No URLs were filtered despite having existing animals - possible URL mismatch!")

        return filtered_urls

    def filter_existing_animals(self, animals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Filter existing animals and record ALL found external_ids for stale detection.

        CRITICAL: Records all external_ids BEFORE filtering so stale detection
        knows which dogs were actually found on the website.

        Args:
            animals: List of animal data dicts, each containing 'external_id' and 'adoption_url'

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

        all_urls = [animal.get("adoption_url", "") for animal in animals]
        filtered_urls = self.filter_existing_urls(all_urls)

        skipped_count = len(all_urls) - len(filtered_urls)
        self._set_filtering_stats(len(all_urls), skipped_count)

        url_to_animal = {animal.get("adoption_url", ""): animal for animal in animals}
        filtered_animals = [url_to_animal[url] for url in filtered_urls if url in url_to_animal]

        self.logger.info(f"Filtering: {skipped_count} existing (skipped), {len(filtered_animals)} new " f"({skipped_count / len(all_urls) * 100:.1f}% skip rate)")

        return filtered_animals

    def _set_filtering_stats(self, total_before_filter: int, total_skipped: int):
        """Set statistics about skip_existing_animals filtering."""
        self._total_animals_before_filter = total_before_filter
        self._total_animals_skipped = total_skipped
        self.logger.info(f"Filtering stats: {total_before_filter} found, {total_skipped} skipped, " f"{total_before_filter - total_skipped} to process")

    def get_correct_animals_found_count(self, animals_data: List) -> int:
        """Get correct animals_found count for logging.

        Returns total_animals_before_filter if filtering was applied and stats were set,
        otherwise returns the length of animals_data.

        This ensures dogs_found shows total animals found on website (e.g., 35),
        not the filtered count (e.g., 0) when skip_existing_animals=true.
        """
        if self.skip_existing_animals and self._total_animals_before_filter > 0:
            return self._total_animals_before_filter
        return len(animals_data)

    def record_all_found_external_ids(self, animals_data: List[Dict[str, Any]]) -> int:
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
