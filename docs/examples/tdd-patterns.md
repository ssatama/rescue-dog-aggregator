# TDD Patterns - Modern Testing Practices

## TDD Process - THE FUNDAMENTAL PRACTICE

**CRITICAL**: TDD is not optional in this codebase. Every feature, every bug fix, every change MUST follow this process with modern architectural patterns.

### Core TDD Cycle

1. **RED**: Write a failing test first
2. **GREEN**: Write minimal code to make it pass
3. **REFACTOR**: Improve code while keeping tests green
4. **VERIFY**: Run full test suite to ensure no regressions

## Service Layer TDD (Current Architecture)

### Step 1: RED - Write Failing Test with Dependency Injection

```python
# tests/services/test_animal_service.py
import pytest
from unittest.mock import Mock, patch
from services.animal_service import AnimalService
from services.metrics_collector import NullMetricsCollector
from api.models.requests import AnimalFilterRequest

class TestAnimalService:
    """Test service layer with modern dependency injection patterns."""

    @pytest.fixture
    def mock_metrics(self):
        """Mock metrics collector for testing."""
        return Mock()

    @pytest.fixture
    def mock_database(self):
        """Mock database cursor for isolation."""
        return Mock()

    @pytest.fixture
    def animal_service(self, mock_database, mock_metrics):
        """Animal service with injected dependencies."""
        return AnimalService(
            cursor=mock_database,
            metrics_collector=mock_metrics
        )

    def test_get_animals_with_filters_returns_animals_with_images(self, animal_service, mock_metrics):
        """Test successful animal retrieval with batch image loading."""
        # Arrange
        filters = AnimalFilterRequest(breed="Golden Retriever", limit=2)
        expected_animals = [
            {"id": 1, "name": "Buddy", "breed": "Golden Retriever"},
            {"id": 2, "name": "Max", "breed": "Golden Retriever"}
        ]
        
        with patch.object(animal_service, '_get_filtered_animals') as mock_get:
            with patch.object(animal_service, '_batch_load_images') as mock_batch:
                mock_get.return_value = expected_animals
                
                # Act
                result = animal_service.get_animals_with_images(filters)
                
                # Assert
                assert result == expected_animals
                mock_metrics.increment.assert_any_call('animals.query.started')
                mock_metrics.increment.assert_any_call('animals.query.completed')
                mock_get.assert_called_once_with(filters)
                mock_batch.assert_called_once_with(expected_animals)

# Step 2: Run test - confirm it fails
# PYTHONPATH=. pytest tests/services/test_animal_service.py::TestAnimalService::test_get_animals_with_filters_returns_animals_with_images -v
# FAILED - AnimalService doesn't exist yet
```

### Step 2: GREEN - Minimal Service Implementation

```python
# services/animal_service.py
from typing import List, Dict, Any
from services.metrics_collector import MetricsCollector, NullMetricsCollector
from api.models.requests import AnimalFilterRequest

class AnimalService:
    """Service layer for animal operations with dependency injection."""
    
    def __init__(
        self,
        cursor,
        metrics_collector: MetricsCollector = None
    ):
        self.cursor = cursor
        # Null Object Pattern - no conditional checks needed
        self.metrics = metrics_collector or NullMetricsCollector()
    
    def get_animals_with_images(self, filters: AnimalFilterRequest) -> List[Dict[str, Any]]:
        """Fetch animals with their images using batch queries."""
        self.metrics.increment('animals.query.started')
        
        animals = self._get_filtered_animals(filters)
        self._batch_load_images(animals)
        
        self.metrics.increment('animals.query.completed')
        return animals

    def _get_filtered_animals(self, filters) -> List[Dict[str, Any]]:
        """Private method - focused responsibility."""
        # Minimal implementation to pass test
        return []

    def _batch_load_images(self, animals: List[Dict[str, Any]]) -> None:
        """Load all images in a single batch query."""
        # Minimal implementation to pass test
        pass

# Step 3: Run test - confirm it passes
# PYTHONPATH=. pytest tests/services/test_animal_service.py::TestAnimalService::test_get_animals_with_filters_returns_animals_with_images -v
# PASSED
```

### Step 3: REFACTOR - Add Real Implementation

