# Backend Architecture

This document provides comprehensive documentation for the Rescue Dog Aggregator backend, a Python/FastAPI application serving 434+ backend tests across 8 rescue organizations. The backend follows modern architectural patterns emphasizing clean code, Test-Driven Development (TDD), and zero technical debt.

## Architecture Overview

The backend implements a **layered service architecture** with **dependency injection**, **configuration-driven design**, and **comprehensive testing isolation**. The architecture prioritizes maintainability, performance, and robust error handling across all layers.

### Core Architectural Layers

- **Application Layer (`main.py`):** FastAPI application with security middleware and CORS configuration
- **Routes Layer (`api/routes/`):** RESTful endpoint handlers with domain-driven organization
- **Services Layer (`api/services/`):** Business logic orchestration and domain operations
- **Database Layer (`api/database/`):** Connection pooling and custom query building
- **Models Layer (`api/models/`):** Pydantic data validation and serialization
- **Infrastructure Layer (`services/`, `utils/`):** Cross-cutting services and utilities
- **Configuration Layer (`config.py`):** Environment-based configuration management

### Modern Design Patterns

- **Layered Architecture:** Clear separation of presentation, business, and data concerns
- **Dependency Injection:** FastAPI's native DI system with custom service factories
- **Service Layer Pattern:** Business logic encapsulation with clean abstractions
- **Template Method Pattern:** BaseScraper uses template method for scraping workflow
- **Null Object Pattern:** Default service implementations to eliminate conditional checks
- **Context Manager Pattern:** Automatic resource management for connections and scrapers
- **Factory Pattern:** Service instantiation with proper dependency injection

### Request/Response Lifecycle

1. **Request Reception:** ASGI server receives HTTP request
2. **Security Processing:** Security headers middleware applies protection headers
3. **CORS Handling:** CORS middleware validates origin and applies headers
4. **Route Resolution:** FastAPI maps request to domain-specific route handler
5. **Dependency Resolution:** DI system provides database cursors and services
6. **Business Logic Execution:** Service layer orchestrates domain operations
7. **Data Access:** Database layer executes queries with connection pooling
8. **Response Serialization:** Pydantic models validate and serialize response data
9. **Response Delivery:** JSON response with security headers and CORS policies

### Error Handling Architecture

- **Layered Exception Handling:** Custom exceptions bubble up through service layers
- **Centralized Error Processing:** Global exception handlers in FastAPI application
- **Structured Error Responses:** Consistent API error format with error codes
- **Comprehensive Logging:** Context-aware error logging with transaction tracking
- **Database Transaction Management:** Automatic rollback on exceptions

## FastAPI Application Structure

### Application Bootstrap (`api/main.py`)

The FastAPI application is configured with comprehensive middleware stack and security features:

```python
app = FastAPI(
    title="Rescue Dog Aggregator API",
    description="API for accessing rescue dog data from various organizations",
    version="0.1.0",
)
```

**Middleware Stack:**
- **CORS Middleware:** Environment-specific origin validation with configurable credentials
- **Security Headers Middleware:** Custom middleware applying security headers:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `X-XSS-Protection: 1; mode=block`
  - `Referrer-Policy: strict-origin-when-cross-origin`

### Domain-Driven API Routes

**Route Organization (`api/routes/`):**
- `animals.py` - Animal data operations and advanced search
- `organizations.py` - Rescue organization management
- `monitoring.py` - Health checks and operational monitoring

### Animals API (`/api/animals`)

**Core Endpoints:**
- `GET /` - Advanced animal search with filtering, pagination, and curation
- `GET /{id}` - Individual animal details with organization context
- `GET /slug/{slug}` - Animal lookup by URL-friendly slug
- `GET /statistics` - Aggregate statistics across animals and organizations
- `GET /meta/breeds` - Dynamic breed metadata for filtering
- `GET /meta/breed-groups` - Dynamic breed group metadata
- `POST /filter-counts` - Filter option counts for faceted search

**Advanced Search Features:**
- **Multi-Criteria Filtering:** Breed, size, age, sex, location, organization
- **Curation Types:** Recent, diverse, random, recent_with_fallback
- **Location Intelligence:** Country-based filtering with service region support
- **Search Quality:** Sitemap-optimized filtering for SEO performance
- **Availability Confidence:** High/medium/low confidence scoring

### Organizations API (`/api/organizations`)

