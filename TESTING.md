# Testing Guide for Rescue Dog Aggregator

This project includes both backend (Pytest) and frontend (Jest) tests.

---

## Backend Tests

Run from the project root:

```bash
pytest
```

- Tests live under `tests/`:
  - `tests/utils/` – standardization, audit scripts  
  - `tests/scrapers/` – BaseScraper + org-specific  
  - `tests/api/` – integration tests against FastAPI endpoints  

### Test Database

- Uses a Postgres test database `test_rescue_dogs`  
- Override provided in `tests/conftest.py` to point FastAPI’s `get_db_cursor` to the test DB.  
- Data fixtures clear & re-insert base records per test.

---

## Frontend Tests

Run from the `frontend/` directory:

```bash
npm test
```

Key directories:

- `src/components/.../__tests__` – UI component unit tests  
- `src/services/.../__tests__`   – API helper mocks  
- `src/app/.../__tests__`        – Page component tests  

### New Social Media Share Tests

- `<SocialMediaLinks>` unit tests confirm only the passed networks render  
- DogDetailPage and OrgDetailPage tests verify share links appear when `social_media`  
  data is present and are hidden when the object is empty.  

---

## Continuous Integration

On each PR or push to `main`, GitHub Actions runs:

1. `pytest --cov=.`  
2. `npm ci && npm test`

Ensure **all** tests pass before merging.

---

## Adding New Tests

### Backend

1. Create `tests/.../test_<feature>.py`  
2. Use fixtures from `tests/conftest.py` for DB access  
3. Run `pytest tests/.../test_<feature>.py` to verify

### Frontend

1. Create `*.test.jsx` next to the code under `src/`  
2. Mock external dependencies (services, next/navigation) via Jest  
3. Run `npm test <yourFile>.test.jsx`