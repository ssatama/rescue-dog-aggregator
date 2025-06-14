# Testing Guide for Rescue Dog Aggregator

This project follows a **Test-Driven Development (TDD)** approach with comprehensive coverage across both backend (Python/Pytest) and frontend (React/Jest) components. The testing strategy ensures production readiness through security, performance, accessibility, and reliability validation. Recent improvements include advanced speed optimization with 217 fast tests completing in 45 seconds.

## Testing Philosophy

The project maintains **95+ tests across 17 test suites** with focus on:
- **Security**: XSS prevention, input validation, SQL injection protection
- **Performance**: Lazy loading, component optimization, bundle analysis
- **Accessibility**: ARIA compliance, keyboard navigation, screen reader support
- **Reliability**: Error boundaries, graceful degradation, production workflows
- **Production Features**: Availability management, metrics collection, quality scoring

---

## Backend Tests

Run from the project root:

```bash
# Speed-optimized development workflow
source venv/bin/activate

# FAST: Core business logic across ALL modules (60+ tests in ~1s)
python -m pytest tests/ -m "unit" -v

# COMPLETE: All fast tests across entire codebase (217 tests in ~45s)
python -m pytest tests/ -m "not slow" -v

# COMPREHENSIVE: Full integration testing (512 total tests)
python -m pytest tests/ -v

# Specific test categories
python -m pytest tests/api/test_availability_filtering.py -v
python -m pytest tests/scrapers/test_base_scraper.py -v
```

### Speed-Optimized Test Architecture (NEW)

The testing system now includes advanced speed optimization:

**Test Markers & Performance**:
- `@pytest.mark.unit` - Pure logic tests (60+ tests, <1 second)
- `@pytest.mark.fast` - Tests with minimal I/O (complete suite in ~45s)
- `@pytest.mark.slow` - Integration tests requiring expensive operations
- `@pytest.mark.database` - Tests requiring database operations
- `@pytest.mark.selenium` - WebDriver automation tests
- `@pytest.mark.network` - Network simulation tests

**Fast Test Files** (NEW - for rapid development):
```bash
# Core business logic tests across ALL modules
python -m pytest tests/api/test_api_logic_fast.py -v                    # API logic (15 tests)
python -m pytest tests/config/test_config_logic_fast.py -v              # Config logic (14 tests)
python -m pytest tests/scrapers/test_rean_scraper_fast.py -v            # Core REAN logic (16 tests)
python -m pytest tests/scrapers/test_rean_unified_extraction_fast.py -v # Unified extraction (12 tests)
python -m pytest tests/scrapers/test_rean_error_handling_fast.py -v     # Error handling (16 tests)
```

- Tests live under `tests/`:
  - `tests/utils/` – standardization, audit scripts  
  - `tests/scrapers/` – BaseScraper + org-specific with production-ready features
  - `tests/api/` – integration tests against FastAPI endpoints with availability filtering
  - `tests/config/` – configuration system validation and management
  - `tests/security/` – SQL injection prevention, input validation
  - `tests/resilience/` – network failures, database issues, error recovery
  - `tests/integration/` – end-to-end workflows including Cloudinary
  - `tests/data_consistency/` – standardization reliability, data quality  

### Test Database

- Uses a Postgres test database `test_rescue_dogs`  
- Override provided in `tests/conftest.py` to point FastAPI’s `get_db_cursor` to the test DB.  
- Data fixtures clear & re-insert base records per test.
- **Important**: Test database requires availability management migrations:
  ```bash
  DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
  DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
  ```

---

## Frontend Tests (Next.js 15 + React Testing Library)

Run from the `frontend/` directory:

```bash
# Full test suite (95+ tests across 17 suites)
npm test

# Watch mode for development
npm run test:watch

# Coverage report
npm test -- --coverage

# Specific test categories
npm test -- src/__tests__/security/          # Security tests
npm test -- src/__tests__/performance/       # Performance tests  
npm test -- src/__tests__/accessibility/     # Accessibility tests
npm test -- src/components/                  # Component tests
npm test -- src/app/                         # Page tests
```

### Test Suite Architecture

**Comprehensive Test Coverage (95+ tests across 17 suites)**:

#### Security Tests (`src/__tests__/security/`)
- **XSS Prevention**: Content sanitization validation
- **Input Validation**: Malicious input handling
- **External Link Safety**: URL validation testing

```bash
npm test -- src/__tests__/security/content-sanitization.test.js
```

#### Performance Tests (`src/__tests__/performance/`)
- **Lazy Loading**: IntersectionObserver functionality
- **Component Memoization**: Re-render prevention
- **Image Optimization**: Cloudinary integration testing

