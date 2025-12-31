"""
API routes for LLM data service.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import json
import logging
from typing import Dict, List, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ValidationError

from api.async_dependencies import get_async_db_connection, get_async_db_transaction
from api.exceptions import (
    STANDARD_RESPONSES,
    InvalidInputError,
    NotFoundError,
    handle_database_error,
    handle_llm_error,
    handle_validation_error,
)
from services.llm.models import ProcessingType, TranslationRequest
from services.llm_data_service import OpenRouterLLMDataService

router = APIRouter(tags=["llm"], responses=STANDARD_RESPONSES)

logger = logging.getLogger(__name__)


class EnrichmentRequest(BaseModel):
    """Request to enrich animal data."""

    animal_id: int
    processing_type: ProcessingType = ProcessingType.DESCRIPTION_CLEANING


class BatchEnrichmentRequest(BaseModel):
    """Request to enrich multiple animals."""

    animal_ids: List[int]
    processing_type: ProcessingType = ProcessingType.DESCRIPTION_CLEANING
    batch_size: int = 10


class EnrichmentResponse(BaseModel):
    """Response from enrichment operation."""

    success: bool
    message: str
    processed_count: int = 0
    failed_count: int = 0


@router.post("/enrich", response_model=EnrichmentResponse)
async def enrich_animal(request: EnrichmentRequest, conn=Depends(get_async_db_transaction)) -> EnrichmentResponse:
    """Enrich a single animal's data using LLM."""

    try:
        # Validate request
        if request.animal_id <= 0:
            raise InvalidInputError("Animal ID must be positive")

        # Get animal data using async query
        result = await conn.fetchrow(
            """
            SELECT a.*, o.name as org_name
            FROM animals a
            JOIN organizations o ON a.organization_id = o.id
            WHERE a.id = $1
            AND a.active = true
        """,
            request.animal_id,
        )

        if not result:
            raise NotFoundError("Animal", request.animal_id)

        # Convert row to dict
        animal_data = dict(result)

        # Process based on type
        async with OpenRouterLLMDataService() as llm_service:
            if request.processing_type == ProcessingType.DESCRIPTION_CLEANING:
                if not animal_data.get("description"):
                    return EnrichmentResponse(success=False, message="No description to clean")

                enriched = await llm_service.clean_description(
                    animal_data["description"],
                    organization_config={"organization_name": animal_data["org_name"]},
                )

                # Update database using async execute
                await conn.execute(
                    """
                    UPDATE animals 
                    SET enriched_description = $1,
                        llm_processed_at = CURRENT_TIMESTAMP,
                        llm_model_used = 'openrouter/auto',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                """,
                    enriched,
                    request.animal_id,
                )

            elif request.processing_type == ProcessingType.DOG_PROFILER:
                profile = await llm_service.generate_dog_profiler(animal_data)

                # Update database using async execute
                await conn.execute(
                    """
                    UPDATE animals 
                    SET dog_profiler_data = $1,
                        llm_processed_at = CURRENT_TIMESTAMP,
                        llm_model_used = 'openrouter/auto',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $2
                """,
                    json.dumps(profile),
                    request.animal_id,
                )

            else:
                raise InvalidInputError("Unsupported processing type")

        # Transaction is automatically committed by dependency
        return EnrichmentResponse(success=True, message="Animal enriched successfully", processed_count=1)

    except asyncpg.PostgresError as db_err:
        handle_database_error(db_err, "animal enrichment")
    except ValidationError as ve:
        handle_validation_error(ve, "animal enrichment request")
    except (InvalidInputError, NotFoundError):
        # Re-raise our custom exceptions without logging as errors
        raise
    except Exception as e:
        handle_llm_error(e, "animal enrichment")


