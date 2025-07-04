# Testing Guide - Rescue Dog Aggregator

## Overview

Comprehensive testing strategy with 259 backend tests and 1,249 frontend tests across 88 suites.

## Quick Test Commands

### Backend (Python/pytest)
```bash
# Always activate virtual environment first
source venv/bin/activate

# Fast development tests (~45s)
python -m pytest tests/ -m "not slow" -v

# Unit tests only (~1s)
python -m pytest tests/ -m "unit" -v

# Full test suite
python -m pytest tests/ -v
```

### Frontend (Next.js/Jest)
```bash
cd frontend

# All tests (1,249 tests)
npm test

# Specific component
npm test DogCard

# Coverage report
npm test -- --coverage
```

## Testing Philosophy

We follow strict Test-Driven Development (TDD):

1. **Write failing test first**
2. **Write minimal code to pass**
3. **Refactor with confidence**

## Test Categories

### Backend Tests

- **Unit Tests** (`-m unit`): Pure logic, no I/O (~1s)
- **API Tests** (`-m api`): Endpoint testing
- **Database Tests** (`-m database`): Data integrity
- **Integration Tests** (`-m integration`): Full workflows
- **Slow Tests** (`-m slow`): Browser automation, complex setup

### Frontend Tests

- **Component Tests**: UI behavior and rendering
- **Integration Tests**: User workflows
- **Accessibility Tests**: WCAG 2.1 AA compliance
- **Performance Tests**: Load times and optimization

## Key Testing Patterns

### Backend Pattern
```python
def test_feature_behavior():
    """Test description."""
    # Arrange
    test_data = create_test_data()
    
    # Act
    result = function_under_test(test_data)
    
    # Assert
    assert result.status == "success"
```

### Frontend Pattern
```javascript
test('component renders correctly', () => {
  // Arrange
  const props = { name: 'Test Dog' };
  
  // Act
  render(<DogCard {...props} />);
  
  // Assert
  expect(screen.getByText('Test Dog')).toBeInTheDocument();
});
```

## Running Tests in CI/CD

Tests run automatically on:

- Every push to any branch
- Every pull request
- Before deployment

## Common Test Commands

```bash
# Backend coverage
pytest --cov=. --cov-report=html

# Frontend watch mode
npm test -- --watch

# Run specific test file
pytest tests/api/test_animals.py -v
npm test -- DogCard.test.jsx
```

## Troubleshooting

- **Import errors**: Ensure virtual environment is activated
- **Database errors**: Check test database exists
- **Frontend failures**: Clear cache with `rm -rf node_modules/.cache`

## For More Details

For detailed testing patterns and examples, see:

- [Development Workflow](docs/development/workflow.md)
- [TDD Patterns](docs/examples/tdd-patterns.md)
- [Contributing Guide](docs/development/contributing.md)