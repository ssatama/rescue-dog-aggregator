# LLM Data Enrichment Feature

## Overview

The LLM Data Enrichment feature powers the intelligence behind www.rescuedogs.me by transforming basic dog information from rescue organizations into comprehensive, searchable profiles. This AI-powered system analyzes raw descriptions in multiple languages, generates personality insights, and creates structured data that enables sophisticated matching between dogs and potential adopters.

### Key Capabilities

- **Automated Profile Generation**: Converts raw dog descriptions into structured profiles with 97%+ success rate
- **Multi-language Support**: Processes descriptions in German, French, Spanish, and other languages
- **Smart Matching**: Enables personality-based filtering and compatibility assessment
- **Swipe Interface**: Powers the Tinder-like swipe feature with AI-generated insights
- **Cost Efficiency**: Processes dogs at ~$0.005 each using Google Gemini 3 Flash

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                        DATA SOURCES                          │
├─────────────────────────────────────────────────────────────┤
│  Web Scrapers → Raw Data → PostgreSQL (animals table)       │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    LLM ENRICHMENT PIPELINE                   │
├─────────────────────────────────────────────────────────────┤
│  services/llm/                                              │
│  ├── dog_profiler.py         # Main orchestrator           │
│  ├── prompt_builder.py        # Organization templates      │
│  ├── llm_client.py           # OpenRouter API              │
│  ├── normalizers/            # Data standardization        │
│  └── scraper_integration.py  # Auto-profiling              │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     ENRICHED DATABASE                        │
├─────────────────────────────────────────────────────────────┤
│  animals.dog_profiler_data (JSONB)                          │
│  ├── personality_traits[]                                   │
│  ├── energy_level                                          │
│  ├── trainability                                          │
│  ├── experience_level                                      │
│  └── compatibility metrics                                 │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND FEATURES                         │
├─────────────────────────────────────────────────────────────┤
│  • Personality Filters                                      │
│  • Swipe Matching                                          │
│  • Compatibility Scores                                     │
│  • Experience Requirements                                  │
│  • Care Complexity Analysis                                │
└─────────────────────────────────────────────────────────────┘
```

## How It Works

### 1. Data Collection Phase

Scrapers collect raw dog data from rescue organizations:

```python
# Example raw data from scraper
{
    'name': 'Max',
    'breed': 'German Shepherd Mix',
    'age_text': '2 years old',
    'properties': {
        'description': 'Max ist ein freundlicher Hund der gerne spielt...',
        'good_with_kids': True
    }
}
```

### 2. Profile Generation Phase

The LLM pipeline processes each dog through several stages:

#### a. Prompt Building
Organization-specific templates are loaded from `prompts/organizations/{org_name}.yaml`:

```yaml
system_prompt: |
  You are an expert dog behaviorist analyzing rescue dogs.
  Generate structured profiles focusing on personality and compatibility.

extraction_prompt: |
  Analyze this dog and create a comprehensive profile:
  Name: {name}
  Breed: {breed}
  Description: {description}
```

#### b. LLM Processing
Sends structured prompts to OpenRouter API (Google Gemini 3 Flash):

```python
# DogProfilerPipeline processes dogs
pipeline = DogProfilerPipeline(organization_id=11)
profile = await pipeline.process_dog(dog_data)
```

#### c. Data Normalization
Standardizes LLM output using specialized normalizers:

- **Behavioral Normalizers**: Standardize energy levels, trainability
- **Compatibility Normalizers**: Process good_with_kids/dogs/cats
- **Utility Normalizers**: Clean special needs, format lists

### 3. Data Storage

Enriched profiles stored in PostgreSQL JSONB column:

```json
{
  "description": "Max is a friendly, energetic companion who loves to play and explore.",
  "personality_traits": ["playful", "loyal", "energetic", "friendly", "curious"],
  "energy_level": "high",
  "trainability": "moderate",
  "experience_level": "intermediate",
  "grooming_needs": "moderate",
  "exercise_needs": "high",
  "good_with_kids": true,
  "good_with_dogs": true,
  "good_with_cats": false,
  "special_needs": ["needs secure fencing", "may pull on leash"],
  "ideal_home": "Active family with yard and time for training",
  "profiled_at": "2024-08-20T10:30:00Z",
  "model_used": "google/gemini-2.5-flash",
  "quality_score": 92.5
}
```

### 4. Frontend Features Enabled

#### Personality-Based Filtering
Users can filter dogs by personality traits:

```typescript
// frontend/src/utils/dogProfilerAnalyzer.ts
function analyzePersonalityPatterns(dogs: DogWithProfiler[]) {
  // Finds common traits across favorites
  // Identifies personality themes
  // Provides matching recommendations
}
```

#### Swipe Interface
Powers the Tinder-like swipe feature with AI insights:

- Shows personality traits prominently
- Displays energy/trainability meters
- Highlights compatibility factors
- Suggests ideal home situations

#### Compatibility Scoring
Analyzes user preferences from favorites:

```typescript
interface LifestyleCompatibility {
  apartmentSuitability: number;
  activeFamilySuitability: number;
  firstTimeOwnerSuitability: number;
  workFromHomeSuitability: number;
}
```

## Integration Points

### 1. Scraper Integration

Scrapers can automatically profile dogs during collection:

```python
# scraper_integration.py
@add_llm_profiling_to_scraper
class MyScraper(BaseScraper):
    # Automatically profiles dogs after scraping
    pass
