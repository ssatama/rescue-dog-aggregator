# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Backend Development
```bash
# Database setup
python main.py --setup

# Run API server (development)
uvicorn api.main:app --reload --port 8000

# Configuration management
python management/config_commands.py list
python management/config_commands.py sync
python management/config_commands.py validate
python management/config_commands.py run pets-in-turkey
python management/config_commands.py run-all

# Database migrations
psql -h localhost -U $USER -d rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
psql -h localhost -U $USER -d rescue_dogs -f database/migrations/002_add_detailed_metrics.sql

# Database status check
python database/check_db_status.py

# Run tests (with virtual environment)
source venv/bin/activate && python -m pytest tests/ -v

# Run specific test categories
python -m pytest tests/api/test_availability_filtering.py -v
python -m pytest tests/scrapers/test_base_scraper.py -v

# Code formatting and linting
black .
isort .
```

### Frontend Development  
```bash
cd frontend
npm install
npm run dev          # Development server (usually port 3001)
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest tests (95+ tests across 17 suites)
npm run test:watch   # Jest watch mode

# Full verification (recommended before commits)
npm test && npm run build && npm run lint

# Run specific test categories
npm test -- src/__tests__/security/          # Security tests
npm test -- src/__tests__/performance/       # Performance tests  
npm test -- src/__tests__/accessibility/     # Accessibility tests
npm test -- src/components/                  # Component tests
npm test -- src/app/                         # Page tests
```

## Architecture Overview

This is a **configuration-driven rescue dog aggregation platform** with these key components:

### 1. Configuration System
- Organizations defined in `configs/organizations/*.yaml` files
- YAML configs auto-sync to database via `management/config_commands.py sync`
- Schema validation enforced via `configs/schemas/organization.schema.json`
- Each organization specifies its scraper class and module path

### 2. Data Collection & Standardization
- **Base Scraper**: `scrapers/base_scraper.py` provides foundation for all scrapers
- **Standardization**: AI-powered normalization in `utils/standardization.py` for breeds, ages, sizes
- **Image Processing**: Cloudinary integration for CDN delivery and optimization
- **Database**: PostgreSQL with `animals` table (future-extensible beyond dogs)

### 3. API Layer (FastAPI)
- **Entry Point**: `api/main.py` with CORS configuration
- **Routes**: `api/routes/animals.py` and `api/routes/organizations.py`
- **Models**: Pydantic models in `api/models/`
- **Database**: Connection utilities in `utils/db.py`

### 4. Frontend (Next.js 15 with App Router)
- **Architecture**: Server/Client component separation for SEO optimization
- **Pages**: Dog listings (`/dogs`), organization pages (`/organizations`) with dynamic metadata
- **Components**: Modular UI in `src/components/` with shadcn/ui components
- **Services**: API communication in `src/services/`
- **Testing**: Jest with React Testing Library (95+ tests across 17 suites)
- **Security**: XSS prevention, content sanitization, input validation
- **Performance**: Lazy loading, image optimization, component memoization
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

## Key Development Patterns

### Adding New Scrapers
1. Create scraper config in `configs/organizations/org-name.yaml`
2. Implement scraper class extending `BaseScraper` in `scrapers/org_name/`
3. Run `python management/config_commands.py sync` to add to database
4. Test with `python management/config_commands.py run org-name`

### Database Operations
- **Setup**: `python main.py --setup` initializes schema and initial data
- **Migrations**: SQL files in `database/migrations/`
- **Status**: `python database/check_db_status.py` for health checks

### Scraper Data Management (Production-Ready)
- **CRUD Operations**: BaseScraper now includes complete database operations:
  - `get_existing_animal()` - Check if animal exists by external_id
  - `create_animal()` - Insert new animals with proper standardization
  - `update_animal()` - Update existing animals with change detection
- **Stale Data Detection**: Automatic lifecycle management for weekly scraping:
  - `start_scrape_session()` - Initialize session tracking
  - `mark_animal_as_seen()` - Update animals found in current scrape
  - `update_stale_data_detection()` - Mark unseen animals as stale
- **Availability Management**: Animals automatically transition:
  - 1 missed scrape → `availability_confidence = 'medium'`
  - 2+ missed scrapes → `availability_confidence = 'low'`  
  - 4+ missed scrapes → `status = 'unavailable'`
