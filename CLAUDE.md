# CLAUDE.md - Rescue Dog Aggregator

## Mission

Build an open-source platform aggregating rescue dogs from multiple organizations. Focus: clean code, TDD, zero technical debt.

## Tech Stack

- Backend: Python 3.12+/FastAPI/PostgreSQL 15/Alembic
- Frontend: Next.js 16 (App Router)/React 19/TypeScript 5
- Testing: pytest (backend), Jest/Playwright (frontend)
- AI: OpenRouter API (Google Gemini 3 Flash) for LLM enrichment
- Browser Automation: Playwright (Browserless v2 in production)
- Monitoring: Sentry (dev/prod)
- Package Management: **uv** (backend), **pnpm** (frontend)
- Linting: **ruff** (replaces black/isort/flake8)
- Current: 168 backend test files, 285 frontend test files, 1,500+ active dogs

## Status

- Site live at www.rescuedogs.me
- 1,500+ active dogs from 12 organizations
- Deployment: Vercel (frontend), Railway (backend + PostgreSQL + cron)
- Scrapers: Railway cron (Tue/Thu/Sat 6am UTC)
- Traffic: 20+ daily users, growing steadily

## USE SUB-AGENTS FOR CONTEXT OPTIMIZATION

**CRITICAL**: Use sub-agents to reduce context usage and improve efficiency.

## MCP Tools for Claude Code

**Priority order for efficiency:**

1. **Serena MCP**: Study codebase with symbolic tools (avoid reading entire files)

   - `get_symbols_overview`, `find_symbol`, `search_for_pattern`
   - `check_onboarding_performed`, `list_memories`, `read_memory`

2. **Morph MCP**: Fast, precise code edits (preferred over Edit tool)

   - `edit_file`, `tiny_edit_file` for line-based changes

3. **Postgres MCP**: Query prod database directly
   - `query` tool for SELECT statements

## CRITICAL: Planning-First Workflow

**ALWAYS follow this 3-phase approach:**

1. **RESEARCH** (no code): `Read relevant files and understand context`
2. **PLAN**: `Create detailed implementation plan with checkboxes`
3. **EXECUTE**: `Implement with TDD - test first, code second`

## Code Guidelines (ENFORCED AT PR REVIEW)

> **All guidelines are reviewed at every PR.** Violations block merge.

### Quick Links

| Guideline | Scope | Priority Order |
|-----------|-------|----------------|
| [Python Guidelines](docs/guidelines/PYTHON_GUIDELINES.md) | Backend, scrapers, services | Reliability > Simplicity > Performance > Maintainability |
| [TypeScript Guidelines](docs/guidelines/TYPESCRIPT_GUIDELINES.md) | Frontend types, API calls | Reliability > Simplicity > Performance > Maintainability |
| [React Guidelines](docs/guidelines/REACT_GUIDELINES.md) | Components, hooks, Next.js | Performance > Reliability > Simplicity > Maintainability |
| [Web Design Guidelines](docs/guidelines/WEB_DESIGN_GUIDELINES.md) | UI/UX, accessibility | Accessibility > Usability > Performance > Polish |

### Non-Negotiable Rules (PR Blockers)

**Python:**
- Python 3.12+ with modern syntax (`list[str]` not `List[str]`, `X | None` not `Optional[X]`)
- Type hints on ALL functions
- `ruff check` and `ruff format` must pass
- `logging` module (not `print()`)
- Async context managers for resources

**TypeScript:**
- `strict: true` - never disable
- No `any` - use `unknown` + Zod validation
- No `@ts-ignore` - use `@ts-expect-error` with explanation if needed
- Explicit return types on module API functions
- `import type` for type-only imports

**React/Next.js:**
- No sequential awaits for independent operations - use `Promise.all()`
- No barrel file imports - import directly or use `optimizePackageImports`
- Heavy components use `next/dynamic` with `ssr: false`
- Functional `setState` for current-state updates
- `toSorted()` not `sort()` on state/props
- **No `Link` or Client Components in lists with 20+ items**

