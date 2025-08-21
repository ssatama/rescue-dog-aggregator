# Rescue Dog Aggregator API Reference

## Overview

The Rescue Dog Aggregator provides a modern, enterprise-grade RESTful API built with cutting-edge architecture and performance optimizations.

### Base URLs
- **Production**: `https://api.rescuedogs.me`
- **Development**: `http://localhost:8000`
- **API Version**: 0.1.0

## Authentication & Security

### Public Endpoints
Most endpoints are publicly accessible without authentication.

### Admin Endpoints
Monitoring and administrative endpoints require authentication via the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-admin-key" http://localhost:8000/monitoring/scrapers
```

### Security Features
- No personal data exposure
- Comprehensive input validation
- SQL injection prevention
- CORS configuration
- Safe error messaging

## Core Endpoints

### Animals API

#### `GET /api/animals/`
Retrieve a list of animals with comprehensive filtering options.

**Query Parameters**:
| Parameter | Type | Description | Default | Example |
|-----------|------|-------------|---------|---------|
| `limit` | integer | Number of results | 20 | `?limit=10` |
| `offset` | integer | Pagination offset | 0 | `?offset=20` |
| `search` | string | Search in names/descriptions | null | `?search=golden` |
| `breed` | string | Exact breed filter | null | `?breed=Labrador` |
| `standardized_size` | string | Filter by size | null | `?standardized_size=Medium` |
| `location_country` | string | Filter by location | null | `?location_country=TR` |
| `status` | string | Animal availability | "available" | `?status=available` |
| `sort` | string | Result sorting | "newest" | `?sort=name-asc` |

**Example Request**:
```bash
GET /api/animals/?standardized_size=Medium&location_country=TR&limit=10
```

**Response Example**:
```json
{
  "data": [
    {
      "id": 123,
      "name": "Bella",
      "breed": "Golden Retriever",
      "age_text": "2 years",
      "size": "Medium",
      "status": "available",
      "primary_image_url": "https://example.com/bella.jpg"
    }
  ],
  "meta": {
    "total": 414,
    "limit": 10,
    "offset": 0
  }
}
```

#### `GET /api/animals/random`
Get random available dogs for featured or discovery sections.

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Number of random animals | 3 |
| `status` | string | Animal status | "available" |

### Organizations API

#### `GET /api/organizations/`
Retrieve a list of rescue organizations.

**Query Parameters**:
| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `limit` | integer | Number of results | 20 |
| `offset` | integer | Pagination offset | 0 |
| `search` | string | Search organization names | null |
| `country` | string | Filter by country | null |
| `active_only` | boolean | Only active organizations | true |

**Example Request**:
```bash
GET /api/organizations/?country=Turkey&active_only=true
```

### Enhanced Animals API (LLM-Powered)

#### `GET /api/animals/{id}/enhanced`
Get LLM-generated enhanced data for a single animal.

**Response**: `EnhancedAnimalResponse` with description, tagline, personality traits, and completeness score.

#### `POST /api/animals/enhanced/detail-content`
Ultra-fast endpoint for dog detail pages (<50ms).

**Query Parameters**:
- `animal_ids`: List[int] (max 100)

**Response**: List of descriptions + taglines only.

#### `POST /api/animals/enhanced/bulk`
Bulk fetch enhanced data for comparisons (max 100 animals).

#### `POST /api/animals/enhanced/attributes`
Get specific LLM attributes for filtering.

#### `GET /api/animals/enhanced/stats`
LLM data coverage statistics by organization.

#### `GET /api/animals/enhanced/metrics`
Service metrics: cache hit rates, response times, retry counts.

### Metadata & Analytics Endpoints

#### `GET /api/animals/meta/breeds`
Get distinct standardized breeds.

#### `GET /api/animals/meta/filter_counts`
Retrieve real-time counts for filter options.

### Monitoring API 🔒

#### `GET /monitoring/scrapers`
Get comprehensive scraper status and performance metrics.

**Requires admin authentication**

## Error Handling

### Standard Error Response
```json
{
  "detail": "Validation error",
  "status_code": 422,
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### HTTP Status Codes
| Code | Description |
|------|-------------|
| 200 | Success |
| 301 | Moved Permanently |
| 400 | Bad Request |
| 401 | Unauthorized |
| 404 | Not Found |
| 422 | Validation Error |
| 500 | Internal Server Error

## Rate Limiting & Performance

- **Rate Limit**: 1000 requests/hour per IP
- **Pagination**: Default limit 20, max 10,000
- **Typical Response Times**:
  - Animals List: < 150ms
  - Animal Detail: < 80ms
  - Organizations: < 100ms

## Versioning & Support

- **Current Version**: 0.1.0
- **Documentation**: Available at `/docs` (Swagger UI)
- **Support**: Project repository issues

## CORS Configuration

### Development Origins
- `http://localhost:3000`
- `http://127.0.0.1:3000`
- Dynamic local network IP

### Production Origins
- Configured via `ALLOWED_ORIGINS` environment variable
- HTTPS-only origins recommended
