# Testing Guide for Rescue Dog Aggregator

This project includes both backend (Pytest) and frontend (Jest) tests.

---

## Backend Tests

Run from the project root:

```bash
pytest
```

- Tests live under `tests/`:
  - `tests/utils/` – standardization, audit scripts  
  - `tests/scrapers/` – BaseScraper + org-specific  
  - `tests/api/` – integration tests against FastAPI endpoints  

### Test Database

- Uses a Postgres test database `test_rescue_dogs`  
- Override provided in `tests/conftest.py` to point FastAPI’s `get_db_cursor` to the test DB.  
- Data fixtures clear & re-insert base records per test.

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