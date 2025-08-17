# Rescue Dog Aggregator - Technical Architecture

## System Overview

The Rescue Dog Aggregator is a production-ready platform aggregating rescue dog listings from multiple organizations into a unified, searchable interface. Built with Next.js 15.3.0, Python 3.13, FastAPI, and PostgreSQL, the system serves 8 rescue organizations with 1,500+ animal listings.

**Key Metrics**
- **Test Coverage**: 565+ test files (109 backend, 456 frontend)
- **Performance**: Core Web Vitals 95+, API responses <200ms
- **Architecture**: Configuration-driven, zero-code organization onboarding
- **Security**: Multi-layer validation, XSS prevention, secure headers

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                Frontend Layer (Next.js 15.3.0)                  │
│                    App Router Architecture                      │
├─────────────────────────────────────────────────────────────────┤
│  Server Components        │  Client Components                  │
│  • SEO & Metadata         │  • Interactive Search               │
│  • Static Generation      │  • Real-time State Management       │
│  • Image Optimization     │  • Progressive Web App Features     │
└─────────────────────┬────────────────────────────────────────────┘
                      │ RESTful API (JSON/HTTP)
┌─────────────────────▼────────────────────────────────────────────┐
│           Backend API Layer (FastAPI + Python 3.13)            │
├─────────────────────────────────────────────────────────────────┤
│  • OpenAPI 3.0 Documentation  │ • Pydantic v2 Validation      │
│  • Security Headers & CORS    │ • Async Request Handling      │
│  • Connection Pooling         │ • Structured Error Responses   │
└─────────────────────┬────────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────────┐
│            Configuration Management System                      │
├─────────────────────────────────────────────────────────────────┤
│  • YAML Organization Configs  │ • JSON Schema Validation       │
│  • Zero-Code Onboarding       │ • Hot-Reload Capability        │
└─────────────────────┬────────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────────┐
│           Web Scraping & Data Processing Pipeline              │
├─────────────────────────────────────────────────────────────────┤
│  • Template Method Pattern    │ • Data Standardization         │
│  • Dependency Injection       │ • Quality Scoring              │
│  • Context Manager Pattern    │ • Availability Tracking        │
└─────────────────────┬────────────────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────────────────┐
│             PostgreSQL 14+ Database Engine                     │
├─────────────────────────────────────────────────────────────────┤
│  • Normalized Schema Design   │ • JSONB Flexible Metadata      │
│  • Full-Text Search (GIN)     │ • Connection Pooling           │
│  • Strategic Indexing         │ • Alembic Migrations           │
└─────────────────────────────────────────────────────────────────┘
```

## Frontend Architecture (Next.js 15)

### App Router Structure

```
src/app/
├── layout.js                    # Root layout with metadata
├── page.jsx                     # Homepage (server component)
├── dogs/
│   ├── page.jsx                # Dogs listing
│   └── [slug]/                 # Dynamic dog routes
│       └── page.jsx            # Dog detail with metadata
├── organizations/
│   ├── page.jsx                # Organizations listing
│   └── [slug]/                 # Dynamic organization routes
└── api/                        # Minimal API routes
```

### Server Components (SEO-Optimized)

```javascript
// Dynamic metadata generation for SEO
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dog = await getAnimalBySlug(slug);
  
  return {
    title: `${dog.name} - ${dog.breed} Available for Adoption`,
    description: generateSEODescription(dog),
    openGraph: {
      images: [{ url: dog.primary_image_url }]
    }
  };
}

// Static generation for popular pages
export async function generateStaticParams() {
  const dogs = await getAllAnimals();
  return dogs.slice(0, 50).map(dog => ({ slug: dog.slug }));
}
```

### Component Library

- **UI Framework**: Tailwind CSS 3.3.2 + shadcn/ui
- **Core Components**: Button, Card, Input, Badge, Sheet
- **Specialized**: LazyImage, AnimatedCounter, CountryFlag, ShareButton
- **Business Components**: DogCard, OrganizationCard, FilterControls

### Performance Features

- **Image Optimization**: Cloudflare R2 + Images CDN
- **Progressive Loading**: IntersectionObserver for lazy loading
- **Component Memoization**: React.memo for expensive operations
- **Code Splitting**: Dynamic imports for route optimization

## Backend Architecture (FastAPI)

### Layered Architecture

```
Application Layer (main.py)
    ↓