**Web Design:**
- Icon-only buttons need `aria-label`
- Interactive elements need keyboard support
- Never remove focus outline without replacement
- Animations honor `prefers-reduced-motion`
- Form inputs have associated labels

## Core Rules

### 1. TDD is MANDATORY

```
1. Write failing test
2. See it fail (confirm with pytest/npm test)
3. Write minimal code to pass
4. Refactor if needed
```

### 2. Code Style

- **Immutable data only** - no mutations
- **Pure functions** - no side effects
- **Small functions** - one responsibility
- **No comments** - self-documenting code
- **Early returns** - no nested conditionals

### 3. Anti-Patterns (NEVER DO)

- NO PARTIAL IMPLEMENTATION
- NO SIMPLIFICATION : no "//This is simplified stuff for now, complete implementation would blablabla"
- NO CODE DUPLICATION : check existing codebase to reuse functions and constants Read files before writing new functions. Use common sense function name to find them easily.
- NO DEAD CODE : either use or delete from codebase completely
- NO CHEATER TESTS : test must be accurate, reflect real usage and be designed to reveal flaws. No useless tests! Design tests to be verbose so we can use them for debuging.
- NO INCONSISTENT NAMING - read existing codebase naming patterns.
- NO OVER-ENGINEERING - Don't add unnecessary abstractions, factory patterns, or middleware when simple functions would work. Don't think "enterprise" when you need "working"
- NO MIXED CONCERNS - Don't put validation logic inside API handlers, database queries inside UI components, etc. instead of proper separation
- NO RESOURCE LEAKS - Don't forget to close database connections, clear timeouts, remove event listeners, or clean up file handles

### 4. Tone and Behavior

- Criticism is welcome. Please tell me when I am wrong or mistaken, or even when you think I might be wrong or mistaken.
- Please tell me if there is a better approach than the one I am taking.
- Please tell me if there is a relevant standard or convention that I appear to be unaware of.
- Be skeptical.
- Be concise.
- Short summaries are OK, but don't give an extended breakdown unless we are working through the details of a plan.
- Do not flatter, and do not give compliments unless I am specifically asking for your judgement.
- Occasional pleasantries are fine.
- Feel free to ask many questions. If you are in doubt of my intent, don't guess. Ask.

### 5. Commit Message Guidelines

- **NO AI ATTRIBUTION**: Do not include "Claude", "Opus", "Anthropic", "Co-Authored-By: Claude", or similar AI references in commit messages
- Use conventional commit format: `type(scope): description`
- Focus on what changed and why, not how it was created
- Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `style`, `chore`

### 6. PR Workflow (Required)

**Never commit directly to main.** Always use PRs:

1. Create branch: `git checkout -b type/description`
2. Make changes
3. Pre-commit review: Use PAL MCP `precommit` tool with external validation
4. Commit to branch: `git commit -m "type(scope): description"`
5. Push & create PR: `git push -u origin HEAD && gh pr create`
6. Run `/code-review` for automated review (includes guideline compliance check)
7. Merge via GitHub (1 review required)

Branch naming: `feat/`, `fix/`, `chore/`, `docs/`, `refactor/`

## Project Structure

```
api/              # FastAPI backend with async routes
├── routes/       # animals, organizations, swipe, llm, monitoring
services/         # Core services (14 total)
├── llm/          # AI profiling pipeline (20 files)
scrapers/         # 13 organization scrapers
frontend/         # Next.js 16 App Router
├── app/          # Pages: dogs/, swipe/, favorites/, breeds/, guides/
├── components/   # UI components organized by feature (20 dirs)
tests/            # Backend tests with fixtures
configs/          # Organization YAMLs (13 active)
migrations/       # Alembic database migrations
management/       # CLI tools (18 scripts)
docs/
├── guidelines/   # Code guidelines (Python, TypeScript, React, Web Design)
├── features/     # Feature documentation
├── technical/    # Architecture docs
```

## Key Services

