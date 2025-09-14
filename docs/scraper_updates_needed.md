
# Scraper Logic Updates Required

After the adoption tracking migration, the following scraper logic needs updating:

## 1. Status Transition Logic
**Current behavior:**
- When consecutive_scrapes_missing >= 3: Set status='unavailable', availability_confidence='low'

**New behavior:**
- When consecutive_scrapes_missing >= 3: Set status='unknown', availability_confidence='low'
- Trigger adoption check if organization has check_adoption_status=true

## 2. Fields to Update

### When dog is found in scraping:
```python
consecutive_scrapes_missing = 0
availability_confidence = 'high'
# status remains unchanged (don't override adopted/reserved)
if status == 'unknown':
    status = 'available'
```

### When dog is missing from scraping:
```python
consecutive_scrapes_missing += 1
if consecutive_scrapes_missing >= threshold:
    status = 'unknown'  # Not 'unavailable'
    availability_confidence = 'low'
```

## 3. Files to Update
- services/database_service.py - Update status transition logic
- scrapers/base_scraper.py - If base logic exists
- management/config_commands.py - Update scraper command logic

## 4. Important Notes
- Never change status from 'adopted' or 'reserved' back to 'available'
- Keep availability_confidence separate from status
- Status tracks dog state, confidence tracks data quality
