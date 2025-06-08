# Development Workflow Guide

## Overview

This guide establishes the development workflow for the Rescue Dog Aggregator project, emphasizing **Test-Driven Development (TDD)**, code quality, security, and production readiness. The workflow ensures consistent, reliable development practices across backend (Python) and frontend (Next.js) components.

## Development Philosophy

### Test-Driven Development (TDD)

The project follows strict TDD methodology:

1. **Red**: Write failing tests first
2. **Green**: Write minimal code to make tests pass
3. **Refactor**: Improve code while maintaining test coverage

**Benefits**:
- Higher code quality and reliability
- Better design through test-first thinking
- Comprehensive test coverage (93%+ backend, 95+ frontend tests)
- Reduced debugging time
- Documentation through tests

### Quality Standards

**Code Quality Gates**:
- 93%+ test coverage (backend)
- 95+ test suites passing (frontend)
- Zero linting errors
- Successful production builds
- Security vulnerability scans passing
- Performance regression tests passing

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
pytest tests/scrapers/test_new_feature.py::test_extract_dog_temperament -v
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
pytest tests/scrapers/test_new_feature.py::test_extract_dog_temperament -v
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

## Code Quality Workflow

### Pre-Commit Quality Checks

**Backend Quality Gate**:
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

**Frontend Quality Gate**:
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

### Git Workflow

**Branch Naming Convention**:
- `feature/feature-name` - New features
- `fix/bug-description` - Bug fixes
- `refactor/component-name` - Code refactoring
- `test/test-description` - Test improvements
- `docs/documentation-update` - Documentation changes

**Commit Message Format**:
```
type(scope): description

[optional body]

[optional footer]
```

**Examples**:
```bash
feat(scraper): add unified DOM extraction for REAN
fix(frontend): resolve image lazy loading race condition
test(api): add availability filtering test coverage
docs(readme): update development setup instructions
```

### Pull Request Workflow

**PR Template** (`.github/pull_request_template.md`):
```markdown
## Description
Brief description of the changes

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Backend tests pass (`pytest tests/`)
- [ ] Frontend tests pass (`npm test`)
- [ ] Manual testing completed
- [ ] Production build succeeds

## Quality Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Code is well-commented
- [ ] Tests added for new functionality
- [ ] Documentation updated (if needed)

## Security Considerations
- [ ] No sensitive data exposed
- [ ] Input validation implemented
- [ ] XSS prevention measures in place
- [ ] Dependencies are secure
```

**PR Review Process**:
1. **Automated Checks**: CI/CD pipeline runs all quality gates
2. **Code Review**: Peer review for logic, security, and best practices
3. **Testing**: Manual testing of new features
4. **Documentation**: Verify documentation is updated
5. **Approval**: Requires at least one approval from maintainer

## Debugging Workflow

### Backend Debugging

**Debug Configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Scraper",
      "type": "python",
      "request": "launch",
      "module": "management.config_commands",
      "args": ["run", "organization-name"],
      "console": "integratedTerminal",
      "env": {
        "PYTHONPATH": "${workspaceFolder}"
      }
    },
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

### Frontend Debugging

**Debug Configuration**:
```json
// .vscode/launch.json (add to configurations array)
{
  "name": "Debug Next.js",
  "type": "node",
  "request": "launch",
  "program": "${workspaceFolder}/frontend/node_modules/.bin/next",
  "args": ["dev"],
  "cwd": "${workspaceFolder}/frontend",
  "env": {
    "NODE_OPTIONS": "--inspect"
  }
}
```

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

## Performance Optimization Workflow

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

## Security Workflow

### Security Testing

**Backend Security**:
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

**Frontend Security**:
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

## Continuous Integration Integration

### GitHub Actions Workflow

**Backend CI** (`.github/workflows/backend.yml`):
```yaml
name: Backend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.9'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements-dev.txt
    
    - name: Run quality checks
      run: |
        black --check .
        isort --check-only .
        flake8 --exclude=venv .
        bandit -r . -x venv/
    
    - name: Run tests
      run: |
        pytest tests/ --cov=. --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
```

**Frontend CI** (`.github/workflows/frontend.yml`):
```yaml
name: Frontend CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    defaults:
      run:
        working-directory: frontend

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
        cache-dependency-path: frontend/package-lock.json
    
    - name: Install dependencies
      run: npm ci
    
    - name: Security audit
      run: npm audit --audit-level=moderate
    
    - name: Lint
      run: npm run lint
    
    - name: Type check
      run: npx tsc --noEmit
    
    - name: Test
      run: npm test -- --coverage --watchAll=false
    
    - name: Build
      run: npm run build
```

## Documentation Workflow

### Code Documentation

**Python Docstrings**:
```python
def extract_dog_data(self, html_content: str, page_type: str) -> Dict[str, Any]:
    """
    Extract structured dog data from HTML content.
    
    Args:
        html_content: Raw HTML content from the organization's website
        page_type: Type of page being scraped (e.g., 'adoptable', 'foster')
    
    Returns:
        Dictionary containing extracted dog information with keys:
        - name: Dog's name
        - breed: Breed information
        - age_text: Age description
        - size: Size description
        - description: Full description text
        - primary_image_url: Main image URL (if available)
    
    Raises:
        ValueError: If html_content is empty or invalid
        
    Example:
        >>> scraper = MyOrgScraper()
        >>> html = "<div>Dog content</div>"
        >>> result = scraper.extract_dog_data(html, "adoptable")
        >>> print(result['name'])
        'Buddy'
    """
```

**React Component Documentation**:
```javascript
/**
 * Displays a dog's temperament information as styled badges.
 * 
 * @component
 * @param {Object} props - Component properties
 * @param {Object} props.temperament - Temperament data object
 * @param {string[]} props.temperament.traits - Array of temperament traits
 * @param {boolean|null} props.temperament.good_with_kids - Kid compatibility
 * @param {boolean|null} props.temperament.good_with_dogs - Dog compatibility  
 * @param {boolean|null} props.temperament.good_with_cats - Cat compatibility
 * 
 * @example
 * const temperament = {
 *   traits: ['friendly', 'energetic'],
 *   good_with_kids: true,
 *   good_with_dogs: false,
 *   good_with_cats: null
 * };
 * 
 * return <TemperamentDisplay temperament={temperament} />;
 */
export default function TemperamentDisplay({ temperament }) {
  // Component implementation
}
```

### README Updates

Keep project documentation current:
- Update setup instructions for new dependencies
- Document new environment variables
- Add examples for new features
- Update troubleshooting guides
- Maintain API documentation

## Best Practices Summary

### Development Principles

1. **Test-First Development**: Always write tests before implementation
2. **Security by Design**: Consider security implications in every feature
3. **Performance Awareness**: Monitor and optimize performance continuously
4. **Code Quality**: Maintain high standards through automation
5. **Documentation**: Keep documentation current and comprehensive

### Quality Assurance

1. **Automated Testing**: Comprehensive test suites with high coverage
2. **Code Review**: Peer review for all changes
3. **Static Analysis**: Automated linting and security scanning
4. **Performance Testing**: Regular performance regression testing
5. **Security Testing**: Continuous security vulnerability assessment

### Collaboration

1. **Clear Communication**: Descriptive commit messages and PR descriptions
2. **Knowledge Sharing**: Document decisions and architectural choices
3. **Code Standards**: Consistent formatting and style guidelines
4. **Review Culture**: Constructive feedback and learning opportunities
5. **Documentation**: Maintain comprehensive guides and references

This development workflow ensures high-quality, secure, and maintainable code while promoting efficient collaboration and continuous improvement.