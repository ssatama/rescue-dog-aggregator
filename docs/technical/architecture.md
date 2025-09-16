# Technical Architecture Documentation

## System Overview

The Rescue Dog Aggregator is a full-stack web application that aggregates rescue dog listings from multiple organizations into a unified, searchable platform. The system follows a service-oriented monolithic architecture with clear separation of concerns and AI-powered enrichment capabilities.

### Core Architecture Principles

1. **Configuration-Driven Design**: Organizations defined via YAML configurations
2. **Test-Driven Development**: 434+ backend tests, 1,249+ frontend tests
3. **Pure Functions & Immutability**: No side effects, no mutations
4. **Service Layer Pattern**: Business logic isolated from API handlers
5. **AI-Powered Enrichment**: LLM integration for personality profiling and matching

## Technology Stack

### Backend

- **Framework**: FastAPI (Python 3.9+)
- **Database**: PostgreSQL 15 with async drivers
- **ORM**: SQLAlchemy with Alembic migrations
- **Testing**: pytest with comprehensive fixtures
- **Async**: asyncio/asyncpg for concurrent operations
- **Validation**: Pydantic models
- **LLM Integration**: OpenRouter API (Google Gemini 2.5 Flash)

### Frontend

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **Testing**: Jest + React Testing Library + Playwright
- **State Management**: React Context + Server Components
- **Analytics**: PostHog integration
- **Components**: Custom UI library with shadcn/ui patterns

### Infrastructure

- **API Hosting**: Railway (PostgreSQL + FastAPI)
- **Frontend Hosting**: Vercel (Next.js)
- **Monitoring**: Sentry (dev + prod environments)
- **CI/CD**: GitHub Actions + Vercel/Railway integrations
- **LLM Provider**: OpenRouter for AI processing

## System Components

### 1. API Layer (`/api`)

#### Core Components

- `api/main.py`: FastAPI application initialization, CORS, middleware, Sentry
- `api/routes/`: RESTful endpoints organized by domain
- `api/async_dependencies.py`: Async dependency providers with transaction management
- `api/exceptions.py`: Standardized error handling

#### Key Routes

- `/api/animals`: Animal CRUD with advanced filtering
- `/api/enhanced_animals`: AI-enriched animal data endpoints
- `/api/organizations`: Organization management
- `/api/swipe`: Swipe-based discovery interface
- `/api/llm`: LLM enrichment and profiling endpoints
- `/api/monitoring`: Health checks and metrics
- `/api/sitemap`: Dynamic sitemap generation

#### Middleware & Error Handling

- CORS configuration for frontend origins
- Sentry error tracking and performance monitoring
- Standardized error responses (InvalidInputError, NotFoundError, etc.)
- Request/response logging with correlation IDs

### 2. Service Layer (`/services`)

#### Core Services

##### DatabaseService (`database_service.py`)
- **Purpose**: Database connection management with pooling
- **Features**:
  - Async connection pool (10-30 connections)
  - Automatic retry with exponential backoff
  - Transaction context managers
  - Query performance tracking

##### MetricsCollector (`metrics_collector.py`)
- **Purpose**: System and business metrics aggregation
- **Metrics**:
  - Query performance (p50, p95, p99)
  - API endpoint latencies
  - Business KPIs (dogs, searches, adoptions)
- **Storage**: In-memory with periodic PostgreSQL persistence

##### SessionManager (`session_manager.py`)
- **Purpose**: User session and preference management
- **Features**:
  - UUID-based session tokens
  - Preference storage (filters, favorites)
  - Activity tracking for analytics

##### AdoptionDetection (`adoption_detection.py`)
- **Purpose**: Detect and track adopted dogs
- **Features**:
  - Pattern matching for adoption keywords
  - Availability confidence scoring
  - Historical tracking

##### LLM Services

###### LLMDataService (`llm_data_service.py`)
- **Purpose**: Direct LLM integration for text processing
- **Operations**:
  - Description cleaning and enrichment
  - Multi-language translation
  - Content generation

