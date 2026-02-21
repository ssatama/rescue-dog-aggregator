# Testing Guide - Rescue Dog Aggregator

## Overview

**Test Statistics**: 444+ tests across 168 backend files and 276 frontend test files  
**Methodology**: Strict TDD (Red → Green → Refactor)  
**Protection**: Automatic database isolation via global `conftest.py`

## Quick Commands

### Backend (Python/pytest)
```bash
# Development
uv run pytest tests/ -m "unit or fast" -v              # Fast feedback (~1-5s) - RECOMMENDED
uv run pytest tests/ -m "not browser and not complex_setup" -v  # CI pipeline (~55s)
uv run pytest tests/ -v                                # Full suite

# By Category
uv run pytest tests/ -m "api" -v                       # API endpoints
uv run pytest tests/ -m "database" -v                  # Database integration
uv run pytest tests/ -m "browser" -v                   # Browser automation (Playwright)
```

### Frontend (Next.js/Jest)
```bash
cd frontend

pnpm test                                         # All tests
pnpm test -- --watch                             # TDD watch mode
pnpm test -- --coverage                          # Coverage report
pnpm test -- --testPathPattern=accessibility     # Specific category
```

## Backend Testing

### Test Markers (21 Categories)
```python
# Speed categories
unit            # Pure logic, no I/O (<1s)
fast            # Minimal I/O (1-5s)
slow            # Time-consuming operations

# Integration levels
api             # HTTP endpoint testing
database        # Data integrity and queries
integration     # Full workflow testing

# Specialized
browser              # Playwright browser automation
external             # External service dependencies
security             # Security validation
```

### TDD Example - Backend
```python
# Step 1: Write failing test
@pytest.mark.unit
def test_standardize_breed():
    result = standardize_breed("German Shepherd Mix")
    assert result == "German Shepherd"  # FAILS

# Step 2: Minimal implementation
def standardize_breed(breed: str) -> str:
    return breed.split(" ")[0] + " " + breed.split(" ")[1]

# Step 3: Refactor
def standardize_breed(breed: str) -> str:
    return " ".join(breed.split()[:2])
```

### Database Isolation (Automatic)
```python
# tests/conftest.py - Protects ALL tests automatically
@pytest.fixture(autouse=True)
def isolate_database_writes():
    """Prevents any test from writing to production database."""
    # Automatically mocks all database operations
```

### Scraper Testing Pattern
```python
@pytest.mark.integration
def test_scraper_with_context_manager():
    """Modern scraper pattern with automatic connection handling."""
    with MyScraper(config_id="org-name") as scraper:
        result = scraper.run()  # Automatic connection management
        assert result.success
        assert len(result.animals) > 0
```

## Frontend Testing

### Testing Boundaries

**Use Jest for:**
- ✅ Component logic and behavior
- ✅ Mocked API integrations
- ✅ Mobile viewport simulation
- ✅ Search/filter interactions
- ✅ Accessibility testing with React Testing Library

**Use E2E for:**
- ✅ Critical user journeys (3-5 workflows)
- ✅ Real browser navigation
- ✅ Cross-browser compatibility
- ✅ Real network conditions

### TDD Example - Frontend
```javascript
// Step 1: Write failing test
test('displays dog cards after loading', () => {
  render(<DogSection />);
  expect(screen.getByTestId('dog-carousel')).toBeInTheDocument(); // FAILS
});

// Step 2: Minimal component
export default function DogSection() {
  return <div data-testid="dog-carousel" />;
}

// Step 3: Refactor with full implementation
export default function DogSection({ dogs }) {
  return (
    <div data-testid="dog-carousel">
      {dogs.map(dog => <DogCard key={dog.id} dog={dog} />)}
    </div>
  );
}
```

### Next.js 16 Testing Patterns
```javascript
// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-id' }),
  useRouter: () => ({ back: jest.fn() }),
  usePathname: () => '/test-path',
  useSearchParams: () => ({ get: () => null }),
}));

// Test without props (component uses useParams internally)
test('renders dynamic page', () => {
  render(<DynamicPage />);
  expect(screen.getByTestId('content')).toBeInTheDocument();
});
```

### Mobile Testing Pattern
```javascript
// Mock mobile viewport
Object.defineProperty(window, 'matchMedia', {
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(max-width: 767px)',
  }))
});

test('shows mobile menu on small screens', () => {
  render(<Header />);
  expect(screen.getByTestId('mobile-menu')).toBeInTheDocument();
});
```

