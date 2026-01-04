# CLAUDE.md - Rescue Dog Aggregator

## Mission

Build an open-source platform aggregating rescue dogs from multiple organizations. Focus: clean code, TDD, zero technical debt.

## Tech Stack

- Backend: Python/FastAPI/PostgreSQL 15/Alembic
- Frontend: Next.js 15 (App Router)/React 18/TypeScript 5
- Testing: pytest (backend), Jest/Playwright (frontend)
- AI: OpenRouter API (Google Gemini 3 Flash) for LLM enrichment
- Browser Automation: Playwright (Browserless v2 in production)
- Monitoring: Sentry (dev/prod)
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

## Project Structure

```
api/              # FastAPI backend with async routes
├── routes/       # animals, organizations, swipe, llm, monitoring
services/         # Core services (14 total)
├── llm/          # AI profiling pipeline (20 files)
scrapers/         # 13 organization scrapers
frontend/         # Next.js 15 App Router
├── app/          # Pages: dogs/, swipe/, favorites/, breeds/, guides/
├── components/   # UI components organized by feature (20 dirs)
tests/            # Backend tests with fixtures
configs/          # Organization YAMLs (13 active)
migrations/       # Alembic database migrations
management/       # CLI tools (18 scripts)
```

## Key Services

- `database_service.py`: Async connection pooling
- `llm_profiler_service.py`: AI personality profiling
- `adoption_detection.py`: Track adopted dogs
- `metrics_collector.py`: Performance monitoring
- `session_manager.py`: User preferences

## Quality Gates (Required for ANY commit)

- All tests passing (backend + frontend)
- Linting/formatting clean (black, isort, ESLint)
- No new type errors
- Test count stable or increasing
- **No JSX/TSX duplicate files** (enforced by pre-commit)
- **Database isolation in tests** (global conftest.py fixture)

### Pre-Commit Validation (MANDATORY)

**Run this before every commit:**

```bash
source venv/bin/activate && echo '🐍 BACKEND CHECKS' && black . && isort . && pytest -m 'not slow and not browser and not external' --maxfail=3 && echo '⚛️ FRONTEND CHECKS' && cd frontend && npm run lint && npm test -- --passWithNoTests --watchAll=false && echo '✅ PRE-COMMIT VALIDATION PASSED - SAFE TO COMMIT!'
```

This validates:

- Python formatting (black, isort)
- Backend tests (excluding slow/browser/external)
- Frontend linting (ESLint)
- Frontend tests (Jest)

**Do not commit if this command fails.**

## Testing Commands

### Frontend

```bash
cd frontend
npm test                  # Unit tests
npm run build            # Build verification
```

### Backend

```bash
source venv/bin/activate
pytest -m "unit or fast" --maxfail=5           # Tier 1: Quick feedback
pytest -m "not slow and not browser" --maxfail=3  # Tier 2: CI
pytest                                          # Tier 3: Full suite
```

## Config Management

```bash
python management/config_commands.py list      # List organizations
python management/config_commands.py sync      # Sync to database
python management/config_commands.py profile --org-id 11  # LLM profiling
python management/llm_commands.py generate-profiles       # Batch enrichment
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
python management/emergency_operations.py --reset-stale-data

# Frontend rebuild
cd frontend && rm -rf node_modules .next && npm install && npm run build

# Python modules
source venv/bin/activate && pip install -r requirements.txt

# Single test
pytest tests/api/test_swipe.py::test_name -v
npm test -- --testNamePattern="PersonalityTraits"
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

## When Stuck

1. Check existing implementations
2. Review test patterns
3. Use MCP tools
4. Run subagents for complex tasks
5. Ask for clarification - don't guess
