# Architecture Reference

**Target Audience**: Claude Code (AI assistant optimizing for quick reference, accuracy, context efficiency)

## System At-A-Glance

```
Production:    www.rescuedogs.me
Data:          3,246 dogs | 13 active scrapers
Backend:       Python/FastAPI + PostgreSQL 15 + Alembic
Frontend:      Next.js 15 App Router + React 18 + TypeScript 5
LLM:           OpenRouter (Gemini 2.5 Flash primary)
Monitoring:    Sentry (dev + prod)
Hosting:       Vercel (frontend) + Railway (backend + DB)
```

## Directory Structure

```
/api                    # FastAPI routes + middleware
  /routes               # 8 route modules (animals, swipe, llm, etc.)
/services               # 12 core services + llm/ subdirectory
  /llm                  # LLM profiling pipeline (19 files)
/scrapers               # 13 organization scrapers + base classes
/frontend/src
  /app                  # Next.js App Router pages
  /components           # Feature-organized UI components
/configs/organizations  # YAML configs (13 active orgs)
/tests                  # 134 backend test files
/frontend/__tests__     # 260 frontend test files
/migrations/versions    # Alembic migrations (dev)
/migrations/railway     # Production migrations
/management             # CLI tools (config, llm, emergency ops)
```

## Core Data Models

### animals (37 columns)

```sql
-- Identity
id, external_id, organization_id, slug, animal_type

-- Basic Info
name, breed, standardized_breed, age_text, age_min_months, age_max_months
sex, size, standardized_size, language

-- Breed Standardization (NEW)
breed_confidence, breed_type, primary_breed, secondary_breed, breed_slug, breed_group

-- Status & Availability
status, availability_confidence, active
last_seen_at, consecutive_scrapes_missing

-- URLs
adoption_url, primary_image_url, original_image_url

-- JSONB Fields (GIN indexed)
properties              -- Raw scraped data
dog_profiler_data      -- LLM personality profile
translations           -- Multi-language content
llm_processing_flags   -- LLM processing state
adoption_check_data    -- Adoption detection results

-- Timestamps
created_at, updated_at, last_scraped_at, adoption_checked_at
```

### organizations (13 columns)

```sql
id, name, slug, website, config_id
active, last_sync
total_dogs, new_this_week, recent_dogs (JSONB)
ships_to (JSONB), service_regions (JSONB), adoption_fees (JSONB)
created_at, updated_at
```

### Additional Tables

- `animal_images`: Separate image storage
- `breed_standards`: Breed classification rules
- `size_standards`: Size normalization rules
- `llm_processing_logs`: LLM operation tracking
- `scrape_logs`: Scraper execution history
- `scrape_sessions`: Scraping session metadata
- `service_regions`: Geographic service areas
- `schema_migrations`: Alembic version tracking

## API Routes

### Core Endpoints (8 modules)

```
/api/animals           # CRUD, search, filtering, stats (main data access)
/api/enhanced_animals  # AI-enriched data, semantic search
/api/organizations     # Org management, metrics
/api/swipe            # Tinder-like discovery interface
/api/llm              # Enrichment, translation, batch processing
/api/monitoring       # Health, metrics, scraper status
/api/sitemap          # Dynamic XML sitemaps
/api/sentry-test      # Monitoring debug endpoints
```

## Service Layer Pattern

### Core Services (12 root files)

```python
database_service.py          # Connection pool, transactions, retries
connection_pool.py           # Enhanced pooling (10-30 connections)
metrics_collector.py         # Performance + business metrics
session_manager.py           # User sessions, preferences
adoption_detection.py        # Detect adopted dogs via patterns
image_processing_service.py  # Image validation, optimization
progress_tracker.py          # Long-running operation tracking
llm_profiler_service.py      # Main LLM orchestration
llm_data_service.py         # LLM data access layer
config.py                    # Service configuration
models.py                    # Pydantic validation models
null_objects.py              # Null Object pattern implementations
```

### LLM Pipeline (services/llm/, 19 files)

**Core**: `dog_profiler.py` orchestrates the pipeline
**Client**: `llm_client.py` handles OpenRouter API
**Prompts**: `prompt_builder.py` generates org-specific prompts
**Resilience**: `retry_handler.py` with exponential backoff
**Normalization**: `field_normalizers.py`, `profile_normalizer.py`
**Storage**: `database_updater.py`, `async_database_pool.py`
**Quality**: `monitoring.py`, `quality_rubric.py`

## Scraper Architecture

### Active Organizations (13)

```
manytearsrescue          UK
tierschutzverein_europa  Germany
theunderdog              Malta
rean                     Romania
daisy_family_rescue      Greece
woof_project             UK
furryrescueitaly         Italy
pets_in_turkey           Turkey
galgosdelsol             Spain
dogstrust                UK/Ireland
animalrescuebosnia       Bosnia
santerpawsbulgarianrescue Bulgaria
misis_rescue             Montenegro
```

### Scraper Pattern

```
scrapers/[org_name]/
  __init__.py          # Exports main scraper class
  scraper.py           # Implements BaseScraper
  parser.py            # HTML/JSON parsing logic
  normalizer.py        # Data standardization
  validator.py         # Data validation
```