```python
# services/animal_service.py (refactored)
from typing import List, Dict, Any, Optional
from services.metrics_collector import MetricsCollector, NullMetricsCollector
from api.models.requests import AnimalFilterRequest
from api.models.dog import AnimalWithImages

class AnimalService:
    """Service layer for animal operations with dependency injection."""
    
    def __init__(
        self,
        cursor,
        metrics_collector: MetricsCollector = None
    ):
        self.cursor = cursor
        self.metrics = metrics_collector or NullMetricsCollector()
    
    def get_animals_with_images(self, filters: AnimalFilterRequest) -> List[AnimalWithImages]:
        """Fetch animals with their images using batch queries."""
        self.metrics.increment('animals.query.started')
        
        try:
            animals = self._get_filtered_animals(filters)
            self._batch_load_images(animals)  # Eliminates N+1 queries
            
            self.metrics.increment('animals.query.completed')
            return animals
            
        except Exception as e:
            self.metrics.increment('animals.query.failed')
            raise

    def _get_filtered_animals(self, filters: AnimalFilterRequest) -> List[Dict[str, Any]]:
        """Execute filtered query with proper SQL construction."""
        query_parts = ["SELECT * FROM animals WHERE 1=1"]
        params = []
        
        if filters.breed:
            query_parts.append("AND standardized_breed = %s")
            params.append(filters.breed)
        
        if filters.availability_status:
            query_parts.append("AND availability_status = ANY(%s)")
            params.append(filters.availability_status)
        
        query_parts.append("ORDER BY created_at DESC LIMIT %s OFFSET %s")
        params.extend([filters.limit, filters.offset])
        
        self.cursor.execute(" ".join(query_parts), params)
        return self.cursor.fetchall()

    def _batch_load_images(self, animals: List[Dict[str, Any]]) -> None:
        """Load all images in a single batch query to prevent N+1."""
        if not animals:
            return
            
        animal_ids = [animal['id'] for animal in animals]
        
        self.cursor.execute("""
            SELECT animal_id, image_url, is_primary
            FROM animal_images
            WHERE animal_id = ANY(%s)
            ORDER BY animal_id, is_primary DESC, id ASC
        """, (animal_ids,))
        
        images_by_animal = {}
        for row in self.cursor.fetchall():
            animal_id = row['animal_id']
            if animal_id not in images_by_animal:
                images_by_animal[animal_id] = []
            images_by_animal[animal_id].append(row)
        
        # Attach images to animals
        for animal in animals:
            animal['images'] = images_by_animal.get(animal['id'], [])
```

## Modern Scraper TDD with Context Manager

### Step 1: RED - Test Context Manager Pattern

```python
# tests/scrapers/test_modern_scraper.py
import pytest
from unittest.mock import Mock, patch
from scrapers.pets_turkey.dogs_scraper import PetsTurkeyScraper

class TestModernScraper:
    """Test modern scraper patterns with context manager and dependency injection."""

    @pytest.fixture
    def mock_config(self):
        return {
            'id': 'pets-turkey',
            'name': 'Pets Turkey',
            'scraper': {
                'config': {
                    'rate_limit_delay': 1.0,
                    'max_retries': 2
                }
            }
        }

    def test_context_manager_handles_connection_lifecycle(self, mock_config):
        """Test that scraper works as context manager with proper setup/cleanup."""
        # Arrange
        with patch('scrapers.base_scraper.load_organization_config') as mock_load:
            mock_load.return_value = mock_config
            
            # Act & Assert - Context manager should handle setup/cleanup
            with PetsTurkeyScraper(config_id="pets-turkey") as scraper:
                assert scraper is not None
                assert scraper.config_id == "pets-turkey"
                # Scraper should be properly initialized and connected
                
            # Context manager should have cleaned up resources automatically

    def test_dependency_injection_for_testing(self):
        """Test that services can be injected for testing purposes."""
        # Arrange
        mock_metrics = Mock()
        mock_session = Mock()
        
        # Act
        scraper = PetsTurkeyScraper(
            config_id="pets-turkey",
            metrics_collector=mock_metrics,
            session_manager=mock_session
        )
        
        # Assert
        assert scraper.metrics_collector == mock_metrics
        assert scraper.session_manager == mock_session

# Step 2: Run test - confirm it fails
# PYTHONPATH=. pytest tests/scrapers/test_modern_scraper.py -v
# FAILED - PetsTurkeyScraper doesn't support context manager
```

### Step 2: GREEN - Implement Context Manager Support

