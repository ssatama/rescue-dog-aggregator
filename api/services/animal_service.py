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
from api.exceptions import APIException
from api.models.dog import AnimalWithImages
from api.models.requests import AnimalFilterCountRequest, AnimalFilterRequest
from api.models.responses import FilterCountsResponse, FilterOption
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
            # Handle recent_with_fallback curation type specially
            if filters.curation_type == "recent_with_fallback":
                return self._get_animals_with_fallback(filters)

            # Build the query for other curation types
            query, params = self._build_animals_query(filters)

            # Execute query
            logger.debug(f"Executing query: {query} with params: {params}")
            self.cursor.execute(query, tuple(params))
            animal_rows = self.cursor.fetchall()
            logger.info(f"Found {len(animal_rows)} animals matching criteria.")

            return self._build_animals_response(animal_rows)

        except Exception as e:
            logger.error(f"Error in get_animals: {e}")
            raise APIException(status_code=500, detail="Failed to fetch animals", error_code="INTERNAL_ERROR")

    def _get_animals_with_fallback(self, filters: AnimalFilterRequest) -> List[AnimalWithImages]:
        """
        Get animals with recent_with_fallback curation logic.

        First tries to get dogs from last 7 days. If empty, falls back to latest available dogs.

        Args:
            filters: Filter criteria with curation_type="recent_with_fallback"

        Returns:
            List of animals with their images
        """
        # First attempt: try recent dogs (last 7 days)
        recent_filters = filters.model_copy()
        recent_filters.curation_type = "recent"

        query, params = self._build_animals_query(recent_filters)
        logger.debug(f"Executing recent query: {query} with params: {params}")
        self.cursor.execute(query, tuple(params))
        animal_rows = self.cursor.fetchall()

        if len(animal_rows) > 0:
            logger.info(f"Found {len(animal_rows)} recent animals (normal case)")
            return self._build_animals_response(animal_rows)

        # Fallback: get latest available dogs (no time restriction)
        logger.info("No recent animals found, falling back to latest available")
        fallback_filters = filters.model_copy()
        fallback_filters.curation_type = "random"  # Use default ordering (latest first)

        fallback_query, fallback_params = self._build_animals_query(fallback_filters)
        logger.debug(f"Executing fallback query: {fallback_query} with params: {fallback_params}")
        self.cursor.execute(fallback_query, tuple(fallback_params))
        fallback_rows = self.cursor.fetchall()

        logger.info(f"Found {len(fallback_rows)} animals in fallback")
        return self._build_animals_response(fallback_rows)

    def _build_animals_response(self, animal_rows) -> List[AnimalWithImages]:
        """
        Build AnimalWithImages response from database rows.

        Args:
            animal_rows: Database query results

        Returns:
            List of animals with their images
        """
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
                SELECT a.id, a.slug, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                       a.age_text, a.age_min_months, a.age_max_months,
                       a.sex, a.size, a.standardized_size, a.status, a.properties,
                       a.primary_image_url, a.adoption_url, a.created_at, a.updated_at,
                       a.organization_id, a.external_id, a.language, a.last_scraped_at,
                       o.name as org_name,
                       o.slug as org_slug,
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
                GROUP BY a.id, a.slug, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                         a.age_text, a.age_min_months, a.age_max_months,
                         a.sex, a.size, a.standardized_size, a.status, a.properties,
                         a.primary_image_url, a.adoption_url, a.created_at, a.updated_at,
                         a.organization_id, a.external_id, a.language, a.last_scraped_at,
                         o.id, o.slug, o.name, o.city, o.country, o.website_url, o.social_media,
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

    def get_animal_by_slug(self, slug: str) -> Optional[AnimalWithImages]:
        """
        Get a specific animal by slug.

        Args:
            slug: Slug of the animal to fetch

        Returns:
            Animal with images or None if not found
        """
        try:
            query = """
                SELECT a.id, a.slug, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                       a.age_text, a.age_min_months, a.age_max_months,
                       a.sex, a.size, a.standardized_size, a.status, a.properties,
                       a.primary_image_url, a.adoption_url, a.created_at, a.updated_at,
                       a.organization_id, a.external_id, a.language, a.last_scraped_at,
                       o.name as org_name,
                       o.slug as org_slug,
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
                WHERE a.slug = %s
                GROUP BY a.id, a.slug, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                         a.age_text, a.age_min_months, a.age_max_months,
                         a.sex, a.size, a.standardized_size, a.status, a.properties,
                         a.primary_image_url, a.adoption_url, a.created_at, a.updated_at,
                         a.organization_id, a.external_id, a.language, a.last_scraped_at,
                         o.id, o.slug, o.name, o.city, o.country, o.website_url, o.social_media,
                         o.ships_to, o.logo_url, o.service_regions, o.description
            """
            self.cursor.execute(query, (slug,))
            animal_dict = self.cursor.fetchone()

            if not animal_dict:
                return None

            # Fetch images using batch executor
            animal_id = animal_dict["id"]
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
            logger.error(f"Error in get_animal_by_slug({slug}): {e}")
            raise APIException(status_code=500, detail=f"Failed to fetch animal {slug}", error_code="INTERNAL_ERROR")

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
                SELECT o.id, o.name, o.slug, o.logo_url, o.country, o.city, o.ships_to, o.service_regions,
                       o.social_media, o.website_url, o.description,
                       COUNT(a.id) as dog_count,
                       COUNT(CASE WHEN a.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as new_this_week
                FROM organizations o
                LEFT JOIN animals a ON o.id = a.organization_id
                    AND a.status = 'available'
                    AND a.availability_confidence IN ('high', 'medium')
                WHERE o.active = TRUE
                GROUP BY o.id, o.name, o.slug, o.logo_url, o.country, o.city, o.ships_to, o.service_regions,
                         o.social_media, o.website_url, o.description
                HAVING COUNT(a.id) > 0
                ORDER BY dog_count DESC, o.name ASC
            """
            )
            stats["organizations"] = [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "slug": row["slug"],
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
            SELECT DISTINCT a.id, a.slug, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                   a.age_text, a.age_min_months, a.age_max_months, a.sex, a.size, a.standardized_size,
                   a.status, a.primary_image_url, a.adoption_url, a.organization_id, a.external_id,
                   a.language, a.properties, a.created_at, a.updated_at, a.last_scraped_at,
                   a.availability_confidence, a.last_seen_at, a.consecutive_scrapes_missing,
                   o.name as org_name,
                   o.slug as org_slug,
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
            if filters.age_category == "Puppy":
                conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                conditions.append("(a.age_min_months >= 96)")

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

        # Build ORDER BY clause based on sort parameter
        def get_order_clause():
            if filters.sort == "name-asc":
                return "ORDER BY a.name ASC, a.id ASC"
            elif filters.sort == "name-desc":
                return "ORDER BY a.name DESC, a.id DESC"
            elif filters.sort == "oldest":
                return "ORDER BY a.created_at ASC, a.id ASC"
            else:  # newest (default)
                return "ORDER BY a.created_at DESC, a.id DESC"

        # Handle different curation types
        if filters.curation_type == "recent":
            conditions.append("a.created_at >= NOW() - INTERVAL '7 days'")
            where_clause = " AND ".join(conditions)
            order_clause = get_order_clause()
            query = f"{query_base}{joins} WHERE {where_clause} {order_clause} LIMIT %s OFFSET %s"
        elif filters.curation_type == "diverse":
            # For diverse curation, maintain original random ordering per organization
            query = f"""
                SELECT DISTINCT ON (a.organization_id)
                       a.id, a.slug, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                       a.age_text, a.age_min_months, a.age_max_months, a.sex, a.size, a.standardized_size,
                       a.status, a.primary_image_url, a.adoption_url, a.organization_id, a.external_id,
                       a.language, a.properties, a.created_at, a.updated_at, a.last_scraped_at,
                       a.availability_confidence, a.last_seen_at, a.consecutive_scrapes_missing,
                       o.name as org_name,
                       o.slug as org_slug,
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
            order_clause = get_order_clause()
            query = f"{query_base}{joins} WHERE {where_clause} {order_clause} LIMIT %s OFFSET %s"

        params.extend([filters.limit, filters.offset])

        return query, params

    def get_filter_counts(self, filters: AnimalFilterCountRequest) -> FilterCountsResponse:
        """
        Get counts for each filter option based on current filter context.

        Only returns options that have at least one matching animal to prevent
        dead-end filtering scenarios.

        Args:
            filters: Current filter context for counting

        Returns:
            FilterCountsResponse with counts for each available option
        """
        try:
            response = FilterCountsResponse()

            # Build base query conditions for context
            base_conditions, base_params = self._build_count_base_conditions(filters)

            # Get size counts
            response.size_options = self._get_size_counts(base_conditions, base_params, filters)

            # Get age counts
            response.age_options = self._get_age_counts(base_conditions, base_params, filters)

            # Get sex counts
            response.sex_options = self._get_sex_counts(base_conditions, base_params, filters)

            # Get breed counts (limit to top breeds to avoid overwhelming response)
            response.breed_options = self._get_breed_counts(base_conditions, base_params, filters)

            # Get organization counts
            response.organization_options = self._get_organization_counts(base_conditions, base_params, filters)

            # Get location country counts
            response.location_country_options = self._get_location_country_counts(base_conditions, base_params, filters)

            # Get available country counts
            response.available_country_options = self._get_available_country_counts(base_conditions, base_params, filters)

            # Get available region counts (if country is selected)
            if filters.available_to_country:
                response.available_region_options = self._get_available_region_counts(base_conditions, base_params, filters)

            return response

        except Exception as e:
            logger.error(f"Error in get_filter_counts: {e}")
            raise APIException(status_code=500, detail="Failed to fetch filter counts", error_code="INTERNAL_ERROR")

    def _build_count_base_conditions(self, filters: AnimalFilterCountRequest) -> tuple[List[str], List[Any]]:
        """Build base WHERE conditions for filter counting queries."""
        conditions = [
            "a.animal_type = %s",
            "o.active = TRUE",
        ]
        params = [filters.animal_type]

        # Add status filter
        if filters.status and filters.status != "all":
            if hasattr(filters.status, "value"):
                conditions.append("a.status = %s")
                params.append(filters.status.value)
            else:
                conditions.append("a.status = %s")
                params.append(filters.status)

        # Add confidence filter
        confidence_levels = filters.get_confidence_levels()
        if confidence_levels:
            if len(confidence_levels) == 1:
                conditions.append("a.availability_confidence = %s")
                params.append(confidence_levels[0])
            else:
                placeholders = ",".join(["%s"] * len(confidence_levels))
                conditions.append(f"a.availability_confidence IN ({placeholders})")
                params.extend(confidence_levels)

        # Add search filter
        if filters.search:
            conditions.append("(a.name ILIKE %s OR a.breed ILIKE %s OR a.standardized_breed ILIKE %s)")
            search_term = f"%{filters.search}%"
            params.extend([search_term, search_term, search_term])

        # Add other filters (excluding the one we're counting)
        if filters.breed:
            conditions.append("a.breed = %s")
            params.append(filters.breed)

        if filters.standardized_breed:
            conditions.append("a.standardized_breed = %s")
            params.append(filters.standardized_breed)

        if filters.breed_group:
            conditions.append("a.breed_group = %s")
            params.append(filters.breed_group)

        if filters.location_country:
            conditions.append("o.country = %s")
            params.append(filters.location_country)

        if filters.organization_id:
            conditions.append("a.organization_id = %s")
            params.append(filters.organization_id)

        return conditions, params

    def _get_size_counts(self, base_conditions: List[str], base_params: List[Any], filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get counts for each size option, excluding current size filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Don't include current size filter in the count query
        # Add other non-size filters
        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)

        if filters.age_category:
            if filters.age_category == "Puppy":
                conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                conditions.append("(a.age_min_months >= 96)")

        query = f"""
            SELECT a.standardized_size, COUNT(*) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE {' AND '.join(conditions)}
              AND a.standardized_size IS NOT NULL
            GROUP BY a.standardized_size
            HAVING COUNT(*) > 0
            ORDER BY 
                CASE a.standardized_size
                    WHEN 'Tiny' THEN 1
                    WHEN 'Small' THEN 2
                    WHEN 'Medium' THEN 3
                    WHEN 'Large' THEN 4
                    WHEN 'XLarge' THEN 5
                    ELSE 6
                END
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        # Map standardized sizes to UI labels
        size_labels = {"Tiny": "Tiny", "Small": "Small", "Medium": "Medium", "Large": "Large", "XLarge": "Extra Large"}

        return [FilterOption(value=row["standardized_size"], label=size_labels.get(row["standardized_size"], row["standardized_size"]), count=row["count"]) for row in results if row["count"] > 0]

    def _get_age_counts(self, base_conditions: List[str], base_params: List[Any], filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get counts for each age category, excluding current age filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Add other non-age filters
        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)

        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size.value)

        query = f"""
            SELECT 
                CASE 
                    WHEN a.age_max_months < 12 THEN 'Puppy'
                    WHEN a.age_min_months >= 12 AND a.age_max_months <= 36 THEN 'Young'
                    WHEN a.age_min_months >= 36 AND a.age_max_months <= 96 THEN 'Adult'
                    WHEN a.age_min_months >= 96 THEN 'Senior'
                    ELSE 'Unknown'
                END as age_category,
                COUNT(*) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE {' AND '.join(conditions)}
              AND a.age_min_months IS NOT NULL
              AND a.age_max_months IS NOT NULL
            GROUP BY 1
            HAVING COUNT(*) > 0
            ORDER BY 1
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [FilterOption(value=row["age_category"], label=row["age_category"], count=row["count"]) for row in results if row["age_category"] != "Unknown" and row["count"] > 0]

    def _get_sex_counts(self, base_conditions: List[str], base_params: List[Any], filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get counts for each sex option, excluding current sex filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Add other non-sex filters
        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size.value)

        if filters.age_category:
            if filters.age_category == "Puppy":
                conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                conditions.append("(a.age_min_months >= 96)")

        query = f"""
            SELECT a.sex, COUNT(*) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE {' AND '.join(conditions)}
              AND a.sex IS NOT NULL
            GROUP BY a.sex
            HAVING COUNT(*) > 0
            ORDER BY a.sex
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [FilterOption(value=row["sex"], label=row["sex"], count=row["count"]) for row in results if row["count"] > 0]

    def _get_breed_counts(self, base_conditions: List[str], base_params: List[Any], filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get counts for top breeds, excluding current breed filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Add other non-breed filters
        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)

        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size.value)

        if filters.age_category:
            if filters.age_category == "Puppy":
                conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                conditions.append("(a.age_min_months >= 96)")

        query = f"""
            SELECT a.standardized_breed, COUNT(*) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE {' AND '.join(conditions)}
              AND a.standardized_breed IS NOT NULL
              AND a.standardized_breed != ''
            GROUP BY a.standardized_breed
            HAVING COUNT(*) > 0
            ORDER BY count DESC, a.standardized_breed ASC
            LIMIT 20
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [FilterOption(value=row["standardized_breed"], label=row["standardized_breed"], count=row["count"]) for row in results if row["count"] > 0]

    def _get_organization_counts(self, base_conditions: List[str], base_params: List[Any], filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get counts for each organization, excluding current organization filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Add other non-organization filters
        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)

        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size.value)

        if filters.age_category:
            if filters.age_category == "Puppy":
                conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                conditions.append("(a.age_min_months >= 96)")

        query = f"""
            SELECT o.id, o.name, COUNT(*) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE {' AND '.join(conditions)}
            GROUP BY o.id, o.name
            HAVING COUNT(*) > 0
            ORDER BY o.name ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [FilterOption(value=str(row["id"]), label=row["name"], count=row["count"]) for row in results if row["count"] > 0]

    def _get_location_country_counts(self, base_conditions: List[str], base_params: List[Any], filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get counts for each location country, excluding current location country filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Add other non-location filters
        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)

        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size.value)

        if filters.age_category:
            if filters.age_category == "Puppy":
                conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                conditions.append("(a.age_min_months >= 96)")

        query = f"""
            SELECT o.country, COUNT(*) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE {' AND '.join(conditions)}
              AND o.country IS NOT NULL
              AND o.country != ''
            GROUP BY o.country
            HAVING COUNT(*) > 0
            ORDER BY o.country ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [FilterOption(value=row["country"], label=row["country"], count=row["count"]) for row in results if row["count"] > 0]

    def _get_available_country_counts(self, base_conditions: List[str], base_params: List[Any], filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get counts for each available-to country, excluding current available country filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Need to join with service_regions for this query
        if not filters.needs_service_region_join():
            # Add the join condition for this specific query
            pass

        # Add other non-available-country filters
        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)

        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size.value)

        if filters.age_category:
            if filters.age_category == "Puppy":
                conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                conditions.append("(a.age_min_months >= 96)")

        query = f"""
            SELECT sr.country, COUNT(DISTINCT a.id) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            JOIN service_regions sr ON a.organization_id = sr.organization_id
            WHERE {' AND '.join(conditions)}
              AND sr.country IS NOT NULL
              AND sr.country != ''
            GROUP BY sr.country
            HAVING COUNT(DISTINCT a.id) > 0
            ORDER BY sr.country ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [FilterOption(value=row["country"], label=row["country"], count=row["count"]) for row in results if row["count"] > 0]

    def _get_available_region_counts(self, base_conditions: List[str], base_params: List[Any], filters: AnimalFilterCountRequest) -> List[FilterOption]:
        """Get counts for each available-to region for the selected country."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Add country filter for regions
        conditions.append("sr.country = %s")
        params.append(filters.available_to_country)

        # Add other non-region filters
        if filters.sex:
            conditions.append("a.sex = %s")
            params.append(filters.sex)

        if filters.standardized_size:
            conditions.append("a.standardized_size = %s")
            params.append(filters.standardized_size.value)

        if filters.age_category:
            if filters.age_category == "Puppy":
                conditions.append("(a.age_max_months < 12)")
            elif filters.age_category == "Young":
                conditions.append("(a.age_min_months >= 12 AND a.age_max_months <= 36)")
            elif filters.age_category == "Adult":
                conditions.append("(a.age_min_months >= 36 AND a.age_max_months <= 96)")
            elif filters.age_category == "Senior":
                conditions.append("(a.age_min_months >= 96)")

        query = f"""
            SELECT sr.region, COUNT(DISTINCT a.id) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            JOIN service_regions sr ON a.organization_id = sr.organization_id
            WHERE {' AND '.join(conditions)}
              AND sr.region IS NOT NULL
              AND sr.region != ''
            GROUP BY sr.region
            HAVING COUNT(DISTINCT a.id) > 0
            ORDER BY sr.region ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [FilterOption(value=row["region"], label=row["region"], count=row["count"]) for row in results if row["count"] > 0]
