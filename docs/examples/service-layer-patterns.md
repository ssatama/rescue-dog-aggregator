# Service Layer Implementation Patterns

This guide demonstrates the service layer architecture patterns implemented in the Rescue Dog Aggregator, including dependency injection, null object pattern, and clean separation of concerns.

## Architecture Overview

The service layer provides a clean abstraction between controllers and data access, implementing several design patterns:

- **Service Layer Pattern**: Business logic separated from controllers
- **Dependency Injection**: Services receive dependencies via constructor
- **Null Object Pattern**: Default no-op implementations prevent conditional checks
- **Template Method Pattern**: Base classes define algorithm structure
- **Context Manager Pattern**: Automatic resource management

## Core Service Classes

### Base Service Structure

```python
# services/base_service.py
from abc import ABC, abstractmethod
from typing import Optional, Any, Dict
import logging

logger = logging.getLogger(__name__)

class BaseService(ABC):
    """Base class for all service layer implementations."""
    
    def __init__(self, cursor, metrics_collector=None, session_manager=None):
        self.cursor = cursor
        self.metrics_collector = metrics_collector or NullMetricsCollector()
        self.session_manager = session_manager or NullSessionManager()
        
    def _log_operation(self, operation_name: str, **kwargs):
        """Standard logging for service operations."""
        logger.info(f"Service operation: {operation_name}", extra=kwargs)
        self.metrics_collector.increment(f"{self.__class__.__name__.lower()}.{operation_name}")
    
    @abstractmethod
    def validate_input(self, data: Any) -> bool:
        """Validate input data before processing."""
        pass
```

### Animal Service Implementation

