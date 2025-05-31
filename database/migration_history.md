# Database Migration History

## 2025-05-31: Cleanup and Standardization
- Consolidated on `animals` and `animal_images` tables
- Removed legacy `dogs` and `dog_images` references
- Removed `/api/dogs` legacy endpoint
- Updated schema.sql to reflect current structure
- All tests passing
- Current state: 32 dogs, 1 organization (Pets in Turkey)

## Original Migration
- Started with `dogs` table
- Migrated to `animals` table for future extensibility
- Migration scripts archived in `database/archive/`