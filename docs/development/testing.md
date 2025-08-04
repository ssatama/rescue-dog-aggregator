# 🧪 Testing Guide

## Overview

This guide covers comprehensive testing strategies for the Rescue Dog Aggregator project, emphasizing **Test-Driven Development (TDD)**, quality assurance, and testing best practices across backend (Python) and frontend (Next.js) components.

## Test-Driven Development (TDD)

### TDD Methodology

The project follows strict TDD methodology:

1. **Red**: Write failing tests first
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Improve code while maintaining test coverage

**Benefits**:
- Higher code quality and reliability
- Better design through test-first thinking
- Comprehensive test coverage (99+ backend test files, 384+ frontend test files)
- Reduced debugging time
- Documentation through tests
- Database isolation protection via global conftest.py

### Quality Standards

**ENHANCED Code Quality Gates (MANDATORY)**:
- 99+ backend test files with optimized markers (unit, fast, slow) - ENFORCED
- 384+ frontend test files including mobile optimization and accessibility - REQUIRED
- Python linting: <750 flake8 violations, 0 F401, ≤5 W291, 0 E402 - ENFORCED  
- Next.js 15 TypeScript build successful - CRITICAL
- Security vulnerability scans passing - REQUIRED
- Environment-aware component patterns for dynamic routes - MANDATORY
- Database isolation via global conftest.py - AUTOMATICALLY ENFORCED
- Mobile optimization features (touch targets, bottom sheet filters, performance) fully tested - ENFORCED
- Accessibility compliance (WCAG 2.1 AA, ARIA labels, keyboard navigation) fully tested - ENFORCED

## TDD Workflow Examples

### Backend TDD Example (Adding New Scraper Feature)

**Step 1: Write Failing Test**
```python
# tests/scrapers/test_new_feature.py
def test_extract_dog_temperament():
    """Test extraction of dog temperament information."""
    scraper = MyOrgScraper()
    html_content = """
    <div class="dog-info">
        <h3>Buddy</h3>
        <p>Temperament: Friendly, energetic, good with kids</p>
    </div>
    """
    
    result = scraper.extract_temperament(html_content)
    expected = {
        'traits': ['friendly', 'energetic'],
        'good_with_kids': True,
        'good_with_dogs': None,
        'good_with_cats': None
    }
    
    assert result == expected  # This will FAIL initially
```

**Step 2: Run Failing Test**
```bash
# ALWAYS activate virtual environment first
source venv/bin/activate
python -m pytest tests/scrapers/test_new_feature.py::test_extract_dog_temperament -v
# FAIL - method doesn't exist
```

**Step 3: Write Minimal Implementation**
```python
# scrapers/my_org/scraper.py
def extract_temperament(self, html_content: str) -> dict:
    """Extract temperament information from HTML."""
    soup = BeautifulSoup(html_content, 'html.parser')
    temperament_text = soup.find('p', string=re.compile('Temperament:')).text
    
    # Minimal implementation to pass test
    traits = []
    if 'friendly' in temperament_text.lower():
        traits.append('friendly')
    if 'energetic' in temperament_text.lower():
        traits.append('energetic')
    
    return {
        'traits': traits,
        'good_with_kids': 'kids' in temperament_text.lower(),
        'good_with_dogs': None,
        'good_with_cats': None
    }
```

**Step 4: Run Test Again**
```bash
source venv/bin/activate
python -m pytest tests/scrapers/test_new_feature.py::test_extract_dog_temperament -v
# PASS
```

**Step 5: Refactor and Add Edge Cases**
```python
# Add more test cases
def test_extract_temperament_edge_cases():
    """Test temperament extraction edge cases."""
    scraper = MyOrgScraper()
    
    # Test with no temperament info
    html_no_info = "<div>No temperament info</div>"
    result = scraper.extract_temperament(html_no_info)
    assert result == {'traits': [], 'good_with_kids': None, 'good_with_dogs': None, 'good_with_cats': None}
    
    # Test with dogs and cats info
    html_detailed = """<p>Temperament: Calm, good with dogs and cats</p>"""
    result = scraper.extract_temperament(html_detailed)
    assert result['good_with_dogs'] is True
    assert result['good_with_cats'] is True
```

### Frontend TDD Example (Adding New Component)

