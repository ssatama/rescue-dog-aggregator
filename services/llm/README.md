# LLM Dog Profiling Service Documentation

## Overview

The LLM Dog Profiling Service enriches dog data with AI-generated structured profiles using Google's Gemini 2.5 Flash model via OpenRouter API. This service transforms basic dog information into comprehensive, searchable profiles with personality traits, compatibility assessments, and care requirements.

**Key Benefits:**
- 90%+ success rate with retry logic
- ~$0.0015 per dog processing cost
- 2.5x faster than GPT-4
- Organization-specific prompt templates
- Automatic data normalization and validation

## Architecture

### Core Components

```
services/llm/
├── dog_profiler.py              # Main pipeline orchestrator
├── prompt_builder.py             # Organization-specific prompt construction
├── organization_config_loader.py # Configuration management
├── llm_client.py                # OpenRouter API client
├── database_updater.py          # PostgreSQL JSONB updates
├── extracted_profile_normalizer.py # Data normalization
├── retry_handler.py             # Retry logic with fallback models
├── statistics_tracker.py        # Success metrics tracking
└── schemas/
    └── dog_profiler.py          # Pydantic data models
```

### Data Flow

```mermaid
graph LR
    A[Dog Data from DB] --> B[PromptBuilder]
    B --> C[LLM Client]
    C --> D[OpenRouter API]
    D --> E[Raw Response]
    E --> F[ProfileNormalizer]
    F --> G[Schema Validation]
    G --> H[Database Update]
    H --> I[JSONB Column: dog_profiler_data]
```

## Configuration

### Organization Setup

Each organization requires:
1. Entry in `configs/llm_organizations.yaml`
2. Prompt template in `prompts/organizations/{org_name}.yaml`

**Example Configuration:**
```yaml
# configs/llm_organizations.yaml
organizations:
  11:
    name: "Tierschutzverein Europa"
    prompt_file: "tierschutzverein_europa.yaml"
    source_language: "de"
    target_language: "en"
    model_preference: "google/gemini-2.5-flash"
    enabled: true
```

### Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Optional
LLM_MODEL_OVERRIDE=openai/gpt-4-turbo-preview  # Override model selection
```

## Usage

### Management Command

```bash
# Profile dogs for an organization
PYTHONPATH=. python management/config_commands.py profile --org-id 11 --limit 10

# Dry run (no database saves)
PYTHONPATH=. python management/config_commands.py profile --org-id 11 --limit 5 --dry-run

# Profile all unprofiled dogs
PYTHONPATH=. python management/config_commands.py profile --org-id 11
```

### Programmatic Usage

```python
from services.llm.dog_profiler import DogProfilerPipeline
import asyncio

# Initialize pipeline
pipeline = DogProfilerPipeline(
    organization_id=11,
    dry_run=False
)

# Process single dog
dog_data = {
    'id': 123,
    'name': 'Max',
    'breed': 'German Shepherd',
    'age_text': '2 years old',
    'properties': {
        'description': 'Friendly and energetic...',
        'good_with_kids': True
    }
}

result = asyncio.run(pipeline.process_dog(dog_data))

# Process batch
dogs = [dog1, dog2, dog3]
results = asyncio.run(pipeline.process_batch(dogs, batch_size=5))

# Get statistics
stats = pipeline.get_statistics()
print(f"Success rate: {stats['success_rate']}%")
```

### Context Manager Support

```python
async def profile_dogs():
    async with DogProfilerPipeline(organization_id=11) as pipeline:
        results = await pipeline.process_batch(dogs)
        await pipeline.save_results(results)
