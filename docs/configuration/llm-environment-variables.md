# LLM Service Environment Variables

This document describes all environment variables for configuring the LLM data service.

## Core API Configuration

### `OPENROUTER_API_KEY` (Required)
- **Description**: OpenRouter API key for LLM access
- **Type**: String
- **Default**: None (must be set)
- **Example**: `OPENROUTER_API_KEY=sk-or-v1-xxx...`

### `LLM_BASE_URL`
- **Description**: OpenRouter API base URL
- **Type**: String  
- **Default**: `https://openrouter.ai/api/v1`
- **Example**: `LLM_BASE_URL=https://openrouter.ai/api/v1`

### `LLM_TIMEOUT_SECONDS`
- **Description**: API request timeout in seconds
- **Type**: Float
- **Default**: `30.0`
- **Example**: `LLM_TIMEOUT_SECONDS=45.0`

## Model Configuration

### `LLM_DEFAULT_MODEL`
- **Description**: Default LLM model to use
- **Type**: String
- **Default**: `openrouter/auto`
- **Example**: `LLM_DEFAULT_MODEL=anthropic/claude-3-haiku`

### `LLM_MAX_TOKENS`
- **Description**: Maximum tokens per request (0 or empty = unlimited)
- **Type**: Integer
- **Default**: None (unlimited)
- **Example**: `LLM_MAX_TOKENS=4000`

## Cache Configuration

### `LLM_CACHE_ENABLED`
- **Description**: Enable/disable response caching
- **Type**: Boolean
- **Default**: Environment-dependent (see below)
- **Example**: `LLM_CACHE_ENABLED=true`

### `LLM_CACHE_MAX_SIZE`
- **Description**: Maximum number of cached entries
- **Type**: Integer (1-10000)
- **Default**: Environment-dependent (see below)
- **Example**: `LLM_CACHE_MAX_SIZE=1500`

### `LLM_CACHE_TTL_SECONDS`
- **Description**: Cache time-to-live in seconds
- **Type**: Integer
- **Default**: Environment-dependent (see below)
- **Example**: `LLM_CACHE_TTL_SECONDS=7200`

## Retry Configuration

### `LLM_RETRY_MAX_ATTEMPTS`
- **Description**: Maximum retry attempts for failed requests
- **Type**: Integer (1-10)
- **Default**: 3 (5 in production)
- **Example**: `LLM_RETRY_MAX_ATTEMPTS=5`

### `LLM_RETRY_STRATEGY`
- **Description**: Retry backoff strategy
- **Type**: String (`exponential`, `linear`, `fixed`)
- **Default**: `exponential`
- **Example**: `LLM_RETRY_STRATEGY=exponential`

### `LLM_RETRY_BASE_DELAY`
- **Description**: Base delay between retries in seconds
- **Type**: Float
- **Default**: `1.0`
- **Example**: `LLM_RETRY_BASE_DELAY=2.0`

### `LLM_RETRY_MAX_DELAY`
- **Description**: Maximum delay between retries in seconds
- **Type**: Float
- **Default**: `60.0`
- **Example**: `LLM_RETRY_MAX_DELAY=120.0`

## Batch Processing Configuration

### `LLM_BATCH_DEFAULT_SIZE`
- **Description**: Default batch size for processing multiple items
- **Type**: Integer (1-50)
- **Default**: Environment-dependent (see below)
- **Example**: `LLM_BATCH_DEFAULT_SIZE=8`

### `LLM_BATCH_MAX_SIZE`
- **Description**: Maximum batch size allowed
- **Type**: Integer (1-100)
- **Default**: Environment-dependent (see below)
- **Example**: `LLM_BATCH_MAX_SIZE=30`

### `LLM_BATCH_CONCURRENT`
- **Description**: Maximum concurrent API requests
- **Type**: Integer (1-50)
- **Default**: Environment-dependent (see below)
- **Example**: `LLM_BATCH_CONCURRENT=12`