```python
# scrapers/pets_turkey/dogs_scraper.py
from scrapers.base_scraper import BaseScraper
from services.metrics_collector import MetricsCollector
from typing import List, Dict, Any

class PetsTurkeyScraper(BaseScraper):
    """Modern scraper implementing architectural patterns."""
    
    def __init__(
        self, 
        config_id: str = "pets-turkey",
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

    def collect_data(self) -> List[Dict[str, Any]]:
        """Template method implementation - only focus on data extraction."""
        # Context manager and lifecycle handled by parent
        # Metrics collection automatic via null object pattern
        
        dog_cards = self._get_dog_cards()
        return [self._extract_dog_data(card) for card in dog_cards]

    def _get_dog_cards(self) -> List[Any]:
        """Extract dog card elements from scraped content."""
        # Minimal implementation to pass test
        return []

    def _extract_dog_data(self, card_element) -> Dict[str, Any]:
        """Extract structured data from a single dog card."""
        # Minimal implementation to pass test
        return {
            'name': 'Test Dog',
            'external_id': 'test-123'
        }

# Step 3: Run test - confirm it passes
# PYTHONPATH=. pytest tests/scrapers/test_modern_scraper.py -v
# PASSED
```

## Frontend TDD with TypeScript

### Step 1: RED - Component Test with TypeScript

```typescript
// frontend/src/components/dogs/__tests__/DogCard.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { DogCard } from '../DogCard';
import { AnimalWithImages } from '@/types/api';

// Mock data factory for type safety
const createMockAnimal = (overrides: Partial<AnimalWithImages> = {}): AnimalWithImages => ({
  id: 1,
  slug: 'buddy-golden-retriever-123',
  name: 'Buddy',
  breed: 'Golden Retriever',
  standardized_breed: 'Golden Retriever',
  age_text: '2 years',
  age_min_months: 24,
  primary_image_url: 'https://example.com/buddy.jpg',
  availability_status: 'available',
  availability_confidence: 'high',
  organization: {
    id: 1,
    slug: 'pets-turkey',
    name: 'Pets Turkey',
    country: 'TR',
    active: true
  },
  images: [],
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('DogCard', () => {
  const mockOnFavorite = vi.fn();
  const mockOnView = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dog information correctly with type safety', () => {
    // Arrange
    const animal = createMockAnimal({
      name: 'Buddy',
      breed: 'Golden Retriever',
      age_text: '2 years old'
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

  it('calls onView with slug when card is clicked', async () => {
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

    // Assert
    await waitFor(() => {
      expect(mockOnView).toHaveBeenCalledWith('buddy-golden-retriever-123');
    });
  });

// Step 2: Run test - confirm it fails
// npm test DogCard
// FAILED - DogCard component doesn't exist
```

### Step 2: GREEN - Minimal Component Implementation

```typescript
// frontend/src/components/dogs/DogCard.tsx
'use client';

import { useState } from 'react';
import { AnimalWithImages } from '@/types/api';

interface DogCardProps {
  animal: AnimalWithImages;
  onFavorite: (id: number) => void;
  onView: (slug: string) => void;
  showOrganization?: boolean;
}

export function DogCard({ 
  animal, 
  onFavorite, 
  onView, 
  showOrganization = false 
}: DogCardProps) {
  const [favorited, setFavorited] = useState(false);

  const handleCardClick = () => {
    onView(animal.slug);
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorited(prev => !prev);
    onFavorite(animal.id);
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
      <div className="dog-card__content">
        <h3 className="dog-card__name">{animal.name}</h3>
        
        {animal.breed && (
          <p className="dog-card__breed">{animal.breed}</p>
        )}
        
        {animal.age_text && (
          <p className="dog-card__age">{animal.age_text}</p>
        )}

        <button
          onClick={handleFavoriteClick}
          className="dog-card__favorite-btn"
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
        >
          {favorited ? '❤️' : '🤍'}
        </button>
      </div>
    </div>
  );
}

// Step 3: Run test - confirm it passes
// npm test DogCard
// PASSED
```

## Database Isolation Testing (Critical Pattern)

### Global Test Database Isolation

