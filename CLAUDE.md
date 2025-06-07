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

# Run tests
pytest

# Code formatting and linting
black .
isort .
```

### Frontend Development  
```bash
cd frontend
npm install
npm run dev          # Development server on port 3000
npm run build        # Production build
npm run lint         # ESLint
npm test             # Jest tests
npm run test:watch   # Jest watch mode
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

### 4. Frontend (Next.js)
- **Pages**: Dog listings (`/dogs`), organization pages (`/organizations`)
- **Components**: Modular UI in `src/components/` with shadcn/ui components
- **Services**: API communication in `src/services/`
- **Testing**: Jest with React Testing Library

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

### Testing Strategy
- **Backend**: Pytest with test database isolation in `tests/conftest.py`
- **Frontend**: Jest with component and integration tests
- **Coverage**: 93%+ including security, resilience, and integration tests
- **Critical Tests**: SQL injection prevention, network failure handling, data consistency

### Configuration Management
- Validate configs: `python management/config_commands.py validate`
- Preview changes: `python management/config_commands.py sync --dry-run`
- View specific org: `python management/config_commands.py show org-name`

### Image Processing
- Cloudinary integration handles uploads during scraping
- Automatic optimization (format, quality, transformations)
- Fallback to original URLs on upload failures

## Environment Requirements
- Python 3.9+ with dependencies in `requirements.txt`
- PostgreSQL database
- Node.js 16+ for frontend
- Cloudinary account for image processing
- Chrome/Chromium for web scraping