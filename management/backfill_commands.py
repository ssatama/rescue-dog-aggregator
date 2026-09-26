#!/usr/bin/env python3
"""Plan and apply data backfills after scraper fixes (epic #554).

Rows never repair themselves: most rescues skip dogs they already have, and
updates are never re-profiled. So each fix is proven with a dry run in its own
PR, and every backfill runs once, together (#572).

    # What a forced re-scrape of one rescue would change. Scrapes the live site
    # (at its configured rate), reads production read-only, writes nothing.
    uv run python management/backfill_commands.py plan --org rean [--out plan.json]
    # What registered steps would change (all rescues, or --org)
    uv run python management/backfill_commands.py plan --steps clear-fabricated-ages
    # Re-scrape, run the steps, re-profile dogs whose text changed. Production.
    uv run python management/backfill_commands.py apply --orgs rean,dogstrust \\
        --steps clear-fabricated-ages --reprofile changed --confirm

plan reads production with PROD_RO_DATABASE_URL (laptop), or through
POST /api/admin/query in cloud sessions, like the postgres MCP server. It
builds the scraper without its database, image and session services, so it
saves, uploads and profiles nothing. Building a scraper still syncs the
organization row into the local dev database until #569 makes construction
pure.

apply writes to RAILWAY_DATABASE_URL. Run it outside the cron window
(Mon/Thu/Sat 15:00 UTC) and only with the maintainer's go-ahead.
"""

import argparse
import json
import os
import subprocess
import sys
from dataclasses import asdict
from typing import Any

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from management.backfill_diff import COLUMNS, PROFILE_TEXT_KEYS, build_plan, render_markdown  # noqa: E402
from management.backfill_steps import Change, Step, get_steps, plan_step, update_statements  # noqa: E402

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADMIN_QUERY_MAX_ROWS = 5000


def _literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def prod_rows(sql: str) -> list[dict[str, Any]]:
    """Run a read-only query on production: directly on the laptop, over the admin API in the cloud."""
    url = os.getenv("PROD_RO_DATABASE_URL")
    if url:
        import psycopg2
        from psycopg2.extras import RealDictCursor

        with psycopg2.connect(url) as conn:
            conn.set_session(readonly=True)
            with conn.cursor(cursor_factory=RealDictCursor) as cursor:
                cursor.execute(sql)
                return [dict(row) for row in cursor.fetchall()]

    if os.getenv("CLAUDE_CODE_REMOTE") == "true" or os.getenv("ADMIN_API_KEY"):
        from scripts.mcp_prod_query import fetch_rows

        rows, truncated = fetch_rows(sql, limit=ADMIN_QUERY_MAX_ROWS)
        if truncated:
            raise RuntimeError(f"Production query returned more than {ADMIN_QUERY_MAX_ROWS} rows; narrow it")
        return rows

    raise RuntimeError("No read-only production access: set PROD_RO_DATABASE_URL (laptop) or run in a cloud session")


def stored_rows_sql(org: str, external_ids: list[str]) -> str:
    """The org's available dogs plus every scraped external_id, whatever its status."""
    wanted = f"OR a.external_id IN ({', '.join(_literal(i) for i in external_ids)})" if external_ids else ""
    columns = ", ".join(f"a.{column}" for column in COLUMNS if column != "status")
    return f"""
        SELECT a.id, a.external_id, a.status, a.active, a.original_image_url, a.properties, {columns}
        FROM animals a JOIN organizations o ON o.id = a.organization_id
        WHERE o.config_id = {_literal(org)}
          AND ((a.status = 'available' AND a.active) {wanted})
    """