## Frontend Architecture

### Page Routes (Next.js App Router)

```
/                     # Homepage with hero, stats, featured dogs
/dogs                # Dog listing with filters
/dogs/[id]           # Individual dog detail page
/swipe               # Tinder-like discovery interface
/favorites           # User's saved dogs
/favorites/compare   # Side-by-side comparison
/breeds              # Breed directory
/breeds/[breed]      # Breed-specific listings
/breeds/mixed        # Mixed breed section
/organizations       # Organization directory
/organizations/[slug] # Organization details
/about               # About page
/sitemap.xml         # Dynamic sitemap generation
```

### Component Organization

```
/components
  /dogs              # DogCard, DogGrid, DogDetail, PersonalityTraits
  /swipe             # SwipeCard, SwipeStack, SwipeControls
  /favorites         # FavoriteButton, FavoritesList, CompareMode
  /filters           # FilterBar, AdvancedFilters, SearchInput
  /breeds            # BreedCard, BreedGrid, BreedFilter
  /organizations     # OrgCard, OrgGrid, OrgStats
  /layout            # Header, Footer, Navigation, MobileMenu
  /ui                # Button, Card, Modal, FallbackImage
  /seo               # MetaTags, StructuredData, OpenGraph
  /monitoring        # ErrorBoundary, SentryProvider
```

### Image Fallback Strategy

**FallbackImage Component** (multi-level resilience):
1. Next.js Image (Vercel optimization)
2. Cloudflare R2 with transforms (`/cdn-cgi/image/`)
3. Direct R2 URL (no transforms)
4. Local placeholder (`/placeholder_dog.svg`)
5. Emoji fallback (🐕)

Config: `R2_CUSTOM_DOMAIN=images.rescuedogs.me`, `R2_IMAGE_PATH=rescue_dogs`

## Critical Code Patterns

### Pure Functions & Immutability

```python
# ✅ GOOD: Pure function, no mutations
def normalize_age(age_text: str) -> dict:
    return {
        "min_months": extract_min(age_text),
        "max_months": extract_max(age_text)
    }

# ❌ BAD: Mutations, side effects
def normalize_age(dog_data):
    dog_data["age_min"] = extract_min(dog_data["age"])  # MUTATION
    save_to_db(dog_data)  # SIDE EFFECT
```

### Database Access Pattern

```python
# Always use async dependencies
async def get_dogs(db: AsyncSession = Depends(get_db)):
    async with db.begin():  # Transaction context
        result = await db.execute(query)
        return result.scalars().all()
```

### Service Layer Isolation

```python
# Route handler: thin, delegates to services
@router.get("/dogs")
async def list_dogs(filters: DogFilters):
    return await dog_service.get_filtered_dogs(filters)

# Service: business logic, pure functions
async def get_filtered_dogs(filters: DogFilters) -> list[Dog]:
    query = build_query(filters)  # Pure
    return await db.execute(query)  # IO at edges
```

## Testing Strategy

### Test Commands

```bash
# Backend (pytest)
pytest -m "unit or fast" --maxfail=5          # Tier 1: Quick (2-3 min)
pytest -m "not slow and not browser" --maxfail=3  # Tier 2: CI (5-8 min)
pytest                                         # Tier 3: Full (10-15 min)

# Frontend (Jest + Playwright)
npm test                                       # Unit tests
npm run build                                  # Build verification
npx playwright test                            # E2E tests
```

### Test Markers

```python
@pytest.mark.unit        # Pure logic, no IO
@pytest.mark.fast        # < 1 second
@pytest.mark.integration # API/DB interaction
@pytest.mark.slow        # > 5 seconds
@pytest.mark.browser     # Selenium/Playwright
```

## Configuration Management

### Organization Config (YAML)

```yaml
# configs/organizations/[org_name].yaml
id: unique_slug
name: Display Name
website: https://example.org
scraper_class: OrgNameScraper
llm_enabled: true
active: true
ships_to: ["UK", "IE"]
update_frequency: daily
```

### LLM Config

```yaml
# configs/llm_organizations.yaml
organizations:
  11:
    name: "Org Name"
    prompt_file: "org_prompt.yaml"
    source_language: "de"
    target_language: "en"
    model_preference: "gemini-flash"
```

### Sync Commands

```bash
python management/config_commands.py list             # List all orgs
python management/config_commands.py sync             # Sync to DB
python management/config_commands.py profile --org-id 11  # Profile dogs
python management/llm_commands.py generate-profiles   # Batch enrichment
```

## Performance Characteristics

### Current Metrics

```
Dogs:           3,246 active
Scrapers:       13 active organizations
Backend Tests:  134 test files
Frontend Tests: 260 test files
Daily Users:    20+

API Response Times (p50/p95):
  GET /api/animals:      45ms / 120ms
  GET /api/swipe/stack:  65ms / 180ms
  POST /api/llm/enrich:  2.5s / 5s

Frontend (Core Web Vitals):
  FCP: 0.8s | LCP: 1.2s | TTI: 1.5s | CLS: 0.02

Database:
  Connection pool: 10-30 connections, 95% efficiency
  Query cache hit rate: 78%
  Average query time: 12ms

LLM Processing:
  Cost: ~$0.0015/dog
  Success rate: 90%+
  Model: Gemini 2.5 Flash (primary), GPT-4 (fallback)
```

