# api/services/animal_service.py

"""
Animal service layer for business logic.

This module provides business logic for animal-related operations,
abstracting away database details and providing a clean API for routes.
"""

import logging
from typing import Any, Dict, List, Optional

from psycopg2.extras import RealDictCursor

from api.database import create_batch_executor
from api.exceptions import APIException, handle_database_error
from api.models.dog import Animal, AnimalWithImages
from api.models.requests import AnimalFilterRequest
from api.utils.json_parser import build_organization_object, parse_json_field

logger = logging.getLogger(__name__)


class AnimalService:
    """Service layer for animal operations."""

    def __init__(self, cursor: RealDictCursor):
        self.cursor = cursor
        self.batch_executor = create_batch_executor(cursor)

    def get_animals(self, filters: AnimalFilterRequest) -> List[AnimalWithImages]:
        """
        Get animals with filtering and pagination.

        Args:
            filters: Filter criteria for animals

        Returns:
            List of animals with their images
        """
        try:
            # Build the query
            query, params = self._build_animals_query(filters)

            # Execute query
            logger.debug(f"Executing query: {query} with params: {params}")
            self.cursor.execute(query, tuple(params))
            animal_rows = self.cursor.fetchall()
            logger.info(f"Found {len(animal_rows)} animals matching criteria.")

            # Extract animal IDs for batch operations
            animal_ids = [row["id"] for row in animal_rows]

            # Use batch executor to fetch images for all animals in one query
            images_by_animal = self.batch_executor.fetch_animals_with_images(animal_ids)

            # Build response with batch-fetched data
            animals_with_images = []
            for row in animal_rows:
                # Convert row to dictionary for manipulation
                row_dict = dict(row)

                # Parse JSON properties using utility function
                parse_json_field(row_dict, "properties")

                # Build nested organization using utility function
                organization = build_organization_object(row_dict)

                # Strip out raw org_* keys and add organization
                clean = {k: v for k, v in row_dict.items() if not k.startswith("org_")}
                clean["organization"] = organization

                # Get images from batch query results
                animal_id = clean["id"]
                images = images_by_animal.get(animal_id, [])
                animals_with_images.append(AnimalWithImages(**clean, images=images))

            return animals_with_images

        except Exception as e:
            logger.error(f"Error in get_animals: {e}")
            raise APIException(status_code=500, detail="Failed to fetch animals", error_code="INTERNAL_ERROR")

    def get_animal_by_id(self, animal_id: int) -> Optional[AnimalWithImages]:
        """
        Get a specific animal by ID.

        Args:
            animal_id: ID of the animal to fetch

        Returns:
            Animal with images or None if not found
        """
        try:
            query = """
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
            """

            self.cursor.execute(query, (animal_id,))
            animal_dict = self.cursor.fetchone()

            if not animal_dict:
                return None

            # Fetch images using batch executor
            images_by_animal = self.batch_executor.fetch_animals_with_images([animal_id])
            animal_images = images_by_animal.get(animal_id, [])

            # Process the animal data
            clean_dict = dict(animal_dict)

            # Parse properties JSON using utility function
            parse_json_field(clean_dict, "properties")

            # Build organization data using utility function
            organization_data = build_organization_object(clean_dict)

            # Add extra fields specific to this endpoint
            if organization_data:
                organization_data.update(
                    {
                        "total_dogs": clean_dict["org_total_dogs"],
                        "new_this_week": clean_dict["org_new_this_week"],
                        "recent_dogs": [],  # Will be populated by separate query if needed
                    }
                )

            # Remove org_ prefixed fields and add nested organization
            final_dict = {k: v for k, v in clean_dict.items() if not k.startswith("org_")}
            final_dict["organization"] = organization_data

            # Create and return the model
            return AnimalWithImages(**final_dict, images=animal_images)

        except Exception as e:
            logger.error(f"Error in get_animal_by_id({animal_id}): {e}")
            raise APIException(status_code=500, detail=f"Failed to fetch animal {animal_id}", error_code="INTERNAL_ERROR")

    def get_distinct_breeds(self, breed_group: Optional[str] = None) -> List[str]:
        """Get distinct standardized breeds."""
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

            self.cursor.execute(query, tuple(params))
            return [row["standardized_breed"] for row in self.cursor.fetchall()]

        except Exception as e:
            logger.error(f"Error in get_distinct_breeds: {e}")
            raise APIException(status_code=500, detail="Failed to fetch breed list", error_code="INTERNAL_ERROR")

    def get_distinct_breed_groups(self) -> List[str]:
        """Get distinct breed groups."""
        try:
            # First try getting breed groups from the properties field
            self.cursor.execute(
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

            groups = [row["breed_group"] for row in self.cursor.fetchall()]

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
            logger.error(f"Error in get_distinct_breed_groups: {e}")
            raise APIException(status_code=500, detail="Failed to fetch breed group list", error_code="INTERNAL_ERROR")

    def get_statistics(self) -> Dict[str, Any]:
        """Get aggregated statistics about animals and organizations."""
        try:
            stats = {}

            # Get total available dogs count
            self.cursor.execute(
                """
                SELECT COUNT(*) as total
                FROM animals
                WHERE status = 'available'
                  AND availability_confidence IN ('high', 'medium')
            """
            )
            stats["total_dogs"] = self.cursor.fetchone()["total"]

            # Get total active organizations count
            self.cursor.execute(
                """
                SELECT COUNT(*) as total
                FROM organizations
                WHERE active = TRUE
            """
            )
            stats["total_organizations"] = self.cursor.fetchone()["total"]

            # Get countries with dog counts
            self.cursor.execute(
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
            stats["countries"] = [{"country": row["country"], "count": row["count"]} for row in self.cursor.fetchall()]

            # Get organizations with statistics
            self.cursor.execute(
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
                for row in self.cursor.fetchall()
            ]

            return stats

        except Exception as e:
            logger.error(f"Error in get_statistics: {e}")
            raise APIException(status_code=500, detail="Failed to fetch statistics", error_code="INTERNAL_ERROR")

    def _build_animals_query(self, filters: AnimalFilterRequest) -> tuple[str, List[Any]]:
        """Build the animals query with filters."""
        # Base query selects distinct animals and joins with organizations
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
        ]
        params = [filters.animal_type]

        # Add JOIN for service_regions if filtering by available_to
        if filters.needs_service_region_join():
            joins += " JOIN service_regions sr ON a.organization_id = sr.organization_id"

        # Add all filter conditions
        if filters.status and filters.status != "all":
            if hasattr(filters.status, "value"):
                conditions.append("a.status = %s")
                params.append(filters.status.value)
            else:
                conditions.append("a.status = %s")
                params.append(filters.status)

        confidence_levels = filters.get_confidence_levels()
        if confidence_levels:
            if len(confidence_levels) == 1:
                conditions.append("a.availability_confidence = %s")
                params.append(confidence_levels[0])
            else:
                placeholders = ",".join(["%s"] * len(confidence_levels))
                conditions.append(f"a.availability_confidence IN ({placeholders})")
                params.extend(confidence_levels)

        if filters.search:
            conditions.append("(a.name ILIKE %s OR a.breed ILIKE %s OR a.standardized_breed ILIKE %s)")
            search_term = f"%{filters.search}%"
            params.extend([search_term, search_term, search_term])

        if filters.breed:
            conditions.append("a.breed = %s")
            params.append(filters.breed)

        if filters.standardized_breed:
            conditions.append("a.standardized_breed = %s")
            params.append(filters.standardized_breed)

        if filters.breed_group:
            conditions.append("a.breed_group = %s")
            params.append(filters.breed_group)

        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)

        if filters.size:
            conditions.append("a.size = %s")
            params.append(filters.size)

        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size.value)

        if filters.age_category:
            age_conditions = []
            if filters.age_category == "Puppy":
                age_conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                age_conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                age_conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                age_conditions.append("(a.age_min_months >= 96)")
            if age_conditions:
                conditions.append(f"({' OR '.join(age_conditions)})")

        if filters.organization_id:
            conditions.append("a.organization_id = %s")
            params.append(str(filters.organization_id))

        if filters.location_country:
            conditions.append("o.country = %s")
            params.append(filters.location_country)

        if filters.available_to_country:
            conditions.append("sr.country = %s")
            params.append(filters.available_to_country)

        if filters.available_to_region and filters.available_to_country:
            conditions.append("sr.region = %s")
            params.append(filters.available_to_region)

        # Build WHERE clause
        where_clause = " AND ".join(conditions)

        # Handle different curation types
        if filters.curation_type == "recent":
            conditions.append("a.created_at >= NOW() - INTERVAL '7 days'")
            where_clause = " AND ".join(conditions)
            query = f"{query_base}{joins} WHERE {where_clause} ORDER BY a.created_at DESC, a.id DESC LIMIT %s OFFSET %s"
        elif filters.curation_type == "diverse":
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
            query = f"{query_base}{joins} WHERE {where_clause} ORDER BY a.last_scraped_at DESC, a.id DESC LIMIT %s OFFSET %s"

        params.extend([filters.limit, filters.offset])

        return query, params
