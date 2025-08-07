# 📡 API Reference

## 🎯 Overview

The Rescue Dog Aggregator API provides modern, enterprise-grade RESTful access to aggregated rescue dog data from multiple organizations. Built with FastAPI and a clean service layer architecture, the API delivers exceptional performance, security, and reliability through advanced query optimization, connection pooling, and comprehensive input validation.

**Base URL**: `http://localhost:8000` (development) | `https://api.rescuedogs.me` (production)

**API Version**: 0.1.0 (Current Implementation)

**Framework**: FastAPI with Pydantic v2 validation

## 🏗️ Architecture Overview

### FastAPI Implementation
The API implements a clean three-layer architecture:
- **Route Layer**: FastAPI route handlers with dependency injection
- **Service Layer**: Business logic encapsulated in service classes
- **Database Layer**: PostgreSQL with connection pooling and parameterized queries

### Performance & Security Features
- **Connection Pooling**: Thread-safe PostgreSQL connection management via dependency injection
- **Parameterized Queries**: SQL injection prevention through psycopg2 parameterized queries
- **Input Validation**: Comprehensive Pydantic v2 models with custom validators
- **Error Handling**: Standardized exception handling with structured error responses
- **Security Headers**: Automatic security headers via middleware

### Key Features
- **SEO-Friendly URLs**: Slug-based URLs with automatic 301 redirects from legacy ID URLs
- **Meta Endpoints**: Dynamic metadata for building responsive filter UIs
- **Real-time Counts**: Dynamic filter counts based on current filter context
- **CORS Security**: Environment-based CORS configuration with origin validation
- **Admin Authentication**: Simple API key authentication for monitoring endpoints

## 🔐 Authentication & Security

### Public Endpoints
Most endpoints are publicly accessible without authentication.

### Admin Endpoints
Monitoring and administrative endpoints require authentication via the `X-API-Key` header:

```bash
curl -H "X-API-Key: your-admin-key" http://localhost:8000/monitoring/scrapers
```

Protected endpoints are marked with 🔒 in this documentation.

### Security Features
- **CORS Configuration**: Environment-specific CORS policy with validated origins
- **Security Headers**: Automatic security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Referrer-Policy)
- **Input Sanitization**: Comprehensive input validation via Pydantic models
- **SQL Injection Prevention**: All queries use parameterized statements
- **Safe Error Handling**: No sensitive information leaked in error responses

## 📄 Response Format

All API responses follow a consistent JSON format:

### Success Response
```json
{
  "data": [...],
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

### Error Response (Enhanced)
```json
{
  "detail": "Validation error: Invalid standardized_size value",
  "status_code": 422,
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Handling Improvements
- **Standardized Error Codes**: Consistent error codes across all endpoints
- **Detailed Error Messages**: Specific validation errors with field-level details
- **Safe Error Responses**: No sensitive information leaked in error messages
- **Comprehensive Exception Handling**: Covers database, validation, and business logic errors

## 📍 URL Structure

### Slug-based URLs (Recommended)
All resources now support SEO-friendly slug-based URLs:
- `/api/animals/{animal-slug}` - e.g., `/api/animals/bella-golden-retriever-123`
- `/api/organizations/{organization-slug}` - e.g., `/api/organizations/pets-turkey`

### Legacy ID Support
For backwards compatibility, ID-based URLs automatically redirect (301) to slug URLs:
- `/api/animals/id/{id}` → `/api/animals/{slug}`
- `/api/organizations/id/{id}` → `/api/organizations/{slug}`

## 📍 Endpoints

### Root Endpoint

#### GET /
Welcome message and API information.

**Returns**:
```json
{
  "message": "Welcome to the Rescue Dog Aggregator API",
  "version": "0.1.0",
  "documentation": "/docs",
  "environment": "development"
}
```

### Animals API

#### GET /api/animals/

Get all animals with comprehensive filtering, pagination, and location support. Uses optimized service layer with connection pooling and parameterized queries.

**Query Parameters** (via AnimalFilterRequest model):

| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `limit` | integer | 20 | 1-10000 | Number of results to return |
| `offset` | integer | 0 | ≥0 | Number of results to skip |
| `search` | string | null | - | Search in animal names and descriptions |
| `animal_type` | string | "dog" | - | Type of animal to filter by |
| `status` | string | "available" | AnimalStatus enum or "all" | Animal availability status |
| `breed` | string | null | - | Filter by exact breed name |
| `standardized_breed` | string | null | - | Filter by standardized breed |
| `breed_group` | string | null | - | Filter by breed group |
| `sex` | string | null | - | Filter by sex (male, female) |
| `size` | string | null | - | Filter by size |
| `standardized_size` | enum | null | StandardizedSize enum | Filter by standardized size (Tiny, Small, Medium, Large) |
| `age_category` | string | null | - | Filter by age category |
| `location_country` | string | null | - | Filter by country where animal is located |
| `available_to_country` | string | null | - | Filter by adoption destination country |
| `available_to_region` | string | null | - | Filter by adoption destination region |
| `organization_id` | integer | null | - | Filter by specific organization ID |
| `availability_confidence` | string | "high,medium" | Comma-separated values | Filter by availability confidence levels |
| `curation_type` | string | "random" | "recent", "recent_with_fallback", "diverse", "random" | Curation algorithm |
| `sort` | string | "newest" | "newest", "oldest", "name-asc", "name-desc" | Sort order |
| `sitemap_quality_filter` | boolean | false | - | Filter for sitemap generation (SEO optimization) |

**Example Request**:
```bash
GET /api/animals/?limit=10&standardized_size=Medium&location_country=TR&sort=newest
```

**Returns**: Array of AnimalWithImages objects with embedded organization and image data.

#### GET /api/animals/random

Get random available dogs for featured sections or discovery.

**Query Parameters:**
| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `limit` | integer | 3 | 1-10 | Number of random animals to return |
| `status` | string | "available" | - | Animal status filter |

**Example Request**:
```bash
GET /api/animals/random?limit=5
```

**Returns**: Array of Animal objects (without images).

#### GET /api/animals/{animal_slug}

Get a specific animal by slug with automatic legacy ID redirect support. **SEO-friendly URL format.**

**Path Parameters:**
- `animal_slug` (string): Animal slug identifier or numeric ID (for legacy support)

**Legacy Support**: Numeric IDs automatically redirect (301) to slug-based URLs.

**Example Request**:
```bash
GET /api/animals/bella-golden-retriever-123
```

**Returns**: Single AnimalWithImages object with embedded organization and image data.

**Error Responses**:
- `404 Not Found`: Animal not found
- `301 Moved Permanently`: Legacy ID redirected to slug URL

#### GET /api/animals/id/{animal_id}

Legacy endpoint that redirects to slug-based URL.

**Path Parameters:**
- `animal_id` (integer): Animal ID

**Returns**: 301 redirect to `/api/animals/{animal_slug}`

#### GET /api/animals/statistics

Get aggregated statistics about animals in the system via AnimalService.

**Returns**: Statistics object with comprehensive metrics including animal counts by status, organization breakdown, and trends.

### Animals Metadata API

These endpoints provide metadata for building dynamic filter UIs and are essential for frontend applications.

#### GET /api/animals/meta/breeds

Get distinct standardized breeds with optional filtering by breed group.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `breed_group` | string (optional) | Filter breeds by breed group |

**Example Request**:
```bash
GET /api/animals/meta/breeds?breed_group=Working Dogs
```

**Returns**: Array of breed strings.

#### GET /api/animals/meta/breed_groups

Get all distinct breed groups in the system.

**Example Request**:
```bash
GET /api/animals/meta/breed_groups
```

**Returns**: Array of breed group strings (e.g., ["Working Dogs", "Sporting Dogs", "Herding Dogs"]).

#### GET /api/animals/meta/location_countries

Get all distinct countries where active organizations are located.

**Example Request**:
```bash
GET /api/animals/meta/location_countries
```

**Returns**: Array of country strings, alphabetically sorted.

#### GET /api/animals/meta/available_countries

Get all distinct countries organizations can adopt to (from service_regions).

**Example Request**:
```bash
GET /api/animals/meta/available_countries
```

**Returns**: Array of country strings where adoptions are available.

#### GET /api/animals/meta/available_regions

Get available regions within a specific country for adoptions.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `country` | string | Yes | Country to get regions for |

**Example Request**:
```bash
GET /api/animals/meta/available_regions?country=Turkey
```

**Returns**: Array of region strings within the specified country.

#### GET /api/animals/meta/filter_counts

Get real-time counts for each filter option based on current filter context. Essential for building dynamic filter UIs that prevent dead-end filtering scenarios.

**Query Parameters** (via AnimalFilterCountRequest model):
All the same filtering parameters as the main animals endpoint to provide context for counting.

**Example Request**:
```bash
GET /api/animals/meta/filter_counts?location_country=TR&standardized_size=Medium
```

**Returns** (FilterCountsResponse model):
```json
{
  "size_options": [
    {"value": "Small", "label": "Small", "count": 15},
    {"value": "Medium", "label": "Medium", "count": 23},
    {"value": "Large", "label": "Large", "count": 8}
  ],
  "age_options": [
    {"value": "puppy", "label": "Puppy", "count": 12},
    {"value": "young", "label": "Young", "count": 20},
    {"value": "adult", "label": "Adult", "count": 14}
  ],
  "sex_options": [
    {"value": "male", "label": "Male", "count": 22},
    {"value": "female", "label": "Female", "count": 24}
  ],
  "breed_options": [...],
  "organization_options": [...],
  "location_country_options": [...],
  "available_country_options": [...],
  "available_region_options": [...]
}
```

### Organizations API

#### GET /api/organizations/

Get all organizations with optional filtering, pagination, and aggregate statistics.

**Query Parameters** (via OrganizationFilterRequest model):
| Parameter | Type | Default | Validation | Description |
|-----------|------|---------|------------|-------------|
| `limit` | integer | 20 | 1-10000 | Number of results to return |
| `offset` | integer | 0 | ≥0 | Number of results to skip |
| `search` | string | null | - | Search in organization names |
| `country` | string | null | - | Filter by country |
| `active_only` | boolean | true | - | Only return active organizations |

**Example Request**:
```bash
GET /api/organizations/?country=Turkey&search=rescue&limit=10
```

**Returns**: Array of Organization objects with aggregate statistics including:
- Total dogs available
- New dogs added this week
- Parsed JSON fields (social_media, ships_to, service_regions, adoption_fees)

#### GET /api/organizations/{organization_slug}

Get a specific organization by slug with automatic legacy ID redirect support. **SEO-friendly URL format.**

**Path Parameters:**
- `organization_slug` (string): Organization slug identifier or numeric ID (for legacy support)

**Legacy Support**: Numeric IDs automatically redirect (301) to slug-based URLs.

**Example Request**:
```bash
GET /api/organizations/pets-turkey
```

**Returns**: Single Organization object with enhanced statistics and parsed JSON fields.

**Error Responses**:
- `404 Not Found`: Organization not found
- `301 Moved Permanently`: Legacy ID redirected to slug URL

#### GET /api/organizations/id/{organization_id}

Legacy endpoint that redirects to slug-based URL.

**Path Parameters:**
- `organization_id` (integer): Organization ID

**Returns**: 301 redirect to `/api/organizations/{organization_slug}`

#### GET /api/organizations/{organization_id}/recent-dogs

Get recently added dogs from a specific organization with thumbnail URLs. Useful for organization preview cards.

**Path Parameters:**
- `organization_id` (integer): Organization ID

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 3 | Number of recent dogs to return |

**Example Request**:
```bash
GET /api/organizations/123/recent-dogs?limit=5
```

**Returns**: Array of objects with `id`, `name`, `primary_image_url`, and `thumbnail_url`.

#### GET /api/organizations/{organization_id}/statistics

Get comprehensive statistics for a specific organization.

**Path Parameters:**
- `organization_id` (integer): Organization ID

**Example Request**:
```bash
GET /api/organizations/123/statistics
```

**Returns**: Statistics object including:
```json
{
  "total_dogs": 45,
  "new_this_week": 3,
  "new_this_month": 12
}
```

### Health & Monitoring API

#### GET /health

Basic health check endpoint for load balancers and monitoring systems.

**Returns** (HealthStatus model):
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "version": "1.0.0",
  "database": {
    "status": "connected",
    "response_time_ms": 25.3
  }
}
```

**Status Values**: `healthy`, `degraded`, `unhealthy`

### Monitoring API 🔒

All monitoring endpoints require admin authentication via `X-API-Key` header.

#### GET /monitoring/scrapers 🔒

Get comprehensive status of all scrapers with performance metrics and failure analysis.

**Query Parameters** (via MonitoringFilterRequest model):
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `organization_id` | integer | null | Filter by specific organization |
| `time_range_hours` | integer | 24 | Time range for metrics (1-168 hours) |
| `status_filter` | string | null | Filter by scraper status |
| `include_details` | boolean | false | Include detailed metrics |

**Example Request**:
```bash
curl -H "X-API-Key: your-key" "http://localhost:8000/monitoring/scrapers?time_range_hours=48"
```

**Returns**: Comprehensive scraper monitoring data including:
- Individual scraper status and performance metrics
- Failure detection and consecutive failure tracking
- Summary statistics across all scrapers
- Performance metrics (success rates, average duration, data quality scores)

#### GET /monitoring/scrapers/{organization_id} 🔒

Get detailed information about a specific scraper with comprehensive metrics and failure analysis.

**Path Parameters:**
- `organization_id` (integer): Organization ID

**Example Request**:
```bash
curl -H "X-API-Key: your-key" "http://localhost:8000/monitoring/scrapers/123"
```

**Returns**: Detailed scraper analysis including:
- Recent scrape history (last 10 runs)
- Performance metrics (last 30 days)
- Failure pattern analysis
- Data quality trends

#### GET /monitoring/performance 🔒

Get system and scraper performance metrics.

**Example Request**:
```bash
curl -H "X-API-Key: your-key" "http://localhost:8000/monitoring/performance"
```

**Returns**: Performance metrics including:
- Scraper performance (duration, quality, success rates)
- Database connection pool status
- System resource utilization
- Animals processed per hour

#### GET /monitoring/failures 🔒

Get failure detection metrics and recent failure analysis with categorized failure types.

**Example Request**:
```bash
curl -H "X-API-Key: your-key" "http://localhost:8000/monitoring/failures"
```

**Returns**: Failure analysis including:
- Categorized failure counts (catastrophic, partial, database errors)
- Recent failure history with context
- Failure rate calculations
- Alert thresholds and configuration

#### GET /monitoring/alerts/config 🔒

Get current alerting configuration and thresholds.

**Returns**: Alert configuration including:
- Failure detection thresholds
- Notification settings
- Monitoring intervals

#### GET /monitoring/alerts/active 🔒

Get currently active alerts requiring attention.

**Returns**: Active alerts including:
- Consecutive failure alerts
- Organizations with no recent scrapes
- Alert summary by severity level

## 📊 Data Models

### Core Models

#### AnimalWithImages Model
Based on the Pydantic AnimalWithImages class extending Animal:

```json
{
  "id": 123,
  "slug": "bella-golden-retriever-123",
  "name": "Bella",
  "animal_type": "dog",
  "breed": "Golden Retriever",
  "standardized_breed": "Golden Retriever",
  "breed_group": "Sporting Dogs",
  "age_text": "2 years",
  "age_min_months": 24,
  "age_max_months": 24,
  "sex": "female",
  "size": "Large",
  "standardized_size": "Large",
  "status": "available",
  "primary_image_url": "https://example.com/image.jpg",
  "adoption_url": "https://organization.com/adopt/bella",
  "organization_id": 5,
  "external_id": "org-123",
  "language": "en",
  "properties": {
    "good_with_cats": true,
    "good_with_dogs": true,
    "special_needs": false
  },
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T12:00:00Z",
  "last_scraped_at": "2025-01-15T12:00:00Z",
  "availability_confidence": "high",
  "last_seen_at": "2025-01-15T12:00:00Z",
  "consecutive_scrapes_missing": 0,
  "images": [...],
  "organization": {...}
}
```

#### Organization Model
Based on the Pydantic Organization class:

```json
{
  "id": 5,
  "slug": "golden-retriever-rescue",
  "name": "Golden Retriever Rescue",
  "website_url": "https://goldenrescue.org",
  "description": "Dedicated to rescuing Golden Retrievers",
  "country": "Turkey",
  "city": "Istanbul",
  "logo_url": "https://example.com/logo.png",
  "active": true,
  "created_at": "2024-01-01T00:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z",
  "social_media": {
    "facebook": "https://facebook.com/goldenrescue",
    "instagram": "@goldenrescue"
  },
  "ships_to": ["Turkey", "Germany", "Netherlands"],
  "established_year": 2018,
  "service_regions": ["Istanbul", "Ankara", "Izmir"],
  "total_dogs": 45,
  "new_this_week": 3,
  "adoption_fees": {
    "domestic": 200,
    "international": 500,
    "currency": "EUR"
  }
}
```

#### AnimalImage Model
Based on the Pydantic AnimalImage class:

```json
{
  "id": 456,
  "image_url": "https://r2.example.com/image.jpg",
  "is_primary": true
}
```

### Request Models

#### AnimalFilterRequest
Comprehensive filtering model with validation:

```json
{
  "limit": 20,
  "offset": 0,
  "search": "golden retriever",
  "animal_type": "dog",
  "status": "available",
  "breed": "Golden Retriever",
  "standardized_breed": "Golden Retriever",
  "breed_group": "Sporting Dogs",
  "sex": "female",
  "size": "Large",
  "standardized_size": "Large",
  "age_category": "adult",
  "location_country": "Turkey",
  "available_to_country": "Germany",
  "available_to_region": "Berlin",
  "organization_id": 5,
  "availability_confidence": "high,medium",
  "curation_type": "random",
  "sort": "newest",
  "sitemap_quality_filter": false
}
```

#### OrganizationFilterRequest
Organization filtering with pagination:

```json
{
  "limit": 20,
  "offset": 0,
  "search": "rescue",
  "country": "Turkey",
  "active_only": true
}
```

### Response Models

#### FilterCountsResponse
Dynamic filter counts for UI building:

```json
{
  "size_options": [
    {"value": "Small", "label": "Small", "count": 15},
    {"value": "Medium", "label": "Medium", "count": 23},
    {"value": "Large", "label": "Large", "count": 8}
  ],
  "age_options": [
    {"value": "puppy", "label": "Puppy", "count": 12},
    {"value": "young", "label": "Young", "count": 20}
  ],
  "sex_options": [
    {"value": "male", "label": "Male", "count": 22},
    {"value": "female", "label": "Female", "count": 24}
  ],
  "breed_options": [...],
  "organization_options": [...],
  "location_country_options": [...],
  "available_country_options": [...],
  "available_region_options": [...]
}
```

#### FilterOption
Individual filter option with count:

```json
{
  "value": "Medium",
  "label": "Medium",
  "count": 23
}
```

### Enums

#### AnimalStatus
```json
["available", "adopted", "pending", "unavailable"]
```

#### AvailabilityConfidence
```json
["high", "medium", "low"]
```

#### StandardizedSize
```json
["Tiny", "Small", "Medium", "Large"]
```

## 🔄 Usage Examples

### Basic Animal Search
```bash
# Get available medium-sized dogs in Turkey
GET /api/animals/?standardized_size=Medium&location_country=Turkey&status=available&limit=10