**Organization Management:**
- `GET /` - List active organizations with statistics
- `GET /{id}` - Organization details with recent animals
- `GET /slug/{slug}` - Organization lookup by slug

### Health Monitoring (`/health`, `/api/health`)

**Operational Endpoints:**
- `GET /health` - Basic application health status
- `GET /api/health` - Comprehensive health with database connectivity
- **Connection Pool Status:** Real-time database pool monitoring
- **Environment Information:** Configuration and deployment status

## Database Architecture

### Connection Management (`api/database/`)

The database layer implements **PostgreSQL** with **connection pooling** for optimal performance and resource management.

**Connection Pool (`connection_pool.py`):**
```python
class ConnectionPool:
    def __init__(self):
        self._pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2, maxconn=20, **conn_params
        )
```

**Key Features:**
- **Thread-Safe Singleton:** Global connection pool instance with thread safety
- **Automatic Transaction Management:** Context managers with automatic commit/rollback
- **Connection Lifecycle:** Proper resource cleanup with connection reuse
- **Pool Monitoring:** Real-time pool status for operational monitoring
- **RealDictCursor:** Dictionary-like database result access

**Context Manager Pattern:**
```python
@contextmanager
def get_pooled_cursor():
    with get_connection_pool().get_cursor() as cursor:
        yield cursor  # Automatic connection return to pool
```

### Custom Query Builder Approach

**Design Decision:** Custom SQL query building instead of ORM for:
- **Performance:** Fine-grained control over SQL execution and optimization
- **Flexibility:** Complex queries with joins, aggregations, and window functions
- **Transparency:** Explicit SQL for debugging and performance tuning
- **Batch Operations:** Optimized bulk operations for image fetching

**Trade-offs:**
- **Manual Mapping:** Results mapped to Pydantic models manually
- **SQL Maintenance:** Direct SQL queries require careful maintenance
- **Type Safety:** PostgreSQL types mapped to Python types explicitly

## Service Layer Architecture

The service layer orchestrates business logic and provides clean abstractions over data operations. Services are instantiated with dependency injection and encapsulate domain-specific operations.

### API Services (`api/services/`)

**AnimalService (`animal_service.py`):**
```python
class AnimalService:
    def __init__(self, cursor: RealDictCursor):
        self.cursor = cursor
        self.batch_executor = create_batch_executor(cursor)
```

**Core Operations:**
- **Advanced Search:** Multi-criteria filtering with pagination and curation
- **Batch Image Fetching:** Optimized image retrieval for multiple animals
- **Statistics Aggregation:** Real-time counts and organizational metrics
- **Filter Metadata:** Dynamic filter options based on available data
- **SEO Optimization:** Quality filtering for sitemap generation

**Service Factory Pattern (`service_factory.py`):**
- **Dependency Injection:** Clean instantiation with required dependencies
- **Resource Management:** Proper cursor lifecycle management
- **Testing Support:** Mock service injection for unit tests

### Infrastructure Services (`services/`)

**Database Service (`database_service.py`):**
```python
class DatabaseService:
    def __init__(self, db_config: Dict[str, str], logger=None, connection_pool=None):
        self.db_config = db_config
        self.connection_pool = connection_pool
```

**Core Capabilities:**
- **Animal CRUD Operations:** Create, read, update, delete with transaction management
- **Scrape Log Management:** Tracking scraper execution and metrics
- **Connection Management:** Database connection lifecycle with pooling
- **Data Standardization:** Breed, size, and age standardization utilities

**Additional Infrastructure Services:**
- **MetricsCollector:** Scraper performance and execution metrics
- **SessionManager:** HTTP session management for web scraping
- **ProgressTracker:** Real-time progress reporting for long-running operations
- **ImageProcessingService:** Image optimization and CDN integration
- **NullObjects:** Default implementations to eliminate conditional logic

### Service Integration Pattern

**Request Flow Example:**
```python
# Route handler
async def get_animals(
    filters: AnimalFilterRequest = Depends(),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    animal_service = AnimalService(cursor)  # Dependency injection
    return animal_service.get_animals(filters)  # Business logic execution
```

## Data Models and Validation

The application uses **Pydantic v2** for comprehensive data validation, serialization, and automatic API documentation generation. Models are organized by concern and support both request/response serialization and database mapping.

### Model Architecture (`api/models/`)

**Domain Models:**

