# API Reference Guide

## Overview

The Rescue Dog Aggregator API provides RESTful endpoints for accessing standardized animal data with production-ready availability filtering. The API defaults to showing only reliable, recently-seen animals to ensure the best user experience.

## Base URL

- **Development**: `http://localhost:8000`
- **Production**: `https://your-api-domain.com`

## Authentication

Currently, the API is publicly accessible. Authentication may be added in future versions for administrative features.

## Core Endpoints

### Animals

#### `GET /api/animals`

Retrieve a paginated list of animals with comprehensive filtering options.

**Default Behavior**: Only returns `available` animals with `high` or `medium` availability confidence.

**Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 20 | Number of results (1-100) |
| `offset` | integer | 0 | Pagination offset |
| `curation_type` | string | "random" | Curation algorithm: `random`, `recent`, or `diverse` |
| `status` | string | "available" | Animal status: `available`, `unavailable`, or `all` |
| `availability_confidence` | string | "high,medium" | Confidence levels: `high`, `medium`, `low`, `all`, or comma-separated combinations |
| `search` | string | - | Search in name, breed, or standardized breed |
| `breed` | string | - | Filter by exact breed |
| `standardized_breed` | string | - | Filter by standardized breed |
| `breed_group` | string | - | Filter by breed group (Sporting, Hound, etc.) |
| `sex` | string | - | Filter by sex (Male/Female) |
| `size` | string | - | Filter by size |
| `standardized_size` | string | - | Filter by standardized size |
| `age_category` | string | - | Filter by age category (Puppy/Young/Adult/Senior) |
| `organization_id` | integer | - | Filter by organization |
| `location_country` | string | - | Filter by organization's country |
| `available_to_country` | string | - | Filter by adoption availability country |
| `available_to_region` | string | - | Filter by adoption availability region |

**Curation Types**:

The `curation_type` parameter controls how results are selected and ordered:

- **`random`** (default): Randomized selection for variety
- **`recent`**: Animals added in the last 7 days, ordered by newest first
- **`diverse`**: One animal per organization, randomly selected

**Example Requests**:

```bash
# Default - random curation with good confidence
curl "https://api.example.com/api/animals"

# Recent animals (last 7 days)
curl "https://api.example.com/api/animals?curation_type=recent&limit=10"

# Diverse selection (one per organization)
curl "https://api.example.com/api/animals?curation_type=diverse&limit=20"

# Show all animals regardless of status or confidence  
curl "https://api.example.com/api/animals?status=all&availability_confidence=all"

# High confidence animals only
curl "https://api.example.com/api/animals?availability_confidence=high"

# Search with location filtering
curl "https://api.example.com/api/animals?search=labrador&available_to_country=US&available_to_region=CA"

# Specific organization with pagination
curl "https://api.example.com/api/animals?organization_id=1&limit=50&offset=0"
```

**Response Format**:

```json
[
  {
    "id": 123,
    "name": "Buddy",
    "animal_type": "dog",
    "breed": "Labrador Mix",
    "standardized_breed": "Labrador Retriever Mix",
    "breed_group": "Sporting",
    "age_text": "2 years old",
    "age_min_months": 24,
    "age_max_months": 24,
    "sex": "Male",
    "size": "Large",
    "standardized_size": "Large",
    "status": "available",
    "availability_confidence": "high",
    "last_seen_at": "2024-06-07T18:30:00Z",
    "consecutive_scrapes_missing": 0,
    "primary_image_url": "https://res.cloudinary.com/...",
    "adoption_url": "https://organization.com/adopt/buddy",
    "organization_id": 1,
    "external_id": "ORG-123",
    "language": "en",
    "properties": {},
    "created_at": "2024-06-01T10:00:00Z",
    "updated_at": "2024-06-07T18:30:00Z",
    "last_scraped_at": "2024-06-07T18:30:00Z",
    "images": [
      {
        "id": 456,
        "image_url": "https://res.cloudinary.com/...",
        "is_primary": true
      }
    ],
    "organization": {
      "id": 1,
      "name": "Example Rescue",
      "city": "San Francisco",
      "country": "US",
      "website_url": "https://example-rescue.org",
      "social_media": {
        "facebook": "https://facebook.com/example-rescue",
        "instagram": "https://instagram.com/example-rescue"
      }
    }
  }
]
```

#### `GET /api/animals/{animal_id}`

Retrieve a specific animal by ID.

**Response**: Single animal object with same format as above.

**Example**:
```bash
curl "https://api.example.com/api/animals/123"
```

#### `GET /api/animals/random`

Get random animals for featured sections.

**Parameters**:
- `limit`: Number of random animals (1-10, default: 3)
- `status`: Animal status (default: "available")

**Example**:
```bash
curl "https://api.example.com/api/animals/random?limit=5"
```

#### `GET /api/animals/statistics`

Get aggregated statistics about available animals and organizations.

