"""Restore breed_raw to the rescue's own text (#560).

Until #560 most scrapers standardized a dog in collect_data and save_animal
standardized it again, so breed_raw held the standardized name: Dogs Trust's
"Poodle (Toy)" was stored as "Toy Poodle". breed_restandardize.py re-resolves
from breed_raw, so it could never correct those rows.

Where the scraper also kept its text in properties.breed, that text is
restored and the derived breed columns are resolved from it again. The forced
re-scrape in #572 rewrites listed dogs anyway; this repairs the rest.

The planning step is pure so the change can be reviewed before it is applied.
"""

from typing import Any

from management.breed_restandardize import DERIVED_FIELDS, resolved_fields

# Rescues whose properties.breed is the text their site shows (checked against
# production on 2026-09-26). Many Tears is left out: its properties.breed is
# sometimes another field ("Can be the only dog").
SOURCE_TEXT_ORGS = ("animalrescuebosnia", "dogstrust", "santerpawsbulgarianrescue", "woof-project")


def _same(stored: Any, planned: Any) -> bool:
    """Equal, reading numbers the way either database driver returns them."""
    if isinstance(planned, float) and stored is not None:
        return round(float(stored), 4) == round(planned, 4)
    return stored == planned


def plan_breed_raw(records: list[dict[str, Any]]) -> list[tuple[int, str | None, str, Any, Any]]:
    """(animal id, organization, column, was, now) for every column to change.

    A row changes when its source text differs from breed_raw: breed_raw takes
    the source text, and each derived column that resolves differently from it
    takes the new value.
    """
    changes = []
    for record in records:
        source = (record.get("source_breed") or "").strip()
        if not source or source == record.get("breed_raw"):
            continue
        animal_id, organization = record["id"], record.get("organization")
        changes.append((animal_id, organization, "breed_raw", record.get("breed_raw"), source))
        fields = resolved_fields(source)
        for column in DERIVED_FIELDS:
            if not _same(record.get(column), fields[column]):
                changes.append((animal_id, organization, column, record.get(column), fields[column]))
    return changes
