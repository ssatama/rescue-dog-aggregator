"""Registered data fixes for management/backfill_commands.py.

Each scraper fix whose stored rows need repair registers one step here. A step
is a read-only query plus a pure planning function, so `backfill_commands.py
plan --steps` shows its change before anything is written, and `apply` runs
it once, after the forced re-scrape (epic #554: every backfill runs together
in #572). Steps are idempotent: they are planned from fresh rows at apply time,
so a step that already ran plans nothing.

To add one: write the pure planner next to the fix, then append a Step to STEPS.
"""

import json
import re
from collections.abc import Callable
from dataclasses import dataclass
from datetime import date
from typing import Any

from management.age_backfill import plan_clears, rows_from_records
from scrapers.misis_rescue.detail_parser import dob_bullet
from utils.birth_dates import _as_date, _as_int, resolve_age, today_utc


@dataclass(frozen=True)
class Change:
    """One column of one stored dog, as it is and as the step would leave it."""

    animal_id: int
    organization: str | None
    column: str
    was: Any
    now: Any


@dataclass(frozen=True)
class Step:
    name: str
    summary: str
    # Literal SQL with no parameters, so it also runs over the admin query API.
    # Must select `organization` (the config_id) for --org filtering.
    fetch_sql: str
    plan: Callable[[list[dict[str, Any]]], list[Change]]


def _plan_age_clears(records: list[dict[str, Any]]) -> list[Change]:
    return [Change(clear.animal_id, clear.organization, "age_text", clear.was, None) for clear in plan_clears(rows_from_records(records))]


# Rescues whose properties.breed is the text their site shows (checked against
# production on 2026-09-26). Until #560 they stored the standardized name as
# breed_raw. Many Tears is left out: its properties.breed is sometimes another
# field ("Can be the only dog").
BREED_SOURCE_ORGS = ("animalrescuebosnia", "dogstrust", "santerpawsbulgarianrescue", "woof-project")


def _plan_breed_raw(records: list[dict[str, Any]]) -> list[Change]:
    changes = []
    for record in records:
        source = (record["source_breed"] or "").strip(" ")  # spaces only, as btrim in fetch_sql
        if source and source != record["breed_raw"]:
            changes.append(Change(record["id"], record["organization"], "breed_raw", record["breed_raw"], source))
    return changes


# Where each rescue that publishes a date of birth keeps it in a stored row,
# checked against production on 2026-09-26. MISIs' is one of its bullets.
DOB_SOURCES = {
    "animalrescuebosnia": "a.properties->>'date_of_birth'",
    "daisyfamilyrescue": "a.age_text",
    "pets-in-turkey": "a.properties->>'birth_date'",
    "santerpawsbulgarianrescue": "a.properties->>'age_text'",
    "tierschutzverein-europa": "a.properties->>'Geburtstag'",
}
AGE_COLUMNS = ("birth_date_min", "birth_date_max", "age_observed_at", "age_min_months", "age_max_months")


def _stored_dob(record: dict[str, Any]) -> str | None:
    if record["date_of_birth"]:
        return record["date_of_birth"]
    bullets = record.get("bullets")
    if isinstance(bullets, str):
        bullets = json.loads(bullets)
    return dob_bullet([str(bullet) for bullet in bullets]) if isinstance(bullets, list) else None


def _plan_birth_dates(records: list[dict[str, Any]], today: date | None = None) -> list[Change]:
    """The birth range a save would store for each active dog, and its months as of today.

    The same rule as a re-scrape (utils/birth_dates.resolve_age with the row as
    stored): a published date of birth wins; otherwise the stored age is
    anchored where it was read, which for rows from before #561 is created_at.
    """
    today = today or today_utc()
    changes = []
    for record in records:
        age = resolve_age(
            date_of_birth=_stored_dob(record),
            age_text=record["age_text"],
            min_months=_as_int(record["age_min_months"]),
            max_months=_as_int(record["age_max_months"]),
            today=today,
            stored=record,
        )
        for column in AGE_COLUMNS:
            was, now = record[column], getattr(age, column)
            same = _as_int(was) == now if column.startswith("age_m") else _as_date(was) == now
            if not same:
                changes.append(Change(record["id"], record["organization"], column, was, now))
    return changes


STEPS: dict[str, Step] = {
    step.name: step
    for step in [
        Step(
            name="clear-fabricated-ages",
            summary='age_text placeholders ("Unknown", "unbekannt") with no parsed range become NULL',
            fetch_sql="""
                SELECT a.id, a.age_text, a.age_min_months, a.age_max_months, o.config_id AS organization
                FROM animals a
                LEFT JOIN organizations o ON o.id = a.organization_id
                WHERE a.age_text IS NOT NULL AND a.age_min_months IS NULL AND a.age_max_months IS NULL
            """,
            plan=_plan_age_clears,
        ),
        Step(
            name="restore-breed-raw",
            summary="breed_raw goes back to the rescue's own text in properties.breed (#560)",
            fetch_sql=f"""
                SELECT a.id, a.properties->>'breed' AS source_breed, a.breed_raw, o.config_id AS organization
                FROM animals a
                JOIN organizations o ON o.id = a.organization_id
                WHERE o.config_id IN ({", ".join(f"'{org}'" for org in BREED_SOURCE_ORGS)})
                  AND btrim(a.properties->>'breed') <> ''
                  AND btrim(a.properties->>'breed') IS DISTINCT FROM a.breed_raw
            """,
            plan=_plan_breed_raw,
        ),
        Step(
            name="derive-birth-dates",
            summary="active dogs get a birth-date range and ages that keep up with time (#561)",
            # to_jsonb reads the #561 columns as NULL on a database without them,
            # so the plan runs before the migration is applied.
            fetch_sql=f"""
                SELECT a.id, o.config_id AS organization, a.age_text, a.age_min_months, a.age_max_months, a.created_at,
                       to_jsonb(a)->>'birth_date_min' AS birth_date_min,
                       to_jsonb(a)->>'birth_date_max' AS birth_date_max,
                       to_jsonb(a)->>'age_observed_at' AS age_observed_at,
                       CASE o.config_id {" ".join(f"WHEN '{org}' THEN {source}" for org, source in DOB_SOURCES.items())} END AS date_of_birth,
                       CASE WHEN o.config_id = 'misisrescue' THEN a.properties->'raw_bullet_points' END AS bullets
                FROM animals a
                JOIN organizations o ON o.id = a.organization_id
                WHERE a.active
            """,
            plan=_plan_birth_dates,
        ),
    ]
}

_COLUMN = re.compile(r"^[a-z_][a-z0-9_]*$")


def get_steps(names: list[str]) -> list[Step]:
    unknown = [name for name in names if name not in STEPS]
    if unknown:
        raise ValueError(f"Unknown backfill step(s): {', '.join(unknown)}. Known: {', '.join(STEPS)}")
    return [STEPS[name] for name in names]


def plan_step(step: Step, records: list[dict[str, Any]], organizations: set[str] | None = None) -> list[Change]:
    """The step's changes, limited to the given organizations when set."""
    changes = step.plan(records)
    if organizations:
        changes = [change for change in changes if change.organization in organizations]
    return changes


def update_statements(changes: list[Change]) -> list[tuple[str, tuple[Any, ...]]]:
    """One parameterised UPDATE per change. Column names come from code, but are checked anyway."""
    statements = []
    for change in changes:
        if not _COLUMN.match(change.column):
            raise ValueError(f"Refusing to update suspicious column name {change.column!r}")
        statements.append((f"UPDATE animals SET {change.column} = %s WHERE id = %s", (change.now, change.animal_id)))
    return statements