```python
# tests/conftest.py - Global database protection
import pytest
from unittest.mock import patch, MagicMock

@pytest.fixture(autouse=True)
def isolate_database_writes():
    """
    CRITICAL: Prevents ALL tests from writing to production database.
    
    This fixture runs automatically for EVERY test and mocks all database
    operations to prevent contamination of production data.
    """
    # Mock organization sync service
    with patch('management.config_commands.OrganizationSyncService') as mock_sync:
        mock_sync.return_value.sync_organization.return_value = True
        
        # Mock scraper service injection to prevent real DB connections
        with patch('scrapers.base_scraper.get_database_service'):
            with patch('scrapers.base_scraper.get_metrics_service'):
                with patch('scrapers.base_scraper.get_session_service'):
                    yield

# Example test using global isolation
class TestAnimalService:
    def test_service_creates_no_real_database_connections(self):
        """Test that service layer doesn't create real DB connections in tests."""
        # This test runs with automatic database isolation
        # No real database calls can be made
        service = AnimalService(mock_cursor)
        result = service.get_animals_with_images(filters)
        
        # All database operations are automatically mocked
        assert result is not None
```

## 🔧 Common TDD Tasks with Modern Architecture

### Adding a New API Endpoint with Service Layer

1. **RED - Write failing API test first**

   ```python
   # tests/api/test_new_endpoint.py
   import pytest
   from fastapi.testclient import TestClient
   from api.main import app

   client = TestClient(app)

   class TestNewEndpoint:
       def test_get_animal_statistics_returns_counts_by_organization(self):
           """Test new endpoint returns aggregated statistics."""
           # Act
           response = client.get("/api/animals/statistics")
           
           # Assert
           assert response.status_code == 200
           data = response.json()
           assert "total_animals" in data
           assert "by_organization" in data
           assert isinstance(data["total_animals"], int)
           
   # Step 2: Run test - confirm it fails
   # PYTHONPATH=. pytest tests/api/test_new_endpoint.py -v
   # FAILED - endpoint doesn't exist
   ```

2. **GREEN - Minimal endpoint implementation**

   ```python
   # api/routes/animals.py (add to existing router)
   @router.get("/statistics", summary="Get aggregated statistics")
   async def get_statistics(cursor: RealDictCursor = Depends(get_db_cursor)):
       """Get aggregated statistics about available dogs and organizations."""
       try:
           animal_service = AnimalService(cursor)
           return animal_service.get_statistics()
       except Exception as e:
           logger.exception(f"Unexpected error in get_statistics: {e}")
           raise APIException(status_code=500, detail="Failed to fetch statistics")

   # Add method to AnimalService
   def get_statistics(self) -> Dict[str, Any]:
       """Get aggregated statistics - minimal implementation."""
       return {
           "total_animals": 0,
           "by_organization": {}
       }
   
   # Step 3: Run test - confirm it passes
   # PYTHONPATH=. pytest tests/api/test_new_endpoint.py -v
   # PASSED
   ```

3. **REFACTOR - Add real implementation with metrics**

   ```python
   # api/services.py (in AnimalService)
   def get_statistics(self) -> Dict[str, Any]:
       """Get comprehensive animal statistics with metrics tracking."""
       self.metrics.increment('statistics.query.started')
       
       try:
           # Total animals query
           self.cursor.execute("""
               SELECT COUNT(*) as total,
                      COUNT(CASE WHEN availability_status = 'available' THEN 1 END) as available
               FROM animals
           """)
           totals = self.cursor.fetchone()
           
           # By organization query
           self.cursor.execute("""
               SELECT o.name, o.slug, COUNT(a.id) as animal_count
               FROM organizations o
               LEFT JOIN animals a ON o.id = a.organization_id 
                   AND a.availability_status = 'available'
               WHERE o.active = TRUE
               GROUP BY o.id, o.name, o.slug
               ORDER BY animal_count DESC
           """)
           by_org = self.cursor.fetchall()
           
           result = {
               "total_animals": totals["total"],
               "available_animals": totals["available"],
               "by_organization": [
                   {
                       "name": row["name"],
                       "slug": row["slug"],
                       "animal_count": row["animal_count"]
                   }
                   for row in by_org
               ]
           }
           
           self.metrics.increment('statistics.query.completed')
           return result
           
       except Exception as e:
           self.metrics.increment('statistics.query.failed')
           raise
   ```

### Adding a New Scraper with Modern Patterns

1. **Configuration-driven approach (TDD for configs!)**

   ```yaml
   # configs/organizations/new-rescue.yaml
   schema_version: "1.1"
   id: "new-rescue"
   name: "New Rescue Organization"
   enabled: true

   scraper:
     class_name: "NewRescueScraper"
     module: "scrapers.new_rescue.dogs_scraper"
     config:
       rate_limit_delay: 2.0
       max_retries: 3
       timeout: 30

   metadata:
     website_url: "https://newrescue.org"
     location:
       country: "US"
       city: "Portland"
   ```

