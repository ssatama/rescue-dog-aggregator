"""Re-resolve stored breed fields from the organisation's original text.

A scrape cannot repair these rows. Most organisations run with
`skip_existing_animals: true`, and filter_existing_animals drops existing dogs
before save_animal, so an existing animal never reaches process_animal again.
Only newly listed dogs get current standardization; everything already stored
keeps whatever the resolver produced on the day it was first seen.

The planning step is pure so the rewrite can be reviewed before it is applied.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Any

from utils.breed_registry import resolve_breed
from utils.breed_utils import generate_breed_slug

DERIVED_FIELDS = (
    "primary_breed",
    "secondary_breed",
    "breed_slug",
    "breed_type",
    "breed_group",
    "standardized_breed",
    "breed_confidence",
)


@dataclass(frozen=True)
class AnimalBreedRow:
    """One stored animal's breed columns."""

    id: int
    breed_raw: str | None
    breed: str | None
    primary_breed: str | None
    secondary_breed: str | None
    breed_slug: str | None
    breed_type: str | None
    breed_group: str | None


@dataclass(frozen=True)
class BreedUpdate:
    """A row that resolves differently today than what is stored."""

    animal_id: int
    source_text: str
    fields: dict[str, Any]
    was: dict[str, Any]


def _display_name(identity) -> str:
    if identity.parents:
        return identity.primary
    if identity.secondary:
        return f"{identity.primary} x {identity.secondary}"
    return f"{identity.primary} Cross" if identity.is_cross else identity.primary


def _resolved_fields(source: str) -> dict[str, Any]:
    identity = resolve_breed(source)

    if identity.primary is None:
        name = "Mixed Breed" if identity.breed_type == "mixed" else "Unknown"
        return {
            "primary_breed": name,
            "secondary_breed": None,
            "breed_slug": identity.slug or generate_breed_slug(name),
            "breed_type": identity.breed_type,
            "breed_group": identity.group,
            "standardized_breed": name,
            "breed_confidence": identity.confidence,
        }

    return {
        "primary_breed": identity.primary,
        "secondary_breed": identity.secondary,
        "breed_slug": identity.slug,
        "breed_type": identity.breed_type,
        "breed_group": identity.group,
        "standardized_breed": _display_name(identity),
        "breed_confidence": identity.confidence,
    }


def plan_restandardization(rows: Iterable[AnimalBreedRow]) -> list[BreedUpdate]:
    """Return the rows whose stored breed fields disagree with the registry."""
    updates: list[BreedUpdate] = []

    for row in rows:
        source = row.breed_raw or row.breed
        if not source:
            continue

        fields = _resolved_fields(source)
        stored = {
            "primary_breed": row.primary_breed,
            "secondary_breed": row.secondary_breed,
            "breed_slug": row.breed_slug,
            "breed_type": row.breed_type,
            "breed_group": row.breed_group,
        }
        if all(fields[key] == stored[key] for key in stored):
            continue

        updates.append(BreedUpdate(animal_id=row.id, source_text=source, fields=fields, was=stored))

    return updates