**Response Format**:
```json
{
  "total_dogs": 1234,
  "total_organizations": 45,
  "countries": [
    {
      "country": "Turkey",
      "count": 800
    },
    {
      "country": "Spain", 
      "count": 434
    }
  ],
  "organizations": [
    {
      "id": 1,
      "name": "Example Rescue Organization",
      "dog_count": 123
    },
    {
      "id": 2,
      "name": "Another Pet Rescue",
      "dog_count": 89
    }
  ]
}
```

**Fields Description**:
- `total_dogs`: Count of available animals with high/medium confidence
- `total_organizations`: Count of organizations with available animals
- `countries`: Array of countries with animal counts
- `organizations`: Array of organizations with their available animal counts

**Example**:
```bash
curl "https://api.example.com/api/animals/statistics"
```

### Animals Metadata

#### `GET /api/animals/meta/breeds`

Get list of available standardized breeds.

**Parameters**:
- `breed_group`: Filter breeds by group

**Example**:
```bash
curl "https://api.example.com/api/animals/meta/breeds?breed_group=Sporting"
```

#### `GET /api/animals/meta/breed_groups`

Get list of available breed groups.

**Example**:
```bash
curl "https://api.example.com/api/animals/meta/breed_groups"
```

#### `GET /api/animals/meta/location_countries`

Get list of countries where organizations are located.

**Example**:
```bash
curl "https://api.example.com/api/animals/meta/location_countries"
```

#### `GET /api/animals/meta/available_countries`

Get list of countries where animals can be adopted to.

**Example**:
```bash
curl "https://api.example.com/api/animals/meta/available_countries"
```

#### `GET /api/animals/meta/available_regions`

Get list of regions within a country where animals can be adopted to.

**Parameters**:
- `country`: Required - Country to get regions for

**Example**:
```bash
curl "https://api.example.com/api/animals/meta/available_regions?country=US"
```

### Organizations

#### `GET /api/organizations`

Get list of rescue organizations.

**Example**:
```bash
curl "https://api.example.com/api/organizations"
```

#### `GET /api/organizations/{org_id}`

Get specific organization details.

**Example**:
```bash
curl "https://api.example.com/api/organizations/1"
```

#### `GET /api/organizations/{org_id}/animals`

Get animals from specific organization.

**Parameters**: Same as `/api/animals` endpoint

**Example**:
```bash
curl "https://api.example.com/api/organizations/1/animals"
```

## Availability System

### Confidence Levels

The API uses a confidence system to ensure users see reliable data:

- **`high`**: Recently seen in scrape (0 missed scrapes)
- **`medium`**: 1 missed scrape  
- **`low`**: 2-3 missed scrapes
- **`unavailable`**: 4+ missed scrapes (status changes to "unavailable")

### Default Filtering

By default, all animal endpoints filter to:
- `status = "available"`
- `availability_confidence = "high,medium"`

This ensures users see only animals that are likely still available for adoption.

### Override Options

Administrators and developers can override defaults:

```bash
# Show all animals regardless of availability
curl "https://api.example.com/api/animals?status=all&availability_confidence=all"

# Show only low confidence animals (for review)
curl "https://api.example.com/api/animals?availability_confidence=low"

# Show unavailable animals
curl "https://api.example.com/api/animals?status=unavailable"
```

## Response Fields

### Availability Fields

All animal responses include these availability-related fields:

- `status`: "available" or "unavailable"
- `availability_confidence`: "high", "medium", or "low"
- `last_seen_at`: Timestamp when animal was last seen in a scrape
- `consecutive_scrapes_missing`: Number of consecutive scrapes where animal was not found

### Standardized Fields

The API includes both original and standardized data:

- `breed` / `standardized_breed`
- `age_text` / `age_min_months` / `age_max_months`
- `size` / `standardized_size`

### Organization Data

When available, nested organization information includes:

- Basic info: `name`, `city`, `country`, `website_url`
- Social media links (if configured)
- Service regions (for location filtering)

## Error Handling

### HTTP Status Codes

- `200`: Success
- `404`: Resource not found
- `422`: Validation error
- `500`: Internal server error

### Error Response Format

```json
{
  "detail": "Error description"
}
```

### Common Errors

- **Invalid availability_confidence**: Must be valid confidence level or "all"
- **Invalid status**: Must be "available", "unavailable", or "all"
- **Invalid pagination**: limit must be 1-100, offset must be >= 0
- **Missing country for regions**: available_regions endpoint requires country parameter

## Performance Considerations

### Caching

- Metadata endpoints are cached for performance
- Animal data includes ETags for conditional requests
- Cloudinary CDN provides optimized image delivery

### Pagination

Use pagination for large datasets:

```bash
# First page
curl "https://api.example.com/api/animals?limit=50&offset=0"

# Second page  
curl "https://api.example.com/api/animals?limit=50&offset=50"
```

### Filtering Best Practices

- Use specific filters to reduce response size
- Combine location and breed filters for targeted results
- Use standardized fields for consistent filtering
- Consider availability confidence for user-facing applications

## Development and Testing

### Health Check

```bash
curl "https://api.example.com/health"
# Returns: {"status": "healthy"}
```

### Test Environment

Development API typically runs on `http://localhost:8000` with the same endpoints and parameters.