**Step 1: Write Failing Test**
```javascript
// src/components/dogs/__tests__/TemperamentDisplay.test.jsx
import { render, screen } from '@testing-library/react';
import TemperamentDisplay from '../TemperamentDisplay';

describe('TemperamentDisplay', () => {
  test('displays temperament traits as badges', () => {
    const temperament = {
      traits: ['friendly', 'energetic'],
      good_with_kids: true,
      good_with_dogs: false,
      good_with_cats: null
    };

    render(<TemperamentDisplay temperament={temperament} />);

    // These will FAIL initially
    expect(screen.getByText('Friendly')).toBeInTheDocument();
    expect(screen.getByText('Energetic')).toBeInTheDocument();
    expect(screen.getByText('Good with kids')).toBeInTheDocument();
    expect(screen.queryByText('Good with dogs')).not.toBeInTheDocument();
    expect(screen.queryByText('Good with cats')).not.toBeInTheDocument();
  });
});
```

**Step 2: Run Failing Test**
```bash
npm test -- TemperamentDisplay.test.jsx
# FAIL - component doesn't exist
```

**Step 3: Create Minimal Component**
```javascript
// src/components/dogs/TemperamentDisplay.jsx
import React from 'react';
import { Badge } from '@/components/ui/badge';

export default function TemperamentDisplay({ temperament }) {
  if (!temperament) return null;

  return (
    <div className="temperament-display">
      {temperament.traits?.map(trait => (
        <Badge key={trait} variant="secondary">
          {trait.charAt(0).toUpperCase() + trait.slice(1)}
        </Badge>
      ))}
      
      {temperament.good_with_kids === true && (
        <Badge variant="outline">Good with kids</Badge>
      )}
      
      {temperament.good_with_dogs === true && (
        <Badge variant="outline">Good with dogs</Badge>
      )}
      
      {temperament.good_with_cats === true && (
        <Badge variant="outline">Good with cats</Badge>
      )}
    </div>
  );
}
```

**Step 4: Run Test Again**
```bash
npm test -- TemperamentDisplay.test.jsx
# PASS
```

**Step 5: Refactor and Add Features**
```javascript
// Add accessibility and security features
export default function TemperamentDisplay({ temperament }) {
  if (!temperament) return null;

  return (
    <div className="temperament-display" role="group" aria-label="Dog temperament information">
      {temperament.traits?.map(trait => (
        <Badge key={trait} variant="secondary">
          {sanitizeText(trait.charAt(0).toUpperCase() + trait.slice(1))}
        </Badge>
      ))}
      
      {/* Rest of component with ARIA labels */}
    </div>
  );
}
```

## Frontend Testing with Next.js 15

### Environment-Aware Testing Pattern

**Test Configuration** (ensure compatibility):
```javascript
// jest.setup.js - ensure proper mocking
// Mock Next.js navigation for tests
jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'test-id' }),
  useRouter: () => ({ back: jest.fn() }),
  usePathname: () => '/test-path',
  useSearchParams: () => ({ get: () => null }),
}));
```

**Test Pattern**:
```javascript
// Always test components without props in Next.js 15
describe('DynamicPage', () => {
  test('renders without props', () => {
    // This works because component uses useParams() internally
    render(<DynamicPage />);
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
```

### Testing Patterns for CTA Components

**localStorage Mock Setup**:
```javascript
// jest.setup.js or individual test file
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true
});
```

**Toast Testing with act()**:
```javascript
import { act, waitFor } from '@testing-library/react';

test('toast auto-dismisses after timeout', async () => {
  jest.useFakeTimers();
  
  // Trigger toast
  act(() => {
    fireEvent.click(button);
  });

  // Fast-forward time
  act(() => {
    jest.advanceTimersByTime(3000);
  });

  await waitFor(() => {
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  jest.useRealTimers();
});
```

**Accessibility Testing Pattern**:
```javascript
test('component has proper ARIA attributes', () => {
  render(<FavoriteButton dog={mockDog} variant="header" />);
  
  const button = screen.getByTestId('header-favorite-button');
  expect(button).toHaveAttribute('aria-label');
  
  const icon = button.querySelector('svg');
  expect(icon).toHaveAttribute('aria-hidden', 'true');
});
```

## Modern Database Isolation (Critical)

### Global Test Protection via conftest.py