Routes Layer (api/routes/)
    ↓
Services Layer (api/services/)
    ↓
Database Layer (api/database/)
    ↓
Models Layer (api/models/)
```

### API Endpoints

```
GET /api/animals                 # List with filtering
GET /api/animals/{id}            # Animal details
GET /api/organizations           # List organizations
GET /api/organizations/{id}      # Organization details
GET /health                      # Health check
POST /api/animals/filter-counts  # Filter option counts
```

### Database Connection Management

```python
class ConnectionPool:
    def __init__(self):
        self._pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2, maxconn=20, **conn_params
        )

@contextmanager
def get_pooled_cursor():
    with get_connection_pool().get_cursor() as cursor:
        yield cursor  # Automatic connection return
```

### Service Architecture

**AnimalService**: Advanced search, batch image fetching, statistics
**DatabaseService**: CRUD operations, scrape log management
**MetricsCollector**: Performance and execution metrics
**SessionManager**: HTTP session management for scraping

## Scraper Architecture

### Design Patterns

#### Template Method Pattern
```python
class BaseScraper(ABC):
    def run(self) -> Dict[str, Any]:
        return self._execute_scrape_phases()
    
    @abstractmethod  
    def collect_data(self) -> List[Dict[str, Any]]:
        pass  # Subclasses implement org-specific logic
```

#### Dependency Injection
```python
def __init__(self, config_id: str, metrics_collector=None, 
             session_manager=None, database_service=None):
    self.metrics_collector = metrics_collector or NullMetricsCollector()
    self.session_manager = session_manager or NullSessionManager()
```

#### Context Manager Pattern
```python
with MyScraper(config_id="org-name") as scraper:
    result = scraper.run()  # Automatic resource management
```

### Configuration-Driven System

```yaml
# configs/organizations/example.yaml
schema_version: "1.0"
id: "example-rescue"
name: "Example Rescue Organization"
scraper:
  class_name: "ExampleScraper"
  module: "scrapers.example.scraper"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
metadata:
  website_url: "https://example.org"
  location:
    country: "US"
  ships_to: ["US", "CA"]
```

## Data Standardization System

### Core Components

#### Breed Standardization
- **129+ breed mappings** across 9 breed groups
- Multi-language support (English, Spanish, German)
- Mix breed detection and categorization

#### Age Standardization
- Birth date parsing (MM/YYYY, YYYY formats)
- Natural language processing ("2 years", "puppy", "senior")
- Age category mapping (Puppy, Young, Adult, Senior)

#### Size Standardization
- Weight-based classification (primary)
- Text-based mapping (fallback)
- Breed-based estimation (last resort)

### Quality Scoring

```python
QUALITY_WEIGHTS = {
    "required_fields": 0.7,  # 70% weight
    "optional_fields": 0.3,  # 30% weight
}

# Score ranges:
# 0.85-1.0: Excellent - Ready for display
# 0.70-0.84: Good - Ready for display
# 0.50-0.69: Fair - Review recommended
# 0.0-0.49: Poor - Manual review required
```

### Availability Tracking

```
Session 1: Dog found → high confidence
Session 2: Dog not found → medium confidence
Session 3: Dog not found → low confidence
Session 4: Dog not found → unavailable (hidden)
```

## Database Schema

### Core Tables

```sql
CREATE TABLE animals (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id INTEGER NOT NULL,
    external_id VARCHAR(255),
    
    -- Original data
    breed VARCHAR(255),
    age_text VARCHAR(100),
    size VARCHAR(50),
    
    -- Standardized data
    standardized_breed VARCHAR(100),
    breed_group VARCHAR(50),
    age_min_months INTEGER,
    age_max_months INTEGER,
    standardized_size VARCHAR(50),
    
    -- Availability
    status VARCHAR(50) DEFAULT 'available',
    availability_confidence VARCHAR(20) DEFAULT 'high',
    consecutive_scrapes_missing INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE (external_id, organization_id)
);

