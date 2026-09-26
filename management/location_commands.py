#!/usr/bin/env python3
"""Store a readable location on dogs scraped before scrapers did (#505).

    uv run python management/location_commands.py display-locations
    uv run python management/location_commands.py display-locations --apply

Dry run by default. Most rescues skip dogs they already have, so only a
backfill sets properties.display_location on them. Prints coverage per rescue.
"""

import argparse
import logging
import os
import sys
from collections import Counter
from contextlib import closing

import psycopg2
from psycopg2.extras import Json, RealDictCursor
from rich.console import Console
from rich.table import Table

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG  # noqa: E402
from scrapers.validation.location_cleaner import display_location  # noqa: E402
from services.revalidation_client import invalidate_sync  # noqa: E402

logger = logging.getLogger(__name__)

FETCH_QUERY = """
    SELECT a.id, a.slug, a.properties, o.config_id AS organization
    FROM animals a
    LEFT JOIN organizations o ON o.id = a.organization_id
    WHERE a.active AND a.status = 'available'
"""


def plan_locations(records: list[dict]) -> list[tuple[int, str, dict]]:
    """(id, slug, new properties) for rows whose display_location would change. Pure."""
    changes = []
    for record in sorted(records, key=lambda r: r["id"]):
        properties = record["properties"] or {}
        place = display_location(properties)
        if place and place != properties.get("display_location"):
            changes.append((record["id"], record["slug"], {**properties, "display_location": place}))
    return changes


def coverage(records: list[dict], changes: list[tuple[int, str, dict]]) -> dict[str, tuple[int, int, int]]:
    """Per rescue: dogs, with a display location now, with one after --apply."""
    changed = {animal_id for animal_id, _, _ in changes}
    dogs, before, after = Counter(), Counter(), Counter()
    for record in records:
        org = record["organization"] or "unknown"
        has_now = bool((record["properties"] or {}).get("display_location"))
        dogs[org] += 1
        before[org] += has_now
        after[org] += has_now or record["id"] in changed
    return {org: (dogs[org], before[org], after[org]) for org, _ in dogs.most_common()}


def _connect():
    """Production through RAILWAY_DATABASE_URL, like age_commands; local otherwise."""
    database_url = os.getenv("RAILWAY_DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(**DB_CONFIG)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Dog location operations")
    parser.add_argument("command", choices=["display-locations"])
    parser.add_argument("--apply", action="store_true", help="Write the changes (default is a dry run)")
    args = parser.parse_args()

    console = Console()
    console.print(f"[dim]target: {'production (RAILWAY_DATABASE_URL)' if os.getenv('RAILWAY_DATABASE_URL') else 'local'}[/dim]")

    with closing(_connect()) as conn, conn, conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(FETCH_QUERY)
        records = [dict(r) for r in cursor.fetchall()]
    changes = plan_locations(records)

    table = Table(title="Display location coverage (available dogs)", header_style="bold")
    for column in ("rescue", "dogs", "before", "after"):
        table.add_column(column, justify="left" if column == "rescue" else "right")
    for org, (dogs, before, after) in coverage(records, changes).items():
        table.add_row(org, str(dogs), str(before), str(after))
    console.print(table)

    if not changes or not args.apply:
        if changes:
            logger.info("Dry run - pass --apply to write %s rows", len(changes))
        return 0

    with closing(_connect()) as conn, conn, conn.cursor() as cursor:
        for animal_id, _, properties in changes:
            cursor.execute("UPDATE animals SET properties = %s WHERE id = %s", (Json(properties), animal_id))
        conn.commit()
    logger.info("Set display_location on %s dogs", len(changes))

    invalidate_sync(tags=["animals", *(slug for _, slug, _ in changes)])
    return 0


if __name__ == "__main__":
    sys.exit(main())
