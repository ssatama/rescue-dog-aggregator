---
name: ops-commands
description: Operational runbook for the Rescue Dog Aggregator - organization config sync, LLM profiling batches, and emergency recovery commands (stale data reset, environment rebuilds, single-test invocation). Use when managing org configs, running LLM enrichment, or recovering a broken local/database state.
---

# Operational Commands

## Config Management

```bash
uv run python management/config_commands.py list      # List organizations
uv run python management/config_commands.py sync      # Sync to database
uv run python management/config_commands.py profile --org-id 11  # LLM profiling
uv run python management/llm_commands.py generate-profiles       # Batch enrichment
```

## Data Backfills

Scraper fixes don't repair stored rows (most rescues skip dogs they already
have). Prove a fix with a dry run, then run every backfill once
(epic #554, #572). Details: `docs/technical/operational-knowledge.md`, "Data".

```bash
# Dry run: re-scrape one rescue without saving, diff against production (read-only)
uv run python management/backfill_commands.py plan --org rean --out /tmp/rean.json
# Dry run of registered SQL steps (management/backfill_steps.py)
uv run python management/backfill_commands.py plan --steps clear-fabricated-ages
# Production: forced re-scrape, steps, re-profile changed text. Maintainer's go-ahead only,
# outside the cron window (Mon/Thu/Sat 15:00 UTC)
export $(grep -E '^RAILWAY_DATABASE_URL=' .env | xargs)
uv run python management/backfill_commands.py apply --orgs rean --steps clear-fabricated-ages --confirm
```

## Emergency Commands

```bash
# Database
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals WHERE active = true;"
# Or use Postgres MCP: mcp__postgres__query tool
uv run python management/emergency_operations.py --reset-stale-data

# Frontend rebuild
cd frontend && rm -rf node_modules .next && pnpm install && pnpm build

# Python environment rebuild
rm -rf .venv && uv sync

# Single test
uv run pytest tests/api/test_swipe.py::test_name -v
pnpm jest --testNamePattern="PersonalityTraits" --watchAll=false
```