**AUTOMATIC PROTECTION** (no manual setup required):
```python
# tests/conftest.py - Automatically protects ALL tests
@pytest.fixture(autouse=True)
def isolate_database_writes():
    """Automatically prevent all database writes during testing."""
    # Mocks organization sync service and scraper database operations
    # Prevents contamination of production database with test data
```

**Key Benefits**:
- **Zero Configuration**: All tests automatically protected
- **Production Safety**: Impossible to write to production database during tests
- **Clean Test Environment**: No "Test Organization" records in production
- **Comprehensive Coverage**: Protects scrapers, API endpoints, and configuration sync

**Previous Issue (RESOLVED)**:
- Tests were creating "Test Organization" records in production database
- Root cause: `test_config_integration.py` created real scraper instances
- Solution: Global mocking prevents all database operations during testing

## Testing Quality Gates

### ENHANCED Pre-Commit Quality Checks

**🚨 CRITICAL: Mandatory Enhanced Quality Gate** (Prevents TypeScript/Linting Failures):

**Full Pre-Commit Validation** (REQUIRED before every commit):
```bash
# Step 1: Backend Quality (Python) - ENFORCED standards
source venv/bin/activate
black . && isort .                                    # Format code (REQUIRED)
autopep8 --in-place --exclude=venv --recursive .     # Fix PEP8 violations (RECOMMENDED)
python -m pytest tests/ -m "not slow" -v            # Fast tests (REQUIRED - 99+ test files)

# Step 2: Frontend Quality (Next.js 15) - CRITICAL for TypeScript
cd frontend
npm test                                             # All 384+ test files (REQUIRED)
npm run build                                        # TypeScript build (CRITICAL)
npm run lint                                         # ESLint (REQUIRED)

# Step 3: Final Validation
echo "✅ PRE-COMMIT VALIDATION PASSED - Safe to commit!"
```

### Backend Quality Gate

```bash
#!/bin/bash
# scripts/backend_quality_check.sh

echo "Running backend quality checks..."

# Activate virtual environment
source venv/bin/activate

# Code formatting
echo "Formatting code with Black..."
black . --check --diff

# Import sorting
echo "Checking import order with isort..."
isort . --check-only --diff

# Linting
echo "Running flake8 linting..."
flake8 --exclude=venv .

# Type checking (if using mypy)
echo "Running type checks..."
mypy . --ignore-missing-imports

# Security scanning
echo "Running bandit security scan..."
bandit -r . -x venv/

# Tests with coverage
echo "Running tests with coverage..."
pytest tests/ --cov=. --cov-report=term-missing --cov-fail-under=93

echo "Backend quality checks completed!"
```

### Frontend Quality Gate

```bash
#!/bin/bash
# scripts/frontend_quality_check.sh

echo "Running frontend quality checks..."

cd frontend

# Dependency audit
echo "Auditing dependencies..."
npm audit --audit-level=moderate

# Linting
echo "Running ESLint..."
npm run lint

# Type checking
echo "Running TypeScript checks..."
npx tsc --noEmit

# Tests
echo "Running test suite..."
npm test -- --coverage --watchAll=false

# Build verification
echo "Verifying production build..."
npm run build

# Bundle analysis
echo "Analyzing bundle size..."
npm run analyze --silent

echo "Frontend quality checks completed!"
```

## Performance Testing

### Backend Performance

**Performance Testing**:
```python
# tests/performance/test_scraper_performance.py
import time
import pytest

def test_scraper_performance():
    """Test scraper performance meets requirements."""
    scraper = MyScraper()
    
    start_time = time.time()
    result = scraper.collect_data()
    duration = time.time() - start_time
    
    # Performance requirements
    assert duration < 60.0  # Should complete within 60 seconds
    assert len(result) > 0   # Should find some animals
    
    # Memory usage check
    import psutil
    process = psutil.Process()
    memory_mb = process.memory_info().rss / 1024 / 1024
    assert memory_mb < 500  # Should use less than 500MB
```

**Database Query Optimization**:
```python
# Use EXPLAIN ANALYZE for query optimization
def debug_query_performance():
    cursor = get_db_cursor()
    
    query = """
    EXPLAIN ANALYZE
    SELECT * FROM animals 
    WHERE status='available' 
    AND availability_confidence IN ('high', 'medium')
    LIMIT 20;
    """
    
    cursor.execute(query)
    result = cursor.fetchall()
    print(result)  # Analyze query plan
```

