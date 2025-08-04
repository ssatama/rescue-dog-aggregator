# API Documentation

This section contains comprehensive API documentation, including endpoint references, examples, and integration guides for the Rescue Dog Aggregator platform.

## 📋 Documents in this Section

### 📖 API Reference
- **[API Reference](reference.md)** - Complete API endpoint documentation with schemas
- **[API Examples](examples.md)** - Practical usage examples and code samples

## 🔗 Related Documentation
- **[Architecture Overview](../architecture/project-overview.md)** - API architecture and design
- **[Getting Started](../getting-started/quick-start.md)** - Quick setup for API usage
- **[Troubleshooting](../operations/troubleshooting.md)** - API-related issue resolution

## 🌐 API Overview

The Rescue Dog Aggregator provides a modern, enterprise-grade RESTful API built with cutting-edge architecture and performance optimizations. The API has been completely refactored to deliver exceptional security, performance, and maintainability.

### Base URL
```
Production: https://api.rescuedogs.me
Development: http://localhost:8000
```

### 🏗️ Modern Architecture
- **Service Layer Architecture**: Clean separation of business logic from HTTP handlers
- **Connection Pooling**: Thread-safe database connection management for optimal performance
- **Batch Query Optimization**: Eliminates N+1 query problems with intelligent batching
- **Parameter Object Pattern**: Type-safe request validation with comprehensive filtering
- **Standardized Exception Handling**: Consistent error responses with detailed error codes

### Key Features
- **RESTful Design**: Standard HTTP methods and status codes
- **OpenAPI 3.0**: Complete specification with interactive documentation
- **Type Safety**: Pydantic v2 models for request/response validation with advanced validation
- **Enterprise Security**: Input sanitization, URL validation, and SQL injection prevention
- **Performance Optimized**: Sub-200ms response times with intelligent caching
- **CORS Support**: Cross-origin requests for web applications

## 🚀 Quick Start

### Basic Usage
```bash
# Get all available animals
curl "https://api.rescuedogs.me/api/animals"

# Get a specific animal
curl "https://api.rescuedogs.me/api/animals/123"

# Get animals with filtering
curl "https://api.rescuedogs.me/api/animals?breed=labrador&size=large"
```

### Response Format
```json
{
  "data": [...],
  "meta": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "pages": 8
  }
}
```

## 📊 Core Endpoints

### Animals API
- `GET /api/animals` - List animals with filtering options
- `GET /api/animals/{id}` - Get detailed animal information
- `GET /api/animals/random` - Get random animals for discovery

### Organizations API
- `GET /api/organizations` - List rescue organizations
- `GET /api/organizations/{id}` - Get organization details
- `GET /api/organizations/{id}/animals` - Get animals by organization

### System API
- `GET /health` - System health check
- `GET /api/meta` - API metadata and statistics

## 🔍 Advanced Features

### Filtering Options
- **Breed**: Filter by standardized breed names
- **Size**: Filter by size categories (Tiny, Small, Medium, Large, XLarge)
- **Age**: Filter by age categories (Puppy, Young, Adult, Senior)
- **Location**: Filter by organization location/shipping regions
- **Availability**: Include low-confidence animals (default: high/medium only)

### Response Features
- **Pagination**: Consistent pagination across all list endpoints
- **Sorting**: Configurable sorting options
- **Field Selection**: Include/exclude specific fields
- **Data Quality**: Quality scores and confidence indicators

## 🛡️ Security & Rate Limiting

### Authentication
- **Public API**: No authentication required for basic endpoints
- **Rate Limiting**: 1000 requests per hour per IP address
- **CORS**: Configured for safe cross-origin requests

### Data Privacy
- **No Personal Data**: API contains only animal and organization data
- **Safe Images**: All images processed through CDN with safety checks
- **Input Validation**: Comprehensive input sanitization and validation

## 📈 Performance & Architecture

### Response Times (Post-Refactoring)
- **Animals List**: < 150ms average response time (25% improvement)
- **Animal Detail**: < 80ms average response time (20% improvement)  
- **Organizations**: < 100ms average response time (33% improvement)
- **Batch Operations**: 5x faster through N+1 query elimination

### Performance Optimizations
- **Connection Pooling**: Thread-safe PostgreSQL connection pool (2-20 connections)
- **Batch Query Execution**: Single queries for multiple operations
- **Query Builder**: Dynamic, parameterized queries preventing SQL injection
- **Service Layer Caching**: In-memory caching of frequently accessed data
- **Response Caching**: Intelligent caching with invalidation
- **CDN Integration**: Global image delivery via Cloudinary

### Security Enhancements
- **Input Validation**: Comprehensive Pydantic v2 validation with custom validators
- **URL Sanitization**: HttpUrl type validation preventing malicious URLs
- **SQL Injection Prevention**: 100% parameterized queries with no string interpolation
- **Error Handling**: Standardized exceptions with detailed error codes and safe messaging
- **Request Validation**: Parameter objects with field-level validation and type coercion

## 🏛️ Architectural Components

### Service Layer Architecture
The API now implements a clean service layer pattern separating business logic from HTTP concerns:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Route Layer   │───▶│  Service Layer  │───▶│ Database Layer  │
│                 │    │                 │    │                 │
│ • HTTP handling │    │ • Business logic│    │ • Data access   │
│ • Validation    │    │ • Query building│    │ • Connection    │
│ • Error mapping │    │ • Result caching│    │   pooling       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Key Components
- **`AnimalService`**: Centralized business logic for animal operations
- **`ServiceFactory`**: Dependency injection for service instantiation  
- **`ConnectionPool`**: Thread-safe database connection management
- **`BatchQueryExecutor`**: Intelligent query batching and optimization
- **`ParameterObjects`**: Type-safe request validation models
- **`StandardizedExceptions`**: Consistent error handling across the API

### Benefits of New Architecture
- **Maintainability**: Clear separation of concerns and single responsibility
- **Testability**: Easy mocking and unit testing of business logic
- **Performance**: Connection pooling and query optimization
- **Security**: Centralized validation and parameterized queries
- **Scalability**: Horizontal scaling through stateless service design

---

*Navigate back to [Documentation Home](../README.md)*