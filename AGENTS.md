# AGENTS.md - Rescue Dog Aggregator

## Mission

Build an open-source platform aggregating rescue dogs from multiple organizations.

## Tech Stack

- Backend: Python 3.12+/FastAPI/PostgreSQL 15/Alembic
- Frontend: Next.js 16 (App Router)/React 19/TypeScript 5
- Testing: pytest (backend), Jest (frontend)
- AI: OpenRouter, pinned to `google/gemini-3.8-flash` for LLM enrichment
- Browser Automation: Playwright (Browserless v2 in production)
- Monitoring: Sentry (dev/prod) for errors; PostHog (EU, cookieless) for
  product analytics and session replay. All events go through
  `frontend/src/lib/analytics.ts`; `adoption_link_clicked` is the conversion event
- Package Management: **uv** (backend), **pnpm** (frontend)
- Linting: **ruff** (replaces black/isort/flake8)
- Current: 155 backend test files, 250 frontend test files, 1,500+ active dogs

## Status

- Site live at www.rescuedogs.me
- 1,500+ active dogs from 12 organizations
- Deployment: Vercel (frontend), Railway (backend + PostgreSQL + cron)
- Scrapers: Railway cron (Mon/Thu/Sat 3pm UTC)
- Traffic: 20+ daily users, growing steadily

## Overall Guidelines

### 1. Think Before Coding

**"Don't assume. Don't hide confusion. Surface tradeoffs."**

- State assumptions explicitly and ask if uncertain
- Present multiple interpretations rather than choosing silently
- Advocate for simpler approaches when they exist
- Stop to clarify anything confusing

### 2. Simplicity First

**"Minimum code that solves the problem. Nothing speculative."**

- Write only what was requested—no extra features, unnecessary abstractions, unrequested configurability
- No error handling for impossible scenarios
- If code could be 50 lines instead of 200, rewrite it
- Ask: would a senior engineer call this overcomplicated?

### 3. Goal-Driven Execution

**"Define success criteria. Loop until verified."**

- Transform vague tasks into verifiable goals
- For multi-step tasks, outline a brief plan with verification steps
- Strong success criteria enable independent iteration without constant clarification
- Don't mark complete until verification passes

## Core Rules

### PR Workflow (Required)

**Never commit directly to main.** Always use PRs:

1. Create branch: `git checkout -b type/description`
2. Make changes
3. Pre-commit validation: run the commands under Quality Gates below
4. Commit to branch: `git commit -m "type(scope): description"`
5. Push & create PR: `git push -u origin HEAD && gh pr create`
6. Run `/code-review` for automated review
7. Merge via GitHub (1 review required)

Branch naming: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`

## Project Structure

```
api/              # FastAPI backend with async routes
├── routes/       # animals, organizations, swipe, llm, monitoring
services/         # Core services (14 modules)
├── llm/          # AI profiling pipeline (14 files)
scrapers/         # Organization scrapers
frontend/         # Next.js 16 App Router
├── app/          # Pages: dogs/, swipe/, favorites/, breeds/, guides/
├── components/   # UI components organized by feature (23 dirs)
tests/            # Backend tests with fixtures
configs/          # Organization YAMLs (13 active, 12 LLM-enabled)
migrations/railway/  # Alembic migrations for production
management/       # CLI tools (11 scripts)
docs/
├── features/     # Feature documentation
├── technical/    # Architecture docs
```

## Key Services

- `services/database_service.py`: Async connection pooling
- `services/llm_data_service.py`: OpenRouter client for enrichment and translation
- `services/llm/dog_profiler.py`: AI personality profiling pipeline
- `services/adoption_detection.py`: Track adopted dogs
- `services/metrics_collector.py`: Performance monitoring
- `services/session_manager.py`: User preferences

## Quality Gates (Required for ANY commit)

- All tests passing (backend + frontend)
- Linting/formatting clean (ruff, ESLint)
- No new type errors
- Test count stable or increasing
- **No JSX/TSX duplicate files** (enforced by pre-commit)
- **Database isolation in tests** (global conftest.py fixture)

### Pre-Commit Validation (MANDATORY)

**Run this before every commit:**

```bash
# Backend
uv run ruff check . --fix
uv run ruff format .
uv run pytest -m "not browser" --maxfail=3

