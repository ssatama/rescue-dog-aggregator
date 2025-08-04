# Real-Time Filter Counts Implementation

This guide demonstrates the real-time filter counts system that shows dynamic counts like "Large (12)" and prevents dead-end filtering by hiding options with zero results.

## System Overview

The filter counts system provides instant feedback to users by:
- Showing available counts for each filter option
- Hiding filters that would return zero results
- Updating counts in real-time as filters change
- Optimizing database queries to prevent performance issues

## Backend Implementation

### API Endpoint Structure

```python
# api/routes/animals.py - Filter counts endpoint
@router.get("/meta/filter_counts", response_model=FilterCountsResponse)
async def get_filter_counts(
    filters: AnimalFilterCountRequest = Depends(),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """
    Get dynamic counts for each filter option based on current filter context.
    
    Only returns options that have at least one matching animal to prevent
    dead-end filtering scenarios. This endpoint enables the frontend to show
    real-time filter counts like "Large (12)" and hide options with 0 results.
    """
    try:
        animal_service = AnimalService(cursor)
        return animal_service.get_filter_counts(filters)
    except ValidationError as ve:
        handle_validation_error(ve, "get_filter_counts")
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_filter_counts")
    except Exception as e:
        logger.exception(f"Unexpected error in get_filter_counts: {e}")
        raise APIException(status_code=500, detail="Failed to fetch filter counts")
```

### Request/Response Models

```python
# api/models/requests.py
class AnimalFilterCountRequest(BaseModel):
    """Filter parameters for getting counts - subset of main filters."""
    
    # Text search
    search: Optional[str] = None
    
    # Breed filters (mutually exclusive in UI)
    breed: Optional[str] = None
    standardized_breed: Optional[str] = None
    breed_group: Optional[str] = None
    
    # Size filters (mutually exclusive in UI)
    size: Optional[str] = None
    standardized_size: Optional[str] = None
    
    # Other categorical filters
    age_category: Optional[str] = None
    sex: Optional[str] = None
    organization: Optional[str] = None
    
    # Location filters
    location_country: Optional[str] = None
    available_to_country: Optional[str] = None
    available_to_region: Optional[str] = None
    
    # Availability filters
    availability_status: List[str] = Field(default=["available"])
    availability_confidence: List[str] = Field(default=["high", "medium"])

# api/models/responses.py  
class FilterOption(BaseModel):
    """Individual filter option with count."""
    value: str
    count: int
    name: Optional[str] = None  # For display name (organizations)

class FilterCountsResponse(BaseModel):
    """Response containing all filter counts."""
    breeds: List[FilterOption]
    sizes: List[FilterOption]
    organizations: List[FilterOption]
    age_categories: List[FilterOption]
    countries: List[FilterOption]
    
    # Metadata for UI optimization
    total_matching_animals: int
    filters_applied_count: int
```

### Service Layer Implementation