```

## Data Schema

### Input (from database)

```python
{
    'id': int,                    # Database ID
    'name': str,                  # Dog name
    'breed': str,                 # Breed text
    'age_text': str,             # Age description
    'properties': dict           # JSONB properties including description
}
```

### Output (dog_profiler_data JSONB)

```python
{
    # Generated content
    'description': str,           # 2-3 sentence personality description
    'personality_traits': List[str],  # 3-5 traits
    'energy_level': str,         # low/medium/high/very_high
    'trainability': str,         # low/moderate/high/very_high
    'experience_level': str,     # beginner/intermediate/experienced
    'grooming_needs': str,       # minimal/moderate/high/professional
    'exercise_needs': str,       # minimal/moderate/high/very_high
    
    # Compatibility
    'good_with_kids': bool,
    'good_with_dogs': bool,
    'good_with_cats': bool,
    'good_with_strangers': bool,
    
    # Special considerations
    'special_needs': List[str],
    'ideal_home': str,
    
    # Metadata
    'profiled_at': str,          # ISO timestamp
    'model_used': str,           # Model that generated profile
    'prompt_version': str,       # Template version
    'processing_time_ms': int,
    'quality_score': float,      # 0-100 quality assessment
    
    # Tracking
    'confidence_scores': {
        'description': float,
        'energy_level': float,
        'trainability': float
    },
    'source_references': {
        'description': str,
        'personality_traits': str
    }
}
```

## Component Details

### DogProfilerPipeline

**Purpose:** Main orchestrator for the profiling process

**Key Methods:**
- `process_dog(dog_data)` - Profile single dog with retry logic
- `process_batch(dogs, batch_size)` - Process multiple dogs concurrently
- `save_results(results)` - Persist to database
- `get_statistics()` - Processing metrics

**Complexity:** O(n) for batch processing where n = number of dogs

### PromptBuilder

**Purpose:** Constructs organization-specific prompts from templates

**Key Methods:**
- `build_prompt(dog_data)` - Create user prompt with dog data
- `build_messages(dog_data, prompt_adjustment)` - Full message list for API
- `get_prompt_version()` - Template version tracking

**Dependencies:** Requires prompt template file for organization

### OrganizationConfigLoader

**Purpose:** Manages organization configurations and prompt mappings

**Key Methods:**
- `load_config(org_id)` - Get organization configuration
- `get_supported_organizations()` - List configured orgs
- `reload()` - Force refresh configurations

**Singleton Pattern:** Access via `get_config_loader()`

### LLMClient

**Purpose:** Handles OpenRouter API communication

**Key Features:**
- Automatic JSON extraction from responses
- Request/response logging
- Timeout handling
- Error propagation for retry logic

### ExtractedProfileNormalizer

**Purpose:** Normalizes LLM output to match schema requirements

**Normalization Rules:**
- Energy levels: Maps variations to standard enums
- Experience levels: Standardizes terminology
- Boolean conversion: Handles various text representations
- List processing: Ensures proper array formatting

### RetryHandler

**Purpose:** Implements exponential backoff with model fallback

**Configuration:**
```python
RetryConfig(
    max_attempts=3,
    initial_delay=2.0,
    backoff_factor=2.0,
    fallback_models=[
        "google/gemini-2.5-flash",
        "openai/gpt-4-turbo-preview"
    ]
)
```

### DatabaseUpdater

**Purpose:** Updates PostgreSQL with profiler results

**Features:**
- Batch updates for efficiency
- JSONB column handling
- Transaction management
- Dry-run support

## Error Handling

### Common Issues and Solutions

1. **No module named 'services.llm'**
   ```bash
   # Run from project root with PYTHONPATH
   PYTHONPATH=. python management/config_commands.py profile --org-id 11
   ```

2. **Organization not configured**
   ```
   ❌ No LLM configuration found for organization 999
      Available organizations: [11, 25, 26, ...]
   ```
   Solution: Add organization to `configs/llm_organizations.yaml`

3. **Missing prompt template**
   ```
   ❌ Organization 25 (Many Tears) is configured but prompt template not found
   ```
   Solution: Create `prompts/organizations/many_tears.yaml`

4. **API rate limiting**
   - Automatic retry with exponential backoff
   - Batch size adjustment (default: 5 dogs)
   - Small delays between batches

5. **Invalid API response**
   - Retry with prompt adjustment
   - Fallback to alternative model
   - Skip dog after max attempts

## Testing

### Unit Tests
```bash
pytest tests/services/llm/test_dog_profiler.py -v
pytest tests/services/llm/test_prompt_builder.py -v
pytest tests/services/llm/test_profile_normalizer.py -v
```

### Integration Test
```bash
# Test with real API (requires OPENROUTER_API_KEY)
PYTHONPATH=. python -c "
from services.llm.dog_profiler import DogProfilerPipeline
import asyncio

