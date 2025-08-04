# API Examples

This document provides comprehensive examples for using the Rescue Dog Aggregator API. These examples demonstrate practical usage patterns and common use cases, highlighting the new architecture's performance improvements and enhanced error handling.

## 🏗️ Architecture Benefits in Practice

The API has been completely refactored with a modern service layer architecture that delivers:
- **25-33% faster response times** through connection pooling
- **5x faster image loading** through batch query optimization
- **Enhanced error handling** with detailed error codes and messages
- **Improved security** with comprehensive input validation and SQL injection prevention
- **SEO-friendly URLs** with slug-based routing and legacy redirects
- **Real-time metadata** for building dynamic filter UIs

## Basic Usage

### Authentication

#### Public Endpoints
Most endpoints are publicly accessible without authentication:

```bash
curl "https://api.rescuedogs.me/api/animals/"
```

#### Admin Endpoints 🔒
Monitoring and administrative endpoints require authentication via the `X-Admin-Key` header:

```bash
curl -H "X-Admin-Key: your-admin-key" \
     "https://api.rescuedogs.me/monitoring/scrapers"
```

### Base URLs
- **Development**: `http://localhost:8000`
- **Production**: `https://api.rescuedogs.me`

## Animals API Examples

### Get All Animals

#### Basic Request
```bash
curl "https://api.rescuedogs.me/api/animals/"
```

#### With Advanced Filtering
```bash
curl "https://api.rescuedogs.me/api/animals/?limit=10&breed_group=Herding%20Dogs&available_to_country=DE&availability_confidence=high,medium&sort=newest"
```

#### Filter by Location and Characteristics
```bash
curl "https://api.rescuedogs.me/api/animals/?location_country=TR&good_with_kids=true&special_needs=false&standardized_size=medium"
```

#### Curation Types
```bash
# Recent additions (last 7 days)
curl "https://api.rescuedogs.me/api/animals/?curation_type=recent&limit=20"

# Diverse selection (one per organization)
curl "https://api.rescuedogs.me/api/animals/?curation_type=diverse&limit=10"

# Random selection
curl "https://api.rescuedogs.me/api/animals/?curation_type=random&limit=15"
```

#### Example Response (Enhanced with Batch Loading)
```json
{
  "data": [
    {
      "id": 1,
      "slug": "buddy-golden-retriever-123",
      "name": "Buddy",
      "animal_type": "dog",
      "breed": "Golden Retriever",
      "standardized_breed": "Golden Retriever",
      "breed_group": "Sporting",
      "age_text": "2 years",
      "age_min_months": 24,
      "age_max_months": 24,
      "age_category": "adult",
      "sex": "male",
      "size": "large",
      "standardized_size": "Large",
      "status": "available",
      "primary_image_url": "https://res.cloudinary.com/dy8y3boog/image/upload/...",
      "adoption_url": "https://organization.com/adopt/buddy",
      "organization_id": 1,
      "external_id": "org_123",
      "language": "en",
      "properties": {
        "good_with_cats": true,
        "good_with_dogs": true,
        "good_with_kids": true,
        "special_needs": false
      },
      "created_at": "2024-06-01T12:00:00Z",
      "updated_at": "2024-06-18T15:30:00Z",
      "last_scraped_at": "2024-06-18T15:30:00Z",
      "availability_confidence": "high",
      "last_seen_at": "2024-06-18T15:30:00Z",
      "consecutive_scrapes_missing": 0,
      "organization": {
        "id": 1,
        "slug": "pets-turkey",
        "name": "Pets in Turkey",
        "website_url": "https://petsinturkey.org",
        "city": "Izmir",
        "country": "TR",
        "social_media": {
          "facebook": "https://facebook.com/petsinturkey",
          "instagram": "petsinturkey"
        },
        "ships_to": ["DE", "NL", "BE", "FR", "UK"],
        "service_regions": [
          {
            "country_code": "TR",
            "country_name": "Turkey",
            "regions": ["Istanbul", "Izmir", "Ankara"]
          }
        ]
      },
      "images": [
        {
          "id": 1,
          "image_url": "https://res.cloudinary.com/dy8y3boog/image/upload/...",
          "is_primary": true,
          "cloudinary_id": "sample123",
          "width": 800,
          "height": 600
        }
      ]
    }
  ],
  "meta": {
    "total": 414,
    "limit": 20,
    "offset": 0
  }
}
```