### API Response Handling
```javascript
// Defensive pattern for multiple response structures
export async function getStandardizedBreeds() {
  try {
    const response = await get('/api/animals/meta/breeds');
    
    // Handle array, {data: array}, {breeds: array}
    if (Array.isArray(response)) return response;
    if (response?.data && Array.isArray(response.data)) return response.data;
    if (response?.breeds && Array.isArray(response.breeds)) return response.breeds;
    
    return []; // Fallback to prevent .filter() errors
  } catch (error) {
    logger.error("API error:", error);
    return [];
  }
}
```

## E2E Testing (Playwright)

### Critical User Journeys Only
```typescript
// e2e-tests/tests/end-to-end-adoption-journey.spec.ts
test('complete adoption journey', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="view-dogs"]');
  await page.fill('[role="searchbox"]', 'German Shepherd');
  await page.click('text=Search');
  await page.click('[data-testid="dog-card"]:first-child');
  await expect(page.locator('[data-testid="adopt-button"]')).toBeVisible();
});
```

## Performance Testing

### Backend Performance
```python
@pytest.mark.slow
def test_scraper_performance():
    start_time = time.time()
    result = scraper.collect_data()
    duration = time.time() - start_time
    
    assert duration < 60.0  # 60 second budget
    assert len(result) > 0
```

### Frontend Performance
```javascript
test('renders within performance budget', async () => {
  const startTime = performance.now();
  render(<DogsGrid dogs={createMockDogs(100)} />);
  const endTime = performance.now();
  
  expect(endTime - startTime).toBeLessThan(100); // 100ms budget
});
```

## Security Testing

### XSS Prevention
```javascript
test('sanitizes malicious content', () => {
  const malicious = '<script>alert("xss")</script>Hello';
  render(<DogCard description={malicious} />);
  
  expect(document.querySelector('script')).toBeNull();
  expect(screen.getByText('Hello')).toBeInTheDocument();
});
```

### SQL Injection Prevention
```python
@pytest.mark.security
def test_sql_injection_prevention():
    malicious_input = "'; DROP TABLE animals; --"
    result = search_animals(name=malicious_input)
    
    # Verify database intact
    cursor.execute("SELECT COUNT(*) FROM animals")
    assert cursor.fetchone()[0] > 0
```

## Quality Gates (Pre-Commit)

```bash
# Backend
uv run ruff check . --fix
uv run ruff format .
uv run pytest tests/ -m "not slow" -v

# Frontend
cd frontend
pnpm test
pnpm build
pnpm lint

# Validation
echo "✅ Safe to commit!"
```

## Test Execution Strategies

### Parallel Execution
```bash
# Backend
uv run pytest tests/ -n auto --dist=loadscope

# Frontend (default in Jest)
pnpm test -- --maxWorkers=4
```

### Watch Mode (TDD)
```bash
# Backend
uv run pytest tests/ -m "not slow" --tb=short -q

# Frontend
pnpm test -- --watch --coverage
```

### Coverage Analysis
```bash
# Backend
uv run pytest --cov=. --cov-report=html --cov-fail-under=90

# Frontend
pnpm test -- --coverage --coverageThreshold='{"global":{"lines":80}}'
```

## Debugging Tests

### Backend Debugging
```python
# Use breakpoints
import pdb; pdb.set_trace()

# Verbose output
uv run pytest tests/failing_test.py -vvs

# Show test durations
uv run pytest tests/ --durations=10
```

### Frontend Debugging
```javascript
// Browser debugger
debugger; // Browser stops here

// Console logging
console.log('Component state:', { props, state });

// React DevTools integration
```

## Best Practices

### Test Structure
1. **AAA Pattern**: Arrange → Act → Assert
2. **Isolation**: Each test independent
3. **Descriptive Names**: Clear intent
4. **Fast Feedback**: Unit > Integration > E2E

### Test Data
```python
# Backend fixture
@pytest.fixture
def test_dog_data():
    return {'name': 'Buddy', 'breed': 'Golden Retriever'}

# Frontend mock
const createMockDog = (overrides = {}) => ({
  id: 1, name: 'Buddy', breed: 'Golden Retriever', ...overrides
});
```

### CI/CD Integration
```yaml
- name: Run Tests
  run: |
    uv run pytest tests/ -v --junitxml=test-results.xml
    cd frontend && pnpm test -- --ci --coverage
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Import errors | `uv sync` |
| Database connection | Use `pytest -k "not database"` |
| Jest cache | `pnpm test -- --clearCache` |
| Flaky tests | `uv run pytest --lf --tb=short` |
| Memory issues | `pnpm test -- --maxWorkers=2` |

## Summary

- **TDD Mandatory**: Red → Green → Refactor
- **Database Protected**: Automatic isolation in all tests
- **Fast Feedback**: Use markers for speed (`unit`, `fast`, `slow`)
- **Clear Boundaries**: Jest for components, E2E for journeys
- **Quality Gates**: All tests must pass before commit