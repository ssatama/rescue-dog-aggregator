# Development Workflow Guide

## Overview

This guide establishes the core development workflow for the Rescue Dog Aggregator project, focusing on efficient development practices, code quality, and production readiness across backend (Python) and frontend (Next.js) components.

## Development Philosophy

- **Quality-First Development**: Prioritize code quality and maintainability
- **Security by Design**: Consider security implications in every feature
- **Performance Awareness**: Monitor and optimize performance continuously
- **Test-Driven Development**: Write tests before implementing features
- **Clear Documentation**: Keep documentation current and comprehensive

## Development Environment Setup

### Backend Environment

```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# or venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements-dev.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your database and API credentials

# Set up databases
createdb rescue_dogs
createdb test_rescue_dogs

# Run migrations
python main.py --setup
DB_NAME=test_rescue_dogs python main.py --setup

# Apply production migrations
psql -d rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
psql -d rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
psql -d test_rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
psql -d test_rescue_dogs -f database/migrations/002_add_detailed_metrics.sql

# Verify config command setup
python management/config_commands.py list
python management/config_commands.py validate
```

### Configuration Management Commands

The project uses YAML-driven configuration management. Two execution methods are available:

```bash
# Direct execution (recommended)
python management/config_commands.py list              # List all organizations
python management/config_commands.py sync              # Sync to database
python management/config_commands.py validate          # Validate configs
python management/config_commands.py sync --dry-run    # Preview changes
python management/config_commands.py show rean         # Show specific org

# Module execution (alternative)
python -m management.config_commands list

# Common troubleshooting
touch utils/__init__.py management/__init__.py         # Ensure packages exist
source venv/bin/activate                               # Activate environment
```

### Frontend Environment

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with API endpoints

# Verify setup
npm test
npm run build
npm run lint
```

### IDE Configuration

**Recommended VS Code Extensions**:
- Python (Microsoft)
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter
- ESLint
- Jest
- Tailwind CSS IntelliSense

**VS Code Settings** (`.vscode/settings.json`):
```json
{
  "python.defaultInterpreterPath": "./venv/bin/python",
  "python.testing.pytestEnabled": true,
  "python.testing.pytestArgs": ["tests"],
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.organizeImports": true
  },
  "python.formatting.provider": "black",
  "eslint.workingDirectories": ["frontend"],
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Next.js 15 Development Patterns (CRITICAL)

### Environment-Aware Component Pattern (MANDATORY for Dynamic Routes)

**❌ NEVER DO THIS** (causes TypeScript build failures):
```javascript
// This breaks in Next.js 15
export default function PageComponent({ params }) {
  return <ClientComponent params={params} />;
}

// This breaks Jest tests
export default async function PageComponent({ params }) {
  const resolvedParams = await params;
  return <ClientComponent params={resolvedParams} />;
}
```

**✅ REQUIRED PATTERN** (Next.js 15 + Jest compatible):
```javascript
// src/app/[dynamic]/page.jsx
const isTestEnvironment = typeof process !== 'undefined' && process.env.NODE_ENV === 'test';

// Synchronous version for Jest tests
function PageComponent() {
  return <ClientComponent />;
}

// Asynchronous version for Next.js 15 production
async function PageComponentAsync({ params }) {
  try {
    if (params) await params;
  } catch {
    // Client component handles params via useParams()
  }
  return <ClientComponent />;
}

// Export appropriate version based on environment
export default isTestEnvironment ? PageComponent : PageComponentAsync;

// generateMetadata MUST be separate and async
export async function generateMetadata({ params }) {
  const resolvedParams = params && typeof params.then === 'function' 
    ? await params 
    : params || {};
  // Handle metadata generation
}
```

**Critical Requirements**:
1. **Client components MUST use `useParams()`** - never rely on props for params
2. **Environment detection MUST be robust** - check `typeof process`
3. **Error handling MUST be graceful** - wrap params in try/catch
4. **Tests MUST work synchronously** - Jest can't handle Promise components

