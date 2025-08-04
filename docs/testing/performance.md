# Performance Testing Guide

This document covers performance testing methodologies, Core Web Vitals optimization, and performance monitoring strategies for the Rescue Dog Aggregator platform.

## Performance Overview

The platform achieves high performance through optimized architecture as of August 2025:

**Current Performance Metrics:**
- Core Web Vitals score: 95+ (mobile & desktop)
- API response times: Sub-second for all endpoints
- Image delivery: Optimized via Cloudflare R2 + Images API
- Test execution: Fast feedback loops with selective testing
- Frontend bundle size: <250KB main bundle

**Performance Testing Integration:**
- Frontend: Jest with performance assertions (58 performance tests)
- Backend: pytest with timing benchmarks
- Database: Query performance monitoring with indexes
- API: Response time validation (<500ms p95)
- Mobile: 3G optimization tests included

## Core Web Vitals Testing

### Frontend Performance Testing

**Web Vitals Integration:**
```javascript
// Frontend performance testing with web-vitals
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

export function measurePerformance() {
  // Largest Contentful Paint
  getLCP((metric) => {
    console.log('LCP:', metric.value);
    expect(metric.value).toBeLessThan(2500); // 2.5s threshold
  });

  // First Input Delay
  getFID((metric) => {
    console.log('FID:', metric.value);
    expect(metric.value).toBeLessThan(100); // 100ms threshold
  });

  // Cumulative Layout Shift
  getCLS((metric) => {
    console.log('CLS:', metric.value);
    expect(metric.value).toBeLessThan(0.1); // 0.1 threshold
  });
}
```

**Component Performance Testing:**
```javascript
import { render, screen } from '@testing-library/react';
import { measurePerformance } from '../utils/performance';

describe('DogsList Performance', () => {
  test('renders large list within performance budget', async () => {
    const startTime = performance.now();
    
    const largeDogList = Array(1000).fill().map((_, i) => ({
      id: i,
      name: `Dog ${i}`,
      breed: 'Labrador',
      organization: 'Test Rescue'
    }));

    render(<DogsList dogs={largeDogList} />);
    
    const endTime = performance.now();
    const renderTime = endTime - startTime;
    
    // Ensure rendering completes within 100ms
    expect(renderTime).toBeLessThan(100);
    
    // Verify all items are in DOM
    expect(screen.getAllByText(/Dog \d+/)).toHaveLength(1000);
  });

  test('lazy loading performs within budget', async () => {
    render(<DogsList dogs={largeDogList} enableLazyLoading />);
    
    // Measure Cumulative Layout Shift during lazy loading
    getCLS((metric) => {
      expect(metric.value).toBeLessThan(0.1);
    });
  });
});
```

### Mobile Performance Testing

**Responsive Performance:**
```javascript
import { act } from '@testing-library/react';

describe('Mobile Performance', () => {
  beforeEach(() => {
    // Simulate mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });
    
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 667,
    });
  });

  test('mobile navigation performs smoothly', async () => {
    const { container } = render(<MobileNavigation />);
    
    const startTime = performance.now();
    
    // Simulate touch interactions
    const menuButton = screen.getByRole('button', { name: /menu/i });
    
    await act(async () => {
      fireEvent.click(menuButton);
    });
    
    const endTime = performance.now();
    expect(endTime - startTime).toBeLessThan(50); // 50ms interaction budget
  });

  test('image loading performance on mobile', async () => {
    render(<DogCard dog={mockDog} />);
    
    const image = screen.getByRole('img');
    
    // Simulate image load event
    await act(async () => {
      fireEvent.load(image);
    });
    
    // Verify no layout shift during image load
    getCLS((metric) => {
      expect(metric.value).toBeLessThan(0.05);
    });
  });
});
```

### Bundle Size Testing