## Common Operations

### Add New Organization

1. Create `configs/organizations/[slug].yaml`
2. Create `scrapers/[slug]/scraper.py` (extend `BaseScraper`)
3. Add prompt: `prompts/organizations/[slug].yaml`
4. Sync config: `python management/config_commands.py sync`
5. Test scraper: `pytest tests/scrapers/test_[slug].py -v`
6. Run scraper: Import and execute in scraping script

### Run LLM Enrichment

```bash
# Single organization
python management/config_commands.py profile --org-id 11

# Batch processing
python management/llm_commands.py generate-profiles

# Check status
python management/llm_commands.py cost-report
```

### Database Operations

```bash
# Migrations
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1

# Direct access
psql -d rescue_dogs
# Or via MCP: use postgres__query tool

# Emergency ops
python management/emergency_operations.py --reset-stale-data
python management/emergency_operations.py --fix-duplicates
```

### Deployment

```
Git Push → GitHub Actions (3-tier CI/CD)
  ├─ Tier 1: Quick tests (2-3 min)
  ├─ Tier 2: Full CI (5-8 min)
  └─ Tier 3: Pre-merge (10-15 min)

Main Branch Merge:
  ├─ Vercel: Automatic frontend deployment
  └─ Railway: Automatic backend + migrations

Health Checks → Rollback on Failure
```

## Key Architectural Decisions

### Why This Stack?

- **FastAPI**: Native async, automatic OpenAPI docs, Pydantic validation
- **Next.js 15**: App Router performance, React Server Components, built-in SEO
- **PostgreSQL**: JSONB flexibility, full-text search, strong ACID, asyncpg driver
- **OpenRouter/Gemini**: Cost-effective ($0.0015/dog), fast (2-5s), high success (90%+)
- **Service Pattern**: Testability, clear separation, future microservices path

### Technology Choices

**Async Everywhere**: Full async/await stack for high concurrency
**JSONB Storage**: Flexible schema evolution without migrations
**Connection Pooling**: 10-30 async connections with health checks
**Pure Functions**: No mutations, no side effects, easier testing
**Configuration-Driven**: YAML configs for organizations, easy to add new scrapers

## Anti-Patterns (DO NOT)

Refer to `CLAUDE.md` for comprehensive list. Key ones:

- ❌ Partial implementations
- ❌ Simplified placeholders ("complete implementation would...")
- ❌ Code duplication (always search existing code first)
- ❌ Dead code (delete unused code completely)
- ❌ Mutations (use pure functions)
- ❌ Mixed concerns (service logic in routes, DB queries in UI)
- ❌ Resource leaks (always close connections, clear timeouts)

## Quick Reference Commands

```bash
# Development
source venv/bin/activate
python run_api.py                 # Start backend (port 8000)
cd frontend && npm run dev        # Start frontend (port 3000)

# Testing
pytest -m "unit or fast" --maxfail=5  # Quick backend tests
cd frontend && npm test               # Frontend tests

# Database
psql -d rescue_dogs
alembic upgrade head

# Config sync
python management/config_commands.py sync

# LLM operations
python management/llm_commands.py generate-profiles
python management/llm_commands.py cost-report

# Emergency
python management/emergency_operations.py --reset-stale-data
```

## Environment Variables

```bash
# Backend (required)
DATABASE_URL=postgresql://user:pass@localhost/rescue_dogs
OPENROUTER_API_KEY=xxx
SENTRY_DSN=xxx

# Frontend (required)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SENTRY_DSN=xxx
NEXT_PUBLIC_R2_CUSTOM_DOMAIN=images.rescuedogs.me
NEXT_PUBLIC_R2_IMAGE_PATH=rescue_dogs
```

## Working with This Codebase

### Before Starting Work

1. **Check onboarding**: Use serena's `check_onboarding_performed` tool
2. **Read memories**: Use serena's `list_memories` and `read_memory` tools
3. **Understand context**: Use serena's symbolic tools (`get_symbols_overview`, `find_symbol`)
4. **Plan first**: Use TodoWrite tool to plan before coding

### During Work

1. **Read selectively**: Use symbolic tools, avoid reading entire files
2. **Follow TDD**: Write test → see fail → implement → refactor
3. **Use sub-agents**: For complex tasks (file-analyzer, code-analyzer)
4. **Track progress**: Update TodoWrite tool as you complete tasks

### File Operations

- **Prefer**: serena/morph MCP tools for editing (faster, more precise)
- **Use symbolic editing**: When replacing entire functions/classes
- **Use regex editing**: For small line-based changes
- **Avoid**: Reading entire files unless absolutely necessary

---

**Last Updated**: 2025-01-27
**Current Scale**: 3,246 dogs | 13 scrapers | 134 backend tests | 260 frontend tests
**Production**: www.rescuedogs.me
