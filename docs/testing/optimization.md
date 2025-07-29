# Test Performance & Optimization

This document covers test execution optimization strategies, performance testing methodologies, and test suite maintenance for the Rescue Dog Aggregator platform.

## Test Suite Overview

The platform maintains comprehensive test coverage across backend and frontend:

**Backend Testing (Python/pytest):**
- 259 tests across 78 test files
- Organized by test markers for selective execution
- Database fixtures with session management
- Integration with PostgreSQL test database

**Frontend Testing (Jest/Next.js):**
- 1,500+ tests across 74 test files  
- Component testing with React Testing Library
- Accessibility testing with jest-axe
- Performance testing with Core Web Vitals

## Test Execution Optimization

### Selective Test Execution (Backend)

The pytest configuration uses markers to enable fast feedback loops:

```bash
# Fast tests only (1-5 seconds, minimal I/O)
pytest -m "fast"

# Exclude slow tests (for CI/PR feedback)
pytest -m "not slow"

# Unit tests only (pure logic, <1 second)
pytest -m "unit"

# Integration tests
pytest -m "integration"

# Specific test categories
pytest -m "api"
pytest -m "config"
pytest -m "database"
```

**Available Test Markers:**
- `unit`: Very fast unit tests (<1 second, pure logic)
- `fast`: Fast tests (1-5 seconds, minimal I/O)
- `slow`: Slow tests requiring external dependencies
- `integration`: Cross-component integration tests
- `api`: API endpoint tests
- `database`: Database operation tests
- `network`: Network simulation tests
- `selenium`: Browser automation tests

### Parallel Test Execution (Frontend)

Jest configuration supports parallel execution:

```bash
# Run tests in parallel (default)
npm test

# Control worker processes
npm test -- --maxWorkers=4

# Watch mode for development
npm test -- --watch

# Coverage reporting
npm test -- --coverage
```

### Test Data Management

**Database Fixtures:**
```python
# Session-scoped fixtures reduce database setup overhead
@pytest.fixture(scope="session")
def db_connection():
    """Shared database connection for test session."""
    connection = create_test_db_connection()
    yield connection
    connection.close()

@pytest.fixture
def clean_db(db_connection):
    """Clean database state between tests."""
    # Transaction-based cleanup for speed
    transaction = db_connection.begin()
    yield db_connection
    transaction.rollback()
```

**Mock Services:**
```python
# Service mocks in tests/fixtures/service_mocks.py
@pytest.fixture
def mock_image_service():
    """Mock image processing service for fast tests."""
    with patch('services.image_processing_service.ImageService') as mock:
        mock.return_value.process_image.return_value = "processed_url"
        yield mock
```

## Backend Test Optimization

### Database Test Strategies

**Transaction Rollback Pattern:**
```python
@pytest.fixture(autouse=True)
def auto_rollback(db_connection):
    """Automatic transaction rollback for database tests."""
    transaction = db_connection.begin()
    yield
    transaction.rollback()
```

**Shared Test Data:**
```python
# Use class-scoped fixtures for expensive setup
@pytest.fixture(scope="class")
def sample_organizations():
    """Create test organizations once per test class."""
    return create_test_organizations(count=5)
```

### API Testing Optimization

**Fast API Client:**
```python
from fastapi.testclient import TestClient

@pytest.fixture
def api_client():
    """Fast in-memory API client for testing."""
    with TestClient(app) as client:
        yield client

def test_get_animals(api_client):
    """Test API endpoint without network overhead."""
    response = api_client.get("/api/animals")
    assert response.status_code == 200
```

### Mocking External Dependencies

**Network Request Mocking:**
```python
@pytest.fixture
def mock_http_requests():
    """Mock external HTTP requests for speed."""
    with patch('requests.get') as mock_get:
        mock_get.return_value.json.return_value = {"test": "data"}
        yield mock_get
```

## Frontend Test Optimization

### Component Testing Strategies

**Shallow Rendering:**
```javascript
import { render, screen } from '@testing-library/react';

// Fast component rendering without child components
test('DogCard renders correctly', () => {
  render(<DogCard dog={mockDog} />);
  expect(screen.getByText(mockDog.name)).toBeInTheDocument();
});
```

**Mock External Dependencies:**
```javascript
// jest.setup.js - Global mocks
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => <img {...props} />
}));

jest.mock('../services/animalsService', () => ({
  getAnimals: jest.fn(() => Promise.resolve(mockAnimals))
}));
```

### Snapshot Testing Optimization

**Selective Snapshots:**
```javascript
// Only snapshot critical UI components
test('DogCard snapshot matches', () => {
  const { container } = render(<DogCard dog={mockDog} />);
  expect(container.firstChild).toMatchSnapshot();
});

// Use inline snapshots for small components
test('Badge renders correctly', () => {
  render(<Badge status="available" />);
  expect(screen.getByRole('status')).toMatchInlineSnapshot(`
    <span class="badge-available">Available</span>
  `);
});
```

