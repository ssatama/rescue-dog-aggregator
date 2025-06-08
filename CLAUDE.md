# CLAUDE.md

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with this rescue dog aggregation platform. This is a **production-ready, test-driven system** with advanced scraping capabilities, modern frontend architecture, and comprehensive availability management.

## 🎯 Quick Context & Purpose

**What This System Does**: Aggregates rescue dog listings from multiple organizations worldwide, standardizes the data, and presents it through a user-friendly web interface that directs adopters back to original rescue organizations.

**Key Problem Solved**: Recently fixed critical image association bug in REAN scraper where dogs were getting wrong images (e.g., Toby getting Bobbie's image). Solution: unified DOM-based extraction that maintains spatial relationships between text and images within containers.

**Architecture Philosophy**: Configuration-driven, test-first development with production-ready error handling, availability management, and comprehensive monitoring.

## Essential Commands

### Backend Development
```bash
# 🚀 QUICK START (Essential setup)
python main.py --setup                                  # Database setup
uvicorn api.main:app --reload --port 8000              # Run API server

# 📊 CONFIGURATION MANAGEMENT (YAML-based)
python management/config_commands.py list              # List all organizations
python management/config_commands.py sync              # Sync configs to database
python management/config_commands.py validate          # Validate all configs
python management/config_commands.py run rean          # Run REAN scraper (unified extraction)
python management/config_commands.py run-all           # Run all scrapers

# 🗄️ DATABASE OPERATIONS
python database/check_db_status.py                     # Health check
# Apply production migrations (CRITICAL for availability management):
psql -d rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
psql -d rescue_dogs -f database/migrations/002_add_detailed_metrics.sql

# 🧪 TESTING (TDD Approach - 93%+ coverage required)
source venv/bin/activate && python -m pytest tests/ -v

# Test specific areas:
python -m pytest tests/api/test_availability_filtering.py -v    # API filtering
python -m pytest tests/scrapers/test_base_scraper.py -v        # Scraper lifecycle  
python -m pytest tests/scrapers/test_rean_unified_extraction.py -v  # Unified extraction

# 🎨 CODE QUALITY (Required before commits)
black .                                                 # Format code
isort .                                                 # Sort imports  
flake8 --exclude=venv .                                # Linting
```

### Frontend Development (Next.js 15 + App Router)
```bash
cd frontend

# 🚀 QUICK START
npm install                                  # Install dependencies
npm run dev                                  # Development server (port 3001)

# 🧪 TESTING (95+ tests across 17 suites - TDD required)
npm test                                     # Run all tests
npm run test:watch                           # Watch mode for development

# Test by category (comprehensive coverage):
npm test -- src/__tests__/security/          # 🔒 XSS prevention, sanitization
npm test -- src/__tests__/performance/       # ⚡ Lazy loading, memoization
npm test -- src/__tests__/accessibility/     # ♿ ARIA compliance, keyboard nav
npm test -- src/__tests__/integration/       # 🔗 API integration, metadata
npm test -- src/components/                  # 🧩 Component tests
npm test -- src/app/                         # 📄 Page tests (Server/Client separation)

# 🎨 CODE QUALITY & BUILD
npm run lint                                 # ESLint validation  
npm run build                                # Production build verification
npm run analyze                              # Bundle size analysis

# ✅ FULL VERIFICATION (Required before commits)
npm test && npm run build && npm run lint
```

## 🏗️ Architecture Overview

This is a **production-ready, configuration-driven rescue dog aggregation platform** with advanced capabilities:

### 1. 📊 Configuration System (YAML-Driven)
- **Organizations**: Defined in `configs/organizations/*.yaml` files
- **Auto-Sync**: YAML configs sync to database via `management/config_commands.py sync`
- **Validation**: Schema enforcement via `configs/schemas/organization.schema.json`
- **Modularity**: Each organization specifies scraper class and module path
- **Service Regions**: Geographic service area definitions for targeted matching

### 2. 🤖 Data Collection & Standardization (Production-Ready)
- **Base Scraper**: `scrapers/base_scraper.py` - comprehensive foundation with CRUD operations
- **Unified DOM Extraction**: Advanced scraping for modern websites (e.g., REAN) that maintains spatial relationships
- **Legacy Fallback**: Graceful degradation to traditional scraping methods
- **Standardization**: AI-powered normalization for breeds, ages, sizes, languages
- **Image Processing**: Cloudinary integration with optimization and fallback handling
- **Database**: PostgreSQL with enhanced `animals` table and availability tracking

### 3. 🚀 API Layer (FastAPI with Smart Filtering)
- **Entry Point**: `api/main.py` with CORS and production configuration
- **Smart Defaults**: Only shows `status='available'` with `availability_confidence='high,medium'`
- **Override Parameters**: Admin access with `?status=all` and `?availability_confidence=all`
- **Routes**: `api/routes/animals.py` (filtering) and `api/routes/organizations.py`
- **Models**: Pydantic models in `api/models/` with availability fields
- **Database**: Enhanced connection utilities in `utils/db.py`

### 4. 🎨 Frontend (Next.js 15 + App Router - Modern Architecture)
- **Server/Client Separation**: SEO-optimized metadata generation + interactive UI
- **Dynamic Routing**: Dog details (`/dogs/[id]`) and organization pages with metadata
- **Security**: XSS prevention, content sanitization, URL validation
- **Performance**: Lazy loading, image optimization, React.memo for expensive components
- **Accessibility**: ARIA compliance, keyboard navigation, screen reader support
- **Error Handling**: Error boundaries with retry functionality and graceful degradation
- **Testing**: 95+ tests across 17 suites covering security, performance, accessibility

## 🛠️ Key Development Patterns & Critical Knowledge

### 🔧 Adding New Scrapers (Configuration-Driven Approach)
1. **Create YAML Config**: `configs/organizations/org-name.yaml` with scraper class and module
2. **Implement Scraper**: Extend `BaseScraper` in `scrapers/org_name/` - gets CRUD operations automatically
3. **Sync to Database**: `python management/config_commands.py sync`
4. **Test Implementation**: `python management/config_commands.py run org-name`
5. **Choose Extraction Method**: 
   - Simple sites: Use `scrape_page()` + `extract_dog_content_from_html()`
   - Dynamic sites: Use `extract_dogs_with_images_unified()` (like REAN) for DOM-based extraction

### 🚨 CRITICAL: Unified DOM Extraction (Recent Implementation)
**Problem Solved**: REAN scraper had "off by one" image association errors (Toby getting Bobbie's image)
**Solution**: `extract_dogs_with_images_unified()` method maintains spatial relationships between text and images

**When to Use Unified Extraction**:
- Websites with lazy loading images
- Dynamic content that requires browser automation  
- When images and text need to stay associated within DOM containers

**Key Files**:
- `scrapers/rean/dogs_scraper.py` - Reference implementation
- `tests/scrapers/test_rean_unified_extraction.py` - Comprehensive test suite (11 tests)

**Implementation Pattern**:
```python
def extract_dogs_with_images_unified(self, url: str, page_type: str):
    """Extract dogs maintaining DOM spatial relationships."""
    # 1. Use Selenium WebDriver for dynamic content
    # 2. Trigger comprehensive lazy loading with scrolling
    # 3. Find dog containers using robust CSS selectors
    # 4. Extract complete data from each container
    # 5. Graceful fallback to legacy method if unified fails
```

### 🗄️ Database Operations (Production-Ready Availability Management)
- **Setup**: `python main.py --setup` initializes schema and initial data
- **Critical Migrations**: MUST apply for availability tracking:
  ```bash
  psql -d rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
  psql -d rescue_dogs -f database/migrations/002_add_detailed_metrics.sql
  ```
- **Health Checks**: `python database/check_db_status.py`
- **Key Tables**:
  - `animals`: Core data + availability fields (`status`, `availability_confidence`, `last_seen_at`)
  - `scrape_logs`: Enhanced with JSONB `detailed_metrics` and `data_quality_score`

### 📊 Availability Management System (Production-Ready Weekly Scraping)
**Critical Feature**: Designed for weekly production schedules with intelligent stale data detection

**CRUD Operations** (Automatic in BaseScraper):
- `get_existing_animal()` - Check if animal exists by external_id
- `create_animal()` - Insert new animals with standardization + confidence='high'
- `update_animal()` - Update existing animals with change detection + reset confidence

**Session Tracking Lifecycle**:
```python
# In scrape_animals() method:
self.start_scrape_session()        # Initialize session timestamp
# ... scraping logic ...
self.mark_animal_as_seen(animal_id) # Mark found animals  
self.update_stale_data_detection()   # Update confidence for unseen animals
```

**Automatic Availability Transitions**:
- **0 missed scrapes** → `availability_confidence = 'high'` (default for users)
- **1 missed scrape** → `availability_confidence = 'medium'` (still shown to users)
- **2-3 missed scrapes** → `availability_confidence = 'low'` (hidden by default)
- **4+ missed scrapes** → `status = 'unavailable'` (completely hidden)

**Error Recovery & Resilience**:
- `detect_partial_failure()` - Prevents false stale marking from scraper issues
- `handle_scraper_failure()` - Graceful failure without affecting existing data
- `restore_available_animal()` - Re-enables animals when they reappear

**Enhanced Monitoring**:
- `log_detailed_metrics()` - JSONB storage with quality scores, duration, counts
- `assess_data_quality()` - Automatic 0-1 scoring based on field completeness  
- Performance tracking and failure detection for production monitoring

### 🧪 Testing Strategy (Strict TDD - Red-Green-Refactor)
**Philosophy**: All features implemented test-first. 93%+ backend coverage, 95+ frontend tests required.

**Backend Testing** (Pytest + PostgreSQL):
- **Test Database**: Isolated `test_rescue_dogs` with same migrations as production
- **Key Test Files**:
  - `tests/api/test_availability_filtering.py` - API filtering by availability/confidence  
  - `tests/scrapers/test_base_scraper.py` - Complete scraper lifecycle + error handling
  - `tests/scrapers/test_rean_unified_extraction.py` - Unified DOM extraction (11 tests)
  - `tests/security/` - SQL injection prevention, input validation
  - `tests/resilience/` - Network failures, database issues, error recovery

**Frontend Testing** (Jest + React Testing Library):
- **17 Test Suites, 95+ Individual Tests**:
  - `src/__tests__/security/content-sanitization.test.js` - XSS prevention
  - `src/__tests__/performance/optimization.test.jsx` - Lazy loading, memoization
  - `src/__tests__/accessibility/a11y.test.jsx` - ARIA compliance, keyboard nav
  - `src/__tests__/integration/` - API integration, metadata validation
  - `src/components/**/__tests__/` - All UI components with React Testing Library
  - `src/app/**/__tests__/` - Page tests including Server/Client separation

**Critical Production Tests**:
- Availability management lifecycle
- Unified DOM extraction accuracy  
- Image association correctness
- Error boundary functionality
- Security vulnerability prevention

### 🚀 API Features (Smart User Experience)
**Key Innovation**: API defaults ensure users only see reliable, recently-seen animals

**Smart Default Filtering** (User-Focused):
- Shows only `status='available'` AND `availability_confidence IN ('high', 'medium')`
- Hides stale/unreliable listings automatically
- Provides excellent user experience without manual filtering

**Admin/Developer Override Parameters**:
- `?status=all` - Show all animals regardless of status (for admin use)
- `?availability_confidence=all` - Show all confidence levels (debugging)
- `?availability_confidence=low` - Show only low confidence animals (monitoring)

**Enhanced Response Fields**:
- Standard fields: `name`, `breed`, `age_text`, `primary_image_url`, `adoption_url`
- Availability fields: `status`, `availability_confidence`, `last_seen_at`, `consecutive_scrapes_missing`
- Quality fields: Available in detailed views for monitoring

### ⚙️ Configuration Management (YAML-Driven)
**Key Commands**:
- `python management/config_commands.py validate` - Validate all YAML configs
- `python management/config_commands.py sync --dry-run` - Preview database changes
- `python management/config_commands.py show rean` - View specific organization details
- `python management/config_commands.py list` - List all configured organizations

**Configuration Files**:
- `configs/organizations/*.yaml` - Organization definitions
- `configs/schemas/organization.schema.json` - Validation schema
- Each config specifies scraper class, module path, and service regions

### 🎨 Frontend Architecture (Next.js 15 + Modern Patterns)

#### 🔄 Server/Client Component Separation (SEO + Interactivity)
**Server Components** (Metadata + SEO):
- `src/app/dogs/[id]/page.jsx` - generateMetadata() for dog details
- `src/app/organizations/[id]/page.jsx` - Organization metadata + structured data

**Client Components** (User Interaction):
- `src/app/dogs/[id]/DogDetailClient.jsx` - Interactive UI, state management
- `src/app/organizations/[id]/OrganizationDetailClient.jsx` - Organization interface

**Critical**: NEVER mix `'use client'` with `generateMetadata()` - causes build errors

#### 🔒 Security Implementation (XSS Prevention)
- **Content Sanitization**: `src/utils/security.js` with `sanitizeText()` and `sanitizeHtml()`
- **Input Validation**: All user content sanitized before rendering
- **URL Validation**: `isValidUrl()` utility for safe external links
- **Production Safety**: Development-only logger prevents console leaks

#### ⚡ Performance Optimizations
- **Lazy Loading**: `src/components/ui/LazyImage.jsx` with IntersectionObserver
- **Image Optimization**: Cloudinary transformations + fallback handling
- **Component Memoization**: `React.memo` for expensive renders
- **Error Boundaries**: Resilient error handling with retry functionality

#### ♿ Accessibility Features (WCAG Compliant)
- **ARIA Labels**: Comprehensive screen reader support
- **Keyboard Navigation**: Full keyboard accessibility + focus management
- **Semantic HTML**: Proper heading hierarchy and landmark usage
- **Testing**: Automated accessibility tests in test suite

#### 🛡️ Error Handling (Graceful Degradation)
- **Global Boundary**: `src/components/error/ErrorBoundary.jsx` with retry
- **Component-Specific**: `src/components/error/DogCardErrorBoundary.jsx`
- **Fallback States**: User-friendly error messages
- **Production Ready**: No technical details exposed to users

#### 🔧 Key Utilities (Core Infrastructure)
- **Logger**: `src/utils/logger.js` - Development-only (production-safe)
- **Security**: `src/utils/security.js` - XSS prevention toolkit
- **Images**: `src/utils/imageUtils.js` - Cloudinary optimization + error handling
- **API**: `src/utils/api.js` - Centralized configuration + error handling

### 📸 Image Processing (Production CDN Pipeline)
- **Backend**: Cloudinary integration handles uploads during scraping
- **Optimization**: Automatic format/quality/transformation optimization
- **Fallback**: Original URLs preserved for error recovery
- **Frontend**: Lazy loading with IntersectionObserver in `LazyImage.jsx`
- **Error Handling**: Graceful degradation for failed image loads
- **Performance**: Multiple size variants (thumbnail, card, detail) for different use cases

## 🌍 Environment Requirements
- **Python 3.9+** with dependencies in `requirements.txt` (backend API + scrapers)
- **PostgreSQL** databases: `rescue_dogs` (main) + `test_rescue_dogs` (testing)
- **Node.js 18+** for frontend (Next.js 15 requires modern Node)
- **Cloudinary account** for image CDN and optimization
- **Chrome/Chromium** for web scraping (Selenium WebDriver for unified extraction)

## 🗄️ Database Schema (Production-Ready Tables)

### `animals` Table (Core Data + Availability Tracking)
**Key Fields**:
- `name`, `breed`, `age_text`, `size` - Basic animal info
- `primary_image_url`, `adoption_url` - Media and adoption links
- **Availability Fields** (Critical for production):
  - `status` (available/unavailable) 
  - `availability_confidence` (high/medium/low)
  - `last_seen_at` (timestamp from last successful scrape)
  - `consecutive_scrapes_missing` (counter for automatic transitions)
  - `last_session_start` (tracks which scrape session last saw this animal)

### `scrape_logs` Table (Enhanced Monitoring)
**Performance & Quality Tracking**:
- `detailed_metrics` (JSONB with comprehensive statistics)
- `duration_seconds` (scrape performance monitoring)
- `data_quality_score` (0-1 automatic assessment)
- `dogs_found`, `dogs_added`, `dogs_updated` (operation counts)

**Example detailed_metrics JSONB**:
```json
{
  "animals_found": 25,
  "data_quality_score": 0.87, 
  "potential_failure_detected": false,
  "unified_extraction_used": true
}
```

## 🔧 Critical Migration Commands (MUST RUN)
```bash
# 🚨 PRODUCTION: Apply availability tracking (CRITICAL)
psql -d rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
psql -d rescue_dogs -f database/migrations/002_add_detailed_metrics.sql

# 🧪 TESTING: Apply same migrations to test database
DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/001_add_duplicate_stale_detection.sql
DB_NAME=test_rescue_dogs psql -d test_rescue_dogs -f database/migrations/002_add_detailed_metrics.sql

# ✅ Verify migrations applied correctly
psql -d rescue_dogs -c "SELECT availability_confidence, last_seen_at FROM animals LIMIT 1;"
```

## 🚨 Critical Troubleshooting Guide

### 🎨 Frontend Issues (Next.js 15 + App Router)

#### ❌ Server/Client Component Conflicts
**Error**: `You are attempting to export 'generateMetadata' from a component marked with 'use client'`
**Solution**: NEVER mix `'use client'` with `generateMetadata()` - separate into Server (metadata) + Client (UI) components

#### ❌ Missing Component References
**Error**: `Cannot find module './DogDetailClient'`  
**Solution**: Ensure Client components exist when Server components reference them

#### ❌ Test Infrastructure Issues
**Error**: `IntersectionObserver is not defined`
**Solution**: Mock configured in `jest.setup.js` - check configuration

#### ❌ Performance Problems
**Slow image loading**: Use `LazyImage` component with Cloudinary optimization
**Unnecessary re-renders**: Implement `React.memo` for expensive components

### 🤖 Scraper Issues (Unified DOM Extraction)

#### ❌ Image Association Problems
**Problem**: Dogs getting wrong images (like Toby/Bobbie issue)
**Solution**: Use `extract_dogs_with_images_unified()` method - maintains DOM spatial relationships

#### ❌ Lazy Loading Failures  
**Problem**: Missing images due to lazy loading
**Solution**: Check `_trigger_comprehensive_lazy_loading()` - may need longer delays

### 🗄️ Database Issues

#### ❌ Missing Availability Columns
**Error**: Column `availability_confidence` doesn't exist
**Solution**: Run critical migrations (see migration commands above)

### ✅ Development Best Practices (MANDATORY)
1. **TDD First**: Write tests before implementation (Red-Green-Refactor)
2. **Test Everything**: `npm test` (frontend), `pytest tests/` (backend) before commits
3. **Code Quality**: Run full verification workflow before commits
4. **Build Verification**: `npm run build` must succeed
5. **Security First**: Sanitize all user content, no console in production
6. **Documentation**: Update docs for any architectural changes

## 🚀 Pre-Commit Quality Gates (MANDATORY)

### Backend Quality Workflow
```bash
source venv/bin/activate
black .                     # Format code with Black
isort .                     # Sort imports 
flake8 --exclude=venv .     # Linting
python -m pytest tests/ -v # Run all tests (93%+ coverage required)
```

### Frontend Quality Workflow  
```bash
cd frontend
npm test                    # 95+ tests across 17 suites
npm run build              # Production build verification  
npm run lint               # ESLint validation
```

### 🎯 COMPLETE VERIFICATION (Required for commits)
```bash
# Single command for full project validation
source venv/bin/activate && black . && isort . && flake8 --exclude=venv . && python -m pytest tests/ && cd frontend && npm test && npm run build && npm run lint
```

## 🏆 Production Readiness Features (Enterprise-Grade)

### 🤖 Backend Production Features
- **Weekly Scraping Architecture**: Designed for production schedules with intelligent stale data management
- **Unified DOM Extraction**: Advanced scraping for modern websites maintaining spatial relationships
- **Error Recovery & Resilience**: Partial failure detection prevents false positives  
- **Quality Scoring**: Automatic 0-1 data quality assessment with field completeness analysis
- **Smart API Defaults**: Only reliable, recently-seen animals shown by default
- **Comprehensive Monitoring**: Detailed JSONB metrics for troubleshooting and optimization
- **Availability Management**: Automatic confidence transitions (high→medium→low→unavailable)

### 🎨 Frontend Production Features  
- **Security**: XSS prevention, content sanitization, URL validation, production-safe logging
- **Performance**: Lazy loading, image optimization, component memoization, bundle optimization
- **Accessibility**: ARIA compliance, keyboard navigation, screen reader support
- **Error Handling**: Error boundaries with retry functionality and graceful degradation
- **SEO Optimization**: Server/Client separation with dynamic metadata generation
- **Test Coverage**: 95+ tests across 17 suites covering security, performance, accessibility

### 📊 Monitoring & Observability
- **Quality Metrics**: Data completeness scoring and trend analysis
- **Performance Tracking**: Scrape duration, success rates, failure detection
- **User Experience**: Smart filtering ensures reliable animal listings
- **Debugging**: Comprehensive logging with structured JSONB metrics for troubleshooting

## 📚 Documentation & Resources
- **Comprehensive Docs**: See `docs/` directory for detailed guides
- **Architecture Guide**: `docs/frontend_architecture.md` - Complete Next.js 15 implementation
- **Development Workflow**: `docs/development_workflow.md` - TDD methodology and quality standards
- **Troubleshooting**: `docs/troubleshooting_guide.md` - Common issues and solutions
- **Production Guide**: `docs/weekly_scraping_guide.md` - Production operations and monitoring