- `database_service.py`: Async connection pooling
- `llm_profiler_service.py`: AI personality profiling
- `adoption_detection.py`: Track adopted dogs
- `metrics_collector.py`: Performance monitoring
- `session_manager.py`: User preferences

## Quality Gates (Required for ANY commit)

- All tests passing (backend + frontend)
- Linting/formatting clean (ruff, ESLint)
- No new type errors
- Test count stable or increasing
- **No JSX/TSX duplicate files** (enforced by pre-commit)
- **Database isolation in tests** (global conftest.py fixture)
- **Guidelines compliance** (see docs/guidelines/)

### Pre-Commit Validation (MANDATORY)

**Run this before every commit:**

```bash
# Backend
uv run ruff check . --fix
uv run ruff format .
uv run pytest -m 'not slow and not browser and not external' --maxfail=3

# Frontend
cd frontend
pnpm tsc --noEmit
pnpm lint
pnpm test -- --passWithNoTests --watchAll=false
```

**Do not commit if any command fails.**

### CI Requirements Table

| Gate | Commits | PRs | Pre-merge |
|------|---------|-----|-----------|
| Backend lint (ruff) | ✅ | ✅ | ✅ |
| Backend unit tests | ✅ | ✅ | ✅ |
| Backend integration tests | - | ✅ | ✅ |
| Backend comprehensive tests | - | - | ✅ |
| Frontend type check (tsc) | ✅ | ✅ | ✅ |
| Frontend lint (eslint) | ✅ | ✅ | ✅ |
| Frontend unit tests | ✅ | ✅ | ✅ |
| Frontend build | - | ✅ | ✅ |
| Security scan | - | ⚠️ warn | ⚠️ warn |
| Guidelines compliance | ✅ | ✅ | ✅ |

## Testing Commands

### Frontend

```bash
cd frontend
pnpm test                 # Unit tests
pnpm build               # Build verification
pnpm tsc --noEmit        # Type check
```

### Backend

```bash
uv run pytest -m "unit" --maxfail=5              # Tier 1: Quick feedback
uv run pytest -m "not slow and not browser and not external" --maxfail=3  # Tier 2: CI
uv run pytest                                     # Tier 3: Full suite
```

### Pytest Markers (8 essential)

| Marker | Purpose |
|--------|---------|
| `unit` | Pure logic, no I/O (<10ms) |
| `integration` | Internal services (10-100ms) |
| `slow` | Complex setup (>1s) |
| `database` | Requires DB access |
| `browser` | Requires Playwright/Selenium |
| `external` | Requires external APIs |
| `security` | Security validation |
| `requires_migrations` | Production-like migrations |

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
pnpm test -- --testNamePattern="PersonalityTraits"
```

## API Endpoints

- `/api/animals`: CRUD + filtering, search, stats, breeds
- `/api/enhanced_animals`: AI-enriched data, semantic search
- `/api/swipe`: Tinder-like discovery interface
- `/api/llm`: Enrichment, translation, batch processing
- `/api/organizations`: Org management, metrics, stats
- `/api/monitoring`: Health checks, scraper status, metrics
- `/api/sentry-test`: Error tracking debug endpoints

## LLM Integration

- Model: Google Gemini 3 Flash via OpenRouter
- Cost: ~$0.005/dog
- Success rate: 97%+
- Config: `configs/llm_organizations.yaml`
- Prompts: `prompts/organizations/*.yaml`

## Documentation

- Architecture: `docs/technical/architecture.md`
- LLM Feature: `docs/features/llm-data-enrichment.md`
- **Guidelines:**
  - Python: `docs/guidelines/PYTHON_GUIDELINES.md`
  - TypeScript: `docs/guidelines/TYPESCRIPT_GUIDELINES.md`
  - React/Next.js: `docs/guidelines/REACT_GUIDELINES.md`
  - Web Design: `docs/guidelines/WEB_DESIGN_GUIDELINES.md`

## When Stuck

1. Check existing implementations
2. Review test patterns
3. Use MCP tools
4. Run subagents for complex tasks
5. **Review guidelines** for best practices
6. Ask for clarification - don't guess