CREATE TABLE organizations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    website_url VARCHAR(255),
    country VARCHAR(50),
    service_regions JSONB,
    ships_to JSONB,
    social_media JSONB,
    adoption_fees JSONB
);

CREATE TABLE scrape_logs (
    id SERIAL PRIMARY KEY,
    organization_id INTEGER NOT NULL,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(50) NOT NULL,
    dogs_found INTEGER,
    dogs_added INTEGER,
    dogs_updated INTEGER,
    detailed_metrics JSONB,
    data_quality_score NUMERIC(3,2)
);
```

### Performance Indexes

```sql
-- Filtering optimization
CREATE INDEX idx_animals_standardized_breed ON animals(standardized_breed);
CREATE INDEX idx_animals_breed_group ON animals(breed_group);
CREATE INDEX idx_animals_standardized_size ON animals(standardized_size);
CREATE INDEX idx_animals_age_range ON animals(age_min_months, age_max_months);

-- Availability tracking
CREATE INDEX idx_animals_availability_confidence ON animals(availability_confidence);
CREATE INDEX idx_animals_consecutive_missing ON animals(consecutive_scrapes_missing);

-- Full-text search
CREATE INDEX idx_animals_name_gin ON animals USING gin(to_tsvector('english', name));
CREATE INDEX idx_animals_breed_gin ON animals USING gin(to_tsvector('english', breed));
```

## Security Architecture

### Frontend Security
- **Content Security Policy**: Strict source restrictions
- **XSS Prevention**: DOMPurify sanitization
- **Secure Headers**: HSTS, X-Frame-Options, X-Content-Type-Options
- **URL Validation**: Protocol and domain verification

### Backend Security
- **Input Validation**: Pydantic v2 with custom validators
- **SQL Injection Prevention**: Parameterized queries
- **Rate Limiting**: Configurable per-endpoint limits
- **Error Handling**: Secure responses without information leakage

### Middleware Stack
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

## Testing Strategy

### Backend Testing (109 Test Files)
- **Unit Tests**: Service logic with mocked dependencies
- **Integration Tests**: API endpoints with test database
- **Fast Tests**: `pytest -m "unit or fast"` for development
- **CI Tests**: `pytest -m "not browser and not requires_migrations"`

### Frontend Testing (456 Test Files)
- **Unit Tests**: Component logic and utilities
- **Integration Tests**: User workflows and API interactions
- **E2E Tests**: Playwright for critical user journeys
- **Accessibility Tests**: WCAG 2.1 AA compliance with jest-axe

### Test Isolation
```python
@pytest.fixture(autouse=True)
def isolate_database_writes():
    """Automatically protect all tests from database writes."""
    with patch('utils.organization_sync_service.create_default_sync_service'):
        with patch('scrapers.base_scraper.create_default_sync_service'):
            yield  # All tests run with database isolation
```

## Performance Optimization

### Frontend Optimizations
- **Image CDN**: Cloudflare Images with on-the-fly transformation
- **Bundle Optimization**: Code splitting and tree shaking
- **Lazy Loading**: IntersectionObserver for progressive loading
- **Virtual Scrolling**: Infinite scroll for large lists

### Backend Optimizations
- **Connection Pooling**: 2-20 connections with ThreadedConnectionPool
- **Batch Operations**: Single query for multiple animals' images
- **Query Optimization**: Strategic indexing and selective field loading
- **Async Handlers**: FastAPI async/await for concurrent requests

### Scraper Performance
| Organization | Traditional | AJAX | Performance Gain |
|-------------|------------|------|-----------------|
| Santer Paws | 12 requests + 45 details | 1 request + 45 details | 12x fewer |
| Galgo del Sol | 40 requests + 200 details | 1 request + 200 details | 40x fewer |

## CI/CD Pipeline

### GitHub Actions Pipeline
```yaml
# Parallel execution stages
1. Backend Tests (Python 3.13 + PostgreSQL 14)
2. Frontend Tests (Node.js 18 + Jest + Playwright)
3. Lint & Format Validation (Black, isort, ESLint)
4. E2E Critical Tests (Playwright)
```

### Railway Deployment
- **Nixpacks Build**: Automatic dependency detection
- **Zero-Downtime**: Rolling updates with health checks
- **SSL/TLS**: Automatic certificate management
- **Database**: Managed PostgreSQL with automated backups

## Monitoring & Operations

### Health Monitoring
```python
GET /health            # Basic health check
GET /api/health        # Comprehensive health with database