```python
# services/animal_service.py
from typing import List, Optional, Dict, Any
import logging
from psycopg2.extras import RealDictCursor

from api.models.dog import Animal, AnimalWithImages, AnimalImage
from api.models.requests import AnimalFilterRequest, AnimalFilterCountRequest
from api.models.responses import FilterCountsResponse, FilterOption
from api.exceptions import APIException, ValidationError
from .base_service import BaseService
from .null_objects import NullMetricsCollector, NullSessionManager

logger = logging.getLogger(__name__)

class AnimalService(BaseService):
    """Service for animal-related business logic and data access."""
    
    def __init__(self, cursor: RealDictCursor, metrics_collector=None, session_manager=None):
        super().__init__(cursor, metrics_collector, session_manager)
        
    def get_animals(self, filters: AnimalFilterRequest) -> List[AnimalWithImages]:
        """Get animals with images, applying filters and pagination."""
        try:
            self._log_operation("get_animals_started", filter_count=self._count_applied_filters(filters))
            
            # Validate filters
            if not self.validate_input(filters):
                raise ValidationError("Invalid filter parameters")
            
            # Build query with filters
            query, params = self._build_animals_query(filters)
            
            # Execute main query
            self.cursor.execute(query, params)
            animals_data = self.cursor.fetchall()
            
            if not animals_data:
                self._log_operation("get_animals_empty_result")
                return []
            
            # Batch load images to prevent N+1 queries
            animal_ids = [animal['id'] for animal in animals_data]
            images_map = self._batch_load_animal_images(animal_ids)
            
            # Combine animals with their images
            animals_with_images = []
            for animal_data in animals_data:
                animal_images = images_map.get(animal_data['id'], [])
                animal_data['images'] = animal_images
                animals_with_images.append(AnimalWithImages(**animal_data))
            
            self._log_operation("get_animals_completed", count=len(animals_with_images))
            return animals_with_images
            
        except Exception as e:
            self._log_operation("get_animals_failed", error=str(e))
            logger.exception(f"Error in get_animals: {e}")
            raise APIException(status_code=500, detail="Failed to retrieve animals")
    
    def get_animal_by_slug(self, slug: str) -> Optional[AnimalWithImages]:
        """Get single animal by slug with images."""
        try:
            self._log_operation("get_animal_by_slug_started", slug=slug)
            
            # Main animal query with organization join
            query = """
                SELECT 
                    a.id, a.slug, a.name, a.breed, a.standardized_breed,
                    a.age_text, a.age_min_months, a.age_max_months, a.age_category,
                    a.sex, a.size, a.standardized_size, a.availability_status,
                    a.availability_confidence, a.primary_image_url, a.adoption_url,
                    a.properties, a.external_id, a.language,
                    a.created_at, a.updated_at, a.last_scraped_at,
                    o.id as organization_id, o.slug as organization_slug, 
                    o.name as organization_name, o.country as organization_country,
                    o.active as organization_active
                FROM animals a
                JOIN organizations o ON a.organization_id = o.id
                WHERE a.slug = %s AND a.availability_status = 'available'
            """
            
            self.cursor.execute(query, (slug,))
            animal_data = self.cursor.fetchone()
            
            if not animal_data:
                self._log_operation("get_animal_by_slug_not_found", slug=slug)
                return None
            
            # Load images for this animal
            images = self._get_animal_images(animal_data['id'])
            animal_data['images'] = images
            
            # Structure organization data
            animal_data['organization'] = {
                'id': animal_data['organization_id'],
                'slug': animal_data['organization_slug'],
                'name': animal_data['organization_name'],
                'country': animal_data['organization_country'],
                'active': animal_data['organization_active']
            }
            
            self._log_operation("get_animal_by_slug_found", slug=slug)
            return AnimalWithImages(**animal_data)
            
        except Exception as e:
            self._log_operation("get_animal_by_slug_failed", slug=slug, error=str(e))
            logger.exception(f"Error getting animal by slug {slug}: {e}")
            raise APIException(status_code=500, detail=f"Failed to retrieve animal {slug}")
    
    def get_filter_counts(self, filters: AnimalFilterCountRequest) -> FilterCountsResponse:
        """Get dynamic filter counts based on current filter context."""
        try:
            self._log_operation("get_filter_counts_started")
            
            # Build base conditions from current filters
            base_conditions, base_params = self._build_filter_conditions(filters)
            
            # Get counts for each filter type efficiently
            breed_counts = self._get_breed_counts(base_conditions, base_params, filters)
            size_counts = self._get_size_counts(base_conditions, base_params, filters)
            org_counts = self._get_organization_counts(base_conditions, base_params, filters)
            age_counts = self._get_age_category_counts(base_conditions, base_params, filters)
            
            # Get total count for metadata
            total_count = self._get_total_matching_count(base_conditions, base_params)
            
            response = FilterCountsResponse(
                breeds=breed_counts,
                sizes=size_counts,
                organizations=org_counts,
                age_categories=age_counts,
                total_matching_animals=total_count,
                filters_applied_count=self._count_applied_filters(filters)
            )
            
            self._log_operation("get_filter_counts_completed", total=total_count)
            return response
            
        except Exception as e:
            self._log_operation("get_filter_counts_failed", error=str(e))
            logger.exception(f"Error getting filter counts: {e}")
            raise APIException(status_code=500, detail="Failed to calculate filter counts")
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get aggregated statistics about animals and organizations."""
        try:
            self._log_operation("get_statistics_started")
            
            # Get animal statistics
            self.cursor.execute("""
                SELECT 
                    COUNT(*) as total_animals,
                    COUNT(*) FILTER (WHERE availability_status = 'available') as available_animals,
                    COUNT(DISTINCT organization_id) as organizations_with_animals,
                    COUNT(DISTINCT COALESCE(standardized_breed, breed)) as unique_breeds
                FROM animals a
                JOIN organizations o ON a.organization_id = o.id
                WHERE o.active = TRUE
            """)
            
            stats = self.cursor.fetchone()
            
            # Get organization count
            self.cursor.execute("SELECT COUNT(*) as total_organizations FROM organizations WHERE active = TRUE")
            org_stats = self.cursor.fetchone()
            
            result = {
                'total_animals': stats['total_animals'],
                'available_animals': stats['available_animals'],
                'total_organizations': org_stats['total_organizations'],
                'organizations_with_animals': stats['organizations_with_animals'],
                'unique_breeds': stats['unique_breeds'],
                'last_updated': 'realtime'
            }
            
            self._log_operation("get_statistics_completed")
            return result
            
        except Exception as e:
            self._log_operation("get_statistics_failed", error=str(e))
            logger.exception(f"Error getting statistics: {e}")
            raise APIException(status_code=500, detail="Failed to get statistics")
    
    def validate_input(self, data: Any) -> bool:
        """Validate input data structure."""
        if isinstance(data, AnimalFilterRequest):
            # Basic validation for filter requests
            if data.limit and (data.limit < 1 or data.limit > 100):
                return False
            if data.offset and data.offset < 0:
                return False
            return True
        
        return True
    
    # Private helper methods
    def _batch_load_animal_images(self, animal_ids: List[int]) -> Dict[int, List[AnimalImage]]:
        """Batch load images for multiple animals to prevent N+1 queries."""
        if not animal_ids:
            return {}
        
        # Single query to get all images for all animals
        placeholders = ','.join(['%s'] * len(animal_ids))
        query = f"""
            SELECT animal_id, id, image_url, is_primary
            FROM animal_images
            WHERE animal_id IN ({placeholders})
            ORDER BY animal_id, is_primary DESC, id ASC
        """
        
        self.cursor.execute(query, animal_ids)
        images_data = self.cursor.fetchall()
        
        # Group images by animal_id
        images_map = {}
        for image_data in images_data:
            animal_id = image_data['animal_id']
            if animal_id not in images_map:
                images_map[animal_id] = []
            images_map[animal_id].append(AnimalImage(**image_data))
        
        return images_map
    
    def _get_animal_images(self, animal_id: int) -> List[AnimalImage]:
        """Get images for a single animal."""
        self.cursor.execute("""
            SELECT id, image_url, is_primary
            FROM animal_images
            WHERE animal_id = %s
            ORDER BY is_primary DESC, id ASC
        """, (animal_id,))
        
        images_data = self.cursor.fetchall()
        return [AnimalImage(**img) for img in images_data]
    
    def _build_animals_query(self, filters: AnimalFilterRequest) -> tuple[str, List]:
        """Build the main animals query with filters."""
        base_query = """
            SELECT 
                a.id, a.slug, a.name, a.breed, a.standardized_breed,
                a.age_text, a.age_min_months, a.age_max_months, a.age_category,
                a.sex, a.size, a.standardized_size, a.availability_status,
                a.availability_confidence, a.primary_image_url, a.adoption_url,
                a.properties, a.external_id, a.language,
                a.created_at, a.updated_at, a.last_scraped_at,
                o.id as organization_id, o.slug as organization_slug,
                o.name as organization_name, o.country as organization_country,
                o.active as organization_active
            FROM animals a
            JOIN organizations o ON a.organization_id = o.id
        """
        
        conditions, params = self._build_filter_conditions(filters)
        
        # Add sorting
        sort_clause = self._build_sort_clause(filters.sort)
        
        # Add pagination
        limit_clause = f"LIMIT {filters.limit} OFFSET {filters.offset}"
        
        full_query = f"{base_query} WHERE {conditions} {sort_clause} {limit_clause}"
        
        return full_query, params
    
    def _build_filter_conditions(self, filters) -> tuple[str, List]:
        """Build WHERE clause conditions from filters."""
        conditions = ["o.active = TRUE"]
        params = []
        
        # Availability filters
        if hasattr(filters, 'availability_status') and filters.availability_status:
            conditions.append("a.availability_status = ANY(%s)")
            params.append(filters.availability_status)
        else:
            conditions.append("a.availability_status = %s")
            params.append("available")
        
        if hasattr(filters, 'availability_confidence') and filters.availability_confidence:
            conditions.append("a.availability_confidence = ANY(%s)")
            params.append(filters.availability_confidence)
        
        # Search filter
        if hasattr(filters, 'search') and filters.search and filters.search.strip():
            search_term = f"%{filters.search.strip()}%"
            conditions.append("""
                (a.name ILIKE %s OR 
                 a.breed ILIKE %s OR 
                 a.standardized_breed ILIKE %s OR
                 (a.properties->>'description') ILIKE %s)
            """)
            params.extend([search_term, search_term, search_term, search_term])
        
        # Breed filters
        if hasattr(filters, 'breed') and filters.breed:
            conditions.append("a.breed = %s")
            params.append(filters.breed)
        
        if hasattr(filters, 'standardized_breed') and filters.standardized_breed:
            conditions.append("a.standardized_breed = %s")
            params.append(filters.standardized_breed)
        
        if hasattr(filters, 'breed_group') and filters.breed_group:
            conditions.append("a.breed_group = %s")
            params.append(filters.breed_group)
        
        # Size filters
        if hasattr(filters, 'size') and filters.size:
            conditions.append("a.size = %s")
            params.append(filters.size)
        
        if hasattr(filters, 'standardized_size') and filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size)
        
        # Other categorical filters
        if hasattr(filters, 'age_category') and filters.age_category:
            conditions.append("a.age_category = %s")
            params.append(filters.age_category)
        
        if hasattr(filters, 'sex') and filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)
        
        if hasattr(filters, 'organization') and filters.organization:
            conditions.append("o.slug = %s")
            params.append(filters.organization)
        
        # Location filters
        if hasattr(filters, 'location_country') and filters.location_country:
            conditions.append("o.country = %s")
            params.append(filters.location_country)
        
        return " AND ".join(conditions), params
    
    def _build_sort_clause(self, sort_param: Optional[str]) -> str:
        """Build ORDER BY clause from sort parameter."""
        sort_options = {
            'newest': 'a.created_at DESC',
            'oldest': 'a.created_at ASC',
            'name_asc': 'a.name ASC',
            'name_desc': 'a.name DESC',
            'age_young': 'a.age_min_months ASC NULLS LAST',
            'age_old': 'a.age_min_months DESC NULLS LAST'
        }
        
        sort_clause = sort_options.get(sort_param, sort_options['newest'])
        return f"ORDER BY {sort_clause}"
    
    def _count_applied_filters(self, filters) -> int:
        """Count how many filters are currently applied."""
        count = 0
        
        if hasattr(filters, 'search') and filters.search and filters.search.strip():
            count += 1
        if hasattr(filters, 'breed') and filters.breed:
            count += 1
        if hasattr(filters, 'standardized_breed') and filters.standardized_breed:
            count += 1
        if hasattr(filters, 'size') and filters.size:
            count += 1
        if hasattr(filters, 'standardized_size') and filters.standardized_size:
            count += 1
        if hasattr(filters, 'age_category') and filters.age_category:
            count += 1
        if hasattr(filters, 'sex') and filters.sex:
            count += 1
        if hasattr(filters, 'organization') and filters.organization:
            count += 1
        if hasattr(filters, 'location_country') and filters.location_country:
            count += 1
        
        return count
```