- **Error Handling & Recovery**: Production-ready error handling:
  - `detect_partial_failure()` - Prevent false positives from scraper issues
  - `handle_scraper_failure()` - Graceful failure without affecting animal status
  - `restore_available_animal()` - Re-enable animals when they reappear
- **Enhanced Metrics**: Detailed logging and monitoring:
  - `log_detailed_metrics()` - JSONB metrics storage with duration and quality scores
  - `assess_data_quality()` - Automatic quality scoring (0-1) based on field completeness
  - `calculate_scrape_duration()` - Performance tracking

### Testing Strategy (Test-Driven Development)
- **Backend**: Pytest with test database isolation in `tests/conftest.py`
- **Frontend**: Jest with component and integration tests (95+ tests, 17 suites)
  - **TDD Approach**: Red-Green-Refactor cycle for all new features
  - **Test Categories**: Security, performance, accessibility, build quality
  - **Component Tests**: All UI components with React Testing Library
  - **Page Tests**: Full page rendering and user interaction flows
  - **Security Tests**: XSS prevention, content sanitization validation
  - **Performance Tests**: Lazy loading, image optimization verification
  - **Accessibility Tests**: ARIA compliance, keyboard navigation
- **Coverage**: 93%+ backend, 95+ frontend tests including security, resilience, and integration
- **Critical Tests**: SQL injection prevention, network failure handling, data consistency
- **Production-Ready Testing**: Test-driven development approach with:
  - `tests/api/test_availability_filtering.py` - API filtering by availability and confidence
  - `tests/scrapers/test_base_scraper.py` - Complete scraper lifecycle and error handling
  - `src/__tests__/security/content-sanitization.test.js` - Frontend security validation
  - `src/__tests__/performance/optimization.test.jsx` - Performance optimization tests
  - Comprehensive test coverage for availability management, stale data detection, and metrics

### API Features (Production-Ready)
- **Availability Filtering**: Default filtering shows only `status='available'` and `availability_confidence='high,medium'`
- **Override Parameters**: 
  - `?status=all` - Show all animals regardless of status
  - `?availability_confidence=all` - Show all confidence levels
  - `?availability_confidence=low` - Show only low confidence animals
- **Response Fields**: All endpoints include availability fields:
  - `status`, `availability_confidence`, `last_seen_at`, `consecutive_scrapes_missing`

### Configuration Management
- Validate configs: `python management/config_commands.py validate`
- Preview changes: `python management/config_commands.py sync --dry-run`
- View specific org: `python management/config_commands.py show org-name`

### Frontend Architecture Details (2024 TDD Implementation)

#### Server/Client Component Separation
- **Server Components** (for SEO metadata generation):
  - `src/app/dogs/[id]/page.jsx` - Dog detail metadata
  - `src/app/organizations/[id]/page.jsx` - Organization metadata
- **Client Components** (for interactivity):
  - `src/app/dogs/[id]/DogDetailClient.jsx` - Dog detail UI and state
  - `src/app/organizations/[id]/OrganizationDetailClient.jsx` - Organization UI and state

#### Security Implementation
- **Content Sanitization**: `src/utils/security.js` with `sanitizeText()` and `sanitizeHtml()`
- **XSS Prevention**: All user-generated content sanitized before rendering
- **URL Validation**: `isValidUrl()` utility for external link validation
- **Production Logging**: Development-only logger in `src/utils/logger.js`

#### Performance Optimizations
- **Lazy Loading**: `src/components/ui/LazyImage.jsx` with IntersectionObserver
- **Image Optimization**: Cloudinary transformations with fallback handling
- **Component Memoization**: `React.memo` for expensive components
- **Error Boundaries**: Resilient error handling with retry functionality

#### Accessibility Features
- **ARIA Labels**: Comprehensive labeling for screen readers
- **Keyboard Navigation**: Full keyboard support and focus management
- **Semantic HTML**: Proper heading hierarchy and landmark usage
- **Screen Reader Support**: Descriptive text and announcements

#### Error Handling
- **Error Boundaries**: `src/components/error/ErrorBoundary.jsx` with retry capability
- **Specific Boundaries**: `src/components/error/DogCardErrorBoundary.jsx` for card components
- **Graceful Degradation**: Fallback states for failed data loads
- **User-Friendly Messages**: Clear error communication without technical details