**Animal Models (`dog.py`):**
```python
class AnimalStatus(str, Enum):
    AVAILABLE = "available"
    ADOPTED = "adopted"
    PENDING = "pending"
    UNAVAILABLE = "unavailable"

class AnimalWithImages(BaseModel):
    # Core animal attributes
    id: int
    slug: str
    name: str
    breed: Optional[str]
    standardized_breed: Optional[str]
    # Nested organization data
    organization: Optional[Organization]
    # Associated images
    images: List[AnimalImage]
```

**Organization Models (`organization.py`):**
```python
class Organization(BaseModel):
    id: int
    name: str
    slug: str
    country: Optional[str]
    website_url: Optional[HttpUrl]
    social_media: Optional[Dict[str, Any]]
    ships_to: Optional[List[str]]
```

**Request/Response Models:**

**Request Models (`requests.py`):**
```python
class AnimalFilterRequest(BaseModel):
    # Search and filtering
    search: Optional[str] = None
    breed: Optional[str] = None
    standardized_size: Optional[StandardizedSize] = None
    # Location and availability
    location_country: Optional[str] = None
    available_to_country: Optional[str] = None
    # Pagination and curation
    limit: int = Field(default=12, ge=1, le=100)
    curation_type: str = "random"
```

**Response Models (`responses.py`):**
```python
class FilterCountsResponse(BaseModel):
    size_options: List[FilterOption]
    age_options: List[FilterOption]
    breed_options: List[FilterOption]
    organization_options: List[FilterOption]
```

### Validation Features

**Advanced Validation:**
- **Field Validators:** Custom validation logic for complex fields
- **Model Validators:** Cross-field validation and business rules
- **Enum Constraints:** Strict enumeration validation for status fields
- **URL Validation:** HTTP URL validation with security considerations
- **Range Validation:** Numeric range constraints for pagination and limits

**Serialization Features:**
- **Alias Support:** Field aliasing for API backwards compatibility
- **Selective Serialization:** Include/exclude patterns for response optimization
- **Nested Model Support:** Complex object hierarchies with automatic validation
- **JSON Schema Generation:** Automatic OpenAPI/JSON Schema documentation

## Exception Handling Architecture

The application implements **comprehensive exception handling** with centralized error processing, structured logging, and consistent API responses across all endpoints.

### Custom Exception Hierarchy (`api/exceptions.py`)

**Base Exception Classes:**
```python
class APIException(HTTPException):
    def __init__(self, status_code: int, detail: str, error_code: Optional[str] = None):
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code

class DatabaseError(APIException):
    def __init__(self, detail: str, original_error: Optional[Exception] = None):
        super().__init__(
            status_code=500, 
            detail=f"Database error: {detail}", 
            error_code="DATABASE_ERROR"
        )
```

**Exception Types:**
- **DatabaseError:** PostgreSQL and connection pool errors
- **ValidationError:** Pydantic validation and business rule violations
- **NotFoundError:** Resource lookup failures
- **AuthenticationError:** Authentication and authorization failures

### Error Handling Patterns

**Safe Execution Decorator:**
```python
@safe_execute("fetch animal images")
def fetch_animal_primary_image(cursor: RealDictCursor, animal_id: int):
    # NOTE: Multi-image functionality (animal_images table) was removed
    # Now only primary_image_url is stored directly on animals table
    # Automatic exception handling and logging
    cursor.execute(query, params)
    return cursor.fetchall()
```

**Database Error Handling:**
```python
def handle_database_error(error: Exception, operation: str) -> None:
    if isinstance(error, psycopg2.Error):
        logger.error(f"Database error during {operation}: {error}")
        raise DatabaseError(f"Failed to {operation}", original_error=error)
```

### Error Response Format

**Standardized Error Responses:**
```json
{
  "detail": "Database error: Failed to fetch animals",
  "error_code": "DATABASE_ERROR",
  "status_code": 500
}
```

**HTTP Status Code Mapping:**
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `404` - Not Found (resource does not exist)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error (database/system errors)

### Logging and Monitoring

**Context-Aware Logging:**
- **Transaction Context:** Database transaction IDs for error correlation
- **Request Context:** Request IDs and user information
- **Error Context:** Stack traces and original error preservation
- **Performance Context:** Query execution times and connection pool status

## Dependency Injection System

The application leverages **FastAPI's native dependency injection** with custom dependency providers for clean separation of concerns and comprehensive testing support.

### Dependency Providers (`api/dependencies.py`)

