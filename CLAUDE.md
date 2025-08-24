# CLAUDE.md - Rescue Dog Aggregator

## Mission

Build an open-source platform aggregating rescue dogs from multiple organizations. Focus: clean code, TDD, zero technical debt.

## Tech Stack

- Backend: Python/FastAPI/PostgreSQL
- Frontend: Next.js 15/React/TypeScript
- Testing: pytest (backend), Jest (frontend)
- Current: 434+ backend tests, 1,249 frontend tests, 2200 dogs

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
- Mutate state or data structures
- Create files >200 lines
- Commit directly to main
- Act like a sycophant. Always be direct and fair.

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

## Quick Reference - Common Tasks

### Add New API Endpoint

```
TASK: Add /api/v1/[endpoint] that [functionality]

PHASE 1 - RESEARCH:
- Read api/routes/ structure
- Check existing endpoint patterns
- Review database models

PHASE 2 - PLAN:
□ Write failing test for endpoint
□ Create route handler
□ Add database query
□ Handle errors
□ Update API documentation

PHASE 3 - EXECUTE:
[Implement with TDD...]
```

### Add New Scraper

```
TASK: Add scraper for [Organization]

PHASE 1 - RESEARCH:
- Analyze target website structure
- Identify data patterns
- Check existing scraper implementations

PHASE 2 - PLAN:
□ Create YAML config
□ Write extraction tests
□ Implement scraper class
□ Test with real data
□ Add to documentation

PHASE 3 - EXECUTE:
[Implement step by step...]
```

### Fix Failing Test

```
TASK: Fix failing test [test name]

PHASE 1 - RESEARCH:
- Read the failing test
- Understand expected behavior
- Check related code

PHASE 2 - PLAN:
□ Identify root cause
□ Plan fix approach
□ Consider edge cases
□ Verify no side effects

PHASE 3 - EXECUTE:
[Fix properly...]
```

## Emergency Commands

```bash
# When nothing works
source venv/bin/activate
touch utils/__init__.py management/__init__.py
pip install -r requirements.txt

# Frontend issues
cd frontend && rm -rf node_modules .next
npm install && npm run build

# Database issues
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals;"
python management/emergency_operations.py --reset-stale-data

# Module not found (Python)
touch utils/__init__.py
source venv/bin/activate
pip install -e .

# Cannot find module (JS)
cd frontend
rm -rf node_modules package-lock.json
npm install

# Single test execution
pytest tests/path/to/test.py::test_name -v
npm test -- --testNamePattern="test name"
```

## Test Commands Summary

```bash
# Backend Testing Levels
pytest tests/scrapers/test_specific.py::test_name -v  # One test
pytest tests/ -m "unit" -v                            # Fast unit tests
pytest tests/ -m "not slow" -v                        # Dev tests
pytest tests/ -v                                      # All tests

# Frontend Testing
npm test DogCard                                      # One component
npm test -- --testNamePattern="renders correctly"     # Pattern match
npm test                                              # All tests
```

## Common Patterns

```python
# Scraper patterns
AGE_PATTERN = r'(\d+)\s*(year|month|week)s?\s*old'
WEIGHT_PATTERN = r'(\d+\.?\d*)\s*(kg|lb|pound)'
ID_PATTERN = r'[A-Z0-9]{6,12}'

# Validation patterns
EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
URL_PATTERN = r'^https?://[^\s<>"{}|\\^`\[\]]+$'
```

## References

- Architecture: `docs/technical/architecture.md`
- Testing Guide: `docs/guides/testing.md`
- Installation: `docs/guides/installation.md`
- Deployment: `docs/guides/deployment.md`
- API Reference: `docs/technical/api-reference.md`
- Troubleshooting: `docs/troubleshooting.md`
- Contributing: `CONTRIBUTING.md`