```bash
npm test -- src/__tests__/performance/optimization.test.jsx
```

#### Accessibility Tests (`src/__tests__/accessibility/`)
- **ARIA Compliance**: Screen reader compatibility
- **Keyboard Navigation**: Tab order and focus management
- **Semantic HTML**: Proper landmark usage

```bash
npm test -- src/__tests__/accessibility/a11y.test.jsx
```

#### Component Tests (`src/components/.../__tests__/`)
- **UI Component Units**: Individual component testing
- **Error Boundaries**: Graceful failure handling
- **User Interactions**: Click, form, navigation testing

#### Page Tests (`src/app/.../__tests__/`)
- **Server/Client Separation**: Metadata generation testing
- **Dynamic Routing**: Parameter handling validation
- **Full Page Rendering**: Complete user journey testing

#### Integration Tests (`src/__tests__/integration/`)
- **API Communication**: Service integration validation
- **Metadata Validation**: SEO and OpenGraph testing
- **End-to-End Workflows**: Complete user flows

#### Build Quality Tests (`src/__tests__/build/`)
- **Production Build Validation**: Build process verification
- **Bundle Analysis**: Size and optimization testing
- **Asset Loading**: Resource availability testing

### Test-Driven Development Examples

**Security Test Example** (`content-sanitization.test.js`):
```javascript
describe('Content Sanitization', () => {
  test('sanitizeText removes dangerous HTML', () => {
    const malicious = '<script>alert("xss")</script>Hello World';
    const result = sanitizeText(malicious);
    expect(result).toBe('Hello World');
    expect(result).not.toContain('<script>');
  });

  test('sanitizeHtml preserves safe tags only', () => {
    const mixed = '<p>Safe</p><script>alert("bad")</script><strong>Also safe</strong>';
    const result = sanitizeHtml(mixed);
    expect(result).toBe('<p>Safe</p><strong>Also safe</strong>');
  });
});
```

**Performance Test Example** (`optimization.test.jsx`):
```javascript
describe('Lazy Loading', () => {
  test('LazyImage only loads when in viewport', () => {
    const mockObserver = { observe: jest.fn(), disconnect: jest.fn() };
    global.IntersectionObserver = jest.fn(() => mockObserver);

    render(<LazyImage src="test.jpg" alt="Test" />);
    expect(mockObserver.observe).toHaveBeenCalled();
  });
});
```

**Accessibility Test Example** (`a11y.test.jsx`):
```javascript
describe('Accessibility Compliance', () => {
  test('all images have descriptive alt text', () => {
    render(<DogCard dog={mockDog} />);
    const image = screen.getByRole('img');
    expect(image).toHaveAttribute('alt');
    expect(image.getAttribute('alt')).not.toBe('');
  });

  test('interactive elements have ARIA labels', () => {
    render(<FilterControls />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach(button => {
      expect(button).toHaveAttribute('aria-label');
    });
  });
});
```

### Frontend Test Configuration

**Jest Setup** (`jest.config.js`):
```javascript
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }]
  }
};
```

**Test Utilities** (`jest.setup.js`):
```javascript
import '@testing-library/jest-dom';

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = class {
  constructor(callback) {
    this.callback = callback;
  }
  observe() { return null; }
  disconnect() { return null; }
  unobserve() { return null; }
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/test-path',
  useSearchParams: () => new URLSearchParams(),
}));
```

### Social Media Share Tests

Advanced testing for social media integration:
- `<SocialMediaLinks>` component renders only provided networks
- Page components conditionally show share buttons based on data availability
- Link generation and validation for different platforms  

---

## Continuous Integration & Quality Gates

### Pre-Commit Quality Checks

**Backend Verification**:
```bash
# Speed-optimized pre-commit validation (RECOMMENDED)
source venv/bin/activate
black .                                      # Code formatting
isort .                                      # Import sorting
python -m pytest tests/ -m "not slow" -v    # Fast comprehensive suite (217 tests, ~45s)

# Full validation (for thorough verification)
flake8 --exclude=venv .                      # Linting
python -m pytest tests/ --cov=. --cov-report=term-missing -v  # Complete coverage
```

### Recent Test Infrastructure Improvements

**Speed Optimization Results**:
- **Development**: 217 non-slow tests in 45s across ALL modules (vs 120+ seconds with slow tests)
- **Unit Tests**: 60+ core logic tests in ~1s across ALL modules
- **Complete Coverage**: Fast tests span API, config, database, scrapers, security, and management

**Test Stability Improvements**:
- Fixed database schema detection for "CREATE TABLE IF NOT EXISTS" patterns
- Enhanced requirements file validation for pip includes (`-r requirements.txt`)
- Improved path handling for cross-platform compatibility
- Added comprehensive directory filtering for development artifacts
- Refined sensitive file detection for development environments

