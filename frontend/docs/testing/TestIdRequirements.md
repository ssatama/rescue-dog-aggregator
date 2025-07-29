# Test ID Requirements for E2E Testing

## Overview

This document outlines the test ID requirements for components to ensure reliable E2E testing with our simplified selector strategy.

## Why Test IDs Matter

- **Reliability**: Test IDs provide stable selectors that don't break when styling changes
- **Performance**: Fastest way to locate elements (faster than CSS classes or complex selectors)
- **Clarity**: Makes it obvious which elements are intended for testing
- **Maintenance**: Reduces test flakiness and maintenance overhead

## Naming Convention

Use `kebab-case` with descriptive, hierarchical names:

```jsx
// ✅ Good examples
<div data-testid="dogs-page-container">
<input data-testid="search-input">
<button data-testid="mobile-filter-button">
<select data-testid="organization-select">
<article data-testid="dog-card">
<h3 data-testid="dog-name">

// ❌ Avoid
<div data-testid="container">        // Too generic
<input data-testid="searchInput">    // camelCase
<button data-testid="btn1">          // Non-descriptive
```

## Required Test IDs by Component

### Dogs Page Components

#### Page Structure
```jsx
// Main page container
<div data-testid="dogs-page-container">

// Page title
<h1 data-testid="dogs-page-title">Find Your New Best Friend</h1>
```

#### Search Components
```jsx
// Search input
<input 
  data-testid="search-input"
  type="search"
  placeholder="Search by name, breed, or description..."
/>

// Clear search button (optional but recommended)
<button data-testid="clear-search">
  <X className="h-4 w-4" />
</button>
```

#### Mobile Filter Components
```jsx
// Mobile filter toggle button
<button data-testid="mobile-filter-button">
  <Filter className="h-4 w-4" />
  Filter
</button>

// Mobile filter drawer/modal
<div data-testid="mobile-filter-drawer" role="dialog">
  {/* Filter content */}
  
  // Close button
  <button data-testid="filter-close">
    <X className="h-4 w-4" />
  </button>
</div>
```

#### Filter Dropdowns
```jsx
// Organization filter
<select data-testid="organization-select" name="organization">
  <option value="">Any organization</option>
  {/* options */}
</select>

// Breed filter
<select data-testid="breed-select" name="breed">
  <option value="">Any breed</option>
  {/* options */}
</select>

// Sex filter
<select data-testid="sex-select" name="sex">
  <option value="">Any sex</option>
  {/* options */}
</select>

// Size filter
<select data-testid="size-select" name="size">
  <option value="">Any size</option>
  {/* options */}
</select>

// Age filter
<select data-testid="age-select" name="age">
  <option value="">Any age</option>
  {/* options */}
</select>

// Location filters (optional)
<select data-testid="location-country-select" name="location_country">
<select data-testid="available-country-select" name="available_country">
```

#### Dogs Grid and Cards
```jsx
// Dogs grid container
<div data-testid="dogs-grid" role="main">
  
  // Individual dog cards
  <article data-testid="dog-card">
    
    // Dog name (required)
    <h3 data-testid="dog-name">{dog.name}</h3>
    
    // Dog breed (optional but recommended)
    <p data-testid="dog-breed">{dog.breed}</p>
    
    // Dog organization (optional but recommended)
    <span data-testid="dog-organization">{dog.organization.name}</span>
    
  </article>
</div>
```

#### State Components
```jsx
// Loading skeletons
<div data-testid="loading-skeleton" role="status" aria-live="polite">
  Loading...
</div>

// Empty state
<div data-testid="empty-state" role="status">
  No dogs found matching your criteria
</div>

// Error alert
<div data-testid="error-alert" role="alert">
  Something went wrong. Please try again.
</div>
```

#### Action Components
```jsx
// Load more button
<button data-testid="load-more-button">
  Load More Dogs
</button>

// Reset filters button
<button data-testid="reset-filters">
  Reset All Filters
</button>
```

## Implementation Examples

### React Component with Test IDs

