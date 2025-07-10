# Backend Architecture

This document outlines the architecture of the Rescue Dog Aggregator backend API. The backend is built using Python with the [FastAPI](https://fastapi.tiangolo.com/) framework.

## Architecture Overview

The backend follows a layered architecture pattern, promoting a clean separation of concerns. This design makes the application easier to develop, test, and maintain.

The primary layers are:

- **Routes (Presentation Layer):** Handles HTTP requests and responses
- **Services (Business Logic Layer):** Contains the core application logic
- **Database (Data Access Layer):** Manages all communication with the database

### Request Lifecycle

1. An HTTP request is received by `main.py` and routed to the appropriate endpoint in the `routes/` directory
2. The route function calls a dependency (from `dependencies.py`) to get a database connection and/or other resources
3. The route function calls the relevant method in the `services/` layer, passing any necessary data
4. The service executes the business logic, interacting with the `database/` layer to fetch or persist data
5. The result is returned up the chain, serialized into JSON by Pydantic models (`models/`), and sent as an HTTP response

## API Design

The API is designed following RESTful principles. Resources like `animals` and `organizations` are exposed via dedicated routers.

- **Directory:** `api/routes/`
- **Key Files:**
  - `animals.py`: Endpoints related to animal data (e.g., `GET /animals`, `GET /animals/{id}`)
  - `organizations.py`: Endpoints for rescue organizations
  - `monitoring.py`: Health checks and operational endpoints (e.g., `GET /health`)

This structure keeps endpoint definitions organized by domain, making them easy to locate and manage.

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