**Database Cursor Dependencies:**
```python
def get_db_cursor() -> Generator[RealDictCursor, None, None]:
    """Traditional connection-per-request dependency."""
    try:
        conn = psycopg2.connect(**conn_params)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        yield cursor
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database error: {e}")
    finally:
        cursor.close()
        conn.close()

def get_pooled_db_cursor() -> Generator[RealDictCursor, None, None]:
    """Optimized connection pool dependency."""
    try:
        with get_pooled_cursor() as cursor:
            yield cursor
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pool error: {str(e)}")
```

**Connection Management Dependencies:**
```python
def get_database_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """Direct connection dependency for monitoring endpoints."""
    try:
        conn = psycopg2.connect(**conn_params)
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Connection error: {e}")
    finally:
        conn.close()
```

### Dependency Usage Patterns

**Route Handler Integration:**
```python
@router.get("/", response_model=List[AnimalWithImages])
async def get_animals(
    filters: AnimalFilterRequest = Depends(),  # Query parameter dependency
    cursor: RealDictCursor = Depends(get_db_cursor),  # Database dependency
):
    animal_service = AnimalService(cursor)
    return animal_service.get_animals(filters)
```

**Nested Dependencies:**
```python
# Query parameters automatically parsed as dependency
filters: AnimalFilterRequest = Depends()

# Database cursor with automatic transaction management
cursor: RealDictCursor = Depends(get_pooled_db_cursor)

# Service instantiation with injected dependencies
animal_service = AnimalService(cursor)
```

### Dependency Benefits

**Development Benefits:**
- **Automatic Resource Management:** Connection lifecycle handled by DI system
- **Clean Route Handlers:** Business logic separated from infrastructure concerns
- **Type Safety:** Full type hints for dependency injection
- **Error Handling:** Centralized exception handling in dependencies

**Testing Benefits:**
- **Mock Injection:** Easy mocking of database connections for unit tests
- **Isolated Testing:** Each test can provide custom dependency overrides
- **Resource Control:** Test-specific database configurations and connections

## Configuration Management

### Environment-Based Configuration (`config.py`)

The application implements **comprehensive configuration management** with environment-specific settings and runtime configuration validation.

**Configuration Architecture:**
```python
ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if ENVIRONMENT == "development" else "WARNING")

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "database": os.environ.get("DB_NAME", default_db_name),
    "user": os.environ.get("DB_USER", system_user),
    "password": os.environ.get("DB_PASSWORD"),
}
```

**Environment-Specific Features:**
- **Development:** Verbose logging, detailed error traces, hot reloading
- **Production:** Optimized logging levels, security headers, performance monitoring
- **Testing:** Isolated test database, suppressed service logging, mock dependencies

**CORS Configuration:**
```python
# Environment-specific CORS settings
ALLOWED_ORIGINS = ["http://localhost:3000"] if ENVIRONMENT == "development" else production_origins
CORS_ALLOW_CREDENTIALS = True if ENVIRONMENT == "development" else False
```

### Logging Configuration

**Centralized Logging Control:**
```python
def enable_world_class_scraper_logging():
    """Configure optimal logging for scraper operations."""
    suppress_service_logging()  # Reduce operational noise
    scraper_logger.setLevel(logging.INFO)  # Preserve progress tracking
```

**Service-Level Logging Suppression:**
- Database operation logging (INFO/DEBUG suppressed, WARNING/ERROR preserved)
- HTTP session logging (WebDriver Manager, Selenium noise reduction)
- Service operational logging (connection pool, metrics collector)

## Scraper Integration Architecture

### BaseScraper Framework (`scrapers/base_scraper.py`)

The backend integrates with a **modern scraper architecture** implementing multiple design patterns for robust data collection.

**Template Method Pattern:**
```python
class BaseScraper(ABC):
    def run(self) -> ScrapingResult:
        """Template method defining scraping workflow."""
        self._initialize_services()
        animals = self.scrape_animals()
        self._process_results(animals)
        return self._generate_metrics()
```

**Context Manager Integration:**
```python
# Modern scraper usage with automatic resource management
with MyScraper(config_id="organization-name") as scraper:
    result = scraper.run()  # Automatic connection management
```

**Service Injection:**
```python
scraper = MyScraper(
    config_id="org-name",
    metrics_collector=CustomMetricsCollector(),
    session_manager=CustomSessionManager(),
    database_service=CustomDatabaseService()
)
```

### Configuration-Driven Architecture

