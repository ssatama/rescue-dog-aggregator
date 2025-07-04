# 📡 API Reference

## 🎯 Overview

The Rescue Dog Aggregator API provides RESTful access to aggregated rescue dog data from multiple organizations. The API supports filtering, pagination, and comprehensive search capabilities with production-ready availability management.

**Base URL**: `http://localhost:8000` (development) | `https://api.rescuedogaggregator.com` (production)

**API Version**: 0.1.0

## 🔐 Authentication

Currently, the API does not require authentication for public endpoints. All endpoints are publicly accessible.

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

### Error Response
```json
{
  "detail": "Error message",
  "status_code": 400
}
```

## Endpoints

### Animals API

#### GET /api/animals/

Get all animals with filtering, pagination, and location support.

**Query Parameters:**

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
| `status` | string | "available" | Filter by availability status |
| `location_country` | string | null | Filter by country where animal is located |
| `available_to_country` | string | null | Filter by adoption destination country |
| `available_to_region` | string | null | Filter by adoption destination region |
| `organization_id` | integer | null | Filter by specific organization |
| `availability_confidence` | string | "high,medium" | Filter by confidence level |
| `curation_type` | string | "random" | Curation algorithm: "recent", "diverse", "random" |

**Returns**: Array of Animal objects with embedded organization and image data.

#### GET /api/animals/{id}

Get a specific animal by ID.

**Path Parameters:**
- `id` (integer): Animal ID

**Returns**: Single Animal object with embedded organization and image data.

#### GET /api/animals/statistics

Get aggregated statistics about animals in the system.

**Returns**: Statistics object with totals by status, confidence level, and organization breakdown.

### Organizations API

#### GET /api/organizations/

Get all active rescue organizations.

**Returns**: Array of Organization objects with statistics and service information.

#### GET /api/organizations/{id}

Get a specific organization by ID.

**Path Parameters:**
- `id` (integer): Organization ID

**Returns**: Single Organization object with statistics and service information.

### Monitoring & Health API

#### GET /health

Basic health check endpoint.

**Returns**: Health status object with database connection status and basic metrics.

#### GET /health/detailed

Detailed health check with component status.

**Returns**: Detailed health status object with component metrics including scrapers and availability system status.

#### GET /monitoring/scrapers

Get scraper status and performance metrics.

**Returns**: Array of scraper status objects with performance metrics and failure detection information.

#### GET /monitoring/failures

Get failure detection summary.

**Returns**: Failure detection summary with error counts and failure rates.

## Data Models

### Animal Model

```typescript
interface Animal {
  id: number;
  name: string;
  animal_type: string;
  breed?: string;
  standardized_breed?: string;
  breed_group?: string;
  age_text?: string;
  age_min_months?: number;
  age_max_months?: number;
  sex?: string;
  size?: string;
  standardized_size?: string;
  status: string;
  primary_image_url?: string;
  adoption_url: string;
  organization_id: number;
  external_id?: string;
  language: string;
  properties: object;
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
  name: string;
  website_url: string;
  description?: string;
  country?: string;
  city?: string;
  logo_url?: string;
  social_media: object;
  active: boolean;
  created_at: string;
  updated_at: string;
  ships_to: string[];
  established_year?: number;
  service_regions: string[];
  total_dogs: number;
  new_this_week: number;
}
```

### AnimalImage Model

```typescript
interface AnimalImage {
  id: number;
  image_url: string;
  is_primary: boolean;
}
```

## Usage Examples

For comprehensive examples and practical usage patterns, see the [API Examples](examples.md) document.

## Rate Limiting

Currently, there are no rate limits enforced on the API. However, please be respectful with your requests to ensure service availability for all users.

## Error Codes

| Status Code | Meaning |
|-------------|---------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Resource does not exist |
| 422 | Unprocessable Entity - Validation error |
| 500 | Internal Server Error |

## CORS Support

The API supports Cross-Origin Resource Sharing (CORS) for the following origins:
- `http://localhost:3000` (development frontend)
- `http://127.0.0.1:3000` (alternative development)

## API Versioning

The current API version is 0.1.0. Future versions will be backwards compatible and new versions will be announced with migration guides.

## Support

For API support or questions, please:
1. Check this documentation first
2. Review the [troubleshooting guide](../operations/troubleshooting.md)
3. Submit an issue on the project repository

## Changelog

### v0.1.0 (Current)
- Initial API release
- Animals and Organizations endpoints
- Filtering and pagination support
- Availability confidence system
- Monitoring and health endpoints
- Curation algorithms (recent, diverse, random)