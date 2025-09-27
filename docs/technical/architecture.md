# Technical Architecture Documentation

## System Overview

The Rescue Dog Aggregator is a full-stack web application that aggregates rescue dog listings from multiple organizations into a unified, searchable platform. The system follows a service-oriented monolithic architecture with clear separation of concerns and AI-powered enrichment capabilities.

### Core Architecture Principles

1. **Configuration-Driven Design**: Organizations defined via YAML configurations
2. **Test-Driven Development**: 434+ backend tests, 1,249+ frontend tests
3. **Pure Functions & Immutability**: No side effects, no mutations
4. **Service Layer Pattern**: Business logic isolated from API handlers
5. **AI-Powered Enrichment**: LLM integration for personality profiling and matching
6. **Connection Pooling**: Efficient database resource management
7. **Progressive Enhancement**: SEO-optimized server rendering with client interactivity

## Technology Stack

### Backend

- **Framework**: FastAPI (Python 3.9+)
- **Database**: PostgreSQL 15 with async drivers
- **ORM**: SQLAlchemy with Alembic migrations
- **Testing**: pytest with comprehensive fixtures
- **Async**: asyncio/asyncpg for concurrent operations
- **Validation**: Pydantic models with strict typing
- **LLM Integration**: OpenRouter API (Google Gemini 2.5 Flash primary, GPT-4 fallback)
- **Connection Pool**: Custom async pool manager (10-30 connections)

### Frontend

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.x with strict mode
- **Styling**: Tailwind CSS 3.x with custom design system
- **Testing**: Jest + React Testing Library + Playwright
- **State Management**: React Context + Server Components + URL state
- **Components**: Custom UI library with shadcn/ui patterns
- **Image Optimization**: FallbackImage component with multi-level fallback strategy

### Infrastructure

- **API Hosting**: Railway (PostgreSQL + FastAPI)
- **Frontend Hosting**: Vercel (Next.js with edge functions)
- **Monitoring**: Sentry (dev + prod environments)
- **CI/CD**: GitHub Actions (3-tier pipeline)
- **LLM Provider**: OpenRouter for AI processing
- **DNS/CDN**: Cloudflare for www.rescuedogs.me
- **Image Storage**: Cloudflare R2 (images.rescuedogs.me) with fallback strategy

## System Components

### 1. API Layer (`/api`)

#### Core Components

- `api/main.py`: FastAPI application initialization, CORS, middleware, Sentry
- `api/routes/`: RESTful endpoints organized by domain (9 route modules)
- `api/async_dependencies.py`: Async dependency providers with transaction management
- `api/exceptions.py`: Standardized error handling
- `api/config.py`: Environment configuration management

#### Route Modules

##### `/api/animals` (16 endpoints)
- `GET /`: Search with advanced filtering (breed, size, age, location)
- `GET /{id}`: Individual animal details
- `GET /breeds`: Unique breeds with counts
- `GET /stats`: Aggregate statistics
- `GET /recent`: Recently added animals
- `GET /random`: Random selection
- `POST /bulk`: Bulk operations

##### `/api/enhanced_animals` (6 endpoints)
- `GET /`: Enhanced data with AI profiles
- `GET /{id}`: Enhanced individual details
- `GET /attributes`: Available filter attributes
- `GET /bulk`: Batch enhanced data
- `GET /search`: AI-powered semantic search
- `GET /similar`: Find similar dogs

##### `/api/organizations` (6 endpoints)
- `GET /`: List active organizations
- `GET /{id}`: Organization details
- `GET /{id}/dogs`: Organization's animals
- `GET /enhanced`: Organizations with metrics
- `GET /stats`: Organization statistics
- `GET /recent-dogs`: New arrivals per org

##### `/api/swipe` (2 endpoints)
- `GET /stack`: Personalized dog stack (10-20 dogs)
- `GET /countries`: Available service regions

##### `/api/llm` (5 endpoints)
- `POST /enrich`: Single dog enrichment
- `POST /batch-enrich`: Batch processing
- `POST /translate`: Multi-language translation
- `GET /stats`: LLM usage metrics
- `POST /clean-description`: Text sanitization

##### `/api/monitoring` (7 endpoints)
- `GET /scrapers`: Scraper status and metrics
- `GET /failures`: Error tracking
- `GET /performance`: Latency metrics
- `GET /alerts`: System alerts
- `GET /health`: Health check
- `GET /metrics`: Business metrics
- `POST /log`: Client-side logging