###### LLMProfilerService (`llm_profiler_service.py`)
- **Purpose**: Advanced dog profiling pipeline
- **Components**:
  - `services/llm/dog_profiler.py`: Main orchestrator
  - `services/llm/prompt_builder.py`: Organization-specific prompts
  - `services/llm/normalizers/`: Data standardization
  - `services/llm/scraper_integration.py`: Auto-profiling hooks
- **Output**: Structured personality profiles in JSONB

##### NullObjects (`null_objects.py`)
- **Pattern**: Null Object Pattern for safe defaults
- **Components**:
  - `NullDog`: Default animal representation
  - `NullOrganization`: Empty org object
  - `NullMetrics`: Zero-value metrics

##### ImageProcessingService (`image_processing_service.py`)
- **Purpose**: Image optimization and validation
- **Operations**:
  - URL validation and availability checking
  - Format detection (JPEG, PNG, WebP)
  - Dimension extraction for responsive loading

### 3. Data Layer

#### Database Schema

##### Core Tables

```sql
-- Main animal data table
animals (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR UNIQUE,
  organization_id INTEGER REFERENCES organizations(id),
  name VARCHAR NOT NULL,
  slug VARCHAR UNIQUE,
  breed VARCHAR,
  age_text VARCHAR,
  size VARCHAR,
  gender VARCHAR,
  status VARCHAR DEFAULT 'available',
  availability_confidence VARCHAR DEFAULT 'high',

  -- JSON fields
  properties JSONB,  -- Raw scraped data
  photos JSONB,      -- Image URLs and metadata
  dog_profiler_data JSONB,  -- AI-generated profile

  -- LLM enrichment columns
  enriched_description TEXT,
  llm_processed_at TIMESTAMP,
  llm_model_used VARCHAR,
  translations JSONB,

  -- Fees
  adoption_fees JSONB,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP
)

-- Organizations table
organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE NOT NULL,
  slug VARCHAR UNIQUE,
  website VARCHAR,
  config_id VARCHAR,  -- Links to YAML config
  active BOOLEAN DEFAULT true,
  last_sync TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
)

-- Indexes for performance
CREATE INDEX idx_animals_organization ON animals(organization_id);
CREATE INDEX idx_animals_status ON animals(status);
CREATE INDEX idx_animals_availability ON animals(availability_confidence);
CREATE GIN INDEX idx_animals_properties ON animals USING GIN(properties);
CREATE GIN INDEX idx_animals_profiler ON animals USING GIN(dog_profiler_data);
```

#### Migration Management

- **Tool**: Alembic with Railway-specific migrations
- **Location**: `/migrations/railway/versions/`
- **Strategy**:
  - Automatic migration on deployment
  - Version-controlled schema changes
  - Rollback capability

### 4. Scraper System (`/scrapers`)

#### Architecture

- **Base Classes**: `BaseScraper` with standardized interface
- **Organization Scrapers**: 13+ custom implementations
- **Unified Standardization**: Common data format across all scrapers
- **LLM Integration**: Optional auto-profiling during scraping

#### Key Components

- `scrapers/base_scraper.py`: Abstract interface
- `scrapers/unified_standardization.py`: Data normalization
- Individual scrapers per organization (e.g., `many_tears.py`, `tierschutzverein_europa.py`)

### 5. Frontend Architecture (`/frontend`)

#### Next.js 15 App Router Structure

