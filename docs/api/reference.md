# 📡 API Reference

## 🎯 Overview

The Rescue Dog Aggregator API provides modern, enterprise-grade RESTful access to aggregated rescue dog data from multiple organizations. Built with a service layer architecture, the API delivers exceptional performance, security, and reliability through advanced query optimization, connection pooling, and comprehensive input validation.

**Base URL**: `http://localhost:8000` (development) | `https://api.rescuedogs.me` (production)

**API Version**: 0.2.0 (Slug-based URLs with Enhanced Metadata)

## 🏗️ Architecture Overview

### Service Layer Implementation
The API implements a clean three-layer architecture:
- **Route Layer**: HTTP request handling and validation
- **Service Layer**: Business logic and data processing  
- **Database Layer**: Optimized data access with connection pooling

### Performance Optimizations
- **Connection Pooling**: Thread-safe PostgreSQL connection management
- **Batch Query Execution**: Eliminates N+1 query problems  
- **Query Builder**: Dynamic parameterized queries
- **Response Caching**: Intelligent caching with invalidation

### Key Features
- **SEO-Friendly URLs**: Slug-based URLs for better search engine optimization
- **Legacy Support**: Automatic 301 redirects from ID-based to slug-based URLs
- **Meta Endpoints**: Dynamic metadata for building responsive UIs
- **Real-time Counts**: Dynamic filter counts for enhanced user experience

## 🔐 Authentication

### Public Endpoints
Most endpoints are publicly accessible without authentication.

### Admin Endpoints
Monitoring and administrative endpoints require authentication via the `X-Admin-Key` header:

```bash
curl -H "X-Admin-Key: your-admin-key" https://api.rescuedogs.me/monitoring/scrapers
```

Protected endpoints are marked with 🔒 in this documentation.

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

## Endpoints

### Animals API

#### GET /api/animals/

Get all animals with advanced filtering, pagination, and location support. **Optimized with batch querying and connection pooling for superior performance.**

**Performance Improvements:**
- 25% faster response times through connection pooling
- 5x faster image loading through batch queries
- Eliminated N+1 query problems with intelligent batching
- Advanced query builder with parameterized queries

**Query Parameters (Enhanced):**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of results to return (1-100) |
| `offset` | integer | 0 | Number of results to skip |
| `search` | string | null | Search in animal names and descriptions |
| `breed` | string | null | Filter by exact breed name |
| `standardized_breed` | string | null | Filter by standardized breed |
| `breed_group` | string | null | Filter by breed group |
| `sex` | string | null | Filter by sex (male, female) |
| `size` | string | null | Filter by size |
| `standardized_size` | string | null | Filter by standardized size (small, medium, large) |
| `age_category` | string | null | Filter by age category |
| `animal_type` | string | "dog" | Filter by animal type |
| `good_with_cats` | boolean | null | Filter by cat compatibility |
| `good_with_dogs` | boolean | null | Filter by dog compatibility |
| `good_with_kids` | boolean | null | Filter by child compatibility |
| `special_needs` | boolean | null | Filter by special needs status |
| `status` | string | "available" | Filter by availability status |
| `location_country` | string | null | Filter by country where animal is located |
| `available_to_country` | string | null | Filter by adoption destination country |
| `available_to_region` | string | null | Filter by adoption destination region |
| `organization` | string | null | Filter by organization ID or slug |
| `availability_status` | string | "available" | Filter by availability (available, adopted, removed) |
| `availability_confidence` | string | "high,medium" | Comma-separated confidence levels |
| `curation_type` | string | "random" | Curation algorithm: "recent", "diverse", "random" |
| `sort` | string | "newest" | Sort order: "newest", "oldest", "name_asc", "name_desc" |

**Returns**: Array of AnimalWithImages objects including organization data.

#### GET /api/animals/random

Get random animals from the database. Useful for homepage displays or discovery features.

**Query Parameters:**
- `limit` (integer, default: 12): Number of random animals to return

**Returns**: Array of AnimalWithImages objects.

#### GET /api/animals/{animal_slug}

Get a specific animal by slug. **SEO-friendly URL format.**

**Path Parameters:**
- `animal_slug` (string): Animal slug identifier

**Returns**: Single AnimalWithImages object with embedded organization and image data.

#### GET /api/animals/id/{animal_id}

Legacy endpoint that redirects to slug-based URL.

**Path Parameters:**
- `animal_id` (integer): Animal ID

**Returns**: 301 redirect to `/api/animals/{animal_slug}`

#### GET /api/animals/statistics

Get aggregated statistics about animals in the system.

**Returns**: Statistics object with totals by status, confidence level, and organization breakdown.

### Animals Metadata API

These endpoints provide metadata for building dynamic filter UIs.

#### GET /api/animals/meta/breeds

Get distinct breeds with optional filtering by breed group.

