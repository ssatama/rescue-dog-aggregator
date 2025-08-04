# Naming Conventions

This guide reflects the actual naming patterns used throughout the Rescue Dog Aggregator codebase after the 2024 architectural refactoring.

## Python (Backend)

### Service Layer Classes
- **Service classes**: `PascalCase` with `Service` suffix (e.g., `AnimalService`, `MetricsCollector`)
- **Null objects**: `Null` prefix (e.g., `NullMetricsCollector`, `NullSessionManager`)
- **Base classes**: `Base` prefix (e.g., `BaseScraper`, `BaseService`)

```python
# GOOD - Current service layer naming
class AnimalService:
    def get_animals_with_images(self, filters: AnimalFilterRequest) -> List[AnimalWithImages]:
        pass

class MetricsCollector:
    def increment(self, metric_name: str) -> None:
        pass

class NullMetricsCollector(MetricsCollector):
    def increment(self, metric_name: str) -> None:
        pass  # No-op implementation
```

### Functions and Methods
- **Functions**: `snake_case`, verb-based with domain context
- **Private methods**: `_single_underscore_prefix`
- **Service methods**: Domain-specific verbs (e.g., `get_animals_with_images`, `batch_insert_animals`)

```python
# GOOD - Current function naming patterns
def standardize_breed(breed_text: str) -> Optional[str]:
    pass

def get_animals_with_images(filters: AnimalFilterRequest) -> List[AnimalWithImages]:
    pass

def batch_insert_animals(animals: List[Dict], organization_id: int) -> List[int]:
    pass

def _validate_animal_data(animal: Dict) -> Dict:
    pass

def _extract_dog_data(card_element) -> Dict[str, Any]:
    pass
```

### Scraper Architecture
- **Scraper classes**: Organization name + `Scraper` (e.g., `PetsTurkeyScraper`, `ModernOrganizationScraper`)
- **Template methods**: Lifecycle verbs (e.g., `collect_data`, `process_animals`, `handle_scraper_failure`)

```python
# GOOD - Current scraper naming
class PetsTurkeyScraper(BaseScraper):
    def collect_data(self) -> List[Dict]:
        pass
    
    def _get_dog_cards(self) -> List[Any]:
        pass
    
    def _extract_dog_data(self, card_element) -> Dict[str, Any]:
        pass

# Configuration-driven initialization
with PetsTurkeyScraper(config_id="pets-turkey") as scraper:
    pass
```

### Constants and Configuration
- **Constants**: `UPPER_SNAKE_CASE` with descriptive context
- **API constants**: Include API version or context

```python
# GOOD - Current constant naming
DEFAULT_AVAILABILITY_CONFIDENCE = "high"
MAX_IMAGES_PER_ANIMAL = 5
BATCH_INSERT_SIZE = 100
API_VERSION = "v0.2.0"
SLUG_MAX_LENGTH = 255
```

### Files and Modules
- **Service files**: `{domain}_service.py` (e.g., `animal_service.py`)
- **Null objects**: `null_objects.py` or within service files
- **Scraper modules**: `{organization}/{type}_scraper.py`

```
services/
├── animal_service.py
├── metrics_collector.py
├── session_manager.py
└── database_service.py

scrapers/
├── base_scraper.py
├── pets_turkey/
│   └── dogs_scraper.py
└── daisy_family_rescue/
    └── dogs_scraper.py
```

## TypeScript/React (Frontend)

### Next.js 15 App Directory Structure
- **Page components**: Domain-based folders with `page.tsx`
- **Client components**: `Client` suffix for client-side components
- **Layout files**: `layout.tsx` for shared layouts

```typescript
// GOOD - Current Next.js 15 patterns
app/
├── dogs/
│   ├── [slug]/
│   │   ├── page.tsx          // Server component
│   │   └── DogDetailClient.tsx   // Client component
│   └── page.tsx
└── organizations/
    ├── [slug]/
    │   └── page.tsx
    └── page.tsx
```