**Bundle Analysis:**
```javascript
// webpack-bundle-analyzer integration
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

// next.config.js performance configuration
module.exports = {
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          openAnalyzer: false,
          generateStatsFile: true,
        })
      );
    }
    return config;
  },
};

// Bundle size testing
describe('Bundle Performance', () => {
  test('main bundle size within limits', async () => {
    const stats = require('../.next/analyze/client.json');
    const mainBundle = stats.assets.find(asset => 
      asset.name.includes('main') && asset.name.endsWith('.js')
    );
    
    // Ensure main bundle is under 250KB
    expect(mainBundle.size).toBeLessThan(250 * 1024);
  });

  test('code splitting effectiveness', async () => {
    const stats = require('../.next/analyze/client.json');
    const chunks = stats.chunks.filter(chunk => !chunk.initial);
    
    // Ensure we have proper code splitting
    expect(chunks.length).toBeGreaterThan(5);
    
    // No single chunk should be over 100KB
    chunks.forEach(chunk => {
      expect(chunk.size).toBeLessThan(100 * 1024);
    });
  });
});
```

## API Performance Testing

### Response Time Testing

**FastAPI Performance Testing:**
```python
import time
import pytest
from fastapi.testclient import TestClient

def test_api_response_times(api_client):
    """Test API endpoints meet performance requirements."""
    
    # Test animals endpoint
    start_time = time.time()
    response = api_client.get("/api/animals")
    end_time = time.time()
    
    assert response.status_code == 200
    assert (end_time - start_time) < 0.5  # 500ms threshold
    
    # Test organizations endpoint
    start_time = time.time()
    response = api_client.get("/api/organizations")
    end_time = time.time()
    
    assert response.status_code == 200
    assert (end_time - start_time) < 0.3  # 300ms threshold

def test_search_performance(api_client):
    """Test search endpoint performance with filters."""
    
    # Test filtered search
    start_time = time.time()
    response = api_client.get("/api/animals?breed=labrador&size=large")
    end_time = time.time()
    
    assert response.status_code == 200
    assert (end_time - start_time) < 1.0  # 1s threshold for filtered search
    
    # Verify response size is reasonable
    data = response.json()
    assert len(str(data)) < 100 * 1024  # 100KB response limit
```

### Load Testing Integration

**Pytest Benchmark Integration:**
```python
import pytest
from pytest_benchmark import benchmark

def test_data_processing_performance(benchmark):
    """Benchmark data processing functions."""
    
    # Generate test data
    test_dogs = generate_test_dog_data(1000)
    
    # Benchmark the processing function
    result = benchmark(process_dog_data, test_dogs)
    
    assert result is not None
    assert len(result) == 1000

def test_database_query_performance(benchmark, db_connection):
    """Benchmark database query performance."""
    
    def query_animals():
        cursor = db_connection.cursor()
        cursor.execute("SELECT * FROM animals LIMIT 100")
        return cursor.fetchall()
    
    result = benchmark(query_animals)
    assert len(result) == 100

@pytest.mark.slow
def test_concurrent_api_performance():
    """Test API performance under concurrent load."""
    import concurrent.futures
    import requests
    
    def make_request():
        response = requests.get("http://localhost:8000/api/animals")
        return response.status_code, response.elapsed.total_seconds()
    
    # Run 50 concurrent requests
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request) for _ in range(50)]
        results = [f.result() for f in futures]
    
    # All requests should succeed
    statuses, times = zip(*results)
    assert all(status == 200 for status in statuses)
    
    # 95th percentile should be under 2 seconds
    sorted_times = sorted(times)
    p95_time = sorted_times[int(len(sorted_times) * 0.95)]
    assert p95_time < 2.0
```

## Database Performance Testing

### Query Performance Monitoring

