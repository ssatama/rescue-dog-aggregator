# LLM-Powered Dog Data Enrichment Pipeline - Implementation Plan

## Executive Summary

This document outlines the implementation plan for an LLM-powered data enrichment pipeline to transform German/mixed-language dog data into high-quality, structured English data. The system will scale from 2,000 to 10,000+ dogs, leveraging existing LLM infrastructure to achieve consistent, hallucination-free data enrichment.

## Critical Requirements

1. **ZERO hallucinations** - Only use information explicitly present in source data
2. **Consistent schema** - Identical JSONB keys across all dogs
3. **Performance optimized** - Batch processing with 47.5x improvements
4. **Organization-specific** - Custom prompts per organization
5. **Production-ready** - Comprehensive error handling, logging, metrics

## Implementation Phases

```
PHASE 1: FOUNDATION    PHASE 2: DEVELOPMENT    PHASE 3: TESTING    PHASE 4: ROLLOUT
    (Days 1-2)             (Days 3-5)            (Days 6-7)          (Days 8-10)
        |                      |                     |                    |
    Validation  ------>   Schema/Pipeline  ----> Integration  -----> Production
        |                      |                     |                    |
    Research              Prompt Eng.           Batch Proc.          API Update
        |                      |                     |                    |
    Cost Est.             Unit Tests            Monitoring           Documentation
```

---

## PHASE 1: FOUNDATION & VALIDATION

### Objective
Validate infrastructure, establish baselines, and ensure feasibility

### 1.1 Infrastructure Validation
```bash
# Verify existing LLM service
ls -la services/llm/
cat services/llm/llm_data_service.py
cat services/llm/models.py

# Check database migration
psql -d rescue_dogs -c "\\d animals" | grep dog_profiler_data

# Test basic LLM connectivity
python -c "from services.llm import OpenRouterLLMDataService; 
           service = OpenRouterLLMDataService(); 
           print(service.test_connection())"
```

**Success Criteria:**
- LLM service responds to test prompts
- dog_profiler_data column exists and is JSONB type
- All dependencies installed and functional

### 1.2 Data Research & Benchmarking
```sql
-- Analyze high-quality reference data
SELECT 
    o.name as org_name,
    COUNT(*) as total_dogs,
    COUNT(properties) as with_properties,
    AVG(LENGTH(properties::text)) as avg_property_length
FROM animals a
JOIN organizations o ON a.organization_id = o.id
WHERE o.id IN (27, 25, 28)
GROUP BY o.name;

-- Sample detailed properties
SELECT id, name, breed, age_text, properties
FROM animals
WHERE organization_id IN (27, 25, 28)
    AND properties IS NOT NULL
    AND jsonb_typeof(properties) = 'object'
LIMIT 10;
```

**Deliverables:**
- Quality scoring rubric document
- List of consistently present fields
- Patterns in high-quality descriptions

### 1.3 Cost Analysis & Feasibility

```python
# services/llm/cost_estimator.py
import tiktoken

def estimate_processing_cost(sample_dogs):
    """Calculate cost for processing dogs through LLM"""
    encoding = tiktoken.encoding_for_model("gpt-4")
    
    total_input_tokens = 0
    total_output_tokens = 0
    
    for dog in sample_dogs:
        # Count input tokens (prompt + dog data)
        input_text = f"{PROMPT_TEMPLATE}\n{dog['properties']}"
        input_tokens = len(encoding.encode(input_text))
        
        # Estimate output (typically 500-800 tokens)
        output_tokens = 650  # Average estimate
        
        total_input_tokens += input_tokens
        total_output_tokens += output_tokens
    
    # OpenRouter pricing (example rates)
    input_cost = total_input_tokens * 0.00015 / 1000
    output_cost = total_output_tokens * 0.0006 / 1000
    
    cost_per_dog = (input_cost + output_cost) / len(sample_dogs)
    
    return {
        'cost_per_dog': cost_per_dog,
        'total_cost_400_dogs': cost_per_dog * 400,
        'proceed': cost_per_dog < 0.05
    }
```

**Decision Gate:** Proceed only if cost < $0.05 per dog

---

## PHASE 2: SCHEMA & PROTOTYPE DEVELOPMENT

### 2.1 Enhanced Schema Design

