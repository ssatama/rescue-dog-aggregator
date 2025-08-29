# CLAUDE.md - Rescue Dog Aggregator

## Mission

Build an open-source platform aggregating rescue dogs from multiple organizations. Focus: clean code, TDD, zero technical debt.

## Tech Stack

- Backend: Python/FastAPI/PostgreSQL
- Frontend: Next.js 15/React/TypeScript
- Testing: pytest (backend), Jest (frontend)
- Current: 434+ backend tests, 1,249 frontend tests, 2200 dogs

## USE SUB-AGENTS FOR CONTEXT OPTIMIZATION

1. Always use the file-analyzer sub-agent when asked to read files.
   The file-analyzer agent is an expert in extracting and summarizing critical information from files, particularly log files and verbose outputs. It provides concise, actionable summaries that preserve essential information while dramatically reducing context usage.

2. Always use the code-analyzer sub-agent when asked to search code, analyze code, research bugs, or trace logic flow.
   The code-analyzer agent is an expert in code analysis, logic tracing, and vulnerability detection. It provides concise, actionable summaries that preserve essential information while dramatically reducing context usage.

3. Always use the test-runner sub-agent to run tests and analyze the test results.

Using the test-runner agent ensures:

- Full test output is captured for debugging
- Main conversation stays clean and focused
- Context usage is optimized
- All issues are properly surfaced
- No approval dialogs interrupt the workflow

## MCP Tools for Claude Code

- Utilize the available MCP servers and tools
- Use Postgres MCP to query the local dev database
- Use zen toolsfor planning, debugging, test generation, code reviews and peer feedback
- Use subagents in parallel from /agents to execute work efficiently
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

# Frontend

cd frontend
npm test # All tests
npm run build # Verify build

# Config Management (Configuration-Driven Architecture)

python management/config_commands.py list
python management/config_commands.py sync
python management/config_commands.py run pets-turkey

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