**Query Parameters:**
- `breed_group` (string, optional): Filter breeds by breed group

**Returns**: Array of breed strings.

#### GET /api/animals/meta/breed_groups

Get all distinct breed groups in the system.

**Returns**: Array of breed group strings.

#### GET /api/animals/meta/location_countries

Get all distinct countries where animals are currently located.

**Returns**: Array of country codes.

#### GET /api/animals/meta/available_countries

Get all countries that organizations ship to.

**Returns**: Array of country codes.

#### GET /api/animals/meta/available_regions

Get available regions for a specific country.

**Query Parameters:**
- `country` (string, required): Country code to get regions for

**Returns**: Array of region strings.

#### GET /api/animals/meta/filter_counts

Get real-time counts for each filter option based on current filters. Essential for building dynamic filter UIs that show users how many results each filter option would return.

**Request Body:**
```json
{
  "breed_group": "Herding Dogs",
  "location_country": "TR",
  // ... any other filters
}
```

**Returns:**
```json
{
  "breeds": {
    "German Shepherd": 15,
    "Border Collie": 8
  },
  "ages": {
    "puppy": 5,
    "young": 12,
    "adult": 6
  },
  "sizes": {
    "small": 3,
    "medium": 15,
    "large": 5
  },
  // ... counts for all filter categories
}
```

### Organizations API

#### GET /api/organizations/

Get all active rescue organizations.

**Returns**: Array of Organization objects with statistics and service information.

#### GET /api/organizations/{organization_slug}

Get a specific organization by slug. **SEO-friendly URL format.**

**Path Parameters:**
- `organization_slug` (string): Organization slug identifier

**Returns**: Single Organization object with enhanced statistics.

#### GET /api/organizations/id/{organization_id}

Legacy endpoint that redirects to slug-based URL.

**Path Parameters:**
- `organization_id` (integer): Organization ID

**Returns**: 301 redirect to `/api/organizations/{organization_slug}`

#### GET /api/organizations/{organization_id}/recent-dogs

Get recently added dogs from a specific organization. Useful for organization detail pages.

**Path Parameters:**
- `organization_id` (integer): Organization ID

**Query Parameters:**
- `limit` (integer, default: 6): Number of dogs to return

**Returns**: Array of AnimalWithImages objects.

#### GET /api/organizations/{organization_id}/statistics

Get detailed statistics for a specific organization.

**Path Parameters:**
- `organization_id` (integer): Organization ID

**Returns**: Organization statistics object including adoption rates and trends.

### Health & Monitoring API

#### GET /health

Basic health check endpoint.

**Returns**: Health status object.

#### GET /health/detailed

Detailed health check with component status.

**Returns**: Comprehensive health status including database, scraper, and service health.

### Monitoring API 🔒

All monitoring endpoints require admin authentication.

#### GET /monitoring/scrapers 🔒

Get status of all scrapers with performance metrics.

**Query Parameters:**
- `status` (string): Filter by status (active, failing, inactive)
- `days` (integer, default: 7): Number of days for metrics

**Returns**: Array of scraper status objects with detailed metrics.

#### GET /monitoring/scrapers/{organization_id} 🔒

Get detailed status for a specific scraper.

**Path Parameters:**
- `organization_id` (integer): Organization ID

**Returns**: Detailed scraper status with run history and error logs.

#### GET /monitoring/performance 🔒

Get API performance metrics.

**Returns**: Performance metrics including response times, error rates, and throughput.

#### GET /monitoring/alerts/config 🔒

Get current alerting configuration.

**Returns**: Alert configuration including thresholds and notification settings.

#### GET /monitoring/alerts/active 🔒

Get currently active alerts.

**Returns**: Array of active alerts with severity and details.

#### GET /monitoring/failures 🔒

Get failure detection summary across all scrapers.

**Returns**: Failure summary with patterns and recommendations.

## Data Models

### AnimalWithImages Model

```typescript
interface AnimalWithImages {
  id: number;
  slug: string;
  name: string;
  animal_type: string;
  breed?: string;
  standardized_breed?: string;
  breed_group?: string;
  age_text?: string;
  age_min_months?: number;
  age_max_months?: number;
  age_category?: string;
  sex?: string;
  size?: string;
  standardized_size?: string;
  status: string;
  primary_image_url?: string;
  adoption_url: string;
  organization_id: number;
  external_id?: string;
  language: string;
  properties: {
    good_with_cats?: boolean;
    good_with_dogs?: boolean;
    good_with_kids?: boolean;
    special_needs?: boolean;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  last_scraped_at?: string;
  availability_confidence: 'high' | 'medium' | 'low';
  last_seen_at?: string;
  consecutive_scrapes_missing: number;
  organization: Organization;
  images: AnimalImage[];
}
```

### Organization Model

