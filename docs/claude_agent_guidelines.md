# Claude Agent Development Guidelines

## Test-Driven Development Workflow

### Step 1: Understand the Requirement
- Read the user's request carefully
- Identify which components will be affected
- Plan the test cases needed

### Step 2: Write Tests First
```python
# Example: Adding a new filter feature
# tests/api/test_animal_filters.py

def test_filter_by_age_range():
    """Test filtering animals by age range."""
    # Arrange
    response = client.get("/api/animals?age_min=12&age_max=36")
    
    # Assert
    assert response.status_code == 200
    animals = response.json()
    for animal in animals:
        assert 12 <= animal['age_months'] <= 36
```

### Step 3: Run Tests to See Failure
```bash
pytest tests/api/test_animal_filters.py -v
# Expected: FAILED (test should fail before implementation)
```

### Step 4: Implement Feature
- Write minimal code to pass the test
- Follow existing code patterns
- Don't over-engineer

### Step 5: Run Tests Again
```bash
# Specific test
pytest tests/api/test_animal_filters.py -v

# All related tests
pytest tests/api/ -v

# Full test suite
pytest tests/ -m "not slow" -v
```

### Step 6: Refactor if Needed
- Improve code clarity
- Extract common functionality
- Ensure tests still pass

### Step 7: Update Documentation
- Update DEVELOPMENT_LOG.md
- Update relevant docs
- Add code comments
- Update API docs if needed

## Common Scenarios

### Scenario 1: Bug Fix
1. Write test that reproduces the bug
2. Verify test fails
3. Fix the bug
4. Verify test passes
5. Run full test suite
6. Document fix

### Scenario 2: New Feature
1. Write comprehensive tests
2. Implement incrementally
3. Test edge cases
4. Ensure backward compatibility
5. Update all documentation

### Scenario 3: Refactoring
1. Ensure full test coverage exists
2. Run tests to establish baseline
3. Refactor in small steps
4. Run tests after each change
5. Maintain same public API

## Test Organization

### Backend Tests
```
tests/
├── api/           # API endpoint tests
├── scrapers/      # Scraper tests
├── services/      # Business logic tests
├── utils/         # Utility function tests
└── integration/   # Full workflow tests
```

### Frontend Tests
```
frontend/src/__tests__/
├── components/    # Component unit tests
├── pages/        # Page integration tests
├── utils/        # Utility tests
├── performance/  # Performance tests
└── accessibility/ # A11y tests
```

## Quality Checklist

Before marking any task complete:

- [ ] All new code has tests
- [ ] All existing tests pass
- [ ] Code is formatted (black/prettier)
- [ ] No linting errors
- [ ] Documentation updated
- [ ] DEVELOPMENT_LOG.md entry added
- [ ] Performance impact considered
- [ ] Accessibility maintained

Remember: **Quality over speed. A well-tested feature is better than a quick hack.**