```python
# api/services/animal_service.py
class AnimalService:
    def get_filter_counts(self, filters: AnimalFilterCountRequest) -> FilterCountsResponse:
        """Get dynamic filter counts based on current filter context."""
        try:
            # Build base WHERE clause from current filters
            base_conditions, base_params = self._build_filter_conditions(filters)
            
            # Get counts for each filter type in parallel
            breed_counts = self._get_breed_counts(base_conditions, base_params, filters)
            size_counts = self._get_size_counts(base_conditions, base_params, filters)
            org_counts = self._get_organization_counts(base_conditions, base_params, filters)
            age_counts = self._get_age_category_counts(base_conditions, base_params, filters)
            country_counts = self._get_country_counts(base_conditions, base_params, filters)
            
            # Get total count for metadata
            total_count = self._get_total_matching_count(base_conditions, base_params)
            
            return FilterCountsResponse(
                breeds=breed_counts,
                sizes=size_counts,
                organizations=org_counts,
                age_categories=age_counts,
                countries=country_counts,
                total_matching_animals=total_count,
                filters_applied_count=self._count_applied_filters(filters)
            )
            
        except Exception as e:
            logger.exception(f"Error getting filter counts: {e}")
            raise APIException(status_code=500, detail="Failed to calculate filter counts")
    
    def _get_breed_counts(self, base_conditions: str, base_params: List, 
                         current_filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get breed counts excluding current breed filter."""
        # Remove breed filter from conditions to get all breed options
        conditions_without_breed = self._remove_breed_from_conditions(base_conditions, current_filters)
        
        query = f"""
            SELECT standardized_breed as value, COUNT(*) as count
            FROM animals a
            JOIN organizations o ON a.organization_id = o.id
            WHERE {conditions_without_breed}
              AND standardized_breed IS NOT NULL 
              AND standardized_breed != ''
            GROUP BY standardized_breed
            HAVING COUNT(*) > 0
            ORDER BY count DESC, standardized_breed ASC
            LIMIT 50
        """
        
        params_without_breed = self._remove_breed_from_params(base_params, current_filters)
        self.cursor.execute(query, params_without_breed)
        
        results = self.cursor.fetchall()
        return [FilterOption(value=row['value'], count=row['count']) for row in results]
    
    def _get_organization_counts(self, base_conditions: str, base_params: List,
                               current_filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get organization counts with display names."""
        conditions_without_org = self._remove_organization_from_conditions(base_conditions, current_filters)
        
        query = f"""
            SELECT o.slug as value, o.name, COUNT(*) as count
            FROM animals a
            JOIN organizations o ON a.organization_id = o.id
            WHERE {conditions_without_org}
              AND o.active = TRUE
            GROUP BY o.slug, o.name
            HAVING COUNT(*) > 0
            ORDER BY count DESC, o.name ASC
        """
        
        params_without_org = self._remove_organization_from_params(base_params, current_filters)
        self.cursor.execute(query, params_without_org)
        
        results = self.cursor.fetchall()
        return [
            FilterOption(
                value=row['value'], 
                count=row['count'],
                name=row['name']
            ) for row in results
        ]
    
    def _build_filter_conditions(self, filters: AnimalFilterCountRequest) -> Tuple[str, List]:
        """Build WHERE clause conditions from filters."""
        conditions = ["a.availability_status = ANY(%s)"]
        params = [filters.availability_status]
        
        if filters.search:
            conditions.append("(a.name ILIKE %s OR a.breed ILIKE %s)")
            search_param = f"%{filters.search}%"
            params.extend([search_param, search_param])
        
        if filters.standardized_breed:
            conditions.append("a.standardized_breed = %s")
            params.append(filters.standardized_breed)
        
        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size)
        
        if filters.age_category:
            conditions.append("a.age_category = %s")
            params.append(filters.age_category)
        
        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)
        
        if filters.organization:
            conditions.append("o.slug = %s")
            params.append(filters.organization)
        
        if filters.location_country:
            conditions.append("o.country = %s")
            params.append(filters.location_country)
        
        # Always filter for active organizations
        conditions.append("o.active = TRUE")
        
        return " AND ".join(conditions), params
```

## Frontend Implementation

### Custom Hook for Filter Counts

```typescript
// frontend/src/hooks/useFilterCounts.ts
import { useState, useEffect, useCallback } from 'react';
import { AnimalFilters, FilterCountsResponse } from '@/types/api';
import { debounce } from '@/lib/utils';

interface UseFilterCountsReturn {
  filterCounts: FilterCountsResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFilterCounts(filters: AnimalFilters): UseFilterCountsReturn {
  const [filterCounts, setFilterCounts] = useState<FilterCountsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Debounced fetch to prevent excessive API calls
  const debouncedFetch = useCallback(
    debounce(async (currentFilters: AnimalFilters) => {
      try {
        setLoading(true);
        setError(null);
        
        const params = new URLSearchParams();
        
        // Only include non-empty filters in request
        if (currentFilters.search?.trim()) {
          params.set('search', currentFilters.search.trim());
        }
        
        if (currentFilters.breed) {
          params.set('standardized_breed', currentFilters.breed);
        }
        
        if (currentFilters.size) {
          params.set('standardized_size', currentFilters.size);
        }
        
        if (currentFilters.age_category) {
          params.set('age_category', currentFilters.age_category);
        }
        
        if (currentFilters.sex) {
          params.set('sex', currentFilters.sex);
        }
        
        if (currentFilters.organization) {
          params.set('organization', currentFilters.organization);
        }
        
        if (currentFilters.location_country) {
          params.set('location_country', currentFilters.location_country);
        }
        
        // Include availability filters
        if (currentFilters.availability_status?.length) {
          currentFilters.availability_status.forEach(status => {
            params.append('availability_status', status);
          });
        }
        
        const response = await fetch(
          `/api/animals/meta/filter_counts?${params.toString()}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );
        
        if (!response.ok) {
          throw new Error(`Failed to fetch filter counts: ${response.statusText}`);
        }
        
        const data = await response.json();
        setFilterCounts(data);
        
      } catch (err) {
        console.error('Error fetching filter counts:', err);
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }, 300), // 300ms debounce
    []
  );
  
  const refetch = useCallback(async () => {
    await debouncedFetch(filters);
  }, [filters, debouncedFetch]);
  
  useEffect(() => {
    debouncedFetch(filters);
  }, [filters, debouncedFetch]);
  
  return { filterCounts, loading, error, refetch };
}
```

### Filter Component with Real-Time Counts

```typescript
// frontend/src/components/filters/BreedFilter.tsx
import { useState } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';
import { AnimalFilters, FilterOption } from '@/types/api';