**Frontend Verification**:
```bash
# Complete frontend validation
cd frontend
npm test                   # All test suites (95+ tests)
npm run build             # Production build validation
npm run lint              # ESLint validation
```

**Combined Quality Gate**:
```bash
# Full project validation (recommended before commits)
source venv/bin/activate && black . && isort . && flake8 --exclude=venv . && python -m pytest tests/ && cd frontend && npm test && npm run build && npm run lint
```

### GitHub Actions Pipeline

On each PR or push to `main`, automated CI runs:

1. **Backend Pipeline**:
   - Code formatting validation (Black, isort)
   - Linting (flake8)
   - Test suite execution (`pytest --cov=.`)
   - Security vulnerability scanning
   - Migration validation

2. **Frontend Pipeline**:
   - Dependency installation (`npm ci`)
   - Test suite execution (95+ tests across 17 suites)
   - Production build validation (`npm run build`)
   - ESLint validation (`npm run lint`)
   - Bundle size analysis
   - Accessibility compliance check

3. **Integration Pipeline**:
   - End-to-end workflow validation
   - Cross-component integration tests
   - API/Frontend integration validation

**Quality Requirements**:
- 93%+ backend test coverage
- 95+ frontend tests passing
- Zero ESLint errors
- Successful production build
- All security tests passing

---

## Adding New Tests

### Backend

1. Create `tests/.../test_<feature>.py`  
2. Use fixtures from `tests/conftest.py` for DB access  
3. Run `pytest tests/.../test_<feature>.py` to verify

### Frontend

1. Create `*.test.jsx` next to the code under `src/`  
2. Mock external dependencies (services, next/navigation) via Jest  
3. Run `npm test <yourFile>.test.jsx`

---

## Configuration System Tests

The config system has comprehensive test coverage:

```bash
# Run config system tests
pytest tests/config/ -v

# Specific test suites
pytest tests/config/test_config_loader.py -v      # Config loading & validation
pytest tests/config/test_org_sync.py -v           # Database synchronization  
pytest tests/config/test_management_commands.py -v # CLI commands
pytest tests/config/test_config_integration.py -v  # End-to-end workflows
```

#### Test Coverage

- **Config Loading**: YAML parsing, validation, error handling
- **Organization Sync**: Database operations, conflict resolution
- **Management Commands**: CLI interface, output formatting
- **Integration**: Complete workflows from config to scraper execution
- **Error Handling**: Malformed configs, missing files, database failures

#### Adding Config Tests

When adding new config functionality:

1. **Unit tests**: Test individual components in isolation
2. **Integration tests**: Test complete workflows
3. **Error handling**: Test failure scenarios
4. **Validation**: Test configuration schema validation

Example test structure:
```python
def test_new_config_feature(temp_config_dir):
    """Test new configuration feature."""
    # Create test config
    config_data = {...}
    
    # Test the feature
    result = feature_function(config_data)
    
    # Assert expected behavior
    assert result.success is True
```

## Production-Ready Testing Features

### Availability Management Tests

The system includes comprehensive testing for production availability features:

```bash
# Test availability status management
python -m pytest tests/scrapers/test_base_scraper.py::TestAvailabilityStatusManagement -v

# Test API availability filtering
python -m pytest tests/api/test_availability_filtering.py -v
```

**Key Test Categories**:
- **Stale Data Detection**: Tests for animals missing from scrapes
- **Confidence Level Transitions**: Automatic confidence scoring (high → medium → low → unavailable)
- **API Default Filtering**: Ensures users see only reliable animals by default
- **Override Parameters**: Tests for admin/developer access to all data
- **Partial Failure Detection**: Prevents false positives from scraper issues

### Test-Driven Development (TDD) Approach

Recent production features were implemented using strict TDD methodology:

1. **Write Failing Tests First**: All new functionality started with failing test cases
2. **Implement Minimum Code**: Write only enough code to make tests pass
3. **Refactor**: Improve code while maintaining test coverage

**Example TDD Workflow**:
```bash
# 1. Write failing test for availability confidence
python -m pytest tests/scrapers/test_base_scraper.py::test_availability_confidence_transitions -v
# FAIL - method not implemented

# 2. Implement update_stale_data_detection() method
# Edit scrapers/base_scraper.py

# 3. Run test again  
python -m pytest tests/scrapers/test_base_scraper.py::test_availability_confidence_transitions -v
# PASS

# 4. Refactor and add edge cases
# Continue TDD cycle
```

### Error Handling & Recovery Tests

Comprehensive testing for production resilience:

