# Technical Architecture Documentation

## System Overview

The Rescue Dog Aggregator is a full-stack web application that aggregates rescue dog listings from multiple organizations into a unified, searchable platform. The system follows a microservices-inspired monolithic architecture with clear separation of concerns.

### Core Architecture Principles

1. **Configuration-Driven Design**: Organizations defined via YAML configurations
2. **Test-Driven Development**: 434+ backend tests, 1,249+ frontend tests
3. **Pure Functions & Immutability**: No side effects, no mutations
4. **Service Layer Pattern**: Business logic isolated from API handlers
5. **Null Object Pattern**: Graceful handling of missing data

## Technology Stack

### Backend

- **Framework**: FastAPI (Python 3.9+)
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Testing**: pytest with comprehensive fixtures
- **Async**: asyncio for concurrent operations
- **Validation**: Pydantic models

### Frontend

- **Framework**: Next.js 15 with React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library
- **State Management**: React Context + Hooks

### Infrastructure

- **API Hosting**: Railway (PostgreSQL + FastAPI)
- **Frontend Hosting**: Vercel (Next.js)
- **Monitoring**: Sentry (dev + prod environments)
- **CI/CD**: GitHub Actions + Vercel/Railway integrations

## System Components

### 1. API Layer (`/api`)

#### Core Components

- `api/main.py`: FastAPI application initialization, CORS, middleware
- `api/routes/`: RESTful endpoints organized by domain
- `api/dependencies.py`: Dependency injection setup
- `api/async_dependencies.py`: Async dependency providers

#### Key Routes

- `/api/animals`: Animal CRUD operations with filtering
- `/api/organizations`: Organization management
- `/api/swipe`: Swipe-based discovery interface
- `/api/admin`: Administrative operations
- `/api/auth`: Authentication endpoints
- `/api/metrics`: System metrics and analytics

#### Middleware Stack

- CORS handling for frontend integration
- Request/response logging
- Error handling and transformation
- Performance monitoring

### 2. Service Layer (`/services`)

#### Core Services

##### DatabaseService

- **Purpose**: Database connection management and query execution
- **Pattern**: Connection pooling with automatic retry
- **Key Methods**:
  - `execute_query()`: Safe query execution with error handling
  - `get_connection()`: Connection pool management
  - Transaction management with context managers

##### MetricsCollector

- **Purpose**: System and business metrics aggregation
- **Metrics Types**:
  - Query performance metrics
  - API endpoint latencies
  - Business metrics (dogs, orgs, searches)
- **Storage**: In-memory with periodic PostgreSQL persistence

##### SessionManager

- **Purpose**: User session and preference management
- **Features**:
  - Session token generation and validation
  - User preference storage
  - Activity tracking

##### ImageProcessingService

- **Purpose**: Dog image optimization and caching
- **Operations**:
  - Image URL validation
  - Thumbnail generation
  - CDN integration preparation

##### LLMDataService & LLMProfilerService

- **Purpose**: AI-powered dog matching and profiling
- **Features**:
  - Personality trait extraction
  - Compatibility scoring
  - Natural language search

##### NullObjects Module

- **Pattern**: Null Object Pattern implementations
- **Components**:
  - `NullDog`: Safe default for missing animals
  - `NullOrganization`: Default org representation
  - `NullMetrics`: Empty metrics container

### 3. Data Layer (`/database`, `/migrations`)

#### Schema Design

##### Core Tables

```sql
animals (
  id SERIAL PRIMARY KEY,
  name VARCHAR,
  organization_id INTEGER,
  breed VARCHAR[],
  age VARCHAR,
  size VARCHAR,
  gender VARCHAR,
  description TEXT,
  photos JSONB,
  personality_traits JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)

organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR UNIQUE,
  website VARCHAR,
  config_path VARCHAR,
  active BOOLEAN,
  last_sync TIMESTAMP
)

user_sessions (
  id UUID PRIMARY KEY,
  preferences JSONB,
  created_at TIMESTAMP,
  last_activity TIMESTAMP
)

```

