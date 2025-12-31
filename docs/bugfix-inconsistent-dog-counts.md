# Bugfix: Inconsistent Dog Counts Across Site

**Date:** 2025-12-31
**Status:** In Progress
**Priority:** Critical

## Problem Statement

The site shows wildly different dog counts across different pages:

- Homepage: 477 dogs
- Countries page: 4,646 dogs (UK 3,116, Germany 825, etc.)
- Breeds page: 2.2K mixed breeds
- Organizations page: Dogs Trust 2,159, Many Tears 851, etc.

**Expected:** ~1,500 dogs shown consistently everywhere (as confirmed by Railway scraper logs).

---

## Root Cause

**Simple Logic Required:**

- Dog misses 3 scrapes → `active = false`
- Site shows only `active = true` dogs EVERYWHERE
- Target: ~1,500 visible dogs

---

## Complete Bug List

### BUG 1 (CRITICAL): `mark_animal_as_seen()` Missing `active = true`

**File:** `services/session_manager.py`
**Lines:** 150-153 (connection pool path) and 176-183 (fallback path)

```python
# CURRENT (BROKEN):
UPDATE animals
SET last_seen_at = %s,
    consecutive_scrapes_missing = 0,
    availability_confidence = 'high'
WHERE id = %s
# MISSING: active = true
```

**Impact:** Dogs that reappear after being marked stale remain invisible forever because `active` is never restored to `true`.

---

### BUG 2 (CRITICAL): Off-by-One in Stale Detection

**File:** `services/session_manager.py`
**Lines:** 224-231 (connection pool path) and 275-282 (fallback path)

```python
# CURRENT (BROKEN):
SET consecutive_scrapes_missing = consecutive_scrapes_missing + 1,
    ...
    status = CASE
        WHEN consecutive_scrapes_missing >= 3 THEN 'unknown'
        ELSE status
    END,
    active = CASE
        WHEN consecutive_scrapes_missing >= 3 THEN false
        ELSE active
    END
```

**The Bug:** SQL evaluates the CASE expression BEFORE the SET increment happens:

- Miss 1: counter goes 0→1, CASE checks old value (0), `>= 3` is false
- Miss 2: counter goes 1→2, CASE checks old value (1), `>= 3` is false
- Miss 3: counter goes 2→3, CASE checks old value (2), `>= 3` is false
- Miss 4: counter goes 3→4, CASE checks old value (3), `>= 3` is TRUE → active = false

**Impact:** Dogs need 4 missed scrapes to become inactive, not 3 as intended.

**Fix:** Change `>= 3` to `>= 2` so dogs become inactive after 3 missed scrapes.

---

### BUG 3 (CRITICAL): `mark_skipped_animals_as_seen()` Missing `active = true`

**File:** `services/session_manager.py`
**Lines:** 431-434 (connection pool path) and 474-478 (fallback path)

```python
# CURRENT (BROKEN):
UPDATE animals
SET last_seen_at = %s,
    consecutive_scrapes_missing = 0,
    availability_confidence = 'high'
WHERE organization_id = %s
AND status = 'available'
AND external_id = ANY(%s)
# MISSING: active = true
```

**Impact:** When dogs are found but skipped (due to `skip_existing_animals=true`), they should be marked `active = true`. Currently this field is not updated, so previously-inactive dogs remain inactive even when found on the website.

---

### BUG 4 (HIGH): `create_animal()` Missing Explicit `active = true`

**File:** `services/database_service.py`
**Lines:** 259-314

The INSERT statement does NOT include the `active` column - it relies on the database DEFAULT TRUE.

**Risk:** If the database default changes or a migration fails, new dogs would be created with `active=false`, making them invisible immediately upon creation.

**Fix:** Add explicit `active = true` to the INSERT statement.

---

### BUG 5 (HIGH): LLM Routes Missing `active = true` Filter

**File:** `api/routes/llm.py`

Three endpoints don't filter on `active = true`:

| Endpoint        | Line    | Current Query                |
| --------------- | ------- | ---------------------------- |
| `/enrich`       | 72-78   | `WHERE a.id = $1`            |
| `/batch-enrich` | 169-176 | `WHERE a.id = ANY($1)`       |
| `/stats`        | 287-295 | `WHERE status = 'available'` |

**Impact:** LLM enrichment can run on inactive dogs, and stats include inactive dogs (inflating counts).

**Fix:** Add `AND a.active = true` to all three queries.

---

