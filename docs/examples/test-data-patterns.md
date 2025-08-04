# Test Data Patterns - Modern Architecture

This guide reflects the actual test data patterns used in the current codebase with service layer architecture, dependency injection, and database isolation.

## Core Principles

- **Type-safe factories** with TypeScript interfaces for frontend
- **Database isolation** - all tests are automatically protected from production data
- **Service layer testing** with dependency injection patterns
- **Configuration-driven** test data matching real YAML configs
- **Realistic data** that matches current database schema

## Python Backend Patterns

### Modern Animal/Organization Factories

```python
# tests/fixtures/factories.py
from typing import Dict, Any, Optional, List
from datetime import datetime

def create_mock_animal(overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create mock animal data matching current database schema."""
    animal = {
        # Core identification
        "id": 1,
        "slug": "buddy-golden-retriever-123",
        "name": "Buddy",
        "external_id": "buddy-test-123",
        "organization_id": 1,
        
        # Breed information (current standardization)
        "breed": "Golden Retriever",
        "standardized_breed": "Golden Retriever", 
        "breed_group": "Sporting Dogs",
        
        # Age information (multi-format support)
        "age_text": "2 years old",
        "age_min_months": 24,
        "age_max_months": 24,
        "age_category": "adult",
        
        # Physical attributes
        "sex": "male",
        "size": "large", 
        "standardized_size": "large",
        
        # Availability tracking (modern schema)
        "availability_status": "available",
        "availability_confidence": "high",
        "last_seen_at": datetime.utcnow().isoformat(),
        "consecutive_scrapes_missing": 0,
        
        # Images and content
        "primary_image_url": "https://example.com/buddy.jpg",
        "adoption_url": "https://test-rescue.org/adopt/buddy",
        "properties": {
            "description": "A friendly dog looking for a home",
            "good_with_kids": True,
            "good_with_dogs": True,
            "house_trained": True
        },
        
        # Metadata
        "language": "en",
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z",
        "last_scraped_at": "2024-01-01T00:00:00Z"
    }
    
    if overrides:
        animal.update(overrides)
    return animal

def create_mock_organization(overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create mock organization matching current schema."""
    organization = {
        # Core identification
        "id": 1,
        "slug": "test-rescue",
        "name": "Test Rescue Organization",
        "active": True,
        
        # Contact information
        "website_url": "https://test-rescue.org",
        "description": "A test rescue organization for development and testing",
        "country": "DE",
        "city": "Berlin",
        "logo_url": "https://example.com/logo.png",
        
        # Modern JSONB fields
        "social_media": {
            "website": "https://test-rescue.org",
            "facebook": "https://facebook.com/test-rescue",
            "instagram": "test_rescue"
        },
        
        # Service regions as JSONB array
        "service_regions": [
            {
                "country_code": "DE",
                "country_name": "Germany", 
                "regions": ["Berlin", "Hamburg", "Munich"]
            }
        ],
        
        # Shipping destinations
        "ships_to": ["DE", "AT", "CH", "NL"],
        "established_year": 2010,
        
        # Timestamps
        "created_at": "2024-01-01T00:00:00Z",
        "updated_at": "2024-01-01T00:00:00Z"
    }
    
    if overrides:
        organization.update(overrides)
    return organization

# Usage in modern service layer tests
class TestAnimalService:
    def test_get_animals_with_filters_returns_structured_data(self):
        """Test service layer with realistic data."""
        # Arrange
        animals = [
            create_mock_animal({"breed": "Golden Retriever", "age_months": 24}),
            create_mock_animal({
                "id": 2,
                "name": "Max", 
                "breed": "German Shepherd",
                "age_months": 36,
                "slug": "max-german-shepherd-456"
            })
        ]
        
        mock_cursor = Mock()
        mock_cursor.fetchall.return_value = animals
        
        animal_service = AnimalService(mock_cursor)
        filters = AnimalFilterRequest(breed="Golden Retriever")
        
        # Act
        result = animal_service.get_animals_with_images(filters)
        
        # Assert
        assert len(result) == 2
        assert all('slug' in animal for animal in result)
        assert all('availability_status' in animal for animal in result)
```

### Service Layer Test Patterns