```python
# services/llm/schemas/dog_profiler.py
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Literal, Dict
from datetime import datetime

class DogProfilerData(BaseModel):
    """Comprehensive dog profile for all touchpoints"""
    
    # ===== CORE DESCRIPTION =====
    description: str = Field(..., min_length=150, max_length=250)
    tagline: str = Field(..., max_length=50)
    
    # ===== BEHAVIORAL TRAITS =====
    energy_level: Literal["low", "medium", "high", "very_high"]
    trainability: Literal["easy", "moderate", "challenging", "expert_needed"]
    sociability: Literal["very_social", "selective", "independent", "needs_work"]
    confidence: Literal["confident", "moderate", "shy", "fearful"]
    
    # ===== COMPATIBILITY =====
    good_with_dogs: Optional[Literal["yes", "no", "selective", "unknown"]]
    good_with_cats: Optional[Literal["yes", "no", "with_training", "unknown"]]
    good_with_children: Optional[Literal["yes", "older_children", "no", "unknown"]]
    
    # ===== LIVING REQUIREMENTS =====
    home_type: Literal["apartment_ok", "house_preferred", "house_required", "farm_only"]
    yard_required: bool
    experience_level: Literal["first_time_ok", "some_experience", "experienced_only"]
    exercise_needs: Literal["minimal", "moderate", "high", "athlete"]
    
    # ===== CARE NEEDS =====
    grooming_needs: Literal["minimal", "weekly", "frequent", "professional"]
    medical_needs: Optional[str] = Field(None, max_length=200)
    special_needs: Optional[str] = Field(None, max_length=200)
    
    # ===== PERSONALITY =====
    personality_traits: List[str] = Field(..., min_items=3, max_items=5)
    favorite_activities: List[str] = Field(..., min_items=2, max_items=4)
    unique_quirk: Optional[str] = Field(None, max_length=100)
    
    # ===== ADOPTION INFO =====
    adoption_fee_euros: Optional[int] = Field(None, ge=0, le=2000)
    ready_to_travel: bool
    vaccinated: bool
    neutered: bool
    
    # ===== METADATA (NEW) =====
    profiler_version: str = "1.0.0"
    profiled_at: datetime
    processing_time_ms: int
    confidence_scores: Dict[str, float]  # Field-level confidence
    source_references: Dict[str, str]    # Which German text mapped to which field
    prompt_version: str                  # Track which prompt generated this
    
    @validator('personality_traits', 'favorite_activities')
    def validate_list_items(cls, v):
        """Ensure list items are non-empty strings"""
        return [item.strip() for item in v if item.strip()]
```

### 2.2 Prompt Engineering Template

```yaml
# prompts/organizations/tierschutzverein_europa.yaml
metadata:
  organization_id: 11
  language: de
  version: "1.0.0"
  
system_prompt: |
  You are an expert dog adoption specialist creating accurate, compelling profiles.
  
  CRITICAL RULES:
  1. NEVER hallucinate - only use explicitly provided information
  2. Use "unknown" or null for missing information
  3. Maintain warm, professional tone
  4. Be honest about challenges while emphasizing positives
  5. Return valid JSON matching the exact schema

extraction_prompt: |
  Analyze this German dog data and create an English profile:
  
  Name: {name}
  Breed: {breed}
  Age: {age_text}
  Location: {location}
  German Text: {properties}
  
  Extract ALL fields for the DogProfilerData schema:
  
  DESCRIPTION FIELDS:
  - description: 150-250 word engaging English description
  - tagline: Catchy <10 word hook
  
  BEHAVIORAL ASSESSMENT (based ONLY on text):
  - energy_level: Derive from breed and description
  - trainability: Look for "gelehrig", "intelligent", "stur"
  - sociability: Check "verträglich", "sozial", "scheu"
  - confidence: Assess from "selbstbewusst", "ängstlich"
  
  COMPATIBILITY (explicit mentions only):
  - good_with_dogs: "Hundetest" results
  - good_with_cats: "Katzentest" results
  - good_with_children: "kinderlieb" mentions
  
  [Continue for all fields...]
  
  IMPORTANT: Include confidence_scores and source_references

few_shot_examples:
  - input: "Freundlicher Rüde, 3 Jahre, verträglich mit Hunden..."
    output: {
      "description": "Meet this friendly 3-year-old male...",
      "good_with_dogs": "yes",
      "confidence_scores": {"good_with_dogs": 0.95},
      "source_references": {"good_with_dogs": "verträglich mit Hunden"}
    }
```