def scrape_without_saving(org: str) -> tuple[list[dict[str, Any]], list[dict[str, str]]]:
    """Run the org's scraper with skipping off and return (would-be columns, rejected dogs)."""
    from services.database_service import update_columns
    from utils.config_loader import ConfigLoader
    from utils.db_connection import create_database_config_from_env, initialize_database_pool
    from utils.secure_scraper_loader import ScraperModuleInfo, SecureScraperLoader

    os.environ["FORCE_RESCRAPE"] = "true"
    # The organization sync in BaseScraper.__init__ needs the pool (the local dev database).
    initialize_database_pool(create_database_config_from_env())
    config = ConfigLoader().load_config(org)
    scraper_class = SecureScraperLoader().load_scraper_class(ScraperModuleInfo(module_path=config.scraper.module, class_name=config.scraper.class_name))
    scraper = scraper_class(config_id=org)

    scraped, rejected = [], []
    for dog in scraper.collect_data():
        dog["organization_id"] = scraper.organization_id
        dog.setdefault("animal_type", scraper.animal_type)
        if not scraper._validate_animal_data(dog):
            rejected.append({"external_id": dog.get("external_id"), "reason": scraper.animal_validator.rejection_reason(dog) or "invalid"})
            continue
        processed = scraper.process_animal(dog)
        scraped.append({**update_columns(processed), "external_id": processed["external_id"], "image_source": processed.get("primary_image_url")})
    return scraped, rejected


def step_sql(step: Step, organizations: set[str] | None) -> str:
    """The step's query, filtered to the organizations in SQL so the admin API's row cap isn't hit."""
    if not organizations:
        return step.fetch_sql
    wanted = ", ".join(_literal(org) for org in sorted(organizations))
    return f"SELECT * FROM ({step.fetch_sql}) AS step_rows WHERE organization IN ({wanted})"


def plan_steps(steps: list[Step], organizations: set[str] | None, fetch=prod_rows) -> dict[str, list[Change]]:
    return {step.name: plan_step(step, fetch(step_sql(step, organizations)), organizations) for step in steps}


def cmd_plan(args: argparse.Namespace) -> int:
    steps = get_steps(args.steps.split(",")) if args.steps else []
    step_changes = plan_steps(steps, {args.org} if args.org else None)

    output: dict[str, Any] = {"steps": {name: [asdict(c) for c in changes] for name, changes in step_changes.items()}}
    if args.org:
        scraped, rejected = scrape_without_saving(args.org)
        plan = build_plan(args.org, scraped, rejected, prod_rows(stored_rows_sql(args.org, [dog["external_id"] for dog in scraped])))
        output["plan"] = plan
        print(render_markdown(plan, step_changes))
    else:
        for name, changes in step_changes.items():
            print(f"### Step `{name}`: {len(changes)} rows")
            for change in changes[:20]:
                print(f"- {change.organization} animal {change.animal_id} `{change.column}`: {change.was!r} → {change.now!r}")

    if args.out:
        with open(args.out, "w") as f:
            json.dump(output, f, indent=2, default=str, ensure_ascii=False)
        print(f"\nJSON written to {args.out}", file=sys.stderr)
    return 0


