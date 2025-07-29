# Code Style Guide

## Python (Backend)

### Functional Programming Approach

Follow a "functional light" approach:

- **No mutation** - work with immutable data structures
- **Pure functions** wherever possible
- **No side effects** in business logic
- Use comprehensions and functional tools (`map`, `filter`, `reduce`)

```python
# AVOID - Mutation
def add_dog_to_list(dogs, new_dog):
    dogs.append(new_dog)  # Mutates the list!
    return dogs

# GOOD - Immutable
def add_dog_to_list(dogs, new_dog):
    return dogs + [new_dog]  # Returns new list

# AVOID - Side effects in business logic
class DogProcessor:
    def process(self, dog):
        self.last_processed = dog  # Side effect!
        dog['processed'] = True    # Mutation!
        return dog

# GOOD - Pure function
def process_dog(dog):
    return {**dog, 'processed': True}  # Returns new dict

# GOOD - Functional approach with error handling
def validate_dog(dog):
    """Pure validation function."""
    errors = []

    if not dog.get('name'):
        errors.append("Name is required")

    if dog.get('age_months', 0) < 0:
        errors.append("Age cannot be negative")

    return {'valid': len(errors) == 0, 'errors': errors}

# GOOD - Composition
def process_dogs(dogs):
    return [
        process_dog(dog)
        for dog in dogs
        if validate_dog(dog)['valid']
    ]
```

### Code Structure

- **No nested if/else statements** - use early returns or guard clauses
- **Small functions** - each should do one thing well
- **Clear naming** - functions should be verbs, variables should be descriptive

```python
# AVOID - Nested conditionals
def calculate_adoption_fee(dog):
    if dog['age_months'] < 12:
        if dog['size'] == 'small':
            return 150
        else:
            return 200
    else:
        if dog['medical_needs']:
            return 50
        else:
            return 100

# GOOD - Early returns, clear logic
def calculate_adoption_fee(dog):
    if is_puppy(dog) and dog['size'] == 'small':
        return 150

    if is_puppy(dog):
        return 200

    if dog.get('medical_needs'):
        return 50

    return 100

def is_puppy(dog):
    return dog['age_months'] < 12
```

### No Comments in Code

Code should be self-documenting through clear naming and structure:

```python
# AVOID - Comments explaining what code does
def process_scraper_data(html):
    # Parse the HTML
    soup = BeautifulSoup(html, 'html.parser')

    # Find all dog cards
    cards = soup.find_all('div', class_='dog-card')

    # Extract data from each card
    dogs = []
    for card in cards:
        # Get the dog name
        name = card.find('h3').text
        dogs.append({'name': name})

    return dogs

# GOOD - Self-documenting code
def extract_dogs_from_html(html):
    parsed_content = BeautifulSoup(html, 'html.parser')
    dog_cards = parsed_content.find_all('div', class_='dog-card')

    return [extract_dog_from_card(card) for card in dog_cards]

def extract_dog_from_card(card):
    return {
        'name': extract_text(card, 'h3'),
        'breed': extract_text(card, '.breed'),
        'age': extract_text(card, '.age')
    }

def extract_text(element, selector):
    found = element.select_one(selector)
    return found.text.strip() if found else None
```

## JavaScript/React (Frontend)

### Functional Components Only

Use functional components with hooks:

```javascript
// AVOID - Class components
class DogCard extends React.Component {
  constructor(props) {
    super(props);
    this.state = { favorited: false };
  }

  render() {
    return <div>{this.props.dog.name}</div>;
  }
}

// GOOD - Functional component with hooks
function DogCard({ dog }) {
  const [favorited, setFavorited] = useState(false);

  const handleFavorite = () => {
    setFavorited(!favorited);
    // Save to localStorage or API
  };

  return (
    <div className="dog-card">
      <h3>{dog.name}</h3>
      <button onClick={handleFavorite}>{favorited ? "❤️" : "🤍"}</button>
    </div>
  );
}
```

### Immutable State Updates

Never mutate state directly:

```javascript
// AVOID - Mutating state
function DogList() {
  const [dogs, setDogs] = useState([]);

  const addDog = (newDog) => {
    dogs.push(newDog); // NO! Mutates array
    setDogs(dogs); // React won't re-render
  };

  const updateDog = (id, updates) => {
    const dog = dogs.find((d) => d.id === id);
    dog.name = updates.name; // NO! Mutates object
    setDogs(dogs);
  };
}

// GOOD - Immutable updates
function DogList() {
  const [dogs, setDogs] = useState([]);

  const addDog = (newDog) => {
    setDogs([...dogs, newDog]); // New array
  };

  const updateDog = (id, updates) => {
    setDogs(
      dogs.map((dog) =>
        dog.id === id
          ? { ...dog, ...updates } // New object
          : dog
      )
    );
  };

  const removeDog = (id) => {
    setDogs(dogs.filter((dog) => dog.id !== id));
  };
}
```

### Component Structure

```javascript
// GOOD - Well-structured component
function DogFilters({ filters, onFilterChange }) {
  // Hooks at the top
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  // Derived values
  const availableBreeds = useMemo(
    () => getUniqueBreeds(filters.dogs),
    [filters.dogs]
  );

  // Event handlers
  const handleBreedChange = (breed) => {
    onFilterChange({ ...filters, breed });
  };

  const handleSizeChange = (size) => {
    onFilterChange({ ...filters, size });
  };

  // Early returns for edge cases
  if (!filters) return null;

  // Main render
  return (
    <div className="dog-filters">
      <BreedFilter
        breeds={availableBreeds}
        selected={filters.breed}
        onChange={handleBreedChange}
      />
      <SizeFilter selected={filters.size} onChange={handleSizeChange} />
    </div>
  );
}
```

## Database Standards

### Table Design

- **Table names**: `snake_case`, plural (e.g., `animals`, `organizations`)
- **Column names**: `snake_case` (e.g., `created_at`, `organization_id`)
- **Primary keys**: `id SERIAL PRIMARY KEY`
- **Foreign keys**: `table_id` pattern with proper references
- **Timestamps**: Always include `created_at` and `updated_at`

```sql
-- GOOD - Proper table structure
CREATE TABLE IF NOT EXISTS animals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER NOT NULL REFERENCES organizations(id),
    breed VARCHAR(255),
    standardized_breed VARCHAR(100),
    age_min_months INTEGER,
    properties JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint to prevent duplicates
    UNIQUE (external_id, organization_id)
);
```

### Indexing Strategy

- **Primary indexes**: `idx_table_column` (e.g., `idx_animals_organization_id`)
- **Foreign key indexes**: `fk_table_column` (e.g., `fk_animals_organization`)
- **JSONB indexes**: Use GIN indexes for JSONB columns
- **Composite indexes**: For common query patterns

```sql
-- GOOD - Proper indexing
CREATE INDEX idx_animals_organization_id ON animals(organization_id);
CREATE INDEX idx_animals_breed ON animals(standardized_breed);
CREATE INDEX gin_animals_properties ON animals USING GIN(properties);
```

### Migration Standards

- **File naming**: `001_descriptive_name.sql`
- **Always include**: Description comment at top
- **Rollback plan**: Document rollback steps
- **Test migrations**: On copy of production data

```sql
-- Migration: 001_add_new_feature.sql
-- Description: Add new functionality for feature X
-- Rollback: DROP COLUMN new_field; DROP INDEX idx_new_field;

-- Add new column
ALTER TABLE animals ADD COLUMN new_field VARCHAR(100);

-- Create index
CREATE INDEX idx_animals_new_field ON animals(new_field);
```

## Naming Conventions

### Python (Backend)

