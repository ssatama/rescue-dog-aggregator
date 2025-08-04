# Code Style Guide

This guide reflects the actual patterns used in the Rescue Dog Aggregator codebase after the major 2024 architectural refactoring. It emphasizes clean architecture, modern design patterns, and maintainable code.

## Python (Backend)

### Service Layer Architecture

The codebase now implements a modern service layer pattern with dependency injection:

```python
# GOOD - Modern service layer pattern
from services.metrics_collector import MetricsCollector, NullMetricsCollector
from services.session_manager import SessionManager, NullSessionManager

class AnimalService:
    """Service layer for animal operations."""
    
    def __init__(
        self,
        metrics_collector: MetricsCollector = None,
        session_manager: SessionManager = None
    ):
        # Null Object Pattern - no conditional checks needed
        self.metrics = metrics_collector or NullMetricsCollector()
        self.session = session_manager or NullSessionManager()
    
    def get_animals_with_images(self, filters: AnimalFilterRequest) -> List[AnimalWithImages]:
        """Fetch animals with their images using batch queries."""
        self.metrics.increment('animals.query.started')
        
        animals = self._get_filtered_animals(filters)
        self._batch_load_images(animals)  # Eliminates N+1 queries
        
        self.metrics.increment('animals.query.completed')
        return animals

    def _get_filtered_animals(self, filters) -> List[Animal]:
        """Private method with focused responsibility."""
        # Implementation here
        pass

    def _batch_load_images(self, animals: List[Animal]) -> None:
        """Load all images in a single batch query."""
        # Batch loading implementation
        pass
```

### Modern Scraper Architecture

**Post-refactoring scrapers use architectural patterns:**

```python
from scrapers.base_scraper import BaseScraper
from services.metrics_collector import MetricsCollector

class ModernOrganizationScraper(BaseScraper):
    """Modern scraper implementing architectural patterns."""
    
    def __init__(
        self, 
        config_id: str = "organization-name",
        organization_id: int = None,
        metrics_collector: MetricsCollector = None,
        session_manager = None
    ):
        # Configuration-driven initialization (preferred)
        if organization_id is not None:
            super().__init__(organization_id=organization_id)  # Legacy mode
        else:
            super().__init__(config_id=config_id)  # Modern mode
            
        # Dependency injection for testing
        if metrics_collector:
            self.metrics_collector = metrics_collector
        if session_manager:
            self.session_manager = session_manager

    def collect_data(self) -> List[Dict]:
        """Template method implementation - only focus on data extraction."""
        # Context manager and lifecycle handled by parent
        # Metrics collection automatic via null object pattern
        
        dog_cards = self._get_dog_cards()
        return [self._extract_dog_data(card) for card in dog_cards]

    def _get_dog_cards(self) -> List[Any]:
        """Extract dog card elements from scraped content."""
        soup = BeautifulSoup(self.page_content, 'html.parser')
        return soup.find_all('div', class_='dog-card')

    def _extract_dog_data(self, card_element) -> Dict[str, Any]:
        """Extract structured data from a single dog card."""
        return {
            'name': self._safe_extract_text(card_element, 'h3'),
            'breed': self._safe_extract_text(card_element, '.breed'),
            'age_text': self._safe_extract_text(card_element, '.age'),
            'images': self._extract_image_urls(card_element),
            'external_id': self._generate_external_id(card_element)
        }

# RECOMMENDED - Context manager usage
with ModernOrganizationScraper(config_id="pets-turkey") as scraper:
    success = scraper.run()  # Automatic connection/cleanup

# GOOD - Service injection for testing  
custom_metrics = MetricsCollector(logger=test_logger)
scraper = ModernOrganizationScraper(
    config_id="pets-turkey",
    metrics_collector=custom_metrics,
    session_manager=mock_session_manager
)
```

### Functional Programming Approach

Follow a "functional light" approach with immutable data:

```python
# GOOD - Pure functions with immutable data
def standardize_breed(breed_text: str) -> Optional[str]:
    """Pure function - no side effects."""
    if not breed_text:
        return None
        
    normalized = breed_text.strip().lower()
    breed_mappings = {
        'golden ret': 'Golden Retriever',
        'german shep': 'German Shepherd',
        'lab mix': 'Labrador Mix'
    }
    
    return breed_mappings.get(normalized, breed_text.title())

def process_animal_data(raw_animals: List[Dict]) -> List[Dict]:
    """Transform raw data immutably."""
    return [
        {
            **animal,
            'standardized_breed': standardize_breed(animal.get('breed')),
            'age_category': categorize_age(animal.get('age_months')),
            'processed_at': datetime.utcnow().isoformat()
        }
        for animal in raw_animals
        if is_valid_animal_data(animal)
    ]

def is_valid_animal_data(animal: Dict) -> bool:
    """Pure validation function."""
    required_fields = ['name', 'external_id']
    return all(animal.get(field) for field in required_fields)
```

### Code Structure and Documentation

The codebase uses both docstrings and targeted inline comments:

```python
# GOOD - Modern documentation approach
class DatabaseService:
    """Service for database operations with connection pooling."""
    
    def __init__(self, connection_pool_size: int = 10):
        """Initialize with configurable connection pool."""
        self.connection_pool = self._create_connection_pool(connection_pool_size)
    
    def batch_insert_animals(
        self, 
        animals: List[Dict[str, Any]], 
        organization_id: int
    ) -> List[int]:
        """
        Insert multiple animals in a single transaction.
        
        Args:
            animals: List of animal data dictionaries
            organization_id: ID of the organization
            
        Returns:
            List of created animal IDs
            
        Raises:
            ValidationError: If animal data is invalid
            DatabaseError: If insertion fails
        """
        validated_animals = [self._validate_animal(a) for a in animals]
        
        with self.connection_pool.get_connection() as conn:
            # Batch insert for performance
            return self._execute_batch_insert(conn, validated_animals, organization_id)

    def _validate_animal(self, animal: Dict) -> Dict:
        """Validate and normalize animal data."""
        # Clear validation logic with early returns
        if not animal.get('name'):
            raise ValidationError("Animal name is required")
            
        if animal.get('age_months', 0) < 0:
            raise ValidationError("Age cannot be negative")
            
        return {
            'name': animal['name'].strip(),
            'breed': animal.get('breed'),
            'age_months': animal.get('age_months'),
            'external_id': animal['external_id']
        }
```

### Error Handling Patterns

```python
# GOOD - Comprehensive error handling with service layer
from api.exceptions import ValidationError, NotFoundError

@safe_execute  # Decorator for consistent error handling
async def get_animal_by_slug(slug: str) -> AnimalWithImages:
    """Get animal by slug with comprehensive error handling."""
    try:
        animal_service = ServiceFactory.get_animal_service()
        animal = await animal_service.get_by_slug(slug)
        
        if not animal:
            raise NotFoundError(f"Animal with slug '{slug}' not found")
            
        return animal
        
    except ValidationError:
        # Re-raise validation errors as-is
        raise
    except DatabaseError as e:
        # Log and convert to internal error
        logger.error(f"Database error fetching animal {slug}: {e}")
        raise InternalServerError("Unable to fetch animal data")
    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(f"Unexpected error fetching animal {slug}: {e}")
        raise InternalServerError("An unexpected error occurred")
```

## TypeScript/React (Frontend)

### Next.js 15 App Directory Structure

```typescript
// GOOD - Modern Next.js 15 pattern with TypeScript
'use client'; // Client component marker

import { useState, useEffect, useMemo } from 'react';
import { AnimalWithImages, AnimalFilters } from '@/types/api';
import { useAnimals } from '@/hooks/useAnimals';
import { DogCard } from '@/components/dogs/DogCard';

interface AnimalsPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function AnimalsPage({ searchParams }: AnimalsPageProps) {
  // 1. State and hooks at the top
  const [filters, setFilters] = useState<AnimalFilters>(() => 
    parseSearchParams(searchParams)
  );
  
  const { animals, loading, error, refetch } = useAnimals(filters);

  // 2. Derived values with useMemo
  const filteredAnimals = useMemo(
    () => animals?.filter(animal => animal.availability_confidence !== 'low') || [],
    [animals]
  );

  // 3. Event handlers
  const handleFilterChange = (newFilters: Partial<AnimalFilters>) => {
    setFilters(prevFilters => ({ ...prevFilters, ...newFilters }));
  };

  const handleAnimalFavorite = (animalId: number) => {
    // Handle favoriting logic
  };

  // 4. Early returns for edge cases
  if (error) {
    return <ErrorBoundary error={error} onRetry={refetch} />;
  }

  // 5. Main render with TypeScript safety
  return (
    <div className="animals-page">
      <FilterPanel filters={filters} onChange={handleFilterChange} />
      
      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="animals-grid">
          {filteredAnimals.map((animal) => (
            <DogCard
              key={animal.id}
              animal={animal}
              onFavorite={() => handleAnimalFavorite(animal.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function parseSearchParams(params: any): AnimalFilters {
  // Type-safe parameter parsing
  return {
    breed: params.breed as string,
    size: params.size as string,
    organization: params.organization as string,
  };
}
```

