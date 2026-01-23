# Asyncpg Migration Plan

## Context

### Current State (December 2025)

The API uses `psycopg2` with `ThreadedConnectionPool` for database connections. While functional, this approach has fundamental limitations under high concurrency:

**Issues Identified (Sentry - Dec 14, 2025):**

- Connection pool exhaustion errors during traffic spikes
- `PoolError("connection pool exhausted")` - pool fails immediately without queueing
- 113+ error events traced to `api.routes.enhanced_animals.get_detail_content`

**Root Cause:**
`psycopg2.pool.ThreadedConnectionPool` is a **fail-fast pool** - when all connections are in use, it immediately raises an exception instead of queueing waiting requests.

### Phase 1 Mitigation (Implemented)

We've increased pool capacity and added retry logic:

- Pool size: `minconn=5, maxconn=50` (was 2/20)
- Added exponential backoff retry (3 attempts, 100ms base delay)
- Configurable via environment variables

This helps but doesn't solve the fundamental architecture issue.

---

## Why Migrate to Asyncpg?

### Current Architecture Problems

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI (async)                          │
├─────────────────────────────────────────────────────────────┤
│                    Starlette ASGI                           │
├─────────────────────────────────────────────────────────────┤
│              run_in_threadpool() adapter                    │  ← BOTTLENECK
├─────────────────────────────────────────────────────────────┤
│           psycopg2 (sync) + ThreadedConnectionPool          │
├─────────────────────────────────────────────────────────────┤
│                      PostgreSQL                             │
└─────────────────────────────────────────────────────────────┘
```

1. **Async/Sync Mismatch**: FastAPI routes are `async def` but psycopg2 is synchronous
2. **Thread Pool Contention**: DB operations run in a thread pool, creating overhead
3. **No Native Queueing**: ThreadedConnectionPool fails instead of waiting
4. **Resource Waste**: Each blocked thread consumes memory while waiting

### Target Architecture with Asyncpg

```
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI (async)                          │
├─────────────────────────────────────────────────────────────┤
│                    Starlette ASGI                           │
├─────────────────────────────────────────────────────────────┤
│              asyncpg (native async) + Pool                  │  ← NATIVE ASYNC
├─────────────────────────────────────────────────────────────┤
│                      PostgreSQL                             │
└─────────────────────────────────────────────────────────────┘
```

### Benefits of Asyncpg

| Feature               | psycopg2                  | asyncpg               |
| --------------------- | ------------------------- | --------------------- |
| Async support         | Via threadpool (overhead) | Native async/await    |
| Connection queueing   | None (fail-fast)          | Built-in with timeout |
| Performance           | ~10k queries/sec          | ~50k+ queries/sec     |
| Memory per connection | Higher (thread stack)     | Lower (coroutine)     |
| Prepared statements   | Manual                    | Automatic caching     |
| Type conversion       | Basic                     | Comprehensive         |

---

## Migration Plan

### Phase 1: Preparation (1-2 days)

1. **Add asyncpg to dependencies**

   ```bash
   uv add asyncpg
   ```

2. **Create async connection pool module**

   ```
   api/database/async_pool.py
   ```

3. **Create async database dependency**

   ```
   api/dependencies_async.py
   ```

### Phase 2: Parallel Implementation (2-3 days)

Run both pools simultaneously to validate the new implementation.

1. **Create `AsyncConnectionPool` class**

   ```python
   # api/database/async_pool.py
   import asyncpg
   from typing import AsyncGenerator

   class AsyncConnectionPool:
       _pool: asyncpg.Pool | None = None

       @classmethod
       async def initialize(cls, min_size: int = 5, max_size: int = 50):
           cls._pool = await asyncpg.create_pool(
               host=DB_CONFIG["host"],
               user=DB_CONFIG["user"],
               password=DB_CONFIG["password"],
               database=DB_CONFIG["database"],
               min_size=min_size,
               max_size=max_size,
               command_timeout=30,
               # Pool will queue requests when exhausted (up to timeout)
           )

       @classmethod
       async def get_connection(cls) -> AsyncGenerator[asyncpg.Connection, None]:
           async with cls._pool.acquire() as conn:
               yield conn

       @classmethod
       async def close(cls):
           if cls._pool:
               await cls._pool.close()
   ```

2. **Create async dependency**

   ```python
   # api/dependencies_async.py
   from typing import AsyncGenerator
   import asyncpg
   from api.database.async_pool import AsyncConnectionPool

   async def get_async_db() -> AsyncGenerator[asyncpg.Connection, None]:
       async with AsyncConnectionPool._pool.acquire() as conn:
           yield conn
   ```

3. **Migrate one endpoint as proof-of-concept**

   ```python
   # Example: enhanced_animals.py
   @router.post("/enhanced/detail-content-v2")
   async def get_detail_content_v2(
       animal_ids: List[int],
       conn: asyncpg.Connection = Depends(get_async_db)
   ):
       results = await conn.fetch(
           "SELECT id, description, tagline FROM animals WHERE id = ANY($1)",
           animal_ids
       )
       return [dict(r) for r in results]
   ```

### Phase 3: Gradual Migration (1-2 weeks)

1. **Migrate endpoints by priority**

   - High traffic: `/api/swipe`, `/api/animals`, `/enhanced/detail-content`
   - Medium traffic: `/api/animals/{slug}`, `/api/breeds/*`
   - Low traffic: `/api/organizations`, `/api/monitoring`

2. **Update services to use async patterns**

   ```python
   class EnhancedAnimalServiceAsync:
       def __init__(self, conn: asyncpg.Connection):
           self._conn = conn

       async def get_detail_content(self, animal_ids: List[int]):
           return await self._conn.fetch(...)
   ```

3. **Add monitoring for async pool**
   - Track pool size usage
   - Monitor acquire wait times
   - Alert on queue depth

### Phase 4: Cleanup (1 day)

1. Remove psycopg2 pool after full migration
2. Update tests to use async fixtures
3. Remove `run_in_threadpool` wrappers
4. Update documentation

---

## Key Differences in Code

### Query Execution

```python
# psycopg2 (current)
cursor.execute("SELECT * FROM animals WHERE id = %s", (animal_id,))
result = cursor.fetchone()

# asyncpg (target)
result = await conn.fetchrow("SELECT * FROM animals WHERE id = $1", animal_id)
```

### Parameter Binding

| psycopg2            | asyncpg                 |
| ------------------- | ----------------------- |
| `%s` placeholders   | `$1, $2, $3` positional |
| Tuple params        | Individual args         |
| `cursor.fetchall()` | `await conn.fetch()`    |
| `cursor.fetchone()` | `await conn.fetchrow()` |

### Transaction Management

```python
# psycopg2
with get_pooled_cursor() as cursor:
    cursor.execute(...)
    # auto-commit on context exit

# asyncpg
async with pool.acquire() as conn:
    async with conn.transaction():
        await conn.execute(...)
```

---

## Risk Mitigation

### Testing Strategy

1. **Unit tests**: Mock asyncpg connections
2. **Integration tests**: Use test database with async fixtures
3. **Load tests**: Verify behavior under high concurrency
4. **Canary deployment**: Route 10% traffic to async endpoints first

### Rollback Plan

1. Keep psycopg2 pool available during migration
2. Feature flag to switch between sync/async dependencies
3. Monitor error rates; auto-rollback if >1% increase

### Compatibility Considerations

1. **RealDictCursor equivalent**: asyncpg returns `Record` objects (dict-like)
2. **JSONB handling**: asyncpg has native JSONB support
3. **Connection lifecycle**: No manual close needed with context managers

---

## Environment Variables

Add these for asyncpg pool configuration:

```bash
# Async pool settings (Phase 3)
ASYNC_DB_POOL_MIN_SIZE=5
ASYNC_DB_POOL_MAX_SIZE=50
ASYNC_DB_POOL_COMMAND_TIMEOUT=30
ASYNC_DB_POOL_MAX_QUERIES=50000
```

---

## Success Metrics

| Metric                  | Current (psycopg2) | Target (asyncpg) |
| ----------------------- | ------------------ | ---------------- |
| Pool exhaustion errors  | 37+/month          | 0                |
| P99 latency             | ~200ms             | <100ms           |
| Max concurrent requests | ~50                | ~500+            |
| Memory per connection   | ~8MB               | ~1MB             |

---

## Timeline Estimate

| Phase                            | Duration      | Effort |
| -------------------------------- | ------------- | ------ |
| Phase 1: Preparation             | 1-2 days      | Low    |
| Phase 2: Parallel Implementation | 2-3 days      | Medium |
| Phase 3: Gradual Migration       | 1-2 weeks     | High   |
| Phase 4: Cleanup                 | 1 day         | Low    |
| **Total**                        | **2-3 weeks** |        |

---

## References

- [asyncpg documentation](https://magicstack.github.io/asyncpg/current/)
- [FastAPI async database guide](https://fastapi.tiangolo.com/async/)
- [Sentry Issues: PYTHON-FASTAPI-4, 5, 6](https://sampo-cr.sentry.io/issues/)
