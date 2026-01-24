# Python Guidelines

> **Priorities:** Reliability > Simplicity > Performance > Maintainability
>
> These guidelines are reviewed at every PR for compliance.

## Quick Reference

| Do | Don't |
|----|-------|
| `list[str]`, `dict[str, int]` | `List[str]`, `Dict[str, int]` |
| `str \| None` | `Optional[str]` |
| `pathlib.Path` | String paths |
| `httpx.AsyncClient` (one per stage) | New client per request |
| `@dataclass` for data | Plain dicts for structured data |
| `logging` module | `print()` for operational messages |
| Fatal vs recoverable errors | Silent empty returns |
| `async with` for resources | Manual cleanup |
| `TypedDict`, `Literal`, `Protocol` | `List`, `Dict`, `Optional` |
| Environment variables for config | Hardcoded infrastructure values |

---

## Non-Negotiable (PR Blockers)

These are hard requirements. PRs that violate them will be rejected.

### 1. Python Version

```python
# Required: Python 3.12+
# Use modern syntax everywhere

# Good
def get_items(ids: list[str]) -> dict[str, Item]:
    ...

def find_dog(id: str) -> Dog | None:
    ...

# Bad - legacy syntax
from typing import List, Dict, Optional

def get_items(ids: List[str]) -> Dict[str, Item]:
    ...

def find_dog(id: str) -> Optional[Dog]:
    ...
```

### 2. Type Hints on All Functions

Every function must have type hints for parameters and return types.

```python
# Good
async def get_dog_by_slug(
    db: AsyncSession,
    slug: str,
) -> Dog | None:
    ...

async def fetch_organization_dogs(
    client: httpx.AsyncClient,
    org_id: int,
) -> list[dict]:
    ...

# Bad - missing types
async def get_dog_by_slug(db, slug):
    ...
```

### 3. Ruff Must Pass

```bash
uv run ruff check . --fix
uv run ruff format .
```

Current ruff configuration (do not weaken):

```toml
[tool.ruff.lint]
select = ["E", "F", "I", "N", "W", "UP", "B", "C4", "SIM"]
```

### 4. Tests Must Pass

```bash
uv run pytest -m "not slow and not browser and not external" --maxfail=3
```

---

## Reliability

### Error Handling: Fatal vs Recoverable Errors

**Principle:** APIs and scrapers must distinguish between errors that should abort vs continue.

**Fatal errors (abort immediately):**
- Authentication/authorization failures
- Configuration errors (missing env vars, invalid paths)
- Database connection failures
- Schema/migration mismatches

**Recoverable errors (log and continue):**
- Single dog profile parse failure in batch
- Transient network errors (with retry)
- Missing optional data fields
- Individual scraper page failures

```python
import logging

logger = logging.getLogger(__name__)

# Good - distinguish fatal vs recoverable, use logging
async def scrape_organization(org: Organization) -> list[Dog]:
    """Scrape dogs from organization. Returns empty list on recoverable error."""
    dogs: list[Dog] = []
    try:
        pages = await fetch_listing_pages(org)
        for page in pages:
            try:
                dogs.extend(parse_dogs(page))
            except ParseError as e:
                # Recoverable: single page malformed, log and continue
                logger.warning("Failed to parse page %s: %s", page.url, e)
    except AuthenticationError as e:
        # Fatal: can't continue without auth
        logger.error("Authentication failed for %s: %s", org.name, e)
        raise
    return dogs

# Good - error budgets for batch operations
async def enrich_all_dogs(dogs: list[Dog]) -> list[EnrichedDog]:
    """Enrich dogs with LLM profiles. Abort if >5% fail."""
    results = []
    failures = 0
    max_failures = max(1, len(dogs) // 20)  # 5% threshold

    for dog in dogs:
        result = await enrich_dog(dog)
        if result is None:
            failures += 1
            if failures > max_failures:
                logger.error("Error budget exceeded: %d/%d failures", failures, len(dogs))
                raise RuntimeError(f"Too many failures: {failures}/{len(dogs)}")
        else:
            results.append(result)

    return results
```