### Organization Service

```python
# services/organization_service.py
from typing import List, Optional, Dict, Any
from psycopg2.extras import RealDictCursor

from api.models.organization import Organization
from api.exceptions import APIException
from .base_service import BaseService

class OrganizationService(BaseService):
    """Service for organization-related business logic."""
    
    def __init__(self, cursor: RealDictCursor, metrics_collector=None, session_manager=None):
        super().__init__(cursor, metrics_collector, session_manager)
    
    def get_organizations(self, active_only: bool = True) -> List[Organization]:
        """Get all organizations with optional active filter."""
        try:
            self._log_operation("get_organizations_started", active_only=active_only)
            
            query = """
                SELECT 
                    id, slug, name, description, website_url, country, city,
                    logo_url, service_regions, ships_to, social_media,
                    established_year, active, created_at, updated_at
                FROM organizations
            """
            
            params = []
            if active_only:
                query += " WHERE active = %s"
                params.append(True)
            
            query += " ORDER BY name ASC"
            
            self.cursor.execute(query, params)
            organizations_data = self.cursor.fetchall()
            
            organizations = [Organization(**org_data) for org_data in organizations_data]
            
            self._log_operation("get_organizations_completed", count=len(organizations))
            return organizations
            
        except Exception as e:
            self._log_operation("get_organizations_failed", error=str(e))
            logger.exception(f"Error getting organizations: {e}")
            raise APIException(status_code=500, detail="Failed to retrieve organizations")
    
    def get_organization_by_slug(self, slug: str) -> Optional[Organization]:
        """Get organization by slug."""
        try:
            self._log_operation("get_organization_by_slug_started", slug=slug)
            
            query = """
                SELECT 
                    id, slug, name, description, website_url, country, city,
                    logo_url, service_regions, ships_to, social_media,
                    established_year, active, created_at, updated_at
                FROM organizations
                WHERE slug = %s AND active = TRUE
            """
            
            self.cursor.execute(query, (slug,))
            org_data = self.cursor.fetchone()
            
            if not org_data:
                self._log_operation("get_organization_by_slug_not_found", slug=slug)
                return None
            
            organization = Organization(**org_data)
            
            self._log_operation("get_organization_by_slug_found", slug=slug)
            return organization
            
        except Exception as e:
            self._log_operation("get_organization_by_slug_failed", slug=slug, error=str(e))
            logger.exception(f"Error getting organization by slug {slug}: {e}")
            raise APIException(status_code=500, detail=f"Failed to retrieve organization {slug}")
    
    def validate_input(self, data: Any) -> bool:
        """Validate organization input data."""
        # Basic validation - could be expanded based on requirements
        return True
```

