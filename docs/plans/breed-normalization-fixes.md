# Breed Normalization Fixes Plan

**Created:** 2026-01-01
**Status:** Ready for Implementation
**Impact:** 275 dogs (18.2% of active dogs) with `breed_type='unknown'`

## Executive Summary

Code review of breed normalization identified critical gaps causing 18.2% of active dogs to have `breed_type='unknown'`. Root causes: missing breed aliases, regex gaps, entry point divergence, and no input sanitization.

## Current State

| Metric | Value |
|--------|-------|
| Total Active Dogs | 1,508 |
| `breed_type = unknown` | 275 (18.2%) |
| `breed_group = Unknown` | 258 (17.1%) |

### Organizations Most Affected

| Organization | Unknown % | Count |
|--------------|-----------|-------|
| Santer Paws Bulgarian Rescue | 100% | 89 |
| REAN | 100% | 22 |
| Woof Project | 36.8% | 7 |
| Many Tears | 19.9% | 28 |
| MISIs | 16.4% | 28 |
| Dogs Trust | 13.9% | 65 |

---

## Issues & Fixes

### CRITICAL-1: "Crossbreed" Not in Mixed Breed Regex

**File:** `utils/unified_standardization.py:341`
**Impact:** 34 dogs

**Current:**
```python
"mixed": re.compile(r"(mixed|mix|mongrel|mutt)", re.IGNORECASE),
```

**Fix:**
```python
"mixed": re.compile(r"(mixed|mix|mongrel|mutt|crossbreed)", re.IGNORECASE),
```

**Test:** Verify "Crossbreed" and "Cross" normalize to "Mixed Breed" with `breed_type='mixed'`

---

### CRITICAL-2: Entry Point Divergence

**File:** `utils/standardization.py:215-217`
**Impact:** All breeds - inconsistent standardization

**Current:**
```python
def standardize_breed(breed_text: str) -> Tuple[str, str, Optional[str]]:
    from utils.enhanced_breed_standardization import enhanced_standardizer
    return enhanced_standardizer.standardize_breed_enhanced(breed_text)
```

**Fix:**
```python
def standardize_breed(breed_text: str) -> Tuple[str, str, Optional[str]]:
    from utils.unified_standardization import UnifiedStandardizer
    _unified = UnifiedStandardizer()
    result = _unified._standardize_breed(breed_text)
    return (result["name"], result["group"], result.get("size"))
```

**Note:** Consider caching the `UnifiedStandardizer` instance at module level for performance.

---

### CRITICAL-3: No Input Sanitization

**File:** `utils/unified_standardization.py:618` (start of `_standardize_breed`)
**Impact:** 11 dogs with "Can Be the Only Dog" as breed

**Fix:** Add blocklist check after null checks:
```python
def _standardize_breed(self, breed: Optional[str]) -> Dict[str, Any]:
    if not breed:
        return {"name": "Unknown", "group": "Unknown", ...}

    if not isinstance(breed, str):
        return {"name": "Unknown", "group": "Unknown", ...}

    breed_lower = breed.strip().lower()

    # NEW: Blocklist for known non-breed strings
    blocklist = [
        "can be the only dog",
        "unknown",
        "n/a",
        "breed tbc",
        "not specified",
        "tbc",
        "pending",
    ]
    if breed_lower in blocklist or len(breed_lower) > 60:
        return {
            "name": "Unknown",
            "group": "Unknown",
            "size": None,
            "confidence": 0.0,
            "breed_type": "unknown",
            "is_mixed": False,
        }

    # ... rest of method
```

---

### HIGH-1: Missing Breed Aliases

**File:** `utils/unified_standardization.py:69` (`_initialize_breed_data`)
**Impact:** 25+ dogs

