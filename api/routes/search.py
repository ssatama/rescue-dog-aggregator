import psycopg2
from fastapi import APIRouter, Depends, Query
from psycopg2.extras import RealDictCursor

from api.dependencies import get_pooled_db_cursor
from api.exceptions import handle_database_error
from api.models.responses import SuggestResponse
from api.services import search_service

router = APIRouter(tags=["search"])


@router.get("/suggest", response_model=SuggestResponse)
async def get_suggestions(
    q: str = Query("", max_length=100, description="What the visitor has typed so far; empty returns popular breeds"),
    limit: int = Query(5, ge=1, le=10, description="Maximum results per group"),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """Breeds (with synonyms), rescues, dogs by name and filter phrases matching q."""
    try:
        return search_service.suggest(cursor, q, limit)
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_suggestions")
