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

**Example Request:**
```bash
curl "http://localhost:8000/api/animals/?limit=10&breed=Golden%20Retriever&size=large"
```

**Example Response:**
```json
[
  {
    "id": 1,
    "name": "Buddy",
    "animal_type": "dog",
    "breed": "Golden Retriever",
    "standardized_breed": "Golden Retriever",
    "breed_group": "Sporting",
    "age_text": "2 years",
    "age_min_months": 24,
    "age_max_months": 24,
    "sex": "male",
    "size": "large",
    "standardized_size": "large",
    "status": "available",
    "primary_image_url": "https://res.cloudinary.com/dy8y3boog/image/upload/...",
    "adoption_url": "https://organization.com/adopt/buddy",
    "organization_id": 1,
    "external_id": "org_123",
    "language": "en",
    "properties": {},
    "created_at": "2024-06-01T12:00:00Z",
    "updated_at": "2024-06-18T15:30:00Z",
    "last_scraped_at": "2024-06-18T15:30:00Z",
    "availability_confidence": "high",
    "last_seen_at": "2024-06-18T15:30:00Z",
    "consecutive_scrapes_missing": 0,
    "organization": {
      "id": 1,
      "name": "Pets in Turkey",
      "website_url": "https://petsinturkey.org",
      "city": "Izmir",
      "country": "TR",
      "social_media": {
        "facebook": "https://facebook.com/petsinturkey",
        "instagram": "petsinturkey"
      },
      "ships_to": ["DE", "NL", "BE", "FR", "UK"]
    },
    "images": [
      {
        "id": 1,
        "image_url": "https://res.cloudinary.com/dy8y3boog/image/upload/...",
        "is_primary": true
      }
    ]
  }
]
```

#### GET /api/animals/{id}

Get a specific animal by ID.

**Path Parameters:**
- `id` (integer): Animal ID

**Example Request:**
```bash
curl "http://localhost:8000/api/animals/1"
```

#### GET /api/animals/statistics

Get aggregated statistics about animals in the system.

**Example Response:**
```json
{
  "total_animals": 414,
  "total_organizations": 3,
  "total_countries": 2,
  "by_status": {
    "available": 413,
    "unavailable": 1
  },
  "by_confidence": {
    "high": 393,
    "medium": 6,
    "low": 14
  },
  "by_organization": [
    {
      "organization_id": 1,
      "name": "Pets in Turkey",
      "count": 33
    }
  ]
}
```

### Organizations API

#### GET /api/organizations/

Get all active rescue organizations.

**Example Response:**
```json
[
  {
    "id": 1,
    "name": "Pets in Turkey",
    "website_url": "https://www.petsinturkey.org/",
    "description": "We are a group of animal and nature loving people...",
    "country": "TR",
    "city": "Izmir",
    "logo_url": "/path/to/logo.jpg",
    "social_media": {
      "website": "https://www.petsinturkey.org/",
      "facebook": "https://www.facebook.com/petsinturkey/",
      "instagram": "petsinturkey"
    },
    "active": true,
    "created_at": "2024-06-01T12:00:00Z",
    "updated_at": "2024-06-18T15:30:00Z",
    "ships_to": ["DE", "NL", "BE", "FR", "UK", "AT", "CH", "SE", "FI", "DK", "NO"],
    "established_year": 2018,
    "service_regions": ["TR"],
    "total_dogs": 33,
    "new_this_week": 2
  }
]
```

#### GET /api/organizations/{id}

Get a specific organization by ID.

**Path Parameters:**
- `id` (integer): Organization ID

### Monitoring & Health API

#### GET /health

Basic health check endpoint.

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-06-18T15:30:00Z",
  "version": "0.1.0",
  "database": {
    "status": "connected",
    "animals_count": 414,
    "organizations_count": 3
  }
}
```

#### GET /health/detailed

Detailed health check with component status.

**Example Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-06-18T15:30:00Z",
  "version": "0.1.0",
  "database": {
    "status": "connected",
    "response_time_ms": 12,
    "animals_count": 414,
    "organizations_count": 3
  },
  "components": {
    "scrapers": {
      "last_successful_scrape": "2024-06-18T21:30:52Z",
      "failed_scrapes_24h": 0,
      "total_scrapes_24h": 3
    },
    "availability_system": {
      "high_confidence": 393,
      "medium_confidence": 6,
      "low_confidence": 14
    }
  }
}
```

#### GET /monitoring/scrapers

Get scraper status and performance metrics.

**Example Response:**
```json
[
  {
    "organization_id": 1,
    "organization_name": "Pets in Turkey",
    "last_scrape": "2024-06-18T21:27:19Z",
    "status": "success",
    "animals_found": 33,
    "failure_detection": {
      "potential_failure_detected": false,
      "threshold_percentage": 0.5
    },
    "performance_metrics": {
      "duration_seconds": 45.2,
      "data_quality_score": 0.87
    }
  }
]
```

#### GET /monitoring/failures

Get failure detection summary.

**Example Response:**
```json
{
  "catastrophic_failures_24h": 0,
  "partial_failures_24h": 0,
  "database_errors_24h": 0,
  "total_scrapes_24h": 3,
  "failure_rate_percentage": 0.0,
  "recent_errors": []
}
```

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

## Query Examples

### Common Use Cases

#### Get Recent Dogs (Last 7 Days)
```bash
curl "http://localhost:8000/api/animals/?curation_type=recent&limit=20"
```

