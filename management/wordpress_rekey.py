#!/usr/bin/env python3
"""Move Santer Paws and Animal Rescue Bosnia rows onto WordPress post IDs (#570).

    uv run python management/wordpress_rekey.py
    uv run python management/wordpress_rekey.py --apply

Dry run by default. Run it right after the scraper change deploys and before
the next cron: a scrape under the new IDs that finds no matching row inserts
the dog again. Each stored row's adoption_url is looked up in the site's REST
API, the same mapping the scrapers use. Rows whose page is no longer published
keep their old ID (they are gone from the site anyway). Rows match by slug,
since Santer Paws moved its pages from /adoption/ to /dog/, and a re-keyed row
also gets the page's current link (updates never refresh adoption_url). Rows
that map to one
post are one dog re-created by a rename under the old IDs; the most recently
seen one takes the new ID, and the older duplicates are left as they are.
"""

import argparse
import logging
import os
import sys
from dataclasses import dataclass

import psycopg2
import requests
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG  # noqa: E402
from scrapers.wordpress_ids import post_ids, slugs, url_key  # noqa: E402

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"}
# config_id -> (ID prefix, REST route, query the route by slug)
SITES = {
    "santerpawsbulgarianrescue": ("spbr-", "https://santerpawsbulgarianrescue.com/wp-json/wp/v2/dog", False),
    "animalrescuebosnia": ("arb-", "https://www.animal-rescue-bosnia.org/wp-json/wp/v2/pages", True),
}

FETCH_QUERY = """
    SELECT a.id, a.name, a.external_id, a.adoption_url, a.last_seen_at, a.active
    FROM animals a
    JOIN organizations o ON o.id = a.organization_id
    WHERE o.config_id = %s
"""


@dataclass(frozen=True)
class Rekey:
    animal_id: int
    name: str
    old_id: str
    new_id: str
    link: str
    active: bool


def slug(url: str) -> str:
    return url_key(url).split("/")[-1]


def plan_rekeys(rows: list[dict], links: dict[str, tuple[int, str]], prefix: str) -> list[Rekey]:
    """One row per post moves to its post's ID: the most recently seen.

    links maps a page slug to its post ID and current link.
    """
    taken = {row["external_id"] for row in rows}
    candidates: dict[str, dict] = {}

    for row in rows:
        found = links.get(slug(row["adoption_url"] or ""))
        if found is None:
            continue
        new_id = f"{prefix}{found[0]}"
        row = {**row, "link": found[1]}
        if new_id == row["external_id"]:
            continue
        current = candidates.get(new_id)
        if current is None or (row["last_seen_at"], row["id"]) > (current["last_seen_at"], current["id"]):
            candidates[new_id] = row

    return sorted(
        (Rekey(row["id"], row["name"], row["external_id"], new_id, row["link"], row["active"]) for new_id, row in candidates.items() if new_id not in taken),
        key=lambda rekey: rekey.animal_id,
    )


def site_links(route: str, by_slug: bool, urls: list[str]) -> dict[str, tuple[int, str]]:
    """Page slug -> (post ID, current link) from the site's REST API."""
    items: list[dict] = []

    def get_json(params: dict) -> tuple[list[dict], int]:
        response = requests.get(route, params={**params, "_fields": "id,link"}, headers=HEADERS, timeout=30)
        response.raise_for_status()
        items.extend(response.json())
        return response.json(), int(response.headers.get("X-WP-TotalPages", 1))

    if not by_slug:
        post_ids(get_json, {})
    else:
        wanted = slugs(urls)
        for start in range(0, len(wanted), 50):
            post_ids(get_json, {"slug": ",".join(wanted[start : start + 50])})
    return {slug(item["link"]): (item["id"], item["link"]) for item in items}


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
        rekeys: list[Rekey] = []
        for config_id, (prefix, route, by_slug) in SITES.items():
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(FETCH_QUERY, (config_id,))
                rows = [dict(row) for row in cursor.fetchall()]
            links = site_links(route, by_slug, [row["adoption_url"] for row in rows if row["adoption_url"]])
            planned = plan_rekeys(rows, links, prefix)
            unmapped = sum(1 for row in rows if slug(row["adoption_url"] or "") not in links)
            logger.info("%s: %s rows, %s re-keyed, %s not published (kept)", config_id, len(rows), len(planned), unmapped)
            rekeys += planned

        for rekey in rekeys:
            logger.info("%6s %-16s %-8s %s -> %s", rekey.animal_id, rekey.name, "active" if rekey.active else "inactive", rekey.old_id, rekey.new_id)

        if not args.apply:
            logger.info("Dry run - pass --apply to re-key these %s rows", len(rekeys))
            return 0

        with conn.cursor() as cursor:
            for rekey in rekeys:
                cursor.execute(
                    "UPDATE animals SET external_id = %s, adoption_url = %s WHERE id = %s AND external_id = %s",
                    (rekey.new_id, rekey.link, rekey.animal_id, rekey.old_id),
                )
        conn.commit()

    logger.info("Re-keyed %s rows", len(rekeys))
    return 0


if __name__ == "__main__":
    sys.exit(main())
