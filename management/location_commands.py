#!/usr/bin/env python3
"""Store a readable location, and the country it is in, on dogs scraped
before scrapers did (#505, #702).

    uv run python management/location_commands.py display-locations
    uv run python management/location_commands.py display-locations --apply

Dry run by default. Most rescues skip dogs they already have, so only a
backfill sets properties.display_location and properties.location_country on
them. Prints coverage per rescue and the dogs per country.
"""

import argparse
import json
import logging
import os
import sys
from collections import Counter
from contextlib import closing

import psycopg2
from psycopg2.extras import RealDictCursor
from rich.console import Console
from rich.table import Table

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG  # noqa: E402
from scrapers.validation.location_cleaner import locate  # noqa: E402
from services.revalidation_client import invalidate_sync  # noqa: E402

logger = logging.getLogger(__name__)

FETCH_QUERY = """
    SELECT a.id, a.slug, a.properties, o.config_id AS organization, o.service_regions, o.country
    FROM animals a
    LEFT JOIN organizations o ON o.id = a.organization_id
    WHERE a.active
"""


LOCATION_KEYS = ("display_location", "location_country")


def plan_locations(records: list[dict]) -> list[tuple[int, str, dict]]:
    """(id, slug, new properties) for rows whose display location or country would change. Pure."""
    changes = []
    for record in sorted(records, key=lambda r: r["id"]):
        properties = record["properties"] or {}
        located = locate(properties, record["service_regions"], record["country"])
        if any(located.get(key) != properties.get(key) for key in LOCATION_KEYS):
            changes.append((record["id"], record["slug"], located))
    return changes


def coverage(records: list[dict], changes: list[tuple[int, str, dict]]) -> dict[str, tuple[int, int, int]]:
    """Per rescue: dogs, with a display location now, with one after --apply."""
    planned = {animal_id: properties for animal_id, _, properties in changes}
    dogs, before, after = Counter(), Counter(), Counter()
    for record in records:
        org = record["organization"] or "unknown"
        properties = record["properties"] or {}
        dogs[org] += 1
        before[org] += bool(properties.get("display_location"))
        after[org] += bool(planned.get(record["id"], properties).get("display_location"))
    return {org: (dogs[org], before[org], after[org]) for org, _ in dogs.most_common()}


def countries(records: list[dict], changes: list[tuple[int, str, dict]]) -> Counter:
    """Dogs per location_country after --apply; None counts the unknown."""
    planned = {animal_id: properties for animal_id, _, properties in changes}
    return Counter(planned.get(r["id"], r["properties"] or {}).get("location_country") for r in records)


def _connect():
    """Production through RAILWAY_DATABASE_URL, like the other backfill commands; local otherwise."""
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

    table = Table(title="Display location coverage (active dogs)", header_style="bold")
    for column in ("rescue", "dogs", "before", "after"):
        table.add_column(column, justify="left" if column == "rescue" else "right")
    for org, (dogs, before, after) in coverage(records, changes).items():
        table.add_row(org, str(dogs), str(before), str(after))
    console.print(table)

    by_country = Table(title="Dogs per country after --apply", header_style="bold")
    by_country.add_column("country")
    by_country.add_column("dogs", justify="right")
    for country, dogs in countries(records, changes).most_common():
        by_country.add_row(country or "unknown", str(dogs))
    console.print(by_country)

    if not changes or not args.apply:
        if changes:
            logger.info("Dry run - pass --apply to write %s rows", len(changes))
        return 0

    with closing(_connect()) as conn, conn, conn.cursor() as cursor:
        for animal_id, _, properties in changes:
            # Merge only these keys so a scrape running meanwhile keeps its writes.
            cursor.execute(
                "UPDATE animals SET properties = (coalesce(properties, '{}'::jsonb) - 'location_country') || %s::jsonb WHERE id = %s",
                (json.dumps({key: properties[key] for key in LOCATION_KEYS if key in properties}), animal_id),
            )
        conn.commit()
    logger.info("Set the location on %s dogs", len(changes))

    invalidate_sync(tags=["animals", *(slug for _, slug, _ in changes)])
    return 0


if __name__ == "__main__":
    sys.exit(main())
