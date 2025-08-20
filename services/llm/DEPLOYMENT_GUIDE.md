# LLM Dog Profiling Service - Deployment Guide

## Overview

The LLM Dog Profiling Service generates engaging English descriptions for rescue dogs from German source data using AI. This service is production-ready with comprehensive monitoring, error handling, and cost optimization.

## Key Features

- **Automated Translation**: German → English with context preservation
- **Smart Truncation**: Respects sentence boundaries (no mid-sentence cuts)
- **Cost Optimized**: ~$0.0015 per dog using Gemini 2.5 Flash
- **Quality Monitoring**: Built-in rubrics and validation
- **Batch Processing**: Efficient concurrent processing
- **Error Recovery**: Automatic retries with exponential backoff
- **Production Ready**: Database integration, monitoring, logging

## Prerequisites

### Required Software
- Python 3.10+
- PostgreSQL 12+
- Virtual environment (venv)

### Required API Keys
```bash
# Add to .env file
OPENROUTER_API_KEY=your-api-key-here
```

### Database Setup
```sql
-- Ensure dog_profiler_data column exists
ALTER TABLE animals 
ADD COLUMN IF NOT EXISTS dog_profiler_data JSONB;
```

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/your-org/rescue-dog-aggregator.git
cd rescue-dog-aggregator
```

### 2. Setup Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your OPENROUTER_API_KEY
```

### 5. Verify Database Connection
```bash
PYTHONPATH=. python -c "
import psycopg2
import os
conn = psycopg2.connect(
    host='localhost',
    database='rescue_dogs',
    user=os.environ.get('USER'),
    password=''
)
print('✅ Database connection successful')
conn.close()
"
```

## Configuration

### Organization Configuration

Edit `configs/llm_organizations.yaml`:

```yaml
organizations:
  - id: 11
    name: "Tierschutzverein Europa"
    enabled: true  # Enable for processing
    batch_size: 10
    max_daily_limit: 100
    
  - id: 25
    name: "Dogs Trust"
    enabled: false  # Disable to skip
    batch_size: 20
    max_daily_limit: 200
```

### API Configuration

The service uses OpenRouter with Gemini 2.5 Flash by default. To change models:

```python
# services/llm/config.py
API_CONFIG = {
    "default_model": "google/gemini-2.0-flash-exp:free",  # Cost-optimized
    "fallback_model": "google/gemini-2.0-flash-thinking-exp:free",
    "max_retries": 3,
    "timeout": 30
}
```

## Usage

### Basic Commands

#### 1. Test Single Dog
```bash
PYTHONPATH=. python services/llm/dog_profiler.py --dog-id 4427 --dry-run
```

#### 2. Process Small Batch (Recommended for Testing)
```bash
PYTHONPATH=. python services/llm/dog_profiler_batch.py \
  --org-id 11 \
  --limit 10 \
  --chunk-size 5 \
  --dry-run
```

#### 3. Production Batch Processing
```bash
PYTHONPATH=. python services/llm/dog_profiler_batch.py \
  --org-id 11 \
  --limit 100 \
  --chunk-size 10
```

#### 4. Process All Unprocessed Dogs
```bash
PYTHONPATH=. python services/llm/dog_profiler_batch.py --org-id 11
```

### Advanced Usage

#### Custom Organization Processing
```bash
# Process specific organization with custom settings
PYTHONPATH=. python services/llm/dog_profiler_batch.py \
  --org-id 25 \
  --limit 50 \
  --chunk-size 15
```

#### Dry Run Mode (No Database Writes)
```bash
PYTHONPATH=. python services/llm/dog_profiler_batch.py \
  --org-id 11 \
  --limit 10 \
  --dry-run
```

#### Monitor Processing Progress
```bash
# View real-time logs
tail -f logs/llm_profiler.log

# Check batch results
ls -la services/llm/batch_results/
```

## Data Quality Validation

### 1. Check Profile Completeness
```sql
-- Verify all required fields are present
SELECT 
  id,
  name,
  CASE 
    WHEN dog_profiler_data->>'description' IS NULL THEN 'MISSING: description'
    WHEN dog_profiler_data->>'tagline' IS NULL THEN 'MISSING: tagline'
    WHEN dog_profiler_data->>'energy_level' IS NULL THEN 'MISSING: energy_level'
    WHEN jsonb_array_length(dog_profiler_data->'personality_traits') < 3 THEN 'ISSUE: < 3 traits'
    ELSE 'COMPLETE'
  END as status
FROM animals
WHERE organization_id = 11 
  AND dog_profiler_data IS NOT NULL
LIMIT 10;
```