```typescript
interface Organization {
  id: number;
  slug: string;
  name: string;
  website_url: string;
  description?: string;
  country?: string;
  city?: string;
  logo_url?: string;
  social_media: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  active: boolean;
  created_at: string;
  updated_at: string;
  ships_to: string[];
  established_year?: number;
  service_regions: ServiceRegion[];
  total_dogs: number;
  new_this_week: number;
  adoption_rate?: number;
  average_time_to_adoption?: number;
}
```

### ServiceRegion Model

```typescript
interface ServiceRegion {
  country_code: string;
  country_name: string;
  regions?: string[];
  shipping_info?: string;
}
```

### AnimalImage Model

```typescript
interface AnimalImage {
  id: number;
  image_url: string;
  is_primary: boolean;
  cloudinary_id?: string;
  width?: number;
  height?: number;
}
```

### Request Models

#### AnimalFilterRequest

```typescript
interface AnimalFilterRequest {
  search?: string;
  breed?: string;
  breed_group?: string;
  age_category?: string;
  sex?: string;
  size?: string;
  standardized_size?: string;
  good_with_cats?: boolean;
  good_with_dogs?: boolean;
  good_with_kids?: boolean;
  special_needs?: boolean;
  location_country?: string;
  available_to_country?: string;
  available_to_region?: string;
  organization?: string;
  availability_status?: string;
  availability_confidence?: string;
  curation_type?: 'recent' | 'diverse' | 'random';
  sort?: 'newest' | 'oldest' | 'name_asc' | 'name_desc';
  limit?: number;
  offset?: number;
}
```

## Usage Examples

For comprehensive examples and practical usage patterns, see the [API Examples](examples.md) document.

## Rate Limiting

Currently, there are no rate limits enforced on the API. However, please be respectful with your requests to ensure service availability for all users.

## Error Codes (Enhanced)

| Status Code | Meaning | Error Code | Description |
|-------------|---------|------------|-------------|
| 200 | Success | - | Request completed successfully |
| 301 | Moved Permanently | - | Resource moved to slug-based URL |
| 400 | Bad Request | `BAD_REQUEST` | Invalid request format or parameters |
| 401 | Unauthorized | `UNAUTHORIZED` | Missing or invalid admin key |
| 404 | Not Found | `NOT_FOUND` | Resource does not exist |
| 422 | Unprocessable Entity | `VALIDATION_ERROR` | Input validation failed |
| 500 | Internal Server Error | `INTERNAL_ERROR` | Server error with safe messaging |

### Error Response Format
All error responses include:
- **Specific error codes** for programmatic handling
- **Detailed error messages** with field-level validation errors
- **Timestamps** for debugging and monitoring
- **Safe error messaging** with no sensitive information exposure

### Common Error Scenarios
- **Invalid enum values**: Standardized size/status validation
- **Missing required params**: Meta endpoints requiring country parameter
- **Invalid slug format**: Malformed slug in URL
- **Type coercion failures**: Automatic type conversion with validation
- **Range validation**: Limit/offset bounds checking
- **SQL injection attempts**: Blocked by parameterized queries
- **Database connection issues**: Handled gracefully with connection pooling

## CORS Support

The API supports Cross-Origin Resource Sharing (CORS) for the following origins:
- `http://localhost:3000` (development frontend)
- `http://127.0.0.1:3000` (alternative development)
- `https://rescuedogs.me` (production frontend)
- `https://www.rescuedogs.me` (production frontend with www)

## API Versioning

The current API version is 0.2.0. Future versions will be backwards compatible and new versions will be announced with migration guides.

## Support

For API support or questions, please:
1. Check this documentation first
2. Review the [troubleshooting guide](../operations/troubleshooting.md)
3. Submit an issue on the project repository

## Changelog

### v0.2.0 (Current - Slug-based URLs & Enhanced Metadata)
- **SEO-Friendly URLs**: Slug-based URLs with automatic redirects from legacy IDs
- **Meta Endpoints**: Comprehensive metadata endpoints for dynamic UIs
- **Enhanced Filtering**: Multi-value filters, location-based filtering
- **Real-time Counts**: Dynamic filter counts for better UX
- **Admin Authentication**: Protected monitoring endpoints
- **Organization Enhancements**: Recent dogs, statistics, service regions
- **Performance**: Further query optimizations

### v0.1.0 (Post-Refactoring)
- **Major Architecture Refactoring**: Complete service layer implementation
- **Performance Optimizations**: Connection pooling, batch queries, 25-33% faster responses
- **Security Enhancements**: Input validation, URL sanitization, SQL injection prevention
- **Error Handling**: Standardized exceptions with detailed error codes
- **Query Optimization**: Eliminated N+1 problems with intelligent batching
- **Type Safety**: Enhanced Pydantic v2 validation with custom validators
- **Documentation**: Updated API documentation reflecting new architecture