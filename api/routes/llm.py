"""
API routes for LLM data service.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import logging

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query

from api.async_dependencies import get_async_db_connection
from api.auth import verify_admin_key
from api.exceptions import (
    STANDARD_RESPONSES,
    InvalidInputError,
    handle_database_error,
)

router = APIRouter(tags=["llm"], responses=STANDARD_RESPONSES, dependencies=[Depends(verify_admin_key)])

logger = logging.getLogger(__name__)


@router.get("/stats")
async def get_llm_stats(organization_id: int | None = Query(None), conn=Depends(get_async_db_connection)) -> dict:
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