### 2. Check Description Quality
```sql
-- Ensure descriptions are not truncated mid-sentence
SELECT 
  id,
  name,
  RIGHT(dog_profiler_data->>'description', 50) as description_ending,
  length(dog_profiler_data->>'description') as length
FROM animals
WHERE organization_id = 11 
  AND dog_profiler_data IS NOT NULL
ORDER BY id DESC
LIMIT 10;
```

### 3. Validate Against Source Data
```sql
-- Compare LLM output with German source
WITH validation AS (
  SELECT 
    id,
    name,
    properties->>'Kastriert' as source_neutered,
    dog_profiler_data->>'neutered' as llm_neutered,
    properties->>'Katzentest' as source_cats,
    dog_profiler_data->>'good_with_cats' as llm_cats
  FROM animals
  WHERE organization_id = 11 
    AND dog_profiler_data IS NOT NULL
)
SELECT * FROM validation
WHERE 
  (source_neutered = 'ja' AND llm_neutered != 'true') OR
  (source_cats = 'verträglich' AND llm_cats != 'yes');
```

### 4. Quality Metrics Summary
```sql
-- Overall quality metrics
WITH metrics AS (
  SELECT 
    COUNT(*) as total,
    COUNT(dog_profiler_data) as profiled,
    AVG(length(dog_profiler_data->>'description')) as avg_desc_length,
    COUNT(CASE WHEN dog_profiler_data->>'description' LIKE '%...' THEN 1 END) as truncated,
    COUNT(CASE WHEN jsonb_array_length(dog_profiler_data->'personality_traits') >= 3 THEN 1 END) as good_traits
  FROM animals
  WHERE organization_id = 11
)
SELECT 
  total as "Total Dogs",
  profiled as "Profiled",
  ROUND(100.0 * profiled / total, 1) || '%' as "Coverage",
  ROUND(avg_desc_length) as "Avg Description Length",
  truncated as "Truncated Descriptions",
  ROUND(100.0 * good_traits / profiled, 1) || '%' as "Quality Traits"
FROM metrics;
```

## Monitoring & Troubleshooting

### Common Issues

#### 1. API Rate Limiting
**Symptom**: "Rate limit exceeded" errors
**Solution**: 
```bash
# Reduce chunk size and add delays
PYTHONPATH=. python services/llm/dog_profiler_batch.py \
  --chunk-size 5 \
  --delay 2
```

#### 2. Description Validation Errors
**Symptom**: "String should have at least 150 characters"
**Solution**: This occurs when source data is minimal. The system handles this gracefully and logs warnings.

#### 3. Database Connection Issues
**Symptom**: "could not connect to server"
**Solution**:
```bash
# Check PostgreSQL is running
pg_ctl status
# or
sudo systemctl status postgresql

# Verify connection
psql -d rescue_dogs -c "SELECT 1"
```

#### 4. Memory Issues with Large Batches
**Symptom**: Process killed or MemoryError
**Solution**:
```bash
# Process in smaller chunks
PYTHONPATH=. python services/llm/dog_profiler_batch.py \
  --limit 50 \
  --chunk-size 5
```

### Clear Corrupted Data

If you need to clear and reprocess data:

```sql
-- Clear specific dogs
UPDATE animals 
SET dog_profiler_data = NULL 
WHERE id IN (4427, 4426, 4425);

-- Clear all truncated descriptions
UPDATE animals 
SET dog_profiler_data = NULL 
WHERE dog_profiler_data->>'description' LIKE '%...';

-- Clear entire organization
UPDATE animals 
SET dog_profiler_data = NULL 
WHERE organization_id = 11;
```

## Production Deployment

### 1. Environment Setup
```bash
# Production environment variables
export ENVIRONMENT=production
export OPENROUTER_API_KEY=your-production-key
export DATABASE_URL=postgresql://user:pass@host:5432/rescue_dogs
export LOG_LEVEL=INFO
```

### 2. Systemd Service (Linux)
Create `/etc/systemd/system/dog-profiler.service`:

```ini
[Unit]
Description=Dog Profiler Batch Service
After=network.target postgresql.service

[Service]
Type=oneshot
User=appuser
WorkingDirectory=/opt/rescue-dog-aggregator
Environment="PYTHONPATH=/opt/rescue-dog-aggregator"
ExecStart=/opt/rescue-dog-aggregator/venv/bin/python services/llm/dog_profiler_batch.py --org-id 11

[Install]
WantedBy=multi-user.target
```

### 3. Cron Schedule
Add to crontab for daily processing:

```bash
# Run daily at 2 AM
0 2 * * * cd /opt/rescue-dog-aggregator && PYTHONPATH=. venv/bin/python services/llm/dog_profiler_batch.py --org-id 11 >> logs/profiler.log 2>&1
```

### 4. Docker Deployment
```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
ENV PYTHONPATH=/app

CMD ["python", "services/llm/dog_profiler_batch.py", "--org-id", "11"]
```

## Cost Management

### Estimate Costs
```bash
PYTHONPATH=. python services/llm/cost_estimator.py --org-id 11
```

### Cost Breakdown
- **Gemini 2.5 Flash**: ~$0.0015 per dog
- **Average tokens per dog**: ~2000 input, 500 output
- **Monthly estimate (1000 dogs)**: ~$1.50

### Cost Optimization Tips
1. Use batch processing (reduces API overhead)
2. Enable caching for repeated content
3. Use `dry-run` mode for testing
4. Monitor token usage in batch results

## API Integration

### Using the Service Class
```python
from services.llm.dog_profiler_service import DogProfilerService

# Initialize service
service = DogProfilerService(organization_id=11)

# Profile single dog
profile = await service.profile_dog(dog_id=4427)

# Profile batch
results = await service.profile_batch(dog_ids=[4427, 4426, 4425])
```

### Scraper Integration
```python
from services.llm.scraper_integration import LLMScraperIntegration

# Add to your scraper
class YourScraper(BaseScraper):
    def __init__(self):
        super().__init__()
        self.llm_integration = LLMScraperIntegration(self.organization_id)
    
    async def post_process(self, animals):
        # Generate profiles for new animals
        profiles = await self.llm_integration.process_animals(animals)
        return profiles
```

## Performance Metrics

### Expected Performance
- **Processing Speed**: ~2-3 seconds per dog
- **Batch Efficiency**: 10 dogs in ~15 seconds
- **Success Rate**: >95% (with retries)
- **Quality Score**: >0.85 average

### Monitor Performance
```bash
# Check latest batch results
cat services/llm/batch_results/batch_11_*.json | jq '.stats'

# Database metrics
PYTHONPATH=. python monitoring/data_quality_monitor.py --mode=detailed --org-id=11
```

## Maintenance

### Regular Tasks

#### Weekly
- Review error logs for patterns
- Check API usage and costs
- Validate data quality metrics

#### Monthly
- Clear old batch result files
- Update model configurations if needed
- Review and optimize prompts

### Backup Profile Data
```bash
# Export profiles
pg_dump -t animals -a rescue_dogs > profiles_backup.sql

# Export as JSON
PYTHONPATH=. python -c "
import psycopg2
import json
conn = psycopg2.connect(database='rescue_dogs')
cur = conn.cursor()
cur.execute('SELECT id, name, dog_profiler_data FROM animals WHERE dog_profiler_data IS NOT NULL')
with open('profiles_export.json', 'w') as f:
    json.dump([{'id': r[0], 'name': r[1], 'profile': r[2]} for r in cur.fetchall()], f, indent=2)
"
```

## Support & Debugging

### Enable Debug Logging
```bash
export LOG_LEVEL=DEBUG
PYTHONPATH=. python services/llm/dog_profiler_batch.py --org-id 11 --limit 1
```

### Check System Health
```bash
# Test all components
PYTHONPATH=. python services/llm/monitoring.py --health-check
```

### Common SQL Queries
```sql
-- Find dogs needing profiles
SELECT COUNT(*) FROM animals 
WHERE organization_id = 11 AND dog_profiler_data IS NULL;

-- Recent profiles
SELECT id, name, created_at, updated_at 
FROM animals 
WHERE dog_profiler_data IS NOT NULL 
ORDER BY updated_at DESC LIMIT 10;

-- Failed validations
SELECT id, name, properties->>'Beschreibung' as source_desc
FROM animals 
WHERE organization_id = 11 
  AND dog_profiler_data IS NULL
  AND properties IS NOT NULL;
```

## Changelog

### v1.1.0 (2025-08-20)
- ✅ Added smart truncation to preserve sentence boundaries
- ✅ Fixed mid-sentence description cuts
- ✅ Improved quality validation
- ✅ Enhanced error messages

### v1.0.0 (2025-08-19)
- Initial production release
- Batch processing support
- Quality monitoring
- Cost optimization

## Contact

For issues or questions:
- GitHub Issues: [repo-url]/issues
- Documentation: `docs/features/llm_dog_profiling_documentation.md`
- API Reference: `services/llm/schemas/`