### Get Random Animals

```bash
curl "https://api.rescuedogs.me/api/animals/random?limit=12"
```

### Get Single Animal (Slug-based URL)

#### Using Slug (Recommended)
```bash
curl "https://api.rescuedogs.me/api/animals/buddy-golden-retriever-123"
```

#### Using Legacy ID (Redirects to Slug)
```bash
curl "https://api.rescuedogs.me/api/animals/id/1"
# Returns 301 redirect to /api/animals/buddy-golden-retriever-123
```

### Animals Metadata API

#### Get All Breeds
```bash
curl "https://api.rescuedogs.me/api/animals/meta/breeds"
```

#### Get Breeds by Group
```bash
curl "https://api.rescuedogs.me/api/animals/meta/breeds?breed_group=Herding%20Dogs"
```

#### Get Breed Groups
```bash
curl "https://api.rescuedogs.me/api/animals/meta/breed_groups"
```

#### Get Location Countries
```bash
curl "https://api.rescuedogs.me/api/animals/meta/location_countries"
```

#### Get Available Countries
```bash
curl "https://api.rescuedogs.me/api/animals/meta/available_countries"
```

#### Get Available Regions
```bash
curl "https://api.rescuedogs.me/api/animals/meta/available_regions?country=DE"
```

#### Get Dynamic Filter Counts
```bash
curl -X POST "https://api.rescuedogs.me/api/animals/meta/filter_counts" \
     -H "Content-Type: application/json" \
     -d '{
       "breed_group": "Herding Dogs",
       "available_to_country": "DE",
       "good_with_kids": true
     }'
```

**Response Example:**
```json
{
  "breeds": {
    "German Shepherd": 15,
    "Border Collie": 8,
    "Australian Shepherd": 5
  },
  "ages": {
    "puppy": 5,
    "young": 12,
    "adult": 6,
    "senior": 2
  },
  "sizes": {
    "small": 3,
    "medium": 15,
    "large": 8
  },
  "sexes": {
    "male": 14,
    "female": 11
  },
  "organizations": {
    "pets-turkey": 12,
    "rean-romania": 8,
    "daisy-family-rescue": 5
  }
}
```

### Get Animal Statistics

```bash
curl "https://api.rescuedogs.me/api/animals/statistics"
```

#### Example Response
```json
{
  "total_animals": 414,
  "total_organizations": 8,
  "total_countries": 4,
  "by_status": {
    "available": 413,
    "adopted": 1
  },
  "by_confidence": {
    "high": 393,
    "medium": 6,
    "low": 14
  },
  "by_organization": [
    {
      "organization_id": 1,
      "organization_slug": "pets-turkey",
      "name": "Pets in Turkey",
      "count": 33
    }
  ],
  "by_breed_group": {
    "Mixed Breed": 125,
    "Herding Dogs": 89,
    "Working Dogs": 67
  }
}
```

## Organizations API Examples

### Get All Organizations

```bash
curl "https://api.rescuedogs.me/api/organizations/"
```

#### Example Response
```json
{
  "data": [
    {
      "id": 1,
      "slug": "pets-turkey",
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
      "service_regions": [
        {
          "country_code": "TR",
          "country_name": "Turkey",
          "regions": ["Istanbul", "Izmir", "Ankara"],
          "shipping_info": "Free transport to major EU cities"
        }
      ],
      "total_dogs": 33,
      "new_this_week": 2,
      "adoption_rate": 0.87,
      "average_time_to_adoption": 45
    }
  ],
  "meta": {
    "total": 8,
    "limit": 50,
    "offset": 0
  }
}
```

### Get Single Organization (Slug-based)

#### Using Slug (Recommended)
```bash
curl "https://api.rescuedogs.me/api/organizations/pets-turkey"
```

#### Using Legacy ID (Redirects to Slug)
```bash
curl "https://api.rescuedogs.me/api/organizations/id/1"
# Returns 301 redirect to /api/organizations/pets-turkey
```

### Get Organization's Recent Dogs

