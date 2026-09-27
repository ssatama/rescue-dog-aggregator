"""One run's save counts (#569), in place of a loose dict."""

from dataclasses import dataclass, field


@dataclass
class ScrapeStats:
    animals_added: int = 0
    animals_updated: int = 0
    animals_unchanged: int = 0
    animals_rejected: int = 0
    save_errors: int = 0
    # Rejections by AnimalValidator.rejection_reason
    rejected: dict[str, int] = field(default_factory=dict)
    rejected_ids: list[str | None] = field(default_factory=list)
    save_error_ids: list[str | None] = field(default_factory=list)
    # Added to by ImageProcessingService.batch_process_images
    images_uploaded: int = 0
    images_reused: int = 0
    images_failed: int = 0
    # Set by the stale-detection phase: a partial failure skips it
    potential_failure_detected: bool = False

    def reject(self, external_id: str | None, reason: str) -> None:
        self.animals_rejected += 1
        self.rejected[reason] = self.rejected.get(reason, 0) + 1
        self.rejected_ids.append(external_id)

    def save_failed(self, external_id: str | None) -> None:
        self.save_errors += 1
        self.save_error_ids.append(external_id)

    def saved(self, action: str) -> None:
        """Count a save by its outcome: "added", "updated" or "no_change"."""
        if action == "added":
            self.animals_added += 1
        elif action == "updated":
            self.animals_updated += 1
        elif action == "no_change":
            self.animals_unchanged += 1

    @property
    def lost(self) -> int:
        """Dogs collected but not saved: rejected or failed."""
        return self.animals_rejected + self.save_errors