### HTTP Requests: Always Use Timeouts and Retries

```python
import logging
import os

logger = logging.getLogger(__name__)

# Configuration via environment variables with defaults
BACKOFF_DELAYS = [15, 30, 60, 120, 180]  # seconds
MAX_RETRIES = int(os.getenv("MAX_RETRIES", "5"))
TIMEOUT_SECONDS = float(os.getenv("TIMEOUT_SECONDS", "30.0"))

async def fetch_with_retry(
    client: httpx.AsyncClient,
    url: str,
) -> bytes | None:
    """Fetch URL with exponential backoff. Returns None on failure."""
    for attempt in range(MAX_RETRIES):
        try:
            response = await client.get(url, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
            return response.content
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:  # Rate limited
                wait = BACKOFF_DELAYS[min(attempt, len(BACKOFF_DELAYS) - 1)]
                logger.warning("Rate limited, waiting %ds: %s", wait, url)
                await asyncio.sleep(wait)
            else:
                logger.error("HTTP %d: %s", e.response.status_code, url)
                return None
        except httpx.RequestError as e:
            logger.warning("Request error (attempt %d): %s", attempt + 1, e)
            await asyncio.sleep(BACKOFF_DELAYS[min(attempt, len(BACKOFF_DELAYS) - 1)])
    logger.error("Max retries exceeded: %s", url)
    return None

# Bad - no timeout, no retry, bare except
async def fetch(client, url):
    try:
        response = await client.get(url)
        return response.content
    except:
        return None
```

### Database: Use Async Context Managers

```python
# Good - async context manager for session
async def get_dog(db: AsyncSession, dog_id: int) -> Dog | None:
    result = await db.execute(select(Dog).where(Dog.id == dog_id))
    return result.scalar_one_or_none()

# Good - transaction with rollback on error
async def update_dog_status(db: AsyncSession, dog_id: int, status: str) -> None:
    async with db.begin():
        dog = await db.get(Dog, dog_id)
        if dog:
            dog.status = status
        # Automatically commits or rolls back

# Bad - manual commit/rollback
async def update_dog_status(db, dog_id, status):
    dog = await db.get(Dog, dog_id)
    dog.status = status
    await db.commit()  # What if error before this?
```

---

## Simplicity

### One Module, One Purpose

Each module should do one thing well:

```
scrapers/
├── base_scraper.py     -> Base scraper class
├── hope_rescue.py      -> Hope Rescue scraper
├── dogs_trust.py       -> Dogs Trust scraper
services/
├── database_service.py -> Database operations
├── llm_service.py      -> LLM enrichment
├── image_service.py    -> Image processing
```

**Rule:** If a module does more than one thing, split it.

### Flat Is Better Than Nested

```python
# Good - early returns, flat structure
async def get_dog_profile(dog_id: int) -> DogProfile | None:
    dog = await db.get(Dog, dog_id)
    if dog is None:
        return None

    profile = dog.dog_profiler_data
    if not profile:
        return None

    return DogProfile(
        name=dog.name,
        personality=profile.get("personality_summary"),
        requirements=profile.get("requirements"),
    )

# Bad - deep nesting
async def get_dog_profile(dog_id: int) -> DogProfile | None:
    dog = await db.get(Dog, dog_id)
    if dog:
        if dog.dog_profiler_data:
            if dog.dog_profiler_data.get("personality_summary"):
                return DogProfile(
                    name=dog.name,
                    personality=dog.dog_profiler_data["personality_summary"],
                    requirements=dog.dog_profiler_data.get("requirements"),
                )
    return None
```

### Use Dataclasses and Pydantic for Structured Data