```python
# tests/services/test_animal_service.py
import pytest
from unittest.mock import Mock, patch
from services.animal_service import AnimalService
from api.models.requests import AnimalFilterRequest

class TestAnimalServiceWithDependencyInjection:
    """Modern service layer testing with proper isolation."""
    
    @pytest.fixture
    def mock_metrics_collector(self):
        """Mock metrics collector for testing."""
        return Mock()
    
    @pytest.fixture
    def mock_cursor(self):
        """Mock database cursor with realistic responses."""
        cursor = Mock()
        cursor.fetchall.return_value = [
            create_mock_animal(),
            create_mock_animal({"id": 2, "name": "Max"})
        ]
        return cursor
    
    @pytest.fixture
    def animal_service(self, mock_cursor, mock_metrics_collector):
        """Service with injected dependencies."""
        return AnimalService(
            cursor=mock_cursor,
            metrics_collector=mock_metrics_collector
        )
    
    def test_batch_image_loading_prevents_n_plus_one_queries(
        self, 
        animal_service, 
        mock_cursor,
        mock_metrics_collector
    ):
        """Test that batch loading is used for images."""
        # Arrange
        animals = [
            create_mock_animal({"id": 1}),
            create_mock_animal({"id": 2, "name": "Max"})
        ]
        
        # Mock the batch image query response
        mock_cursor.fetchall.side_effect = [
            animals,  # First call: get animals
            [  # Second call: batch load images
                {"animal_id": 1, "image_url": "img1.jpg", "is_primary": True},
                {"animal_id": 2, "image_url": "img2.jpg", "is_primary": True}
            ]
        ]
        
        filters = AnimalFilterRequest(limit=10)
        
        # Act
        result = animal_service.get_animals_with_images(filters)
        
        # Assert - Only 2 database calls should be made (no N+1)
        assert mock_cursor.execute.call_count == 2
        mock_metrics_collector.increment.assert_any_call('animals.query.started')
        mock_metrics_collector.increment.assert_any_call('animals.query.completed')

def create_mock_scraper_config(overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create mock scraper configuration matching YAML structure."""
    config = {
        "schema_version": "1.1",
        "id": "test-rescue",
        "name": "Test Rescue Organization",
        "enabled": True,
        
        "scraper": {
            "class_name": "TestRescueScraper",
            "module": "scrapers.test_rescue.dogs_scraper",
            "config": {
                "rate_limit_delay": 2.0,
                "max_retries": 3,
                "timeout": 30,
                "user_agent": "Mozilla/5.0 (compatible; RescueDogBot/1.0)"
            }
        },
        
        "metadata": {
            "website_url": "https://test-rescue.org",
            "description": "Test rescue for development",
            "location": {
                "country": "DE",
                "country_name": "Germany",
                "city": "Berlin"
            },
            "service_regions": [
                {
                    "country_code": "DE",
                    "country_name": "Germany",
                    "regions": ["Berlin", "Hamburg"]
                }
            ],
            "ships_to": ["DE", "AT", "CH"],
            "social_media": {
                "website": "https://test-rescue.org",
                "facebook": "https://facebook.com/test-rescue"
            }
        },
        
        "processing": {
            "image_processing": {
                "enabled": True,
                "cloudinary_folder": "test-rescue",
                "max_images_per_animal": 5
            },
            "data_validation": {
                "required_fields": ["name", "external_id"],
                "age_validation": True,
                "breed_standardization": True
            }
        }
    }
    
    if overrides:
        # Deep merge for nested dictionaries
        import copy
        result = copy.deepcopy(config)
        result.update(overrides)
        return result
    
    return config
```

### Database Isolation Testing (Critical Pattern)

```python
# tests/conftest.py - AUTOMATIC protection for ALL tests
import pytest
from unittest.mock import patch, Mock

@pytest.fixture(autouse=True)
def isolate_database_writes():
    """
    CRITICAL: This fixture runs automatically for EVERY test.
    It prevents ALL tests from writing to production database.
    """
    # Mock organization sync service
    with patch('management.config_commands.OrganizationSyncService') as mock_sync:
        mock_sync.return_value.sync_organization.return_value = True
        
        # Mock all database service injections
        with patch('scrapers.base_scraper.get_database_service'):
            with patch('scrapers.base_scraper.get_metrics_service'):
                with patch('scrapers.base_scraper.get_session_service'):
                    yield

# Example test automatically protected by global isolation
class TestScraperWithRealisticData:
    def test_scraper_processes_realistic_animal_data(self):
        """Test scraper with realistic data structures."""
        # This test is automatically isolated from production database
        scraper_config = create_mock_scraper_config({
            "id": "pets-turkey",
            "name": "Pets Turkey"
        })
        
        # Mock realistic HTML response
        html_content = """
        <div class="dog-card">
            <h3>Buddy</h3>
            <span class="breed">Golden Retriever</span>
            <span class="age">2 yaşında</span>
            <img src="buddy.jpg" alt="Buddy">
        </div>
        """
        
        with patch('scrapers.base_scraper.load_organization_config') as mock_load:
            mock_load.return_value = scraper_config
            
            scraper = TestScraper(config_id="pets-turkey")
            scraper.page_content = html_content
            
            # Act
            result = scraper.collect_data()
            
            # Assert - realistic data extraction
            assert len(result) == 1
            assert result[0]['name'] == 'Buddy'
            assert result[0]['breed'] == 'Golden Retriever'
            assert result[0]['age_text'] == '2 yaşında'
```