2. **RED - Write failing scraper tests**

   ```python
   # tests/scrapers/test_new_rescue_scraper.py
   import pytest
   from unittest.mock import Mock, patch
   from scrapers.new_rescue.dogs_scraper import NewRescueScraper

   class TestNewRescueScraper:
       @pytest.fixture
       def mock_config(self):
           return {
               'id': 'new-rescue',
               'name': 'New Rescue Organization',
               'scraper': {
                   'config': {
                       'rate_limit_delay': 2.0,
                       'max_retries': 3
                   }
               }
           }

       def test_collect_data_returns_structured_animal_data(self, mock_config):
           """Test that scraper extracts structured data from HTML."""
           # Arrange
           with patch('scrapers.base_scraper.load_organization_config') as mock_load:
               mock_load.return_value = mock_config
               
               with NewRescueScraper(config_id="new-rescue") as scraper:
                   # Mock the page content
                   scraper.page_content = """
                   <div class="dog-card">
                       <h3>Buddy</h3>
                       <span class="breed">Golden Retriever</span>
                       <span class="age">2 years</span>
                   </div>
                   """
                   
                   # Act
                   result = scraper.collect_data()
                   
                   # Assert
                   assert len(result) == 1
                   assert result[0]['name'] == 'Buddy'
                   assert result[0]['breed'] == 'Golden Retriever'
                   assert result[0]['age_text'] == '2 years'

   # Step 2: Run test - confirm it fails
   # PYTHONPATH=. pytest tests/scrapers/test_new_rescue_scraper.py -v
   # FAILED - NewRescueScraper doesn't exist
   ```

3. **GREEN - Implement minimal scraper**

   ```python
   # scrapers/new_rescue/dogs_scraper.py
   from scrapers.base_scraper import BaseScraper
   from bs4 import BeautifulSoup
   from typing import List, Dict, Any

   class NewRescueScraper(BaseScraper):
       """Modern scraper for New Rescue Organization."""
       
       def collect_data(self) -> List[Dict[str, Any]]:
           """Extract dog data using template method pattern."""
           dog_cards = self._get_dog_cards()
           return [self._extract_dog_data(card) for card in dog_cards]

       def _get_dog_cards(self) -> List[Any]:
           """Extract dog card elements from page content."""
           soup = BeautifulSoup(self.page_content, 'html.parser')
           return soup.find_all('div', class_='dog-card')

       def _extract_dog_data(self, card_element) -> Dict[str, Any]:
           """Extract structured data from individual dog card."""
           return {
               'name': self._safe_extract_text(card_element, 'h3'),
               'breed': self._safe_extract_text(card_element, '.breed'),  
               'age_text': self._safe_extract_text(card_element, '.age'),
               'external_id': self._generate_external_id(card_element)
           }

   # Step 3: Run test - confirm it passes
   # PYTHONPATH=. pytest tests/scrapers/test_new_rescue_scraper.py -v  
   # PASSED
   ```

4. **Sync configuration to database**

   ```bash
   # Step 4: Register new scraper
   python management/config_commands.py sync
   
   # Step 5: Verify all tests still pass
   PYTHONPATH=. pytest tests/ -m "not browser and not requires_migrations" -v
   
   # Step 6: Test the scraper works end-to-end
   python management/config_commands.py run new-rescue
   ```

### Adding New Frontend Feature with Hooks

1. **RED - Test custom hook behavior**

   ```typescript
   // frontend/src/hooks/__tests__/useAnimalSearch.test.ts
   import { renderHook, act, waitFor } from '@testing-library/react';
   import { vi } from 'vitest';
   import { useAnimalSearch } from '../useAnimalSearch';

   describe('useAnimalSearch', () => {
     beforeEach(() => {
       vi.clearAllMocks();
     });

     it('debounces search queries and returns filtered results', async () => {
       // Arrange
       const mockAnimals = [
         { id: 1, name: 'Buddy', breed: 'Golden Retriever' },
         { id: 2, name: 'Max', breed: 'German Shepherd' }
       ];
       
       // Mock the API
       global.fetch = vi.fn().mockResolvedValue({
         ok: true,
         json: () => Promise.resolve(mockAnimals)
       });

       // Act
       const { result } = renderHook(() => useAnimalSearch());
       
       act(() => {
         result.current.setSearchTerm('Golden');
       });

       // Assert
       await waitFor(() => {
         expect(result.current.filteredAnimals).toHaveLength(1);
         expect(result.current.filteredAnimals[0].breed).toBe('Golden Retriever');
       });
     });

   // Step 2: Run test - confirm it fails  
   // npm test useAnimalSearch
   // FAILED - hook doesn't exist
   ```

