"""Registered data fixes for management/backfill_commands.py.

Each scraper fix whose stored rows need repair registers one step here. A step
is a read-only query plus a pure planning function, so `backfill_commands.py
plan --steps` shows its change before anything is written, and `apply` runs
it once, after the forced re-scrape (epic #554: every backfill runs together
in #572). Steps are idempotent: they are planned from fresh rows at apply time,
so a step that already ran plans nothing.

To add one: write the pure planner next to the fix, then append a Step to STEPS.
"""

import re
from collections.abc import Callable
from dataclasses import dataclass
from typing import Any

from management.age_backfill import plan_clears, rows_from_records


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