### Modern React Patterns

```typescript
// GOOD - Custom hooks with TypeScript
interface UseAnimalsReturn {
  animals: AnimalWithImages[] | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

function useAnimals(filters: AnimalFilters): UseAnimalsReturn {
  const [animals, setAnimals] = useState<AnimalWithImages[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnimals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await apiClient.getAnimals(filters);
      setAnimals(response.data);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchAnimals();
  }, [fetchAnimals]);

  return { animals, loading, error, refetch: fetchAnimals };
}

// GOOD - Immutable state updates with TypeScript
interface DogListState {
  dogs: AnimalWithImages[];
  selectedDog: AnimalWithImages | null;
  favorites: number[];
}

function DogList() {
  const [state, setState] = useState<DogListState>({
    dogs: [],
    selectedDog: null,
    favorites: []
  });

  const addToFavorites = (dogId: number) => {
    setState(prevState => ({
      ...prevState,
      favorites: [...prevState.favorites, dogId] // Immutable update
    }));
  };

  const removeDog = (dogId: number) => {
    setState(prevState => ({
      ...prevState,
      dogs: prevState.dogs.filter(dog => dog.id !== dogId), // Immutable filter
      selectedDog: prevState.selectedDog?.id === dogId ? null : prevState.selectedDog
    }));
  };

  const updateDog = (dogId: number, updates: Partial<AnimalWithImages>) => {
    setState(prevState => ({
      ...prevState,
      dogs: prevState.dogs.map(dog =>
        dog.id === dogId
          ? { ...dog, ...updates } // Immutable object update
          : dog
      )
    }));
  };
}
```

### Component Architecture

```typescript
// GOOD - Well-structured component with TypeScript interfaces
interface DogCardProps {
  animal: AnimalWithImages;
  onFavorite: (id: number) => void;
  onView: (slug: string) => void;
  showOrganization?: boolean;
}

function DogCard({ 
  animal, 
  onFavorite, 
  onView, 
  showOrganization = false 
}: DogCardProps) {
  // Hooks
  const [imageLoaded, setImageLoaded] = useState(false);
  const [favorited, setFavorited] = useState(false);

  // Derived values
  const displayAge = useMemo(() => 
    formatAge(animal.age_text, animal.age_min_months), 
    [animal.age_text, animal.age_min_months]
  );

  // Event handlers
  const handleFavoriteClick = () => {
    setFavorited(prev => !prev);
    onFavorite(animal.id);
  };

  const handleCardClick = () => {
    onView(animal.slug);
  };

  // Early return for invalid data
  if (!animal?.name) {
    return null;
  }

  return (
    <div 
      className="dog-card cursor-pointer" 
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === 'Enter' && handleCardClick()}
    >
      <div className="relative">
        <LazyImage
          src={animal.primary_image_url}
          alt={`Photo of ${animal.name}`}
          onLoad={() => setImageLoaded(true)}
          className="dog-card__image"
        />
        
        <button
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            handleFavoriteClick();
          }}
          className="dog-card__favorite-btn"
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {favorited ? '❤️' : '🤍'}
        </button>
      </div>

      <div className="dog-card__content">
        <h3 className="dog-card__name">{animal.name}</h3>
        
        {animal.breed && (
          <p className="dog-card__breed">{animal.breed}</p>
        )}
        
        {displayAge && (
          <p className="dog-card__age">{displayAge}</p>
        )}

        {showOrganization && animal.organization && (
          <p className="dog-card__organization">
            {animal.organization.name}
          </p>
        )}
      </div>
    </div>
  );
}
```

## Database Standards

### Modern Table Design

