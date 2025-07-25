import json
import logging
from typing import List, Optional

import psycopg2
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extras import RealDictCursor
from pydantic import ValidationError

from api.database import create_batch_executor
from api.dependencies import get_db_cursor
from api.exceptions import APIException, handle_database_error, handle_validation_error, safe_execute
from api.models.dog import Animal, AnimalImage, AnimalWithImages
from api.models.requests import AnimalFilterCountRequest, AnimalFilterRequest
from api.models.responses import FilterCountsResponse
from api.services import AnimalService
from api.utils.json_parser import build_organization_object, parse_json_field

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["animals"])


@safe_execute("fetch animal images")
def fetch_animal_images(cursor: RealDictCursor, animal_id: int) -> List[AnimalImage]:
    """Fetch images for a specific animal."""
    cursor.execute(
        """
        SELECT id, image_url, is_primary
        FROM animal_images
        WHERE animal_id = %s
        ORDER BY is_primary DESC, id ASC
        """,
        (animal_id,),
    )
    return cursor.fetchall()


@router.get("/", response_model=List[AnimalWithImages])
async def get_animals(
    filters: AnimalFilterRequest = Depends(),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get all animals with filtering, pagination, and location support."""
    try:
        animal_service = AnimalService(cursor)
        return animal_service.get_animals(filters)

    except ValidationError as ve:
        handle_validation_error(ve, "get_animals")
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_animals")
    except APIException:
        # Re-raise APIException from service layer without modification
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in get_animals: {e}")
        raise APIException(status_code=500, detail=f"Internal server error in get_animals", error_code="INTERNAL_ERROR")


# --- Meta Endpoints ---
@router.get("/meta/breeds", response_model=List[str])
async def get_distinct_breeds(
    breed_group: Optional[str] = Query(None),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get distinct standardized breeds, optionally filtered by breed group."""
    try:
        animal_service = AnimalService(cursor)
        return animal_service.get_distinct_breeds(breed_group)
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_distinct_breeds")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct breeds: {e}")
        raise APIException(status_code=500, detail="Failed to fetch breed list", error_code="INTERNAL_ERROR")


@router.get("/meta/breed_groups", response_model=List[str])
async def get_distinct_breed_groups(cursor: RealDictCursor = Depends(get_db_cursor)):
    """Get distinct breed groups."""
    try:
        animal_service = AnimalService(cursor)
        return animal_service.get_distinct_breed_groups()
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_distinct_breed_groups")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct breed groups: {e}")
        raise APIException(status_code=500, detail="Failed to fetch breed group list", error_code="INTERNAL_ERROR")


# --- NEW: Location Countries Meta Endpoint ---
@router.get(
    "/meta/location_countries",
    response_model=List[str],
    summary="Get Distinct Location Countries",
)
async def get_distinct_location_countries(
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get a distinct list of countries where organizations are located."""
    try:
        # Query distinct, non-null, non-empty countries from the organizations
        # table
        cursor.execute(
            """
            SELECT DISTINCT country
            FROM organizations
            WHERE country IS NOT NULL AND country != '' AND active = TRUE
            ORDER BY country ASC
            """
        )
        results = cursor.fetchall()
        # Extract the country name from each dictionary in the results
        countries = [row["country"] for row in results]
        return countries
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_distinct_location_countries")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct location countries: {e}")
        raise APIException(status_code=500, detail="Failed to fetch location countries", error_code="INTERNAL_ERROR")


# --- END NEW ---


# --- NEW: Available-To Countries Meta Endpoint ---
@router.get(
    "/meta/available_countries",
    response_model=List[str],
    summary="Get Distinct Available-To Countries",
)
async def get_distinct_available_countries(
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get a distinct list of countries organizations can adopt to (from service_regions)."""
    try:
        # Query distinct, non-null, non-empty countries from the service_regions table
        # Also join with organizations to ensure we only consider active orgs
        cursor.execute(
            """
            SELECT DISTINCT sr.country
            FROM service_regions sr
            JOIN organizations o ON sr.organization_id = o.id
            WHERE sr.country IS NOT NULL AND sr.country != '' AND o.active = TRUE
            ORDER BY sr.country ASC
            """
        )
        results = cursor.fetchall()
        countries = [row["country"] for row in results]
        return countries
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_distinct_available_countries")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct available countries: {e}")
        raise APIException(status_code=500, detail="Failed to fetch available countries", error_code="INTERNAL_ERROR")


# --- END NEW ---