### 2.3 Pipeline Implementation

```python
# services/llm/dog_profiler.py
from typing import Dict, Optional
import asyncio
from datetime import datetime
import time

from services.llm.llm_data_service import OpenRouterLLMDataService
from services.llm.models import ProcessingType
from services.llm.schemas.dog_profiler import DogProfilerData

class DogProfilerPipeline:
    """Pipeline for enriching dog data with LLM"""
    
    def __init__(self, organization_id: int):
        self.org_id = organization_id
        self.llm_service = OpenRouterLLMDataService()
        self.prompt_template = self._load_prompt_template(organization_id)
        
    def _load_prompt_template(self, org_id: int) -> Dict:
        """Load organization-specific prompt template"""
        # Load from YAML file based on org_id
        pass
        
    def _build_prompt(self, dog_data: Dict) -> str:
        """Construct prompt with dog data"""
        return self.prompt_template['extraction_prompt'].format(
            name=dog_data.get('name'),
            breed=dog_data.get('breed'),
            age_text=dog_data.get('age_text'),
            location=dog_data.get('location'),
            properties=dog_data.get('properties', {})
        )
    
    async def process_dog(self, dog_data: Dict) -> Optional[Dict]:
        """Process single dog with error handling"""
        try:
            start_time = time.time()
            
            # Build prompt
            prompt = self._build_prompt(dog_data)
            
            # Call LLM service
            response = await self.llm_service.process_with_prompt(
                prompt=prompt,
                system_prompt=self.prompt_template['system_prompt'],
                processing_type=ProcessingType.DOG_PROFILER,
                response_format="json",
                temperature=0.3  # Low temperature for consistency
            )
            
            # Add metadata
            response['profiled_at'] = datetime.utcnow()
            response['processing_time_ms'] = int((time.time() - start_time) * 1000)
            response['prompt_version'] = self.prompt_template['metadata']['version']
            
            # Validate against schema
            validated_data = DogProfilerData(**response)
            
            return validated_data.dict()
            
        except Exception as e:
            self._log_error(dog_data.get('id'), str(e))
            return None
    
    def _log_error(self, dog_id: int, error: str):
        """Log processing errors for monitoring"""
        # Implementation here
        pass
```

---

## PHASE 3: TESTING & QUALITY ASSURANCE

### 3.1 Comprehensive Test Suite

```python
# tests/services/llm/test_dog_profiler.py
import pytest
from unittest.mock import Mock, patch
from services.llm.dog_profiler import DogProfilerPipeline

class TestDogProfiler:
    
    @pytest.fixture
    def mock_llm_response(self):
        """Valid LLM response fixture"""
        return {
            "description": "A friendly dog" * 20,  # 150+ chars
            "tagline": "Your perfect companion",
            "energy_level": "medium",
            # ... all required fields
        }
    
    @patch('services.llm.OpenRouterLLMDataService.process_with_prompt')
    async def test_successful_processing(self, mock_llm, mock_llm_response):
        """Test successful dog processing"""
        mock_llm.return_value = mock_llm_response
        
        pipeline = DogProfilerPipeline(organization_id=11)
        result = await pipeline.process_dog({
            'id': 1,
            'name': 'Max',
            'properties': {'description': 'Freundlicher Hund'}
        })
        
        assert result is not None
        assert result['description'] != ''
        assert 'profiled_at' in result
        
    async def test_hallucination_detection(self):
        """Ensure no data is invented"""
        # Test that fields not in source return "unknown"
        pass
        
    async def test_schema_consistency(self):
        """Verify all dogs have identical keys"""
        # Process multiple dogs and compare schemas
        pass
```

### 3.2 Integration Testing Protocol

```python
# tests/integration/test_dog_profiler_integration.py

async def test_real_dog_processing():
    """Test with actual org 11 dogs"""
    
    # Get 10 diverse test dogs
    test_dogs = get_test_dogs_from_org_11()
    
    pipeline = DogProfilerPipeline(organization_id=11)
    
    results = []
    for dog in test_dogs:
        result = await pipeline.process_dog(dog)
        results.append(result)
    
    # Quality checks
    assert_no_hallucinations(results, test_dogs)
    assert_schema_consistency(results)
    assert_field_population_rate(results) > 0.85
    assert_average_confidence(results) > 0.7
```