##### `/api/sitemap` (2 endpoints)
- `GET /xml`: Dynamic XML sitemap
- `GET /index`: Sitemap index

##### `/api/sentry-test` (7 endpoints)
- Debug endpoints for Sentry integration testing

#### Middleware & Error Handling

- CORS configuration for multiple origins
- Sentry error tracking with custom context
- Request ID generation for tracing
- Rate limiting per endpoint
- Standardized error responses:
  - `InvalidInputError`: 400 responses
  - `NotFoundError`: 404 responses
  - `ServiceUnavailableError`: 503 responses
  - `RateLimitError`: 429 responses

### 2. Service Layer (`/services`)

#### Core Services (13 root files)

##### DatabaseService (`database_service.py`)
- **Purpose**: Central database connection management
- **Features**:
  - Async connection pool (10-30 connections)
  - Automatic retry with exponential backoff
  - Transaction context managers
  - Query performance tracking
  - Connection health monitoring

##### ConnectionPool (`connection_pool.py`)
- **Purpose**: Enhanced connection pooling
- **Features**:
  - Dynamic pool sizing
  - Connection validation
  - Metrics collection
  - Graceful degradation

##### MetricsCollector (`metrics_collector.py`)
- **Purpose**: System and business metrics aggregation
- **Metrics**:
  - Query performance (p50, p95, p99)
  - API endpoint latencies
  - Business KPIs (dogs viewed, searches, adoptions)
  - LLM processing metrics
- **Storage**: In-memory with periodic PostgreSQL persistence

##### SessionManager (`session_manager.py`)
- **Purpose**: User session and preference management
- **Features**:
  - UUID-based session tokens
  - Preference storage (filters, favorites)
  - Activity tracking for analytics
  - Session expiry management

##### AdoptionDetection (`adoption_detection.py`)
- **Purpose**: Detect and track adopted dogs
- **Algorithm**:
  - Pattern matching for adoption keywords
  - Image availability checking
  - Availability confidence scoring (high/medium/low/adopted)
  - Historical tracking with timestamps

##### ImageProcessingService (`image_processing_service.py`)
- **Purpose**: Image optimization and validation
- **Operations**:
  - URL validation and availability checking
  - Format detection (JPEG, PNG, WebP)
  - Dimension extraction for responsive loading
  - Thumbnail generation metadata
  - CDN URL transformation

##### ProgressTracker (`progress_tracker.py`)
- **Purpose**: Track long-running operations
- **Use Cases**:
  - Scraper progress monitoring
  - Batch LLM processing
  - Migration status

##### NullObjects (`null_objects.py`)
- **Pattern**: Null Object Pattern for safe defaults
- **Components**:
  - `NullDog`: Default animal representation
  - `NullOrganization`: Empty org object
  - `NullMetrics`: Zero-value metrics
  - `NullSession`: Anonymous session

##### Models (`models.py`)
- **Purpose**: Pydantic models for data validation
- **Categories**:
  - Request/Response DTOs
  - Database models
  - LLM schemas

##### Config (`config.py`)
- **Purpose**: Service configuration
- **Includes**:
  - Database settings
  - API keys management
  - Feature flags

#### LLM Service Pipeline (`/services/llm/` - 19 files)

##### Core Pipeline Components

###### DogProfiler (`dog_profiler.py`)
**Main orchestrator for the profiling pipeline:**
```python
Pipeline Flow:
1. Load organization config
2. Build prompt from template
3. Call LLM with retry logic
4. Parse and validate response
5. Normalize extracted data
6. Update database with profile
```

###### LLMClient (`llm_client.py`)
**API integration layer:**
- OpenRouter API management
- Model selection (Gemini 2.5 Flash primary, GPT-4 fallback)
- Request/response handling
- Cost tracking per request
- Timeout management (30s default)

###### PromptBuilder (`prompt_builder.py`)
**Dynamic prompt generation:**
- Organization-specific templates
- Multi-language support
- Variable interpolation
- Context window optimization

###### RetryHandler (`retry_handler.py`)
**Resilient API calling:**
- Exponential backoff (3 attempts)
- Model fallback on failure
- Rate limit handling
- Circuit breaker pattern

##### Data Processing Components