def create_mock_filter_counts_response(overrides: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """Create mock filter counts response for testing real-time filter UI."""
    response = {
        "breeds": [
            {"value": "Golden Retriever", "count": 15},
            {"value": "German Shepherd", "count": 12},
            {"value": "Labrador Mix", "count": 8}
        ],
        "sizes": [
            {"value": "large", "count": 25},
            {"value": "medium", "count": 18},
            {"value": "small", "count": 12}
        ],
        "organizations": [
            {"value": "pets-turkey", "name": "Pets Turkey", "count": 22},
            {"value": "test-rescue", "name": "Test Rescue", "count": 18}
        ],
        "age_categories": [
            {"value": "adult", "count": 30},
            {"value": "young", "count": 15},
            {"value": "puppy", "count": 8},
            {"value": "senior", "count": 5}
        ]
    }
    
    if overrides:
        response.update(overrides)
    return response

def create_test_scenario_with_availability_tracking(
    org_count: int = 2, 
    animals_per_org: int = 3
) -> Dict[str, Any]:
    """Create complete test scenario with availability tracking."""
    organizations = []
    animals = []
    
    for i in range(org_count):
        org = create_mock_organization({
            "id": i + 1,
            "slug": f"rescue-{i + 1}",
            "name": f"Rescue Organization {i + 1}"
        })
        organizations.append(org)
        
        for j in range(animals_per_org):
            # Create animals with different availability states
            availability_states = ["available", "adopted", "removed"]
            confidence_levels = ["high", "medium", "low"]
            
            animal = create_mock_animal({
                "id": i * 10 + j + 1,
                "organization_id": org["id"],
                "slug": f"animal-{i}-{j}-{org['slug']}",
                "name": f"Animal {j + 1} from {org['name']}",
                "external_id": f"ext-{i}-{j}",
                "availability_status": availability_states[j % len(availability_states)],
                "availability_confidence": confidence_levels[j % len(confidence_levels)],
                "consecutive_scrapes_missing": j  # Simulate different tracking states
            })
            animals.append(animal)
    
    return {
        "organizations": organizations,
        "animals": animals,
        "statistics": {
            "total_animals": len(animals),
            "available_animals": len([a for a in animals if a["availability_status"] == "available"]),
            "organizations_count": len(organizations)
        }
    }
```

## TypeScript Frontend Patterns (Next.js 15)

### Type-Safe Factory Functions

```typescript
// frontend/src/test-utils/factories.ts
import { AnimalWithImages, Organization, AnimalFilters } from '@/types/api';

// Type-safe animal factory matching current API structure
export const createMockAnimal = (overrides: Partial<AnimalWithImages> = {}): AnimalWithImages => ({
  // Core identification
  id: 1,
  slug: 'buddy-golden-retriever-123',
  name: 'Buddy',
  external_id: 'buddy-test-123',
  
  // Breed information (standardized)
  breed: 'Golden Retriever',
  standardized_breed: 'Golden Retriever',
  breed_group: 'Sporting Dogs',
  
  // Age information (multi-format)
  age_text: '2 years old',
  age_min_months: 24,
  age_max_months: 24,
  age_category: 'adult',
  
  // Physical attributes
  sex: 'male',
  size: 'large',
  standardized_size: 'large',
  
  // Availability tracking
  availability_status: 'available',
  availability_confidence: 'high',
  
  // Images and URLs
  primary_image_url: 'https://example.com/buddy.jpg',
  adoption_url: 'https://test-rescue.org/adopt/buddy',
  
  // Organization relationship
  organization: {
    id: 1,
    slug: 'test-rescue',
    name: 'Test Rescue',
    country: 'DE',
    active: true
  },
  
  // Images array
  images: [
    {
      id: 1,
      image_url: 'https://example.com/buddy1.jpg',
      is_primary: true
    },
    {
      id: 2,
      image_url: 'https://example.com/buddy2.jpg',
      is_primary: false
    }
  ],
  
  // Behavioral properties as JSONB
  properties: {
    good_with_kids: true,
    good_with_dogs: true,
    house_trained: true,
    description: 'A friendly dog looking for a home'
  },
  
  // Timestamps
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  last_scraped_at: '2024-01-01T00:00:00Z',
  
  ...overrides,
});

export const createMockOrganization = (overrides: Partial<Organization> = {}): Organization => ({
  id: 1,
  slug: 'test-rescue',
  name: 'Test Rescue Organization',
  
  // Contact information
  website_url: 'https://test-rescue.org',
  description: 'A test rescue organization for development',
  country: 'DE',
  city: 'Berlin',
  logo_url: 'https://example.com/logo.png',
  
  // Service information
  service_regions: [
    {
      country_code: 'DE',
      country_name: 'Germany',
      regions: ['Berlin', 'Hamburg', 'Munich']
    }
  ],
  ships_to: ['DE', 'AT', 'CH', 'NL'],
  established_year: 2010,
  
  // Status
  active: true,
  
  // Social media as JSONB
  social_media: {
    website: 'https://test-rescue.org',
    facebook: 'https://facebook.com/test-rescue',
    instagram: 'test_rescue'
  },
  
  // Timestamps
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  
  ...overrides,
});

// Usage in modern component tests
// frontend/src/components/dogs/__tests__/DogCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DogCard } from '../DogCard';
import { createMockAnimal } from '@/test-utils/factories';

describe('DogCard with TypeScript safety', () => {
  const mockOnFavorite = vi.fn();
  const mockOnView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders animal information with slug-based routing', () => {
    // Arrange - Type-safe factory with specific overrides
    const animal = createMockAnimal({
      name: 'Buddy',
      breed: 'Golden Retriever',
      age_text: '2 years old',
      slug: 'buddy-golden-retriever-123',
      availability_status: 'available',
      availability_confidence: 'high'
    });

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
    expect(screen.getByText('2 years old')).toBeInTheDocument();
  });

  it('calls onView with slug when clicked', async () => {
    // Arrange
    const animal = createMockAnimal({ 
      slug: 'buddy-golden-retriever-123' 
    });
    
    render(
      <DogCard 
        animal={animal} 
        onFavorite={mockOnFavorite} 
        onView={mockOnView} 
      />
    );

    // Act
    const card = screen.getByRole('button');
    fireEvent.click(card);

    // Assert - Slug-based routing
    await waitFor(() => {
      expect(mockOnView).toHaveBeenCalledWith('buddy-golden-retriever-123');
    });
  });
});
```

### Advanced TypeScript Patterns

```typescript
// frontend/src/test-utils/api-factories.ts
import { AnimalFilters, FilterCountsResponse, APIResponse } from '@/types/api';