```
frontend/src/
├── app/                    # App Router pages
│   ├── layout.tsx         # Root layout with providers
│   ├── page.tsx           # Home page
│   ├── dogs/              # Dog detail pages
│   ├── swipe/             # Swipe interface
│   ├── favorites/         # Favorites management
│   ├── breeds/            # Breed information
│   ├── organizations/     # Org listings
│   └── api/               # API route handlers
├── components/
│   ├── analytics/         # PostHog tracking
│   ├── breeds/           # Breed-specific UI
│   ├── dogs/             # Dog cards, details, grids
│   ├── favorites/        # Favorites UI components
│   ├── filters/          # Search and filter UI
│   ├── home/             # Homepage components
│   ├── layout/           # Header, footer, navigation
│   ├── monitoring/       # Error boundaries, Sentry
│   ├── organizations/    # Org display components
│   ├── search/           # Search interface
│   ├── seo/              # Meta tags, structured data
│   ├── swipe/            # Tinder-like interface
│   └── ui/               # Reusable UI components
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
├── utils/                 # Utility functions
└── styles/               # Global styles
```

#### Key Frontend Features

- **Server Components**: Default for data fetching
- **Client Components**: Interactive features (swipe, filters)
- **Image Optimization**: Next.js Image component with lazy loading
- **SEO**: Dynamic meta tags, sitemaps, structured data
- **Analytics**: PostHog event tracking
- **Error Handling**: Sentry integration with error boundaries

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
```

### 7. Management Commands (`/management`)

- `config_commands.py`: Organization sync, LLM profiling
- `llm_commands.py`: Batch enrichment operations
- `emergency_operations.py`: Production hotfixes
- `batch_processor.py`: Efficient batch database operations

## Data Flow Architecture

### 1. Scraping & Enrichment Pipeline

```
YAML Config → Scraper Activation → Data Extraction →
Unified Standardization → Deduplication →
Database Storage → LLM Enrichment Pipeline →
Profile Generation → JSONB Storage →
API Availability
```

### 2. User Request Flow

```
Browser Request → Next.js Server Component →
API Route (or Direct DB) → FastAPI Backend →
Async Dependencies → Service Layer →
PostgreSQL Query → Response Transformation →
React Server Component → Client Hydration
```

### 3. Swipe Feature Architecture

```
Initial Load → Fetch Stack (10-20 dogs) →
Client-Side Rendering → Swipe Gesture →
Optimistic UI Update → Background API Call →
Session Update → Preference Learning →
Next Stack Preparation
```

### 4. LLM Processing Flow

```
Raw Dog Data → Organization Config Loading →
Prompt Template Selection → LLM API Call →
Response Parsing → Data Normalization →
Schema Validation → Database Update →
Frontend Availability
```

## Performance Optimizations

### Database

- **Connection Pooling**: 10-30 async connections
- **Query Optimization**:
  - GIN indexes on JSONB columns
  - Compound indexes for common queries
  - Query result caching
- **Batch Operations**: Bulk inserts/updates
- **Read Replicas**: Prepared for scaling

### API Performance

- **Async Everything**: Full async/await stack
- **Pagination**: Cursor-based for large datasets
- **Response Caching**: ETags and conditional requests
- **Query Optimization**: Selective field loading

### Frontend Performance

- **Static Generation**: Pre-rendered pages where possible
- **ISR**: Incremental Static Regeneration for dog pages
- **Image Optimization**: WebP with responsive sizing
- **Bundle Splitting**: Route-based code splitting
- **Prefetching**: Link prefetch for navigation

### LLM Optimization

- **Batch Processing**: 5 dogs concurrently
- **Model Selection**: Gemini 2.5 Flash for speed/cost
- **Prompt Caching**: Template reuse
- **Retry Logic**: Exponential backoff with fallback models

## Testing Strategy

### Backend Testing

#### Test Tiers

1. **Tier 1**: `pytest -m "unit or fast"` (Developer loop)
2. **Tier 2**: `pytest -m "not slow"` (CI pipeline)
3. **Tier 3**: Full test suite (Pre-deployment)

#### Test Categories

- **Unit Tests**: Service logic, utilities
- **Integration Tests**: API endpoints, database operations
- **LLM Tests**: Mock API responses, normalizer validation

### Frontend Testing

- **Unit Tests**: Component logic (Jest)
- **Integration Tests**: User flows (React Testing Library)
- **E2E Tests**: Critical paths (Playwright)
- **Visual Regression**: Component snapshots
- **Mobile Tests**: Touch interactions, responsive design

## Monitoring & Observability

### Sentry Integration

- **Error Tracking**: Frontend and backend errors
- **Performance Monitoring**: Transaction tracing
- **Custom Context**: User sessions, organization data
- **Release Tracking**: Version-specific monitoring

### Application Metrics

- **Business Metrics**: Dogs viewed, searches, adoptions
- **Technical Metrics**: API latency, database performance
- **LLM Metrics**: Processing success rate, costs
- **User Analytics**: PostHog event tracking

## Security Architecture

### Authentication & Authorization

- **Session Management**: UUID tokens with expiry
- **Admin Access**: Role-based permissions
- **API Security**: Rate limiting, CORS policies

### Data Protection

- **Input Validation**: Pydantic models, SQL injection prevention
- **Secrets Management**: Environment variables
- **HTTPS Only**: SSL/TLS encryption
- **PII Handling**: No personal data storage

## Deployment Architecture

### CI/CD Pipeline

```
GitHub Push → GitHub Actions →
├── Backend Tests → Railway Deploy
└── Frontend Tests → Vercel Deploy
```

### Environment Configuration

- **Development**: Local PostgreSQL + FastAPI dev server
- **Staging**: Railway preview environments
- **Production**:
  - API: Railway (PostgreSQL + FastAPI)
  - Frontend: Vercel (Next.js)

### Infrastructure Details

- **Railway**: Auto-scaling, managed PostgreSQL
- **Vercel**: Edge network, automatic HTTPS
- **Monitoring**: Sentry for both environments
- **DNS**: Cloudflare for www.rescuedogs.me

## Scalability Roadmap

### Current Capabilities

- **Dogs**: 2,500+ profiles
- **Organizations**: 13+ active scrapers
- **Traffic**: 20+ daily active users
- **Performance**: <200ms API response time

### Future Scaling

1. **Database**: Read replicas, partitioning
2. **Caching**: Redis for session/query caching
3. **CDN**: Cloudflare for static assets
4. **Microservices**: Extract LLM service, scraper service
5. **Queue System**: Async job processing with Celery

## Development Workflow

### Local Setup

```bash
# Backend
source venv/bin/activate
pip install -r requirements.txt
python run_api.py

