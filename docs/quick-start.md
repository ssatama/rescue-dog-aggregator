# Quick Start Commands

*Primary audience: Claude Code for rapid task execution*

## Essential Commands

### Initial Setup
```bash
# Activate Python environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
npm install --prefix frontend

# Database setup
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals;"
```

### Running the Application
```bash
# Start backend (from root)
python run_api.py

# Start frontend (separate terminal)
cd frontend && npm run dev

# Access application
open http://localhost:3000
```

## Testing Commands

### Fast Test Suites
```bash
# Tier 1: Quick developer feedback (most common)
pytest -m "unit or fast" --maxfail=5 -x

# Frontend tests
cd frontend && npm test

# Single test file
pytest tests/api/test_swipe_endpoint.py -v
npm test -- SwipeDetails.test.tsx
```

### Comprehensive Testing
```bash
# Full backend test suite
pytest -m "not slow and not browser and not external" --maxfail=3

# Frontend with coverage
cd frontend && npm run test:coverage

# Type checking
cd frontend && npm run type-check
mypy .
```

## Build & Validation
```bash
# Backend build verification
python -m py_compile api/**/*.py

# Frontend build
cd frontend && npm run build

# Lint checking
ruff check .
cd frontend && npm run lint
```

## Database Operations
```bash
# Check database status
psql -d rescue_dogs -c "SELECT COUNT(*) FROM animals; SELECT COUNT(*) FROM organizations;"

# Run migrations
alembic upgrade head

# Emergency reset
python management/emergency_operations.py --reset-stale-data
```

## Configuration Management
```bash
# List organizations
python management/config_commands.py list

# Sync configurations
python management/config_commands.py sync

# Run specific scraper
python management/config_commands.py run pets-turkey
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
# Check Sentry errors (via MCP)
# Use Sentry MCP tools in Claude Code

# View logs
tail -f logs/api.log

# Check API health
curl http://localhost:8000/health

# Database connection test
python -c "from services.database_service import DatabaseService; print(DatabaseService().test_connection())"
```

## Production Operations
```bash
# Deploy to production (automatic via GitHub)
git push origin main

# Railway CLI operations
railway logs
railway run python management/emergency_operations.py

# Vercel operations
vercel --prod
vercel rollback
```

## Common Fix Patterns

### Module Import Errors
```bash
touch utils/__init__.py
touch management/__init__.py
source venv/bin/activate
pip install -e .
```

### Frontend Module Issues
```bash
cd frontend
rm -rf node_modules package-lock.json .next
npm install
npm run build
```

### Test Isolation Issues
```bash
# Tests are automatically isolated via global conftest.py
# If issues persist:
pytest --fixtures  # List all fixtures
pytest -k "not integration"  # Skip integration tests
```

### Type Errors
```bash
# Quick type check
cd frontend && npm run type-check

# Fix common type issues
npm install --save-dev @types/[package-name]
```

## Performance & Monitoring
```bash
# Run performance tests
pytest -m performance -v

# Check metrics
curl http://localhost:8000/api/metrics

# Memory profiling
python -m memory_profiler run_api.py
```

## Development Workflow

### Starting New Feature
```bash
# 1. Create branch
git checkout -b feature/new-feature

# 2. Write failing test first
pytest tests/test_new_feature.py  # See it fail

# 3. Implement feature
# ... code ...

# 4. Verify tests pass
pytest tests/test_new_feature.py -v

# 5. Run full test suite
pytest -m "unit or fast" --maxfail=5
```

### Before Committing
```bash
# Run quality checks
pytest -m "unit or fast" --maxfail=5
cd frontend && npm test
cd frontend && npm run build
ruff check .
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
python --version  # Should be 3.9+

# Check Node version  
node --version  # Should be 18+

# Check database connection
psql -d rescue_dogs -c "\conninfo"

# Check API is running
curl -I http://localhost:8000/health

# Check frontend is building
cd frontend && npm run build --dry-run
```

## Emergency Recovery
```bash
# Full reset (nuclear option)
rm -rf venv node_modules
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cd frontend && npm install

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