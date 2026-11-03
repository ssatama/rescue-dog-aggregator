#!/usr/bin/env python3
"""Move Pets in Turkey rows onto the page-slug external_id and per-dog link (#747).

    uv run python management/pets_in_turkey_rekey.py
    uv run python management/pets_in_turkey_rekey.py --apply

Dry run by default. Run it right after the scraper change deploys and before
the next cron: a scrape under the new IDs that finds no matching row inserts
the dog again under a new rescuedogs.me slug.

The site left Wix in 2026-10, so the photo-keyed IDs of #564 can't be read any
more. Each dog now has its own page, /dogs/<slug>, and its id is
`pit-<slug>`. This reads the live /dogs listing and gives each listed dog's
active row its new id and its page as adoption_url (a save never rewrites
adoption_url). Rows are matched by name, and by sex where both are known.

- Only active rows are re-keyed. A listed dog without one (Chester, last seen
  in July) is inserted fresh by the next scrape rather than revived with
  months-old data.
- A name twice on the listing or on two active rows of the same sex is
  reported, not guessed.
- Active rows no longer listed are reported and go stale as usual.
- The animals' `slug` column is never touched, so rescuedogs.me URLs survive.
"""

import argparse
import logging
import os
import sys
from collections import Counter
from dataclasses import dataclass, field

import psycopg2
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG  # noqa: E402

logger = logging.getLogger(__name__)

FETCH_QUERY = """
    SELECT a.id, a.name, a.sex, a.external_id, a.adoption_url, a.active, a.last_seen_at
    FROM animals a
    JOIN organizations o ON o.id = a.organization_id
    WHERE o.config_id = 'pets-in-turkey'
"""


@dataclass(frozen=True)
class Rekey:
    animal_id: int
    name: str
    old_id: str
    new_id: str
    adoption_url: str


@dataclass
class Plan:
    rekeys: list[Rekey] = field(default_factory=list)
    new_dogs: list[dict] = field(default_factory=list)
    ambiguous: list[str] = field(default_factory=list)
    unlisted: list[dict] = field(default_factory=list)


def _key(name: str | None) -> str:
    return " ".join((name or "").split()).casefold()


def _same_sex(a: str | None, b: str | None) -> bool:
    return not a or not b or a == b


def plan_rekeys(rows: list[dict], listed: list[dict]) -> Plan:
    """Pair each listed dog with its one active row of the same name (and sex)."""
    plan = Plan()
    held = {row["external_id"] for row in rows}
    active = [row for row in rows if row["active"]]
    listed_names = Counter(_key(dog["name"]) for dog in listed)
    matched: set[int] = set()

    for dog in listed:
        if dog["external_id"] in held:
            matched.update(row["id"] for row in active if row["external_id"] == dog["external_id"])
            continue

        candidates = [row for row in active if _key(row["name"]) == _key(dog["name"]) and _same_sex(row["sex"], dog["sex"])]
        if listed_names[_key(dog["name"])] > 1 or len(candidates) > 1:
            if dog["name"] not in plan.ambiguous:
                plan.ambiguous.append(dog["name"])
            matched.update(row["id"] for row in candidates)
        elif candidates:
            row = candidates[0]
            matched.add(row["id"])
            plan.rekeys.append(Rekey(row["id"], row["name"], row["external_id"], dog["external_id"], dog["adoption_url"]))
        else:
            plan.new_dogs.append(dog)

    plan.unlisted = [row for row in active if row["id"] not in matched]
    plan.rekeys.sort(key=lambda rekey: rekey.animal_id)
    return plan


def _connect():
    database_url = os.getenv("RAILWAY_DATABASE_URL")
    if database_url:
        return psycopg2.connect(database_url)
    return psycopg2.connect(**DB_CONFIG)


def apply_rekeys(cursor, rekeys: list[Rekey]) -> list[Rekey]:
    """Write the new ids; return the rekeys that changed a row.

    The UPDATE is guarded by the old id, so a row re-keyed since the plan was
    read (a second run) is not counted as done. If a scrape inserted a new id
    meanwhile, UNIQUE(external_id, organization_id) raises and the caller
    commits nothing: run the dry run again.
    """
    changed = []
    for rekey in rekeys:
        cursor.execute(
            "UPDATE animals SET external_id = %s, adoption_url = %s WHERE id = %s AND external_id = %s",
            (rekey.new_id, rekey.adoption_url, rekey.animal_id, rekey.old_id),
        )
        if cursor.rowcount == 1:
            changed.append(rekey)
    return changed


def _listed_dogs() -> tuple[str, list[dict]]:
    from scrapers.pets_in_turkey.petsinturkey_scraper import PetsInTurkeyScraper

    scraper = PetsInTurkeyScraper()
    return scraper.listing_url, scraper.collect_data()


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--apply", action="store_true", help="Write the changes (default is a dry run)")
    args = parser.parse_args()

    listing_url, listed = _listed_dogs()
    logger.info("listing: %s dogs on %s", len(listed), listing_url)
    logger.info("target: %s", "production (RAILWAY_DATABASE_URL)" if os.getenv("RAILWAY_DATABASE_URL") else f"local ({DB_CONFIG.get('database')})")

    with _connect() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(FETCH_QUERY)
            plan = plan_rekeys([dict(row) for row in cursor.fetchall()], listed)

        for rekey in plan.rekeys:
            logger.info("%6s %-10s %s -> %s  %s", rekey.animal_id, rekey.name, rekey.old_id, rekey.new_id, rekey.adoption_url)
        for dog in plan.new_dogs:
            logger.info("new    %-10s %s (no active row; the next scrape inserts it)", dog["name"], dog["external_id"])
        for name in plan.ambiguous:
            logger.info("AMBIGUOUS %s: more than one dog or active row by that name, fix by hand", name)
        for row in plan.unlisted:
            logger.info("unlisted %6s %-10s %s (goes stale as usual)", row["id"], row["name"], row["external_id"])

        if not args.apply:
            logger.info("Dry run - pass --apply to re-key these %s rows", len(plan.rekeys))
            return 0

        with conn.cursor() as cursor:
            changed = apply_rekeys(cursor, plan.rekeys)
        conn.commit()

    missed = [rekey for rekey in plan.rekeys if rekey not in changed]
    for rekey in missed:
        logger.warning("NOT re-keyed %s %s: its external_id is no longer %s; re-run the dry run", rekey.animal_id, rekey.name, rekey.old_id)
    logger.info("Re-keyed %s of %s planned rows", len(changed), len(plan.rekeys))
    return 1 if missed else 0


if __name__ == "__main__":
    sys.exit(main())
