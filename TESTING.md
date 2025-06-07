# Testing Guide for Rescue Dog Aggregator

This project includes both backend (Pytest) and frontend (Jest) tests.

---

## Backend Tests

Run from the project root:

```bash
# Full test suite with virtual environment
source venv/bin/activate && python -m pytest tests/ -v

# Quick test run
pytest

# Specific test categories
python -m pytest tests/api/test_availability_filtering.py -v
python -m pytest tests/scrapers/test_base_scraper.py -v
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

## Frontend Tests

Run from the `frontend/` directory:

```bash
npm test
```

Key directories:

- `src/components/.../__tests__` – UI component unit tests  
- `src/services/.../__tests__`   – API helper mocks  
- `src/app/.../__tests__`        – Page component tests  

### New Social Media Share Tests

- `<SocialMediaLinks>` unit tests confirm only the passed networks render  
- DogDetailPage and OrgDetailPage tests verify share links appear when `social_media`  
  data is present and are hidden when the object is empty.  

---

## Continuous Integration

On each PR or push to `main`, GitHub Actions runs:

1. `pytest --cov=.`  
2. `npm ci && npm test`

Ensure **all** tests pass before merging.

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

### Coverage Requirements

Maintain 93%+ test coverage with focus on:
- All production availability features
- Error handling and edge cases  
- API filtering and response validation
- Database operations and migrations
- Configuration system reliability