## Null Object Pattern Implementation

### Null Objects for Clean Dependencies

```python
# services/null_objects.py
from typing import Any, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class NullMetricsCollector:
    """Null object for metrics collection - no-op implementation."""
    
    def increment(self, metric_name: str, tags: Optional[Dict[str, str]] = None) -> None:
        """No-op increment - metrics collection disabled."""
        pass
    
    def timing(self, metric_name: str, duration: float, tags: Optional[Dict[str, str]] = None) -> None:
        """No-op timing - metrics collection disabled."""
        pass
    
    def gauge(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        """No-op gauge - metrics collection disabled."""
        pass
    
    def histogram(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        """No-op histogram - metrics collection disabled."""
        pass

class NullSessionManager:
    """Null object for session management - no-op implementation."""
    
    def start_session(self, session_type: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """No-op session start - returns dummy session ID."""
        return "null-session"
    
    def update_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """No-op session update - session tracking disabled."""
        pass
    
    def end_session(self, session_id: str, status: str = "completed") -> None:
        """No-op session end - session tracking disabled."""
        pass
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """No-op session retrieval - returns None."""
        return None

class NullDatabaseService:
    """Null object for database operations - no-op implementation."""
    
    def connect(self) -> None:
        """No-op database connection."""
        pass
    
    def disconnect(self) -> None:
        """No-op database disconnection."""
        pass
    
    def execute_query(self, query: str, params: tuple = ()) -> None:
        """No-op query execution."""
        pass
    
    def commit(self) -> None:
        """No-op transaction commit."""
        pass
    
    def rollback(self) -> None:
        """No-op transaction rollback."""
        pass
```