**PostgreSQL Performance Testing:**
```python
import psycopg2.extras
import time

def test_database_index_performance(db_connection):
    """Test that database indexes are performing effectively."""
    
    cursor = db_connection.cursor(cursor_factory=psycopg2.extras.DictCursor)
    
    # Test index usage on animals table
    cursor.execute("""
        EXPLAIN (ANALYZE, BUFFERS) 
        SELECT * FROM animals 
        WHERE breed = 'Labrador' AND size = 'Large'
    """)
    
    explain_result = cursor.fetchall()
    explain_text = '\n'.join([row[0] for row in explain_result])
    
    # Verify index scan is used (not seq scan for large tables)
    assert 'Index Scan' in explain_text or 'Bitmap Index Scan' in explain_text
    
    # Verify execution time is reasonable
    execution_time = extract_execution_time(explain_text)
    assert execution_time < 10.0  # 10ms threshold

def test_jsonb_query_performance(db_connection):
    """Test JSONB query performance with GIN indexes."""
    
    cursor = db_connection.cursor()
    
    start_time = time.time()
    cursor.execute("""
        SELECT COUNT(*) FROM animals 
        WHERE properties @> '{"good_with_kids": true}'
    """)
    result = cursor.fetchone()
    end_time = time.time()
    
    assert result[0] >= 0
    assert (end_time - start_time) < 0.1  # 100ms threshold for JSONB queries

def test_connection_pool_performance():
    """Test database connection pool efficiency."""
    import threading
    import time
    from concurrent.futures import ThreadPoolExecutor
    
    def db_operation():
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1")
            return cursor.fetchone()
    
    # Test 20 concurrent connections
    start_time = time.time()
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = [executor.submit(db_operation) for _ in range(100)]
        results = [f.result() for f in futures]
    end_time = time.time()
    
    assert len(results) == 100
    assert all(result[0] == 1 for result in results)
    assert (end_time - start_time) < 5.0  # 5s for 100 operations
```

## Image Performance Testing

### CDN and Optimization Testing

**Image Loading Performance:**
```javascript
describe('Image Performance', () => {
  test('lazy loading reduces initial page load', async () => {
    const { container } = render(<DogGrid dogs={largeDogList} />);
    
    // Count initially loaded images
    const initialImages = container.querySelectorAll('img[src]');
    
    // Should only load visible images initially
    expect(initialImages.length).toBeLessThan(20);
    
    // Simulate scrolling
    fireEvent.scroll(window, { target: { scrollY: 1000 } });
    
    await waitFor(() => {
      const loadedImages = container.querySelectorAll('img[src]');
      expect(loadedImages.length).toBeGreaterThan(initialImages.length);
    });
  });

  test('image optimization with Cloudflare R2', () => {
    render(<DogCard dog={mockDog} />);
    
    const image = screen.getByRole('img');
    const src = image.getAttribute('src');
    
    // Verify Cloudflare Images API optimizations are applied
    expect(src).toMatch(/r2\.cloudflarestorage\.com/);
    expect(src).toMatch(/w=\d+/); // Width optimization
    expect(src).toMatch(/quality=auto/); // Quality optimization
    expect(src).toMatch(/fit=cover/); // Fit optimization
  });

  test('responsive image performance', () => {
    render(<ResponsiveImage src={mockImageUrl} alt="Test dog" />);
    
    const picture = screen.getByRole('img').closest('picture');
    const sources = picture.querySelectorAll('source');
    
    // Verify multiple sources for different screen sizes
    expect(sources.length).toBeGreaterThan(1);
    
    // Verify WebP format is available
    const webpSource = Array.from(sources).find(source => 
      source.getAttribute('type') === 'image/webp'
    );
    expect(webpSource).toBeInTheDocument();
  });
});
```

## Performance Monitoring Integration

### Real User Monitoring

**Performance Metrics Collection:**
```javascript
// utils/performance.js
import { getCLS, getFID, getLCP, getFCP, getTTFB } from 'web-vitals';

export function initPerformanceMonitoring() {
  // Collect Core Web Vitals
  getCLS(sendToAnalytics);
  getFID(sendToAnalytics);
  getLCP(sendToAnalytics);
  getFCP(sendToAnalytics);
  getTTFB(sendToAnalytics);
}

function sendToAnalytics({ name, value, id }) {
  // Send to monitoring endpoint
  fetch('/api/analytics/performance', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric: name, value, id })
  }).catch(console.error);
}

// Performance Observer for additional metrics
export function observePerformance() {
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation') {
          // Monitor navigation timing
          console.log('Navigation:', entry.toJSON());
        }
        
        if (entry.entryType === 'resource') {
          // Monitor resource loading
          if (entry.duration > 1000) {
            console.warn('Slow resource:', entry.name, entry.duration);
          }
        }
      }
    });
    
    observer.observe({ entryTypes: ['navigation', 'resource'] });
  }
}
```