#### Migration Strategy

- Alembic for schema versioning
- Automatic rollback on failure
- Zero-downtime migrations

### 4. Scraper System (`/scrapers`)

#### Architecture

- **Base Classes**: Abstract scraper interfaces
- **Organization Scrapers**: Custom implementations per org
- **Batch Processing**: Concurrent scraping with rate limiting
- **Data Validation**: Pydantic models for scraped data

#### Key Components

- `BaseScraper`: Abstract base with common functionality
- `ScraperRegistry`: Dynamic scraper discovery and loading
- `ScraperScheduler`: Cron-based scraping orchestration

### 5. Frontend Architecture (`/frontend`)

#### Component Hierarchy

```
App
├── Layout (Header, Navigation)
├── Pages
│   ├── Home (Search, Filters)
│   ├── Swipe (SwipeInterface, SwipeDetails)
│   ├── Browse (DogGrid, DogCard)
│   └── Admin (Dashboard, Controls)
├── Components
│   ├── Common (Button, Input, Modal)
│   ├── Dog (DogCard, DogDetails, ImageCarousel)
│   └── Filters (FilterPanel, FilterChip)
└── Utils
    ├── api.js (API client)
    ├── personalityColors.ts (Trait visualization)
    └── helpers.ts (Utility functions)
```

#### State Management

- **Global State**: React Context for user preferences
- **Local State**: Component-level useState hooks
- **Server State**: React Query for API data caching

#### API Integration

- Centralized API client (`utils/api.js`)
- Automatic retry with exponential backoff
- Request/response interceptors for auth
- Environment-based endpoint configuration

### 6. Configuration Management (`/configs`, `/management`)

#### Organization Configuration

- YAML-based organization definitions
- Scraper configuration per organization
- Feature flags and toggles

#### Management Commands

- `config_commands.py`: YAML sync and validation
- `emergency_operations.py`: Production hotfixes
- `data_management.py`: Bulk data operations

## Data Flow Architecture

### 1. Scraping Pipeline

```
YAML Config → Scraper Selection → Data Extraction →
Validation → Deduplication → Database Storage →
Cache Invalidation → API Updates
```

### 2. User Request Flow

```
User Request → Next.js Frontend → API Gateway →
FastAPI Router → Dependency Injection →
Service Layer → Database Query →
Response Transformation → JSON Response
```

### 3. Swipe Feature Flow

```
Initial Load → Get Stack (10 dogs) → User Swipe →
Record Interaction → Update Preferences →
Refetch Stack → Personalization Engine →
Return Optimized Stack
```

## Security Architecture

### Authentication & Authorization

- Session-based authentication
- UUID session tokens
- Admin role verification
- API key management for scrapers

### Data Protection

- SQL injection prevention via parameterized queries
- XSS protection through input sanitization
- CORS configuration for frontend origin
- Environment variable management for secrets

## Performance Optimization

### Database

- Connection pooling (10-20 connections)
- Query optimization with indexes
- Materialized views for aggregates
- Batch operations for bulk updates

### Caching Strategy

- In-memory caching for hot data
- Redis preparation (connection pool ready)
- Frontend caching with React Query
- CDN for static assets

### API Performance

- Async request handling
- Pagination for large datasets
- Query parameter optimization
- Response compression

## Testing Architecture

### Backend Testing Strategy

#### Test Tiers

1. **Tier 1 (unit/fast)**: Developer feedback loop

   - Unit tests for services
   - Fast integration tests
   - Mocked external dependencies

2. **Tier 2 (CI)**: Pipeline validation

   - Full integration tests
   - Database transaction tests
   - API endpoint tests

3. **Tier 3 (pre-merge)**: Production readiness
   - End-to-end tests
   - Performance benchmarks
   - Migration tests

#### Test Isolation

