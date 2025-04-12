# Testing Guide for Rescue Dog Aggregator

This document explains how to run tests and add new tests to the project.

## Backend Tests

The backend uses pytest for testing. These tests verify:
- Standardization utilities (breed, age, size)
- Scraper functionality
- API endpoints
- Database operations

### Running Backend Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=.

# Run specific test file
pytest tests/utils/test_standardization.py
```

### Test Structure

Backend tests are organized in the `tests` directory:
- `tests/utils/` - Tests for utility functions
- `tests/scrapers/` - Tests for web scrapers
- `tests/api/` - Tests for API endpoints

## Frontend Tests

The frontend uses Jest and React Testing Library for testing. These tests verify:
- React components render correctly
- API service functions work as expected
- Standardized fields are properly displayed

### Running Frontend Tests

```bash
# Navigate to frontend directory
cd frontend

# Run all tests
npm test

# Run tests in watch mode (rerun on changes)
npm run test:watch
```

### Test Structure

Frontend tests are placed alongside the code they test:
- `src/components/dogs/__tests__/` - Tests for dog components
- `src/utils/__tests__/` - Tests for utility functions
- `src/services/__tests__/` - Tests for API services
- `src/app/**/__tests__/` - Tests for page components

## Continuous Integration

Tests automatically run on GitHub Actions when:
- Pushing to the main branch
- Creating a pull request to main branch

See the workflow configuration in `.github/workflows/tests.yml`

## Adding New Tests

### Adding Backend Tests

1. Create a new test file in the appropriate directory under `tests/`
2. Name the file `test_*.py`
3. Use pytest fixtures from `conftest.py` where appropriate
4. Run the tests to make sure they pass

Example:
```python
# tests/utils/test_new_feature.py
import pytest
from utils.new_feature import my_function

def test_my_function():
    result = my_function(test_input)
    assert result == expected_output
```

### Adding Frontend Tests

1. Create a test file in the appropriate `__tests__` directory
2. Name the file `*.test.jsx` or `*.test.js`
3. Mock dependencies as needed
4. Run the tests to make sure they pass

Example:
```javascript
// src/components/new-component/__tests__/NewComponent.test.jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import NewComponent from '../NewComponent';

describe('NewComponent', () => {
  test('renders correctly', () => {
    render(<NewComponent />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
});
```

## Test Coverage Goals

We aim for:
- 80%+ coverage overall
- 90%+ for core business logic (standardization)
- 80%+ for UI components
- 100% for utility functions