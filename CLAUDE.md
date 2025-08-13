# CLAUDE.md - Rescue Dog Aggregator

## Mission

Build an open-source platform aggregating rescue dogs from multiple organizations. Focus: clean code, TDD, zero technical debt.

## Tech Stack

- Backend: Python/FastAPI/PostgreSQL
- Frontend: Next.js 15/React/TypeScript
- Testing: pytest (backend), Jest (frontend)
- Current: 434+ backend tests, 1,249 frontend tests, 8 organizations

## MCP Tools for Claude Code

- Utilize the available MCP servers and tools
- Use zen tools with Grok 4 for planning, debugging, test generation, code reviews and peer feedback
- Use consult7 to get familiar with a codebase or a certain part of it
- Combine subagents you have available with the MCP tools as well
- Use Serena MCP tools when possible, they are very powerful, Switch serena modes as appropriate using the switch mode command.


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

- Skip tests or write code without tests
- Delete/modify tests to make them pass
- Use localStorage/sessionStorage in frontend
- Mutate state or data structures
- Create files >200 lines
- Commit directly to main

## Essential Commands

```bash
# Backend (ALWAYS activate venv first)
source venv/bin/activate
source venv/bin/activate && pytest tests/ -m "unit or fast" -v      # Fast development feedback (RECOMMENDED)
pytest tests/ -m "not browser and not requires_migrations" -v  # CI pipeline - MUST PASS before push
pytest tests/ -v                        # All tests

# Frontend
cd frontend
npm test                                # All tests
npm run build                          # Verify build

# Config Management (Configuration-Driven Architecture)
python management/config_commands.py list
python management/config_commands.py sync
python management/config_commands.py run pets-turkey

# Data Quality Monitoring
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=overall --all        # All organizations
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=detailed --org-id=26 # Specific org (26 = gold standard)
```

### Common Tasks

- API endpoint: Write test → Create route → Implement
- Scraper: Config YAML → Test extraction → Implement (now with modern patterns)
- Component: Test behavior → Create component → Style
- **Duplicate check**: `npm run check:duplicates` (frontend only)

### Scraper Architecture (Recent Refactoring)

**BaseScraper now implements modern design patterns:**

- **Null Object Pattern**: Services default to null objects (no conditional checks)
- **Context Manager**: Use `with scraper:` for automatic connection handling
- **Template Method**: `run()` decomposed into focused phases
- **Dependency Injection**: Clean service injection at constructor level

**Example Usage:**

```python
# Modern pattern with context manager
with MyScraper(config_id="org-name") as scraper:
    result = scraper.run()  # Automatic connection management

# Service injection for testing/customization
scraper = MyScraper(
    config_id="org-name",
    metrics_collector=CustomMetricsCollector(),
    session_manager=CustomSessionManager()
)
```

## Project Structure

```
api/          # FastAPI backend
scrapers/     # Web scrapers (see scrapers/CLAUDE.md)
services/     # Extracted services (metrics, session, database, null objects)
frontend/     # Next.js app (see frontend/CLAUDE.md)
tests/        # Backend tests
configs/      # Organization YAMLs (8 orgs)
```

## Quality Gates (Required for ANY commit)

- All tests passing (backend + frontend)
- Linting/formatting clean
- No new type errors
- Test count stable or increasing
- **No JSX/TSX duplicate files** (automatically enforced by pre-commit hook)
- **Complete database isolation in tests** (automatically enforced by global conftest.py fixture)

## Database Isolation for Tests

**CRITICAL**: All Python tests are automatically protected from writing to production database.

### Global Protection

- `tests/conftest.py` contains `isolate_database_writes()` fixture that runs for ALL tests
- Automatically mocks organization sync service and scraper service injection
- Prevents any test from creating real database connections or data

### Previous Issue Fixed

- Tests were contaminating production database with "Test Organization" records
- Root cause: `test_config_integration.py` created real scraper instances
- Solution: Comprehensive global mocking prevents all database writes during testing

### Implementation

```python
@pytest.fixture(autouse=True)
def isolate_database_writes():
    # Automatically mocks all database operations for every test
```

## When Stuck

1. Check existing similar implementations
2. Review tests for patterns
3. Ask for clarification
4. Break into smaller steps
5. Use subagents and MCP tools to help you

## References

- Architecture: `docs/architecture/`
- Development: `docs/development/workflow.md`
- Testing: `docs/development/testing.md`
- Code examples: `docs/examples/`
- API reference: `docs/api/reference.md`
- Getting started: `docs/getting-started/installation.md`
- Configuration: `docs/getting-started/configuration.md`
- Operations: `docs/operations/troubleshooting.md`