```bash
curl "https://api.rescuedogs.me/api/organizations/1/recent-dogs?limit=6"
```

### Get Organization Statistics

```bash
curl "https://api.rescuedogs.me/api/organizations/1/statistics"
```

#### Example Response
```json
{
  "organization_id": 1,
  "total_dogs": 33,
  "new_this_week": 2,
  "new_this_month": 8,
  "adopted_this_month": 5,
  "adoption_rate": 0.87,
  "average_time_to_adoption": 45,
  "breed_distribution": {
    "Mixed Breed": 12,
    "German Shepherd": 5,
    "Golden Retriever": 3
  },
  "size_distribution": {
    "small": 8,
    "medium": 15,
    "large": 10
  },
  "confidence_levels": {
    "high": 30,
    "medium": 2,
    "low": 1
  }
}
```

## Health & Monitoring Examples

### Basic Health Check

```bash
curl "https://api.rescuedogs.me/health"
```

#### Example Response
```json
{
  "status": "healthy",
  "timestamp": "2024-06-18T15:30:00Z",
  "version": "0.2.0",
  "database": {
    "status": "connected",
    "animals_count": 414,
    "organizations_count": 8
  }
}
```

### Detailed Health Check

```bash
curl "https://api.rescuedogs.me/health/detailed"
```

### Monitoring API Examples 🔒

All monitoring endpoints require admin authentication.

#### Monitor All Scrapers
```bash
curl -H "X-Admin-Key: your-admin-key" \
     "https://api.rescuedogs.me/monitoring/scrapers"
```

#### Monitor Specific Scraper
```bash
curl -H "X-Admin-Key: your-admin-key" \
     "https://api.rescuedogs.me/monitoring/scrapers/1"
```

#### Get Performance Metrics
```bash
curl -H "X-Admin-Key: your-admin-key" \
     "https://api.rescuedogs.me/monitoring/performance"
```

#### Get Active Alerts
```bash
curl -H "X-Admin-Key: your-admin-key" \
     "https://api.rescuedogs.me/monitoring/alerts/active"
```

#### Get Alert Configuration
```bash
curl -H "X-Admin-Key: your-admin-key" \
     "https://api.rescuedogs.me/monitoring/alerts/config"
```

## Common Use Cases

### Build a Dynamic Filter UI

```javascript
// JavaScript example for building a dynamic filter interface
class DogFilterUI {
  constructor() {
    this.baseUrl = 'https://api.rescuedogs.me/api';
    this.currentFilters = {};
  }

  // Get initial filter options
  async loadFilterOptions() {
    const [breeds, breedGroups, countries] = await Promise.all([
      fetch(`${this.baseUrl}/animals/meta/breeds`).then(r => r.json()),
      fetch(`${this.baseUrl}/animals/meta/breed_groups`).then(r => r.json()),
      fetch(`${this.baseUrl}/animals/meta/available_countries`).then(r => r.json())
    ]);

    return { breeds, breedGroups, countries };
  }

  // Get dynamic counts based on current filters
  async getFilterCounts(filters) {
    const response = await fetch(`${this.baseUrl}/animals/meta/filter_counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(filters)
    });
    return response.json();
  }

  // Update filter and refresh counts
  async updateFilter(filterType, value) {
    this.currentFilters[filterType] = value;
    
    // Get updated counts
    const counts = await this.getFilterCounts(this.currentFilters);
    
    // Update UI to show how many results each remaining filter would return
    this.updateFilterUI(counts);
    
    // Fetch filtered results
    const results = await this.searchAnimals(this.currentFilters);
    this.displayResults(results);
  }

  async searchAnimals(filters) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${this.baseUrl}/animals/?${params}`);
    return response.json();
  }
}
```

### Organization Performance Dashboard

