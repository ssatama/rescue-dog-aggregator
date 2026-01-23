# Quick Start Commands

*Primary audience: Claude Code for rapid task execution*

## Essential Commands

### Initial Setup
```bash
# Install dependencies with uv
uv sync

# Install frontend dependencies with pnpm
cd frontend && pnpm install

# Database setup
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals;"
```

### Running the Application
```bash
# Start backend (from root)
uv run python run_api.py

# Start frontend (separate terminal)
cd frontend && pnpm dev

# Access application
open http://localhost:3000
```

## Testing Commands

### Fast Test Suites
```bash
# Tier 1: Quick developer feedback (most common)
uv run pytest -m "unit or fast" --maxfail=5 -x

# Frontend tests
cd frontend && pnpm test

# Single test file
uv run pytest tests/api/test_swipe_endpoint.py -v
pnpm test -- SwipeDetails.test.tsx
```

### Comprehensive Testing
```bash
# Full backend test suite
uv run pytest -m "not slow and not browser and not external" --maxfail=3

# Frontend with coverage
cd frontend && pnpm test -- --coverage

# Type checking
cd frontend && pnpm tsc --noEmit
```

## Build & Validation
```bash
# Backend build verification
uv run python -m py_compile api/**/*.py

# Frontend build
cd frontend && pnpm build

# Lint checking
uv run ruff check .
cd frontend && pnpm lint
```

## Database Operations
```bash
# Check database status
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals; SELECT COUNT(*) FROM organizations;"

# Run migrations
uv run alembic upgrade head

# Emergency reset
uv run python management/emergency_operations.py --reset-stale-data
```

## Configuration Management
```bash
# List organizations
uv run python management/config_commands.py list

# Sync configurations
uv run python management/config_commands.py sync

# Run specific scraper
uv run python management/config_commands.py run pets-turkey
```

## Git Operations
```bash
# Check status
git status

# Stage changes
git add -A

# Commit with message
git commit -m "fix: resolve API routing issue"

# Push to remote
git push origin main
```

## Debugging Commands
```bash
# View logs
tail -f logs/api.log

# Check API health
curl http://localhost:8000/health

# Database connection test
uv run python -c "from services.database_service import DatabaseService; print(DatabaseService().test_connection())"
```

## Production Operations
```bash
# Deploy to production (automatic via GitHub)
git push origin main

# Railway CLI operations
railway logs
railway run uv run python management/emergency_operations.py

# Vercel operations
vercel --prod
vercel rollback
```

## Common Fix Patterns

### Module Import Errors
```bash
touch utils/__init__.py
touch management/__init__.py
uv sync
```

### Frontend Module Issues
```bash
cd frontend
rm -rf node_modules .next
pnpm install
pnpm build
```

### Test Isolation Issues
```bash
# Tests are automatically isolated via global conftest.py
# If issues persist:
uv run pytest --fixtures  # List all fixtures
uv run pytest -k "not integration"  # Skip integration tests
```

### Type Errors
```bash
# Quick type check
cd frontend && pnpm tsc --noEmit

# Fix common type issues
pnpm add -D @types/[package-name]
```

## Performance & Monitoring
```bash
# Run performance tests
uv run pytest -m performance -v

# Check metrics
curl http://localhost:8000/api/metrics

# Memory profiling
uv run python -m memory_profiler run_api.py
```

## Development Workflow

### Starting New Feature
```bash
# 1. Create branch
git checkout -b feature/new-feature

# 2. Write failing test first
uv run pytest tests/test_new_feature.py  # See it fail

# 3. Implement feature
# ... code ...

# 4. Verify tests pass
uv run pytest tests/test_new_feature.py -v

# 5. Run full test suite
uv run pytest -m "unit or fast" --maxfail=5
```

### Before Committing
```bash
# Run quality checks
uv run ruff check . --fix
uv run ruff format .
uv run pytest -m "unit or fast" --maxfail=5
cd frontend && pnpm test
cd frontend && pnpm build
```

## Environment Variables
```bash
# Development
export DATABASE_URL="postgresql://user:pass@localhost/rescue_dogs"
export SENTRY_DSN="your-dev-dsn"
export API_URL="http://localhost:8000"

# Production (set in Railway/Vercel)
# Handled automatically via deployment platforms
```

## Quick Diagnostics
```bash
# Check Python version
python --version  # Should be 3.12+

# Check Node version  
node --version  # Should be 18+

# Check database connection
psql -d rescue_dogs -c "\conninfo"

# Check API is running
curl -I http://localhost:8000/health

# Check frontend is building
cd frontend && pnpm build --dry-run
```

## Emergency Recovery
```bash
# Full reset (nuclear option)
rm -rf .venv node_modules
uv sync
cd frontend && pnpm install

# Database recovery
pg_dump rescue_dogs > backup.sql
psql -d rescue_dogs < backup.sql

# Clear all caches
rm -rf .pytest_cache
rm -rf frontend/.next
rm -rf __pycache__
```

---
*For Claude Code: Use these commands directly. They are tested and production-ready. Always run tests before committing.*