#!/usr/bin/env python3
"""Backfill ages that were fabricated rather than scraped.

    uv run python management/age_commands.py backfill-ages
    uv run python management/age_commands.py backfill-ages --apply

Dry run by default. See management/age_backfill.py for why a scrape cannot
repair these rows.
"""

import argparse
import logging
import os
import sys

import psycopg2
from psycopg2.extras import RealDictCursor
from rich.console import Console
from rich.table import Table

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG  # noqa: E402
from management.age_backfill import AgeClear, plan_clears, rows_from_records, summarise  # noqa: E402

logger = logging.getLogger(__name__)

FETCH_QUERY = """
    SELECT a.id, a.age_text, a.age_min_months, a.age_max_months, o.config_id AS organization
    FROM animals a
    LEFT JOIN organizations o ON o.id = a.organization_id
    WHERE a.age_text IS NOT NULL
"""


def _connect():
    """Connect to the database this command is meant to act on.

    Migrations target production through RAILWAY_DATABASE_URL, so this follows
    the same convention. Without it the command silently reads the local
    database, which is not where the rows needing repair live.
    """
    database_url = os.getenv("RAILWAY_DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(**DB_CONFIG)


def describe_target() -> str:
    return "production (RAILWAY_DATABASE_URL)" if os.getenv("RAILWAY_DATABASE_URL") else f"local ({DB_CONFIG.get('database')})"


def fetch_age_rows() -> list:
    with _connect() as conn, conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(FETCH_QUERY)
        return rows_from_records([dict(record) for record in cursor.fetchall()])


def apply_clears(clears: list[AgeClear]) -> int:
    """Set age_text to NULL for the planned rows. Returns rows changed."""
    if not clears:
        return 0

    with _connect() as conn, conn.cursor() as cursor:
        cursor.execute(
            "UPDATE animals SET age_text = NULL WHERE id = ANY(%s)",
            ([clear.animal_id for clear in clears],),
        )
        changed = cursor.rowcount
        conn.commit()
    return changed


def render_plan(clears: list[AgeClear], console: Console) -> None:
    if not clears:
        console.print("\n[green]No fabricated ages stored.[/green]\n")
        return

    table = Table(title=f"{len(clears)} rows to clear", show_header=True, header_style="bold")
    table.add_column("organization")
    table.add_column("stored age_text")
    table.add_column("rows", justify="right")

    by_org = summarise(clears)
    stored_by_org: dict[str, set[str]] = {}
    for clear in clears:
        stored_by_org.setdefault(clear.organization or "unknown", set()).add(clear.was or "")

    for organization, count in by_org.items():
        table.add_row(organization, ", ".join(sorted(stored_by_org[organization])), str(count))

    console.print(table)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Age data operations")
    parser.add_argument("command", choices=["backfill-ages"])
    parser.add_argument("--apply", action="store_true", help="Write the changes (default is a dry run)")
    args = parser.parse_args()

    console = Console()
    console.print(f"[dim]target: {describe_target()}[/dim]")

    clears = plan_clears(fetch_age_rows())
    render_plan(clears, console)

    if not clears:
        return 0

    if not args.apply:
        logger.info("Dry run - pass --apply to clear these %s rows", len(clears))
        return 0

    logger.info("Cleared age_text on %s rows", apply_clears(clears))
    return 0


if __name__ == "__main__":
    sys.exit(main())
