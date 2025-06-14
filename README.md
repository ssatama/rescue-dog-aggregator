# Rescue Dog Aggregator

An open-source web platform that aggregates rescue dogs from multiple organizations using a **flexible configuration system**, standardizes the data, and presents it in a user-friendly Next.js interface.

## 🌟 Key Features

- **🔧 Configuration-Driven Architecture**: Add new rescue organizations via YAML config files
- **🔄 Automatic Data Standardization**: Breed, age, and size normalization across sources
- **☁️ Cloudinary Image Processing**: Automated image optimization and CDN delivery
- **🔒 Production-Ready Security**: SQL injection prevention, input validation, comprehensive error handling
- **🧪 Comprehensive Testing**: 93%+ test coverage with advanced speed optimization (217 fast tests in 45s)
- **🗓️ Weekly Scraping Support**: Production-ready with stale data detection and availability management
- **📊 Enhanced Metrics & Monitoring**: JSONB-based detailed tracking with quality scoring
- **🎯 Smart Availability Filtering**: Users see only reliable, recently-seen animals by default
- **🚨 Error Recovery**: Partial failure detection prevents false positives from scraper issues
- **🌐 Tech Stack**: FastAPI backend, Next.js frontend, PostgreSQL database

## 🏗️ Architecture Overview

### Configuration System
Organizations are defined via YAML configuration files:

```yaml
# configs/organizations/example-org.yaml
schema_version: "1.0"
id: "example-org"
name: "Example Rescue Organization"
enabled: true
scraper:
  class_name: "ExampleScraper"
  module: "scrapers.example"
  config:
    rate_limit_delay: 2.0
    max_retries: 3
metadata:
  website_url: "https://example-rescue.org"
  description: "A wonderful rescue organization"
  location:
    country: "US"
    city: "Example City"
  contact:
    email: "info@example-rescue.org"
```

### Data Flow
1. **Config Loading**: YAML files define organization scrapers
2. **Organization Sync**: Configs auto-sync to database
3. **Data Collection**: Scrapers gather dog listings from websites with session tracking
4. **Standardization**: AI-powered normalization of breed, age, size data
5. **Availability Management**: Automatic stale data detection and confidence scoring
6. **API Exposure**: RESTful endpoints serve standardized data with smart filtering
7. **Frontend Display**: React interface showing only reliable, current animals by default

### Production-Ready Availability Management
- **Stale Data Detection**: Animals automatically tracked across scraping sessions
- **Confidence Levels**: `high` (recently seen) → `medium` (1 missed scrape) → `low` (2+ missed) → `unavailable` (4+ missed)
- **Smart API Defaults**: Only `available` animals with `high` or `medium` confidence shown by default
- **Error Recovery**: Partial failure detection prevents marking animals stale due to scraper issues
- **Quality Scoring**: Automatic assessment of data completeness (0-1 scale)

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- PostgreSQL
- Node.js 16+
- Cloudinary account (for image processing)

### Backend Setup

1. **Environment Configuration**
   ```bash
   cp .env.sample .env
   # Edit .env with your database and Cloudinary credentials
   ```

2. **Database Initialization**
   ```bash
   python main.py --setup
   
   # Apply production-ready migrations
   psql -d rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
   psql -d rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
   ```

3. **Add Organizations**
   ```bash
   # Add organization configs to configs/organizations/
   python manage.py sync-organizations
   ```

4. **Run Scrapers**
   ```bash
   python manage.py run-scraper pets-in-turkey
   # or run all enabled scrapers:
   python manage.py run-all-scrapers
   ```

5. **Start API Server**
   ```bash
   uvicorn api.main:app --reload --port 8000
   ```

6. **Important CORS Configuration:**

  - ALLOWED_ORIGINS: Comma-separated list of allowed frontend URLs
  - ENVIRONMENT: Set to 'development' or 'production'
  - Example: ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:3000
```

## 🧪 Testing & Quality Assurance

### Speed-Optimized Testing Architecture

The project includes comprehensive testing with advanced speed optimization:

**Backend Testing (Python/Pytest)**:
```bash
# Speed-optimized development workflow
source venv/bin/activate

# FAST: Core business logic across ALL modules (60+ tests in ~1s)
python -m pytest tests/ -m "unit" -v

# COMPLETE: All fast tests across entire codebase (217 tests in ~45s)
python -m pytest tests/ -m "not slow" -v

# COMPREHENSIVE: Full integration testing (512 total tests)
python -m pytest tests/ -v
```

**Frontend Testing (Jest/React Testing Library)**:
```bash
cd frontend