```sql
-- GOOD - Current database schema patterns
CREATE TABLE IF NOT EXISTS animals (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL, -- SEO-friendly URLs
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Breed information
    breed VARCHAR(255),
    standardized_breed VARCHAR(100),
    breed_group VARCHAR(100),
    
    -- Age information
    age_text VARCHAR(100),
    age_min_months INTEGER CHECK (age_min_months >= 0),
    age_max_months INTEGER CHECK (age_max_months >= age_min_months),
    age_category VARCHAR(20) CHECK (age_category IN ('puppy', 'young', 'adult', 'senior')),
    
    -- Physical attributes
    sex VARCHAR(10) CHECK (sex IN ('male', 'female')),
    size VARCHAR(50),
    standardized_size VARCHAR(20) CHECK (standardized_size IN ('small', 'medium', 'large')),
    
    -- Behavioral attributes (JSONB for flexibility)
    properties JSONB DEFAULT '{}',
    
    -- Availability tracking
    availability_status VARCHAR(20) DEFAULT 'available' 
        CHECK (availability_status IN ('available', 'adopted', 'removed')),
    availability_confidence VARCHAR(10) DEFAULT 'high'
        CHECK (availability_confidence IN ('high', 'medium', 'low')),
    last_seen_at TIMESTAMP,
    consecutive_scrapes_missing INTEGER DEFAULT 0,
    
    -- Metadata
    external_id VARCHAR(255) NOT NULL,
    adoption_url TEXT,
    language VARCHAR(5) DEFAULT 'en',
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_scraped_at TIMESTAMP,
    
    -- Constraints
    UNIQUE (external_id, organization_id),
    INDEX idx_animals_slug (slug),
    INDEX idx_animals_organization_id (organization_id),
    INDEX idx_animals_availability (availability_status, availability_confidence),
    INDEX gin_animals_properties USING GIN(properties)
);

-- GOOD - Organizations with modern features
CREATE TABLE IF NOT EXISTS organizations (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(255) UNIQUE NOT NULL, -- SEO-friendly URLs
    name VARCHAR(255) NOT NULL,
    
    -- Contact information
    website_url TEXT,
    description TEXT,
    country VARCHAR(2), -- ISO country code
    city VARCHAR(100),
    logo_url TEXT,
    
    -- Social media (JSONB for flexibility)
    social_media JSONB DEFAULT '{}',
    
    -- Service information
    service_regions JSONB DEFAULT '[]', -- Array of service regions
    ships_to TEXT[] DEFAULT '{}', -- Array of country codes
    established_year INTEGER CHECK (established_year > 1800),
    
    -- Status
    active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_organizations_slug (slug),
    INDEX idx_organizations_active (active),
    INDEX gin_organizations_service_regions USING GIN(service_regions),
    INDEX gin_organizations_ships_to USING GIN(ships_to)
);
```

### Migration Standards

```sql
-- Migration: 007_add_slug_support.sql
-- Description: Add slug support for SEO-friendly URLs with automatic generation
-- Rollback: DROP COLUMN slug; DROP INDEX idx_animals_slug; DROP INDEX idx_organizations_slug;

-- Add slug columns
ALTER TABLE animals ADD COLUMN slug VARCHAR(255);
ALTER TABLE organizations ADD COLUMN slug VARCHAR(255);

-- Generate slugs for existing records
UPDATE animals SET slug = LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(name || '-' || id::text, '[^a-zA-Z0-9]+', '-', 'g'),
    '^-|-$', '', 'g'
));

UPDATE organizations SET slug = LOWER(REGEXP_REPLACE(
    REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'),
    '^-|-$', '', 'g'
));

-- Add constraints and indexes
ALTER TABLE animals ALTER COLUMN slug SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX idx_animals_slug ON animals(slug);
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);
```

## Configuration Standards

### YAML Configuration Files

Current organization configuration pattern:

```yaml
# configs/organizations/pets-turkey.yaml
schema_version: "1.1"
id: "pets-turkey"
name: "Pets Turkey"
enabled: true

# Scraper configuration
scraper:
  class_name: "PetsTurkeyScraper"
  module: "scrapers.pets_turkey.dogs_scraper"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
    timeout: 30
    user_agent: "Mozilla/5.0 (compatible; RescueDogBot/1.0)"

# Organization metadata
metadata:
  website_url: "https://petsinturkey.org"
  description: "Turkish rescue organization helping street dogs"
  location:
    country: "TR"
    country_name: "Turkey"
    city: "Izmir"
  
  # Service regions with detailed information
  service_regions:
    - country_code: "TR"
      country_name: "Turkey"
      regions: ["Istanbul", "Ankara", "Izmir"]
      shipping_info: "Local transport available"
  
  # Shipping destinations
  ships_to: ["DE", "NL", "BE", "FR", "UK", "AT", "CH"]
  
  # Social media
  social_media:
    website: "https://petsinturkey.org"
    facebook: "https://facebook.com/petsinturkey"
    instagram: "petsinturkey"

# Processing configuration
processing:
  image_processing:
    enabled: true
    cloudinary_folder: "pets-turkey"
    max_images_per_animal: 5
  
  data_validation:
    required_fields: ["name", "external_id"]
    age_validation: true
    breed_standardization: true
```

