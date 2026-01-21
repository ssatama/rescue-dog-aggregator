"""Animal data validation service."""

import html
import logging
import unicodedata
from typing import Any

from scrapers.validation.constants import (
    ERROR_PATTERNS,
    GIFT_CARD_PATTERNS,
    KNOWN_ORG_PREFIXES,
    MAX_DIGIT_RATIO,
    MIN_NAME_LENGTH,
    PRICE_PATTERN,
    PROMO_KEYWORDS_PATTERN,
    SKU_PATTERN,
)


class AnimalValidator:
    """Validates and normalizes animal data for scrapers."""

    def __init__(self, logger: logging.Logger | None = None):
        self.logger = logger or logging.getLogger(__name__)

    def is_valid_name(self, name: str) -> bool:
        """Check if animal name is valid.

        Returns True if valid, False if invalid.
        This is the inverse of the old _is_invalid_name method.
        """
        return not self._is_invalid_name(name)

    def _is_invalid_name(self, name: str) -> bool:
        """Check if extracted name indicates a scraping error or invalid data.

        Internal method - use is_valid_name() for public API.
        """
        if not name or not isinstance(name, str):
            return True

        if name.strip().isdigit():
            return True

        digit_count = sum(c.isdigit() for c in name)
        alpha_count = sum(c.isalpha() for c in name)
        if digit_count > 0 and alpha_count > 0:
            digit_ratio = digit_count / len(name)
            if digit_ratio > MAX_DIGIT_RATIO:
                return True

        if len(name.strip()) < MIN_NAME_LENGTH:
            return True

        name_normalized = name.lower().strip()
        name_normalized = name_normalized.replace("'", "").replace("'", "").replace("`", "")

        if any(pattern in name_normalized for pattern in ERROR_PATTERNS):
            return True

        if any(pattern in name_normalized for pattern in GIFT_CARD_PATTERNS):
            return True

        if "http://" in name_normalized or "https://" in name_normalized or "www." in name_normalized:
            return True

        if PRICE_PATTERN.search(name):
            return True

        if SKU_PATTERN.match(name.strip()):
            return True

        if PROMO_KEYWORDS_PATTERN.match(name.strip()):
            return True

        return False

    def normalize_name(self, name: str) -> str:
        """Normalize animal name by fixing encoding issues and HTML entities."""
        if not name or not isinstance(name, str):
            return name

        name = html.unescape(name)

        try:
            if "Ã" in name:
                name = name.encode("latin1").decode("utf-8")
        except (UnicodeDecodeError, UnicodeEncodeError):
            pass

        name = unicodedata.normalize("NFC", name)
        name = name.strip()

        return name

    def validate_animal_data(self, animal_data: dict[str, Any]) -> tuple[bool, dict[str, Any]]:
        """Validate animal data dictionary for required fields and invalid names.

        Returns (is_valid, normalized_data) tuple.
        The normalized_data contains the updated name if normalization was applied.
        """
        if not animal_data or not isinstance(animal_data, dict):
            return False, animal_data

        required_fields = ["name", "external_id", "adoption_url"]
        for field in required_fields:
            if not animal_data.get(field):
                return False, animal_data

        name = animal_data.get("name", "")
        normalized_name = self.normalize_name(name)

        if self._is_invalid_name(normalized_name):
            self.logger.warning(f"Rejecting animal with invalid name: {name}")
            return False, animal_data

        result_data = animal_data.copy()
        result_data["name"] = normalized_name

        primary_image_url = animal_data.get("primary_image_url")
        if primary_image_url == "":
            self.logger.error(f"Rejecting animal '{normalized_name}' (ID: {animal_data.get('external_id')}) with empty image URL")
            return False, result_data

        if primary_image_url is None:
            self.logger.warning(f"Skipping animal '{normalized_name}' (ID: {animal_data.get('external_id')}) - no valid image URL found")
            return False, result_data

        return True, result_data

    def validate_external_id(self, external_id: str, org_config_id: str | None = None) -> bool:
        """Validate that external_id follows organization prefix pattern.

        Returns True if valid or if validation can't be performed.
        Logs a warning if the pattern doesn't match but doesn't fail.
        """
        if not external_id:
            return True

        has_prefix = any(external_id.startswith(prefix) for prefix in KNOWN_ORG_PREFIXES)
        is_numeric = external_id.isdigit()

        is_tierschutzverein_pattern = org_config_id == "tierschutzverein-europa" and "-" in external_id and len(external_id) > 10

        if not has_prefix and not is_numeric and not is_tierschutzverein_pattern:
            self.logger.warning(
                f"External ID '{external_id}' does not follow organization prefix pattern. "
                f"This may cause collisions with other organizations. "
                f"Consider using a prefix like 'org-' to ensure uniqueness."
            )

        return True