###### FieldNormalizers (`field_normalizers.py`)
**Data standardization:**
- Age normalization (text to ranges)
- Size standardization (small/medium/large/xlarge)
- Breed cleaning and mapping
- Gender normalization
- Location parsing

###### ProfileNormalizer (`normalizers/profile_normalizer.py`)
**Profile structure validation:**
- Schema enforcement
- Missing field handling
- Type coercion
- Confidence scoring

###### ExtractedProfileNormalizer (`normalizers/extracted_profile_normalizer.py`)
**LLM output processing:**
- JSON extraction from text
- Markdown parsing
- Error recovery
- Partial data handling

##### Database Integration

###### DatabaseUpdater (`database_updater.py`)
**Profile persistence:**
- Batch update operations
- JSONB field management
- Timestamp tracking
- Transaction handling
- Connection pool usage

###### AsyncDatabasePool (`async_database_pool.py`)
**Dedicated LLM pool:**
- Separate connection pool for LLM operations
- Priority queue for batch processing
- Connection recycling

##### Monitoring & Quality

###### Monitoring (`monitoring.py`)
**LLM pipeline metrics:**
- Success/failure rates
- Processing time per dog
- Cost tracking ($0.0015/dog average)
- Model usage distribution
- Quality scores

###### QualityRubric (`quality_rubric.py`)
**Profile quality assessment:**
- Completeness scoring
- Consistency checks
- Language quality
- Information density

###### ScraperIntegration (`scraper_integration.py`)
**Auto-profiling hooks:**
- Post-scrape triggers
- Batch queuing
- Priority handling

### 3. Data Layer

#### Database Schema

##### Core Tables

```sql
-- Main animal data table
animals (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR UNIQUE NOT NULL,
  organization_id INTEGER REFERENCES organizations(id),
  
  -- Basic Information
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE,
  breed VARCHAR,
  age_text VARCHAR,
  size VARCHAR CHECK (size IN ('small', 'medium', 'large', 'xlarge')),
  gender VARCHAR CHECK (gender IN ('male', 'female', 'unknown')),
  
  -- Status Management
  status VARCHAR DEFAULT 'available',
  availability_confidence VARCHAR DEFAULT 'high',
  
  -- Breed Standardization (NEW)
  breed_confidence VARCHAR(50),
  breed_type VARCHAR(50),
  primary_breed VARCHAR(100),
  secondary_breed VARCHAR(100),
  
  -- JSON Storage
  properties JSONB,           -- Raw scraped data
  photos JSONB,              -- Image URLs and metadata
  dog_profiler_data JSONB,   -- AI-generated profile
  translations JSONB,         -- Multi-language content
  adoption_fees JSONB,        -- Fee structure
  
  -- LLM Enrichment
  enriched_description TEXT,
  llm_processed_at TIMESTAMP,
  llm_model_used VARCHAR,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP,
  
  -- Indexes
  INDEX idx_animals_organization (organization_id),
  INDEX idx_animals_status (status),
  INDEX idx_animals_availability (availability_confidence),
  INDEX idx_animals_breed (breed),
  INDEX idx_animals_slug (slug)
)

-- Organizations table
organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  slug VARCHAR UNIQUE,
  website VARCHAR,
  config_id VARCHAR,          -- Links to YAML config
  
  -- Status
  active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  
  -- Metrics (NEW)
  total_dogs INTEGER DEFAULT 0,
  new_this_week INTEGER DEFAULT 0,
  recent_dogs JSONB,          -- Recent additions
  
  -- Shipping/Service (NEW)
  ships_to JSONB,             -- Array of countries
  service_regions JSONB,      -- Service areas
  adoption_fees JSONB,        -- Default fee structure
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
)

-- Performance Indexes
CREATE GIN INDEX idx_animals_properties ON animals USING GIN(properties);
CREATE GIN INDEX idx_animals_profiler ON animals USING GIN(dog_profiler_data);
CREATE GIN INDEX idx_animals_photos ON animals USING GIN(photos);
CREATE INDEX idx_animals_updated ON animals(updated_at DESC);
CREATE INDEX idx_org_active ON organizations(active) WHERE active = true;
```

#### Migration Strategy

- **Tool**: Alembic with environment-specific migrations
- **Locations**: 
  - `/migrations/versions/`: Development migrations
  - `/migrations/railway/versions/`: Production migrations
- **Features**:
  - Automatic migration on deployment
  - Version-controlled schema changes
  - Rollback capability
  - Data migration scripts

