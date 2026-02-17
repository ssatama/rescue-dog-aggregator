"""Pure functions for preparing animal data before database insertion.

Extracted from DatabaseService._create_animal_with_connection to enable
independent testing and separation of concerns.
"""

import json
import logging
import time
from dataclasses import dataclass
from typing import Any

from utils.optimized_standardization import parse_age_text, standardize_size_value
from utils.slug_generator import generate_unique_animal_slug
from utils.standardization import standardize_breed

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class PreparedAnimalData:
    """Standardized animal data ready for database insertion."""

    language: str
    standardized_breed: str
    breed_group: str
    final_size: str | None
    final_standardized_size: str | None
    age_months_min: int | None
    age_months_max: int | None
    breed_type: str | None
    primary_breed: str | None
    secondary_breed: str | None
    breed_slug: str | None
    breed_confidence: float | None


def prepare_animal_data(animal_data: dict[str, Any]) -> PreparedAnimalData:
    """Standardize breed, age, size, and language from raw animal data.

    Args:
        animal_data: Raw animal data dictionary from scraper

    Returns:
        PreparedAnimalData with all fields ready for INSERT
    """
    description_text = f"{animal_data.get('name', '')} {animal_data.get('breed', '')} {animal_data.get('age_text', '')}"
    language = _detect_language(description_text)

    standardized_breed, breed_group, size_estimate = standardize_breed(animal_data.get("breed", ""))

    if "age_min_months" in animal_data and "age_max_months" in animal_data:
        age_months_min = animal_data.get("age_min_months")
        age_months_max = animal_data.get("age_max_months")
    else:
        age_info = parse_age_text(animal_data.get("age_text", ""))
        age_months_min = age_info.min_months
        age_months_max = age_info.max_months

    final_size = animal_data.get("size") or animal_data.get("standardized_size")
    final_standardized_size = animal_data.get("standardized_size") or size_estimate or standardize_size_value(animal_data.get("size"))

    final_standardized_breed = animal_data.get("standardized_breed") or standardized_breed
    final_breed_group = animal_data.get("breed_category") or breed_group

    return PreparedAnimalData(
        language=language,
        standardized_breed=final_standardized_breed,
        breed_group=final_breed_group,
        final_size=final_size,
        final_standardized_size=final_standardized_size,
        age_months_min=age_months_min,
        age_months_max=age_months_max,
        breed_type=animal_data.get("breed_type"),
        primary_breed=animal_data.get("primary_breed"),
        secondary_breed=animal_data.get("secondary_breed"),
        breed_slug=animal_data.get("breed_slug"),
        breed_confidence=animal_data.get("breed_confidence"),
    )


def generate_temp_slug(animal_data: dict[str, Any], standardized_breed: str, conn: Any) -> str:
    """Generate temporary slug before animal ID is available.

    Args:
        animal_data: Raw animal data
        standardized_breed: Standardized breed name
        conn: Database connection for uniqueness check

    Returns:
        Temporary slug ending with '-temp'
    """
    try:
        temp_slug = generate_unique_animal_slug(
            name=animal_data.get("name"),
            breed=animal_data.get("breed"),
            standardized_breed=standardized_breed,
            animal_id=None,
            connection=conn,
        )
        return f"{temp_slug}-temp"
    except Exception as e:
        logger.error(f"Failed to generate temp slug for animal: {e}")
        fallback_slug = f"animal-{animal_data.get('external_id', str(int(time.time())))}-temp"
        return fallback_slug[:250]


def update_to_final_slug(
    cursor: Any,
    animal_id: int,
    animal_data: dict[str, Any],
    standardized_breed: str,
    conn: Any,
    log: logging.Logger,
) -> None:
    """Update animal with final slug containing ID.

    Args:
        cursor: Database cursor
        animal_id: Newly created animal ID
        animal_data: Raw animal data
        standardized_breed: Standardized breed name
        conn: Database connection for uniqueness check
        log: Logger instance
    """
    try:
        final_slug = generate_unique_animal_slug(
            name=animal_data.get("name"),
            breed=animal_data.get("breed"),
            standardized_breed=standardized_breed,
            animal_id=animal_id,
            connection=conn,
        )
        cursor.execute("UPDATE animals SET slug = %s WHERE id = %s", (final_slug, animal_id))
        log.debug(f"Updated animal {animal_id} slug from temp to final: {final_slug}")
    except Exception as e:
        log.error(f"Failed to update final slug for animal {animal_id}: {e}")


def sanitize_properties(properties: dict | None) -> str | None:
    """JSON-serialize and sanitize properties for Postgres.

    Args:
        properties: Properties dictionary or None

    Returns:
        JSON string with null bytes removed, or None
    """
    if properties is None:
        return None
    return json.dumps(sanitize_for_postgres(properties))


def sanitize_for_postgres(value: Any) -> Any:
    """Remove null bytes from strings that PostgreSQL cannot store."""
    if isinstance(value, str):
        return value.replace("\x00", "").replace("\u0000", "")
    if isinstance(value, dict):
        return {k: sanitize_for_postgres(v) for k, v in value.items()}
    if isinstance(value, list):
        return [sanitize_for_postgres(item) for item in value]
    return value


def _detect_language(text: str) -> str:
    """Detect language of text, defaulting to English."""
    try:
        from langdetect import DetectorFactory, detect

        DetectorFactory.seed = 0
        if not text or len(text.strip()) < 10:
            return "en"
        return detect(text)
    except Exception as e:
        logger.warning(f"Language detection failed, defaulting to English: {e}")
        return "en"