### Real Implementation Classes

```python
# services/metrics_collector.py
from typing import Dict, Optional
import logging
import time

logger = logging.getLogger(__name__)

class MetricsCollector:
    """Real metrics collection implementation."""
    
    def __init__(self, client=None, prefix: str = "rescue_dogs"):
        self.client = client  # StatsD client or similar
        self.prefix = prefix
        self._metrics_buffer = []
    
    def increment(self, metric_name: str, tags: Optional[Dict[str, str]] = None) -> None:
        """Increment a counter metric."""
        full_metric = f"{self.prefix}.{metric_name}"
        
        if self.client:
            self.client.increment(full_metric, tags=tags)
        else:
            # Fallback to logging
            logger.info(f"Metric increment: {full_metric}", extra={"tags": tags})
    
    def timing(self, metric_name: str, duration: float, tags: Optional[Dict[str, str]] = None) -> None:
        """Record timing metric."""
        full_metric = f"{self.prefix}.{metric_name}"
        
        if self.client:
            self.client.timing(full_metric, duration, tags=tags)
        else:
            logger.info(f"Metric timing: {full_metric} = {duration}ms", extra={"tags": tags})
    
    def gauge(self, metric_name: str, value: float, tags: Optional[Dict[str, str]] = None) -> None:
        """Record gauge metric."""
        full_metric = f"{self.prefix}.{metric_name}"
        
        if self.client:
            self.client.gauge(full_metric, value, tags=tags)
        else:
            logger.info(f"Metric gauge: {full_metric} = {value}", extra={"tags": tags})

# services/session_manager.py
from typing import Dict, Any, Optional
import uuid
import time
import logging

logger = logging.getLogger(__name__)

class SessionManager:
    """Real session management implementation."""
    
    def __init__(self, storage=None):
        self.storage = storage or {}  # In-memory fallback
        self._sessions = {}
    
    def start_session(self, session_type: str, metadata: Optional[Dict[str, Any]] = None) -> str:
        """Start a new session with unique ID."""
        session_id = str(uuid.uuid4())
        
        session_data = {
            'id': session_id,
            'type': session_type,
            'started_at': time.time(),
            'metadata': metadata or {},
            'status': 'active',
            'events': []
        }
        
        self._sessions[session_id] = session_data
        
        if self.storage:
            self.storage.set(f"session:{session_id}", session_data)
        
        logger.info(f"Session started: {session_id} ({session_type})")
        return session_id
    
    def update_session(self, session_id: str, data: Dict[str, Any]) -> None:
        """Update session with new data."""
        if session_id in self._sessions:
            self._sessions[session_id].update(data)
            self._sessions[session_id]['updated_at'] = time.time()
            
            if self.storage:
                self.storage.set(f"session:{session_id}", self._sessions[session_id])
    
    def end_session(self, session_id: str, status: str = "completed") -> None:
        """End session with final status."""
        if session_id in self._sessions:
            self._sessions[session_id]['status'] = status
            self._sessions[session_id]['ended_at'] = time.time()
            
            if self.storage:
                self.storage.set(f"session:{session_id}", self._sessions[session_id])
            
            logger.info(f"Session ended: {session_id} ({status})")
```

