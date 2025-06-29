import json
import logging
from typing import List, Optional

import psycopg2
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extras import RealDictCursor
from pydantic import ValidationError

from api.dependencies import get_db_cursor
from api.models.dog import Animal, AnimalImage, AnimalWithImages

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(tags=["animals"])


def fetch_animal_images(cursor: RealDictCursor, animal_id: int) -> List[AnimalImage]:
    images = []
    try:
        cursor.execute(
            """
            SELECT id, image_url, is_primary
            FROM animal_images
            WHERE animal_id = %s
            ORDER BY is_primary DESC, id ASC
            """,
            (animal_id,),
        )
        images = cursor.fetchall()
    except psycopg2.Error as db_err:
        logger.error(f"DB error fetching images for animal {animal_id}: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching images for animal {animal_id}: {e}")
    return images


@router.get("/", response_model=List[AnimalWithImages])
async def get_animals(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    breed: Optional[str] = Query(None),
    standardized_breed: Optional[str] = Query(None),
    breed_group: Optional[str] = Query(None),
    sex: Optional[str] = Query(None),
    size: Optional[str] = Query(None),
    standardized_size: Optional[str] = Query(None),
    age_category: Optional[str] = Query(None),
    animal_type: Optional[str] = Query("dog"),
    status: Optional[str] = Query("available"),
    location_country: Optional[str] = Query(
        None, description="Filter by the country the animal is located in"
    ),
    available_to_country: Optional[str] = Query(
        None, description="Filter by country the animal can be adopted to"
    ),
    available_to_region: Optional[str] = Query(
        None,
        description="Filter by region within a country the animal can be adopted to",
    ),
    organization_id: Optional[int] = Query(None),
    availability_confidence: Optional[str] = Query(
        "high,medium",
        description="Filter by availability confidence: 'high', 'medium', 'low', or 'all'",
    ),
    curation_type: Optional[str] = Query(
        "random",
        description="Curation type: 'recent' (last 7 days), 'diverse' (one per org), or 'random' (default)",
    ),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get all animals with filtering, pagination, and location support."""
    try:
        # Base query selects distinct animals and joins with organizations
        # Use 'a' alias for animals and 'o' for organizations
        query_base = """
            SELECT DISTINCT a.id, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                   a.age_text, a.age_min_months, a.age_max_months, a.sex, a.size, a.standardized_size,
                   a.status, a.primary_image_url, a.adoption_url, a.organization_id, a.external_id,
                   a.language, a.properties, a.created_at, a.updated_at, a.last_scraped_at,
                   a.availability_confidence, a.last_seen_at, a.consecutive_scrapes_missing,
                   o.name as org_name,
                   o.city as org_city,
                   o.country as org_country,
                   o.website_url as org_website_url,
                   o.social_media as org_social_media,
                   o.ships_to as org_ships_to
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
        """
        # Conditionally join service_regions if needed for filtering
        joins = ""
        conditions = [
            "a.animal_type = %s",
            "o.active = TRUE",
        ]  # Always filter by type and active org
        params = [animal_type]

        # --- NEW: Add JOIN for service_regions if filtering by available_to ---
        if available_to_country or available_to_region:
            joins += " JOIN service_regions sr ON a.organization_id = sr.organization_id"
        # --- END NEW ---

        # Add status filter if provided
        if status and status != "all":
            conditions.append("a.status = %s")
            params.append(status)

        # Add availability confidence filter
        if availability_confidence and availability_confidence != "all":
            confidence_levels = [level.strip() for level in availability_confidence.split(",")]
            if len(confidence_levels) == 1:
                conditions.append("a.availability_confidence = %s")
                params.append(confidence_levels[0])
            else:
                # Multiple confidence levels
                placeholders = ",".join(["%s"] * len(confidence_levels))
                conditions.append(f"a.availability_confidence IN ({placeholders})")
                params.extend(confidence_levels)

        # Add search filter (name or breed)
        if search:
            conditions.append(
                "(a.name ILIKE %s OR a.breed ILIKE %s OR a.standardized_breed ILIKE %s)"
            )
            search_term = f"%{search}%"
            params.extend([search_term, search_term, search_term])

        # Add breed filters
        if breed:
            conditions.append("a.breed = %s")
            params.append(breed)
        if standardized_breed:
            conditions.append("a.standardized_breed = %s")
            params.append(standardized_breed)
        if breed_group:
            conditions.append("a.breed_group = %s")
            params.append(breed_group)

        # Add sex filter
        if sex:
            conditions.append("a.sex = %s")
            params.append(sex)

        # Add size filters
        if size:
            conditions.append("a.size = %s")
            params.append(size)
        if standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(standardized_size)

        # Add age category filter (maps category to month ranges)
        if age_category:
            age_conditions = []
            if age_category == "Puppy":  # < 12 months
                age_conditions.append("(a.age_max_months < 12)")
            elif age_category == "Young":  # 12 to 36 months
                age_conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif age_category == "Adult":  # 36 to 96 months (3 to 8 years)
                age_conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif age_category == "Senior":  # > 96 months (8+ years)
                age_conditions.append("(a.age_min_months >= 96)")
            if age_conditions:
                conditions.append(f"({' OR '.join(age_conditions)})")

        # Add organization ID filter
        if organization_id:
            conditions.append("a.organization_id = %s")
            params.append(str(organization_id))

        # --- NEW: Location Filters ---
        if location_country:
            # Filter based on the organization's location
            conditions.append("o.country = %s")
            params.append(location_country)

        if available_to_country:
            # Filter based on service_regions country
            conditions.append("sr.country = %s")
            params.append(available_to_country)

        if available_to_region and available_to_country:  # Region only makes sense with country
            # Filter based on service_regions region
            conditions.append("sr.region = %s")
            params.append(available_to_region)
        # --- END NEW ---

        # Construct the where clause
        where_clause = " AND ".join(conditions)

        # Handle different curation types
        if curation_type == "recent":
            # Get dogs created in the last 7 days, ordered by created_at DESC
            conditions.append("a.created_at >= NOW() - INTERVAL '7 days'")
            where_clause = " AND ".join(conditions)
            query = f"{query_base}{joins} WHERE {where_clause} ORDER BY a.created_at DESC, a.id DESC LIMIT %s OFFSET %s"
        elif curation_type == "diverse":
            # Get one dog per organization using DISTINCT ON
            # Note: DISTINCT ON requires the ORDER BY to start with the distinct columns
            query = f"""
                SELECT DISTINCT ON (a.organization_id)
                       a.id, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                       a.age_text, a.age_min_months, a.age_max_months, a.sex, a.size, a.standardized_size,
                       a.status, a.primary_image_url, a.adoption_url, a.organization_id, a.external_id,
                       a.language, a.properties, a.created_at, a.updated_at, a.last_scraped_at,
                       a.availability_confidence, a.last_seen_at, a.consecutive_scrapes_missing,
                       o.name as org_name,
                       o.city as org_city,
                       o.country as org_country,
                       o.website_url as org_website_url,
                       o.social_media as org_social_media,
                       o.ships_to as org_ships_to
                FROM animals a
                LEFT JOIN organizations o ON a.organization_id = o.id
                {joins}
                WHERE {where_clause}
                ORDER BY a.organization_id, RANDOM()
                LIMIT %s OFFSET %s
            """
        else:
            # Default "random" behavior - order by last_scraped_at DESC
            query = f"{query_base}{joins} WHERE {where_clause} ORDER BY a.last_scraped_at DESC, a.id DESC LIMIT %s OFFSET %s"

        params.extend([str(limit), str(offset)])

        logger.debug(f"Executing query: {query} with params: {params}")
        cursor.execute(query, tuple(params))
        animal_rows = cursor.fetchall()
        logger.info(f"Found {len(animal_rows)} animals matching criteria.")

        animals_with_images = []
        for row in animal_rows:
            # Convert row to dictionary for manipulation
            row_dict = dict(row)

            # Parse JSON properties
            if isinstance(row_dict.get("properties"), str):
                try:
                    row_dict["properties"] = json.loads(row_dict["properties"])
                except json.JSONDecodeError:
                    row_dict["properties"] = {}
            elif row_dict.get("properties") is None:
                row_dict["properties"] = {}

            # Parse social_media JSONB - handle both string and dict cases
            org_social_media = row_dict.get("org_social_media")
            if isinstance(org_social_media, str):
                try:
                    org_social_media = json.loads(org_social_media)
                except json.JSONDecodeError:
                    logger.warning(f"Could not parse social_media JSON: {org_social_media}")
                    org_social_media = {}
            elif org_social_media is None:
                org_social_media = {}
            # If it's already a dict, keep it as is

            # Parse ships_to JSONB - handle both string and array cases
            org_ships_to = row_dict.get("org_ships_to")
            if isinstance(org_ships_to, str):
                try:
                    org_ships_to = json.loads(org_ships_to)
                except json.JSONDecodeError:
                    logger.warning(f"Could not parse ships_to JSON: {org_ships_to}")
                    org_ships_to = []
            elif org_ships_to is None:
                org_ships_to = []
            # If it's already a list, keep it as is

            # Build nested organization
            organization = None
            if row_dict.get("org_name"):
                organization = {
                    "id": row_dict["organization_id"],
                    "name": row_dict["org_name"],
                    "city": row_dict["org_city"],
                    "country": row_dict["org_country"],
                    "website_url": row_dict["org_website_url"],
                    "social_media": org_social_media,  # Now properly parsed
                    "ships_to": org_ships_to,  # Now properly parsed
                }

            # Strip out raw org_* keys and add organization
            clean = {k: v for k, v in row_dict.items() if not k.startswith("org_")}
            clean["organization"] = organization

            # Fetch images
            images = fetch_animal_images(cursor, clean["id"])
            animals_with_images.append(AnimalWithImages(**clean, images=images))

        return animals_with_images

    except ValidationError as ve:
        logger.error(f"Validation error in get_animals: {ve}")
        raise HTTPException(status_code=422, detail=f"Validation error: {ve}")
    except psycopg2.Error as db_err:
        logger.error(f"Database error in get_animals: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database query error: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error in get_animals: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# --- Meta Endpoints ---
@router.get("/meta/breeds", response_model=List[str])
async def get_distinct_breeds(
    breed_group: Optional[str] = Query(None),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get distinct standardized breeds, optionally filtered by breed group."""
    try:
        query = """
            SELECT DISTINCT standardized_breed
            FROM animals
            WHERE standardized_breed IS NOT NULL
              AND standardized_breed != ''
              AND standardized_breed NOT IN ('Yes', 'No', 'Unknown')
              AND LENGTH(standardized_breed) > 1
              AND status = 'available'
        """
        params = []

        if breed_group and breed_group != "Any group":
            query += " AND properties->>'breed_group' = %s"
            params.append(breed_group)

        query += " ORDER BY standardized_breed"

        cursor.execute(query, tuple(params))
        breeds = [row["standardized_breed"] for row in cursor.fetchall()]
        return breeds
    except Exception as e:
        logger.error(f"Error fetching distinct breeds: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch breed list")


@router.get("/meta/breed_groups", response_model=List[str])
async def get_distinct_breed_groups(cursor: RealDictCursor = Depends(get_db_cursor)):
    """Get distinct breed groups."""
    try:
        # First try getting breed groups from the properties field
        cursor.execute(
            """
            SELECT DISTINCT properties->>'breed_group' as breed_group
            FROM animals
            WHERE properties->>'breed_group' IS NOT NULL
              AND properties->>'breed_group' != ''
              AND properties->>'breed_group' NOT IN ('Unknown')
              AND status = 'available'
            ORDER BY breed_group
        """
        )

        groups = [row["breed_group"] for row in cursor.fetchall()]

        # If no breed groups found, return default list
        if not groups:
            return [
                "Sporting",
                "Hound",
                "Working",
                "Terrier",
                "Toy",
                "Non-Sporting",
                "Herding",
                "Mixed",
            ]

        return groups
    except Exception as e:
        logger.error(f"Error fetching distinct breed groups: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch breed group list")


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
        logger.error(f"Database error fetching distinct location countries: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct location countries: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
        logger.error(f"Database error fetching distinct available countries: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct available countries: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
        # Query distinct, non-null, non-empty regions for the specified country
        # Also join with organizations to ensure we only consider active orgs
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
        logger.error(f"Database error fetching distinct available regions for {country}: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching distinct available regions for {country}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# --- END NEW ---


# --- Statistics Endpoint ---
@router.get("/statistics", summary="Get aggregated statistics")
async def get_statistics(
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get aggregated statistics about available dogs and organizations."""
    try:
        stats = {}

        # Get total available dogs count
        cursor.execute(
            """
            SELECT COUNT(*) as total
            FROM animals
            WHERE status = 'available'
              AND availability_confidence IN ('high', 'medium')
            """
        )
        stats["total_dogs"] = cursor.fetchone()["total"]

        # Get total active organizations count
        cursor.execute(
            """
            SELECT COUNT(*) as total
            FROM organizations
            WHERE active = TRUE
            """
        )
        stats["total_organizations"] = cursor.fetchone()["total"]

        # Get countries with dog counts
        cursor.execute(
            """
            SELECT o.country, COUNT(a.id) as count
            FROM animals a
            JOIN organizations o ON a.organization_id = o.id
            WHERE a.status = 'available'
              AND a.availability_confidence IN ('high', 'medium')
              AND o.active = TRUE
              AND o.country IS NOT NULL
            GROUP BY o.country
            ORDER BY count DESC, o.country ASC
            """
        )
        stats["countries"] = [
            {"country": row["country"], "count": row["count"]} for row in cursor.fetchall()
        ]

        # Get organizations with dog counts and all required fields
        cursor.execute(
            """
            SELECT o.id, o.name, o.logo_url, o.country, o.city, o.ships_to, o.service_regions,
                   o.social_media, o.website_url, o.description,
                   COUNT(a.id) as dog_count,
                   COUNT(CASE WHEN a.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week
            FROM organizations o
            LEFT JOIN animals a ON o.id = a.organization_id
                AND a.status = 'available'
                AND a.availability_confidence IN ('high', 'medium')
            WHERE o.active = TRUE
            GROUP BY o.id, o.name, o.logo_url, o.country, o.city, o.ships_to, o.service_regions,
                     o.social_media, o.website_url, o.description
            HAVING COUNT(a.id) > 0
            ORDER BY dog_count DESC, o.name ASC
            """
        )
        stats["organizations"] = [
            {
                "id": row["id"],
                "name": row["name"],
                "dog_count": row["dog_count"],
                "new_this_week": row["new_this_week"],
                "logo_url": row["logo_url"],
                "country": row["country"],
                "city": row["city"],
                "ships_to": row["ships_to"],
                "service_regions": row["service_regions"],
                "social_media": row["social_media"],
                "website_url": row["website_url"],
                "description": row["description"],
            }
            for row in cursor.fetchall()
        ]

        return stats

    except psycopg2.Error as db_err:
        logger.error(f"Database error in get_statistics: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database query error: {str(db_err)}")
    except Exception as e:
        logger.exception(f"Unexpected error in get_statistics: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


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
            SELECT id, name, animal_type, breed, standardized_breed, age_text, age_min_months, age_max_months, sex, size, standardized_size, status, primary_image_url, adoption_url, organization_id, external_id, language, properties, created_at, updated_at, last_scraped_at
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
        logger.error(f"Database error fetching random animals: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching random animals: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# --- Single Animal Detail ---
@router.get("/{animal_id}", response_model=AnimalWithImages)
async def get_animal_by_id(animal_id: int, cursor: RealDictCursor = Depends(get_db_cursor)):
    """Get a specific animal by ID, including its images."""
    try:
        cursor.execute(
            """
            SELECT a.id, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                   a.age_text, a.age_min_months, a.age_max_months,
                   a.sex, a.size, a.standardized_size, a.status, a.properties,
                   a.primary_image_url, a.adoption_url, a.created_at, a.updated_at,
                   a.organization_id, a.external_id, a.language, a.last_scraped_at,
                   o.name as org_name,
                   o.city as org_city,
                   o.country as org_country,
                   o.website_url as org_website_url,
                   o.social_media as org_social_media,
                   o.ships_to as org_ships_to,
                   o.logo_url as org_logo_url,
                   o.service_regions as org_service_regions,
                   o.description as org_description,
                   COUNT(a2.id) as org_total_dogs,
                   COUNT(CASE WHEN a2.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as org_new_this_week
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            LEFT JOIN animals a2 ON o.id = a2.organization_id
                AND a2.status = 'available'
                AND a2.availability_confidence IN ('high', 'medium')
            WHERE a.id = %s
            GROUP BY a.id, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                     a.age_text, a.age_min_months, a.age_max_months,
                     a.sex, a.size, a.standardized_size, a.status, a.properties,
                     a.primary_image_url, a.adoption_url, a.created_at, a.updated_at,
                     a.organization_id, a.external_id, a.language, a.last_scraped_at,
                     o.id, o.name, o.city, o.country, o.website_url, o.social_media,
                     o.ships_to, o.logo_url, o.service_regions, o.description
            """,
            (animal_id,),
        )
        animal_dict = cursor.fetchone()

        if not animal_dict:
            raise HTTPException(status_code=404, detail="Animal not found")

        # Fetch images
        animal_images = fetch_animal_images(cursor, animal_id)

        # Convert to dictionary and clean up
        clean_dict = dict(animal_dict)

        # Parse properties JSON
        if isinstance(clean_dict.get("properties"), str):
            try:
                clean_dict["properties"] = json.loads(clean_dict["properties"])
            except json.JSONDecodeError:
                logger.warning(f"Could not parse properties JSON for animal {animal_id}")
                clean_dict["properties"] = {}
        elif clean_dict.get("properties") is None:
            clean_dict["properties"] = {}

        # Parse social_media JSONB - handle both string and dict cases
        org_social_media = clean_dict.get("org_social_media")
        if isinstance(org_social_media, str):
            try:
                org_social_media = json.loads(org_social_media)
            except json.JSONDecodeError:
                logger.warning(f"Could not parse social_media JSON for animal {animal_id}")
                org_social_media = {}
        elif org_social_media is None:
            org_social_media = {}

        # Parse ships_to JSONB - handle both string and array cases
        org_ships_to = clean_dict.get("org_ships_to")
        if isinstance(org_ships_to, str):
            try:
                org_ships_to = json.loads(org_ships_to)
            except json.JSONDecodeError:
                logger.warning(f"Could not parse ships_to JSON for animal {animal_id}")
                org_ships_to = []
        elif org_ships_to is None:
            org_ships_to = []

        # Parse service_regions JSONB - handle both string and array cases
        org_service_regions = clean_dict.get("org_service_regions")
        if isinstance(org_service_regions, str):
            try:
                org_service_regions = json.loads(org_service_regions)
            except json.JSONDecodeError:
                logger.warning(f"Could not parse service_regions JSON for animal {animal_id}")
                org_service_regions = []
        elif org_service_regions is None:
            org_service_regions = []

        # Build organization data
        organization_data = None
        if clean_dict.get("org_name"):
            organization_data = {
                "id": clean_dict["organization_id"],
                "name": clean_dict["org_name"],
                "city": clean_dict["org_city"],
                "country": clean_dict["org_country"],
                "website_url": clean_dict["org_website_url"],
                "social_media": org_social_media,  # Now properly parsed
                "ships_to": org_ships_to,  # Now properly parsed
                "logo_url": clean_dict["org_logo_url"],
                "service_regions": org_service_regions,  # Now properly parsed
                "description": clean_dict["org_description"],
                "total_dogs": clean_dict["org_total_dogs"],
                "new_this_week": clean_dict["org_new_this_week"],
                "recent_dogs": [],  # Will be populated by separate query if needed
            }

        # Remove org_ prefixed fields and add nested organization
        final_dict = {k: v for k, v in clean_dict.items() if not k.startswith("org_")}
        final_dict["organization"] = organization_data

        # Create and return the model
        animal = AnimalWithImages(**final_dict, images=animal_images)
        return animal

    except HTTPException:
        raise
    except ValidationError as ve:
        logger.error(f"Validation error for animal ID {animal_id}: {ve}")
        raise HTTPException(status_code=422, detail=f"Validation error: {ve}")
    except psycopg2.Error as db_err:
        logger.error(f"Database error fetching animal ID {animal_id}: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database query error: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching animal ID {animal_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
