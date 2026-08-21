"""Clear ages that were fabricated rather than scraped.

Six scrapers wrote the string "Unknown" into age_text under a "Zero NULLs
compliance" convention. Nothing required it: the column is nullable,
api.models.dog types it `str | None`, and the frontend schema marks it
optional. The result reached the page as though it had been read from the
organisation's listing.

The scrapers no longer produce it, but stored rows will not repair
themselves: most organisations run with skip_existing_animals, so
filter_existing_animals drops an existing dog before save_animal and it never
reaches process_animal again. Only a backfill fixes what is already there.

The planning step is pure so the change can be reviewed before it is applied.
"""

from dataclasses import dataclass
from typing import Any

# Values that are placeholders rather than anything an organisation published.
FABRICATED_AGE_TEXTS = ("unknown", "n/a", "none", "not known", "")


@dataclass(frozen=True)
class AgeRow:
    """One stored animal's age columns."""

    id: int
    age_text: str | None
    age_min_months: int | None
    age_max_months: int | None
    organization: str | None = None


@dataclass(frozen=True)
class AgeClear:
    """A row whose age_text should become NULL."""

    animal_id: int
    was: str | None
    organization: str | None


def is_fabricated(row: AgeRow) -> bool:
    """True when age_text is a placeholder and no real range backs it.

    A row carrying an actual month range came from a parsed age, so its
    age_text is descriptive even if it reads oddly. Only clear rows where the
    placeholder is the sole age signal.
    """
    if row.age_text is None:
        return False
    if row.age_min_months is not None or row.age_max_months is not None:
        return False
    return row.age_text.strip().lower() in FABRICATED_AGE_TEXTS


def plan_clears(rows: list[AgeRow]) -> list[AgeClear]:
    """Rows to clear. Pure: takes rows, returns the intended change."""
    return [AgeClear(animal_id=row.id, was=row.age_text, organization=row.organization) for row in sorted(rows, key=lambda r: r.id) if is_fabricated(row)]


def summarise(clears: list[AgeClear]) -> dict[str, int]:
    """Count the planned clears per organisation."""
    counts: dict[str, int] = {}
    for clear in clears:
        key = clear.organization or "unknown"
        counts[key] = counts.get(key, 0) + 1
    return dict(sorted(counts.items(), key=lambda item: -item[1]))


def rows_from_records(records: list[dict[str, Any]]) -> list[AgeRow]:
    """Build rows from database records."""
    return [
        AgeRow(
            id=record["id"],
            age_text=record["age_text"],
            age_min_months=record["age_min_months"],
            age_max_months=record["age_max_months"],
            organization=record.get("organization"),
        )
        for record in records
    ]