def _rows(database_url: str, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    """One read on its own short connection, so no transaction stays open across a re-scrape."""
    import psycopg2
    from psycopg2.extras import RealDictCursor

    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cursor:
            cursor.execute(sql, params or None)
            return [dict(row) for row in cursor.fetchall()]
    finally:
        conn.close()


def _snapshot(database_url: str, orgs: list[str]) -> dict[str, dict[int, Any]]:
    """Per org: {animal id: (listed, profile text)}. Inactive dogs too, so a dog the re-scrape reactivates is compared."""
    snapshot: dict[str, dict[int, Any]] = {org: {} for org in orgs}
    rows = _rows(
        database_url,
        """
        SELECT o.config_id, a.id, a.status = 'available' AND a.active AS listed, a.properties
        FROM animals a JOIN organizations o ON o.id = a.organization_id
        WHERE o.config_id = ANY(%s)
        """,
        (orgs,),
    )
    for row in rows:
        properties = row["properties"] or {}
        snapshot[row["config_id"]][row["id"]] = (row["listed"], tuple(properties.get(key) for key in PROFILE_TEXT_KEYS))
    return snapshot


def text_changed(before: dict[int, Any], after: dict[int, Any]) -> list[int]:
    """Dogs present in both snapshots whose profile text changed."""
    return sorted(animal_id for animal_id, (_, text) in after.items() if animal_id in before and before[animal_id][1] != text)


def _run(command: list[str], database_url: str) -> int:
    env = {**os.environ, "DATABASE_URL": database_url}
    print(f"$ {' '.join(command)}", flush=True)
    return subprocess.run([sys.executable, *command], cwd=PROJECT_ROOT, env=env).returncode


def cmd_apply(args: argparse.Namespace) -> int:
    import psycopg2

    if not args.confirm:
        print("apply writes to production. Re-run with --confirm once the plan has been reviewed.", file=sys.stderr)
        return 2
    database_url = os.getenv("RAILWAY_DATABASE_URL")
    if not database_url:
        print("RAILWAY_DATABASE_URL is not set.", file=sys.stderr)
        return 2

    orgs = [org for org in (args.orgs or "").split(",") if org]
    steps = get_steps(args.steps.split(",")) if args.steps else []
    before = _snapshot(database_url, orgs)

    failed = [org for org in orgs if _run(["management/railway_scraper_cron.py", "--org", org, "--force-rescrape"], database_url) != 0]

    step_changes = plan_steps(steps, set(orgs) or None, lambda sql: _rows(database_url, sql))
    conn = psycopg2.connect(database_url)
    try:
        with conn.cursor() as cursor:
            for changes in step_changes.values():
                for sql, params in update_statements(changes):
                    cursor.execute(sql, params)
        conn.commit()
    finally:
        conn.close()

    after = _snapshot(database_url, orgs)

    reprofile = sorted(i for org in orgs for i in text_changed(before[org], after[org])) if args.reprofile == "changed" else []
    if reprofile and _run(["management/llm_commands.py", "generate-profiles", "--ids", ",".join(map(str, reprofile))], database_url) != 0:
        failed.append("generate-profiles")

    print("\n### Backfill applied\n")
    print("| rescue | available before → after | profile text changed |")
    print("| --- | --- | ---: |")
    for org in orgs:
        count = lambda snap: sum(1 for listed, _ in snap.values() if listed)  # noqa: E731
        print(f"| {org} | {count(before[org])} → {count(after[org])} | {len(text_changed(before[org], after[org]))} |")
    for name, changes in step_changes.items():
        print(f"\nStep `{name}`: {len(changes)} rows updated")
    print(f"\nRe-profiled: {len(reprofile)} dogs")
    if failed:
        print(f"\nFailed: {', '.join(failed)}", file=sys.stderr)
    print("\nRecord this summary in docs/technical/operational-knowledge.md (Data) in the PR that ran it.")
    return 1 if failed else 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Plan and apply data backfills (epic #554)")
    sub = parser.add_subparsers(dest="command", required=True)

    plan = sub.add_parser("plan", help="Dry run: what a re-scrape and the steps would change")
    plan.add_argument("--org", help="config_id of the rescue to re-scrape and diff")
    plan.add_argument("--steps", help="Comma-separated registered steps to plan")
    plan.add_argument("--out", help="Write the plan as JSON to this file")

    apply = sub.add_parser("apply", help="Re-scrape, run steps and re-profile on production")
    apply.add_argument("--orgs", help="Comma-separated config_ids to force re-scrape")
    apply.add_argument("--steps", help="Comma-separated registered steps to run after the re-scrape")
    apply.add_argument("--reprofile", choices=["changed", "none"], default="changed", help="Re-profile dogs whose profile text changed")
    apply.add_argument("--confirm", action="store_true", help="Required: this writes to production")

    args = parser.parse_args(argv)
    if args.command == "plan":
        if not args.org and not args.steps:
            parser.error("plan needs --org, --steps or both")
        return cmd_plan(args)
    if not args.orgs and not args.steps:
        parser.error("apply needs --orgs, --steps or both")
    return cmd_apply(args)


if __name__ == "__main__":
    from config import DB_CONFIG  # noqa: F401,E402  - loads .env before the commands read the environment

    sys.exit(main())