## Dependency Injection Patterns

### Service Factory

```python
# services/service_factory.py
from typing import Optional
from psycopg2.extras import RealDictCursor

from .animal_service import AnimalService
from .organization_service import OrganizationService
from .metrics_collector import MetricsCollector
from .session_manager import SessionManager
from .null_objects import NullMetricsCollector, NullSessionManager

class ServiceFactory:
    """Factory for creating service instances with proper dependencies."""
    
    def __init__(self, 
                 metrics_enabled: bool = True,
                 session_tracking_enabled: bool = True,
                 metrics_client=None,
                 session_storage=None):
        self.metrics_enabled = metrics_enabled
        self.session_tracking_enabled = session_tracking_enabled
        self.metrics_client = metrics_client
        self.session_storage = session_storage
        
        # Create singleton instances
        self._metrics_collector = None
        self._session_manager = None
    
    @property
    def metrics_collector(self):
        """Get metrics collector instance (singleton)."""
        if self._metrics_collector is None:
            if self.metrics_enabled:
                self._metrics_collector = MetricsCollector(client=self.metrics_client)
            else:
                self._metrics_collector = NullMetricsCollector()
        return self._metrics_collector
    
    @property
    def session_manager(self):
        """Get session manager instance (singleton)."""
        if self._session_manager is None:
            if self.session_tracking_enabled:
                self._session_manager = SessionManager(storage=self.session_storage)
            else:
                self._session_manager = NullSessionManager()
        return self._session_manager
    
    def create_animal_service(self, cursor: RealDictCursor) -> AnimalService:
        """Create AnimalService with injected dependencies."""
        return AnimalService(
            cursor=cursor,
            metrics_collector=self.metrics_collector,
            session_manager=self.session_manager
        )
    
    def create_organization_service(self, cursor: RealDictCursor) -> OrganizationService:
        """Create OrganizationService with injected dependencies."""
        return OrganizationService(
            cursor=cursor,
            metrics_collector=self.metrics_collector,
            session_manager=self.session_manager
        )

# Global factory instance
service_factory = ServiceFactory()

def get_animal_service(cursor: RealDictCursor) -> AnimalService:
    """Convenience function to get AnimalService instance."""
    return service_factory.create_animal_service(cursor)

def get_organization_service(cursor: RealDictCursor) -> OrganizationService:
    """Convenience function to get OrganizationService instance."""
    return service_factory.create_organization_service(cursor)
```

### Usage in Controllers

```python
# api/routes/animals.py - Updated to use service layer
from fastapi import APIRouter, Depends
from psycopg2.extras import RealDictCursor

from api.dependencies import get_db_cursor
from api.models.requests import AnimalFilterRequest
from services.service_factory import get_animal_service

router = APIRouter(tags=["animals"])

@router.get("/", response_model=List[AnimalWithImages])
async def get_animals(
    filters: AnimalFilterRequest = Depends(),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get all animals with filtering - delegating to service layer."""
    try:
        # Service layer handles all business logic
        animal_service = get_animal_service(cursor)
        return animal_service.get_animals(filters)
        
    except ValidationError as ve:
        handle_validation_error(ve, "get_animals")
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_animals")
    except APIException:
        # Re-raise APIException from service layer
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in get_animals: {e}")
        raise APIException(status_code=500, detail="Internal server error")

@router.get("/{animal_slug}", response_model=AnimalWithImages)
async def get_animal_by_slug(
    animal_slug: str, 
    cursor: RealDictCursor = Depends(get_db_cursor)
):
    """Get animal by slug - delegating to service layer."""
    try:
        animal_service = get_animal_service(cursor)
        
        # Handle legacy ID redirects in service layer
        if animal_slug.isdigit():
            animal = animal_service.get_animal_by_id(int(animal_slug))
            if animal and hasattr(animal, "slug"):
                from fastapi.responses import RedirectResponse
                return RedirectResponse(url=f"/api/animals/{animal.slug}", status_code=301)
        
        # Primary slug lookup
        animal = animal_service.get_animal_by_slug(animal_slug)
        
        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")
        
        return animal
        
    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Unexpected error fetching animal {animal_slug}: {e}")
        raise APIException(status_code=500, detail="Internal server error")
```