## Testing Standards (TDD Required)

### Modern Testing Patterns

```python
# GOOD - Service layer testing with dependency injection
import pytest
from unittest.mock import Mock, patch
from services.animal_service import AnimalService
from services.metrics_collector import NullMetricsCollector

class TestAnimalService:
    """Test suite for AnimalService with modern patterns."""

    @pytest.fixture
    def mock_metrics(self):
        """Mock metrics collector for testing."""
        return Mock()

    @pytest.fixture
    def animal_service(self, mock_metrics):
        """Animal service with injected dependencies."""
        return AnimalService(metrics_collector=mock_metrics)

    def test_get_animals_with_filters_success(self, animal_service, mock_metrics):
        """Test successful animal retrieval with filters."""
        # Arrange
        filters = AnimalFilterRequest(breed="Golden Retriever", limit=10)
        expected_animals = [
            {"id": 1, "name": "Buddy", "breed": "Golden Retriever"},
            {"id": 2, "name": "Max", "breed": "Golden Retriever"}
        ]
        
        with patch.object(animal_service, '_get_filtered_animals') as mock_get:
            mock_get.return_value = expected_animals
            
            # Act
            result = animal_service.get_animals_with_images(filters)
            
            # Assert
            assert result == expected_animals
            mock_metrics.increment.assert_any_call('animals.query.started')
            mock_metrics.increment.assert_any_call('animals.query.completed')
            mock_get.assert_called_once_with(filters)

    def test_null_object_pattern_works(self):
        """Test that null object pattern eliminates conditional checks."""
        # Arrange - No metrics collector provided
        service = AnimalService()  # Uses NullMetricsCollector internally
        
        # Act & Assert - Should not raise any errors
        filters = AnimalFilterRequest(limit=1)
        # This should work without any conditional checks in the code
        # because NullMetricsCollector handles all calls gracefully
        with patch.object(service, '_get_filtered_animals', return_value=[]):
            result = service.get_animals_with_images(filters)
            assert result == []

# GOOD - Modern scraper testing with context manager
class TestModernScraper:
    """Test modern scraper patterns."""

    @pytest.fixture
    def mock_config(self):
        return {
            'id': 'test-org',
            'scraper': {
                'config': {
                    'rate_limit_delay': 1.0,
                    'max_retries': 2
                }
            }
        }

    def test_context_manager_usage(self, mock_config):
        """Test that scraper works as context manager."""
        # Arrange
        with patch('scrapers.base_scraper.load_organization_config') as mock_load:
            mock_load.return_value = mock_config
            
            # Act & Assert - Context manager should handle setup/cleanup
            with ModernOrganizationScraper(config_id="test-org") as scraper:
                assert scraper is not None
                # Scraper should be properly initialized
                
            # Context manager should have cleaned up resources

    def test_service_injection_for_testing(self):
        """Test that services can be injected for testing."""
        # Arrange
        mock_metrics = Mock()
        mock_session = Mock()
        
        # Act
        scraper = ModernOrganizationScraper(
            config_id="test-org",
            metrics_collector=mock_metrics,
            session_manager=mock_session
        )
        
        # Assert
        assert scraper.metrics_collector == mock_metrics
        assert scraper.session_manager == mock_session
```

### Frontend Testing with TypeScript