### 4. Scraper System (`/scrapers`)

#### Architecture

- **Base Classes**: `BaseScraper` with standardized interface
- **Organization Scrapers**: 14 active implementations
- **Unified Standardization**: Common data format across all scrapers
- **LLM Integration**: Optional auto-profiling during scraping
- **Resilience**: Retry logic, error recovery, partial data handling

#### Active Organizations (14)

1. Many Tears Animal Rescue (UK)
2. Tierschutzverein Europa (Germany)
3. The Underdog International (Malta)
4. REAN (Romania)
5. Daisy Family Rescue (Greece)
6. Wild at Heart Foundation (International)
7. DogSOS (Sri Lanka)
8. Romanian Rescue Appeal (Romania)
9. Sava's Safe Haven (Serbia)
10. Woof Project (UK)
11. ACE Charity (Spain)
12. Asociación San Antón (Spain)
13. Romanian K9 Rescue (Romania)
14. Pets in Turkey (Turkey) [NEW]

#### Scraper Components

```python
scrapers/
├── base_scraper.py               # Abstract base class
├── unified_standardization.py    # Data normalization
├── scraper_factory.py            # Dynamic loader
├── many_tears.py                 # Example implementation
│   ├── parser.py                # HTML parsing
│   ├── normalizer.py            # Data cleaning
│   └── validator.py             # Data validation
└── [13 more organization scrapers]
```

### 5. Frontend Architecture (`/frontend`)

#### Next.js 15 App Router Structure

```
frontend/src/
├── app/                          # App Router pages
│   ├── layout.tsx               # Root layout with providers
│   ├── page.tsx                 # Home page (/)
│   ├── dogs/
│   │   ├── [id]/                # Dynamic dog details
│   │   └── page.tsx             # Dog listing
│   ├── swipe/                   # Tinder-like interface
│   ├── favorites/               # User favorites
│   │   └── compare/             # Side-by-side comparison
│   ├── breeds/
│   │   ├── page.tsx             # Breed directory
│   │   ├── [breed]/             # Breed details
│   │   └── mixed/               # Mixed breeds section [NEW]
│   ├── organizations/
│   │   ├── page.tsx             # Org directory
│   │   └── [slug]/              # Org details
│   ├── about/                   # About page [NEW]
│   ├── sitemap.xml/             # Dynamic sitemap [NEW]
│   ├── test-images/             # Image testing [NEW]
│   ├── sentry-test/             # Error tracking test [NEW]
│   └── dev/                     # Development tools [NEW]
│       ├── components/          # Component gallery
│       └── performance/         # Performance testing
├── components/
│   ├── breeds/                  # Breed-specific UI
│   │   ├── BreedCard.tsx
│   │   ├── BreedGrid.tsx
│   │   └── BreedFilter.tsx
│   ├── dogs/                    # Dog components
│   │   ├── DogCard.tsx
│   │   ├── DogGrid.tsx
│   │   ├── DogDetail.tsx
│   │   ├── PersonalityTraits.tsx
│   │   └── AdoptionBadge.tsx
│   ├── favorites/               # Favorites management
│   │   ├── FavoriteButton.tsx
│   │   ├── FavoritesList.tsx
│   │   └── CompareMode.tsx
│   ├── filters/                 # Search & filtering
│   │   ├── FilterBar.tsx
│   │   ├── SearchInput.tsx
│   │   ├── AdvancedFilters.tsx
│   │   └── FilterChips.tsx
│   ├── home/                    # Homepage components
│   │   ├── HeroSection.tsx
│   │   ├── FeaturedDogs.tsx
│   │   └── Statistics.tsx
│   ├── layout/                  # Layout components
│   │   ├── Header.tsx
│   │   ├── Footer.tsx
│   │   ├── Navigation.tsx
│   │   └── MobileMenu.tsx
│   ├── monitoring/              # Error & performance
│   │   ├── ErrorBoundary.tsx
│   │   ├── SentryProvider.tsx
│   │   └── PerformanceMonitor.tsx
│   ├── organizations/           # Org components
│   │   ├── OrgCard.tsx
│   │   ├── OrgGrid.tsx
│   │   └── OrgStats.tsx
│   ├── search/                  # Search interface
│   │   ├── SearchBar.tsx
│   │   ├── SearchResults.tsx
│   │   └── SearchFilters.tsx
│   ├── seo/                     # SEO components
│   │   ├── MetaTags.tsx
│   │   ├── StructuredData.tsx
│   │   └── OpenGraph.tsx
│   ├── swipe/                   # Swipe interface
│   │   ├── SwipeCard.tsx
│   │   ├── SwipeStack.tsx
│   │   ├── SwipeControls.tsx
│   │   └── SwipePreferences.tsx
│   └── ui/                      # Reusable UI
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Skeleton.tsx
│       ├── Toast.tsx
│       └── FallbackImage.tsx    # Multi-level image fallback
├── hooks/                        # Custom React hooks
│   ├── useApi.ts
│   ├── useFavorites.ts
│   ├── useInfiniteScroll.ts
│   ├── useDebounce.ts
│   └── useLocalStorage.ts
├── lib/                          # Utilities
│   ├── api-client.ts
│   ├── constants.ts
│   ├── formatters.ts
│   └── validators.ts
├── types/                        # TypeScript definitions
│   ├── api.ts
│   ├── dog.ts
│   ├── organization.ts
│   └── user.ts
└── styles/                       # Global styles
    ├── globals.css
    └── tailwind.css
```