**Organization Configuration (`configs/organizations/*.yaml`):**
```yaml
organization:
  name: "Example Rescue"
  website_url: "https://example.com"
  country: "Country"
  
scraping:
  selectors:
    animal_cards: ".animal-card"
    name: ".animal-name"
    breed: ".breed-info"
```

**Configuration Loading:**
```python
class ConfigLoader:
    def load_config(self, config_id: str) -> Dict[str, Any]:
        """Load and validate organization configuration."""
        config_path = f"configs/organizations/{config_id}.yaml"
        return yaml.safe_load(open(config_path))
```

## Testing Architecture

### Test Isolation Strategy

The backend implements **comprehensive test isolation** with 434+ backend tests ensuring zero database contamination.

**Global Database Isolation (`tests/conftest.py`):**
```python
@pytest.fixture(autouse=True)
def isolate_database_writes():
    """Automatically protect all tests from database writes."""
    with patch('utils.organization_sync_service.create_default_sync_service'):
        with patch('scrapers.base_scraper.create_default_sync_service'):
            yield  # All tests run with database isolation
```

**Test Categories:**
- **Unit Tests:** Service layer testing with mocked dependencies
- **Integration Tests:** API endpoint testing with test database
- **Fast Tests:** `pytest -m "unit or fast"` for development feedback
- **CI Tests:** `pytest -m "not browser and not requires_migrations"` for pipeline

### Test Database Management

**Environment-Based Database Selection:**
```python
IS_TESTING = os.environ.get("TESTING") == "true"
default_db_name = "test_rescue_dogs" if IS_TESTING else "rescue_dogs"
```

**Test-Specific Configuration:**
- **Isolated Test Database:** Separate database for test execution
- **Mock Service Injection:** Automatic mocking of external services
- **Configuration Override:** Test-specific configuration values
- **Resource Cleanup:** Automatic cleanup of test resources

## Performance and Scalability

### Connection Pool Optimization

**Thread-Safe Connection Management:**
```python
self._pool = psycopg2.pool.ThreadedConnectionPool(
    minconn=2,      # Minimum connections maintained
    maxconn=20,     # Maximum concurrent connections
    **conn_params
)
```

**Performance Benefits:**
- **Connection Reuse:** Eliminates connection establishment overhead
- **Resource Control:** Prevents connection exhaustion under load
- **Automatic Scaling:** Dynamic connection allocation based on demand
- **Health Monitoring:** Real-time pool status for operational monitoring

### Query Optimization

**Batch Operations:**
```python
# Optimize image fetching with batch queries
images_by_animal = self.batch_executor.fetch_animals_with_images(animal_ids)
```

**Performance Features:**
- **Batch Image Fetching:** Single query for multiple animals' images
- **Selective Field Loading:** Only load required columns for performance
- **Query Result Caching:** Intelligent caching of metadata queries
- **Index-Optimized Queries:** Database queries optimized for existing indexes

## Security Architecture

### Middleware Security Stack

**Security Headers (`api/main.py`):**
```python
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin"
        })
        return response
```

**CORS Security:**
- **Origin Validation:** Environment-specific allowed origins
- **Credential Handling:** Secure credential policies for production
- **Method Restrictions:** Explicit allowed HTTP methods
- **Header Control:** Strict control over allowed request headers

### Data Validation Security

**Input Sanitization:**
- **Pydantic Validation:** Comprehensive input validation and sanitization
- **SQL Injection Prevention:** Parameterized queries throughout application
- **URL Validation:** Strict HTTP URL validation with security considerations
- **Enum Constraints:** Strict enumeration validation preventing invalid values

## Key Benefits

- **Clean Architecture:** Layered design with clear separation of concerns and dependency management
- **Type Safety:** Comprehensive type hints with Pydantic validation and PostgreSQL type mapping
- **Performance Optimization:** Connection pooling, batch operations, and query optimization
- **Testing Excellence:** 434+ backend tests with complete database isolation and comprehensive coverage
- **Configuration Management:** Environment-based configuration with validation and runtime flexibility
- **Error Resilience:** Comprehensive exception handling with structured logging and monitoring
- **Security Integration:** Multi-layered security with middleware, validation, and secure defaults
- **Scraper Integration:** Modern scraper architecture with dependency injection and resource management
- **Operational Monitoring:** Real-time health checks, connection pool monitoring, and performance metrics
- **Developer Experience:** Hot reloading, comprehensive logging, and development-optimized configuration