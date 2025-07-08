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

The Rescue Dog Aggregator provides a RESTful API with comprehensive endpoints for accessing rescue dog data, organization information, and system health metrics.

### Base URL
```
Production: https://api.rescue-dogs.org
Development: http://localhost:8000
```

### Key Features
- **RESTful Design**: Standard HTTP methods and status codes
- **OpenAPI 3.0**: Complete specification with interactive documentation
- **Type Safety**: Pydantic models for request/response validation
- **Rate Limiting**: Configurable limits for API protection
- **CORS Support**: Cross-origin requests for web applications

## 🚀 Quick Start

### Basic Usage
```bash
# Get all available animals
curl "https://api.rescue-dogs.org/api/animals"

# Get a specific animal
curl "https://api.rescue-dogs.org/api/animals/123"

# Get animals with filtering
curl "https://api.rescue-dogs.org/api/animals?breed=labrador&size=large"
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

## 📈 Performance

### Response Times
- **Animals List**: < 200ms average response time
- **Animal Detail**: < 100ms average response time
- **Organizations**: < 150ms average response time

### Caching
- **Response Caching**: Intelligent caching with invalidation
- **CDN Integration**: Global image delivery via Cloudinary
- **Database Optimization**: Optimized queries with proper indexing

---

*Navigate back to [Documentation Home](../README.md)*