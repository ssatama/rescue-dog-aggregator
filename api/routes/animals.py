from fastapi import APIRouter, HTTPException, Query, Depends
from typing import List, Optional
from psycopg2.extras import RealDictCursor
import json
import logging  # Ensure logging is imported
import psycopg2
from pydantic import ValidationError

# *** IMPORT the central dependency ***
from api.dependencies import get_db_cursor

# Import AnimalWithImages as well
from api.models.dog import Animal, AnimalImage, AnimalWithImages

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Change prefix and tags
router = APIRouter(prefix="/api/animals", tags=["animals"])


# Helper to fetch images for an animal
def fetch_animal_images(cursor: RealDictCursor, animal_id: int) -> List[AnimalImage]:
    images = []
    try:
        cursor.execute(
            "SELECT id, animal_id, image_url, is_primary, created_at FROM animal_images WHERE animal_id = %s ORDER BY is_primary DESC, created_at DESC",
            (animal_id,),
        )
        image_rows = cursor.fetchall()
        for img_dict in image_rows:
            try:
                images.append(AnimalImage(**img_dict))
            except ValidationError as img_err:  # Catch Pydantic errors specifically
                logger.error(
                    f"Pydantic validation error for AnimalImage ID {img_dict.get('id')}: {img_err}\nData: {img_dict}"
                )
            except Exception as e:
                logger.error(
                    f"Unexpected error mapping row to AnimalImage model for image ID {img_dict.get('id')}: {e}\nData: {img_dict}"
                )

    except psycopg2.Error as db_err:  # Catch DB errors specifically
        logger.error(f"Database error fetching images for animal {animal_id}: {db_err}")
    except Exception as e:
        logger.error(f"Unexpected error fetching images for animal {animal_id}: {e}")
    return images


# --- Main Animal Listing ---
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
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    logger.info(f"--- get_animals received cursor: {id(cursor)} ---")  # Log cursor ID
    animals_to_return = []
    try:
        query = """
            SELECT id, name, animal_type, breed, standardized_breed, breed_group,
                   age_text, age_min_months, age_max_months, sex, size, standardized_size,
                   status, adoption_url, primary_image_url, organization_id, external_id,
                   properties, created_at, updated_at, last_scraped_at, language
            FROM animals
            WHERE 1=1
        """
        params = []

        # --- Filtering Logic ---
        if animal_type:
            query += " AND animal_type = %s"
            params.append(animal_type)
        if search:
            search_term = f"%{search}%"
            query += " AND (LOWER(name) LIKE LOWER(%s) OR LOWER(breed) LIKE LOWER(%s) OR LOWER(standardized_breed) LIKE LOWER(%s))"
            params.extend([search_term, search_term, search_term])
        if standardized_breed:
            query += " AND standardized_breed = %s"
            params.append(standardized_breed)
        elif breed:  # Only apply non-standardized breed if standardized isn't used
            query += " AND breed = %s"
            params.append(breed)
        if breed_group:
            query += " AND breed_group = %s"
            params.append(breed_group)
        if sex and sex.lower() != "any":
            query += " AND sex = %s"
            params.append(sex)
        if standardized_size and standardized_size.lower() != "any size":
            query += " AND standardized_size = %s"
            params.append(standardized_size)
        elif (
            size and size.lower() != "any size"
        ):  # Only apply non-standardized size if standardized isn't used
            query += " AND size = %s"
            params.append(size)
        if age_category and age_category.lower() != "any age":
            min_months, max_months = None, None
            if age_category == "Puppy":
                min_months, max_months = 0, 11
            elif age_category == "Young":
                min_months, max_months = 12, 35
            elif age_category == "Adult":
                min_months, max_months = 36, 83
            elif age_category == "Senior":
                min_months = 84
            # Apply age filters if valid range found
            if min_months is not None:
                query += " AND age_min_months >= %s"
                params.append(min_months)
            if max_months is not None:
                # Use age_max_months for upper bound check if available, else age_min_months
                query += " AND COALESCE(age_max_months, age_min_months) <= %s"
                params.append(max_months)
        if status:
            query += " AND status = %s"
            params.append(status)
        # --- End Filtering ---

        query += " ORDER BY updated_at DESC, created_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        logger.info(f"Executing query: {cursor.mogrify(query, tuple(params))}")
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

        for row_dict in rows:
            try:
                # Handle properties JSON string
                if "properties" in row_dict and isinstance(row_dict["properties"], str):
                    try:
                        row_dict["properties"] = json.loads(row_dict["properties"])
                    except json.JSONDecodeError:
                        logger.warning(
                            f"Could not decode properties JSON for animal ID {row_dict.get('id')}: {row_dict['properties']}"
                        )
                        row_dict["properties"] = {}
                elif "properties" not in row_dict:
                    row_dict["properties"] = {}

                # Create the base Animal object
                base_animal = Animal(**row_dict)

                # Fetch images
                fetched_images = fetch_animal_images(cursor, base_animal.id)

                # Determine the final primary image URL
                final_primary_image_url = base_animal.primary_image_url
                if not final_primary_image_url and fetched_images:
                    primary = next(
                        (img for img in fetched_images if img.is_primary), None
                    )
                    if primary:
                        final_primary_image_url = primary.image_url
                    elif fetched_images:
                        final_primary_image_url = fetched_images[0].image_url

                # Create AnimalWithImages using the corrected method
                animal_data_for_response = base_animal.model_dump()
                animal_data_for_response["primary_image_url"] = final_primary_image_url
                animal_data_for_response["images"] = fetched_images
                animal_with_images = AnimalWithImages(**animal_data_for_response)

                animals_to_return.append(animal_with_images)

            except ValidationError as pydantic_err:
                logger.error(
                    f"Pydantic validation error processing animal row ID {row_dict.get('id')}: {pydantic_err}\nData: {row_dict}"
                )
            except Exception as e:
                logger.error(
                    f"Unexpected error processing animal row ID {row_dict.get('id')}: {e}\nData: {row_dict}"
                )

    except psycopg2.Error as db_err:
        logger.exception(f"Database error fetching animals: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching animals")
    except Exception as e:
        logger.exception(f"Unexpected error fetching animals: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error fetching animals"
        )

    return animals_to_return