### Performance Testing Integration

**Core Web Vitals Testing:**
```javascript
import { getCLS, getFID, getLCP } from 'web-vitals/base';

test('component performance metrics', async () => {
  render(<DogsList dogs={largeDogList} />);
  
  // Measure Cumulative Layout Shift
  getCLS(({ value }) => {
    expect(value).toBeLessThan(0.1);
  });
});
```

## CI/CD Optimization

### Test Pipeline Strategy

**Multi-Stage Testing:**
```yaml
# .github/workflows/ci.yml (conceptual)
stages:
  - name: "Fast Feedback"
    run: |
      pytest -m "unit" --maxfail=5
      npm test -- --passWithNoTests --watchAll=false
  
  - name: "Integration Tests"  
    run: |
      pytest -m "integration"
      npm test -- --testPathPattern=integration
      
  - name: "Full Test Suite"
    run: |
      pytest tests/
      npm test -- --coverage --watchAll=false
```

### Caching Strategies

**Dependency Caching:**
- pip cache for Python dependencies
- npm cache for Node.js packages
- pytest cache for test discovery
- Jest cache for transform results

**Database State Caching:**
- Reuse database migrations between test runs
- Cache test fixtures for expensive setup
- Use database snapshots for integration tests

## Test Suite Maintenance

### Performance Monitoring

**Test Execution Timing:**
```bash
# Monitor test performance over time
pytest --durations=10 -v

# Identify slow tests
pytest --durations=0 | grep "slow"

# Profile test execution
pytest --profile
```

**Coverage Tracking:**
```bash
# Backend coverage
pytest --cov=api --cov-report=html

# Frontend coverage  
npm test -- --coverage --coverageDirectory=coverage
```

### Flaky Test Detection

**Retry Strategy:**
```python
# pytest-rerunfailures for flaky test handling
@pytest.mark.flaky(reruns=2)
def test_potentially_flaky_operation():
    """Test that may fail due to timing issues."""
    pass
```

**Test Isolation:**
```python
# Ensure tests don't depend on execution order
@pytest.mark.order(1)
def test_setup():
    pass

@pytest.mark.order(2) 
def test_operation():
    pass
```

### Performance Benchmarking

**Backend Benchmarks:**
```python
# pytest-benchmark for performance testing
def test_data_processing_performance(benchmark):
    """Benchmark data processing function."""
    result = benchmark(process_dog_data, large_dataset)
    assert result is not None
```

**Frontend Benchmarks:**
```javascript
// Performance testing for React components
test('large list rendering performance', () => {
  const start = performance.now();
  render(<DogsList dogs={Array(1000).fill(mockDog)} />);
  const end = performance.now();
  
  expect(end - start).toBeLessThan(100); // 100ms threshold
});
```

## Load Testing

### API Load Testing

**Artillery Configuration:**
```yaml
# artillery.yml
config:
  target: 'http://localhost:8000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "API Load Test"
    requests:
      - get:
          url: "/api/animals"
      - get:
          url: "/api/organizations"
```

**Python Load Testing:**
```python
# locust for API load testing
from locust import HttpUser, task

class ApiUser(HttpUser):
    @task
    def get_animals(self):
        self.client.get("/api/animals")
    
    @task(2)
    def get_organizations(self):
        self.client.get("/api/organizations")
```

### Database Load Testing

**Connection Pool Testing:**
```python
def test_database_connection_pool():
    """Test database under concurrent load."""
    import concurrent.futures
    
    def make_query():
        with get_db_connection() as conn:
            return conn.execute("SELECT COUNT(*) FROM animals")
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(make_query) for _ in range(100)]
        results = [f.result() for f in futures]
    
    assert len(results) == 100
```

## Optimization Guidelines

### Test Development Best Practices

1. **Write Fast Tests First**: Start with unit tests, add integration tests as needed
2. **Mock External Dependencies**: Use mocks for network, file system, external APIs
3. **Use Appropriate Test Scope**: Match test scope to what you're testing
4. **Leverage Fixtures**: Reuse expensive setup across tests
5. **Profile Regularly**: Monitor test performance and identify bottlenecks

### Performance Targets

**Backend Tests:**
- Unit tests: <1 second each
- Fast tests: 1-5 seconds each
- Integration tests: <30 seconds each
- Full test suite: <5 minutes

**Frontend Tests:**
- Component tests: <100ms each
- Integration tests: <1 second each
- E2E tests: <10 seconds each
- Full test suite: <2 minutes

### Continuous Improvement

**Regular Optimization:**
- Review test execution times weekly
- Refactor slow tests quarterly
- Update mocking strategies as needed
- Monitor CI/CD pipeline performance

**Tool Updates:**
- Keep testing frameworks updated
- Leverage new optimization features
- Review and update fixture strategies
- Optimize database test patterns

This optimization strategy ensures fast feedback loops for development while maintaining comprehensive test coverage and reliable CI/CD pipelines.