#### Key Frontend Features

- **Server Components**: Default for data fetching
- **Client Components**: Interactive features (swipe, filters)
- **Streaming SSR**: Progressive page loading
- **Parallel Data Fetching**: Multiple queries in parallel
- **Image Optimization**: Multi-level fallback strategy for resilience
- **SEO**: Dynamic meta tags, sitemaps, structured data
- **Error Handling**: Sentry integration with error boundaries
- **Responsive Design**: Mobile-first with Tailwind breakpoints
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

#### Image Fallback Strategy

The application implements a robust **FallbackImage** component to handle Vercel image transformation quota exhaustion:

**Fallback Levels:**
1. **Primary**: Next.js Image with Vercel transformations
2. **Level 1**: Cloudflare R2 with Image Resizing (`/cdn-cgi/image/`)
3. **Level 2**: Direct R2 URL without transformations
4. **Level 3**: Local placeholder image (`/placeholder_dog.svg`)
5. **Level 4**: Emoji fallback (🐕)

**Configuration:**
- `R2_CUSTOM_DOMAIN`: Configurable via environment variable (default: `images.rescuedogs.me`)
- `R2_IMAGE_PATH`: Configurable bucket path (default: `rescue_dogs`)
- Automatic detection and optimization bypass for R2 images

**Integration Points:**
- ImageCarousel (swipe interface)
- SwipeCard (Tinder-like cards)
- ComparisonView (favorites comparison)
- BreedPhotoGallery (breed galleries)
- BreedDetailClient (breed detail pages)

### 6. Configuration Management (`/configs`)

#### Organization Configurations

```yaml
# configs/many_tears.yaml
id: many_tears
name: Many Tears Animal Rescue
website: https://www.manytearsrescue.org
scraper_class: ManyTearsScraper
llm_enabled: true
active: true
ships_to: ["UK", "IE"]
update_frequency: daily
```

#### LLM Configurations

```yaml
# configs/llm_organizations.yaml
organizations:
  11:
    name: "Tierschutzverein Europa"
    prompt_file: "tierschutzverein_europa.yaml"
    source_language: "de"
    target_language: "en"
    model_preference: "gemini-flash"
```

#### Prompt Templates

```yaml
# prompts/organizations/many_tears.yaml
system_prompt: |
  You are analyzing rescue dog profiles...
user_prompt: |
  Extract personality traits from: {description}
```

### 7. Management Commands (`/management`)

#### Available Commands

- **config_commands.py**
  - `list`: List all organizations
  - `sync`: Sync configs to database
  - `validate`: Validate YAML configs
  - `profile --org-id X`: Run LLM profiling

- **llm_commands.py**
  - `generate-profiles`: Batch enrichment
  - `validate-profiles`: Quality check
  - `retry-failed`: Retry failed enrichments
  - `cost-report`: LLM cost analysis

- **emergency_operations.py**
  - `--reset-stale-data`: Clean stale records
  - `--fix-duplicates`: Remove duplicates
  - `--rebuild-indexes`: Database optimization
  - `--restore-backup`: Emergency recovery

- **batch_processor.py**
  - Efficient bulk operations
  - Parallel processing
  - Progress tracking

## Data Flow Architecture

### 1. Scraping & Enrichment Pipeline