# --- Meta Endpoints ---
@router.get("/meta/breeds", response_model=List[str])
async def get_distinct_breeds(
    breed_group: Optional[str] = Query(None),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    breeds = []
    try:
        query = "SELECT DISTINCT standardized_breed FROM animals WHERE standardized_breed IS NOT NULL AND standardized_breed != ''"
        params = []
        if breed_group:
            query += " AND breed_group = %s"
            params.append(breed_group)
        query += " ORDER BY standardized_breed"
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        breeds = [row["standardized_breed"] for row in rows]
    except psycopg2.Error as db_err:
        logger.error(f"Database error fetching distinct breeds: {db_err}")
        raise HTTPException(status_code=500, detail="Database error fetching breeds")
    except Exception as e:
        logger.error(f"Unexpected error fetching distinct breeds: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error fetching breeds"
        )
    return breeds


@router.get("/meta/breed_groups", response_model=List[str])
async def get_distinct_breed_groups(
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    groups = []
    try:
        query = "SELECT DISTINCT breed_group FROM animals WHERE breed_group IS NOT NULL AND breed_group != '' ORDER BY breed_group"
        cursor.execute(query)
        rows = cursor.fetchall()
        groups = [row["breed_group"] for row in rows]
    except psycopg2.Error as db_err:
        logger.error(f"Database error fetching distinct breed groups: {db_err}")
        raise HTTPException(
            status_code=500, detail="Database error fetching breed groups"
        )
    except Exception as e:
        logger.error(f"Unexpected error fetching distinct breed groups: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error fetching breed groups"
        )
    return groups


# --- Random Animal Endpoint ---
@router.get("/random", response_model=List[Animal], summary="Get Random Animals")
async def get_random_animals(
    limit: int = Query(3, ge=1, le=10),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    logger.info(
        f"--- get_random_animals received cursor: {id(cursor)} ---"
    )  # Log cursor ID
    animals_data = []
    try:
        query = """
            SELECT
                a.id, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                a.age_text, a.age_min_months, a.age_max_months, a.sex, a.size, a.standardized_size,
                a.status, a.adoption_url, a.primary_image_url, a.organization_id, a.external_id,
                a.properties, a.created_at, a.updated_at, a.last_scraped_at, a.language,
                o.name as organization_name,
                o.city as organization_city,
                o.country as organization_country,
                o.website_url as organization_website_url,
                o.logo_url as organization_logo_url
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE a.animal_type = 'dog' AND a.status = 'available'
            ORDER BY RANDOM()
            LIMIT %(limit)s
        """
        cursor.execute(query, {"limit": limit})
        rows = cursor.fetchall()

        for animal_dict in rows:
            try:  # Add try block for each animal processing
                org_data = None
                if animal_dict.get("organization_id") is not None:
                    org_data = {
                        "id": animal_dict.get("organization_id"),
                        "name": animal_dict.get("organization_name"),
                        "city": animal_dict.get("organization_city"),
                        "country": animal_dict.get("organization_country"),
                        "website_url": animal_dict.get("organization_website_url"),
                        "logo_url": animal_dict.get("organization_logo_url"),
                    }

                properties_dict = {}
                raw_properties = animal_dict.get("properties")
                if isinstance(raw_properties, str):
                    try:
                        properties_dict = json.loads(raw_properties)
                    except json.JSONDecodeError:
                        logger.warning(
                            f"Could not decode properties JSON for random animal ID {animal_dict.get('id')}"
                        )
                        pass
                elif isinstance(raw_properties, dict):
                    properties_dict = raw_properties

                animal_model_data = {
                    "id": animal_dict.get("id"),
                    "name": animal_dict.get("name"),
                    "animal_type": animal_dict.get("animal_type"),
                    "breed": animal_dict.get("breed"),
                    "standardized_breed": animal_dict.get("standardized_breed"),
                    "breed_group": animal_dict.get("breed_group"),
                    "age_text": animal_dict.get("age_text"),
                    "age_min_months": animal_dict.get("age_min_months"),
                    "age_max_months": animal_dict.get("age_max_months"),
                    "sex": animal_dict.get("sex"),
                    "size": animal_dict.get("size"),
                    "standardized_size": animal_dict.get("standardized_size"),
                    "status": animal_dict.get("status"),
                    "adoption_url": animal_dict.get("adoption_url"),
                    "primary_image_url": animal_dict.get("primary_image_url"),
                    "organization_id": animal_dict.get("organization_id"),
                    "external_id": animal_dict.get("external_id"),
                    "properties": properties_dict,
                    "created_at": animal_dict.get("created_at"),
                    "updated_at": animal_dict.get("updated_at"),
                    "last_scraped_at": animal_dict.get("last_scraped_at"),
                    "language": animal_dict.get("language"),
                    "description": properties_dict.get("description"),
                    "organization": org_data,
                }

                # Use Animal model, not AnimalWithImages
                animal_obj = Animal(**animal_model_data)
                animals_data.append(animal_obj)

            except ValidationError as pydantic_err:
                logger.error(
                    f"Pydantic validation error for random animal ID {animal_dict.get('id')}: {pydantic_err}\nData: {animal_model_data}"
                )
            except Exception as e:
                logger.error(
                    f"Unexpected error creating Animal model for random animal ID {animal_dict.get('id')}: {e}\nData: {animal_model_data}"
                )

    except psycopg2.Error as db_err:
        logger.error(f"Database error fetching random animals: {db_err}")
        raise HTTPException(
            status_code=500, detail="Database error fetching random animals"
        )
    except Exception as e:
        logger.exception(f"Unexpected error fetching random animals: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error fetching random animals"
        )

    return animals_data


# --- Single Animal Detail ---
@router.get("/{animal_id}", response_model=AnimalWithImages)
async def get_animal_by_id(
    animal_id: int, cursor: RealDictCursor = Depends(get_db_cursor)
):
    logger.info(
        f"--- get_animal_by_id received cursor: {id(cursor)} ---"
    )  # Log cursor ID
    try:
        query = """
            SELECT id, name, animal_type, breed, standardized_breed, breed_group,
                   age_text, age_min_months, age_max_months, sex, size, standardized_size,
                   status, adoption_url, primary_image_url, organization_id, external_id,
                   properties, created_at, updated_at, last_scraped_at, language
            FROM animals
            WHERE id = %s
        """
        cursor.execute(query, (animal_id,))
        row_dict = cursor.fetchone()

        if not row_dict:
            raise HTTPException(
                status_code=404, detail=f"Animal with ID {animal_id} not found"
            )

        try:
            # Handle properties JSON string
            if "properties" in row_dict and isinstance(row_dict["properties"], str):
                try:
                    row_dict["properties"] = json.loads(row_dict["properties"])
                except json.JSONDecodeError:
                    logger.warning(
                        f"Could not decode properties JSON for animal ID {row_dict.get('id')}: {row_dict['properties']}"
                    )
                    row_dict["properties"] = {}
            elif "properties" not in row_dict:
                row_dict["properties"] = {}

            # Create base Animal object
            base_animal = Animal(**row_dict)

        except ValidationError as pydantic_err:
            logger.error(
                f"Pydantic validation error for animal ID {row_dict.get('id')}: {pydantic_err}\nData: {row_dict}"
            )
            raise HTTPException(status_code=500, detail="Error processing animal data")
        except Exception as e:
            logger.error(
                f"Unexpected error creating Animal model for ID {row_dict.get('id')}: {e}\nData: {row_dict}"
            )
            raise HTTPException(status_code=500, detail="Error processing animal data")

        # Fetch images
        fetched_images = fetch_animal_images(cursor, base_animal.id)

        # Determine the final primary image URL
        final_primary_image_url = base_animal.primary_image_url
        if not final_primary_image_url and fetched_images:
            primary = next((img for img in fetched_images if img.is_primary), None)
            if primary:
                final_primary_image_url = primary.image_url
            elif fetched_images:
                final_primary_image_url = fetched_images[0].image_url

        # Create AnimalWithImages using the corrected method
        animal_data_for_response = base_animal.model_dump()
        animal_data_for_response["primary_image_url"] = final_primary_image_url
        animal_data_for_response["images"] = fetched_images
        animal_with_images = AnimalWithImages(**animal_data_for_response)

        return animal_with_images

    except HTTPException as http_exc:
        raise http_exc
    except psycopg2.Error as db_err:
        logger.error(f"Database error fetching animal {animal_id}: {db_err}")
        raise HTTPException(
            status_code=500, detail="Internal server error fetching animal details"
        )
    except Exception as e:
        logger.exception(f"Unexpected error fetching animal {animal_id}: {e}")
        raise HTTPException(
            status_code=500, detail="Internal server error fetching animal details"
        )


# Helper function (if not already defined elsewhere)
def mapUiSizeToStandardized(uiSize):
    mapping = {
        "Tiny": "Tiny",
        "Small": "Small",
        "Medium": "Medium",
        "Large": "Large",
        "Extra Large": "XLarge",
    }
    return mapping.get(uiSize)