# Response includes:
# - Connection pool status
# - Database connectivity
# - Environment information
# - Performance metrics
```

### Weekly Scraping Automation
```bash
# Production cron (weekly at 2 AM Monday)
0 2 * * 1 python management/config_commands.py run-all

# Available commands:
python management/config_commands.py list      # List organizations
python management/config_commands.py sync      # Sync configurations
python management/config_commands.py run [id]  # Run specific scraper
```

### Data Quality Monitoring
```bash
# Overall quality assessment
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=overall --all

# Organization-specific analysis
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=detailed --org-id=26
```

## Development Workflow

### Test-Driven Development (TDD)
```bash
# Step 1: Write failing test
pytest tests/new_feature/test_feature.py -v  # EXPECTED: FAILED

# Step 2: Implement minimal code
# ... implement feature ...

# Step 3: Confirm test passes
pytest tests/new_feature/test_feature.py -v  # EXPECTED: PASSED

# Step 4: Refactor with confidence
pytest tests/new_feature/ -v  # All tests pass
```

### Code Standards
- **Immutable Data**: No mutations, functional patterns
- **Pure Functions**: Single responsibility, no side effects
- **Small Functions**: One clear purpose per function
- **Self-Documenting**: Clear naming, no comments needed
- **Early Returns**: Avoid nested conditionals

### Quality Gates
- ✅ All 565+ tests passing
- ✅ Zero linting errors
- ✅ Type checking validation
- ✅ No duplicate files (frontend)
- ✅ Database migration compatibility
- ✅ Security vulnerability scanning

## Configuration Management

### Environment-Based Settings
```python
ENVIRONMENT = os.getenv("ENVIRONMENT", "development")
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO" if ENVIRONMENT == "development" else "WARNING")

DB_CONFIG = {
    "host": os.environ.get("DB_HOST", "localhost"),
    "database": os.environ.get("DB_NAME", default_db_name),
    "user": os.environ.get("DB_USER", system_user),
    "password": os.environ.get("DB_PASSWORD"),
}
```

### CORS Configuration
```python
ALLOWED_ORIGINS = ["http://localhost:3000"] if ENVIRONMENT == "development" else production_origins
CORS_ALLOW_CREDENTIALS = True if ENVIRONMENT == "development" else False
```

## Key Architectural Decisions

### Why Custom SQL Over ORM
- **Performance**: Fine-grained control over queries
- **Flexibility**: Complex queries with window functions
- **Transparency**: Explicit SQL for debugging
- **Batch Operations**: Optimized bulk operations

### Why Configuration-Driven Design
- **Zero-Code Onboarding**: Add organizations without coding
- **Environment Flexibility**: Different settings per deployment
- **Hot Reloading**: Configuration changes without restarts
- **Schema Validation**: Prevents configuration errors

### Why Template Method Pattern for Scrapers
- **Consistency**: All scrapers follow same flow
- **Maintainability**: Core logic centralized
- **Extensibility**: Easy to add new phases
- **Testing**: Predictable behavior patterns

## Future Enhancements

### Immediate Priorities (Q1-Q2 2025)
- Enhanced search with AI-powered matching
- Progressive Web App with offline support
- Advanced analytics and adoption metrics
- Multi-language internationalization

### Long-Term Vision (2026+)
- Microservices architecture migration
- Real-time updates with WebSockets
- Machine learning for breed identification
- Global multi-region deployment

---

This architecture represents a production-ready platform combining modern web technologies with enterprise-grade patterns. Built with zero-technical-debt methodology and comprehensive testing, the system is designed for scale, reliability, and maintainability while serving the mission of connecting rescue dogs with loving homes.