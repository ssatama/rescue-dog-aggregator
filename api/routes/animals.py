import logging

import psycopg2
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from psycopg2.extras import RealDictCursor
from pydantic import ValidationError

from api.dependencies import get_pooled_db_cursor
from api.exceptions import APIException, handle_database_error, handle_validation_error
from api.models.dog import Animal
from api.models.requests import AnimalFilterCountRequest, AnimalFilterRequest
from api.models.responses import BreedStatsResponse, FilterCountsResponse
from api.services import AnimalService

logger = logging.getLogger(__name__)

router = APIRouter(tags=["animals"])


@router.get("/", response_model=list[Animal])
async def get_animals(
    filters: AnimalFilterRequest = Depends(),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """Get all animals with filtering, pagination, and location support."""
    try:
        animal_service = AnimalService(cursor)

        # Use specialized sitemap filtering when requested for SEO optimization
        if filters.sitemap_quality_filter:
            return animal_service.get_animals_for_sitemap(filters)

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
        # In development, return the actual error for debugging
        import os

        if os.getenv("ENV", "development") == "development":
            raise HTTPException(status_code=500, detail="Internal server error")
        else:
            raise APIException(
                status_code=500,
                detail="Internal server error in get_animals",
                error_code="INTERNAL_ERROR",
            )


# --- Meta Endpoints ---
@router.get("/meta/breeds", response_model=list[str])
async def get_distinct_breeds(
    breed_group: str | None = Query(None),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """Get distinct standardized breeds, optionally filtered by breed group."""
    try:
        animal_service = AnimalService(cursor)
        return animal_service.get_distinct_breeds(breed_group)
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_distinct_breeds")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct breeds: {e}")
        raise APIException(
            status_code=500,
            detail="Failed to fetch breed list",
            error_code="INTERNAL_ERROR",
        )


@router.get("/meta/breed_groups", response_model=list[str])
async def get_distinct_breed_groups(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """Get distinct breed groups."""
    try:
        animal_service = AnimalService(cursor)
        return animal_service.get_distinct_breed_groups()
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_distinct_breed_groups")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct breed groups: {e}")
        raise APIException(
            status_code=500,
            detail="Failed to fetch breed group list",
            error_code="INTERNAL_ERROR",
        )


# --- NEW: Location Countries Meta Endpoint ---
@router.get(
    "/meta/location_countries",
    response_model=list[str],
    summary="Get Distinct Location Countries",
)
async def get_distinct_location_countries(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
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
        raise APIException(
            status_code=500,
            detail="Failed to fetch location countries",
            error_code="INTERNAL_ERROR",
        )


# --- END NEW ---


# --- NEW: Available-To Countries Meta Endpoint ---
@router.get(
    "/meta/available_countries",
    response_model=list[str],
    summary="Get Distinct Available-To Countries",
)
async def get_distinct_available_countries(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
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
        raise APIException(
            status_code=500,
            detail="Failed to fetch available countries",
            error_code="INTERNAL_ERROR",
        )


# --- END NEW ---


# --- NEW: Available-To Regions Meta Endpoint ---
@router.get(
    "/meta/available_regions",
    response_model=list[str],
    summary="Get Distinct Available-To Regions for a Country",
)
async def get_distinct_available_regions(
    country: str = Query(..., description="Country to get regions for"),  # Make country required
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """Get a distinct list of regions within a specific country organizations can adopt to."""
    try:
        # Query distinct regions from service_regions table for consistency
        cursor.execute(
            """
            SELECT DISTINCT sr.region
            FROM service_regions sr
            JOIN organizations o ON sr.organization_id = o.id
            WHERE sr.country = %s AND sr.region IS NOT NULL AND sr.region != '' AND o.active = TRUE
            ORDER BY sr.region ASC
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
        raise APIException(
            status_code=500,
            detail=f"Failed to fetch available regions for {country}",
            error_code="INTERNAL_ERROR",
        )


# --- END NEW ---


# --- Breed Statistics Endpoint ---
@router.get("/breeds/stats", response_model=BreedStatsResponse, summary="Get Breed Statistics")
async def get_breed_stats(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """
    Get breed statistics including total dogs, unique breeds, breed groups distribution,
    and qualifying breeds with 15+ dogs.

    Returns:
        Breed statistics including:
        - total_dogs: Total number of available dogs
        - unique_breeds: Count of unique primary breeds
        - breed_groups: Distribution of breed groups
        - qualifying_breeds: Breeds with 15+ dogs including personality traits and demographics
    """
    try:
        service = AnimalService(cursor)
        stats = service.get_breed_stats()
        return stats
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_breed_stats")
    except Exception as e:
        logger.exception(f"Unexpected error fetching breed statistics: {e}")
        raise APIException(
            status_code=500,
            detail="Failed to fetch breed statistics",
            error_code="INTERNAL_ERROR",
        )


# --- Country Statistics Endpoint ---
@router.get("/stats/by-country", summary="Get Country Statistics")
async def get_stats_by_country(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """
    Get dog counts grouped by country for country hub pages.

    Returns:
        Country statistics including:
        - total: Total number of available dogs
        - countries: List of countries with dog counts and organization counts
    """
    try:
        query = """
            SELECT
                o.country as code,
                o.country as name,
                COUNT(a.id) as count,
                COUNT(DISTINCT a.organization_id) as organizations
            FROM animals a
            JOIN organizations o ON a.organization_id = o.id
            WHERE a.active = true AND o.active = true AND a.animal_type = 'dog'
            GROUP BY o.country
            ORDER BY COUNT(a.id) DESC
        """
        cursor.execute(query)
        countries = cursor.fetchall()

        total = sum(c["count"] for c in countries)

        return {
            "total": total,
            "countries": countries,
        }
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_stats_by_country")
    except Exception as e:
        logger.exception(f"Unexpected error fetching country statistics: {e}")
        raise APIException(
            status_code=500,
            detail="Failed to fetch country statistics",
            error_code="INTERNAL_ERROR",
        )


# --- Search Suggestions Endpoints ---
@router.get("/search/suggestions", response_model=list[str])
async def get_search_suggestions(
    q: str = Query(..., min_length=1, max_length=100, description="Search query"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of suggestions"),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """Get search suggestions for animal names based on query."""
    try:
        # Search in animal names for partial matches
        # Use LIKE patterns for efficient searching without requiring pg_trgm extension
        # Fix: Include ORDER BY expressions in SELECT for DISTINCT compatibility
        query = """
            SELECT DISTINCT 
                name,
                CASE 
                    WHEN LOWER(name) LIKE LOWER(%s) THEN 1
                    WHEN LOWER(name) LIKE LOWER(%s) THEN 2
                    ELSE 3
                END as priority,
                LENGTH(name) as name_length
            FROM animals
            WHERE
                animal_type = 'dog'
                AND status = 'available'
                AND active = true
                AND name IS NOT NULL
                AND (
                    LOWER(name) LIKE LOWER(%s)
                    OR LOWER(name) LIKE LOWER(%s)
                )
            ORDER BY priority, name_length, name
            LIMIT %s
        """

        # Create search patterns for SQL LIKE queries
        starts_with_pattern = f"{q}%"
        contains_pattern = f"%{q}%"

        params = [
            starts_with_pattern,  # Order by - starts with (highest priority)
            contains_pattern,  # Order by - contains (medium priority)
            starts_with_pattern,  # Starts with query
            contains_pattern,  # Contains query
            limit,
        ]

        cursor.execute(query, params)
        results = cursor.fetchall()
        suggestions = [row["name"] for row in results if row["name"]]
        return suggestions

    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_search_suggestions")
    except Exception as e:
        logger.exception(f"Unexpected error fetching search suggestions: {e}")
        raise APIException(
            status_code=500,
            detail="Failed to fetch search suggestions",
            error_code="INTERNAL_ERROR",
        )


@router.get("/breeds/with-images")
async def get_breeds_with_images(
    breed_type: str = Query(None, description="Filter by breed type (mixed, purebred, crossbreed)"),
    breed_group: str = Query(None, description="Filter by breed group"),
    min_count: int = Query(0, ge=0, description="Minimum number of dogs per breed"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of breeds to return"),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """
    Get breeds with sample dog images for the breeds overview page.

    Returns breeds with their counts and up to 3 sample dogs with images.
    """
    try:
        service = AnimalService(cursor)
        breeds = service.get_breeds_with_images(
            breed_type=breed_type,
            breed_group=breed_group,
            min_count=min_count,
            limit=limit,
        )
        return breeds
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_breeds_with_images")
    except Exception as e:
        logger.exception(f"Unexpected error fetching breeds with images: {e}")
        raise APIException(
            status_code=500,
            detail="Failed to fetch breeds with images",
            error_code="INTERNAL_ERROR",
        )


@router.get("/breeds/suggestions", response_model=list[str])
async def get_breed_suggestions(
    q: str = Query(..., min_length=1, max_length=100, description="Breed query"),
    limit: int = Query(5, ge=1, le=10, description="Maximum number of suggestions"),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """Get breed suggestions with fuzzy matching support."""
    try:
        # Search standardized breeds with LIKE pattern matching
        # Removed similarity() function to avoid requiring pg_trgm extension
        # Fix: Include ORDER BY expressions in SELECT for DISTINCT compatibility
        query = """
            SELECT DISTINCT 
                standardized_breed,
                CASE 
                    WHEN LOWER(standardized_breed) LIKE LOWER(%s) THEN 1
                    WHEN LOWER(standardized_breed) LIKE LOWER(%s) THEN 2
                    ELSE 3
                END as priority,
                LENGTH(standardized_breed) as breed_length
            FROM animals
            WHERE
                animal_type = 'dog'
                AND status = 'available'
                AND active = true
                AND standardized_breed IS NOT NULL
                AND standardized_breed != ''
                AND standardized_breed != 'Unknown'
                AND (
                    LOWER(standardized_breed) LIKE LOWER(%s)
                    OR LOWER(standardized_breed) LIKE LOWER(%s)
                )
            ORDER BY priority, breed_length, standardized_breed
            LIMIT %s
        """

        # Create search patterns
        starts_with_pattern = f"{q}%"
        contains_pattern = f"%{q}%"

        params = [
            starts_with_pattern,  # Order by - starts with (highest priority)
            contains_pattern,  # Order by - contains (medium priority)
            starts_with_pattern,  # Starts with query
            contains_pattern,  # Contains query
            limit,
        ]

        cursor.execute(query, params)
        results = cursor.fetchall()
        suggestions = [row["standardized_breed"] for row in results if row["standardized_breed"]]
        return suggestions

    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_breed_suggestions")
    except Exception as e:
        logger.exception(f"Unexpected error fetching breed suggestions: {e}")
        raise APIException(
            status_code=500,
            detail="Failed to fetch breed suggestions",
            error_code="INTERNAL_ERROR",
        )


# --- Filter Counts Meta Endpoint ---
@router.get("/meta/filter_counts", response_model=FilterCountsResponse)
async def get_filter_counts(
    filters: AnimalFilterCountRequest = Depends(),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
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
        raise APIException(
            status_code=500,
            detail="Failed to fetch filter counts",
            error_code="INTERNAL_ERROR",
        )


# --- Statistics Endpoint ---
@router.get("/statistics", summary="Get aggregated statistics")
async def get_statistics(
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
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
        raise APIException(
            status_code=500,
            detail="Failed to fetch statistics",
            error_code="INTERNAL_ERROR",
        )


# --- Random Animal Endpoint ---
@router.get("/random", response_model=list[Animal], summary="Get Random Animals")
async def get_random_animals(
    limit: int = Query(3, ge=1, le=10, description="Number of random animals to return"),
    # Removed animal_type query parameter as we always want dogs
    status: str | None = Query("available", description="Animal status"),
    cursor: RealDictCursor = Depends(get_pooled_db_cursor),
):
    """Get random available dogs for featured section."""
    try:
        query = """
            SELECT id, name, slug, animal_type, breed, standardized_breed, breed_group,
                   primary_breed, breed_type, breed_confidence, secondary_breed, breed_slug,
                   age_text, age_min_months, age_max_months, sex, size, standardized_size,
                   status, primary_image_url, adoption_url, organization_id, external_id,
                   language, properties, created_at, updated_at, last_scraped_at,
                   availability_confidence, last_seen_at, consecutive_scrapes_missing,
                   dog_profiler_data
            FROM animals
            WHERE animal_type = 'dog' AND status = %s AND active = true
            ORDER BY (abs(hashtext(id::text || to_char(now(), 'IYYY-IW'))) %% 1000)
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
        raise APIException(
            status_code=500,
            detail="Failed to fetch random animals",
            error_code="INTERNAL_ERROR",
        )


# --- Single Animal Detail (New Slug-Based Route) ---
@router.get("/{animal_slug}", response_model=Animal)
async def get_animal_by_slug(animal_slug: str, cursor: RealDictCursor = Depends(get_pooled_db_cursor)):
    """Get a specific animal by slug, with legacy ID redirect support."""
    try:
        animal_service = AnimalService(cursor)

        # Check if it's a numeric ID (legacy route)
        if animal_slug.isdigit():
            animal_id = int(animal_slug)
            animal = animal_service.get_animal_by_id(animal_id)
            if animal and hasattr(animal, "slug"):
                # 301 redirect to new slug URL
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
        raise APIException(
            status_code=500,
            detail=f"Internal server error fetching animal {animal_slug}",
            error_code="INTERNAL_ERROR",
        )


# --- Legacy ID Route (Explicit Redirect) ---
@router.get("/id/{animal_id}", response_model=Animal)
async def get_animal_by_id_legacy(animal_id: int, cursor: RealDictCursor = Depends(get_pooled_db_cursor)):
    """Legacy endpoint - redirects to slug URL."""
    try:
        animal_service = AnimalService(cursor)
        animal = animal_service.get_animal_by_id(animal_id)

        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")

        # 301 redirect to new slug URL
        return RedirectResponse(url=f"/api/animals/{animal.slug}", status_code=301)

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Error in legacy animal ID redirect {animal_id}: {e}")
        raise APIException(status_code=500, detail="Internal server error", error_code="INTERNAL_ERROR")
