import psycopg2
import logging
from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
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
        logger.exception(
            f"Unexpected error fetching images for animal {animal_id}: {e}"
        )
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
                   a.language, a.properties, a.created_at, a.updated_at, a.last_scraped_at
            FROM animals a
            JOIN organizations o ON a.organization_id = o.id
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
            joins += (
                " JOIN service_regions sr ON a.organization_id = sr.organization_id"
            )
        # --- END NEW ---

        # Add status filter if provided
        if status:
            conditions.append("a.status = %s")
            params.append(status)

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
                age_conditions.append(
                    "(a.age_min_months >= 12 AND a.age_max_months <= 36)"
                )
            elif age_category == "Adult":  # 36 to 96 months (3 to 8 years)
                age_conditions.append(
                    "(a.age_min_months >= 36 AND a.age_max_months <= 96)"
                )
            elif age_category == "Senior":  # > 96 months (8+ years)
                age_conditions.append("(a.age_min_months >= 96)")
            if age_conditions:
                conditions.append(f"({' OR '.join(age_conditions)})")

        # Add organization ID filter
        if organization_id:
            conditions.append("a.organization_id = %s")
            params.append(organization_id)

        # --- NEW: Location Filters ---
        if location_country:
            # Filter based on the organization's location
            conditions.append("o.country = %s")
            params.append(location_country)

        if available_to_country:
            # Filter based on service_regions country
            conditions.append("sr.country = %s")
            params.append(available_to_country)

        if (
            available_to_region and available_to_country
        ):  # Region only makes sense with country
            # Filter based on service_regions region
            conditions.append("sr.region = %s")
            params.append(available_to_region)
        # --- END NEW ---

        # Construct the final query
        where_clause = " AND ".join(conditions)
        query = f"{query_base}{joins} WHERE {where_clause} ORDER BY a.last_scraped_at DESC, a.id DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        logger.debug(f"Executing query: {query} with params: {params}")
        cursor.execute(query, tuple(params))
        animal_rows = cursor.fetchall()
        logger.info(f"Found {len(animal_rows)} animals matching criteria.")

        # Fetch images for each animal and combine
        animals_with_images = []
        for animal_dict in animal_rows:
            try:
                animal_images = fetch_animal_images(cursor, animal_dict["id"])
                # Ensure properties is a dict, not string, before validation
                if isinstance(animal_dict.get("properties"), str):
                    try:
                        animal_dict["properties"] = json.loads(
                            animal_dict["properties"]
                        )
                    except json.JSONDecodeError:
                        logger.warning(
                            f"Could not parse properties JSON for animal {animal_dict['id']}, setting to empty dict."
                        )
                        animal_dict["properties"] = {}
                elif animal_dict.get("properties") is None:
                    animal_dict["properties"] = {}

                animal_model = AnimalWithImages(**animal_dict, images=animal_images)
                animals_with_images.append(animal_model)
            except ValidationError as animal_err:
                logger.warning(
                    f"Skipping animal {animal_dict.get('id', 'N/A')} due to validation error: {animal_err} for data {animal_dict}"
                )
            except Exception as fetch_err:
                logger.error(
                    f"Error processing animal {animal_dict.get('id', 'N/A')} after query: {fetch_err}"
                )

        return animals_with_images

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
        query = "SELECT DISTINCT standardized_breed FROM animals WHERE standardized_breed IS NOT NULL"
        params = []
        if breed_group:
            query += " AND breed_group = %s"
            params.append(breed_group)
        query += " ORDER BY standardized_breed"
        cursor.execute(query, tuple(params))
        breeds = [row["standardized_breed"] for row in cursor.fetchall()]
        return breeds
    except Exception as e:
        logger.error(f"Error fetching distinct breeds: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch breed list")


@router.get("/meta/breed_groups", response_model=List[str])
async def get_distinct_breed_groups(
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """Get distinct breed groups."""
    try:
        cursor.execute(
            "SELECT DISTINCT breed_group FROM animals WHERE breed_group IS NOT NULL ORDER BY breed_group"
        )
        groups = [row["breed_group"] for row in cursor.fetchall()]
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
        # Query distinct, non-null, non-empty countries from the organizations table
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
    country: str = Query(
        ..., description="Country to get regions for"
    ),  # Make country required
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
        logger.error(
            f"Database error fetching distinct available regions for {country}: {db_err}"
        )
        raise HTTPException(status_code=500, detail=f"Database error: {str(db_err)}")
    except Exception as e:
        logger.exception(
            f"Unexpected error fetching distinct available regions for {country}: {e}"
        )
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


# --- END NEW ---


# --- Random Animal Endpoint ---
@router.get("/random", response_model=List[Animal], summary="Get Random Animals")
async def get_random_animals(
    limit: int = Query(
        3, ge=1, le=10, description="Number of random animals to return"
    ),
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
async def get_animal_by_id(
    animal_id: int, cursor: RealDictCursor = Depends(get_db_cursor)
):
    """Get a specific animal by ID, including its images."""
    try:
        cursor.execute("SELECT * FROM animals WHERE id = %s", (animal_id,))
        animal_dict = cursor.fetchone()

        if not animal_dict:
            raise HTTPException(status_code=404, detail="Animal not found")

        # --- FIX: Fetch images BEFORE creating the final model ---
        animal_images = fetch_animal_images(cursor, animal_id)
        try:
            # Create AnimalWithImages directly
            animal = AnimalWithImages(**animal_dict, images=animal_images)
        except ValidationError as animal_err:
            logger.error(f"Validation error for animal ID {animal_id}: {animal_err}")
            raise HTTPException(
                status_code=500, detail="Error processing animal data from database."
            )
        # --- END FIX ---

        return animal

    except HTTPException as http_exc:
        raise http_exc
    except psycopg2.Error as db_err:
        logger.error(f"Database error fetching animal ID {animal_id}: {db_err}")
        raise HTTPException(status_code=500, detail=f"Database query error: {db_err}")
    except Exception as e:
        logger.exception(f"Unexpected error fetching animal ID {animal_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {e}")