2. **GREEN - Implement minimal hook**

   ```typescript
   // frontend/src/hooks/useAnimalSearch.ts
   import { useState, useEffect, useMemo } from 'react';
   import { useDebounce } from './useDebounce';
   import { AnimalWithImages } from '@/types/api';

   interface UseAnimalSearchReturn {
     searchTerm: string;
     setSearchTerm: (term: string) => void;
     filteredAnimals: AnimalWithImages[];
     loading: boolean;
     error: Error | null;
   }

   export function useAnimalSearch(): UseAnimalSearchReturn {
     const [searchTerm, setSearchTerm] = useState('');
     const [animals, setAnimals] = useState<AnimalWithImages[]>([]);
     const [loading, setLoading] = useState(false);
     const [error, setError] = useState<Error | null>(null);
     
     const debouncedSearchTerm = useDebounce(searchTerm, 300);

     // Fetch animals when debounced term changes
     useEffect(() => {
       const fetchAnimals = async () => {
         if (!debouncedSearchTerm) {
           setAnimals([]);
           return;
         }

         try {
           setLoading(true);
           setError(null);
           
           const response = await fetch(`/api/animals?search=${debouncedSearchTerm}`);
           if (!response.ok) throw new Error('Search failed');
           
           const data = await response.json();
           setAnimals(data);
           
         } catch (err) {
           setError(err instanceof Error ? err : new Error('Unknown error'));
         } finally {
           setLoading(false);
         }
       };

       fetchAnimals();
     }, [debouncedSearchTerm]);

     const filteredAnimals = useMemo(() => {
       return animals.filter(animal => 
         animal.breed?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         animal.name.toLowerCase().includes(searchTerm.toLowerCase())
       );
     }, [animals, searchTerm]);

     return {
       searchTerm,
       setSearchTerm,
       filteredAnimals,
       loading,
       error
     };
   }

   // Step 3: Run test - confirm it passes
   // npm test useAnimalSearch  
   // PASSED
   ```

## Modern Refactoring Guidelines

### When to Refactor with Current Architecture

- **Always assess after green**: Once tests pass, evaluate if refactoring adds architectural value
- **Extract service methods**: When business logic appears in routes or multiple places
- **Apply null object pattern**: When you see conditional checks for optional services
- **Implement dependency injection**: When testing becomes difficult due to hard dependencies
- **Extract to configuration**: When you see hard-coded organization-specific values

### Service Layer Refactoring Example

**BEFORE - Business logic in route handler:**

```python
# api/routes/animals.py - BEFORE refactoring
@router.get("/", response_model=List[AnimalWithImages])
async def get_animals(
    filters: AnimalFilterRequest = Depends(),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get animals - business logic mixed with HTTP handling."""
    try:
        # Business logic directly in route - hard to test
        query_parts = ["SELECT * FROM animals WHERE 1=1"]
        params = []
        
        if filters.breed:
            query_parts.append("AND standardized_breed = %s")
            params.append(filters.breed)
            
        query_parts.append("ORDER BY created_at DESC LIMIT %s OFFSET %s")
        params.extend([filters.limit, filters.offset])
        
        cursor.execute(" ".join(query_parts), params)
        animals = cursor.fetchall()
        
        # Image loading logic also in route
        for animal in animals:
            cursor.execute("""
                SELECT image_url, is_primary FROM animal_images 
                WHERE animal_id = %s ORDER BY is_primary DESC
            """, (animal['id'],))
            animal['images'] = cursor.fetchall()
            
        return animals
        
    except Exception as e:
        logger.exception(f"Error in get_animals: {e}")
        raise APIException(status_code=500, detail="Failed to fetch animals")
```

**AFTER - Extracted to service layer with dependency injection:**