# Frontend
cd frontend
npm install
npm run dev
```

### Code Quality Standards

- **Python**: Black formatting, ruff linting
- **TypeScript**: ESLint, Prettier
- **Testing**: >80% coverage requirement
- **Pre-commit**: Automated checks
- **Documentation**: Self-documenting code

## Key Architectural Decisions

### Why FastAPI?
- Native async support for high concurrency
- Automatic OpenAPI documentation
- Pydantic integration for validation
- Excellent performance benchmarks

### Why Next.js 15?
- App Router for better performance
- Server Components reduce client bundle
- Built-in image optimization
- Vercel deployment integration

### Why PostgreSQL?
- JSONB for flexible schema evolution
- Full-text search capabilities
- Strong consistency guarantees
- Railway managed hosting

### Why OpenRouter/Gemini?
- Cost-effective ($0.0015/dog)
- Fast processing (2-5 seconds)
- High success rate (90%+)
- Multi-language support

### Why Service Pattern?
- Clear separation of concerns
- Testability and maintainability
- Dependency injection support
- Future microservices migration path

## Recent Updates & Active Development

### Latest Features
- LLM-powered dog personality profiling
- Swipe interface for dog discovery
- Adoption detection system
- Multi-language support
- Enhanced search with AI

### In Development
- Mobile app (React Native)
- Adoption application system
- Partner API for shelters
- Advanced matching algorithms
- Email notifications

---

_Last Updated: September 2024_
_This document serves as the authoritative technical reference for the Rescue Dog Aggregator architecture._