**Add these entries to `breed_data`:**
```python
# Working Group additions
"akita": BreedInfo("Akita", "Working", "Large"),
"american akita": BreedInfo("American Akita", "Working", "Large"),
"american bulldog": BreedInfo("American Bulldog", "Working", "Large"),

# Herding Group additions
"dutch shepherd": BreedInfo("Dutch Shepherd", "Herding", "Large"),
"shepherd": BreedInfo("Shepherd", "Herding", "Large"),

# Hound Group additions
"saluki": BreedInfo("Saluki", "Hound", "Large"),

# Sporting Group additions
"labrador": BreedInfo("Labrador Retriever", "Sporting", "Large"),
"springer spaniel": BreedInfo("English Springer Spaniel", "Sporting", "Medium"),
"weimaraner": BreedInfo("Weimaraner", "Sporting", "Large"),

# Working Group additions (spelling variants)
"husky": BreedInfo("Siberian Husky", "Working", "Medium"),
"dobermann": BreedInfo("Doberman Pinscher", "Working", "Large"),

# Non-Sporting additions
"lhasa apso": BreedInfo("Lhasa Apso", "Non-Sporting", "Small"),

# Toy Group additions
"maltese terrier": BreedInfo("Maltese", "Toy", "Tiny"),
```

---

### HIGH-2: Hardcoded Contains-Search List

**File:** `utils/unified_standardization.py:737`
**Impact:** Breeds not in list won't be detected in mix strings

**Current:** Hardcoded list of breed keywords
**Fix:** Replace with dynamic lookup from `breed_data.keys()`:

```python
# Replace hardcoded list at line 737 with:
breed_keywords = [k for k in self.breed_data.keys() if len(k) > 3]
if is_mixed and any(keyword in breed_lower for keyword in breed_keywords):
    # Find which breed matched
    for keyword in breed_keywords:
        if keyword in breed_lower:
            breed_info = self.breed_data[keyword]
            breed_name = self._capitalize_breed_name(breed.strip())
            return {
                "name": breed_name,
                "group": "Mixed",
                "size": breed_info.size_estimate,
                "confidence": 0.7,
                "breed_type": "crossbreed",
                "is_mixed": True,
            }
```

---

### MEDIUM-1: Duplicate Words in Breed Names

**File:** `utils/unified_standardization.py:820` (`_capitalize_breed_name`)
**Impact:** 4 dogs with "Andaluz Andaluz" duplication

**Fix:** Add deduplication logic:
```python
def _capitalize_breed_name(self, breed: str) -> str:
    if not breed:
        return breed

    lowercase_words = {"of", "de", "and", "or", "the"}
    uppercase_words = {"ii", "iii", "iv"}

    words = breed.split()
    result = []

    for i, word in enumerate(words):
        word_lower = word.lower()

        # Skip duplicate adjacent words
        if i > 0 and word_lower == words[i-1].lower():
            continue

        if word_lower in uppercase_words:
            result.append(word.upper())
        elif i == 0 or word_lower not in lowercase_words:
            result.append(word.capitalize())
        else:
            result.append(word_lower)

    return " ".join(result)
```

---

### MEDIUM-2: Consolidate Standardization Systems

**Files:**
- `utils/standardization.py` (wrapper)
- `utils/enhanced_breed_standardization.py` (legacy)
- `utils/unified_standardization.py` (primary)

**Action:**
1. Port any unique mappings from `enhanced_breed_standardization.py` to `UnifiedStandardizer`
2. Update `standardization.py` to use `UnifiedStandardizer`
3. Mark `enhanced_breed_standardization.py` as deprecated
4. Update all scrapers to use consistent entry point

---

## Implementation Order

1. [ ] **CRITICAL-1:** Fix crossbreed regex (5 min)
2. [ ] **HIGH-1:** Add missing breed aliases (15 min)
3. [ ] **CRITICAL-3:** Add input sanitization blocklist (10 min)
4. [ ] **MEDIUM-1:** Fix duplicate word handling (5 min)
5. [ ] **HIGH-2:** Replace hardcoded keyword list (10 min)
6. [ ] **CRITICAL-2:** Consolidate entry points (15 min)
7. [ ] **MEDIUM-2:** Port legacy mappings (20 min)
8. [ ] Run tests and verify no regressions
9. [ ] Create backfill script to fix existing data
10. [ ] Run backfill on production

---

## Backfill Script

