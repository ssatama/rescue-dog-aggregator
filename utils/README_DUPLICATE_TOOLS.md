# Duplicate Management Tools

This directory contains utilities to manage duplicate animals in the rescue dog database.

## Scripts Available

### 1. `fix_pit_duplicates.py` - **RECOMMENDED**
**Purpose**: Fix PIT and REAN duplicate animals caused by external ID generation changes.

**Usage**:
```bash
source venv/bin/activate
python utils/fix_pit_duplicates.py
```

**What it does**:
- Analyzes duplicates for both PIT and REAN organizations
- Shows dry-run preview before making changes
- Removes old pattern entries (without hash)
- Keeps new pattern entries (with hash for stability)
- Handles 61 total duplicates found:
  - **PIT**: 34 old entries to remove
  - **REAN**: 27 old entries to remove

**Safety**: Very safe - shows exactly what will be deleted before proceeding.

### 2. `clear_animals.py` - **DESTRUCTIVE**
**Purpose**: Clear ALL animals from the database (for development/testing).

**Usage**:
```bash
source venv/bin/activate
python utils/clear_animals.py
```

**What it does**:
- Deletes ALL animals, images, and scrape logs
- Enhanced safety checks prevent production use
- Requires typing "DELETE ALL" + "yes" confirmation
- Verifies deletion completed successfully

**Safety**: Now much safer with production database protection and enhanced confirmations.

## The Duplicate Problem

### Root Cause
On 2025-06-24, external ID generation was improved for stability:
- **PIT**: `pit-{name}` → `pit-{name}-{hash}`
- **REAN**: `rean-{type}-{name}` → `rean-{type}-{name}-{hash}`

When scrapers ran with new IDs, they created new entries instead of updating existing ones.

### Current Status
- **Total animals affected**: 61 duplicates
- **PIT duplicates**: 34 old + 33 new = 67 (should be 33)
- **REAN duplicates**: 27 old + 12 new = 39 (should be 12)

### Example Duplicates
```
PIT:
  Cody: pit-cody (OLD) - 2025-06-03 22:11:08
  Cody: pit-cody-95bc94 (NEW) - 2025-06-24 23:24:32

REAN:
  Charlie: rean-romania-charlie (OLD) - 2025-06-08 11:35:04
  Charlie: rean-romania-charlie-d66fe6 (NEW) - 2025-06-24 23:26:42
```

## Recommended Action

1. **Run the duplicate fixer**:
   ```bash
   python utils/fix_pit_duplicates.py
   ```

2. **Review the dry-run output** - it will show exactly what will be deleted

3. **Confirm to proceed** - type "yes" when prompted

4. **Verify the fix** - the script will show final counts after cleanup

This will remove the old entries and keep the new stable hash-based IDs, resolving the duplicate issue while maintaining data integrity.