```mermaid
graph LR
    A[YAML Config] --> B[Scraper Activation]
    B --> C[Data Extraction]
    C --> D[Parser/Normalizer]
    D --> E[Unified Standardization]
    E --> F[Deduplication Check]
    F --> G[Database Storage]
    G --> H[LLM Enrichment Queue]
    H --> I[Profile Generation]
    I --> J[Quality Validation]
    J --> K[JSONB Update]
    K --> L[API Availability]
```

### 2. User Request Flow

```mermaid
graph TB
    A[Browser Request] --> B[Next.js Server Component]
    B --> C{Data Source}
    C -->|API| D[FastAPI Backend]
    C -->|Direct| E[PostgreSQL]
    D --> F[Async Dependencies]
    F --> G[Service Layer]
    G --> H[Connection Pool]
    H --> E
    E --> I[Response Transform]
    I --> B
    B --> J[React Hydration]
```

### 3. LLM Processing Pipeline

```mermaid
graph TD
    A[Raw Dog Data] --> B[Organization Config]
    B --> C[Prompt Builder]
    C --> D[LLM Client]
    D --> E{Primary Model}
    E -->|Success| F[Response Parser]
    E -->|Failure| G[Fallback Model]
    G --> F
    F --> H[Field Normalizers]
    H --> I[Profile Normalizer]
    I --> J[Quality Rubric]
    J --> K[Database Updater]
    K --> L[Monitoring/Metrics]
```

## CI/CD Pipeline

### GitHub Actions Workflows (3-Tier System)

#### Tier 1: Developer Loop (`tier1-developer.yml`)
**Trigger**: Every push
**Duration**: 2-3 minutes
**Tests**: Unit tests, fast integration tests
```yaml
- Python: pytest -m "unit or fast" --maxfail=5
- JavaScript: npm test -- --maxWorkers=4
- Linting: ruff check, ESLint
```

#### Tier 2: CI Pipeline (`tier2-ci-pipeline.yml`)
**Trigger**: Pull requests
**Duration**: 5-8 minutes
**Tests**: Extended integration tests
```yaml
- Python: pytest -m "not slow and not browser"
- JavaScript: npm test -- --coverage
- Build verification: npm run build
- Type checking: tsc --noEmit
```

#### Tier 3: Pre-Merge (`tier3-pre-merge.yml`)
**Trigger**: Before merge to main
**Duration**: 10-15 minutes
**Tests**: Full test suite
```yaml
- Python: pytest (all tests)
- JavaScript: npm test -- --coverage --maxWorkers=2
- E2E: Playwright tests
- Security: dependency scanning
- Performance: Lighthouse CI
```

#### Additional Workflows

- **auto-format.yml**: Automatic code formatting
- **tests.yml**: Manual full test run

### Deployment Pipeline

```
GitHub Main Branch → Vercel (Frontend) + Railway (Backend)
                  ↓
            Automatic Migrations
                  ↓
            Health Checks
                  ↓
            Rollback on Failure
```

## Performance Optimizations

### Database Performance

- **Connection Pooling**: 10-30 async connections with health checks
- **Query Optimization**:
  - GIN indexes on all JSONB columns
  - Compound indexes for common queries
  - Materialized views for aggregates
  - Query result caching (5-minute TTL)
- **Batch Operations**: 
  - Bulk inserts (100 records/batch)
  - Cursor-based pagination
  - Parallel query execution
- **Monitoring**: Query performance tracking (p50, p95, p99)

### API Performance

- **Async Everything**: Full async/await stack
- **Response Strategies**:
  - Pagination: Cursor-based for large datasets
  - Caching: ETags and conditional requests
  - Compression: gzip for responses > 1KB
- **Query Optimization**: 
  - Selective field loading
  - Eager loading for relationships
  - Query result streaming

### Frontend Performance

- **Rendering Strategy**:
  - Static Generation: Homepage, about
  - ISR: Dog pages (revalidate: 3600)
  - SSR: Search results
  - CSR: Interactive features (swipe)
- **Optimization Techniques**:
  - Image: Multi-level fallback with R2 and Cloudflare transformations
  - Bundle: Route-based code splitting
  - Fonts: Variable fonts with subsetting
  - CSS: Tailwind purging
- **Loading Performance**:
  - Link prefetching
  - Resource hints (preconnect, dns-prefetch)
  - Progressive enhancement
  - Skeleton screens