After fixes are deployed, run backfill to re-normalize existing dogs:

```python
# management/backfill_breed_normalization.py
from utils.unified_standardization import UnifiedStandardizer

async def backfill_breed_normalization():
    standardizer = UnifiedStandardizer()

    # Get all active dogs with breed_type='unknown'
    dogs = await db.execute("""
        SELECT id, breed FROM animals
        WHERE active = true AND breed_type = 'unknown'
    """)

    for dog in dogs:
        result = standardizer._standardize_breed(dog.breed)
        await db.execute("""
            UPDATE animals SET
                primary_breed = :primary_breed,
                secondary_breed = :secondary_breed,
                standardized_breed = :standardized_breed,
                breed_type = :breed_type,
                breed_group = :breed_group,
                breed_confidence = :breed_confidence,
                breed_slug = :breed_slug
            WHERE id = :id
        """, {
            "id": dog.id,
            "primary_breed": result.get("primary_breed", result["name"]),
            "secondary_breed": result.get("secondary_breed"),
            "standardized_breed": result["name"],
            "breed_type": result["breed_type"],
            "breed_group": result["group"],
            "breed_confidence": result["confidence"],
            "breed_slug": generate_breed_slug(result.get("primary_breed", result["name"])),
        })
```

---

## Verification Queries

After implementation, run these queries to verify fixes:

```sql
-- Check improvement in unknown breeds
SELECT
  breed_type,
  COUNT(*) as count,
  ROUND(COUNT(*)::numeric / (SELECT COUNT(*) FROM animals WHERE active = true)::numeric * 100, 2) as pct
FROM animals
WHERE active = true
GROUP BY breed_type
ORDER BY count DESC;

-- Verify specific fixes worked
SELECT breed, breed_type, breed_group, COUNT(*)
FROM animals
WHERE active = true
  AND breed IN ('Crossbreed', 'Cross', 'Labrador', 'Husky', 'Akita', 'Can Be the Only Dog')
GROUP BY breed, breed_type, breed_group;

-- Check no regressions in previously-working breeds
SELECT breed_type, COUNT(*)
FROM animals
WHERE active = true
  AND breed_type = 'purebred'
GROUP BY breed_type;
```

---

## Test Cases to Add

```python
# tests/utils/test_unified_standardization_fixes.py

def test_crossbreed_normalizes_to_mixed():
    result = standardizer._standardize_breed("Crossbreed")
    assert result["name"] == "Mixed Breed"
    assert result["breed_type"] == "mixed"

def test_cross_normalizes_to_mixed():
    result = standardizer._standardize_breed("Cross")
    assert result["name"] == "Mixed Breed"
    assert result["breed_type"] == "mixed"

def test_behavioral_text_rejected():
    result = standardizer._standardize_breed("Can Be the Only Dog")
    assert result["name"] == "Unknown"
    assert result["breed_type"] == "unknown"

def test_labrador_alias_works():
    result = standardizer._standardize_breed("Labrador")
    assert result["name"] == "Labrador Retriever"
    assert result["breed_type"] == "purebred"

def test_husky_alias_works():
    result = standardizer._standardize_breed("Husky")
    assert result["name"] == "Siberian Husky"
    assert result["breed_type"] == "purebred"

def test_duplicate_words_removed():
    result = standardizer._capitalize_breed_name("Bodeguero Andaluz Andaluz")
    assert result == "Bodeguero Andaluz"

def test_saluki_in_mix_detected():
    result = standardizer._standardize_breed("Saluki Cross")
    assert "Saluki" in result["name"]
    assert result["breed_type"] == "crossbreed"
```

---

## Files Modified

1. `utils/unified_standardization.py` - Main fixes
2. `utils/standardization.py` - Entry point consolidation
3. `tests/utils/test_unified_standardization_fixes.py` - New test file
4. `management/backfill_breed_normalization.py` - New backfill script

## Success Criteria

- [ ] `breed_type='unknown'` drops from 18.2% to <5%
- [ ] All test cases pass
- [ ] No regressions in existing breed classifications
- [ ] Backfill completes without errors