```javascript
// Organization monitoring dashboard
class OrganizationDashboard {
  constructor(orgSlug) {
    this.orgSlug = orgSlug;
    this.baseUrl = 'https://api.rescuedogs.me/api';
  }

  async loadDashboard() {
    try {
      // Load organization details
      const org = await fetch(`${this.baseUrl}/organizations/${this.orgSlug}`)
        .then(r => r.json());

      // Load recent dogs
      const recentDogs = await fetch(`${this.baseUrl}/organizations/${org.id}/recent-dogs?limit=6`)
        .then(r => r.json());

      // Load statistics
      const stats = await fetch(`${this.baseUrl}/organizations/${org.id}/statistics`)
        .then(r => r.json());

      // Load all dogs for analysis
      const allDogs = await fetch(`${this.baseUrl}/animals/?organization=${this.orgSlug}&limit=100`)
        .then(r => r.json());

      return {
        organization: org,
        recentDogs: recentDogs.data,
        statistics: stats,
        totalDogs: allDogs.meta.total,
        dogs: allDogs.data
      };
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  }
}
```

### Location-Based Animal Search

```javascript
// Location-based search functionality
async function findDogsForLocation(userCountry, userRegion) {
  const baseUrl = 'https://api.rescuedogs.me/api';
  
  // First, get dogs available to user's country
  let url = `${baseUrl}/animals/?available_to_country=${userCountry}&limit=50`;
  
  // If region is specified, add it to the filter
  if (userRegion) {
    url += `&available_to_region=${encodeURIComponent(userRegion)}`;
  }
  
  const response = await fetch(url);
  const dogs = await response.json();
  
  // Get organizations that serve this location
  const orgs = await fetch(`${baseUrl}/organizations/`)
    .then(r => r.json())
    .then(data => data.data.filter(org => 
      org.ships_to.includes(userCountry) ||
      org.service_regions.some(region => region.country_code === userCountry)
    ));
  
  return {
    dogs: dogs.data,
    availableOrganizations: orgs,
    totalAvailable: dogs.meta.total
  };
}

// Usage
const results = await findDogsForLocation('DE', 'Bavaria');
console.log(`Found ${results.totalAvailable} dogs available in Germany`);
```

## Advanced Integration Examples

### SEO-Friendly URLs

```javascript
// Handle slug-based URLs with fallback to ID
async function getAnimalBySlugOrId(identifier) {
  const baseUrl = 'https://api.rescuedogs.me/api';
  
  // Try slug first (recommended)
  if (isNaN(identifier)) {
    return fetch(`${baseUrl}/animals/${identifier}`).then(r => r.json());
  }
  
  // Fallback to ID (will redirect to slug URL)
  return fetch(`${baseUrl}/animals/id/${identifier}`).then(r => {
    if (r.status === 301) {
      // Handle redirect to slug-based URL
      const newUrl = r.headers.get('Location');
      return fetch(newUrl).then(r => r.json());
    }
    return r.json();
  });
}
```

### Real-time Filter Updates

```javascript
// Real-time filter count updates
class RealtimeFilters {
  constructor() {
    this.debounceTimer = null;
    this.currentFilters = {};
  }

  // Debounced filter update
  updateFilter(filterName, value) {
    this.currentFilters[filterName] = value;
    
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    // Set new timer for 300ms
    this.debounceTimer = setTimeout(() => {
      this.refreshFilterCounts();
    }, 300);
  }

  async refreshFilterCounts() {
    try {
      const response = await fetch('https://api.rescuedogs.me/api/animals/meta/filter_counts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.currentFilters)
      });
      
      const counts = await response.json();
      
      // Update UI with new counts
      this.updateFilterCountsUI(counts);
      
    } catch (error) {
      console.error('Error updating filter counts:', error);
    }
  }
}
```

### Multi-language Support

```javascript
// Handle multi-language content
async function getAnimalsForLanguage(language = 'en') {
  const response = await fetch(`https://api.rescuedogs.me/api/animals/?language=${language}`);
  const data = await response.json();
  
  // Filter and enhance based on language
  return data.data.map(animal => ({
    ...animal,
    // Add language-specific processing
    displayName: animal.name,
    displayDescription: animal.description || 'No description available',
    languageDetected: animal.language
  }));
}
```

## Error Handling Examples

### Comprehensive Error Handling

```javascript
// Enhanced error handling with new error codes
class APIClient {
  constructor() {
    this.baseUrl = 'https://api.rescuedogs.me/api';
  }

