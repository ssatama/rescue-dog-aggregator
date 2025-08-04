# Test Markers Strategy - Optimized for Performance

## Overview

This document defines the optimized pytest marker strategy for the Rescue Dog Aggregator backend, designed for maximum CI/CD performance and developer productivity.

## Quick Reference

### Optimized CI/CD Commands

```bash
# ALWAYS activate virtual environment first
source venv/bin/activate

# Fast development feedback (recommended for development)
python -m pytest tests/ -m "unit or fast" -v

# Standard CI pipeline (excludes heavy resources)
python -m pytest tests/ -m "not browser and not requires_migrations" -v

# Full test suite (for final validation)
python -m pytest tests/ -v
```

### Performance Tiers

| Marker | Duration | Use Case | CI Pipeline |
|--------|----------|----------|-------------|
| `unit` | <1 second | Pure logic, no I/O | ✅ Fast feedback |
| `fast` | 1-5 seconds | Minimal I/O, quick validation | ✅ Fast feedback |
| `slow` | >5 seconds | Database, network, computation | ❌ Fast feedback |

## Marker Categories

### Performance & Resource Markers
- `unit` - Very fast tests (<1 second, pure logic)
- `fast` - Fast tests (1-5 seconds, minimal I/O)  
- `slow` - Slower tests (>5 seconds)
- `database` - Heavy database operations
- `computation` - Computationally intensive tests
- `network` - Network-dependent tests
- `file_io` - File I/O operations

### Infrastructure & Setup Markers
- `browser` - WebDriver/browser automation (Selenium)
- `selenium` - Selenium WebDriver tests
- `complex_setup` - Complex external dependencies
- `requires_migrations` - Database migrations or Railway setup

### Domain-Specific Markers
- `api` - API endpoint tests
- `integration` - Integration tests
- `config` - Configuration validation tests
- `security` - Security-related tests
- `management` - Management operations
- `emergency` - Emergency/disaster recovery tests

## Tagging Guidelines

### By Test Type
```python
# Unit tests - pure logic, no dependencies
@pytest.mark.unit
def test_validate_age_format():
    pass

# Fast integration tests - minimal I/O
@pytest.mark.fast
@pytest.mark.api
def test_api_response_structure():
    pass

# Slow integration tests - database required
@pytest.mark.slow
@pytest.mark.database
@pytest.mark.integration
def test_database_migration():
    pass
```

### By Resource Requirements
```python
# Database operations
@pytest.mark.slow
@pytest.mark.database
def test_complex_query():
    pass

# Network operations
@pytest.mark.slow
@pytest.mark.network
def test_external_api():
    pass

# Browser automation
@pytest.mark.slow
@pytest.mark.browser
@pytest.mark.selenium
def test_scraper_workflow():
    pass
```

### By Domain
```python
# Security tests
@pytest.mark.security
@pytest.mark.slow
def test_input_validation():
    pass

# Management operations
@pytest.mark.management
@pytest.mark.integration
@pytest.mark.slow
def test_emergency_recovery():
    pass
```

## CI/CD Strategy

### Development Workflow
1. **Local development**: Run `source venv/bin/activate && python -m pytest -m "unit"` for instant feedback
2. **Pre-commit**: Run `python -m pytest -m "unit or fast"` for quick validation
3. **Pull request**: Run full CI excluding heavy resources
4. **Merge/Deploy**: Run complete test suite

### Database Isolation (Automatic)
- All tests automatically protected by global `conftest.py`
- No "Test Organization" records in production database
- Zero configuration required - protection is built-in

### Pipeline Optimization
- **Fast feedback loop**: Focus on `unit` and `fast` markers
- **Resource awareness**: Exclude `browser`, `requires_migrations` from main CI
- **Positive selection**: Use `unit or fast` instead of complex exclusions

## Migration Guidelines

### For Untagged Tests
1. **Identify test characteristics**:
   - Duration (<1s = unit, 1-5s = fast, >5s = slow)  
   - Dependencies (database, network, browser)
   - Domain (api, security, management)

2. **Add appropriate markers**:
   ```python
   @pytest.mark.unit  # or fast/slow
   @pytest.mark.api   # domain marker
   def test_example():
       pass
   ```

3. **Validate with timing**:
   ```bash
   source venv/bin/activate
   python -m pytest tests/your_test.py -v --durations=0
   ```

### Marker Validation Commands
```bash
# ALWAYS activate virtual environment first
source venv/bin/activate

# Check for untagged tests
find tests/ -name "test_*.py" -exec grep -L "@pytest.mark" {} \;

# Validate marker usage
python -m pytest --markers

# Test performance tiers
python -m pytest -m "unit" --durations=5
python -m pytest -m "fast" --durations=10
```

## Best Practices

1. **Always tag new tests** - No untagged tests allowed
2. **Use multiple markers** - Combine performance + domain markers
3. **Validate timing** - Ensure markers match actual performance
4. **Update CI/CD** - Use positive selection for better performance
5. **Regular review** - Audit markers quarterly for accuracy

## Common Patterns

### Configuration Tests
```python
@pytest.mark.unit
@pytest.mark.config
def test_config_validation():
    pass
```

### API Tests
```python
@pytest.mark.fast
@pytest.mark.api
def test_api_endpoint():
    pass
```

### Database Integration
```python
@pytest.mark.slow
@pytest.mark.database  
@pytest.mark.integration
def test_database_operations():
    pass
```

### Emergency Operations
```python
@pytest.mark.integration
@pytest.mark.emergency
@pytest.mark.slow
def test_disaster_recovery():
    pass
```

This strategy ensures optimal CI/CD performance while maintaining comprehensive test coverage.