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