export const createMockFilterCounts = (overrides: Partial<FilterCountsResponse> = {}): FilterCountsResponse => ({
  breeds: [
    { value: 'Golden Retriever', count: 15 },
    { value: 'German Shepherd', count: 12 },
    { value: 'Labrador Mix', count: 8 }
  ],
  sizes: [
    { value: 'large', count: 25 },
    { value: 'medium', count: 18 },
    { value: 'small', count: 12 }
  ],
  organizations: [
    { value: 'pets-turkey', name: 'Pets Turkey', count: 22 },
    { value: 'test-rescue', name: 'Test Rescue', count: 18 }
  ],
  age_categories: [
    { value: 'adult', count: 30 },
    { value: 'young', count: 15 },
    { value: 'puppy', count: 8 },
    { value: 'senior', count: 5 }
  ],
  ...overrides,
});

export const createMockAPIResponse = <T>(
  data: T, 
  overrides: Partial<APIResponse<T>> = {}
): APIResponse<T> => ({
  data,
  total: Array.isArray(data) ? data.length : 1,
  page: 1,
  per_page: 20,
  has_more: false,
  filters_applied: {},
  ...overrides,
});

export const createMockAnimalFilters = (overrides: Partial<AnimalFilters> = {}): AnimalFilters => ({
  search: '',
  breed: undefined,
  standardized_breed: undefined,
  breed_group: undefined,
  size: undefined,
  standardized_size: undefined,
  age_category: undefined,
  sex: undefined,
  organization: undefined,
  location_country: undefined,
  availability_status: ['available'],
  availability_confidence: ['high', 'medium'],
  limit: 20,
  offset: 0,
  sort: 'newest',
  ...overrides,
});