- **Image Resilience**:
  - Automatic fallback during Vercel quota exhaustion
  - Progressive degradation through multiple CDN sources
  - Graceful handling of failed image loads
  - Bypass Next.js optimization for R2 images to reduce costs

### LLM Optimization

- **Processing Strategy**:
  - Batch: 5 dogs concurrently
  - Model: Gemini 2.5 Flash (speed/cost balance)
  - Caching: Template reuse
  - Fallback: GPT-4 on Gemini failure
- **Cost Management**:
  - Average: $0.0015/dog
  - Daily limit: $50
  - Monitoring: Real-time cost tracking
- **Quality Control**:
  - Retry logic: 3 attempts with backoff
  - Validation: Schema enforcement
  - Scoring: Quality rubric assessment

## Testing Strategy

### Backend Testing

#### Test Categories (pytest markers)

```python
@pytest.mark.unit         # Pure logic tests
@pytest.mark.fast         # < 1 second tests
@pytest.mark.integration  # API/DB tests
@pytest.mark.slow         # > 5 second tests
@pytest.mark.browser      # Selenium tests
```

#### Test Organization

```
tests/
├── api/                  # API endpoint tests
│   ├── test_animals.py
│   ├── test_organizations.py
│   ├── test_swipe.py
│   └── test_llm.py
├── scrapers/            # Scraper tests
│   └── [org]/test_*.py
├── services/            # Service layer tests
│   ├── test_database_service.py
│   └── llm/test_dog_profiler.py
├── security/            # Security tests
│   └── test_injection.py
├── resilience/          # Error handling
│   └── test_circuit_breaker.py
└── conftest.py          # Global fixtures
```

### Frontend Testing

#### Test Types

- **Unit Tests**: Component logic (Jest)
- **Integration Tests**: User flows (Testing Library)
- **E2E Tests**: Critical paths (Playwright)
- **Visual Tests**: Component snapshots
- **Performance Tests**: Core Web Vitals

#### Test Organization

```
frontend/
├── __tests__/
│   ├── components/
│   ├── hooks/
│   └── utils/
├── e2e/
│   ├── swipe.spec.ts
│   └── search.spec.ts
└── jest.config.js
```

## Monitoring & Observability

### Sentry Integration

#### Error Tracking
- Frontend and backend errors
- Source maps for production
- User context attachment
- Custom breadcrumbs

#### Performance Monitoring
- Transaction tracing
- Database query performance
- API endpoint latency
- Frontend Core Web Vitals

#### Configuration
```python
# Backend
sentry_sdk.init(
    dsn=SENTRY_DSN,
    environment="production",
    traces_sample_rate=0.1,
    profiles_sample_rate=0.1
)

# Frontend
Sentry.init({
    dsn: SENTRY_DSN,
    environment: "production",
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1
})
```

### Application Metrics

#### Business Metrics
- Dogs viewed/searched/favorited
- Adoption inquiries
- User sessions
- Organization performance

#### Technical Metrics
- API latency (p50, p95, p99)
- Database connection pool stats
- Cache hit rates
- LLM success rates

## Security Architecture

### Authentication & Authorization

- **Session Management**: 
  - UUID tokens (128-bit)
  - 30-day expiry
  - Secure cookie storage
- **API Security**:
  - Rate limiting (100 req/min)
  - CORS with explicit origins
  - Request validation
- **Admin Features**:
  - Role-based access control
  - Audit logging
  - IP whitelisting

### Data Protection

- **Input Validation**:
  - Pydantic models with strict types
  - SQL injection prevention (parameterized queries)
  - XSS protection (auto-escaping)
- **Secrets Management**:
  - Environment variables
  - Never in code or configs
  - Rotation reminders
- **Network Security**:
  - HTTPS only (SSL/TLS)
  - HSTS headers
  - CSP headers
- **Privacy**:
  - No PII storage
  - Anonymous analytics
  - GDPR compliance ready

## Scalability Architecture

### Current Scale

- **Data Volume**: 2,500+ dog profiles
- **Organizations**: 14 active scrapers
- **Traffic**: 20+ daily active users
- **Performance**: 
  - API: <200ms response time
  - Frontend: 95+ Lighthouse score
  - LLM: 90% success rate

### Scaling Strategy

#### Phase 1: Optimization (Current)
- Database query optimization
- CDN for static assets
- Response caching