### 3.3 Quality Monitoring

```python
# monitoring/llm_quality_checker.py

class LLMQualityChecker:
    """Monitor and validate LLM output quality"""
    
    def validate_profiler_data(self, animal_id: int) -> Dict:
        """Comprehensive quality validation"""
        
        dog_data = self.get_dog_data(animal_id)
        profiled_data = dog_data.get('dog_profiler_data')
        
        checks = {
            'has_all_required_fields': self._check_required_fields(profiled_data),
            'description_length_ok': 150 <= len(profiled_data.get('description', '')) <= 250,
            'no_conflicting_data': self._check_consistency(profiled_data, dog_data),
            'language_is_english': self._detect_language(profiled_data) == 'en',
            'confidence_above_threshold': self._average_confidence(profiled_data) > 0.7,
            'no_hallucinations': self._verify_source_references(profiled_data, dog_data)
        }
        
        return {
            'animal_id': animal_id,
            'quality_score': sum(checks.values()) / len(checks),
            'checks': checks,
            'recommendation': 'approve' if all(checks.values()) else 'review'
        }
```

---

## PHASE 4: PRODUCTION ROLLOUT

### 4.1 Progressive Deployment Strategy

```python
# management/llm_rollout.py

class ProgressiveRollout:
    """Gradual deployment with quality gates"""
    
    ROLLOUT_STAGES = [
        {'count': 10, 'min_quality': 0.80, 'name': 'pilot'},
        {'count': 50, 'min_quality': 0.85, 'name': 'early'},
        {'count': 100, 'min_quality': 0.85, 'name': 'expanded'},
        {'count': None, 'min_quality': 0.90, 'name': 'full'}
    ]
    
    async def execute_rollout(self, org_id: int):
        """Execute staged rollout with quality gates"""
        
        for stage in self.ROLLOUT_STAGES:
            dogs = self.get_unprocessed_dogs(org_id, limit=stage['count'])
            
            results = await self.process_batch(dogs)
            quality_score = self.calculate_quality_score(results)
            
            if quality_score < stage['min_quality']:
                self.log_rollout_failure(stage['name'], quality_score)
                raise RolloutQualityGateFailure(
                    f"Stage {stage['name']} failed: {quality_score:.2%} < {stage['min_quality']:.0%}"
                )
            
            self.commit_results(results)
            self.log_rollout_success(stage['name'], quality_score)
            
            # Manual review checkpoint
            if stage['name'] in ['pilot', 'early']:
                await self.wait_for_manual_approval(stage['name'])
```

### 4.2 API Integration

```python
# api/routes/animals.py (updates)

@router.get("/animals")
async def get_animals(
    include_profiler_data: bool = Query(True),
    db: AsyncSession = Depends(get_db)
):
    """Get animals with optional profiler data"""
    
    query = select(Animal)
    
    if include_profiler_data:
        # Include profiler data in response
        query = query.options(
            selectinload(Animal.dog_profiler_data)
        )
    
    # Add caching for profiled data
    cache_key = f"animals_with_profiler_{include_profiler_data}"
    cached = await cache.get(cache_key)
    if cached:
        return cached
    
    results = await db.execute(query)
    animals = results.scalars().all()
    
    # Transform for response
    response_data = [
        {
            **animal.to_dict(),
            'enriched_description': (
                animal.dog_profiler_data.get('description')
                if animal.dog_profiler_data
                else animal.properties.get('description')
            )
        }
        for animal in animals
    ]
    
    await cache.set(cache_key, response_data, ttl=300)
    return response_data
```

---

## Quality Gates & Success Criteria

### Must Pass Before Production

| Criterion | Target | Measurement |
|-----------|--------|-------------|
| Zero Hallucinations | 100% | Manual verification of 50-dog sample |
| Field Population | >90% | Automated validation across all dogs |
| Processing Cost | <$0.05/dog | Track via OpenRouter dashboard |
| Batch Performance | 100 dogs in <5 min | Timed batch processing test |
| Test Coverage | 100% pass | pytest + frontend tests |
| Manual Review | Approved | Stakeholder sign-off |

