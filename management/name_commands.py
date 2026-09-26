#!/usr/bin/env python3
"""Clean stored dog names the way scrapers now clean new ones (#505).

    uv run python management/name_commands.py clean-names
    uv run python management/name_commands.py clean-names --apply

Dry run by default. Most rescues run with skip_existing_animals, so a stored
"Ally OVERLOOKED" never reaches the validator again; only a backfill fixes it.
Slugs are left alone so no URL changes.
"""

import argparse
import logging
import os
import sys
from contextlib import closing
from dataclasses import dataclass

import psycopg2
from psycopg2.extras import Json, RealDictCursor
from rich.console import Console
from rich.table import Table

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG  # noqa: E402
from scrapers.validation.name_cleaner import clean_name  # noqa: E402
from services.revalidation_client import invalidate_sync  # noqa: E402

logger = logging.getLogger(__name__)

FETCH_QUERY = """
    SELECT a.id, a.name, a.breed, a.slug, a.properties, o.config_id AS organization
    FROM animals a
    LEFT JOIN organizations o ON o.id = a.organization_id
    WHERE a.active AND a.name IS NOT NULL
"""


@dataclass(frozen=True)
class Rename:
    animal_id: int
    slug: str
    was: str
    name: str
    properties: dict
    organization: str | None


def plan_renames(records: list[dict]) -> list[Rename]:
    """Rows whose name the cleaner would change. Pure, for review before --apply."""
    renames = []
    for record in sorted(records, key=lambda r: r["id"]):
        name, overlooked = clean_name(record["name"], record["breed"])
        if name == record["name"] and not overlooked:
            continue
        properties = dict(record["properties"] or {})
        properties.setdefault("raw_name", record["name"])
        if overlooked:
            properties["overlooked"] = True
        if name == record["name"] and properties == (record["properties"] or {}):
            continue
        renames.append(Rename(record["id"], record["slug"], record["name"], name, properties, record["organization"]))
    return renames


def _connect():
    """Production through RAILWAY_DATABASE_URL, like age_commands; local otherwise."""
    database_url = os.getenv("RAILWAY_DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(**DB_CONFIG)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description="Dog name operations")
    parser.add_argument("command", choices=["clean-names"])
    parser.add_argument("--apply", action="store_true", help="Write the changes (default is a dry run)")
    args = parser.parse_args()

    console = Console()
    console.print(f"[dim]target: {'production (RAILWAY_DATABASE_URL)' if os.getenv('RAILWAY_DATABASE_URL') else 'local'}[/dim]")

    with closing(_connect()) as conn, conn, conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute(FETCH_QUERY)
        renames = plan_renames([dict(r) for r in cursor.fetchall()])

    table = Table(title=f"{len(renames)} names to clean", header_style="bold")
    for column in ("id", "organization", "stored", "clean"):
        table.add_column(column)
    for r in renames:
        table.add_row(str(r.animal_id), r.organization or "", r.was, r.name)
    console.print(table)

    if not renames or not args.apply:
        if renames:
            logger.info("Dry run - pass --apply to write these %s rows", len(renames))
        return 0

    with closing(_connect()) as conn, conn, conn.cursor() as cursor:
        for r in renames:
            cursor.execute("UPDATE animals SET name = %s, properties = %s WHERE id = %s", (r.name, Json(r.properties), r.animal_id))
        conn.commit()
    logger.info("Cleaned %s names", len(renames))

    invalidate_sync(tags=["animals", *(r.slug for r in renames)])
    return 0


if __name__ == "__main__":
    sys.exit(main())