## CTA Optimization Development Patterns

### Component Development Workflow

**Step 1: Component Setup with ToastProvider**
```javascript
// Always wrap CTA components with ToastProvider
import { ToastProvider } from '../components/ui/Toast';

function App() {
  return (
    <ToastProvider>
      <YourComponent />
    </ToastProvider>
  );
}
```

**Step 2: Environment-Aware Storage**
```javascript
// Use FavoritesManager for all localStorage operations
import { FavoritesManager } from '../utils/favorites';

// GOOD: Safe across SSR/client environments
const favorites = FavoritesManager.getFavorites();

// BAD: Breaks in SSR
const favorites = JSON.parse(localStorage.getItem('favorites'));
```

**Step 3: Mobile-First Responsive Design**
```javascript
// Always implement mobile-first with desktop overrides
<div className="w-full md:w-auto md:min-w-[280px]">
  <Button className="w-full md:w-auto">
    Action Button
  </Button>
</div>

// Mobile-only components
<MobileStickyBar className="md:hidden" />
```

### Error Handling Patterns

**Toast Error Feedback**:
```javascript
try {
  const result = FavoritesManager.addFavorite(dogId, dogData);
  if (result.success) {
    showToast(result.message, 'success');
  } else {
    showToast(result.message, 'error');
  }
} catch (error) {
  showToast('Failed to update favorites', 'error');
}
```

**Graceful Component Fallbacks**:
```javascript
// Always handle missing data gracefully
export default function FavoriteButton({ dog, variant = 'header' }) {
  if (!dog?.id) {
    // Render button but disable functionality
    return <button disabled>♡</button>;
  }
  
  // Normal functionality
  return <InteractiveFavoriteButton dog={dog} variant={variant} />;
}
```

## Core Development Workflow

### TDD Workflow
1. **Red**: Write failing test
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve code while keeping tests passing
4. **Commit**: Commit changes with clear message

### Git Workflow (Essential)
**Branch Naming**: `feature/name`, `fix/name`, `refactor/name`, `test/name`, `docs/name`

**Commit Format**: `type(scope): description`

**Examples**:
```bash
feat(scraper): add unified DOM extraction for REAN
fix(frontend): resolve image lazy loading race condition
test(api): add availability filtering test coverage
```

### Quality Gates
**Before Commit**:
- [ ] Tests pass (`pytest tests/` for backend, `npm test` for frontend)
- [ ] Code formatted (`black .` for Python, `prettier` for JS/TS)
- [ ] No linting errors
- [ ] Security scan passes

**Before PR**:
- [ ] All quality gates pass
- [ ] Manual testing completed
- [ ] Documentation updated if needed

## Quick Reference Commands

### Backend Commands
```bash
# Run tests
pytest tests/

# Code quality
black . && isort . && flake8 --exclude=venv .

# Security scan
bandit -r . -x venv/

# Config management
python management/config_commands.py list
python management/config_commands.py sync
```

### Frontend Commands
```bash
# Run tests
npm test

# Code quality
npm run lint && npx tsc --noEmit

# Build
npm run build

# Security audit
npm audit --audit-level=moderate
```

## Essential Quality Standards

### Code Quality Metrics
- **Current baseline**: ~1000 flake8 violations (mostly E501 line length)
- **Target improvements**: F401 (unused imports) = 0, W291/W293 (whitespace) ≤ 5
- **Formatting**: Use `black .` and `isort .` for consistent style
- **Security**: Run `bandit -r . -x venv/` for vulnerability scanning

### Documentation Standards
- **Python**: Use comprehensive docstrings with Args, Returns, Raises, Examples
- **React**: Use JSDoc comments with @component, @param, @example tags
- **README**: Keep setup instructions and examples current

---

**Note**: For comprehensive testing strategies, detailed testing patterns, and testing best practices, refer to the **[Testing Guide](./testing.md)**.