```bash
# Test scraper error handling
python -m pytest tests/scrapers/test_base_scraper.py::TestScraperErrorHandling -v

# Test partial failure detection
python -m pytest tests/scrapers/test_base_scraper.py::test_partial_scraper_failure_detection -v
```

**Covers**:
- Partial scraper failures (low animal counts)
- Database connection issues
- Website structure changes
- Error recovery without affecting existing data

### Enhanced Logging & Metrics Tests

Testing for production monitoring capabilities:

```bash
# Test detailed metrics logging
python -m pytest tests/scrapers/test_base_scraper.py::TestEnhancedLogging -v
```

**Includes**:
- JSONB metrics storage and retrieval
- Data quality scoring (0-1 scale)
- Performance duration tracking
- Quality assessment algorithms

### Database Migration Testing

All tests include migration validation:

```bash
# Verify test database has required columns
python -c "
import psycopg2
conn = psycopg2.connect(host='localhost', database='test_rescue_dogs', user='$USER')
cur = conn.cursor()
cur.execute('SELECT availability_confidence, last_seen_at, consecutive_scrapes_missing FROM animals LIMIT 1;')
print('✅ Availability columns exist')
"
```

### Advanced Testing Features

#### Unified DOM Extraction Testing

Recent addition of unified DOM-based extraction for REAN scraper includes comprehensive test coverage:

```bash
# Test unified extraction approach
python -m pytest tests/scrapers/test_rean_unified_extraction.py -v
```

**Test Coverage Includes**:
- **Container Detection**: Multiple CSS selector fallback strategies
- **Lazy Loading Handling**: Comprehensive scrolling pattern validation
- **Image Association**: Correct image-to-dog mapping within DOM containers
- **Error Recovery**: Graceful fallback to legacy methods
- **Real-world Scenarios**: Tests matching actual website screenshots

**Key Test Scenarios**:
```python
def test_unified_extraction_end_to_end_realistic():
    """End-to-end test with realistic REAN data matching screenshots."""
    # Validates that Toby gets correct brown puppy image (not Bobbie's boot image)
    assert toby_data['primary_image_url'] == 'https://img1.wsimg.com/isteam/ip/rean/toby-brown-puppy.jpg'
    assert bobbie_data['primary_image_url'] == 'https://img1.wsimg.com/isteam/ip/rean/bobbie-with-boot.jpg'
```

#### Test Categories Coverage

**Security & Resilience (Critical)**:
- SQL injection prevention with parameterized queries
- Input validation and sanitization testing
- Network failure simulation and recovery
- Database connection failure handling
- XSS prevention with content sanitization

**Production Workflows (High Priority)**:
- Weekly scraping lifecycle management
- Availability confidence transitions
- Stale data detection accuracy
- Partial failure detection algorithms
- Quality scoring consistency

**Performance & Optimization (Medium Priority)**:
- Cloudinary upload performance
- API response time validation
- Database query optimization
- Frontend bundle size monitoring
- Lazy loading effectiveness

**Data Integrity (High Priority)**:
- Standardization algorithm reliability
- Age/breed/size mapping consistency
- External ID uniqueness validation
- Image URL processing accuracy
- Multi-language content handling

### Coverage Requirements

**Backend Coverage** (93%+ required):
- All production availability features (100%)
- Error handling and edge cases (95%+)
- API filtering and response validation (100%)
- Database operations and migrations (95%+)
- Configuration system reliability (100%)
- Scraper unified extraction logic (100%)

**Frontend Coverage** (95+ tests across 17 suites):
- Security sanitization (100%)
- Performance optimization (100%)
- Accessibility compliance (100%)
- Component functionality (95%+)
- Error boundary behavior (100%)
- User interaction flows (95%+)

### Debugging Failed Tests

**Common Test Failures & Solutions**:

1. **Database Migration Issues**:
   ```bash
   # Ensure test database has latest migrations
   DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
   DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
   ```

2. **Frontend Mock Issues**:
   ```javascript
   // Verify IntersectionObserver mock in jest.setup.js
   global.IntersectionObserver = class IntersectionObserver {
     constructor(callback) { this.callback = callback; }
     observe() { return null; }
     disconnect() { return null; }
   };
   ```

3. **Configuration Test Failures**:
   ```bash
   # Verify test config directory exists
   mkdir -p /tmp/test_configs/organizations
   ```

4. **API Test Failures**:
   ```bash
   # Check test database connection
   psql -h localhost -d test_rescue_dogs -c "SELECT COUNT(*) FROM organizations;"
   ```

**Performance Test Debugging**:
```bash
# Analyze frontend test performance
npm test -- --detectOpenHandles --forceExit

# Check for memory leaks in tests
npm test -- --logHeapUsage
```