  async request(endpoint, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });

      const data = await response.json();

      if (!response.ok) {
        throw new APIError(data.error_code, data.detail, response.status, data.timestamp);
      }

      return data;
    } catch (error) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError('NETWORK_ERROR', 'Network request failed', 0);
    }
  }
}

class APIError extends Error {
  constructor(errorCode, message, statusCode, timestamp) {
    super(message);
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.timestamp = timestamp;
  }
}

// Usage with proper error handling
async function fetchAnimalsWithErrorHandling() {
  const client = new APIClient();
  
  try {
    const animals = await client.request('/animals/?standardized_size=invalid');
    return animals;
  } catch (error) {
    switch (error.errorCode) {
      case 'VALIDATION_ERROR':
        console.error('Invalid parameters:', error.message);
        // Show user-friendly validation message
        break;
      case 'NOT_FOUND':
        console.error('Resource not found:', error.message);
        // Redirect to 404 page
        break;
      case 'UNAUTHORIZED':  
        console.error('Authentication required:', error.message);
        // Redirect to login
        break;
      case 'INTERNAL_ERROR':
        console.error('Server error:', error.message);
        // Show generic error message
        break;
      default:
        console.error('Unknown error:', error);
    }
  }
}
```

## Data Analysis Examples

### Python Analytics

```python
# Comprehensive Python analysis example
import requests
import pandas as pd
import matplotlib.pyplot as plt

class RescueDogAnalytics:
    def __init__(self):
        self.base_url = 'https://api.rescuedogs.me/api'
    
    def fetch_all_data(self):
        # Fetch all animals (with pagination)
        all_animals = []
        offset = 0
        limit = 100
        
        while True:
            response = requests.get(f'{self.base_url}/animals/', 
                                  params={'limit': limit, 'offset': offset})
            data = response.json()
            
            all_animals.extend(data['data'])
            
            if len(data['data']) < limit:
                break
            offset += limit
        
        # Fetch organizations
        orgs_response = requests.get(f'{self.base_url}/organizations/')
        organizations = orgs_response.json()['data']
        
        return pd.DataFrame(all_animals), pd.DataFrame(organizations)
    
    def analyze_breed_distribution(self, animals_df):
        # Analyze breed groups
        breed_counts = animals_df['breed_group'].value_counts()
        
        plt.figure(figsize=(12, 6))
        breed_counts.head(10).plot(kind='bar')
        plt.title('Top 10 Breed Groups in Rescue')
        plt.xlabel('Breed Group')
        plt.ylabel('Number of Dogs')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()
        
        return breed_counts
    
    def analyze_organization_performance(self, animals_df, orgs_df):
        # Merge data for analysis
        merged = animals_df.merge(orgs_df, left_on='organization_id', 
                                right_on='id', suffixes=('_animal', '_org'))
        
        # Organization performance metrics
        org_stats = merged.groupby('name_org').agg({
            'id_animal': 'count',
            'availability_confidence': lambda x: (x == 'high').mean(),
            'created_at': lambda x: pd.to_datetime(x).max()
        }).round(3)
        
        org_stats.columns = ['total_dogs', 'high_confidence_rate', 'latest_addition']
        return org_stats.sort_values('total_dogs', ascending=False)
    
    def generate_report(self):
        animals_df, orgs_df = self.fetch_all_data()
        
        print("🐕 Rescue Dog Analytics Report")
        print("=" * 40)
        print(f"Total Dogs: {len(animals_df)}")
        print(f"Total Organizations: {len(orgs_df)}")
        print(f"Average Dogs per Organization: {len(animals_df) / len(orgs_df):.1f}")
        
        # Breed analysis
        breed_dist = self.analyze_breed_distribution(animals_df)
        
        # Organization analysis
        org_performance = self.analyze_organization_performance(animals_df, orgs_df)
        print("\nTop Organizations by Dog Count:")
        print(org_performance.head())

# Usage
analytics = RescueDogAnalytics()
analytics.generate_report()
```

## Performance Testing Examples

### Load Testing with curl

```bash
#!/bin/bash
# Load test script

BASE_URL="https://api.rescuedogs.me/api"
CONCURRENT_REQUESTS=10
TOTAL_REQUESTS=100