```jsx
import React from 'react';

export function DogsGrid({ dogs, loading, error }) {
  if (loading) {
    return (
      <div data-testid="loading-skeleton" role="status" aria-live="polite">
        <div className="animate-pulse">Loading dogs...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="error-alert" role="alert">
        {error.message}
      </div>
    );
  }

  if (dogs.length === 0) {
    return (
      <div data-testid="empty-state" role="status">
        No dogs found matching your criteria
      </div>
    );
  }

  return (
    <div data-testid="dogs-grid" role="main">
      {dogs.map(dog => (
        <article key={dog.id} data-testid="dog-card">
          <h3 data-testid="dog-name">{dog.name}</h3>
          <p data-testid="dog-breed">{dog.breed}</p>
          <span data-testid="dog-organization">
            {dog.organization.name}
          </span>
        </article>
      ))}
    </div>
  );
}
```

### Filter Component with Test IDs

```jsx
export function FilterSelect({ 
  name, 
  options, 
  value, 
  onChange, 
  placeholder 
}) {
  return (
    <select 
      data-testid={`${name}-select`}
      name={name}
      value={value}
      onChange={onChange}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

// Usage
<FilterSelect 
  name="breed"
  options={breedOptions}
  value={selectedBreed}
  onChange={handleBreedChange}
  placeholder="Any breed"
/>
// This automatically gets data-testid="breed-select"
```

## Validation Workflow

### During Development

1. **Add test IDs as you build components**
2. **Run validation tests** to check coverage:
   ```bash
   npm run test:e2e -- --grep "validation"
   ```
3. **Check console output** for missing test IDs

### In CI/CD

1. **Use strict mode** to enforce 100% test ID coverage:
   ```bash
   E2E_SELECTOR_STRATEGY=strict npm run test:e2e
   ```
2. **Fail builds** if required test IDs are missing

### Code Review Checklist

- [ ] All interactive elements have test IDs
- [ ] Test IDs follow naming convention
- [ ] State components (loading, error, empty) have test IDs
- [ ] Test IDs are unique within the page
- [ ] No typos in test ID names

## Common Patterns

### Conditional Test IDs

```jsx
// ✅ Good: Always present
<button data-testid="submit-button" disabled={!isValid}>
  Submit
</button>

// ❌ Avoid: Conditional test IDs
<button data-testid={isValid ? "submit-button" : undefined}>
  Submit
</button>
```

### Dynamic Test IDs

```jsx
// ✅ Good: For lists/collections
{dogs.map(dog => (
  <article key={dog.id} data-testid="dog-card">
    <h3 data-testid="dog-name">{dog.name}</h3>
  </article>
))}

// ❌ Avoid: Unique test IDs for each item
{dogs.map(dog => (
  <article key={dog.id} data-testid={`dog-card-${dog.id}`}>
    <h3 data-testid={`dog-name-${dog.id}`}>{dog.name}</h3>
  </article>
))}
```

### Component Libraries

```jsx
// For reusable components, allow test ID override
export function Button({ children, testId, ...props }) {
  return (
    <button data-testid={testId} {...props}>
      {children}
    </button>
  );
}

// Usage
<Button testId="submit-button">Submit</Button>
<Button testId="cancel-button">Cancel</Button>
```

## Testing the Implementation

### Validation Test

```typescript
test('component has required test IDs', async ({ page }) => {
  await page.goto('/dogs');
  
  // Check that required elements are present
  await expect(page.getByTestId('dogs-page-container')).toBeVisible();
  await expect(page.getByTestId('search-input')).toBeVisible();
  await expect(page.getByTestId('dogs-grid')).toBeVisible();
});
```

### Coverage Report

```typescript
test('generate test ID coverage report', async ({ page }) => {
  const dogsPage = new DogsPageSimplified(page);
  await dogsPage.navigateToDogsPage();
  
  const coverage = await dogsPage.checkTestIdCoverage();
  console.log(`Test ID Coverage: ${coverage.coverage}%`);
  
  // Fail if coverage is too low
  expect(coverage.coverage).toBeGreaterThanOrEqual(80);
});
```

## Benefits for Developers

1. **Faster Test Development**: Clear, predictable selectors
2. **Reduced Test Maintenance**: Tests don't break with styling changes
3. **Better Documentation**: Test IDs serve as component interface documentation
4. **Improved Debugging**: Clear error messages when elements not found
5. **Performance**: Fastest selector type in browsers

## Getting Help

- Check test ID requirements in `/docs/testing/TestIdRequirements.md`
- Run validation tests: `npm run test:e2e:validate`
- Use development mode: `E2E_SELECTOR_STRATEGY=development`
- Review example tests in `/e2e-tests/examples/`