```python
# api/routes/animals.py - AFTER refactoring
@router.get("/", response_model=List[AnimalWithImages])
async def get_animals(
    filters: AnimalFilterRequest = Depends(),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get all animals - clean separation of concerns."""
    try:
        animal_service = AnimalService(cursor)  # Dependency injection
        return animal_service.get_animals_with_images(filters)
        
    except ValidationError as ve:
        handle_validation_error(ve, "get_animals")
    except APIException:
        raise  # Re-raise service layer exceptions
    except Exception as e:
        logger.exception(f"Unexpected error in get_animals: {e}")
        raise APIException(status_code=500, detail="Internal server error")

# services/animal_service.py - Business logic extracted
class AnimalService:
    def __init__(self, cursor, metrics_collector: MetricsCollector = None):
        self.cursor = cursor
        self.metrics = metrics_collector or NullMetricsCollector()  # Null object pattern
    
    def get_animals_with_images(self, filters: AnimalFilterRequest) -> List[AnimalWithImages]:
        """Fetch animals with batch image loading - testable business logic."""
        self.metrics.increment('animals.query.started')
        
        animals = self._get_filtered_animals(filters)
        self._batch_load_images(animals)  # Eliminates N+1 query problem
        
        self.metrics.increment('animals.query.completed')
        return animals
```

### Null Object Pattern Refactoring

**BEFORE - Conditional checks everywhere:**

```python
class BaseScraper:
    def __init__(self, config_id: str, metrics_collector=None, session_manager=None):
        self.config_id = config_id
        self.metrics_collector = metrics_collector
        self.session_manager = session_manager
    
    def run(self):
        # Conditional checks throughout the code
        if self.metrics_collector:
            self.metrics_collector.increment('scraper.started')
            
        try:
            animals = self.collect_data()
            self.save_animals(animals)
            
            if self.metrics_collector:
                self.metrics_collector.increment('scraper.completed')
                
        except Exception as e:
            if self.metrics_collector:
                self.metrics_collector.increment('scraper.failed')
            raise
```

**AFTER - Null object pattern eliminates conditionals:**

```python
class BaseScraper:
    def __init__(
        self, 
        config_id: str, 
        metrics_collector: MetricsCollector = None,
        session_manager: SessionManager = None
    ):
        self.config_id = config_id
        # Null Object Pattern - no conditional checks needed anywhere
        self.metrics = metrics_collector or NullMetricsCollector()
        self.session = session_manager or NullSessionManager()
    
    def run(self):
        # Clean code - no conditionals, always safe to call
        self.metrics.increment('scraper.started')
        
        try:
            animals = self.collect_data()
            self.save_animals(animals)
            
            self.metrics.increment('scraper.completed')
            
        except Exception as e:
            self.metrics.increment('scraper.failed')
            raise

# services/null_objects.py
class NullMetricsCollector(MetricsCollector):
    """No-op implementation for metrics collection."""
    
    def increment(self, metric_name: str) -> None:
        pass  # Do nothing
        
    def gauge(self, metric_name: str, value: float) -> None:
        pass  # Do nothing
```

### Configuration-Driven Refactoring

**BEFORE - Hard-coded organization logic:**

```python
class PetsTurkeyScraper(BaseScraper):
    def __init__(self):
        self.base_url = "https://petsinturkey.org"  # Hard-coded
        self.rate_limit = 2.0  # Hard-coded
        self.max_retries = 3  # Hard-coded
        
    def get_organization_info(self):
        return {
            'name': 'Pets Turkey',  # Hard-coded
            'country': 'TR',  # Hard-coded
            'website': 'https://petsinturkey.org'  # Hard-coded
        }
```

**AFTER - Configuration-driven approach:**

```python
# configs/organizations/pets-turkey.yaml
schema_version: "1.1"
id: "pets-turkey"
name: "Pets Turkey"

scraper:
  config:
    base_url: "https://petsinturkey.org"
    rate_limit_delay: 2.0
    max_retries: 3

metadata:
  website_url: "https://petsinturkey.org"
  location:
    country: "TR"
    country_name: "Turkey"

# scrapers/pets_turkey/dogs_scraper.py
class PetsTurkeyScraper(BaseScraper):
    def __init__(self, config_id: str = "pets-turkey"):
        super().__init__(config_id=config_id)  # Configuration-driven
        # All organization-specific data comes from YAML config
        
    def get_organization_info(self):
        # Data comes from configuration, not hard-coded
        return {
            'name': self.config['name'],
            'country': self.config['metadata']['location']['country'],
            'website': self.config['metadata']['website_url']
        }
```