# Search for Golden Retrievers
GET /api/animals/?search=golden retriever&breed_group=Sporting Dogs

# Get recent dogs with fallback curation
GET /api/animals/?curation_type=recent_with_fallback&limit=20&sort=newest
```

### Meta Endpoints for Dynamic UIs
```bash
# Get filter counts based on current context
GET /api/animals/meta/filter_counts?location_country=Turkey&standardized_size=Medium

# Get available breeds for a specific breed group
GET /api/animals/meta/breeds?breed_group=Working Dogs

# Get regions for adoption in a specific country
GET /api/animals/meta/available_regions?country=Germany
```

### Organization Queries
```bash
# Find rescue organizations in Turkey
GET /api/organizations/?country=Turkey&active_only=true

# Get recent dogs from a specific organization
GET /api/organizations/123/recent-dogs?limit=5

# Get organization statistics
GET /api/organizations/123/statistics
```

### Individual Resources
```bash
# Get specific animal by slug (SEO-friendly)
GET /api/animals/bella-golden-retriever-123

# Legacy ID redirect (301) to slug URL
GET /api/animals/id/123

# Get specific organization by slug
GET /api/organizations/pets-turkey
```

## 📊 Rate Limiting & Pagination

**Rate Limiting**: Currently no rate limits are enforced, but please be respectful with request frequency.

**Pagination**: All list endpoints support `limit` and `offset` parameters:
- Default `limit`: 20 items
- Maximum `limit`: 10,000 items  
- `offset`: 0-based pagination offset

## ❌ Error Handling

### HTTP Status Codes

| Status | Error Code | Description |
|--------|------------|-------------|
| 200 | - | Success |
| 301 | - | Moved Permanently (legacy ID → slug redirect) |
| 400 | `BAD_REQUEST` | Invalid request parameters |
| 401 | `AUTHENTICATION_ERROR` | Missing/invalid X-API-Key |
| 404 | `NOT_FOUND` | Resource not found |
| 422 | `VALIDATION_ERROR` | Pydantic validation failed |
| 500 | `INTERNAL_ERROR` | Database or system error |

### Error Response Format

```json
{
  "detail": "Validation error: Invalid standardized_size value",
  "status_code": 422,
  "error_code": "VALIDATION_ERROR"
}
```

### Common Validation Errors
- **Invalid Enums**: `standardized_size` must be "Tiny", "Small", "Medium", or "Large"
- **Range Validation**: `limit` must be between 1-10000
- **Missing Required**: `country` parameter required for available regions
- **Type Conversion**: Invalid integer values for IDs or pagination

### Database Error Handling
- Connection pooling prevents most connection issues
- All queries use parameterized statements (SQL injection protection)
- Database errors return generic messages without sensitive information

## 🌐 CORS Configuration

### Development Origins
- `http://localhost:3000`
- `http://127.0.0.1:3000`  
- `http://localhost:3001`
- Dynamic local network IP (automatically detected)