### Component Naming
- **Components**: `PascalCase` with descriptive, domain-specific names
- **Props interfaces**: Component name + `Props` (e.g., `DogCardProps`, `AnimatedCounterProps`)
- **Client components**: Clear distinction with `Client` suffix when needed

```typescript
// GOOD - Current component naming
interface DogCardProps {
  animal: AnimalWithImages;
  onFavorite: (id: number) => void;
  onView: (slug: string) => void;
  showOrganization?: boolean;
}

function DogCard({ animal, onFavorite, onView, showOrganization = false }: DogCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  
  const handleFavoriteClick = () => {
    onFavorite(animal.id);
  };
  
  return (
    <div className="dog-card" onClick={() => onView(animal.slug)}>
      {/* Component implementation */}
    </div>
  );
}

// Client component with clear naming
function DogDetailClient() {
  // Client-side logic
}
```

### Hooks and State Management
- **Custom hooks**: `use` prefix with domain context
- **State variables**: Descriptive names reflecting their purpose
- **API hooks**: Include API context (e.g., `useAnimals`, `useOrganizations`)

```typescript
// GOOD - Current hook naming patterns
function useAnimals(filters: AnimalFilters): UseAnimalsReturn {
  const [animals, setAnimals] = useState<AnimalWithImages[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  return { animals, loading, error, refetch };
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  return debouncedValue;
}

interface UseAnimalsReturn {
  animals: AnimalWithImages[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}
```

### Event Handlers and Functions
- **Event handlers**: `handle` prefix with action (e.g., `handleFilterChange`, `handleAnimalFavorite`)
- **Utility functions**: Verb-based with context (e.g., `parseSearchParams`, `formatAge`)

```typescript
// GOOD - Current event handler naming
const handleFilterChange = (newFilters: Partial<AnimalFilters>) => {
  setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
};

const handleAnimalFavorite = (animalId: number) => {
  // Favoriting logic
};

function parseSearchParams(params: any): AnimalFilters {
  return {
    breed: params.breed as string,
    size: params.size as string,
    organization: params.organization as string,
  };
}
```

## Database Schema

### Modern Table and Column Naming
- **Tables**: `snake_case`, plural, descriptive (e.g., `animals`, `organizations`, `service_regions`)
- **Columns**: `snake_case` with context (e.g., `availability_status`, `availability_confidence`)
- **JSON fields**: `snake_case` with descriptive names (e.g., `service_regions`, `social_media`)
- **Slugs**: Always include `slug` column for SEO-friendly URLs

```sql
-- GOOD - Current database naming patterns
CREATE TABLE animals (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER REFERENCES organizations(id),
    
    -- Breed information with standardization
    breed VARCHAR(255),
    standardized_breed VARCHAR(100),
    breed_group VARCHAR(100),
    
    -- Age with multiple representations
    age_text VARCHAR(100),
    age_min_months INTEGER,
    age_max_months INTEGER,
    age_category VARCHAR(20),
    
    -- Behavioral attributes as JSONB
    properties JSONB DEFAULT '{}',
    
    -- Availability tracking
    availability_status VARCHAR(20) DEFAULT 'available',
    availability_confidence VARCHAR(10) DEFAULT 'high',
    consecutive_scrapes_missing INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP,
    last_seen_at TIMESTAMP
);

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    
    -- Service information as JSONB
    service_regions JSONB DEFAULT '[]',
    ships_to TEXT[] DEFAULT '{}',
    social_media JSONB DEFAULT '{}'
);
```

### Index and Constraint Naming
- **Indexes**: `idx_{table}_{column(s)}` (e.g., `idx_animals_slug`, `idx_animals_availability`)
- **GIN indexes**: `gin_{table}_{column}` for JSONB fields
- **Unique constraints**: Descriptive with table context

```sql
-- GOOD - Current index naming
CREATE UNIQUE INDEX idx_animals_slug ON animals(slug);
CREATE INDEX idx_animals_organization_id ON animals(organization_id);
CREATE INDEX idx_animals_availability ON animals(availability_status, availability_confidence);
CREATE INDEX gin_animals_properties USING GIN(properties);
CREATE INDEX gin_organizations_service_regions USING GIN(service_regions);
```