### Monitoring Metrics

```python
# monitoring/metrics.py

PROFILER_METRICS = {
    'success_rate': Gauge('dog_profiler_success_rate', 'Percentage of successful processing'),
    'avg_processing_time': Histogram('dog_profiler_processing_time', 'Time to process one dog'),
    'cost_per_dog': Gauge('dog_profiler_cost_per_dog', 'Average cost in USD'),
    'quality_score': Gauge('dog_profiler_quality_score', 'Average quality score'),
    'error_rate': Counter('dog_profiler_errors', 'Number of processing errors'),
}

# Alert thresholds
ALERTS = {
    'high_error_rate': lambda: PROFILER_METRICS['error_rate'] > 0.1,
    'excessive_cost': lambda: PROFILER_METRICS['cost_per_dog'] > 0.10,
    'slow_processing': lambda: PROFILER_METRICS['avg_processing_time'] > 10,
}
```

---

## Risk Mitigation

### Backup & Recovery

```bash
# Before any bulk update
pg_dump -t animals rescue_dogs > backup_animals_$(date +%Y%m%d).sql

# Rollback script
psql rescue_dogs -c "UPDATE animals SET dog_profiler_data = NULL WHERE organization_id = 11;"
```

### Dry Run Mode

```python
# services/llm/dog_profiler.py

class DogProfilerPipeline:
    def __init__(self, organization_id: int, dry_run: bool = False):
        self.dry_run = dry_run
        
    async def save_results(self, results: List[Dict]):
        """Save with dry-run support"""
        if self.dry_run:
            self.log_dry_run_results(results)
            return
        
        # Actual database update
        await self.db_service.bulk_update_profiler_data(results)
```

### Cost Controls

```python
# services/llm/cost_limiter.py

class CostLimiter:
    DAILY_LIMIT_USD = 10.00
    
    async def check_budget(self):
        """Enforce daily spending limit"""
        today_spend = await self.get_today_spend()
        
        if today_spend >= self.DAILY_LIMIT_USD:
            raise BudgetExceededError(
                f"Daily limit of ${self.DAILY_LIMIT_USD} exceeded"
            )
```

---

## Actionable Todo List

### Immediate Actions (Day 1)
- [ ] Verify services/llm/ infrastructure
- [ ] Test LLM service connectivity
- [ ] Query reference data from orgs 27, 25, 28
- [ ] Calculate cost estimates with 5 test dogs

### Development Tasks (Days 2-5)
- [ ] Implement DogProfilerData schema with validation
- [ ] Create organization-specific prompt template
- [ ] Build DogProfilerPipeline class
- [ ] Write comprehensive unit tests
- [ ] Test with 10 diverse dogs

### Testing & Validation (Days 6-7)
- [ ] Manual quality review of outputs
- [ ] Implement batch processing
- [ ] Set up monitoring and metrics
- [ ] Create quality dashboard

### Production Rollout (Days 8-10)
- [ ] Execute progressive deployment (10→50→100→400)
- [ ] Update API endpoints
- [ ] Create documentation
- [ ] Final stakeholder approval

---

## Appendix: Code Organization

```
services/
├── llm/
│   ├── __init__.py
│   ├── dog_profiler.py          # Main pipeline
│   ├── cost_estimator.py        # Cost analysis
│   ├── cost_limiter.py          # Budget controls
│   └── schemas/
│       └── dog_profiler.py      # Pydantic models
│
prompts/
├── organizations/
│   ├── tierschutzverein_europa.yaml
│   └── [other_orgs].yaml
│
tests/
├── services/
│   └── llm/
│       ├── test_dog_profiler.py
│       └── test_cost_estimator.py
│
monitoring/
├── llm_quality_checker.py
└── metrics.py
│
management/
└── llm_rollout.py               # Deployment orchestration
```

---

## Success Metrics

Upon completion, the system will:
- Process 400+ dogs from organization 11
- Achieve <5% error rate
- Maintain costs under $0.05 per dog
- Provide consistent, high-quality English profiles
- Enable advanced filtering and matching features
- Support the upcoming "Doggy Tinder" swipe feature

## Next Steps

1. Begin with infrastructure validation
2. Prototype with 10 dogs
3. Iterate on prompts based on quality
4. Scale progressively with monitoring
5. Document learnings for other organizations