interface BreedFilterProps {
  filters: AnimalFilters;
  onFilterChange: (newFilters: Partial<AnimalFilters>) => void;
  breedOptions: FilterOption[];
  loading?: boolean;
  className?: string;
}

export function BreedFilter({ 
  filters, 
  onFilterChange, 
  breedOptions, 
  loading,
  className = '' 
}: BreedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter breed options based on search term
  const filteredBreeds = breedOptions.filter(breed =>
    breed.value.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const handleBreedSelect = (breedValue: string) => {
    // Clear breed filter if same breed selected, otherwise set new breed
    const newBreed = filters.breed === breedValue ? undefined : breedValue;
    
    onFilterChange({ 
      breed: newBreed,
      // Reset pagination when filter changes
      offset: 0 
    });
    
    setIsOpen(false);
    setSearchTerm('');
  };
  
  const selectedBreed = breedOptions.find(b => b.value === filters.breed);
  
  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
          ${filters.breed ? 'border-blue-500 bg-blue-50' : ''}
        `}
        disabled={loading}
      >
        <div className="flex items-center justify-between">
          <span className="block truncate">
            {selectedBreed ? (
              <span className="flex items-center justify-between w-full">
                <span>{selectedBreed.value}</span>
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {selectedBreed.count}
                </span>
              </span>
            ) : (
              <span className="text-gray-500">
                Select Breed{loading && ' (Loading...)'}
              </span>
            )}
          </span>
          <ChevronDownIcon 
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
          {/* Search input for filtering breed list */}
          <div className="p-2 border-b">
            <input
              type="text"
              placeholder="Search breeds..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          
          {/* Clear filter option */}
          {filters.breed && (
            <button
              type="button"
              onClick={() => handleBreedSelect('')}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b"
            >
              <span className="text-gray-600 italic">Clear filter</span>
            </button>
          )}
          
          {/* Breed options with counts */}
          {filteredBreeds.length > 0 ? (
            filteredBreeds.map((breed) => (
              <button
                key={breed.value}
                type="button"
                onClick={() => handleBreedSelect(breed.value)}
                className={`
                  w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between
                  ${filters.breed === breed.value ? 'bg-blue-50 text-blue-700' : ''}
                `}
              >
                <span>{breed.value}</span>
                <span className={`
                  px-2 py-1 text-xs rounded-full
                  ${filters.breed === breed.value ? 
                    'bg-blue-200 text-blue-800' : 
                    'bg-gray-100 text-gray-600'
                  }
                `}>
                  {breed.count}
                </span>
              </button>
            ))
          ) : (
            <div className="px-4 py-2 text-gray-500 italic">
              {searchTerm ? 'No breeds found' : 'No breeds available'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Main Filter Container Component

```typescript
// frontend/src/components/filters/FilterContainer.tsx
import { AnimalFilters } from '@/types/api';
import { useFilterCounts } from '@/hooks/useFilterCounts';
import { BreedFilter } from './BreedFilter';
import { SizeFilter } from './SizeFilter';
import { OrganizationFilter } from './OrganizationFilter';
import { AgeFilter } from './AgeFilter';

interface FilterContainerProps {
  filters: AnimalFilters;
  onFilterChange: (newFilters: Partial<AnimalFilters>) => void;
  className?: string;
}

export function FilterContainer({ filters, onFilterChange, className = '' }: FilterContainerProps) {
  const { filterCounts, loading, error } = useFilterCounts(filters);
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">Unable to load filter options. Please try again.</p>
      </div>
    );
  }
  
  return (
    <div className={`filter-container ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Filter Dogs</h3>
        
        {filterCounts && (
          <p className="text-sm text-gray-600">
            {filterCounts.total_matching_animals} dogs available
            {filterCounts.filters_applied_count > 0 && 
              ` (${filterCounts.filters_applied_count} filter${
                filterCounts.filters_applied_count !== 1 ? 's' : ''
              } applied)`
            }
          </p>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <BreedFilter
          filters={filters}
          onFilterChange={onFilterChange}
          breedOptions={filterCounts?.breeds || []}
          loading={loading}
        />
        
        <SizeFilter
          filters={filters}
          onFilterChange={onFilterChange}
          sizeOptions={filterCounts?.sizes || []}
          loading={loading}
        />
        
        <OrganizationFilter
          filters={filters}
          onFilterChange={onFilterChange}
          organizationOptions={filterCounts?.organizations || []}
          loading={loading}
        />
        
        <AgeFilter
          filters={filters}
          onFilterChange={onFilterChange}
          ageOptions={filterCounts?.age_categories || []}
          loading={loading}
        />
      </div>
      
      {/* Active filters display */}
      <ActiveFilters 
        filters={filters} 
        onFilterChange={onFilterChange}
        filterCounts={filterCounts}
      />
    </div>
  );
}
```

### Active Filters Component

```typescript
// frontend/src/components/filters/ActiveFilters.tsx
import { XMarkIcon } from '@heroicons/react/24/outline';
import { AnimalFilters, FilterCountsResponse } from '@/types/api';

interface ActiveFiltersProps {
  filters: AnimalFilters;
  onFilterChange: (newFilters: Partial<AnimalFilters>) => void;
  filterCounts: FilterCountsResponse | null;
}

export function ActiveFilters({ filters, onFilterChange, filterCounts }: ActiveFiltersProps) {
  const activeFilters = [];
  
  // Build list of active filters with display names and counts
  if (filters.breed) {
    const breedOption = filterCounts?.breeds.find(b => b.value === filters.breed);
    activeFilters.push({
      key: 'breed',
      label: `Breed: ${filters.breed}`,
      count: breedOption?.count,
      onRemove: () => onFilterChange({ breed: undefined, offset: 0 })
    });
  }
  
  if (filters.size) {
    const sizeOption = filterCounts?.sizes.find(s => s.value === filters.size);
    activeFilters.push({
      key: 'size',
      label: `Size: ${filters.size}`,
      count: sizeOption?.count,
      onRemove: () => onFilterChange({ size: undefined, offset: 0 })
    });
  }
  
  if (filters.organization) {
    const orgOption = filterCounts?.organizations.find(o => o.value === filters.organization);
    activeFilters.push({
      key: 'organization',
      label: `Organization: ${orgOption?.name || filters.organization}`,
      count: orgOption?.count,
      onRemove: () => onFilterChange({ organization: undefined, offset: 0 })
    });
  }
  
  if (filters.age_category) {
    const ageOption = filterCounts?.age_categories.find(a => a.value === filters.age_category);
    activeFilters.push({
      key: 'age_category',
      label: `Age: ${filters.age_category}`,
      count: ageOption?.count,
      onRemove: () => onFilterChange({ age_category: undefined, offset: 0 })
    });
  }
  
  if (filters.search?.trim()) {
    activeFilters.push({
      key: 'search',
      label: `Search: "${filters.search}"`,
      onRemove: () => onFilterChange({ search: '', offset: 0 })
    });
  }
  
  if (activeFilters.length === 0) {
    return null;
  }
  
  const clearAllFilters = () => {
    onFilterChange({
      search: '',
      breed: undefined,
      size: undefined,
      organization: undefined,
      age_category: undefined,
      location_country: undefined,
      offset: 0
    });
  };
  
  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Active filters:</span>
        
        {activeFilters.map((filter) => (
          <span
            key={filter.key}
            className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
          >
            <span>{filter.label}</span>
            {filter.count !== undefined && (
              <span className="px-1.5 py-0.5 bg-blue-200 text-blue-900 text-xs rounded-full">
                {filter.count}
              </span>
            )}
            <button
              type="button"
              onClick={filter.onRemove}
              className="ml-1 p-0.5 hover:bg-blue-200 rounded-full"
              aria-label={`Remove ${filter.label} filter`}
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        ))}
        
        <button
          type="button"
          onClick={clearAllFilters}
          className="ml-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 underline"
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
```

## Performance Optimizations

### Database Query Optimization

```sql
-- Indexes for efficient filter counting queries
CREATE INDEX idx_animals_availability_status ON animals(availability_status);
CREATE INDEX idx_animals_standardized_breed ON animals(standardized_breed);
CREATE INDEX idx_animals_standardized_size ON animals(standardized_size);
CREATE INDEX idx_animals_age_category ON animals(age_category);
CREATE INDEX idx_animals_sex ON animals(sex);

-- Composite index for common filter combinations
CREATE INDEX idx_animals_availability_breed_size ON animals(
    availability_status, 
    standardized_breed, 
    standardized_size
) WHERE availability_status = 'available';

-- Organization-related indexes
CREATE INDEX idx_organizations_active ON organizations(active) WHERE active = TRUE;
CREATE INDEX idx_animals_organization_availability ON animals(
    organization_id, 
    availability_status
);
```

### Frontend Caching Strategy

```typescript
// frontend/src/hooks/useFilterCountsWithCache.ts
import { useState, useEffect, useRef } from 'react';
import { AnimalFilters, FilterCountsResponse } from '@/types/api';

// Simple in-memory cache for filter counts
const filterCountsCache = new Map<string, {
  data: FilterCountsResponse;
  timestamp: number;
  ttl: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useFilterCountsWithCache(filters: AnimalFilters) {
  const [filterCounts, setFilterCounts] = useState<FilterCountsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  useEffect(() => {
    const fetchFilterCounts = async () => {
      // Create cache key from filters
      const cacheKey = JSON.stringify({
        search: filters.search?.trim() || '',
        breed: filters.breed || '',
        size: filters.size || '',
        organization: filters.organization || '',
        age_category: filters.age_category || '',
        location_country: filters.location_country || ''
      });
      
      // Check cache first
      const cached = filterCountsCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        setFilterCounts(cached.data);
        return;
      }
      
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Create new request
      abortControllerRef.current = new AbortController();
      
      try {
        setLoading(true);
        
        const params = new URLSearchParams();
        // ... build params from filters
        
        const response = await fetch(
          `/api/animals/meta/filter_counts?${params.toString()}`,
          { 
            signal: abortControllerRef.current.signal,
            headers: { 'Content-Type': 'application/json' }
          }
        );
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        // Cache the result
        filterCountsCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: CACHE_TTL
        });
        
        setFilterCounts(data);
        
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error fetching filter counts:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    const timeoutId = setTimeout(fetchFilterCounts, 300); // Debounce
    
    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [filters]);
  
  return { filterCounts, loading };
}
```

## Testing Patterns

### Backend Tests

```python
# tests/api/test_filter_counts.py
import pytest
from fastapi.testclient import TestClient
from api.main import app

client = TestClient(app)

class TestFilterCounts:
    def test_filter_counts_with_no_filters_returns_all_options(self):
        """Test filter counts endpoint with no active filters."""
        # Act
        response = client.get("/api/animals/meta/filter_counts")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        
        assert "breeds" in data
        assert "sizes" in data
        assert "organizations" in data
        assert "age_categories" in data
        assert "total_matching_animals" in data
        
        # Should have options with counts > 0
        assert all(option["count"] > 0 for option in data["breeds"])
        assert all(option["count"] > 0 for option in data["sizes"])
    
    def test_filter_counts_excludes_current_breed_filter(self):
        """Test that breed counts exclude current breed filter."""
        # Act
        response = client.get("/api/animals/meta/filter_counts?standardized_breed=Golden Retriever")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        
        # Should show counts for other breeds when Golden Retriever is selected
        breed_values = [option["value"] for option in data["breeds"]]
        assert "German Shepherd" in breed_values  # Other breeds available
        
        # Total should reflect animals matching the breed filter
        assert data["total_matching_animals"] > 0
    
    def test_filter_counts_with_multiple_filters_narrows_options(self):
        """Test filter counts with multiple active filters."""
        # Arrange
        params = {
            "standardized_breed": "Golden Retriever",
            "standardized_size": "large"
        }
        
        # Act
        response = client.get("/api/animals/meta/filter_counts", params=params)
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        
        # Should have fewer total animals than no filters
        response_no_filters = client.get("/api/animals/meta/filter_counts")
        data_no_filters = response_no_filters.json()
        
        assert data["total_matching_animals"] <= data_no_filters["total_matching_animals"]
        
        # Organization counts should reflect the narrowed selection
        org_counts = {org["value"]: org["count"] for org in data["organizations"]}
        assert all(count > 0 for count in org_counts.values())
    
    def test_filter_counts_organization_includes_display_names(self):
        """Test organization filter counts include both slug and display name."""
        # Act
        response = client.get("/api/animals/meta/filter_counts")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        
        organizations = data["organizations"]
        assert len(organizations) > 0
        
        for org in organizations:
            assert "value" in org  # slug
            assert "name" in org   # display name
            assert "count" in org
            assert org["count"] > 0
    
    def test_filter_counts_handles_search_text(self):
        """Test filter counts with search text parameter."""
        # Act
        response = client.get("/api/animals/meta/filter_counts?search=friendly")
        
        # Assert
        assert response.status_code == 200
        data = response.json()
        
        # Should have narrowed results based on search
        assert data["total_matching_animals"] >= 0
        
        # All returned options should still have counts > 0
        assert all(option["count"] > 0 for option in data["breeds"])
```

### Frontend Tests

```typescript
// frontend/src/components/filters/__tests__/FilterContainer.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { FilterContainer } from '../FilterContainer';
import { createMockFilterCounts, createMockAnimalFilters } from '@/test-utils/factories';

// Mock the custom hook
vi.mock('@/hooks/useFilterCounts');

describe('FilterContainer with real-time counts', () => {
  const mockOnFilterChange = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('displays filter counts in dropdown options', async () => {
    // Arrange
    const filters = createMockAnimalFilters();
    const filterCounts = createMockFilterCounts({
      breeds: [
        { value: 'Golden Retriever', count: 15 },
        { value: 'German Shepherd', count: 12 }
      ]
    });
    
    vi.mocked(useFilterCounts).mockReturnValue({
      filterCounts,
      loading: false,
      error: null,
      refetch: vi.fn()
    });
    
    // Act
    render(
      <FilterContainer 
        filters={filters} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // Assert
    expect(screen.getByText('125 dogs available')).toBeInTheDocument();
    
    // Open breed filter
    fireEvent.click(screen.getByText('Select Breed'));
    
    await waitFor(() => {
      expect(screen.getByText('Golden Retriever')).toBeInTheDocument();
      expect(screen.getByText('15')).toBeInTheDocument(); // Count badge
      expect(screen.getByText('German Shepherd')).toBeInTheDocument();
      expect(screen.getByText('12')).toBeInTheDocument(); // Count badge
    });
  });
  
  it('updates counts when filters change', async () => {
    // Arrange
    const filters = createMockAnimalFilters({ breed: 'Golden Retriever' });
    const filterCounts = createMockFilterCounts({
      total_matching_animals: 15,
      filters_applied_count: 1
    });
    
    vi.mocked(useFilterCounts).mockReturnValue({
      filterCounts,
      loading: false,
      error: null,
      refetch: vi.fn()
    });
    
    // Act
    render(
      <FilterContainer 
        filters={filters} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // Assert
    expect(screen.getByText('15 dogs available (1 filter applied)')).toBeInTheDocument();
  });
  
  it('shows loading state while fetching counts', () => {
    // Arrange
    vi.mocked(useFilterCounts).mockReturnValue({
      filterCounts: null,
      loading: true,
      error: null,
      refetch: vi.fn()
    });
    
    // Act
    render(
      <FilterContainer 
        filters={createMockAnimalFilters()} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // Assert
    expect(screen.getByText('Select Breed (Loading...)')).toBeInTheDocument();
  });
  
  it('removes filter when clear button clicked', async () => {
    // Arrange
    const filters = createMockAnimalFilters({ breed: 'Golden Retriever' });
    
    // Act
    render(
      <FilterContainer 
        filters={filters} 
        onFilterChange={mockOnFilterChange} 
      />
    );
    
    // Click clear button in active filters
    const clearButton = screen.getByLabelText('Remove Breed: Golden Retriever filter');
    fireEvent.click(clearButton);
    
    // Assert
    expect(mockOnFilterChange).toHaveBeenCalledWith({ 
      breed: undefined, 
      offset: 0 
    });
  });
});
```

This real-time filter counts system provides users with immediate feedback about available options and prevents frustrating dead-end filtering scenarios while maintaining good performance through optimized queries and caching.