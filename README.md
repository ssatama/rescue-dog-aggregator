# Rescue Dog Aggregator

An open-source platform that aggregates rescue dog listings from multiple organizations into a single searchable interface.

**Live at [www.rescuedogs.me](https://www.rescuedogs.me)**

- 13 active rescue organizations
- 2,900+ available dogs
- AI-powered personality profiling
- Test-driven development (134 backend + 239 frontend test files)

---

## Problem Statement

Finding rescue dogs requires visiting multiple websites with different interfaces, search capabilities, and data formats. This platform solves that problem by aggregating listings from multiple organizations into one searchable interface.

## Features

### Search & Discovery

- Unified search across 13 rescue organizations
- Filter by breed, size, age, location, and personality traits
- Swipe interface for browsing dogs (similar to dating apps)

### Data Processing

- Automated data collection from rescue websites
- Standardization of breed names, ages, and sizes
- Multi-language description translation
- Availability tracking with confidence scoring
- Duplicate detection across organizations

### AI/LLM Integration

- Personality profiling from descriptions
- Automatic trait extraction (energy level, trainability, etc.)
- Multi-language support (German, French, Spanish, etc.)
- Cost-efficient processing (~$0.0015 per dog)
- 90%+ success rate with Google Gemini 2.5 Flash

### Technical Features

- Configuration-based organization management (YAML)
- RESTful API with OpenAPI documentation
- Responsive design for mobile and desktop
- Accessibility compliance (WCAG 2.1 AA)
- Performance monitoring and error tracking

---

## Architecture

### Tech Stack

**Backend**

- FastAPI (Python 3.9+) with async/await
- PostgreSQL 15 with JSONB for metadata
- SQLAlchemy ORM with SQL migrations
- pytest for testing
- OpenRouter API for AI features (Google Gemini 2.5 Flash)

**Frontend**

- Next.js 15 with App Router
- TypeScript 5.x with strict mode
- Tailwind CSS for styling
- Jest + React Testing Library

**Infrastructure**

- Railway: Backend API + PostgreSQL hosting
- Vercel: Frontend hosting
- Sentry: Error tracking and monitoring
- GitHub Actions: CI/CD

---

### System Architecture

```
Frontend (Next.js 15)
    ↓ API calls
Backend (FastAPI)
    ↓ Routes → Services → Database
PostgreSQL 15
    ↑ Data collection
Scrapers (13 organizations)
    ↑ Configuration
YAML configs
```

### Project Structure

```
api/              # FastAPI backend
├── routes/       # API endpoints
├── services/     # Business logic
scrapers/         # Organization scrapers
frontend/         # Next.js application
├── app/          # App Router pages
├── components/   # React components
tests/            # Test suites
configs/          # Organization YAMLs
migrations/       # Database migrations
```

### Data Pipeline

1. **Configuration**: YAML files define organization scrapers
2. **Collection**: Scrapers fetch data from rescue websites
3. **Normalization**: Standardize breeds, ages, sizes across sources
4. **AI Enrichment**: Generate personality profiles using LLM
5. **Storage**: PostgreSQL with JSONB for flexible metadata
6. **API Delivery**: RESTful endpoints with filtering

### API Endpoints

- `/api/animals` - Browse and filter dogs
- `/api/swipe` - Swipe interface for dog discovery
- `/api/organizations` - Organization management
- `/api/llm/enrich` - AI enrichment endpoint
- `/api/monitoring/health` - Health checks
- `/docs` - Interactive API documentation

### Availability Tracking

The system tracks dog availability with confidence levels:

- **High**: Recently seen in last scrape
- **Medium**: Missed 1 scrape session
- **Low**: Missed 2-3 scrape sessions
- **Unavailable**: Missed 4+ sessions (hidden from API)

---

## Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL 13+
- Node.js 18+

### Installation

1. **Clone repository**

```bash
git clone https://github.com/yourusername/rescue-dog-aggregator.git
cd rescue-dog-aggregator
```

2. **Setup backend**

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Setup database**

```bash
# Create PostgreSQL database
createdb rescue_dogs

# Run database setup
python database/db_setup.py
```

4. **Configure environment**

```bash
cp .env.example .env
# Edit .env with your database credentials
```

5. **Start backend server**

```bash
uvicorn api.main:app --reload
# API available at http://localhost:8000
```

6. **Setup frontend** (new terminal)

```bash
cd frontend
npm install
npm run dev
# Frontend available at http://localhost:3000
```

---

## Testing

The project follows test-driven development with comprehensive coverage.

### Running Tests

**Backend Tests**

```bash
# Quick tests (unit + fast integration)
pytest -m "unit or fast" --maxfail=5

# Full test suite
pytest

# Specific test file
pytest tests/api/test_swipe.py -v
```

**Frontend Tests**

```bash
cd frontend
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run e2e          # Playwright E2E tests
```

### Test Categories

- **Unit tests**: Business logic and pure functions
- **Integration tests**: API endpoints and database operations
- **E2E tests**: Full user workflows
- **Performance tests**: Load testing and optimization
- **Accessibility tests**: WCAG 2.1 AA compliance

### Quality Requirements

All code must pass:

- Test suite (no failures)
- Linting (ruff for Python, ESLint for TypeScript)
- Type checking (mypy, TypeScript strict mode)
- Build verification

---

## Configuration Management

Organizations are managed through YAML configuration files.

### Commands

```bash
# List all organizations
python management/config_commands.py list

# Sync configs to database
python management/config_commands.py sync

# Run specific scraper
python management/config_commands.py run [org-name]

# Run all scrapers
python management/config_commands.py run-all

# Validate configs
python management/config_commands.py validate
```

### Adding a New Organization

1. Create YAML config in `configs/organizations/`
2. Define scraper class in `scrapers/`
3. Run sync command to update database
4. Test with run command

---

## Production Operations

### Deployment

- **Backend**: Railway (automatic deployments from main branch)
- **Frontend**: Vercel (automatic deployments)
- **Database**: Railway PostgreSQL with automated backups

### Monitoring

- **Sentry**: Error tracking for both environments
- **Health checks**: `/api/monitoring/health` endpoint

### Data Collection

Scrapers run on schedule to keep data fresh:

```bash
# Example cron job (weekly)
0 2 * * 1 python management/config_commands.py run-all
```

---

## Documentation

### Core Documentation

- [System Architecture](docs/technical/architecture.md) - System design and data flow
- [API Reference](docs/technical/api-reference.md) - REST API endpoints
- [Testing Guide](docs/guides/testing.md) - Testing strategy and patterns
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

### Feature Documentation

- [LLM Enrichment](docs/features/llm-data-enrichment.md) - AI profiling system
- [Unified Standardization](docs/unified_standardization_api.md) - Data normalization

---

## Current Status

### Metrics

- **Database**: 3,000+ total dogs, 2,900+ available
- **API Performance**: < 100ms average response time
- **Test Coverage**: 134 backend test files, 239 frontend test files
- **Deployment**: Zero-downtime with automatic rollback

---

## Contributing

We welcome contributions to help rescue dogs find homes.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Write tests first (TDD)
4. Implement the feature
5. Ensure all tests pass
6. Submit a pull request

### Code Standards

- Test-driven development required
- Pure functions, no side effects
- Small, focused functions
- Type hints (Python) and strict TypeScript
- No commented-out code

### Getting Help

- Check documentation first
- Open GitHub issues for bugs
- Use discussions for questions