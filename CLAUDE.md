# CLAUDE.md

Quick reference for Claude Code when working with the Rescue Dog Aggregator platform.

## 🎯 Project Overview

**What**: Production-ready platform aggregating rescue dogs from multiple organizations, standardizing data, and presenting it through a modern web interface.

**Tech Stack**: 
- Backend: Python/FastAPI, PostgreSQL, Cloudinary
- Frontend: Next.js 15, React, Tailwind CSS
- Scraping: YAML-driven configuration system

**Key Achievement**: Fixed critical image association bug using unified DOM extraction.

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

# Frontend tests
cd frontend && npm test
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
- **Problem**: Dogs getting wrong images (e.g., Toby getting Bobbie's image)
- **Solution**: Use `extract_dogs_with_images_unified()` for DOM-based extraction
- **Frontend**: Images use Cloudinary with fallback to original URLs

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
```

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

## 🚦 Quality Standards

- Backend test coverage: 93%+ required
- Frontend: 95+ tests across 17 suites
- All PRs must pass: `pytest tests/ -m "not slow"`
- Follow existing patterns in codebase

## 🔗 Quick Links

- [API Docs](http://localhost:8000/docs) (when running)
- [Database Schema](database/schema.sql)
- [Component Library](frontend/src/components/README.md)
- [Scraper Configs](configs/organizations/)

---

**For detailed information on any topic, refer to the documentation links above.**