# Run all frontend tests (190+ tests in ~3s)
npm test

# Watch mode for development
npm run test:watch

# Test specific categories
npm test -- src/__tests__/security/          # XSS prevention, sanitization
npm test -- src/__tests__/performance/       # Lazy loading, optimization
npm test -- src/__tests__/accessibility/     # ARIA compliance, keyboard nav
```

**Test Categories & Performance**:
- **Unit Tests**: Pure logic validation (60+ tests, <1 second)
- **Fast Tests**: Complete suite excluding slow operations (217 tests, ~45 seconds)
- **Integration Tests**: Database, Selenium, network operations (full suite)
- **Security Tests**: XSS prevention, input validation, content sanitization
- **Performance Tests**: Lazy loading, memoization, bundle optimization

**Quality Gates**:
```bash
# MANDATORY: Pre-commit validation workflow
source venv/bin/activate && \
black . && isort . && \
python -m pytest tests/ -m "not slow" -v && \
cd frontend && npm test && npm run build && npm run lint
```

## 🔧 Configuration Management

### Adding New Organizations

1. **Create Config File**
   ```bash
   # Create configs/organizations/new-org.yaml with service regions
   python management/config_commands.py validate  # Verify syntax
   ```

2. **Sync to Database** 
   ```bash
   # This automatically syncs organizations AND service regions
   python management/config_commands.py sync
   ```

3. **Implement Scraper** (if needed)
   ```python
   # scrapers/new_org/scraper.py
   from scrapers.base_scraper import BaseScraper
   
   class NewOrgScraper(BaseScraper):
       def collect_data(self):
           # Implementation here
           pass
   ```

### Management Commands

```bash
# List all organizations
python management/config_commands.py list

# Show specific organization details (includes service regions)
python management/config_commands.py show pets-in-turkey

# Validate all config files
python management/config_commands.py validate

# Sync configs to database (includes service regions)
python management/config_commands.py sync --dry-run  # Preview changes
python management/config_commands.py sync           # Apply changes

# Run scrapers
python management/config_commands.py run pets-in-turkey
python management/config_commands.py run-all
```

### Location-Based Filtering

After syncing organizations, location-based filtering becomes available:

```bash
# API endpoints for location data
curl "http://localhost:8000/api/animals/meta/available_countries"
curl "http://localhost:8000/api/animals/meta/available_regions?country=US"

# Filter animals by location
curl "http://localhost:8000/api/animals?country=US&region=CA"

# Test availability filtering (production feature)
curl "http://localhost:8000/api/animals"                                    # Default: available + high/medium confidence
curl "http://localhost:8000/api/animals?status=all"                        # Show all statuses
curl "http://localhost:8000/api/animals?availability_confidence=all"       # Show all confidence levels
curl "http://localhost:8000/api/animals?status=available&availability_confidence=high"  # High confidence only
```

## 🗓️ Weekly Scraping & Production Operations

### Setting Up Weekly Scraping

The system is designed for production schedules with automatic stale data management:

```bash
# Recommended: Set up weekly cron job
0 2 * * 1 cd /path/to/rescue-dog-aggregator && python management/config_commands.py run-all

# Or schedule specific organizations
0 2 * * 1 cd /path/to/rescue-dog-aggregator && python management/config_commands.py run pets-in-turkey
```

### Monitoring & Health Checks

```bash
# Check database status and recent scrapes
python database/check_db_status.py

# View scrape logs with detailed metrics
psql -d rescue_dogs -c "
SELECT organization_id, status, started_at, dogs_found, 
       data_quality_score, duration_seconds,
       detailed_metrics->'potential_failure_detected' as potential_failure
FROM scrape_logs 
ORDER BY started_at DESC LIMIT 10;"

# Check animal availability distribution
psql -d rescue_dogs -c "
SELECT status, availability_confidence, COUNT(*)
FROM animals 
GROUP BY status, availability_confidence 
ORDER BY status, availability_confidence;"
```

### Troubleshooting Failed Scrapes

When scrapes fail, the system automatically:
- Logs detailed error information
- Preserves existing animal availability (no false unavailable status)
- Provides partial failure detection

```bash
# Review failed scrapes
psql -d rescue_dogs -c "
SELECT organization_id, started_at, error_message, 
       detailed_metrics->'animals_found' as animals_found
FROM scrape_logs 
WHERE status IN ('error', 'warning') 
ORDER BY started_at DESC LIMIT 5;"
```