### Backend Performance Monitoring

**API Response Time Tracking:**
```python
import time
import logging
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to track API performance metrics."""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        
        # Log slow requests
        if process_time > 1.0:  # 1 second threshold
            logging.warning(
                f"Slow request: {request.method} {request.url.path} "
                f"took {process_time:.2f}s"
            )
        
        # Add timing header
        response.headers["X-Process-Time"] = str(process_time)
        
        return response

# Performance testing with middleware
def test_performance_middleware(api_client):
    """Test that performance middleware tracks timing correctly."""
    
    response = api_client.get("/api/animals")
    
    assert response.status_code == 200
    assert "X-Process-Time" in response.headers
    
    process_time = float(response.headers["X-Process-Time"])
    assert process_time > 0
    assert process_time < 2.0  # Reasonable upper bound
```

## Performance Regression Testing

### Automated Performance Testing

**CI/CD Performance Gates:**
```yaml
# .github/workflows/performance.yml
name: Performance Testing

on:
  pull_request:
    branches: [main]

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run Lighthouse CI
        run: |
          npm install -g @lhci/cli@latest
          lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
          
      - name: Run performance tests
        run: |
          npm run test:performance
          npm run test:bundle-size
          
      - name: Backend performance tests
        run: |
          pytest tests/ -m "performance" --benchmark-only
```

### Performance Budget Enforcement

**Lighthouse Configuration:**
```javascript
// lighthouse.config.js
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: ['http://localhost:3000', 'http://localhost:3000/dogs']
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        // Core Web Vitals thresholds
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'first-input-delay': ['error', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }]
      }
    },
    upload: {
      target: 'temporary-public-storage'
    }
  }
};
```

## Performance Optimization Guidelines

### Development Best Practices

1. **Measure First**: Always benchmark before optimizing
2. **Set Performance Budgets**: Define acceptable thresholds
3. **Monitor Continuously**: Track performance in CI/CD
4. **Test Real Conditions**: Use realistic data sizes
5. **Optimize Critical Path**: Focus on user-critical interactions

### Performance Targets

**Frontend Performance:**
- Largest Contentful Paint (LCP): < 2.5s
- First Input Delay (FID): < 100ms
- Cumulative Layout Shift (CLS): < 0.1
- Time to First Byte (TTFB): < 800ms

**Backend Performance:**
- API response time: < 500ms (95th percentile)
- Database queries: < 100ms (simple), < 1s (complex)
- Image processing: < 2s per image
- Search queries: < 1s with filters

**Resource Budgets:**
- Initial JavaScript bundle: < 250KB
- Critical CSS: < 50KB
- Images: < 500KB per page
- Total page size: < 2MB

### 2025 Performance Testing Updates

**Recent Improvements:**
- Image delivery migrated to Cloudflare R2 + Images API
- Progressive Image component with blur-up placeholders
- React.memo implementation for expensive components
- Mobile-first responsive design with 44px touch targets
- TypeScript throughout for type safety
- 58 dedicated performance tests

**Current Test Files:**
```
frontend/src/__tests__/performance/
├── dog-detail-performance.test.js
├── image-optimization.test.js
├── mobile-performance.test.js
└── mobile-performance-3g.test.js
```

**Performance Monitoring Stack:**
- Core Web Vitals tracking with web-vitals library
- Lighthouse CI integration for automated audits
- Bundle size analysis with webpack-bundle-analyzer
- Real User Monitoring (RUM) via performance observer

This performance testing strategy ensures optimal user experience while maintaining development velocity and system reliability across 2,400+ tests.