## Feature Flags

### `LLM_FEATURE_DESCRIPTION_CLEANING`
- **Description**: Enable description cleaning feature
- **Type**: Boolean
- **Default**: `true`
- **Example**: `LLM_FEATURE_DESCRIPTION_CLEANING=true`

### `LLM_FEATURE_DOG_PROFILER`
- **Description**: Enable dog profiler generation feature
- **Type**: Boolean
- **Default**: `true`
- **Example**: `LLM_FEATURE_DOG_PROFILER=false`

### `LLM_FEATURE_TRANSLATION`
- **Description**: Enable translation feature
- **Type**: Boolean
- **Default**: `true`
- **Example**: `LLM_FEATURE_TRANSLATION=true`

### `LLM_FEATURE_METRICS`
- **Description**: Enable metrics collection
- **Type**: Boolean
- **Default**: `true`
- **Example**: `LLM_FEATURE_METRICS=true`

## Environment-Specific Defaults

The system automatically adjusts defaults based on the `ENVIRONMENT` variable:

### Development (`ENVIRONMENT=development`)
```bash
LLM_CACHE_ENABLED=true
LLM_CACHE_MAX_SIZE=500
LLM_CACHE_TTL_SECONDS=1800
LLM_RETRY_MAX_ATTEMPTS=3
LLM_BATCH_DEFAULT_SIZE=3
LLM_BATCH_MAX_SIZE=10
LLM_BATCH_CONCURRENT=5
```

### Staging (`ENVIRONMENT=staging`)
```bash
LLM_CACHE_ENABLED=true
LLM_CACHE_MAX_SIZE=1000
LLM_CACHE_TTL_SECONDS=3600
LLM_RETRY_MAX_ATTEMPTS=3
LLM_BATCH_DEFAULT_SIZE=5
LLM_BATCH_MAX_SIZE=20
LLM_BATCH_CONCURRENT=8
```

### Production (`ENVIRONMENT=production`)
```bash
LLM_CACHE_ENABLED=true
LLM_CACHE_MAX_SIZE=2000
LLM_CACHE_TTL_SECONDS=7200
LLM_RETRY_MAX_ATTEMPTS=5
LLM_BATCH_DEFAULT_SIZE=10
LLM_BATCH_MAX_SIZE=25
LLM_BATCH_CONCURRENT=15
```

### Testing (`ENVIRONMENT=testing`)
```bash
LLM_CACHE_ENABLED=false
LLM_CACHE_MAX_SIZE=100
LLM_CACHE_TTL_SECONDS=300
LLM_RETRY_MAX_ATTEMPTS=3
LLM_BATCH_DEFAULT_SIZE=2
LLM_BATCH_MAX_SIZE=5
LLM_BATCH_CONCURRENT=3
```

## Example Configuration Files

### Development `.env`
```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-xxx...

# Optional overrides
LLM_DEFAULT_MODEL=anthropic/claude-3-haiku
LLM_BATCH_DEFAULT_SIZE=5
LLM_CACHE_MAX_SIZE=800
```

### Production `.env`
```bash
# Required
OPENROUTER_API_KEY=sk-or-v1-prod-xxx...
ENVIRONMENT=production

# Production optimizations
LLM_DEFAULT_MODEL=anthropic/claude-3-sonnet
LLM_RETRY_MAX_ATTEMPTS=5
LLM_BATCH_DEFAULT_SIZE=15
LLM_CACHE_MAX_SIZE=3000
LLM_CACHE_TTL_SECONDS=10800
```

## Validation

The configuration system validates all values:
- Required fields must be present
- Numeric values must be within acceptable ranges  
- Enum values must match allowed options
- Logical constraints are enforced (e.g., max_delay >= base_delay)

Use the configuration validation in your code:
```python
from services.llm.config import validate_config

if not validate_config():
    raise ValueError("Invalid LLM configuration")
```