#### Key Utilities
- **Logger**: `src/utils/logger.js` - Development-only logging (no console in production)
- **Security**: `src/utils/security.js` - Content sanitization and XSS prevention
- **Image Utils**: `src/utils/imageUtils.js` - Cloudinary integration and error handling
- **API**: `src/utils/api.js` - Centralized API configuration and error handling

### Image Processing
- Cloudinary integration handles uploads during scraping
- Automatic optimization (format, quality, transformations)
- Fallback to original URLs on upload failures
- Frontend lazy loading with intersection observer
- Error handling for failed image loads

## Environment Requirements
- Python 3.9+ with dependencies in `requirements.txt`
- PostgreSQL database (both main and test databases: `rescue_dogs` and `test_rescue_dogs`)
- Node.js 16+ for frontend
- Cloudinary account for image processing
- Chrome/Chromium for web scraping

## Database Schema (Key Tables)
- **animals**: Core animal data with availability tracking fields:
  - `status` (available/unavailable)
  - `availability_confidence` (high/medium/low)
  - `last_seen_at` (timestamp from last scrape)
  - `consecutive_scrapes_missing` (counter for stale detection)
- **scrape_logs**: Enhanced with JSONB metrics:
  - `detailed_metrics` (JSONB with quality scores, duration, counts)
  - `duration_seconds` (scrape performance tracking)
  - `data_quality_score` (0-1 automatic quality assessment)

## Key Migration Commands
```bash
# Apply availability tracking columns
psql -d rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql

# Apply detailed metrics tracking  
psql -d rescue_dogs -f database/migrations/002_add_detailed_metrics.sql

# For test database, ensure TESTING=true or use DB_NAME override:
DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
```

## Troubleshooting Common Issues

### Frontend Build/Development Issues

#### Server/Client Component Conflicts
**Error**: `You are attempting to export 'generateMetadata' from a component marked with 'use client'`
**Solution**: Separate generateMetadata (server component) from interactive components (client component)

#### Missing Component Imports  
**Error**: `Cannot find module './DogDetailClient'`
**Solution**: Ensure client components exist when referenced by server components

#### Test Failures
**Error**: `IntersectionObserver is not defined`
**Solution**: IntersectionObserver mock is configured in `jest.setup.js`

**Error**: `Cannot find module` in tests
**Solution**: Check `jest.setup.js` for proper Next.js component mocking

#### Performance Issues
**Problem**: Slow image loading
**Solution**: Use `LazyImage` component with Cloudinary optimization

**Problem**: Unnecessary re-renders
**Solution**: Implement `React.memo` for expensive components

### Development Best Practices
1. **Always run tests before changes**: `npm test` (frontend), `pytest tests/` (backend)
2. **Follow TDD approach**: Write tests first, then implement
3. **Maintain code quality**: Run linting before commits
4. **Verify builds**: `npm run build` should succeed
5. **Use proper logging**: No console statements in production code
6. **Sanitize content**: Use security utilities for all user content

### Pre-Commit Code Quality Checks
```bash
# Backend formatting and linting (required before commits)
source venv/bin/activate
black .                    # Format code with Black
isort .                    # Sort imports
flake8 --exclude=venv .    # Check for syntax errors
python -m pytest tests/   # Run all backend tests

# Frontend checks
cd frontend
npm test && npm run build && npm run lint

# Full verification workflow
source venv/bin/activate && black . && isort . && flake8 --exclude=venv . && python -m pytest tests/ && cd frontend && npm test && npm run build && npm run lint
```

## Production Readiness Features
- **Weekly Scraping Support**: Designed for production schedules with stale data management
- **Error Recovery**: Partial failure detection prevents false positives
- **Data Quality**: Automatic quality scoring and comprehensive metrics
- **User Experience**: Only reliable, recently-seen animals shown by default
- **Monitoring**: Detailed JSONB metrics for troubleshooting and optimization
- **Frontend Security**: XSS prevention, content sanitization, input validation
- **Frontend Performance**: Lazy loading, image optimization, component memoization
- **Frontend Accessibility**: ARIA compliance, keyboard navigation, screen reader support