### Frontend Performance

**Performance Testing**:
```javascript
// src/__tests__/performance/load-time.test.js
describe('Performance Tests', () => {
  test('component renders within performance budget', async () => {
    const startTime = performance.now();
    
    render(<DogListingPage />);
    
    // Wait for async loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('dog-list')).toBeInTheDocument();
    });
    
    const loadTime = performance.now() - startTime;
    expect(loadTime).toBeLessThan(1000); // Should load within 1 second
  });
});
```

**Bundle Analysis**:
```bash
# Analyze bundle size
cd frontend
npm run build
npm run analyze

# Check for unused dependencies
npx depcheck

# Lighthouse CI for performance monitoring
npx lhci collect --url=http://localhost:3000
```

## Security Testing

### Backend Security

```python
# tests/security/test_sql_injection.py
def test_sql_injection_prevention():
    """Test that SQL injection is prevented."""
    malicious_input = "'; DROP TABLE animals; --"
    
    # This should not cause SQL injection
    result = search_animals(name=malicious_input)
    
    # Verify database is intact
    cursor = get_db_cursor()
    cursor.execute("SELECT COUNT(*) FROM animals")
    count = cursor.fetchone()[0]
    assert count > 0  # Table should still exist
```

### Frontend Security

```javascript
// src/__tests__/security/xss-prevention.test.js
describe('XSS Prevention', () => {
  test('malicious content is sanitized', () => {
    const maliciousContent = '<script>alert("xss")</script>Hello';
    
    render(<DogCard description={maliciousContent} />);
    
    // Should not contain script tags
    expect(document.querySelector('script')).toBeNull();
    // Should contain safe content
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Dependency Security

**Security Scanning**:
```bash
# Backend dependency scanning
pip-audit

# Frontend dependency scanning
npm audit

# Security linting
bandit -r . -x venv/  # Python
npm run lint:security  # JavaScript (ESLint security rules)
```

## Debugging for Testing

### Backend Test Debugging

**Debug Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Tests",
      "type": "python",
      "request": "launch",
      "module": "pytest",
      "args": ["${file}", "-v"],
      "console": "integratedTerminal"
    }
  ]
}
```

**Debugging Techniques**:
```python
# Use logging instead of print statements
import logging
logger = logging.getLogger(__name__)

def debug_function():
    logger.debug("Debug information")
    logger.info("Important information")
    logger.warning("Warning message")
    logger.error("Error occurred")

# Use breakpoints in tests
def test_scraper_functionality():
    scraper = MyScraper()
    result = scraper.extract_data(test_html)
    
    # Set breakpoint here for inspection
    import pdb; pdb.set_trace()
    
    assert result is not None
```

### Frontend Test Debugging

**Browser Debugging**:
```javascript
// Use React Developer Tools
// Use browser debugger
function DebugComponent({ data }) {
  // Set breakpoint in browser dev tools
  console.log('Component data:', data);
  
  useEffect(() => {
    // Debug useEffect
    debugger; // Browser will stop here
  }, [data]);

  return <div>{data.name}</div>;
}
```

## Testing Standards and Best Practices

### Test Organization

1. **Test Structure**: Follow AAA pattern (Arrange, Act, Assert)
2. **Test Naming**: Use descriptive test names that explain the scenario
3. **Test Data**: Use realistic test data that matches production scenarios
4. **Test Isolation**: Each test should be independent and not rely on others
5. **Mock Strategy**: Mock external dependencies but not internal logic

### Code Coverage

- **Backend**: Maintain >93% code coverage
- **Frontend**: Maintain >90% code coverage
- **Critical Paths**: 100% coverage for security and data integrity functions
- **Edge Cases**: Test error conditions and boundary cases

### Test Maintenance

1. **Update Tests**: Keep tests current with code changes
2. **Refactor Tests**: Improve test quality alongside production code
3. **Remove Dead Tests**: Delete tests that no longer serve a purpose
4. **Document Tests**: Add comments for complex test scenarios
5. **Review Tests**: Include tests in code review process

This comprehensive testing guide ensures high-quality, reliable code through systematic testing practices and continuous quality assurance.