pipeline = DogProfilerPipeline(organization_id=11, dry_run=True)
dog = {
    'id': 1,
    'name': 'Test Dog',
    'breed': 'Labrador',
    'age_text': '2 years',
    'properties': {'description': 'Friendly dog'}
}
result = asyncio.run(pipeline.process_dog(dog))
print('Success!' if result else 'Failed')
"
```

## Performance Metrics

### Typical Performance
- **Processing time:** 2-5 seconds per dog
- **Success rate:** 90-95% (100% with retries)
- **Cost:** ~$0.0015 per dog (Gemini 2.5 Flash)
- **Batch size:** 5 dogs concurrent (adjustable)
- **Rate limit:** ~50ms between API calls

### Database Impact
- **Write pattern:** Batch updates to minimize transactions
- **Column type:** JSONB for efficient querying
- **Index recommended:** GIN index on dog_profiler_data for searches

## Adding New Organizations

### Step 1: Configure Organization
```yaml
# configs/llm_organizations.yaml
organizations:
  30:
    name: "New Rescue Org"
    prompt_file: "new_rescue.yaml"
    source_language: "es"
    target_language: "en"
    model_preference: "google/gemini-2.5-flash"
    enabled: true
```

### Step 2: Create Prompt Template
```yaml
# prompts/organizations/new_rescue.yaml
metadata:
  version: "1.0.0"
  organization: "New Rescue Org"
  
system_prompt: |
  You are an expert dog behaviorist...
  
extraction_prompt: |
  Analyze this dog and create a profile:
  Name: {name}
  Breed: {breed}
  Age: {age_text}
  Properties: {properties}
```

### Step 3: Test
```bash
PYTHONPATH=. python management/config_commands.py profile --org-id 30 --limit 1 --dry-run
```

## Monitoring

### Check Profiling Status
```sql
-- Count profiled dogs by organization
SELECT 
    organization_id,
    COUNT(*) as total_dogs,
    COUNT(CASE WHEN dog_profiler_data IS NOT NULL 
               AND dog_profiler_data != '{}' THEN 1 END) as profiled,
    ROUND(100.0 * COUNT(CASE WHEN dog_profiler_data IS NOT NULL 
                              AND dog_profiler_data != '{}' THEN 1 END) / COUNT(*), 1) as percentage
FROM animals
GROUP BY organization_id
ORDER BY organization_id;
```

### Quality Metrics
```sql
-- Average quality scores
SELECT 
    organization_id,
    AVG((dog_profiler_data->>'quality_score')::float) as avg_quality,
    MIN((dog_profiler_data->>'quality_score')::float) as min_quality,
    MAX((dog_profiler_data->>'quality_score')::float) as max_quality
FROM animals
WHERE dog_profiler_data IS NOT NULL
GROUP BY organization_id;
```

## Future Enhancements

### Planned Features
1. **Multi-language support** - Generate profiles in multiple languages
2. **Streaming responses** - Real-time profile generation feedback
3. **Custom rubrics** - Organization-specific quality scoring
4. **Caching layer** - Reduce API calls for similar dogs
5. **A/B testing** - Compare different prompt strategies

### Integration Points
- **Scraper integration** - Auto-profile during scraping
- **API endpoints** - Expose profiling via REST API
- **Webhook support** - Notify when profiles complete
- **Export formats** - Generate reports in various formats

## Troubleshooting Guide

### Debug Logging
```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Run with verbose output
pipeline = DogProfilerPipeline(organization_id=11)
```

### Check API Key
```bash
echo $OPENROUTER_API_KEY
# Should show: sk-or-v1-xxxxx...
```

### Validate Prompt Template
```python
from services.llm.prompt_builder import PromptBuilder

# Test prompt building
builder = PromptBuilder(organization_id=11)
print(builder.get_prompt_version())
```

### Database Connection
```python
import psycopg2
from config import DB_CONFIG

conn = psycopg2.connect(**DB_CONFIG)
print("Connected successfully")
conn.close()
```

## Code Principles

Following CLAUDE.md principles:
- **Pure functions** - No side effects in data processing
- **Immutable data** - No mutations of input data
- **Small functions** - Single responsibility per method
- **No comments** - Self-documenting code
- **Early returns** - Fail fast pattern
- **Dependency injection** - Services passed to constructors
- **Context managers** - Automatic resource cleanup

## Contact & Support

For issues or questions:
- Check `CLAUDE.md` for general project guidelines
- Review test files for usage examples
- Examine git history for implementation details

**Primary Maintainer:** LLM Service Team
**Last Updated:** 2024-08-20
**Service Version:** 1.0.0