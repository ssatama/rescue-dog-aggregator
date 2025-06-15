# CLAUDE.md

Quick reference for Claude Code when working with the Rescue Dog Aggregator platform.

## 🎯 Project Overview

**What**: Production-ready platform aggregating rescue dogs from multiple organizations, standardizing data, and presenting it through a modern web interface.

**Tech Stack**: 
- Backend: Python/FastAPI, PostgreSQL, Cloudinary
- Frontend: Next.js 15, React, Tailwind CSS
- Scraping: YAML-driven configuration system

**Key Achievement**: Resolved critical navigation-based hero image loading issue with hydration recovery mechanism.

## 🚀 Essential Commands

### Setup & Run
```bash
# Backend
python main.py --setup                    # Initial database setup
uvicorn api.main:app --reload            # Run API (port 8000)

# Frontend  
cd frontend && npm run dev               # Run frontend (port 3000)

# Scraping
python management/config_commands.py list      # List organizations
python management/config_commands.py run pets-in-turkey  # Run specific scraper
python management/config_commands.py run-all   # Run all scrapers
```

### Testing
```bash
# Fast tests only (recommended during development)
pytest tests/ -m "not slow" -v          # ~45 seconds

# Run specific test categories
pytest tests/ -m "unit" -v              # Ultra-fast unit tests
pytest tests/ -m "api" -v               # API tests only

# Frontend tests (now includes performance & accessibility)
cd frontend && npm test                   # All 505+ tests including performance
cd frontend && npm test -- --testPathPattern="performance" # Performance tests only
cd frontend && npm test -- --testPathPattern="accessibility" # Accessibility tests only
cd frontend && npm test -- --testPathPattern="cross-browser" # Cross-browser tests only
```

## 🏗️ Architecture Overview

### Backend Structure
```
api/           # FastAPI application
scrapers/      # Organization-specific scrapers  
configs/       # YAML configuration files
management/    # CLI commands
utils/         # Shared utilities
```

### Frontend Structure  
```
frontend/src/
  app/         # Next.js 15 app router pages
  components/  # React components
  services/    # API clients
  utils/       # Helper functions
```

### Key Patterns
1. **Configuration-Driven Scrapers**: Add new organizations via YAML
2. **Unified DOM Extraction**: Maintains spatial relationships for accurate scraping
3. **Smart API Defaults**: Only shows available dogs with high confidence
4. **Server/Client Separation**: SEO-optimized with dynamic client components

## 🔧 Common Tasks

### Add New Scraper
1. Create `configs/organizations/new-org.yaml`
2. Implement scraper in `scrapers/new_org/`
3. Run `python management/config_commands.py sync`
4. Test with `python management/config_commands.py run new-org`

### Modify Dog Detail Page
- Main component: `frontend/src/app/dogs/[id]/DogDetailClient.jsx`
- Description component: `frontend/src/components/dogs/DogDescription.jsx`
- Image utilities: `frontend/src/utils/imageUtils.js`
- Security utilities: `frontend/src/utils/security.js`

### Database Operations
```bash
python management/availability_manager.py update-availability  # Update dog status
python database/check_db_status.py                            # Health check
```

## 📚 Detailed Documentation

- **Development Workflow**: [`docs/development_workflow.md`](docs/development_workflow.md)
- **Frontend Architecture**: [`docs/frontend_architecture.md`](docs/frontend_architecture.md)
- **Testing Guide**: [`docs/test_optimization_guide.md`](docs/test_optimization_guide.md)
- **Scraping Guide**: [`docs/weekly_scraping_guide.md`](docs/weekly_scraping_guide.md)
- **Troubleshooting**: [`docs/troubleshooting_guide.md`](docs/troubleshooting_guide.md)

## ⚠️ Critical Knowledge

### Image Handling
- **✅ RESOLVED**: Navigation hero image loading issue - images now load immediately on first navigation
- **Backend**: Use `extract_dogs_with_images_unified()` for accurate scraping and image association  
- **Frontend**: Cloudinary with network-adaptive transformations, hydration recovery, and placeholder detection
- **Performance**: Hero images use optimized 800x450 dimensions, catalog cards use 400x300 with fixed transformations
- **Loading**: Document readiness checks, hydration recovery (50ms), timeout handling (15s), retry logic with exponential backoff
- **Monitoring**: Real-time performance tracking and error reporting via imageUtils.js

### Data Constraints
- Limited fields: name, breed, age, sex, size (sometimes), description, organization
- Single image per dog (no galleries)
- No location tracking or geolocation features

### Environment Variables
```bash
# Required for production
DATABASE_URL=postgresql://...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Frontend  
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
```

### 🔒 Security Best Practices

**⚠️ CRITICAL: Never commit API keys or secrets to git repository**

1. **Environment Variables Only**: All secrets must be in `.env` files, never in code
2. **Test Files**: Use `process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` instead of hardcoded values
3. **Open Source Safe**: Repository can be made public without exposing credentials
4. **Local Development**: Copy `.env.example` to `.env.local` and add real values

### Common Issues & Solutions

**Missing availability columns**: Run migrations
```bash
python database/run_critical_migrations.py
```

**Linting errors**: Auto-fix most issues
```bash
black . && isort . && autopep8 --in-place --recursive .
```

**Import errors in frontend**: Check if running from correct directory
```bash
cd frontend && npm run dev  # Must run from frontend/
```