### Production Origins
- Configured via `ALLOWED_ORIGINS` environment variable
- HTTPS-only origins recommended
- Comma-separated list validation

### CORS Settings
- **Methods**: GET, POST, PUT, DELETE, OPTIONS (production) | * (development)
- **Headers**: Standard headers (production) | * (development)
- **Credentials**: Configurable via `CORS_ALLOW_CREDENTIALS`
- **Max Age**: 1 hour (production) | 24 hours (development)

## 🔧 API Versioning & Support

**Current Version**: 0.1.0

**Versioning Strategy**: Backward-compatible changes within minor versions. Breaking changes will increment major version with migration guides.

**Interactive Documentation**: Available at `/docs` (Swagger UI) and `/redoc` (ReDoc)

**Support Channels**:
1. Interactive API documentation at `/docs`
2. This comprehensive reference documentation
3. Project repository issues for bugs/feature requests

## 📋 Changelog

### v0.1.0 (Current Implementation)
- **FastAPI Framework**: Modern async Python framework with Pydantic v2
- **Service Layer Architecture**: Clean separation of concerns with dependency injection
- **SEO-Friendly URLs**: Slug-based URLs with automatic legacy ID redirects
- **Comprehensive Filtering**: Advanced filtering with real-time filter counts
- **Meta Endpoints**: Dynamic metadata for responsive UI development
- **Security Features**: CORS configuration, security headers, input validation
- **Admin Monitoring**: Protected endpoints for scraper and system monitoring
- **Error Handling**: Standardized exceptions with structured error responses
- **Connection Pooling**: Optimized database access with connection management
- **Input Validation**: Comprehensive Pydantic models with custom validators