## Testing with Service Layer

### Unit Tests with Mocked Dependencies

```python
# tests/services/test_animal_service.py
import pytest
from unittest.mock import Mock, MagicMock
from psycopg2.extras import RealDictCursor

from services.animal_service import AnimalService
from services.null_objects import NullMetricsCollector, NullSessionManager
from api.models.requests import AnimalFilterRequest
from api.exceptions import APIException

class TestAnimalService:
    """Test AnimalService with dependency injection."""
    
    @pytest.fixture
    def mock_cursor(self):
        """Mock database cursor."""
        cursor = Mock(spec=RealDictCursor)
        return cursor
    
    @pytest.fixture
    def mock_metrics_collector(self):
        """Mock metrics collector."""
        return Mock()
    
    @pytest.fixture
    def mock_session_manager(self):
        """Mock session manager."""
        return Mock()
    
    @pytest.fixture
    def animal_service(self, mock_cursor, mock_metrics_collector, mock_session_manager):
        """AnimalService with mocked dependencies."""
        return AnimalService(
            cursor=mock_cursor,
            metrics_collector=mock_metrics_collector,
            session_manager=mock_session_manager
        )
    
    def test_get_animals_with_filters_success(self, animal_service, mock_cursor, mock_metrics_collector):
        """Test successful animal retrieval with filters."""
        # Arrange
        mock_cursor.fetchall.side_effect = [
            [  # Animals query result
                {
                    'id': 1, 'slug': 'buddy-golden-retriever', 'name': 'Buddy',
                    'breed': 'Golden Retriever', 'organization_id': 1
                }
            ],
            [  # Images query result
                {'animal_id': 1, 'id': 1, 'image_url': 'buddy1.jpg', 'is_primary': True}
            ]
        ]
        
        filters = AnimalFilterRequest(breed="Golden Retriever", limit=20, offset=0)
        
        # Act
        result = animal_service.get_animals(filters)
        
        # Assert
        assert len(result) == 1
        assert result[0].name == 'Buddy'
        assert result[0].slug == 'buddy-golden-retriever'
        assert len(result[0].images) == 1
        
        # Verify metrics were called
        mock_metrics_collector.increment.assert_any_call('animalservice.get_animals_started')
        mock_metrics_collector.increment.assert_any_call('animalservice.get_animals_completed')
        
        # Verify database calls
        assert mock_cursor.execute.call_count == 2  # Main query + images query
    
    def test_get_animals_empty_result(self, animal_service, mock_cursor, mock_metrics_collector):
        """Test handling of empty result set."""
        # Arrange
        mock_cursor.fetchall.return_value = []
        filters = AnimalFilterRequest()
        
        # Act
        result = animal_service.get_animals(filters)
        
        # Assert
        assert result == []
        mock_metrics_collector.increment.assert_any_call('animalservice.get_animals_empty_result')
    
    def test_get_animal_by_slug_success(self, animal_service, mock_cursor):
        """Test successful animal retrieval by slug."""
        # Arrange
        animal_data = {
            'id': 1, 'slug': 'buddy-golden-retriever', 'name': 'Buddy',
            'breed': 'Golden Retriever', 'organization_id': 1,
            'organization_slug': 'test-org', 'organization_name': 'Test Org',
            'organization_country': 'US', 'organization_active': True
        }
        
        mock_cursor.fetchone.side_effect = [
            animal_data,  # Animal query
        ]
        
        mock_cursor.fetchall.return_value = [  # Images query
            {'id': 1, 'image_url': 'buddy1.jpg', 'is_primary': True}
        ]
        
        # Act
        result = animal_service.get_animal_by_slug('buddy-golden-retriever')
        
        # Assert
        assert result is not None
        assert result.name == 'Buddy'
        assert result.slug == 'buddy-golden-retriever'
        assert result.organization['name'] == 'Test Org'
        assert len(result.images) == 1
    
    def test_get_animal_by_slug_not_found(self, animal_service, mock_cursor):
        """Test animal not found by slug."""
        # Arrange
        mock_cursor.fetchone.return_value = None
        
        # Act
        result = animal_service.get_animal_by_slug('nonexistent-slug')
        
        # Assert
        assert result is None
    
    def test_service_uses_null_objects_when_no_dependencies(self, mock_cursor):
        """Test service works with null objects when dependencies not provided."""
        # Arrange - No metrics collector or session manager provided
        service = AnimalService(cursor=mock_cursor)
        
        # Act - Should not raise errors
        assert isinstance(service.metrics_collector, NullMetricsCollector)
        assert isinstance(service.session_manager, NullSessionManager)
        
        # Service operations should still work
        mock_cursor.fetchall.return_value = []
        filters = AnimalFilterRequest()
        result = service.get_animals(filters)
        
        # Assert
        assert result == []
    
    def test_database_error_handling(self, animal_service, mock_cursor):
        """Test service handles database errors properly."""
        # Arrange
        mock_cursor.execute.side_effect = Exception("Database connection error")
        filters = AnimalFilterRequest()
        
        # Act & Assert
        with pytest.raises(APIException) as exc_info:
            animal_service.get_animals(filters)
        
        assert exc_info.value.status_code == 500
        assert "Failed to retrieve animals" in str(exc_info.value.detail)
```

