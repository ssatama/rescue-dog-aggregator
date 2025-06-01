# Rescue Dog Aggregator

An open-source web platform that aggregates rescue dogs from multiple organizations,  
standardizes the data into a consistent format, and presents it in a user-friendly  
Next.js/Tailwind interface, including social media share buttons on each detail page.

## Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)  
  - [Backend](#backend)  
  - [Frontend](#frontend)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

## Features

- Web scrapers for multiple rescue organizations (currently “Pets in Turkey”)
- PostgreSQL schema with `animals` + `animal_images` + `organizations` tables
- FastAPI backend with:
  - `/api/animals` list & filter endpoint
  - `/api/animals/{id}` detail endpoint
  - `/api/organizations` list & `/api/organizations/{id}` detail
  - Nested `organization` object on every animal, including `social_media: { facebook, instagram, … }`  
- Next.js/Tailwind frontend:
  - Dog catalog with filters
  - Dog detail pages showing standardized data
  - Organization listing & detail pages
  - Reusable `<SocialMediaLinks>` component (renders only the passed networks)
  - Share buttons for Facebook/Instagram/Twitter/LinkedIn where available
- Comprehensive test coverage:
  - Pytest for backend unit & integration tests (uses a test database override fixture)
  - Jest + React Testing Library for frontend components and page‐level tests
  - 80%+ coverage on core logic and UI

## Project Structure

```
.
├── api/                  # FastAPI routes & Pydantic models
├── database/             # schema, migrations, archive
├── scrapers/             # web scraper modules (BaseScraper + org-specific)
├── utils/                # standardization, data audit, scripts
├── frontend/             # Next.js app (React + Tailwind)
│   ├── src/
│   │   ├── app/          # page components
│   │   ├── components/   # shared React UI components
│   │   ├── services/     # API client functions
│   │   └── utils/
├── tests/                # Pytest tests (api, scrapers, utils)
├── TESTING.md            # testing guide
└── README.md             # this file
```

## Getting Started

### Backend

1. Copy `.env.sample` → `.env` and fill in your Postgres credentials.  
2. Initialize the database and tables:
   ```bash
   python main.py --setup
   ```
3. Run the “Pets in Turkey” scraper:
   ```bash
   python main.py --pit
   ```
4. (Optional) Apply standardization:
   ```bash
   python utils/apply_standardization_to_db.py
   ```
5. Start the API server:
   ```bash
   uvicorn api.main:app --reload --port 8000
   ```
6. Visit `http://localhost:8000/docs` for interactive Swagger UI.

### Frontend

```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

## Testing

### Backend

```bash
# Run all tests
pytest

# Run with coverage report
pytest --cov=.

# Run a single test file
pytest tests/api/test_animals_api.py -q
```

Tests use `tests/conftest.py` to spin up a TestClient with a dependency override pointing at `test_rescue_dogs`.

### Frontend

```bash
cd frontend

# Run all
npm test

# Run pattern
npm test page.test.jsx
```

We use Jest + React Testing Library.  Key test suites cover:
- Utility functions (`src/utils`)
- API service mocks (`src/services`)
- UI components (`src/components/**/__tests__`)
- Page components (`src/app/**/__tests__`)

## Deployment

- **Backend**: deploy FastAPI (e.g. to Heroku, AWS, DigitalOcean)
- **Frontend**: deploy Next.js on Vercel  
  Follow the instructions in `frontend/README.md` or [Vercel docs](https://vercel.com/new).