# --- NEW: Available-To Regions Meta Endpoint ---
@router.get(
    "/meta/available_regions",
    response_model=List[str],
    summary="Get Distinct Available-To Regions for a Country",
)
async def get_distinct_available_regions(
    country: str = Query(..., description="Country to get regions for"),  # Make country required
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get a distinct list of regions within a specific country organizations can adopt to."""
    try:
        # Query distinct regions from organizations service_regions JSONB field
        cursor.execute(
            """
            SELECT DISTINCT jsonb_array_elements_text(service_regions) as region
            FROM organizations
            WHERE country = %s AND service_regions IS NOT NULL AND active = TRUE
            ORDER BY region ASC
            """,
            (country,),  # Pass the country as a parameter
        )
        results = cursor.fetchall()
        regions = [row["region"] for row in results]
        return regions
    except psycopg2.Error as db_err:
        handle_database_error(db_err, f"get_distinct_available_regions({country})")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct available regions for {country}: {e}")
        raise APIException(status_code=500, detail=f"Failed to fetch available regions for {country}", error_code="INTERNAL_ERROR")


# --- END NEW ---


# --- Filter Counts Meta Endpoint ---
@router.get("/meta/filter_counts", response_model=FilterCountsResponse)
async def get_filter_counts(
    filters: AnimalFilterCountRequest = Depends(),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """
    Get dynamic counts for each filter option based on current filter context.

    Only returns options that have at least one matching animal to prevent
    dead-end filtering scenarios. This endpoint enables the frontend to show
    real-time filter counts like "Large (12)" and hide options with 0 results.
    """
    try:
        animal_service = AnimalService(cursor)
        return animal_service.get_filter_counts(filters)

    except ValidationError as ve:
        handle_validation_error(ve, "get_filter_counts")
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_filter_counts")
    except APIException:
        # Re-raise APIException from service layer without modification
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in get_filter_counts: {e}")
        raise APIException(status_code=500, detail="Failed to fetch filter counts", error_code="INTERNAL_ERROR")


# --- Statistics Endpoint ---
@router.get("/statistics", summary="Get aggregated statistics")
async def get_statistics(
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get aggregated statistics about available dogs and organizations."""
    try:
        animal_service = AnimalService(cursor)
        return animal_service.get_statistics()

    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_statistics")
    except APIException:
        # Re-raise APIException from service layer without modification
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in get_statistics: {e}")
        raise APIException(status_code=500, detail="Failed to fetch statistics", error_code="INTERNAL_ERROR")


# --- Random Animal Endpoint ---
@router.get("/random", response_model=List[Animal], summary="Get Random Animals")
async def get_random_animals(
    limit: int = Query(3, ge=1, le=10, description="Number of random animals to return"),
    # Removed animal_type query parameter as we always want dogs
    status: Optional[str] = Query("available", description="Animal status"),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get random available dogs for featured section."""
    try:
        query = """
            SELECT id, name, slug, animal_type, breed, standardized_breed, age_text, age_min_months, age_max_months, sex, size, standardized_size, status, primary_image_url, adoption_url, organization_id, external_id, language, properties, created_at, updated_at, last_scraped_at
            FROM animals
            WHERE animal_type = 'dog' AND status = %s
            ORDER BY RANDOM()
            LIMIT %s
        """
        params = [status, limit]

        cursor.execute(query, params)
        animals = cursor.fetchall()
        return animals
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_random_animals")
    except Exception as e:
        logger.exception(f"Unexpected error fetching random animals: {e}")
        raise APIException(status_code=500, detail="Failed to fetch random animals", error_code="INTERNAL_ERROR")


# --- Single Animal Detail (New Slug-Based Route) ---
@router.get("/{animal_slug}", response_model=AnimalWithImages)
async def get_animal_by_slug(animal_slug: str, cursor: RealDictCursor = Depends(get_db_cursor)):
    """Get a specific animal by slug, with legacy ID redirect support."""
    try:
        animal_service = AnimalService(cursor)

        # Check if it's a numeric ID (legacy route)
        if animal_slug.isdigit():
            animal_id = int(animal_slug)
            animal = animal_service.get_animal_by_id(animal_id)
            if animal and hasattr(animal, "slug"):
                # 301 redirect to new slug URL
                from fastapi.responses import RedirectResponse

                return RedirectResponse(url=f"/api/animals/{animal.slug}", status_code=301)

        # Lookup by slug
        animal = animal_service.get_animal_by_slug(animal_slug)

        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")

        return animal

    except HTTPException:
        raise
    except ValidationError as ve:
        handle_validation_error(ve, f"get_animal_by_slug({animal_slug})")
    except psycopg2.Error as db_err:
        handle_database_error(db_err, f"get_animal_by_slug({animal_slug})")
    except APIException:
        # Re-raise APIException from service layer without modification
        raise
    except Exception as e:
        logger.exception(f"Unexpected error fetching animal {animal_slug}: {e}")
        raise APIException(status_code=500, detail=f"Internal server error fetching animal {animal_slug}", error_code="INTERNAL_ERROR")


# --- Legacy ID Route (Explicit Redirect) ---
@router.get("/id/{animal_id}", response_model=AnimalWithImages)
async def get_animal_by_id_legacy(animal_id: int, cursor: RealDictCursor = Depends(get_db_cursor)):
    """Legacy endpoint - redirects to slug URL."""
    try:
        animal_service = AnimalService(cursor)
        animal = animal_service.get_animal_by_id(animal_id)

        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")

        # 301 redirect to new slug URL
        from fastapi.responses import RedirectResponse

        return RedirectResponse(url=f"/api/animals/{animal.slug}", status_code=301)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error in legacy animal ID redirect {animal_id}: {e}")
        raise APIException(status_code=500, detail="Internal server error", error_code="INTERNAL_ERROR")
