# Rescue Dog Aggregator

An open-source platform that aggregates rescue dog listings from multiple European and UK organizations into a single searchable interface.

**Live at [www.rescuedogs.me](https://www.rescuedogs.me)**

| Metric        | Value                                 |
| ------------- | ------------------------------------- |
| Active Dogs   | 1,500+                                |
| Organizations | 12 active                             |
| AI Profiling  | 97%+ success rate                     |
| Test Coverage | 168 backend + 285 frontend test files |

---

## Problem Statement

Finding rescue dogs requires visiting multiple websites with different interfaces, search capabilities, and data formats. This platform solves that problem by aggregating listings from multiple organizations into one searchable interface with AI-powered personality profiling.

## Features

### Search & Discovery

- Unified search across 12 rescue organizations (UK, Ireland, Europe)
- Filter by breed, size, age, energy level, and personality traits
- Swipe interface for browsing dogs (Tinder-style discovery)
- Breed directory with statistics
- Organization profiles with dog counts

### AI/LLM Integration

- Personality profiling from descriptions (energy, trainability, compatibility)
- Automatic trait extraction and standardization
- Multi-language support (German, French, Spanish, Italian, etc.)
- Cost-efficient processing (~$0.005 per dog)
- 97%+ success rate with Google Gemini 3 Flash

### Data Processing

- Automated scraping from rescue websites (HTTP + Playwright)
- Standardization of breed names, ages, and sizes
- Multi-language description translation
- Availability tracking with confidence scoring
- Duplicate detection across organizations

### MCP Server Integration

Claude Code and Claude Desktop users can discover rescue dogs through natural conversation:

```json
{
  "mcpServers": {
    "rescuedogs": {
      "command": "npx",
      "args": ["-y", "rescuedogs-mcp-server"]
    }
  }
}
```

8 tools available: search, details, breeds, stats, filters, organizations, preferences matching, adoption guide.

---

## Architecture

### Tech Stack

| Layer              | Technology                                        |
| ------------------ | ------------------------------------------------- |
| Backend            | Python 3.9+ / FastAPI / PostgreSQL 15 / Alembic   |
| Frontend           | Next.js 15 (App Router) / React 18 / TypeScript 5 |
| AI                 | OpenRouter API (Google Gemini 3 Flash)            |
| Browser Automation | Playwright (Browserless v2 in production)         |
| Monitoring         | Sentry (dev + prod)                               |
| Hosting            | Vercel (frontend) + Railway (backend + DB + cron) |

### System Overview

```
Frontend (Next.js 15)
    ↓ API calls
Backend (FastAPI)
    ↓ Routes → Services → Database
PostgreSQL 15 (JSONB for metadata)
    ↑ Data collection
Scrapers (12 organizations)
    ↑ Configuration
YAML configs + LLM prompts
```

### Project Structure

```
api/                    # FastAPI backend
├── routes/             # 8 route modules (animals, swipe, llm, etc.)
services/               # 16 core services
├── llm/                # LLM profiling pipeline (20 files)
scrapers/               # 13 organization scrapers
frontend/src/
├── app/                # Next.js App Router pages
├── components/         # Feature-organized UI (22 dirs)
rescuedogs-mcp-server/  # MCP server for Claude integration
configs/organizations/  # YAML configs (13 orgs)
tests/                  # 168 backend test files
frontend/__tests__/     # 285 frontend test files
migrations/             # Alembic database migrations
management/             # CLI tools (19 scripts)
```

### Active Organizations

| Organization                 | Country    | Technology |
| ---------------------------- | ---------- | ---------- |
| Dogs Trust                   | UK/Ireland | Playwright |
| Many Tears Rescue            | UK         | Playwright |
| REAN                         | Romania/UK | Playwright |
| Woof Project                 | UK         | Playwright |
| MISIS Rescue                 | Montenegro | Playwright |
| Daisy Family Rescue          | Greece     | Playwright |
| Tierschutzverein Europa      | Germany    | HTTP       |
| The Underdog                 | Malta      | HTTP       |
| Furry Rescue Italy           | Italy      | HTTP       |
| Pets in Turkey               | Turkey     | HTTP       |
| Animal Rescue Bosnia         | Bosnia     | HTTP       |
| Santer Paws Bulgarian Rescue | Bulgaria   | HTTP       |

### API Endpoints

```
/api/animals           # Browse and filter dogs
/api/enhanced_animals  # AI-enriched data, semantic search
/api/swipe            # Tinder-like discovery interface
/api/organizations    # Organization management
/api/llm              # Enrichment, translation, batch processing
/api/monitoring       # Health checks, scraper status
/docs                 # Interactive API documentation
```

---

## Quick Start

### Prerequisites

- Python 3.9+
- PostgreSQL 13+
- Node.js 18+

### Installation

```bash
# Clone repository
git clone https://github.com/ssatama/rescue-dog-aggregator.git
cd rescue-dog-aggregator

# Setup backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Setup database
createdb rescue_dogs
alembic upgrade head

# Configure environment
cp .env.example .env
# Edit .env with your database credentials

# Start backend
uvicorn api.main:app --reload
# API at http://localhost:8000

# Setup frontend (new terminal)
cd frontend
npm install
npm run dev
# Frontend at http://localhost:3000
```

---

## Testing

The project follows strict test-driven development.

### Backend Tests

```bash
source venv/bin/activate

# Tier 1: Quick feedback (2-3 min)
pytest -m "unit or fast" --maxfail=5

# Tier 2: CI tests (5-8 min)
pytest -m "not slow and not browser" --maxfail=3

# Tier 3: Full suite (10-15 min)
pytest

# Single test
pytest tests/api/test_swipe.py::test_name -v
```

### Frontend Tests

```bash
cd frontend

npm test              # Unit tests
npm run test:watch    # Watch mode
npx playwright test   # E2E tests
npm run build         # Build verification
```

### Test Markers

- `@pytest.mark.unit` - Pure logic, no IO
- `@pytest.mark.fast` - < 1 second
- `@pytest.mark.integration` - API/DB interaction
- `@pytest.mark.slow` - > 5 seconds
- `@pytest.mark.browser` - Playwright tests

---

## Configuration Management

Organizations are managed through YAML configuration files.

```bash
# List all organizations
python management/config_commands.py list

# Sync configs to database
python management/config_commands.py sync

# Run LLM enrichment
python management/config_commands.py profile --org-id 11
python management/llm_commands.py generate-profiles

# Cost report
python management/llm_commands.py cost-report
```

### Adding a New Organization

1. Create YAML config: `configs/organizations/[slug].yaml`
2. Create scraper: `scrapers/[slug]/scraper.py` (extend `BaseScraper`)
3. Add LLM prompt: `prompts/organizations/[slug].yaml`
4. Sync: `python management/config_commands.py sync`
5. Test: `pytest tests/scrapers/test_[slug].py -v`

---

## Production Operations

### Deployment

- **Frontend**: Vercel (automatic from main branch)
- **Backend**: Railway (automatic from main branch)
- **Database**: Railway PostgreSQL with automated backups
- **Scrapers**: Railway cron job (Tue/Thu/Sat 6am UTC)

### Monitoring

- **Sentry**: Error tracking for both frontend and backend
- **Health checks**: `/api/monitoring/health` endpoint
- **Metrics**: Performance and business metrics collection

### Environment Variables

```bash
# Backend
DATABASE_URL=postgresql://user:pass@localhost/rescue_dogs
OPENROUTER_API_KEY=xxx
SENTRY_DSN_BACKEND=xxx

# Browser automation (production)
USE_PLAYWRIGHT=true
BROWSERLESS_WS_ENDPOINT=wss://chrome.browserless.io
BROWSERLESS_TOKEN=xxx

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SENTRY_DSN=xxx
```

---

## Documentation

- [System Architecture](docs/technical/architecture.md) - Complete system design
- [MCP Server](docs/technical/mcp-server.md) - Claude integration guide
- [Scraper Architecture](docs/technical/scraper-architecture.md) - Scraper patterns
- [LLM Enrichment](docs/features/llm-data-enrichment.md) - AI profiling system
- [API Reference](docs/technical/api-reference.md) - REST API endpoints

---

## Contributing

We welcome contributions to help rescue dogs find homes.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. **Write tests first** (TDD required)
4. Implement the feature
5. Run pre-commit validation:
   ```bash
   source venv/bin/activate && black . && isort . && \
   pytest -m 'not slow and not browser' --maxfail=3 && \
   cd frontend && npm run lint && npm test -- --passWithNoTests --watchAll=false
   ```
6. Submit a pull request

### Code Standards

- Test-driven development required
- Pure functions, no side effects
- Small, focused functions
- Type hints (Python) and strict TypeScript
- No commented-out code or dead code

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

**Built to help rescue dogs find their forever homes.**
