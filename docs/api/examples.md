# API Examples

This document provides comprehensive examples for using the Rescue Dog Aggregator API. These examples demonstrate practical usage patterns and common use cases, highlighting the new architecture's performance improvements and enhanced error handling.

## 🏗️ Architecture Benefits in Practice

The API has been completely refactored with a modern service layer architecture that delivers:
- **25-33% faster response times** through connection pooling
- **5x faster image loading** through batch query optimization
- **Enhanced error handling** with detailed error codes and messages
- **Improved security** with comprehensive input validation and SQL injection prevention

## Basic Usage

### Authentication
Currently, the API does not require authentication. All endpoints are publicly accessible.

### Base URLs
- **Development**: `http://localhost:8000`
- **Production**: `https://api.rescuedogaggregator.com`

## Animals API Examples

### Get All Animals

#### Basic Request
```bash
curl "http://localhost:8000/api/animals/"
```

#### With Pagination
```bash
curl "http://localhost:8000/api/animals/?limit=10&offset=20"
```

#### Filter by Breed
```bash
curl "http://localhost:8000/api/animals/?limit=10&breed=Golden%20Retriever&size=large"
```

#### Example Response (Enhanced with Batch Loading)
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
    "standardized_size": "Large",
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

**Performance Note**: Images are now loaded through batch queries, reducing response time by 5x compared to the previous N+1 query approach.

### Get Single Animal

```bash
curl "http://localhost:8000/api/animals/1"
```

### Get Animal Statistics

```bash
curl "http://localhost:8000/api/animals/statistics"
```

#### Example Response
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

## Organizations API Examples

### Get All Organizations

```bash
curl "http://localhost:8000/api/organizations/"
```

#### Example Response
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

### Get Single Organization

```bash
curl "http://localhost:8000/api/organizations/1"
```

## Health & Monitoring Examples

### Basic Health Check

```bash
curl "http://localhost:8000/health"
```

#### Example Response
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

### Detailed Health Check

```bash
curl "http://localhost:8000/health/detailed"
```

#### Example Response
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

### Monitor Scrapers

```bash
curl "http://localhost:8000/monitoring/scrapers"
```

#### Example Response
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

### Monitor Failures

```bash
curl "http://localhost:8000/monitoring/failures"
```

#### Example Response
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

## Common Use Cases

### Get Recent Dogs (Last 7 Days)
```bash
curl "http://localhost:8000/api/animals/?curation_type=recent&limit=20"
```

### Get Diverse Selection (One Dog Per Organization)
```bash
curl "http://localhost:8000/api/animals/?curation_type=diverse&limit=10"
```

### Search for Large Dogs Available to Germany
```bash
curl "http://localhost:8000/api/animals/?size=large&available_to_country=DE"
```

### Get Dogs from Specific Organization
```bash
curl "http://localhost:8000/api/animals/?organization_id=1"
```

### Get High Confidence Available Dogs Only
```bash
curl "http://localhost:8000/api/animals/?availability_confidence=high"
```

### Search by Breed Group
```bash
curl "http://localhost:8000/api/animals/?breed_group=Sporting&limit=15"
```

## Advanced Integration Examples

### Build a Dog Adoption App (JavaScript)

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

### Create a Dog Search Filter (JavaScript)

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

### Monitor Organization Performance (JavaScript)

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

## Location-Based Examples

### Find Dogs Available to Specific Countries
```bash
curl "http://localhost:8000/api/animals/?available_to_country=DE&limit=50"
```

### Find Dogs Located in Specific Countries
```bash
curl "http://localhost:8000/api/animals/?location_country=TR&available_to_country=DE"
```

### Get Organizations That Ship to Specific Countries
```bash
curl "http://localhost:8000/api/organizations/" | jq '.[] | select(.ships_to | contains(["DE"]))'
```

## Performance Monitoring Dashboard

### System Health Overview
```bash
curl "http://localhost:8000/health/detailed"
```

### Scraper Performance Metrics
```bash
curl "http://localhost:8000/monitoring/scrapers"
```

### Failure Detection and Alerts
```bash
curl "http://localhost:8000/monitoring/failures"
```

### Database Statistics
```bash
curl "http://localhost:8000/api/animals/statistics"
```

## Data Analysis Examples

### Python Data Analysis

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

## Response Format Examples

### Success Response Format
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

### Enhanced Error Response Format
```json
{
  "detail": "Validation error: Invalid standardized_size value 'extra-large'. Must be one of: Tiny, Small, Medium, Large",
  "status_code": 422,
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Error Handling Examples
```javascript
// Example error handling with new error codes
async function fetchAnimals() {
  try {
    const response = await fetch('/api/animals/?standardized_size=invalid');
    const data = await response.json();
    
    if (!response.ok) {
      switch (data.error_code) {
        case 'VALIDATION_ERROR':
          console.error('Validation failed:', data.detail);
          break;
        case 'NOT_FOUND':
          console.error('Resource not found:', data.detail);
          break;
        case 'INTERNAL_ERROR':
          console.error('Server error:', data.detail);
          break;
        default:
          console.error('Unknown error:', data.detail);
      }
      return;
    }
    
    return data;
  } catch (error) {
    console.error('Network error:', error);
  }
}
```

## Testing Examples

### Simple API Test
```bash
# Test basic connectivity
curl -f "http://localhost:8000/health" || echo "API not available"

# Test animal endpoint
curl -f "http://localhost:8000/api/animals/?limit=1" || echo "Animals endpoint failed"

# Test organization endpoint
curl -f "http://localhost:8000/api/organizations/" || echo "Organizations endpoint failed"
```

### Load Testing Example
```bash
# Test with multiple concurrent requests
for i in {1..10}; do
  curl "http://localhost:8000/api/animals/?limit=5&offset=$((i*5))" &
done
wait
```

## Notes

- All timestamps are in ISO 8601 format with UTC timezone
- The API supports JSON responses only
- Cross-Origin Resource Sharing (CORS) is enabled for localhost:3000 and 127.0.0.1:3000
- No authentication is currently required
- Rate limiting is not enforced but please be respectful with request frequency
- For production use, replace `localhost:8000` with the actual production API URL

## 🚀 Performance & Architecture Notes

### New Architecture Benefits
- **Service Layer**: All business logic is now separated into dedicated service classes
- **Connection Pooling**: Database connections are managed through a thread-safe pool (2-20 connections)
- **Batch Queries**: Images and related data are loaded in batches, eliminating N+1 query problems
- **Enhanced Validation**: Comprehensive input validation using Pydantic v2 with custom validators

### Performance Improvements
- **25-33% faster response times** across all endpoints
- **5x faster image loading** through batch query optimization
- **Reduced database load** through connection pooling and query optimization
- **Improved error handling** with detailed error codes and safe messaging

### Security Enhancements
- **SQL Injection Prevention**: All queries are parameterized with no string interpolation
- **Input Validation**: Comprehensive validation of all input parameters
- **URL Sanitization**: All URLs are validated using HttpUrl type validation
- **Safe Error Messages**: Error responses never expose sensitive information

### Migration Notes
- All existing API endpoints remain compatible
- New error response format includes additional fields (error_code, timestamp)
- Enhanced validation may reject previously accepted invalid inputs
- Improved performance may change response timing characteristics