## Configuration and Deployment

### YAML Configuration Files
- **Organization configs**: `kebab-case.yaml` matching organization slugs
- **Config IDs**: Consistent with filename and database slugs

```yaml
# configs/organizations/pets-turkey.yaml
schema_version: "1.1"
id: "pets-turkey"
name: "Pets Turkey"

scraper:
  class_name: "PetsTurkeyScraper"
  module: "scrapers.pets_turkey.dogs_scraper"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
```

### Environment Variables
- **Environment vars**: `UPPER_SNAKE_CASE` with context
- **API URLs**: Include environment context

```bash
# GOOD - Current environment variable naming
DATABASE_URL=postgresql://...
CLOUDINARY_CLOUD_NAME=rescue-dogs
NEXT_PUBLIC_API_URL=https://api.rescuedogs.me
NEXT_PUBLIC_SITE_URL=https://rescuedogs.me
RAILWAY_DATABASE_URL=postgresql://...
```

## API Endpoints and Routes

### REST API Patterns
- **Endpoints**: RESTful with slug support for SEO
- **Meta endpoints**: `/meta/` prefix for metadata endpoints
- **Legacy redirects**: Explicit `/id/{id}` for legacy ID-based URLs

```typescript
// GOOD - Current API endpoint naming
GET /api/animals/                    // List animals with filters
GET /api/animals/{slug}              // Get animal by SEO-friendly slug
GET /api/animals/id/{id}             // Legacy ID redirect (301 to slug)
GET /api/animals/meta/breeds         // Metadata: available breeds
GET /api/animals/meta/filter_counts  // Dynamic filter counts
GET /api/organizations/              // List organizations
GET /api/organizations/{slug}        // Get organization by slug
```

## Testing Files

### Test File Organization
- **Backend tests**: `test_{module}.py` with descriptive class names
- **Frontend tests**: `{Component}.test.{tsx|jsx}` or `{Component}.spec.{tsx|jsx}`
- **Integration tests**: Clear separation by test type

```python
# GOOD - Current test file naming
tests/
├── api/
│   ├── test_animals_api.py
│   ├── test_organizations_api.py
│   └── test_database_error_handling.py
├── scrapers/
│   ├── test_base_scraper.py
│   └── test_pets_turkey_scraper.py
└── services/
    ├── test_animal_service.py
    └── test_metrics_collector.py

# Frontend tests
frontend/src/components/dogs/__tests__/
├── DogCard.test.tsx
├── DogList.test.tsx
└── DogDetail.test.tsx
```

### Test Class and Method Naming
- **Test classes**: `Test{FeatureBeingTested}` (e.g., `TestAnimalService`, `TestDogCard`)
- **Test methods**: `test_{what_is_being_tested}_{expected_outcome}`

```python
# GOOD - Current test naming patterns
class TestAnimalService:
    def test_get_animals_with_filters_success(self):
        pass
    
    def test_get_animals_with_invalid_filters_raises_validation_error(self):
        pass
    
    def test_null_object_pattern_works_without_metrics_collector(self):
        pass

class TestModernScraper:
    def test_context_manager_usage_handles_setup_and_cleanup(self):
        pass
    
    def test_service_injection_for_testing_allows_custom_dependencies(self):
        pass
```

## Anti-Patterns (Never Use)

### Avoid These Naming Patterns
- ❌ Generic names without context (`Manager`, `Handler`, `Helper`)
- ❌ Abbreviations that aren't universally understood (`calc`, `proc`, `mgr`)
- ❌ Inconsistent casing within the same context
- ❌ Names that don't reflect the modern architecture patterns

```python
# BAD - Avoid these patterns
class DogManager:  # Too generic
class ProcHelper:  # Abbreviations
def get_data():    # No context

# GOOD - Use descriptive, context-specific names
class AnimalService:
class MetricsCollector:
def get_animals_with_images():
```

This updated guide reflects the actual naming conventions used throughout the modernized codebase and provides concrete examples from the current implementation.