- **Functions**: `snake_case`, verb-based (e.g., `calculate_adoption_fee`, `validate_organization_config`)
- **Classes**: `PascalCase` (e.g., `DogScraper`, `AdoptionFeeCalculator`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Files**: `snake_case.py`
- **Test files**: `test_*.py`
- **Private methods**: `_single_underscore_prefix`
- **Module-private**: `__double_underscore_prefix`

```python
# GOOD - Clear naming patterns
class PetsTurkeyScraper:
    MAX_RETRY_ATTEMPTS = 3
    DEFAULT_TIMEOUT_SECONDS = 30
    
    def extract_dog_data(self, html):
        return self._parse_dog_cards(html)
    
    def _parse_dog_cards(self, html):
        # Private helper method
        pass

def calculate_adoption_fee(dog):
    """Calculate adoption fee based on dog attributes."""
    pass

def validate_organization_config(config):
    """Validate organization configuration structure."""
    pass
```

### Modern Scraper Patterns (Post-Refactoring)

**BaseScraper now implements modern design patterns:**

```python
from scrapers.base_scraper import BaseScraper
from services.metrics_collector import MetricsCollector

# GOOD - Modern scraper with design patterns
class ModernScraper(BaseScraper):
    """Modern scraper using architectural patterns."""
    
    def collect_data(self):
        """Implementation only focuses on data extraction."""
        # Context manager handles connections automatically
        # Metrics collection is automatic via null object pattern
        # Template method handles the rest
        
        return [self._extract_dog(card) for card in self._get_dog_cards()]
    
    def _get_dog_cards(self):
        """Extract dog card elements from the page."""
        # Implementation here
        pass
    
    def _extract_dog(self, element):
        """Extract individual dog data from DOM element."""
        return {
            'name': self._safe_extract(element, 'h3'),
            'age': self._normalize_age(self._safe_extract(element, '.age')),
            'external_id': self._generate_external_id(element)
        }

# GOOD - Context manager usage (recommended)
with ModernScraper(config_id="org-name") as scraper:
    success = scraper.run()  # Automatic connection handling

# GOOD - Service injection for testing
custom_metrics = MetricsCollector(logger=my_logger)
scraper = ModernScraper(
    config_id="org-name",
    metrics_collector=custom_metrics,
    session_manager=mock_session_manager
)

# GOOD - Legacy support (still works)
scraper = ModernScraper(config_id="org-name")
success = scraper.run()  # Handles connections internally
```

**Key architectural improvements:**
- **Null Object Pattern**: No more `if service:` checks
- **Context Manager**: Automatic resource management
- **Template Method**: Focused implementation, framework handles lifecycle
- **Dependency Injection**: Clean testing and customization

### JavaScript/React (Frontend)

- **Functions**: `camelCase`, verb-based (e.g., `calculateTotal`, `handleClick`)
- **Components**: `PascalCase` (e.g., `DogCard`, `FilterPanel`)
- **Constants**: `UPPER_SNAKE_CASE` for true constants
- **Files**: Component files `PascalCase.jsx`, others `camelCase.js`
- **Test files**: `*.test.jsx` or `*.spec.js`
- **Hooks**: `use` prefix (e.g., `useFavorites`, `useFilteredDogs`)
- **Event handlers**: `handle` prefix (e.g., `handleSubmit`, `handleFilterChange`)

```javascript
// GOOD - Clear naming patterns
const MAX_FAVORITES = 50;
const API_BASE_URL = "http://localhost:8000";

function DogCard({ dog }) {
  const [favorited, setFavorited] = useState(false);
  
  const handleFavorite = () => {
    setFavorited(!favorited);
  };
  
  return (
    <div className="dog-card">
      <h3>{dog.name}</h3>
      <button onClick={handleFavorite}>
        {favorited ? "❤️" : "🤍"}
      </button>
    </div>
  );
}

// GOOD - Custom hooks
function useFavoriteDogs() {
  const [favorites, setFavorites] = useState([]);
  return { favorites, setFavorites };
}

function useDebounce(value, delay) {
  // Hook implementation
}
```

### Database Naming

- **Tables**: `snake_case`, plural (e.g., `animals`, `organizations`)
- **Columns**: `snake_case` (e.g., `created_at`, `organization_id`)
- **Indexes**: `idx_table_column` (e.g., `idx_animals_organization_id`)
- **Foreign keys**: `fk_table_column` (e.g., `fk_animals_organization`)
- **JSONB fields**: Use descriptive names (e.g., `properties`, `social_media`)

### Configuration Files

- **YAML files**: `kebab-case.yaml` (e.g., `pets-turkey.yaml`)
- **Config IDs**: `kebab-case` matching filename
- **Environment variables**: `UPPER_SNAKE_CASE` (e.g., `DATABASE_URL`)

## Testing Standards (TDD Required)

### Test-Driven Development Process

**ALWAYS follow this sequence:**

1. **Write failing test** - Define expected behavior
2. **Run test** - Confirm it fails (red)
3. **Write minimal code** - Make test pass (green)
4. **Refactor** - Improve code quality (refactor)
5. **Repeat** - Continue for next feature

```python
# GOOD - Test-first approach
def test_calculate_adoption_fee_for_puppy():
    # Arrange
    puppy = {'age_months': 6, 'size': 'small'}
    
    # Act
    fee = calculate_adoption_fee(puppy)
    
    # Assert
    assert fee == 150

# Then implement the function
def calculate_adoption_fee(dog):
    if dog['age_months'] < 12 and dog['size'] == 'small':
        return 150
    # ... rest of logic
```

### Test Organization

- **Unit tests**: Test individual functions/methods
- **Integration tests**: Test component interactions
- **API tests**: Test endpoint functionality
- **Frontend tests**: Test component behavior

```bash
# Backend test commands
source venv/bin/activate
pytest tests/ -m "not slow" -v      # Fast tests (development)
pytest tests/ -m "unit" -v          # Unit tests only
pytest tests/ -m "api" -v           # API tests only

# Frontend test commands
cd frontend
npm test                            # All tests
npm test -- --coverage              # With coverage
```

## Configuration Standards

### YAML Configuration Files

- **Schema version**: Always specify version
- **Consistent structure**: Follow established patterns
- **Clear organization**: Group related settings
- **Validation**: Include required fields

```yaml
# GOOD - Organization configuration
schema_version: "1.0"
id: "pets-turkey"
name: "Pets Turkey"
enabled: true

scraper:
  class_name: "PetsTurkeyScraper"
  module: "scrapers.pets_turkey.dogs_scraper"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
    timeout: 30

metadata:
  website_url: "https://petskurtulusis.com"
  description: "Turkish rescue organization"
  location:
    country: "Turkey"
    city: "Istanbul"
  service_regions: ["Turkey", "Europe"]
  ships_to: ["US", "CA", "EU"]
```

## Enhanced Python Patterns

### Type Hints and Documentation

```python
from typing import List, Optional, Dict, Any

def get_animals_by_organization(
    organization_id: int, 
    limit: Optional[int] = 20
) -> List[Dict[str, Any]]:
    """
    Fetch animals from a specific organization.
    
    Args:
        organization_id: ID of the organization
        limit: Maximum number of animals to return
        
    Returns:
        List of animal dictionaries
    """
    # Implementation here
    pass
```

### Error Handling Patterns

```python
# GOOD - Comprehensive error handling
def scrape_organization_data(config):
    try:
        data = fetch_data(config['url'])
        validated_data = validate_data(data)
        return process_data(validated_data)
    except ValidationError as e:
        logger.error(f"Validation failed: {e}")
        raise
    except NetworkError as e:
        logger.warning(f"Network issue: {e}")
        return []  # Return empty list for network issues
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        raise
```

## Enhanced JavaScript/React Patterns

### Security Requirements

```javascript
// GOOD - Always sanitize user content
import { sanitizeText } from '@/utils/security';

function DogCard({ dog }) {
  return (
    <div className="dog-card">
      <h3>{sanitizeText(dog.name)}</h3>
      <p>{sanitizeText(dog.description)}</p>
    </div>
  );
}
```

### Component Structure Standards

```javascript
// GOOD - Proper component structure
'use client'; // For client components

import { useState, useEffect, useMemo } from 'react';
import { sanitizeText } from '@/utils/security';

function DogFilters({ filters, onFilterChange }) {
  // 1. Hooks at the top
  const [isExpanded, setIsExpanded] = useState(false);
  const { user } = useAuth();

  // 2. Derived values
  const availableBreeds = useMemo(
    () => getUniqueBreeds(filters.dogs),
    [filters.dogs]
  );

  // 3. Event handlers
  const handleBreedChange = (breed) => {
    onFilterChange({ ...filters, breed });
  };

  // 4. Early returns for edge cases
  if (!filters) return null;

  // 5. Main render
  return (
    <div className="dog-filters">
      {/* Component content */}
    </div>
  );
}
```

## File Size Limits

- **Backend**: Maximum 200 lines per file
- **Frontend**: Maximum 150 lines per component
- **Tests**: Can be longer but prefer multiple focused test files
- **Configuration**: Keep YAML files focused and readable

When files grow too large:

1. Extract helper functions to utilities
2. Split components into smaller sub-components
3. Create separate modules for related functionality
4. Use composition over inheritance

## Anti-Patterns (Never Do)

### Code Quality
- ❌ Skip tests or write code without tests
- ❌ Delete/modify tests to make them pass
- ❌ Use localStorage/sessionStorage in frontend
- ❌ Mutate state or data structures
- ❌ Create files >200 lines (backend) or >150 lines (frontend)
- ❌ Commit directly to main branch

### Security
- ❌ Display user content without sanitization
- ❌ Store sensitive data in frontend
- ❌ Skip input validation
- ❌ Use eval() or similar unsafe functions

### Performance
- ❌ Make API calls without rate limiting
- ❌ Create unnecessary re-renders
- ❌ Skip database indexing for common queries
- ❌ Load all data at once without pagination
