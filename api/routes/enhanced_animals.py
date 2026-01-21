"""
API routes for enhanced animal data (LLM-generated content).

Optimized for:
- Dog detail pages (description + tagline)
- Bulk operations for comparisons
- Attribute filtering
- Graceful handling of partial data

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Small focused endpoints
"""

import logging
from typing import Any

from fastapi import APIRouter, Depends, Query
from psycopg2.extras import RealDictCursor

from api.dependencies import get_pooled_db_cursor
from api.exceptions import InvalidInputError, NotFoundError, handle_database_error
from api.models.enhanced_animal import (
    AttributesRequest,
    AttributesResponse,
    BulkEnhancedRequest,
    DetailContentResponse,
    EnhancedAnimalResponse,
)
from api.services.enhanced_animal_service import EnhancedAnimalService

logger = logging.getLogger(__name__)
router = APIRouter(tags=["enhanced"])


@router.get(
    "/{animal_id}/enhanced",
    response_model=EnhancedAnimalResponse,
    summary="Get enhanced data for single animal",
    description="Returns full LLM-generated enhanced data including description, tagline, and attributes",
)
async def get_enhanced_animal(animal_id: int, cursor: RealDictCursor = Depends(get_pooled_db_cursor)) -> EnhancedAnimalResponse:
    """
    Get enhanced data for a single animal.

    Optimized for dog detail pages with caching.
    Returns graceful fallback for non-enriched animals.
    """
    if animal_id <= 0:
        raise InvalidInputError("Animal ID must be positive")

    try:
        service = EnhancedAnimalService(cursor)
        result = service.get_enhanced_detail(animal_id)

        if not result:
            raise NotFoundError("Animal", animal_id)

        return result

    except (NotFoundError, InvalidInputError):
        raise
    except Exception as e:
        logger.exception(f"Error fetching enhanced data for animal {animal_id}")
        handle_database_error(e, "get_enhanced_animal")


@router.post(
    "/enhanced/detail-content",
    response_model=list[DetailContentResponse],
    summary="Get detail page content (optimized)",
    description="Ultra-fast endpoint for fetching description + tagline for detail pages",
)
async def get_detail_content(
    animal_ids: list[int] = Query(..., min_items=1, max_items=100),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
) -> list[DetailContentResponse]:
    """
    Optimized endpoint for dog detail pages.

    Primary use case: Fetch description + tagline with minimal overhead.
    Target performance: <50ms for single, <200ms for batch.
    """
    # Validate input
    if any(aid <= 0 for aid in animal_ids):
        raise InvalidInputError("All animal IDs must be positive")

    try:
        service = EnhancedAnimalService(cursor)
        results = service.get_detail_content(animal_ids)

        if not results:
            return []

        return results

    except InvalidInputError:
        raise
    except Exception as e:
        logger.exception(f"Error fetching detail content for {len(animal_ids)} animals")
        handle_database_error(e, "get_detail_content")


@router.post(
    "/enhanced/bulk",
    response_model=list[EnhancedAnimalResponse],
    summary="Bulk fetch enhanced data",
    description="Retrieve enhanced data for multiple animals (max 100)",
)
async def get_bulk_enhanced(request: BulkEnhancedRequest, cursor: RealDictCursor = Depends(get_pooled_db_cursor)) -> list[EnhancedAnimalResponse]:
    """
    Bulk retrieval of enhanced animal data.

    Use cases:
    - Favorites comparison
    - Multiple dog detail loading
    - Batch processing

    Target performance: <500ms for 100 animals.
    """
    try:
        service = EnhancedAnimalService(cursor)
        results = service.get_bulk_enhanced(request.animal_ids)

        # Always return list, even if empty
        return results or []

    except Exception as e:
        logger.exception(f"Error in bulk enhanced fetch for {len(request.animal_ids)} animals")
        handle_database_error(e, "get_bulk_enhanced")


@router.post(
    "/enhanced/attributes",
    response_model=AttributesResponse,
    summary="Get specific attributes",
    description="Fetch only specific enhanced attributes for filtering",
)
async def get_attributes(request: AttributesRequest, cursor: RealDictCursor = Depends(get_pooled_db_cursor)) -> AttributesResponse:
    """
    Fetch specific attributes for one or more animals.

    Use cases:
    - Filter system population
    - Attribute-based matching
    - Minimal data transfer for UI components

    Returns only requested attributes to minimize payload.
    """
    try:
        service = EnhancedAnimalService(cursor)
        attribute_data = service.get_attributes(request.animal_ids, request.attributes)

        return AttributesResponse(
            data=attribute_data,
            requested_attributes=request.attributes,
            animals_found=len(attribute_data),
        )

    except Exception as e:
        logger.exception(f"Error fetching attributes for {len(request.animal_ids)} animals")
        handle_database_error(e, "get_attributes")


@router.get(
    "/enhanced/stats",
    summary="Get enhanced data statistics",
    description="Statistics about LLM data coverage and quality",
)
async def get_enhanced_stats(
    organization_id: int | None = Query(None, ge=1),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
) -> dict[str, Any]:
    """
    Get statistics about enhanced data coverage.

    Useful for monitoring data quality and coverage.
    """
    try:
        base_query = """
            SELECT 
                COUNT(*) as total_animals,
                COUNT(CASE 
                    WHEN dog_profiler_data IS NOT NULL 
                    AND dog_profiler_data != '{}'::jsonb 
                    THEN 1 
                END) as enhanced_count,
                COUNT(CASE 
                    WHEN dog_profiler_data->>'description' IS NOT NULL 
                    THEN 1 
                END) as with_description,
                COUNT(CASE 
                    WHEN dog_profiler_data->>'tagline' IS NOT NULL 
                    THEN 1 
                END) as with_tagline,
                AVG(CASE 
                    WHEN dog_profiler_data->>'quality_score' IS NOT NULL 
                    THEN (dog_profiler_data->>'quality_score')::float 
                END) as avg_quality_score
            FROM animals
            WHERE status = 'available'
            AND active = true
        """

        params = []
        if organization_id:
            base_query += " AND organization_id = %s"
            params.append(organization_id)

        cursor.execute(base_query, params)
        result = cursor.fetchone()

        total = result["total_animals"] or 0
        enhanced = result["enhanced_count"] or 0

        return {
            "total_animals": total,
            "enhanced_animals": enhanced,
            "coverage_percentage": (enhanced / total * 100) if total > 0 else 0,
            "with_description": result["with_description"] or 0,
            "with_tagline": result["with_tagline"] or 0,
            "average_quality_score": round(result["avg_quality_score"] or 0, 2),
            "organization_id": organization_id,
        }

    except Exception as e:
        logger.exception("Error fetching enhanced data statistics")
        handle_database_error(e, "get_enhanced_stats")


@router.get(
    "/enhanced/metrics",
    summary="Get service metrics",
    description="Get comprehensive metrics for monitoring and observability",
)
async def get_enhanced_metrics(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
) -> dict[str, Any]:
    """
    Get comprehensive metrics for the enhanced animals service.

    Includes:
    - Cache hit rates and sizes
    - Database query counts
    - Response time percentiles
    - Error counts
    """
    try:
        service = EnhancedAnimalService(cursor)
        return service.get_metrics()

    except Exception as e:
        logger.exception("Error fetching enhanced service metrics")
        return {
            "error": str(e),
            "cache_stats": {},
            "cache_hits": {},
            "cache_misses": {},
            "db_queries": {},
            "db_retries": {},
            "errors": {},
            "response_times": {},
        }