- Global fixture for database protection
- Automatic mocking of external services
- Transaction rollback after each test
- Separate test database

### Frontend Testing

- Component unit tests with Jest
- Integration tests with React Testing Library
- Snapshot testing for UI consistency
- End-to-end tests with Playwright

## Monitoring & Observability

### Sentry Integration

- Separate DSNs for dev/prod
- Error tracking with stack traces
- Performance monitoring
- Custom breadcrumbs for debugging

### Metrics Collection

- Query performance tracking
- API endpoint latencies
- Business metrics dashboard
- Resource utilization monitoring

## Deployment Architecture

### CI/CD Pipeline

```
Git Push → GitHub Actions →
Test Suite → Build →
Vercel (Frontend) / Railway (Backend) →
Health Checks → Production
```

### Environment Management

- Development: Local PostgreSQL + FastAPI dev server
- Staging: Railway preview environments
- Production: Railway (API) + Vercel (Frontend)

## Scalability Considerations

### Horizontal Scaling

- Stateless API design
- Database connection pooling
- Load balancer ready
- Microservices migration path

### Vertical Scaling

- Async processing for heavy operations
- Batch processing for scrapers
- Query optimization ongoing
- Caching layer expansion

## Future Architecture Evolution

### Planned Enhancements

1. **Microservices Migration**

   - Extract scraper service
   - Separate analytics service
   - Independent auth service

2. **Event-Driven Architecture**

   - Message queue integration
   - Event sourcing for interactions
   - Real-time updates via WebSockets

3. **AI/ML Pipeline**

   - Dedicated ML service
   - Model versioning
   - A/B testing framework

4. **Infrastructure**
   - Kubernetes orchestration
   - Service mesh implementation
   - GraphQL federation

## Development Workflow

### Local Development Setup

```bash
# Backend
source venv/bin/activate
python run_api.py

# Frontend
cd frontend
npm run dev
```

### Code Organization Principles

1. **Single Responsibility**: Each module has one clear purpose
2. **Dependency Injection**: Services injected, not imported
3. **Pure Functions**: No side effects in business logic
4. **Early Returns**: Avoid nested conditionals
5. **Self-Documenting**: Code clarity over comments

### Quality Gates

- Pre-commit hooks for formatting
- Type checking (mypy/TypeScript)
- Test coverage requirements (>80%)
- Linting standards (ruff/ESLint)
- No duplicate JSX/TSX files

## Emergency Procedures

### Database Recovery

```python
python management/emergency_operations.py --reset-stale-data
```

### Cache Invalidation

```python
python management/cache_operations.py --flush-all
```

### Rollback Procedures

- Database: Alembic downgrade
- Frontend: Vercel instant rollback
- Backend: Railway deployment history

## Key Design Decisions

### Why FastAPI?

- Native async support
- Automatic API documentation
- Pydantic validation
- High performance

### Why Next.js?

- Server-side rendering for SEO
- Built-in optimization
- Vercel integration
- React ecosystem

### Why PostgreSQL?

- JSONB for flexible schemas
- Full-text search capabilities
- ACID compliance
- Railway integration

### Why Service Layer Pattern?

- Business logic isolation
- Testability
- Reusability
- Clear boundaries

## Contact & Support

- **Production URL**: www.rescuedogs.me
- **GitHub**: [repository URL]
- **Monitoring**: Sentry dashboards
- **Database**: Railway PostgreSQL console

## Appendix: Common Tasks

### Adding New Organization

1. Create YAML in `/configs`
2. Implement scraper in `/scrapers`
3. Run sync command
4. Verify in admin panel

### Performance Debugging

1. Check Sentry for errors
2. Review metrics collector
3. Analyze slow queries
4. Profile with LLMProfilerService

### Database Migrations

1. Create migration with Alembic
2. Test in development
3. Apply to staging
4. Production deployment

---

_This document is maintained for Claude Code as the primary audience. It provides comprehensive architectural understanding for AI-assisted development and maintenance._