# Frontend
cd frontend
pnpm tsc --noEmit
pnpm lint
pnpm jest --passWithNoTests --watchAll=false
```

**Do not commit if any command fails.**

### CI Requirements Table

| Gate                      | Push (`ci-push`) | PR (`ci-pr`) |
| ------------------------- | ---------------- | ------------ |
| Backend lint (ruff)       | ✅               | ✅           |
| Backend unit tests        | ✅               | ✅           |
| Backend full suite        | -                | ✅           |
| Frontend type check (tsc) | ✅               | ✅           |
| Frontend lint (eslint)    | ✅               | ✅           |
| Frontend unit tests       | ✅               | ✅           |
| Frontend build            | -                | ✅           |
| Dependency audit          | -                | ⚠️ warn      |

There is no pre-merge tier. `ci-pr` runs the whole backend suite
(`-m "not browser"`) on every PR, which takes well under a minute.
`compatibility.yml` runs weekly against the next Python version and is not a
merge gate.

## Testing Commands

### Frontend

```bash
cd frontend
pnpm test                                        # All unit tests (watch mode)
pnpm jest --watchAll=false                       # All tests (CI mode, no watch)
pnpm jest --testPathPatterns "DogSchema"         # Tests matching file pattern
pnpm jest --testNamePattern "renders JSON-LD"    # Tests matching test name
pnpm build                                       # Build verification
pnpm tsc --noEmit                                # Type check
```

**Important:** Use `pnpm jest` directly (not `pnpm test --`) when passing options.
Jest 30+ uses `--testPathPatterns` (plural) for file patterns.

### Backend

```bash
uv run pytest -m "unit" --maxfail=5   # Quick feedback, no database needed
uv run pytest -m "not browser"        # What CI runs on every PR
uv run pytest                         # Everything, including browser tests
```

### Pytest Markers (7 essential)

| Marker        | Purpose                                    |
| ------------- | ------------------------------------------ |
| `database`    | Requires a PostgreSQL database             |
| `browser`     | Requires Playwright/Selenium               |
| `external`    | Requires external APIs or credentials      |
| `real_clock`  | Must observe real elapsed time             |
| `unit`        | Pure logic, no I/O                         |
| `integration` | Exercises more than one internal component |
| `benchmark`   | Measures performance rather than asserting |

Markers say what a test **needs**, so a runner can decide whether it can run
one. They are not speed labels. `slow` claimed ">1s" while every test carrying
it finished in milliseconds, and because CI deselected on it, it became a
quarantine: seven failing tests hid behind it for seven months. Measure speed
with `--durations`, do not assert it with a decorator. `--strict-markers` is on,
so an unregistered marker is an error rather than a silent no-op.

Sleeps are stubbed suite-wide by the autouse `stub_clock` fixture, so a
test that needs real elapsed time — thread overlap, a timing bound — must
carry `real_clock` or it will pass without observing anything. Assert on
the delay `stub_clock.calls` records wherever that is enough.

## Config Management

```bash
uv run python management/config_commands.py list      # List organizations
uv run python management/config_commands.py sync      # Sync to database
uv run python management/config_commands.py profile --org-id 11  # LLM profiling
uv run python management/llm_commands.py generate-profiles       # Batch enrichment
```

## Database Schema Highlights

```sql
animals: 39 columns including id, name, breed, standardized_breed, properties(JSONB),
         dog_profiler_data(JSONB), status, availability_confidence, slug, blur_data_url
organizations: 21 columns including id, name, slug, config_id, active, ships_to(JSONB),
               website_url, country, city, social_media(JSONB)
-- GIN indexes on JSONB columns for performance
-- See docs/technical/architecture.md for complete schema
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

## API Endpoints

- `/api/animals`: CRUD + filtering, search, stats, breeds
- `/api/enhanced_animals`: AI-enriched data, semantic search
- `/api/swipe`: Tinder-like discovery interface
- `/api/llm`: Enrichment coverage stats (admin-key gated; enrichment itself runs in the cron)
- `/api/organizations`: Org management, metrics, stats
- `/api/monitoring`: Health checks, scraper status, metrics
- `/api/sentry-test`: Error tracking debug endpoints

## LLM Integration

- Model: pinned to `google/gemini-3.8-flash` via `LLM_DEFAULT_MODEL` on the
  cron service `thriving-appreciation` (measured $0.0085/dog, 12/12 on a
  like-for-like test). The code default is still `openrouter/auto`, so a
  missing env var silently falls back to the router
- Tuning: `LLM_DEFAULT_MODEL` (and `LLM_COST_TIER`, which only applies to
  `openrouter/auto`) - no model strings in code
- Why pinned: the auto-router caused two silent failure classes - 400s from
  reasoning-only endpoints (123 dogs unprofiled) and reasoning models spending
  the budget so the JSON answer was truncated (#409). Re-check for a newer
  Flash roughly monthly
- Reasoning is capped at `effort: low`, never disabled; profile requests get
  8000 tokens / 60s so reasoning cannot crowd out the answer. A completion cut
  off by the limit raises `TruncatedLLMResponseError` (or
  `EmptyLLMResponseError` if nothing came back at all)
- Config: `configs/llm_organizations.yaml`
- Prompts: `prompts/organizations/*.yaml`
- Details: `docs/features/llm-data-enrichment.md`

## Documentation

This file is the single source of truth for agent instructions. `CLAUDE.md`
imports it; do not duplicate content between them.

- Architecture: `docs/technical/architecture.md`
- Scrapers: `docs/technical/scraper-architecture.md`
- LLM pipeline: `docs/features/llm-data-enrichment.md`
- Product analytics (PostHog): `docs/features/product-analytics.md`
- Setup: `docs/guides/installation.md`
- Deployment: `docs/guides/deployment.md`
- Testing: `docs/guides/testing.md`
- Troubleshooting: `docs/troubleshooting.md`
- Operational runbooks: the `ops-commands` skill