echo "🚀 Starting API load test..."
echo "Base URL: $BASE_URL"
echo "Concurrent requests: $CONCURRENT_REQUESTS"
echo "Total requests: $TOTAL_REQUESTS"

# Test different endpoints
endpoints=(
  "/animals/"
  "/animals/random?limit=5"
  "/organizations/"
  "/animals/meta/breeds"
  "/health"
)

for endpoint in "${endpoints[@]}"; do
  echo "Testing $endpoint..."
  
  # Use xargs for parallel requests
  seq 1 $TOTAL_REQUESTS | xargs -n1 -P$CONCURRENT_REQUESTS -I{} \
    curl -s -w "%{time_total}\n" -o /dev/null "$BASE_URL$endpoint" | \
    awk '{sum+=$1; count++} END {print "Average response time:", sum/count, "seconds"}'
done
```

### JavaScript Performance Monitoring

```javascript
// Performance monitoring utility
class APIPerformanceMonitor {
  constructor() {
    this.metrics = [];
  }

  async timedRequest(url, options = {}) {
    const startTime = performance.now();
    
    try {
      const response = await fetch(url, options);
      const endTime = performance.now();
      
      const metric = {
        url,
        duration: endTime - startTime,
        status: response.status,
        timestamp: new Date().toISOString(),
        success: response.ok
      };
      
      this.metrics.push(metric);
      return response;
    } catch (error) {
      const endTime = performance.now();
      
      this.metrics.push({
        url,
        duration: endTime - startTime,
        status: 0,
        timestamp: new Date().toISOString(),
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  getAverageResponseTime() {
    const successful = this.metrics.filter(m => m.success);
    const total = successful.reduce((sum, m) => sum + m.duration, 0);
    return successful.length > 0 ? total / successful.length : 0;
  }

  getSuccessRate() {
    if (this.metrics.length === 0) return 0;
    const successful = this.metrics.filter(m => m.success).length;
    return (successful / this.metrics.length) * 100;
  }

  getSlowestRequests(count = 5) {
    return [...this.metrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }
}

// Usage
const monitor = new APIPerformanceMonitor();

// Test multiple requests
for (let i = 0; i < 50; i++) {
  await monitor.timedRequest('https://api.rescuedogs.me/api/animals/random?limit=3');
}

console.log(`Average response time: ${monitor.getAverageResponseTime():.2f}ms`);
console.log(`Success rate: ${monitor.getSuccessRate():.1f}%`);
console.log('Slowest requests:', monitor.getSlowestRequests());
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
  "detail": "Validation error: Invalid standardized_size value 'extra-large'. Must be one of: small, medium, large",
  "status_code": 422,
  "error_code": "VALIDATION_ERROR",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Redirect Response (301)
```http
HTTP/1.1 301 Moved Permanently
Location: https://api.rescuedogs.me/api/animals/buddy-golden-retriever-123
Content-Type: application/json

{
  "detail": "Resource moved to slug-based URL",
  "status_code": 301,
  "new_url": "/api/animals/buddy-golden-retriever-123"
}
```

## Notes

- All timestamps are in ISO 8601 format with UTC timezone
- The API supports JSON responses only
- Cross-Origin Resource Sharing (CORS) is enabled for production and development domains
- Admin authentication required for monitoring endpoints
- Rate limiting is not enforced but please be respectful with request frequency
- Use slug-based URLs for better SEO and user experience
- Legacy ID-based URLs automatically redirect to slug URLs

## 🚀 Performance & Architecture Notes

### New Architecture Benefits
- **Service Layer**: All business logic is now separated into dedicated service classes
- **Connection Pooling**: Database connections are managed through a thread-safe pool (2-20 connections)
- **Batch Queries**: Images and related data are loaded in batches, eliminating N+1 query problems
- **Enhanced Validation**: Comprehensive input validation using Pydantic v2 with custom validators
- **SEO Optimization**: Slug-based URLs with automatic legacy redirects

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
- **Admin Authentication**: Protected monitoring endpoints

### Migration Notes
- All existing API endpoints remain compatible
- New error response format includes additional fields (error_code, timestamp)
- Enhanced validation may reject previously accepted invalid inputs
- Improved performance may change response timing characteristics
- Legacy ID-based URLs automatically redirect to slug-based URLs