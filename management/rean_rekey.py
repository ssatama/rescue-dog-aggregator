#!/usr/bin/env python3
"""Move existing REAN rows onto the name-keyed external_id (#421).

    uv run python management/rean_rekey.py
    uv run python management/rean_rekey.py --apply

Dry run by default. Run it right after the scraper change deploys: a scrape
under the new IDs that finds no matching row inserts the dog again. Rows with
the same name on the same page are the same dog re-keyed by an age change (true
of every such group in production on 2026-09-23); the
most recently seen one takes the new ID, keeping its slug and profile, and the
older duplicates are left as they are (inactive).
"""

import argparse
import logging
import os
import sys
from dataclasses import dataclass

import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG  # noqa: E402
from scrapers.rean.dogs_scraper import rean_external_id  # noqa: E402

logger = logging.getLogger(__name__)

FETCH_QUERY = """
    SELECT a.id, a.name, a.external_id, a.last_seen_at, a.active
    FROM animals a
    JOIN organizations o ON o.id = a.organization_id
    WHERE o.config_id = 'rean'
"""


@dataclass(frozen=True)
class Rekey:
    animal_id: int
    name: str
    old_id: str
    new_id: str
    active: bool


def _page_type(external_id: str) -> str | None:
    for page_type in ("uk_foster", "romania"):
        if external_id.startswith(f"rean-{page_type}-"):
            return page_type
    return None


def plan_rekeys(rows: list[dict]) -> list[Rekey]:
    """One row per name-keyed ID moves to it: the most recently seen."""
    taken = {row["external_id"] for row in rows}
    candidates: dict[str, dict] = {}

    for row in rows:
        page_type = _page_type(row["external_id"])
        if not page_type or not row["name"]:
            continue
        new_id = rean_external_id(row["name"], page_type)
        if new_id == row["external_id"]:
            continue
        current = candidates.get(new_id)
        if current is None or (row["last_seen_at"], row["id"]) > (current["last_seen_at"], current["id"]):
            candidates[new_id] = row

    return sorted(
        (Rekey(row["id"], row["name"], row["external_id"], new_id, row["active"]) for new_id, row in candidates.items() if new_id not in taken),
        key=lambda rekey: rekey.animal_id,
    )


def _connect():
    database_url = os.getenv("RAILWAY_DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(**DB_CONFIG)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="Write the changes (default is a dry run)")
    args = parser.parse_args()

    logger.info("target: %s", "production (RAILWAY_DATABASE_URL)" if os.getenv("RAILWAY_DATABASE_URL") else f"local ({DB_CONFIG.get('database')})")

    with _connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(FETCH_QUERY)
            rekeys = plan_rekeys([dict(row) for row in cursor.fetchall()])

        for rekey in rekeys:
            logger.info("%6s %-10s %-8s %s -> %s", rekey.animal_id, rekey.name, "active" if rekey.active else "inactive", rekey.old_id, rekey.new_id)

        if not args.apply:
            logger.info("Dry run - pass --apply to re-key these %s rows", len(rekeys))
            return 0

        with conn.cursor() as cursor:
            for rekey in rekeys:
                cursor.execute("UPDATE animals SET external_id = %s WHERE id = %s AND external_id = %s", (rekey.new_id, rekey.animal_id, rekey.old_id))
        conn.commit()

    logger.info("Re-keyed %s rows", len(rekeys))
    return 0


if __name__ == "__main__":
    sys.exit(main())
