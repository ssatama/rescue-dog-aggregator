# Naming Conventions

## Python (Backend)

- **Functions**: `snake_case`, verb-based (e.g., `calculate_total`, `validate_payment`)
- **Classes**: `PascalCase` (e.g., `DogScraper`, `PaymentProcessor`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- **Files**: `snake_case.py`
- **Test files**: `test_*.py`
- **Private methods**: `_single_underscore_prefix`
- **Module-private**: `__double_underscore_prefix`

### Examples

```python
# Good function names
def calculate_adoption_fee(dog):
def extract_dog_data(html):
def validate_organization_config(config):

# Good class names
class PetsTurkeyScraper:
class AdoptionFeeCalculator:
class DatabaseConnectionManager:

# Good constants
MAX_RETRY_ATTEMPTS = 3
DEFAULT_TIMEOUT_SECONDS = 30
SUPPORTED_DOG_SIZES = ['small', 'medium', 'large']
```

## JavaScript/React (Frontend)

- **Functions**: `camelCase`, verb-based (e.g., `calculateTotal`, `handleClick`)
- **Components**: `PascalCase` (e.g., `DogCard`, `FilterPanel`)
- **Constants**: `UPPER_SNAKE_CASE` for true constants
- **Files**: Component files `PascalCase.jsx`, others `camelCase.js`
- **Test files**: `*.test.jsx` or `*.spec.js`
- **Hooks**: `use` prefix (e.g., `useFavorites`, `useFilteredDogs`)
- **Event handlers**: `handle` prefix (e.g., `handleSubmit`, `handleFilterChange`)

### Examples

```javascript
// Good function names
function calculateAdoptionFee(dog) {}
function formatDogAge(ageMonths) {}
function validateEmailAddress(email) {}

// Good component names
function DogCard({ dog }) {}
function OrganizationFilter({ organizations }) {}
function AdoptionApplicationForm() {}

// Good hook names
function useFavoriteDogs() {}
function useApiData(endpoint) {}
function useDebounce(value, delay) {}

// Good constants
const MAX_FAVORITES = 50;
const API_BASE_URL = "http://localhost:8000";
const DOG_SIZE_OPTIONS = ["small", "medium", "large"];
```

## Database

- **Tables**: `snake_case`, plural (e.g., `animals`, `organizations`)
- **Columns**: `snake_case` (e.g., `created_at`, `organization_id`)
- **Indexes**: `idx_table_column` (e.g., `idx_animals_organization_id`)
- **Foreign keys**: `fk_table_column` (e.g., `fk_animals_organization`)

## Configuration Files

- **YAML files**: `kebab-case.yaml` (e.g., `pets-turkey.yaml`)
- **Config IDs**: `kebab-case` matching filename
- **Environment variables**: `UPPER_SNAKE_CASE` (e.g., `DATABASE_URL`)