```python
from dataclasses import dataclass
from pydantic import BaseModel

# Good - dataclass for internal data
@dataclass
class ScraperResult:
    dogs_found: int
    dogs_updated: int
    dogs_new: int
    errors: list[str]

# Good - Pydantic for API schemas
class DogResponse(BaseModel):
    id: int
    name: str
    breed: str
    age_text: str | None
    organization_name: str

    model_config = ConfigDict(from_attributes=True)

# Bad - plain dict
result = {
    "dogs_found": 10,
    "dogs_updated": 5,
    "errors": [],
}
```

### Constants With Units

```python
# Good - units in comments or names
TIMEOUT_SECONDS = 30.0
MAX_RETRIES = 5
CONCURRENT_REQUESTS = 3
CACHE_TTL_SECONDS = 3600
IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024

# Bad - no units, unclear meaning
TIMEOUT = 30.0
MAX = 5
CONCURRENT = 3
```

---

## Performance

### Use Appropriate Data Structures

```python
# Good - O(1) lookup
seen_ids: set[str] = set()
if dog_id in seen_ids:
    continue
seen_ids.add(dog_id)

# Bad - O(n) lookup
seen_ids: list[str] = []
if dog_id in seen_ids:  # O(n) search!
    continue
seen_ids.append(dog_id)
```

### HTTP Client Lifecycle: One Client Per Stage

**Critical:** Create ONE `AsyncClient` per pipeline stage and pass it to functions.

```python
# Good - one client, passed to all functions
async def scrape_all_organizations(orgs: list[Organization]) -> list[Dog]:
    """Scrape all organizations with shared client."""
    sem = asyncio.Semaphore(CONCURRENT_REQUESTS)

    async def scrape_one(client: httpx.AsyncClient, org: Organization) -> list[Dog]:
        async with sem:
            return await scrape_organization(client, org)

    async with httpx.AsyncClient(
        limits=httpx.Limits(max_connections=CONCURRENT_REQUESTS + 2),
        timeout=TIMEOUT_SECONDS,
    ) as client:
        tasks = [scrape_one(client, org) for org in orgs]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [dog for result in results if isinstance(result, list) for dog in result]

# Bad - new client per request
async def scrape_all_organizations(orgs: list[Organization]) -> list[Dog]:
    results = []
    for org in orgs:
        async with httpx.AsyncClient() as client:  # NEW CLIENT EACH TIME!
            results.extend(await scrape_organization(client, org))
    return results
```

### Database: Use Bulk Operations

```python
# Good - bulk insert
async def insert_dogs(db: AsyncSession, dogs: list[Dog]) -> None:
    db.add_all(dogs)
    await db.commit()

# Good - bulk update with single query
async def mark_dogs_inactive(db: AsyncSession, dog_ids: list[int]) -> None:
    await db.execute(
        update(Dog).where(Dog.id.in_(dog_ids)).values(active=False)
    )
    await db.commit()

# Bad - N+1 queries
async def insert_dogs(db: AsyncSession, dogs: list[Dog]) -> None:
    for dog in dogs:
        db.add(dog)
        await db.commit()  # Commit per dog!
```

---

## Maintainability

### Consistent Module Structure

Every module should follow this structure:

```python
"""
Module docstring explaining purpose.

Usage:
    uv run python -m scrapers.hope_rescue
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

# Third-party imports
import httpx
from sqlalchemy.ext.asyncio import AsyncSession

# Local imports
from services.database_service import get_session

# Constants
TIMEOUT_SECONDS = 30.0
MAX_RETRIES = 5

logger = logging.getLogger(__name__)

# Types/dataclasses
@dataclass
class ScraperResult:
    ...

# Helper functions (private)
def _parse_dog_card(html: str) -> dict:
    ...

# Public functions
async def scrape_dogs(org_id: int) -> list[dict]:
    ...

# Main entry point
async def main() -> None:
    ...

if __name__ == "__main__":
    asyncio.run(main())
```

### Structured Logging

Use the `logging` module instead of `print()`:

```python
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    stream=sys.stderr,
)

logger = logging.getLogger(__name__)

# Good - structured logging with context
async def scrape_organization(org: Organization) -> list[Dog]:
    logger.info("Starting scrape: %s (%d)", org.name, org.id)

    dogs = await fetch_and_parse(org)
    logger.info("Found %d dogs from %s", len(dogs), org.name)

    return dogs

# Bad - print statements
def scrape_organization(org):
    print("scraping")
    dogs = fetch_and_parse(org)
    print("done")
    return dogs
```

### FastAPI Route Patterns

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/api/dogs", tags=["dogs"])

@router.get("", response_model=list[DogResponse])
async def list_dogs(
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    breed: str | None = Query(default=None),
) -> list[Dog]:
    """List dogs with optional filtering."""
    query = select(Dog).where(Dog.active == True)

    if breed:
        query = query.where(Dog.standardized_breed == breed)

    query = query.limit(limit).offset(offset)
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/{slug}", response_model=DogDetailResponse)
async def get_dog(
    slug: str,
    db: AsyncSession = Depends(get_db),
) -> Dog:
    """Get dog by slug."""
    dog = await db.execute(select(Dog).where(Dog.slug == slug))
    dog = dog.scalar_one_or_none()

    if dog is None:
        raise HTTPException(status_code=404, detail="Dog not found")

    return dog
```

---

## Dependencies

### Approved Dependencies

| Package | Purpose | Notes |
|---------|---------|-------|
| `fastapi` | API framework | Async-first |
| `sqlalchemy` | ORM | Async with asyncpg |
| `pydantic` | Data validation | V2 with model_config |
| `httpx` | HTTP client | Async-first |
| `alembic` | Migrations | Async support |
| `pytest` | Testing | With pytest-asyncio |

### Adding New Dependencies

Before adding a new dependency:

1. **Is it necessary?** Can stdlib or existing deps solve it?
2. **Is it maintained?** Check last commit, issue response time
3. **Is it minimal?** Avoid packages with heavy transitive deps
4. **Does it support Python 3.12+?**

```bash
uv add package-name
uv run pytest  # Verify it works
```

---

## PR Checklist

Before submitting a Python PR:

```
[ ] ruff check passes: `uv run ruff check .`
[ ] ruff format passes: `uv run ruff format --check .`
[ ] All tests pass: `uv run pytest -m "not slow and not browser and not external"`
[ ] Type hints on all new functions
[ ] No bare except: clauses
[ ] No string paths (use pathlib.Path)
[ ] Timeouts on all HTTP requests
[ ] Async context managers for resources
[ ] Logging instead of print()
```

---

## Anti-Patterns to Avoid

### Don't Use Legacy `typing` Aliases

Ban: `List`, `Dict`, `Optional`, `Tuple`, `Set`

Allow: `TypedDict`, `Literal`, `Protocol`, `TypeGuard`, `Self`, `Final`, `override`, `NewType`

```python
# Bad - legacy aliases
from typing import List, Dict, Optional

def process(items: List[str]) -> Dict[str, int]:
    ...

# Good - built-in generics
def process(items: list[str]) -> dict[str, int]:
    ...

# Good - advanced typing features
from typing import TypedDict, Literal, Protocol

class DogData(TypedDict):
    name: str
    breed: str
    age_months: int | None

Status = Literal["available", "adopted", "pending"]
```

### Don't Use Bare Except

```python
# Bad
try:
    result = risky_operation()
except:
    pass

# Good
try:
    result = risky_operation()
except SpecificError as e:
    logger.warning("Operation failed: %s", e)
    result = default_value
```

### Don't Use String Paths

```python
# Bad
file_path = "data/output/file.json"
with open(file_path) as f:
    ...

# Good
file_path = Path("data") / "output" / "file.json"
content = file_path.read_text()
```

### Don't Forget Resource Cleanup

```python
# Bad - connection leak
client = httpx.AsyncClient()
response = await client.get(url)
# client never closed!

# Good - context manager
async with httpx.AsyncClient() as client:
    response = await client.get(url)
```

---

## Version History

| Date | Change |
|------|--------|
| 2026-01-24 | Initial guidelines created, adapted from berlin-sun-seeker |
