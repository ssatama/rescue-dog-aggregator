# services/llm

The LLM enrichment pipeline. Full documentation - architecture, data flow,
configuration, schema, component reference and operational commands - lives in:

**[`docs/features/llm-data-enrichment.md`](../../docs/features/llm-data-enrichment.md)**

Kept in one place because this README and that document previously described the
same system and drifted apart.

## Orientation

| File | Role |
| --- | --- |
| `dog_profiler.py` | Pipeline orchestrator - the entry point |
| `config.py` | `LLM_DEFAULT_MODEL` / `LLM_COST_TIER` and other settings |
| `llm_client.py` | OpenRouter HTTP client and request construction |
| `prompt_builder.py` | Organization-specific prompt assembly |
| `organization_config_loader.py` | Loads `configs/llm_organizations.yaml` |
| `extracted_profile_normalizer.py` | Normalizes model output to the schema |
| `normalizers/`, `field_normalizers.py` | Per-field normalization rules |
| `quality_rubric.py` | Profile quality scoring (0-100) |
| `retry_handler.py` | Exponential backoff |
| `database_updater.py` | Writes `dog_profiler_data` JSONB |
| `statistics_tracker.py` | Batch success/failure counters |
| `schemas/dog_profiler.py` | Pydantic output schema |
| `models.py` | Shared request/response models |
| `photo_analysis_models.py` | Instagram photo-analysis schema |