// Hook testing factory
export const createMockHookResponse = <T>(
  data: T,
  loading: boolean = false,
  error: Error | null = null
) => ({
  data,
  loading,
  error,
  refetch: vi.fn(),
  mutate: vi.fn(),
});

// Complex scenario for integration tests
export const createTestScenarioWithFiltering = (config: {
  animalCount?: number;
  organizationCount?: number;
  includeUnavailable?: boolean;
} = {}) => {
  const { animalCount = 6, organizationCount = 2, includeUnavailable = false } = config;
  
  const organizations = Array.from({ length: organizationCount }, (_, i) =>
    createMockOrganization({
      id: i + 1,
      slug: `rescue-${i + 1}`,
      name: `Rescue Organization ${i + 1}`,
      country: i === 0 ? 'DE' : 'AT',
    })
  );

  const animals = Array.from({ length: animalCount }, (_, i) => {
    const orgIndex = i % organizationCount;
    const org = organizations[orgIndex];
    
    return createMockAnimal({
      id: i + 1,
      slug: `animal-${i + 1}-${org.slug}`,
      name: `Animal ${i + 1}`,
      organization: org,
      breed: ['Golden Retriever', 'German Shepherd', 'Labrador Mix'][i % 3],
      standardized_size: ['small', 'medium', 'large'][i % 3],
      age_category: ['puppy', 'young', 'adult', 'senior'][i % 4],
      availability_status: includeUnavailable && i % 4 === 0 ? 'adopted' : 'available',
      availability_confidence: ['high', 'medium', 'low'][i % 3],
    });
  });

  return {
    organizations,
    animals,
    filterCounts: createMockFilterCounts({
      breeds: [
        { value: 'Golden Retriever', count: animals.filter(a => a.breed === 'Golden Retriever').length },
        { value: 'German Shepherd', count: animals.filter(a => a.breed === 'German Shepherd').length },
        { value: 'Labrador Mix', count: animals.filter(a => a.breed === 'Labrador Mix').length }
      ]
    })
  };
};
```

### Next.js 15 Testing Patterns

```typescript
// frontend/src/app/dogs/__tests__/page.test.tsx
import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import DogsPage from '../page';
import { createTestScenarioWithFiltering, createMockAnimalFilters } from '@/test-utils/factories';

// Mock Next.js 15 search params
const mockSearchParams = {
  breed: 'Golden Retriever',
  size: 'large',
  organization: 'pets-turkey'
};

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSearchParams),
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}));

describe('DogsPage with realistic data', () => {
  it('renders animals with SEO-friendly URLs', async () => {
    // Arrange
    const scenario = createTestScenarioWithFiltering({
      animalCount: 4,
      organizationCount: 2
    });
    
    // Mock API response
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: scenario.animals,
        total: scenario.animals.length,
        page: 1,
        per_page: 20
      })
    });

    // Act
    render(<DogsPage searchParams={mockSearchParams} />);

    // Assert - All animals should render with proper slugs
    await screen.findByText('Animal 1');
    expect(screen.getByText('Animal 2')).toBeInTheDocument();
    
    // Check slug-based links are present
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', expect.stringContaining('/dogs/animal-1-rescue-1'));
  });
});
```

## Best Practices

1. **Always use factories** - Never hardcode test data inline
2. **Keep defaults realistic** - Use valid, production-like data
3. **Make overrides explicit** - Pass only what needs to change
4. **Build incrementally** - Start simple, extract patterns as they emerge
5. **Share between test files** - Import from central test utilities

```python
# Python: tests/factories.py
from .dog_factory import get_mock_dog
from .org_factory import get_mock_organization
from .scenario_factory import create_test_scenario

# JavaScript: src/test-utils/factories.js
export { getMockDog } from './dogFactory';
export { getMockOrganization } from './orgFactory';
export { createTestScenario } from './scenarioFactory';
```
