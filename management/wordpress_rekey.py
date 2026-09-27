#!/usr/bin/env python3
"""Move Santer Paws and Animal Rescue Bosnia rows onto WordPress post IDs (#570).

    uv run python management/wordpress_rekey.py
    uv run python management/wordpress_rekey.py --apply

Dry run by default. Run it right after the scraper change deploys and before
the next cron: a scrape under the new IDs that finds no matching row inserts
the dog again. Each stored row's adoption_url is looked up in the site's REST
API, the same mapping the scrapers use, and an active row it lacks is read
from its page. Rows whose page is no longer published
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
from datetime import datetime

import psycopg2
import requests
from bs4 import BeautifulSoup
from psycopg2.extras import RealDictCursor

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import DB_CONFIG  # noqa: E402
from scrapers.wordpress_ids import body_post_id, fetch_posts, slug, url_key  # noqa: E402

logger = logging.getLogger(__name__)

HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"}
# config_id -> (ID prefix, REST route)
SITES = {
    "santerpawsbulgarianrescue": ("spbr-", "https://santerpawsbulgarianrescue.com/wp-json/wp/v2/dog"),
    "animalrescuebosnia": ("arb-", "https://www.animal-rescue-bosnia.org/wp-json/wp/v2/pages"),
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


def match(url: str, links: dict[str, tuple[int, str]]) -> tuple[int, str] | None:
    """The post a stored URL is: by path, else by slug when only one post has it.

    Santer Paws' old /adoption/<slug>/ rows only match by slug.
    """
    if url_key(url) in links:
        return links[url_key(url)]
    by_slug = [found for key, found in links.items() if key.split("/")[-1] == slug(url)]
    return by_slug[0] if len(by_slug) == 1 else None


def plan_rekeys(rows: list[dict], links: dict[str, tuple[int, str]], prefix: str) -> tuple[list[Rekey], list[str]]:
    """One row per post moves to its post's ID: the most recently seen.

    links maps a page's URL key to its post ID and current link. Returns the
    re-keys and why any matched row was left alone.
    """
    taken = {row["external_id"] for row in rows}
    candidates: dict[str, dict] = {}
    skipped: list[str] = []

    for row in rows:
        found = match(row["adoption_url"] or "", links)
        if found is None:
            continue
        new_id = f"{prefix}{found[0]}"
        row = {**row, "link": found[1]}
        if new_id == row["external_id"]:
            continue
        current = candidates.get(new_id)
        if current is None or _recency(row) > _recency(current):
            if current is not None:
                skipped.append(f"{current['external_id']}: an older row of {new_id}")
            candidates[new_id] = row
        else:
            skipped.append(f"{row['external_id']}: an older row of {new_id}")

    rekeys = []
    for new_id, row in candidates.items():
        if new_id in taken:
            # A scrape under the new IDs already inserted the dog: merge by hand
            skipped.append(f"{row['external_id']}: {new_id} already exists")
            continue
        rekeys.append(Rekey(row["id"], row["name"], row["external_id"], new_id, row["link"], row["active"]))
    return sorted(rekeys, key=lambda rekey: rekey.animal_id), skipped


def _recency(row: dict) -> tuple:
    return (row["last_seen_at"] or datetime.min, row["id"])


def site_links(route: str, urls: list[str]) -> dict[str, tuple[int, str]]:
    """URL key -> (post ID, current link) for the stored URLs' slugs."""

    def get_json(params: dict) -> tuple[list[dict], int]:
        response = requests.get(route, params=params, headers=HEADERS, timeout=30)
        response.raise_for_status()
        return response.json(), int(response.headers.get("X-WP-TotalPages", 1))

    return {url_key(post["link"]): (post["id"], post["link"]) for post in fetch_posts(get_json, (slug(url) for url in urls))}


def page_link(url: str) -> tuple[int, str] | None:
    """(post ID, final URL) from a page's <body class>, or None if it is gone."""
    response = requests.get(url, headers=HEADERS, timeout=30)
    if response.status_code in (404, 410):
        return None
    response.raise_for_status()
    post_id = body_post_id(BeautifulSoup(response.content, "html.parser"))
    return (post_id, response.url) if post_id else None


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
        for config_id, (prefix, route) in SITES.items():
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(FETCH_QUERY, (config_id,))
                rows = [dict(row) for row in cursor.fetchall()]
            links = site_links(route, [row["adoption_url"] for row in rows if row["adoption_url"]])
            # As the scraper does: an active row the REST answer lacks is read from its page
            for row in rows:
                if row["active"] and row["adoption_url"] and match(row["adoption_url"], links) is None:
                    found = page_link(row["adoption_url"])
                    if found:
                        links[url_key(row["adoption_url"])] = found
            planned, skipped = plan_rekeys(rows, links, prefix)
            unmatched = sum(1 for row in rows if match(row["adoption_url"] or "", links) is None)
            logger.info("%s: %s rows, %s re-keyed, %s not published (kept)", config_id, len(rows), len(planned), unmatched)
            for reason in skipped:
                logger.warning("  kept %s", reason)
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