### Integration Tests with Service Factory

```python
# tests/services/test_service_integration.py
import pytest
from psycopg2.extras import RealDictCursor

from services.service_factory import ServiceFactory
from services.metrics_collector import MetricsCollector
from services.session_manager import SessionManager

class TestServiceFactoryIntegration:
    """Test service factory integration patterns."""
    
    @pytest.fixture
    def mock_cursor(self):
        return Mock(spec=RealDictCursor)
    
    def test_factory_creates_services_with_real_dependencies(self, mock_cursor):
        """Test factory creates services with real dependencies."""
        # Arrange
        factory = ServiceFactory(
            metrics_enabled=True,
            session_tracking_enabled=True
        )
        
        # Act
        animal_service = factory.create_animal_service(mock_cursor)
        org_service = factory.create_organization_service(mock_cursor)
        
        # Assert - Services should have real implementations
        assert isinstance(animal_service.metrics_collector, MetricsCollector)
        assert isinstance(animal_service.session_manager, SessionManager)
        assert isinstance(org_service.metrics_collector, MetricsCollector)
        assert isinstance(org_service.session_manager, SessionManager)
        
        # Services should share the same instances (singleton pattern)
        assert animal_service.metrics_collector is org_service.metrics_collector
        assert animal_service.session_manager is org_service.session_manager
    
    def test_factory_creates_services_with_null_objects(self, mock_cursor):
        """Test factory creates services with null objects when disabled."""
        # Arrange
        factory = ServiceFactory(
            metrics_enabled=False,
            session_tracking_enabled=False
        )
        
        # Act
        animal_service = factory.create_animal_service(mock_cursor)
        
        # Assert - Services should have null implementations
        from services.null_objects import NullMetricsCollector, NullSessionManager
        assert isinstance(animal_service.metrics_collector, NullMetricsCollector)
        assert isinstance(animal_service.session_manager, NullSessionManager)
    
    def test_convenience_functions_work(self, mock_cursor):
        """Test convenience functions for getting services."""
        # Act
        from services.service_factory import get_animal_service, get_organization_service
        
        animal_service = get_animal_service(mock_cursor)
        org_service = get_organization_service(mock_cursor)
        
        # Assert
        assert animal_service is not None
        assert org_service is not None
        assert hasattr(animal_service, 'get_animals')
        assert hasattr(org_service, 'get_organizations')
```

This service layer architecture provides clean separation of concerns, testable business logic, and flexible dependency management through injection and null object patterns.