#### Phase 2: Horizontal Scaling (Next)
- Multiple API instances
- Read replica database
- Redis caching layer

#### Phase 3: Microservices (Future)
- Extract LLM service
- Separate scraper service
- Event-driven architecture

#### Phase 4: Global Distribution
- Multi-region deployment
- Edge functions
- Global CDN

## Development Workflow

### Local Setup

```bash
# Backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run_api.py

# Frontend  
cd frontend
npm install
npm run dev

# Database
docker-compose up -d postgres
python -m alembic upgrade head
```

### Code Quality Standards

#### Python
- Black formatting (line length: 88)
- Ruff linting (select: E,F,I,N,W)
- Type hints required
- Docstrings for public APIs

#### TypeScript
- ESLint with strict config
- Prettier formatting
- Strict mode enabled
- JSDoc for complex functions

#### Testing Requirements
- Backend coverage: >80%
- Frontend coverage: >70%
- All PRs must include tests
- No merge without passing CI

#### Documentation
- Self-documenting code preferred
- README for each module
- API documentation via OpenAPI
- Architecture decisions in ADRs

## Key Architectural Decisions

### Why FastAPI?
- Native async support for high concurrency
- Automatic OpenAPI documentation
- Pydantic integration for validation
- Excellent performance (Starlette/Uvicorn)
- Type hints for better DX

### Why Next.js 15?
- App Router for better performance
- React Server Components reduce bundle
- Built-in image optimization
- Vercel deployment integration
- SEO-friendly SSR/SSG

### Why PostgreSQL?
- JSONB for flexible schema evolution
- Full-text search capabilities  
- Strong ACID guarantees
- Excellent async driver (asyncpg)
- Railway managed hosting

### Why OpenRouter/Gemini?
- Cost-effective ($0.0015/dog)
- Fast processing (2-5 seconds)
- High success rate (90%+)
- Multi-language support
- Fallback model options

### Why Service Pattern?
- Clear separation of concerns
- Testability and maintainability
- Dependency injection support
- Future microservices migration path
- Parallel development

## Recent Updates & Roadmap

### Recent Releases
- ✅ LLM personality profiling pipeline
- ✅ Swipe interface for discovery
- ✅ Adoption detection system
- ✅ Multi-language support (10 languages)
- ✅ Enhanced search with AI
- ✅ SEO optimization (sitemaps, meta)
- ✅ 14th organization (Pets in Turkey)
- ✅ FallbackImage component with multi-level resilience

### In Development
- 🚧 Mobile app (React Native)
- 🚧 Adoption application system
- 🚧 Partner API for shelters
- 🚧 Advanced matching algorithms
- 🚧 Email notification system

### Future Roadmap
- 📋 WebSocket real-time updates
- 📋 Machine learning recommendations
- 📋 Video profiles support
- 📋 Virtual adoption events
- 📋 Donation integration

## Appendix

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost/rescue_dogs
OPENROUTER_API_KEY=xxx
SENTRY_DSN=xxx
REDIS_URL=redis://localhost:6379

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SENTRY_DSN=xxx
NEXT_PUBLIC_R2_CUSTOM_DOMAIN=images.rescuedogs.me
NEXT_PUBLIC_R2_IMAGE_PATH=rescue_dogs
```

### Useful Commands

```bash
# Development
make dev            # Start all services
make test           # Run all tests
make lint           # Run linters
make format         # Format code

# Database
make migrate        # Run migrations
make rollback       # Rollback migration
make db-shell       # PostgreSQL shell

# Deployment
make deploy-api     # Deploy backend
make deploy-web     # Deploy frontend
make deploy-all     # Full deployment
```

### Performance Benchmarks

- **API Response Times**:
  - GET /api/animals: 45ms (p50), 120ms (p95)
  - GET /api/swipe/stack: 65ms (p50), 180ms (p95)
  - POST /api/llm/enrich: 2.5s (p50), 5s (p95)

- **Frontend Metrics**:
  - First Contentful Paint: 0.8s
  - Largest Contentful Paint: 1.2s
  - Time to Interactive: 1.5s
  - Cumulative Layout Shift: 0.02

- **Database Performance**:
  - Connection pool efficiency: 95%
  - Query cache hit rate: 78%
  - Average query time: 12ms

---

_This document serves as the authoritative technical reference for the Rescue Dog Aggregator architecture. Last updated: 2025-01-27_