@router.post("/batch-enrich", response_model=EnrichmentResponse)
async def batch_enrich_animals(request: BatchEnrichmentRequest, conn=Depends(get_async_db_transaction)) -> EnrichmentResponse:
    """Enrich multiple animals in batch."""

    try:
        # Validate request
        if not request.animal_ids:
            raise InvalidInputError("Animal IDs list cannot be empty")
        if len(request.animal_ids) > 100:  # Reasonable limit
            raise InvalidInputError("Cannot process more than 100 animals at once")
        if any(animal_id <= 0 for animal_id in request.animal_ids):
            raise InvalidInputError("All animal IDs must be positive")
        if request.batch_size <= 0 or request.batch_size > 50:
            raise InvalidInputError("Batch size must be between 1 and 50")

        # Get animals data using async query
        animals = await conn.fetch(
            """
            SELECT a.*, o.name as org_name
            FROM animals a
            JOIN organizations o ON a.organization_id = o.id
            WHERE a.id = ANY($1)
            AND a.active = true
        """,
            request.animal_ids,
        )

        if not animals:
            raise NotFoundError("Animals", request.animal_ids)

        # Convert rows to list of dicts
        animals_data = [dict(row) for row in animals]

        # Process in batch
        async with OpenRouterLLMDataService() as llm_service:
            results = await llm_service.batch_process(animals_data, processing_type=request.processing_type)

        processed_count = 0
        failed_count = 0

        # Update database with results using async operations
        for result in results:
            try:
                if "enriched_description" in result:
                    await conn.execute(
                        """
                        UPDATE animals 
                        SET enriched_description = $1,
                            llm_processed_at = CURRENT_TIMESTAMP,
                            llm_model_used = 'openrouter/auto',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    """,
                        result["enriched_description"],
                        result["id"],
                    )
                    processed_count += 1

            except asyncpg.PostgresError as db_err:
                logger.warning(f"Failed to update animal {result.get('id', 'unknown')}: {type(db_err).__name__}")
                failed_count += 1
                continue

        # Transaction is automatically committed by dependency
        return EnrichmentResponse(
            success=True,
            message="Batch processing completed",
            processed_count=processed_count,
            failed_count=failed_count,
        )

    except asyncpg.PostgresError as db_err:
        handle_database_error(db_err, "batch animal enrichment")
    except ValidationError as ve:
        handle_validation_error(ve, "batch animal enrichment request")
    except (InvalidInputError, NotFoundError):
        # Re-raise our custom exceptions without logging as errors
        raise
    except Exception as e:
        handle_llm_error(e, "batch animal enrichment")


@router.post("/translate")
async def translate_text(request: TranslationRequest) -> Dict[str, str]:
    """Translate text to target language."""

    try:
        # Validate request
        if not request.text.strip():
            raise InvalidInputError("Text cannot be empty")
        if len(request.text) > 10000:  # Reasonable limit
            raise InvalidInputError("Text is too long for translation (max 10000 characters)")
        if not request.target_language:
            raise InvalidInputError("Target language is required")

        async with OpenRouterLLMDataService() as llm_service:
            translated = await llm_service.translate_text(
                request.text,
                target_language=request.target_language,
                source_language=request.source_language,
            )

        return {
            "original": request.text,
            "translated": translated,
            "target_language": request.target_language,
        }

    except ValidationError as ve:
        handle_validation_error(ve, "translation request")
    except InvalidInputError:
        # Re-raise our custom exceptions
        raise
    except Exception as e:
        handle_llm_error(e, "text translation")


@router.get("/stats")
async def get_llm_stats(organization_id: Optional[int] = Query(None), conn=Depends(get_async_db_connection)) -> Dict:
    """Get LLM processing statistics."""

    try:
        # Validate request
        if organization_id is not None and organization_id <= 0:
            raise InvalidInputError("Organization ID must be positive")

        # Build query with async syntax
        query = """
            SELECT
                COUNT(*) as total,
                COUNT(enriched_description) as enriched,
                COUNT(dog_profiler_data) as with_profiles,
                COUNT(translations) as with_translations
            FROM animals
            WHERE status = 'available'
            AND active = true
        """

        params = []
        if organization_id:
            query += " AND organization_id = $1"
            params = [organization_id]

        result = await conn.fetchrow(query, *params)
        total, enriched, with_profiles, with_translations = result

        return {
            "total_animals": total,
            "enriched_descriptions": enriched,
            "dog_profiles": with_profiles,
            "with_translations": with_translations,
            "enrichment_coverage": enriched / total * 100 if total > 0 else 0,
            "profile_coverage": with_profiles / total * 100 if total > 0 else 0,
            "translation_coverage": with_translations / total * 100 if total > 0 else 0,
        }

    except asyncpg.PostgresError as db_err:
        handle_database_error(db_err, "LLM statistics retrieval")
    except InvalidInputError:
        # Re-raise our custom exceptions
        raise
    except Exception:
        logger.exception("Unexpected error retrieving LLM statistics")
        raise HTTPException(status_code=500, detail="Failed to retrieve LLM statistics")


@router.post("/clean-description")
async def clean_description_direct(text: str, organization_name: Optional[str] = None) -> Dict[str, str]:
    """Clean a description directly without database interaction."""

    try:
        # Validate request
        if not text.strip():
            raise InvalidInputError("Text cannot be empty")
        if len(text) > 10000:  # Reasonable limit
            raise InvalidInputError("Text is too long for processing (max 10000 characters)")

        async with OpenRouterLLMDataService() as llm_service:
            org_config = {"organization_name": organization_name} if organization_name else None
            cleaned = await llm_service.clean_description(text, org_config)

        return {"original": text, "cleaned": cleaned}

    except InvalidInputError:
        # Re-raise our custom exceptions
        raise
    except Exception as e:
        handle_llm_error(e, "direct description cleaning")