### Understanding DRY in Modern Architecture - Knowledge vs Code

DRY (Don't Repeat Yourself) is about not duplicating **knowledge** in the system, not about eliminating all code that looks similar.

```python
# NOT a DRY violation - different knowledge despite similar code
def standardize_breed(breed_text: str) -> Optional[str]:
    """Standardize dog breed names - domain-specific logic."""
    if not breed_text:
        return None
    normalized = breed_text.strip().lower()
    breed_mappings = {
        'golden ret': 'Golden Retriever',
        'german shep': 'German Shepherd'
    }
    return breed_mappings.get(normalized, breed_text.title())

def standardize_size(size_text: str) -> Optional[str]:
    """Standardize dog size categories - different domain logic."""
    if not size_text:
        return None
    normalized = size_text.strip().lower()
    size_mappings = {
        'lg': 'large',
        'med': 'medium',
        'sm': 'small'
    }
    return size_mappings.get(normalized, normalized)

# These look similar but represent different business rules that will
# evolve independently. Don't abstract them!

# This IS a DRY violation - same knowledge in multiple places
# BAD - Same age categorization logic duplicated
class AnimalService:
    def get_age_category(self, age_months: int) -> str:
        if age_months < 12:
            return 'puppy'
        elif age_months < 36:
            return 'young'
        elif age_months < 96:
            return 'adult'
        else:
            return 'senior'

class AnimalFilterService:
    def filter_by_age_category(self, animals: List[Dict], category: str) -> List[Dict]:
        # DUPLICATE KNOWLEDGE - same age ranges
        if category == 'puppy':
            return [a for a in animals if a['age_months'] < 12]
        elif category == 'young':
            return [a for a in animals if 12 <= a['age_months'] < 36]
        # ... same logic repeated

# GOOD - Knowledge centralized in one place
# utils/age_standardization.py
AGE_CATEGORIES = {
    'puppy': (0, 12),
    'young': (12, 36),
    'adult': (36, 96),
    'senior': (96, float('inf'))
}

def get_age_category(age_months: int) -> str:
    """Central age categorization logic."""
    for category, (min_age, max_age) in AGE_CATEGORIES.items():
        if min_age <= age_months < max_age:
            return category
    return 'unknown'

def filter_animals_by_age_category(animals: List[Dict], category: str) -> List[Dict]:
    """Filter using centralized age logic."""
    min_age, max_age = AGE_CATEGORIES.get(category, (0, float('inf')))
    return [
        animal for animal in animals 
        if min_age <= animal['age_months'] < max_age
    ]
```

## Essential TDD Commands (Current Codebase)

```bash
# Backend Testing
PYTHONPATH=. pytest tests/ -m "not browser and not requires_migrations" -v  # CI pipeline
PYTHONPATH=. pytest tests/ -m "unit or fast" -v  # Fast development feedback
PYTHONPATH=. pytest tests/services/ -v  # Test service layer
PYTHONPATH=. pytest tests/api/ -v  # Test API endpoints

# Frontend Testing  
cd frontend
npm test  # All tests
npm test -- --watch  # Watch mode for development
npm test DogCard  # Specific component
npm run build  # Verify TypeScript compilation

# Configuration Management
python management/config_commands.py list  # List all organizations
python management/config_commands.py sync  # Sync configs to database
python management/config_commands.py run pets-turkey  # Test specific scraper

# Database Testing
TESTING=true python database/db_setup.py  # Test database setup
DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -c "SELECT COUNT(*) FROM animals;"
```

## Red-Green-Refactor Checklist

### ✅ RED Phase
- [ ] Write failing test first
- [ ] Test describes desired behavior, not implementation
- [ ] Run test to confirm it fails for the right reason
- [ ] Test uses proper mocking/fixtures to isolate dependencies

### ✅ GREEN Phase  
- [ ] Write minimal code to make test pass
- [ ] Don't add features not covered by tests
- [ ] Run test to confirm it passes
- [ ] All existing tests still pass

### ✅ REFACTOR Phase
- [ ] Extract service methods if business logic appears in routes
- [ ] Apply null object pattern for optional dependencies
- [ ] Use dependency injection for testability  
- [ ] Extract configuration for organization-specific logic
- [ ] Improve naming and structure without changing behavior
- [ ] All tests still pass after refactoring

This modern TDD approach ensures that our architectural patterns (service layer, dependency injection, null objects, configuration-driven design) are properly tested and maintainable.
