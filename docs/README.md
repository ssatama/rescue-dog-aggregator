# Documentation

Agent instructions live in `AGENTS.md` at the repo root - conventions, quality
gates, and the PR workflow. `CLAUDE.md` imports it. Start there, not here.

These documents describe how the system works.

## Guides

| Doc | Read it when |
| --- | --- |
| [guides/installation.md](guides/installation.md) | Setting up local development |
| [guides/testing.md](guides/testing.md) | Writing or debugging tests |
| [guides/deployment.md](guides/deployment.md) | Shipping to Vercel or Railway |
| [troubleshooting.md](troubleshooting.md) | Something is broken |

## Architecture

| Doc | Covers |
| --- | --- |
| [technical/architecture.md](technical/architecture.md) | System overview, services, data flow |
| [technical/scraper-architecture.md](technical/scraper-architecture.md) | Scraper base classes and per-org structure |
| [technical/mcp-server.md](technical/mcp-server.md) | The `rescuedogs` MCP server in `rescuedogs-mcp-server/` |
| [reference/database-schema.md](reference/database-schema.md) | Column-level schema reference |

## Features

| Doc | Covers |
| --- | --- |
| [features/llm-data-enrichment.md](features/llm-data-enrichment.md) | LLM profiling pipeline, prompts, quality scoring |
| [features/swipe.md](features/swipe.md) | Swipe discovery interface |
| [features/adoption-detection.md](features/adoption-detection.md) | Detecting and presenting adopted dogs |
| [features/country-hub-pages.md](features/country-hub-pages.md) | Country landing pages |
| [features/railway-database-sync.md](features/railway-database-sync.md) | Syncing data between environments |
| [features/analytics-self-exclusion.md](features/analytics-self-exclusion.md) | Excluding own traffic from analytics |

## Code guidelines

Enforced at PR review - see `AGENTS.md` for the non-negotiable subset.

- [Python](guidelines/PYTHON_GUIDELINES.md)
- [TypeScript](guidelines/TYPESCRIPT_GUIDELINES.md)
- [React / Next.js](guidelines/REACT_GUIDELINES.md)
- [Web design and accessibility](guidelines/WEB_DESIGN_GUIDELINES.md)

## Elsewhere in the repo

| Path | Covers |
| --- | --- |
| `database/README.md` | Local setup, inspection queries, Alembic migrations |
| `services/llm/README.md` | Orientation for the LLM pipeline source |
| `scrapers/README.md` | Adding a new organization scraper |
| `configs/README.md` | Organization YAML configuration |
| `frontend/e2e-tests/README.md` | Playwright end-to-end tests |
| `monitoring/README.md` | Data quality monitoring |
| The `ops-commands` skill | Operational runbooks |