### BUG 6 (HIGH): `animal_service.py` Org Counts Missing `active = true`

**File:** `api/services/animal_service.py`

Multiple subqueries don't filter on `active = true`:

- `org_total_dogs` count subquery
- `org_recent_dogs` subquery
- Breed type counts
- Filter count base conditions

**Fix:** Add `AND a.active = true` to all relevant subqueries.

---

### BUG 7 (MEDIUM): Remove `availability_confidence` Filter Everywhere

**Decision:** Remove `availability_confidence IN ('high', 'medium')` from all endpoints. Just use `active = true` for simplicity.

**Files:**

- `api/routes/swipe.py` lines 210, 239, 391
- `api/services/animal_service.py` - any queries that have it

---

## Complete File List

### Files to Modify

| File                             | Changes                                                                                   |
| -------------------------------- | ----------------------------------------------------------------------------------------- |
| `services/session_manager.py`    | Add `active = true` to 2 methods (4 locations), change `>= 3` to `>= 2` (4 locations)     |
| `services/database_service.py`   | Add explicit `active = true` to INSERT                                                    |
| `api/routes/llm.py`              | Add `AND active = true` to 3 queries                                                      |
| `api/services/animal_service.py` | Add `AND a.active = true` to org count subqueries, remove availability_confidence filters |
| `api/routes/swipe.py`            | Remove `availability_confidence IN ('high', 'medium')` from 3 queries                     |

---

## Fix Implementation Plan

### Step 1: Fix `session_manager.py` (CRITICAL)

1. Add `active = true` to `mark_animal_as_seen()` UPDATE queries (2 locations)
2. Add `active = true` to `mark_skipped_animals_as_seen()` UPDATE queries (2 locations)
3. Change `>= 3` to `>= 2` in `update_stale_data_detection()` CASE statements (4 locations)

### Step 2: Fix `database_service.py` (HIGH)

Add explicit `active = true` to `create_animal()` INSERT statement.

### Step 3: Fix `api/routes/llm.py` (HIGH)

Add `AND a.active = true` to 3 queries.

### Step 4: Fix `api/services/animal_service.py` (HIGH)

Add `AND a.active = true` to org count subqueries.

### Step 5: Fix `api/routes/swipe.py` (MEDIUM)

Remove `availability_confidence IN ('high', 'medium')` from 3 queries.

### Step 6: Run Tests

Verify all tests pass.

### Step 7: SQL Migration (Railway Prod)

Run AFTER code deploy to fix current bad state:

```sql
-- 1. Mark all dogs not seen in most recent scrape as inactive
UPDATE animals
SET active = false, consecutive_scrapes_missing = 99
WHERE last_seen_at < (SELECT MAX(last_seen_at) FROM animals) - INTERVAL '6 hours'
  AND active = true;

-- 2. Reset consecutive_scrapes_missing for active dogs
UPDATE animals
SET consecutive_scrapes_missing = 0, active = true
WHERE last_seen_at >= (SELECT MAX(last_seen_at) FROM animals) - INTERVAL '6 hours';

-- 3. Verify counts
SELECT
  COUNT(*) FILTER (WHERE active = true) as active_dogs,
  COUNT(*) FILTER (WHERE active = false) as inactive_dogs
FROM animals;
-- Expected: active_dogs ~1500, inactive_dogs ~3100
```

---

## Verification Checklist

After fixes + migration:

- [ ] Homepage stats shows ~1500 dogs
- [ ] Countries page total shows ~1500 dogs
- [ ] Breeds page total shows ~1500 dogs
- [ ] Each organization's count matches reality
- [ ] Swipe stack returns ~1500 available dogs
- [ ] Next scraper run correctly marks inactive dogs after 3 misses
- [ ] Dogs that reappear are correctly restored to active

---

## Related Previous Commits

These commits attempted to fix the issue but didn't fully resolve it:

- `b3ddb46`: "fix(api): Add active=true filter to all API queries + stale dog detection"
- `0af759f`: "fix(critical): Add active=true restoration when dogs reappear"

The missing pieces were:

1. `mark_animal_as_seen()` not setting `active = true` (dogs reappearing stay invisible)
2. Off-by-one bug in stale detection (`>= 3` should be `>= 2`)
3. `mark_skipped_animals_as_seen()` not setting `active = true`
4. `create_animal()` not explicitly setting `active = true`
5. LLM routes missing `active = true` filter
6. `availability_confidence` filter still present in swipe endpoints
