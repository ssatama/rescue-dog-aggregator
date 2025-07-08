# CLAUDE.md - Rescue Dog Aggregator

## Mission

Build an open-source platform aggregating rescue dogs from multiple organizations. Focus: clean code, TDD, zero technical debt.

## Tech Stack

- Backend: Python/FastAPI/PostgreSQL
- Frontend: Next.js 15/React/TypeScript
- Testing: pytest (backend), Jest (frontend)
- Current: 78 backend test files, 74 frontend test files, 7 organizations

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
pytest tests/ -m "not slow" -v          # Fast tests
pytest tests/ -v                        # All tests

# Frontend
cd frontend
npm test                                # All tests
npm run build                          # Verify build

# Config Management (Configuration-Driven Architecture)
python management/config_commands.py list
python management/config_commands.py sync
python management/config_commands.py run pets-turkey
```

### Common Tasks

- API endpoint: Write test → Create route → Implement
- Scraper: Config YAML → Test extraction → Implement
- Component: Test behavior → Create component → Style

## Project Structure

```
api/          # FastAPI backend
scrapers/     # Web scrapers (see scrapers/CLAUDE.md)
frontend/     # Next.js app (see frontend/CLAUDE.md)
tests/        # Backend tests
configs/      # Organization YAMLs (7 orgs)
```

## Quality Gates (Required for ANY commit)

- All tests passing (backend + frontend)
- Linting/formatting clean
- No new type errors
- Test count stable or increasing

## When Stuck

1. Check existing similar implementations
2. Review tests for patterns
3. Ask for clarification
4. Break into smaller steps

## References

- Architecture: `docs/architecture/`
- Development: `docs/development/workflow.md`
- Testing: `docs/development/testing.md`
- Code examples: `docs/examples/`
- API reference: `docs/api/reference.md`
- Getting started: `docs/getting-started/installation.md`
- Configuration: `docs/getting-started/configuration.md`
- Operations: `docs/operations/troubleshooting.md`
