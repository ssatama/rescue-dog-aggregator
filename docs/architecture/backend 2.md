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

## API Design

The API follows **RESTful principles** with **domain-driven design**, organizing endpoints by business domain for maintainability and discoverability.

### API Structure

- **Directory:** `api/routes/`
- **Domain-Driven Organization:**
  - `animals.py`: Animal data endpoints with advanced filtering, searching, and statistics
  - `organizations.py`: Rescue organization management and discovery
  - `monitoring.py`: Health checks, metrics, and operational monitoring

### Key Endpoints

#### Animals API
- `POST /api/animals` - Advanced search and filtering with pagination
- `GET /api/animals/{id}` - Individual animal details with images
- `GET /api/animals/statistics` - Aggregate statistics and metrics
- `GET /api/animals/meta/*` - Metadata endpoints for filter options

#### Organizations API  
- `GET /api/organizations` - List all rescue organizations
- `GET /api/organizations/{id}` - Organization details and associated animals

#### Monitoring API
- `GET /health` - Application health status
- `GET /api/health` - Detailed health checks with database connectivity

### API Features

- **Advanced Filtering:** Multi-criteria search with boolean combinations
- **Pagination:** Offset-based pagination with configurable limits
- **Metadata Endpoints:** Dynamic filter options based on actual data
- **Error Handling:** Consistent error responses with proper HTTP status codes
- **Security Headers:** CORS configuration and security middleware

## Database Layer

The database layer abstracts all data persistence and retrieval logic. A key architectural choice is the use of a custom query builder instead of a full Object-Relational Mapper (ORM).

- **Directory:** `api/database/`
- **Key Files:**
  - `connection_pool.py`: Manages a pool of database connections for performance and stability
  - `query_builder.py`: Provides a systematic way to construct SQL queries with fine-grained control over execution

This approach offers precise control over SQL queries, which is beneficial for performance tuning complex queries. The trade-off is manual mapping of query results to Pydantic data models.

## Service Layer

The service layer contains all business logic. It acts as an intermediary between the presentation layer (routes) and the data access layer (database).

- **Directory:** `api/services/`
- **Key Files:**
  - `animal_service.py`: Implements logic for operations on animals, such as searching, filtering, and aggregation
  - `service_factory.py`: Uses the Factory pattern to create service instances with proper dependency injection

**Example Flow:**
A request to `GET /animals` would trigger the `animals` router, which would use the `service_factory` to get an `AnimalService` instance (with a DB connection), and then call a method like `animal_service.get_all()`.

## Data Models

Pydantic models are used for data validation, serialization, and documentation. This ensures that data flowing into and out of the API conforms to a strict, defined schema.

- **Directory:** `api/models/`
- **Key Files:**
  - `dog.py`, `organization.py`: Define the core data structures for the domain, used in API responses
  - `requests.py`: Defines models specific to API request bodies (e.g., for `POST` or `PUT` operations)

Separating request models from domain models allows request payloads to differ from the full resource representation.

## Error Handling

A centralized exception handling strategy is implemented to provide consistent error responses.

- **Directory:** `api/`
- **Key File:** `exceptions.py`

This file defines custom exception classes (e.g., `ResourceNotFoundException`, `InvalidInputException`). These exceptions are raised from the service or database layers and are caught by FastAPI exception handlers configured in `main.py`, which map them to appropriate HTTP status codes and error responses.

## Dependency Injection

The project leverages FastAPI's built-in Dependency Injection (DI) system to manage resources and promote decoupling.

- **Directory:** `api/`
- **Key File:** `dependencies.py`

This file defines "dependables"—functions that provide resources to the path operation functions. A common example would be a `get_db_connection()` function that acquires a connection from the connection pool and ensures it is properly released after the request is complete.

**Example Usage:**
```python
# api/routes/animals.py (illustrative)
from fastapi import APIRouter, Depends
from ..dependencies import get_db_connection

router = APIRouter()

@router.get("/animals")
async def get_animals(db_conn = Depends(get_db_connection)):
    # The 'db_conn' is provided by the DI system
    # ... use db_conn to query data ...
    pass
```

This approach makes the routes independent of how the database connection is created or managed, which simplifies testing and maintenance.

## Key Benefits

- **Separation of Concerns:** Clear boundaries between presentation, business logic, and data access
- **Testability:** Dependency injection enables easy mocking and unit testing
- **Performance:** Connection pooling and custom query builder optimize database interactions
- **Maintainability:** Organized structure makes the codebase easy to navigate and modify
- **Type Safety:** Pydantic models provide runtime validation and development-time type checking