**Images not loading**: Check Cloudinary configuration (CRITICAL)
```bash
# 1. Verify cloud name is configured (no hardcoded values in code)
cat frontend/.env.local | grep CLOUDINARY_CLOUD_NAME
# Should show: NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_actual_cloud_name

# 2. Check for responsive syntax errors (common issue: w_auto:280:400 returns HTTP 400)
# Fixed transformations use: w_400,h_300,c_fill,g_auto,f_auto,q_auto

# 3. Test backend API returns valid image URLs
curl http://localhost:8000/api/animals?limit=1 | jq '.[0].primary_image_url'

# 4. Run comprehensive image loading tests
cd frontend && npm test -- --testPathPattern="real-image-loading"
cd frontend && npm test -- --testPathPattern="dog-detail-image-loading"
cd frontend && npm test -- --testPathPattern="loading-state-transitions"

# 5. Test dog details page infinite loading (common issue)
# Check HeroImageWithBlurredBackground timeout handling and retry logic
```

**Dog details page hero image not loading on first navigation**: ✅ **FIXED**
```bash
# ✅ RESOLVED: Navigation hydration race condition completely fixed
# Issue: Hero images only loaded after hard refresh (Ctrl+R), not on client-side navigation
# Root cause: Three-layer problem:
#   1. API call race condition with document readiness
#   2. Component state update timing issues  
#   3. Placeholder vs real image load confusion

# Solution implemented:
# 1. Document readiness check before API calls (DogDetailClient.jsx)
# 2. Hydration recovery mechanism for hero images (HeroImageWithBlurredBackground.jsx)
# 3. Placeholder load detection and recovery logic
# 4. Proper component lifecycle management

# Verify fix is working:
cd frontend && npm run dev
# Navigate to any dog detail page - hero image should load immediately
# No more need for hard refresh (F5/Ctrl+R)

# Performance monitoring:
cd frontend && npm test -- --testPathPattern="dog-detail-image-loading"
cd frontend && npm test -- --testPathPattern="hydration-recovery"
```

## 🚦 Quality Standards & Test-Driven Development

### **CRITICAL: TDD Requirements (MUST FOLLOW)**

**⚠️ ALL TESTS MUST PASS BEFORE COMPLETING ANY CODING TASK ⚠️**

1. **Run Tests First**: Always run `npm test` before starting any modifications
2. **Test During Development**: Run relevant test suites while making changes
3. **Fix ALL Failures**: No task is complete until ALL tests pass (440+ frontend tests)
4. **No Exceptions**: Never push or consider work "done" with failing tests

```bash
# MANDATORY: Run before finishing any coding work
npm test                                    # All tests must pass
npm test -- --testPathPattern="performance" # Performance tests
npm test -- --testPathPattern="accessibility" # A11y tests  
npm test -- --testPathPattern="final-checklist" # Validation tests
```

### Test Coverage Requirements
- Backend test coverage: 93%+ required
- Frontend: 440+ tests across 39+ suites (includes performance, accessibility, cross-browser)
- All PRs must pass: `pytest tests/ -m "not slow"` (backend)
- Performance requirements: <1000ms load time, 44px minimum touch targets
- Accessibility: WCAG 2.1 AA compliance required
- Cross-browser: Chrome, Safari, Firefox, Edge compatibility
- Follow existing patterns in codebase

### Recent Enhancements
- **Enhanced Description Component**: `DogDescription.jsx` handles short descriptions with engagement prompts, empty descriptions with fallback content, and long descriptions with read more functionality
- **Improved Typography**: Better readability with `text-lg`, `leading-relaxed`, and `max-w-prose` for optimal line length
- **Visual Polish & Mobile UX**: Comprehensive visual improvements including enhanced breadcrumb navigation with chevron icons, better action button integration, polished organization cards with hover states, consistent button styling with focus states, and enhanced loading states throughout the application
- **Accessibility Enhancements**: Improved focus management, ARIA labels, and keyboard navigation across all interactive elements
- **Performance Optimization**: React.memo implementation across components, responsive Cloudinary image transformations with auto-format/quality, hero image preloading, memory leak prevention, and mobile-first performance optimizations
- **Cross-Browser Compatibility**: Comprehensive testing and optimization for Chrome, Safari, Firefox, and Edge across desktop and mobile devices
- **WCAG 2.1 AA Compliance**: Full accessibility audit with 44px minimum touch targets, proper ARIA attributes, semantic HTML structure, and screen reader compatibility
- **Image Loading Architecture**: Network-adaptive loading with timeout handling, retry logic, performance monitoring, and comprehensive test coverage for hero images and catalog cards
- **Security Hardening**: Removed all hardcoded API secrets from codebase, environment-variable-only configuration for open-source readiness

#### ✅ **Critical Navigation Fix (June 2025)**
- **Hero Image Navigation Issue**: ✅ **COMPLETELY RESOLVED** - Hero images now load immediately on first navigation, no hard refresh required
- **Root Cause**: Multi-layer race condition between API calls, React hydration, and component state management
- **Solution**: Document readiness checks + hydration recovery mechanism + placeholder detection
- **Impact**: Seamless user experience - click any dog card and hero image loads instantly
- **Test Coverage**: Added comprehensive integration tests and regression prevention
- **Performance**: Recovery mechanism triggers within 50ms for near-instant loading

## 🔗 Quick Links

- [API Docs](http://localhost:8000/docs) (when running)
- [Database Schema](database/schema.sql)
- [Component Library](frontend/src/components/README.md)
- [Scraper Configs](configs/organizations/)

---

**For detailed information on any topic, refer to the documentation links above.**