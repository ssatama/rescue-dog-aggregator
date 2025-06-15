# Testing Lazy-Loaded Components Guide

This guide covers best practices for testing components that use IntersectionObserver for lazy loading and scroll-based animations.

## Overview

Components using `useScrollAnimation` hook or intersection observer need special testing considerations because:

1. **IntersectionObserver is not available in Jest environment**
2. **Async behavior requires proper `act()` wrapping**
3. **Visibility states need to be simulated**
4. **API calls are triggered by visibility changes**

## Common Components Using Lazy Loading

- `RelatedDogsSection` - Lazy loads API data when section becomes visible
- `LazyImage` - Progressive image loading with intersection observer
- Components wrapped with `ScrollAnimationWrapper`

## Testing Patterns

### 1. Mock useScrollAnimation Hook

Always mock the hook to return visible state immediately in tests:

```javascript
// Mock the useScrollAnimation hook to trigger immediately in tests
jest.mock('../../../hooks/useScrollAnimation', () => ({
  useScrollAnimation: (options = {}) => {
    const ref = React.useRef();
    // Always return visible immediately in tests
    return [ref, true];
  },
  ScrollAnimationWrapper: ({ children, ...props }) => <div {...props}>{children}</div>
}));
```

### 2. Wrap Renders in act()

For components with async state updates:

```javascript
// Act wrapper for async renders
await act(async () => {
  render(
    <RelatedDogsSection 
      organizationId={456} 
      currentDogId={123} 
      organization={mockOrganization} 
    />
  );
});
```

### 3. Test Loading States

For components that show loading skeletons:

```javascript
it('should show loading skeleton while fetching data', async () => {
  // Create controlled promise
  let resolvePromise;
  const promise = new Promise((resolve) => {
    resolvePromise = resolve;
  });
  getRelatedDogs.mockReturnValue(promise);

  await act(async () => {
    render(<RelatedDogsSection {...props} />);
  });

  // Assert loading state
  expect(screen.getByTestId('related-dogs-loading')).toBeInTheDocument();

  // Cleanup
  await act(async () => {
    resolvePromise([]);
  });
});
```

### 4. Test API Integration

Wait for API calls triggered by visibility:

```javascript
it('should call API with correct parameters', async () => {
  getRelatedDogs.mockResolvedValue(mockData);

  await act(async () => {
    render(<RelatedDogsSection {...props} />);
  });

  // Wait for visibility to trigger API call
  await waitFor(() => {
    expect(getRelatedDogs).toHaveBeenCalledWith(456, 123);
  });
});
```

## Common Issues and Solutions

### Issue: "IntersectionObserver is not defined"

**Solution**: Mock configured in `jest.setup.js`:

```javascript
// jest.setup.js
global.IntersectionObserver = jest.fn(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));
```

### Issue: "Warning: An update was not wrapped in act(...)"

**Solution**: Wrap all renders and async operations in `act()`:

```javascript
// ✅ Correct
await act(async () => {
  render(<Component />);
});

// ❌ Incorrect
render(<Component />);
```

### Issue: API not called in tests

**Solution**: Ensure hook mock returns `true` for visibility and wait for async calls:

```javascript
// Ensure mock returns visible
return [ref, true]; // Always visible

// Wait for API call
await waitFor(() => {
  expect(mockApi).toHaveBeenCalled();
});
```

## Example Test File Structure

```javascript
// RelatedDogsSection.test.jsx
import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import RelatedDogsSection from '../RelatedDogsSection';

// 1. Mock the service
jest.mock('../../../services/relatedDogsService');

// 2. Mock intersection observer hook
jest.mock('../../../hooks/useScrollAnimation', () => ({
  useScrollAnimation: () => [React.useRef(), true]
}));

describe('RelatedDogsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading skeleton', async () => {
      // Controlled promise for loading state
      let resolvePromise;
      const promise = new Promise(resolve => resolvePromise = resolve);
      mockService.mockReturnValue(promise);

      await act(async () => {
        render(<RelatedDogsSection {...props} />);
      });

      expect(screen.getByTestId('loading')).toBeInTheDocument();

      // Cleanup
      await act(async () => resolvePromise([]));
    });
  });

  describe('Success State', () => {
    beforeEach(() => {
      mockService.mockResolvedValue(mockData);
    });

    it('renders data after loading', async () => {
      await act(async () => {
        render(<RelatedDogsSection {...props} />);
      });

      await waitFor(() => {
        expect(screen.getByTestId('data-grid')).toBeInTheDocument();
      });
    });
  });

  describe('Error State', () => {
    beforeEach(() => {
      mockService.mockRejectedValue(new Error('API Error'));
    });

    it('shows error message', async () => {
      await act(async () => {
        render(<RelatedDogsSection {...props} />);
      });

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });
  });
});
```

## Performance Testing

Test that lazy loading actually improves performance:

```javascript
it('should not call API until visible', () => {
  // Mock hook to return not visible
  useScrollAnimation.mockReturnValue([React.useRef(), false]);
  
  render(<RelatedDogsSection {...props} />);
  
  // API should not be called
  expect(mockApi).not.toHaveBeenCalled();
});
```

## Best Practices

1. **Always mock visibility**: Don't rely on actual IntersectionObserver in tests
2. **Test all states**: Loading, success, error, and empty states
3. **Use act() consistently**: Wrap all async operations
4. **Clean up promises**: Resolve controlled promises to prevent memory leaks
5. **Test API integration**: Verify correct parameters and timing
6. **Mock dependencies**: Mock all external services and hooks
7. **Wait for async**: Use `waitFor()` for async assertions

This pattern ensures reliable, fast tests for lazy-loaded components while maintaining good test coverage and avoiding common pitfalls.