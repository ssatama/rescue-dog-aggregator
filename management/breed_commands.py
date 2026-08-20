#!/usr/bin/env python3
"""Breed registry operations.

    uv run python management/breed_commands.py reconcile

Reports organisation breed text the registry cannot resolve, clean names that
are candidates for a registry entry, and rows whose stored values are behind the
resolver. Exits non-zero when unmatched rows exceed the budget, so it can gate a
scheduled run.
"""

import argparse
import logging
import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import psycopg2  # noqa: E402
from rich.console import Console  # noqa: E402
from rich.table import Table  # noqa: E402

from config import DB_CONFIG  # noqa: E402
from management.breed_reconciliation import BreedReconciliation, BreedRow, reconcile  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

DISTINCT_BREED_QUERY = """
    SELECT COALESCE(breed_raw, breed) AS raw,
           MIN(primary_breed) AS stored_primary,
           MIN(breed_slug) AS stored_slug,
           COUNT(*) AS count
    FROM animals
    WHERE COALESCE(breed_raw, breed) IS NOT NULL
      {available_only}
    GROUP BY 1
"""


def fetch_breed_rows(available_only: bool) -> list[BreedRow]:
    clause = "AND status = 'available'" if available_only else ""
    with psycopg2.connect(**DB_CONFIG) as conn, conn.cursor() as cursor:
        cursor.execute(DISTINCT_BREED_QUERY.format(available_only=clause))
        return [BreedRow(raw, primary, slug, count) for raw, primary, slug, count in cursor.fetchall()]


def render(report: BreedReconciliation, console: Console, limit: int) -> None:
    console.print(
        f"\n[bold]{report.total_rows}[/bold] rows | "
        f"[green]{report.resolved_rows} resolved[/green] | "
        f"[red]{report.unmatched_rows} unmatched[/red] | "
        f"[yellow]{report.drifted_rows} awaiting rescrape[/yellow]\n"
    )

    if report.unmatched:
        table = Table(title="Unresolved breed text", title_justify="left")
        table.add_column("organisation text")
        table.add_column("rows", justify="right")
        for text, count in report.unmatched[:limit]:
            table.add_row(text, str(count))
        console.print(table)

    if report.provisional:
        table = Table(title="Candidates for utils/breed_registry.yaml", title_justify="left")
        table.add_column("organisation text")
        table.add_column("kept as")
        table.add_column("rows", justify="right")
        for text, name, count in report.provisional[:limit]:
            table.add_row(text, name, str(count))
        console.print(table)

    if report.drift:
        table = Table(title="Stored values behind the resolver", title_justify="left")
        table.add_column("organisation text")
        table.add_column("stored")
        table.add_column("resolves to")
        table.add_column("rows", justify="right")
        for text, stored, resolved, count in report.drift[:limit]:
            table.add_row(text, str(stored), resolved, str(count))
        console.print(table)


def main() -> int:
    parser = argparse.ArgumentParser(description="Breed registry operations")
    parser.add_argument("command", choices=["reconcile"])
    parser.add_argument("--all-statuses", action="store_true", help="Include adopted and delisted dogs")
    parser.add_argument("--limit", type=int, default=25, help="Rows shown per table")
    parser.add_argument(
        "--unmatched-budget",
        type=int,
        default=50,
        help="Exit non-zero above this many unmatched rows",
    )
    args = parser.parse_args()

    report = reconcile(fetch_breed_rows(available_only=not args.all_statuses))
    render(report, Console(), args.limit)

    if not report.is_clean(args.unmatched_budget):
        logger.error("%s unmatched rows exceeds the budget of %s", report.unmatched_rows, args.unmatched_budget)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