```typescript
// GOOD - Modern React testing with TypeScript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DogCard } from '@/components/dogs/DogCard';
import { AnimalWithImages } from '@/types/api';

// Mock data factory
const createMockAnimal = (overrides: Partial<AnimalWithImages> = {}): AnimalWithImages => ({
  id: 1,
  slug: 'buddy-golden-retriever-123',
  name: 'Buddy',
  breed: 'Golden Retriever',
  age_text: '2 years',
  primary_image_url: 'https://example.com/buddy.jpg',
  organization: {
    id: 1,
    slug: 'pets-turkey',
    name: 'Pets Turkey',
    // ... other required fields
  },
  images: [],
  // ... other required fields
  ...overrides,
});

describe('DogCard', () => {
  const mockOnFavorite = vi.fn();
  const mockOnView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dog information correctly', () => {
    // Arrange
    const animal = createMockAnimal();

    // Act
    render(
      <DogCard 
        animal={animal} 
        onFavorite={mockOnFavorite} 
        onView={mockOnView} 
      />
    );

    // Assert
    expect(screen.getByText('Buddy')).toBeInTheDocument();
    expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
    expect(screen.getByText('2 years')).toBeInTheDocument();
  });

  it('calls onFavorite when favorite button is clicked', async () => {
    // Arrange
    const animal = createMockAnimal({ id: 123 });
    render(
      <DogCard 
        animal={animal} 
        onFavorite={mockOnFavorite} 
        onView={mockOnView} 
      />
    );

    // Act
    const favoriteButton = screen.getByLabelText(/add to favorites/i);
    fireEvent.click(favoriteButton);

    // Assert
    await waitFor(() => {
      expect(mockOnFavorite).toHaveBeenCalledWith(123);
    });
  });

  it('prevents card click when favorite button is clicked', async () => {
    // Arrange
    const animal = createMockAnimal();
    render(
      <DogCard 
        animal={animal} 
        onFavorite={mockOnFavorite} 
        onView={mockOnView} 
      />
    );

    // Act
    const favoriteButton = screen.getByLabelText(/add to favorites/i);
    fireEvent.click(favoriteButton);

    // Assert
    expect(mockOnView).not.toHaveBeenCalled();
    expect(mockOnFavorite).toHaveBeenCalled();
  });
});
```

## File Size and Organization Standards

### File Size Limits
- **Backend Python**: 200 lines maximum
- **Frontend TypeScript**: 150 lines per component
- **Service classes**: 250 lines maximum (due to complexity)
- **Test files**: Can be longer but prefer focused test suites

### Modern File Organization

```
src/
├── services/              # Service layer
│   ├── animal_service.py
│   ├── metrics_collector.py
│   ├── session_manager.py
│   └── null_objects.py    # Null object implementations
├── scrapers/
│   ├── base_scraper.py    # Modern base with patterns
│   └── pets_turkey/
│       ├── dogs_scraper.py
│       └── detail_parser.py
├── api/
│   ├── routes/
│   ├── dependencies.py    # FastAPI dependency injection
│   └── exceptions.py      # Standardized exceptions
└── utils/
    ├── validation.py
    └── standardization.py

frontend/src/
├── app/                   # Next.js 15 app directory
│   ├── dogs/
│   │   ├── [slug]/
│   │   │   └── page.tsx   # Slug-based routing
│   │   └── page.tsx
│   └── organizations/
├── components/            # Reusable components
│   ├── dogs/
│   │   ├── DogCard.tsx
│   │   └── DogCard.stories.tsx  # Storybook stories
│   └── ui/
├── hooks/                 # Custom React hooks
│   ├── useAnimals.ts
│   └── useDebounce.ts
├── types/                 # TypeScript interfaces
│   ├── api.ts
│   └── components.ts
└── utils/
    ├── api.ts
    └── validation.ts
```

## Anti-Patterns (Never Do)

### Architecture
- ❌ Skip service layer - always use service classes for business logic
- ❌ Conditional null checks - use null object pattern instead
- ❌ Direct database access in routes - use service layer
- ❌ Skip dependency injection - makes testing difficult

### Code Quality
- ❌ Skip tests or write code without tests
- ❌ Delete/modify tests to make them pass
- ❌ Create files over size limits
- ❌ Commit directly to main branch
- ❌ Mix business logic with HTTP handling

### Frontend
- ❌ Use localStorage/sessionStorage for sensitive data
- ❌ Mutate state directly
- ❌ Skip TypeScript interfaces
- ❌ Create components without proper prop types

### Security
- ❌ Display user content without sanitization
- ❌ Skip input validation
- ❌ Use eval() or similar unsafe functions
- ❌ Store API keys in frontend code

This updated guide reflects the modern architectural patterns actually used in the codebase and provides concrete examples for building maintainable, testable code.