#### Get One Dog Per Organization (Diverse Selection)
```bash
curl "http://localhost:8000/api/animals/?curation_type=diverse&limit=10"
```

#### Search for Large Dogs Available to Germany
```bash
curl "http://localhost:8000/api/animals/?size=large&available_to_country=DE"
```

#### Get Dogs from Specific Organization
```bash
curl "http://localhost:8000/api/animals/?organization_id=1"
```

#### Get High Confidence Available Dogs Only
```bash
curl "http://localhost:8000/api/animals/?availability_confidence=high"
```

#### Search by Breed Group
```bash
curl "http://localhost:8000/api/animals/?breed_group=Sporting&limit=15"
```

### Advanced Use Cases

#### Build a Dog Adoption App
```javascript
// Frontend integration example
async function fetchDogsForAdoptionApp() {
  try {
    // Get diverse selection for homepage
    const homepageDogs = await fetch(
      'http://localhost:8000/api/animals/?curation_type=diverse&limit=12'
    ).then(res => res.json());

    // Get organization statistics
    const orgs = await fetch(
      'http://localhost:8000/api/organizations/'
    ).then(res => res.json());

    // Get recent additions for "New Arrivals" section
    const recentDogs = await fetch(
      'http://localhost:8000/api/animals/?curation_type=recent&limit=6'
    ).then(res => res.json());

    return { homepageDogs, orgs, recentDogs };
  } catch (error) {
    console.error('Error fetching dog data:', error);
  }
}
```

#### Create a Dog Search Filter
```javascript
// Advanced filtering example
function buildSearchQuery(filters) {
  const params = new URLSearchParams();
  
  // Basic filters
  if (filters.breed) params.append('breed', filters.breed);
  if (filters.size) params.append('size', filters.size);
  if (filters.sex) params.append('sex', filters.sex);
  
  // Location-based filters
  if (filters.country) params.append('available_to_country', filters.country);
  if (filters.locationCountry) params.append('location_country', filters.locationCountry);
  
  // Availability preferences
  if (filters.confidence) params.append('availability_confidence', filters.confidence);
  
  // Pagination
  params.append('limit', filters.limit || 20);
  params.append('offset', filters.offset || 0);

  return `http://localhost:8000/api/animals/?${params}`;
}

// Usage
const searchUrl = buildSearchQuery({
  breed: 'Golden Retriever',
  size: 'large',
  country: 'DE',
  confidence: 'high,medium',
  limit: 15
});
```

#### Monitor Organization Performance
```javascript
// Organization monitoring example
async function getOrganizationInsights(orgId) {
  try {
    // Get organization details with statistics
    const org = await fetch(
      `http://localhost:8000/api/organizations/${orgId}`
    ).then(res => res.json());

    // Get their current dogs
    const dogs = await fetch(
      `http://localhost:8000/api/animals/?organization_id=${orgId}&limit=100`
    ).then(res => res.json());

    // Get system health for this org (if monitoring endpoint exists)
    const health = await fetch(
      'http://localhost:8000/monitoring/scrapers'
    ).then(res => res.json())
    .then(scrapers => scrapers.find(s => s.organization_id === orgId));

    return {
      organization: org,
      totalDogs: dogs.length,
      newThisWeek: org.new_this_week,
      lastScrape: health?.last_scrape,
      dataQuality: health?.performance_metrics?.data_quality_score
    };
  } catch (error) {
    console.error('Error fetching organization insights:', error);
  }
}
```

#### Build a Location-Based Rescue Finder
```bash
# Find dogs available to specific countries
curl "http://localhost:8000/api/animals/?available_to_country=DE&limit=50"

# Find dogs located in specific countries
curl "http://localhost:8000/api/animals/?location_country=TR&available_to_country=DE"

# Get organizations that ship to specific countries
curl "http://localhost:8000/api/organizations/" | jq '.[] | select(.ships_to | contains(["DE"]))'
```

#### Performance Monitoring Dashboard
```bash
# System health overview
curl "http://localhost:8000/health/detailed"

# Scraper performance metrics
curl "http://localhost:8000/monitoring/scrapers"

# Failure detection and alerts
curl "http://localhost:8000/monitoring/failures"

# Database statistics
curl "http://localhost:8000/api/animals/statistics"
```

#### Data Analysis Examples
```python
# Python example for data analysis
import requests
import pandas as pd

def analyze_rescue_data():
    # Fetch all organizations
    orgs_response = requests.get('http://localhost:8000/api/organizations/')
    organizations = orgs_response.json()
    
    # Fetch animal statistics
    stats_response = requests.get('http://localhost:8000/api/animals/statistics')
    stats = stats_response.json()
    
    # Create DataFrame for analysis
    org_df = pd.DataFrame(organizations)
    
    # Analysis examples
    print("Organizations by Country:")
    print(org_df['country'].value_counts())
    
    print("\nTotal Dogs by Organization:")
    print(org_df[['name', 'total_dogs']].sort_values('total_dogs', ascending=False))
    
    print("\nAverage Dogs per Organization:")
    print(f"{org_df['total_dogs'].mean():.1f}")
    
    return org_df, stats

# Usage
df, statistics = analyze_rescue_data()
```

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
2. Review the [troubleshooting guide](troubleshooting_guide.md)
3. Submit an issue on the project repository

## Changelog

### v0.1.0 (Current)
- Initial API release
- Animals and Organizations endpoints
- Filtering and pagination support
- Availability confidence system
- Monitoring and health endpoints
- Curation algorithms (recent, diverse, random)