```

### 2. Management Commands

Manual profiling via command line:

```bash
# Profile dogs for an organization
python management/config_commands.py profile --org-id 11 --limit 10

# Generate profiles for all unprofiled dogs
python management/llm_commands.py generate-profiles
```

### 3. API Endpoints

REST API for on-demand enrichment:

```python
# api/routes/llm.py
POST /api/llm/enrich         # Single dog enrichment
POST /api/llm/batch-enrich   # Batch processing
GET  /api/llm/stats          # Processing statistics
```

### 4. Database Queries

Frontend queries enriched data:

```sql
-- Get dogs with personality traits
SELECT
    name,
    breed,
    dog_profiler_data->>'personality_traits' as traits,
    dog_profiler_data->>'energy_level' as energy
FROM animals
WHERE dog_profiler_data IS NOT NULL
AND dog_profiler_data->>'energy_level' = 'high'
```

## Configuration

### Organization Setup

Each rescue organization requires:

1. **Configuration Entry** (`configs/llm_organizations.yaml`):
```yaml
organizations:
  11:
    name: "Tierschutzverein Europa"
    prompt_file: "tierschutzverein_europa.yaml"
    source_language: "de"
    target_language: "en"
    model_preference: "google/gemini-2.5-flash"
    enabled: true
```

2. **Prompt Template** (`prompts/organizations/{name}.yaml`):
```yaml
metadata:
  version: "1.0.0"
  organization: "Tierschutzverein Europa"

system_prompt: |
  You are analyzing dogs from a German rescue organization.
  Focus on personality, behavior, and adoption requirements.

extraction_prompt: |
  Create a structured profile for this dog...
```

### Environment Variables

```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-xxxxx

# Optional
LLM_MODEL_OVERRIDE=openai/gpt-4-turbo  # Override default model
```

## Quality Assurance

### Success Metrics

- **Processing Success Rate**: 97%+ (with automatic retries)
- **Quality Score Average**: 85-95% per profile
- **Cost per Dog**: ~$0.005 (Gemini 3 Flash)
- **Processing Time**: 2-5 seconds per dog
- **Batch Efficiency**: 5 dogs concurrent processing

### Retry Logic

Implements exponential backoff with model fallback:

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

### Data Validation

All profiles validated against Pydantic schemas:

```python
class DogProfilerData(BaseModel):
    personality_traits: List[str] = Field(min_items=3, max_items=5)
    energy_level: EnergyLevel
    trainability: TrainabilityLevel
    experience_level: ExperienceLevel
    # ... additional fields
```

## Performance Optimization

### Batch Processing

Processes dogs in configurable batches:

```python
# Process 5 dogs concurrently
async def process_batch(dogs, batch_size=5):
    for i in range(0, len(dogs), batch_size):
        batch = dogs[i:i+batch_size]
        tasks = [profile_dog(d) for d in batch]
        await asyncio.gather(*tasks)
```

### Caching Strategy

- Organization configs cached in memory
- Prompt templates loaded once per session
- Database connection pooling for efficiency

### Token Usage

Optimized prompts for cost efficiency:

- Average input: ~500 tokens
- Average output: ~300 tokens
- Total per dog: ~800 tokens
- Cost: ~$0.0015 per dog

## Monitoring

### Database Statistics

```sql
-- Profile coverage by organization
SELECT
    o.name,
    COUNT(a.id) as total_dogs,
    COUNT(a.dog_profiler_data) as profiled,
    ROUND(100.0 * COUNT(a.dog_profiler_data) / COUNT(*), 1) as coverage_pct
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE a.status = 'available'
GROUP BY o.name
ORDER BY coverage_pct DESC;
```

### Sentry Integration

All LLM operations monitored via Sentry:

- Error tracking for API failures
- Performance monitoring for slow operations
- Custom tags for organization/model tracking

## Frontend Implementation

### Key Components

```typescript
// Types
frontend/src/types/dogProfiler.ts         # Type definitions

// Utils
frontend/src/utils/dogProfilerAnalyzer.ts # Analysis functions

// Components
frontend/src/components/dogs/detail/PersonalityTraits.tsx
frontend/src/components/dogs/detail/EnergyTrainability.tsx
frontend/src/components/dogs/detail/ActivitiesQuirks.tsx

// Pages
frontend/src/app/swipe/page.tsx          # Swipe interface
frontend/src/app/favorites/page.tsx      # Favorites analysis
```

### User Experience Features

1. **Personality Insights**: Visual badges for traits
2. **Energy Meters**: Visual representation of energy/trainability
3. **Compatibility Indicators**: Icons for kids/dogs/cats compatibility
4. **Experience Requirements**: Clear labeling for required experience
5. **Special Needs Callouts**: Highlighted care requirements

## Testing

### Backend Tests

```bash
# Unit tests
pytest tests/services/llm/test_dog_profiler.py -v
pytest tests/services/llm/test_prompt_builder.py -v
pytest tests/services/llm/test_profile_normalizer.py -v

# Integration test
pytest tests/api/test_llm_security_simple.py -v
```

### Frontend Tests

```bash
# Component tests
pnpm jest --testPathPatterns "PersonalityTraits" --watchAll=false
pnpm jest --testPathPatterns "dogProfilerAnalyzer" --watchAll=false
```

## Future Enhancements

### Planned Features

1. **Multi-language Profiles**: Generate profiles in user's preferred language
2. **Behavioral Predictions**: ML models trained on adoption outcomes
3. **Custom Scoring Rubrics**: Organization-specific quality metrics
4. **Real-time Updates**: Webhook notifications for profile completion
5. **A/B Testing Framework**: Compare different prompt strategies

### Potential Integrations

- **Adoption Applications**: Pre-fill based on compatibility
- **Email Notifications**: Alert users to matching dogs
- **Social Sharing**: Generate shareable dog profiles
- **Partner APIs**: Share enriched data with partner sites

## Troubleshooting

### Common Issues

1. **No LLM configuration for organization**
   - Add organization to `configs/llm_organizations.yaml`
   - Create prompt template in `prompts/organizations/`

2. **API rate limiting**
   - Reduce batch size in configuration
   - Implement additional delays between batches

3. **Low quality scores**
   - Review and optimize prompt templates
   - Ensure descriptions have sufficient detail

4. **Missing profiles in frontend**
   - Verify `dog_profiler_data` column populated
   - Check frontend type definitions match schema

## Impact

### Site Metrics

- **4,500+ dogs** enriched with AI profiles
- **20+ daily users** using personality-based search
- **97% profile coverage** for active dogs
- **3x engagement** on dogs with enriched profiles

### User Benefits

- **Better Matches**: Users find dogs matching their lifestyle
- **Informed Decisions**: Clear understanding of care requirements
- **Reduced Returns**: Better compatibility assessment upfront
- **Discovery**: Surface dogs that might be overlooked

## Conclusion

The LLM Data Enrichment feature transforms www.rescuedogs.me from a simple listing site into an intelligent matching platform. By leveraging AI to understand each dog's unique personality and needs, we help connect rescue dogs with their perfect families while reducing the burden on rescue organizations.

The system's modular design allows easy addition of new organizations, continuous improvement of profile quality, and expansion into new features as the site grows.

---

**Last Updated**: 2025-12-23
**Related Docs**: [Architecture Reference](../technical/architecture.md)