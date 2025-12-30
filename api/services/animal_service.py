# api/services/animal_service.py

"""
Animal service layer for business logic.

This module provides business logic for animal-related operations,
abstracting away database details and providing a clean API for routes.
"""

import logging
import re
from typing import Any, Dict, List, Optional

from psycopg2.extras import RealDictCursor

from api.database import create_batch_executor
from api.exceptions import APIException
from api.models.dog import Animal
from api.models.requests import AnimalFilterCountRequest, AnimalFilterRequest
from api.models.responses import FilterCountsResponse, FilterOption
from api.utils.json_parser import build_organization_object, parse_json_field
from utils.breed_utils import generate_breed_slug

logger = logging.getLogger(__name__)


def _normalize_url(url: str | None) -> str | None:
    """Normalize protocol-relative URLs to HTTPS."""
    if url and url.startswith("//"):
        return "https:" + url
    return url


class AnimalService:
    """Service layer for animal operations."""

    def __init__(self, cursor: RealDictCursor):
        self.cursor = cursor
        self.batch_executor = create_batch_executor(cursor)

    def get_animals(self, filters: AnimalFilterRequest) -> List[Animal]:
        """
        Get animals with filtering and pagination.

        Args:
            filters: Filter criteria for animals

        Returns:
            List of animals with their images
        """
        try:
            # Apply server-side limit enforcement (max 1000 for security)
            # unless internal bypass is set (for sitemap/export)
            original_limit = filters.limit
            if (
                not getattr(filters, "internal_bypass_limit", False)
                and filters.limit > 1000
            ):
                filters.limit = 1000
                logger.info(f"Capped limit from {original_limit} to 1000 for security")

            # Handle recent_with_fallback curation type specially
            if filters.curation_type == "recent_with_fallback":
                return self._get_animals_with_fallback(filters)

            # Build the query for other curation types
            query, params = self._build_animals_query(filters)

            # Execute query
            logger.debug(f"Executing query: {query} with params: {params}")
            self.cursor.execute(query, params)
            animal_rows = self.cursor.fetchall()
            logger.info(f"Found {len(animal_rows)} animals matching criteria.")

            return self._build_animals_response(animal_rows)

        except Exception as e:
            logger.error(f"Error in get_animals: {e}", exc_info=True)
            logger.error(f"Error type: {type(e).__name__}")
            logger.error(
                f"Filter parameters: limit={filters.limit}, animal_type={filters.animal_type}, status={filters.status}"
            )
            if hasattr(e, "__dict__"):
                logger.error(f"Error details: {e.__dict__}")
            raise APIException(
                status_code=500,
                detail="Failed to fetch animals",
                error_code="INTERNAL_ERROR",
            )

    def get_animals_for_sitemap(self, filters: AnimalFilterRequest) -> List[Animal]:
        """
        Get animals filtered for sitemap generation with meaningful descriptions.

        This method applies quality filtering to only include animals with
        substantial descriptions (>200 characters) to improve SEO performance
        and Google crawl budget usage.

        Args:
            filters: Filter criteria for animals (sitemap_quality_filter should be True)

        Returns:
            List of animals with meaningful descriptions for sitemap inclusion
        """
        try:
            # Override limit for sitemap generation to include all dogs
            # Sitemaps need to include all available dogs for proper SEO
            original_limit = filters.limit
            filters.limit = 50000  # Google sitemap limit per file
            filters.internal_bypass_limit = True  # Bypass the 1000 limit cap

            # Get all animals matching base criteria
            animals = self.get_animals(filters)

            # Restore original limit
            filters.limit = original_limit
            filters.internal_bypass_limit = False

            # Apply description quality filtering if requested
            if filters.sitemap_quality_filter:
                return self._filter_by_description_quality(animals)

            return animals

        except Exception as e:
            logger.error(f"Error in get_animals_for_sitemap: {e}")
            raise APIException(
                status_code=500,
                detail="Failed to fetch animals for sitemap",
                error_code="INTERNAL_ERROR",
            )

    def _filter_by_description_quality(self, animals: List[Animal]) -> List[Animal]:
        """
        Filter animals by description quality for sitemap inclusion.

        Only includes animals with meaningful descriptions (>200 characters)
        to improve SEO performance and avoid wasting Google crawl budget on
        low-quality content.

        Quality criteria:
        - Description must exist and be non-null
        - Description must be longer than 200 characters (plain text)
        - Excludes common fallback patterns

        Args:
            animals: List of animals to filter

        Returns:
            Filtered list containing only animals with quality descriptions
        """
        quality_animals = []

        for animal in animals:
            # Get description from properties
            description = None
            if hasattr(animal, "properties") and animal.properties:
                description = animal.properties.get(
                    "description"
                ) or animal.properties.get("raw_description")

            # Skip if no description
            if not description or not isinstance(description, str):
                continue

            # Calculate plain text length (strip HTML if present)
            plain_text = self._strip_html_tags(description.strip())

            # Skip if too short
            if len(plain_text) < 200:
                continue

            # Skip if contains fallback patterns
            if self._is_fallback_content(plain_text):
                continue

            quality_animals.append(animal)

        logger.info(
            f"Filtered {len(animals)} animals to {len(quality_animals)} with quality descriptions for sitemap"
        )
        return quality_animals

    def _strip_html_tags(self, text: str) -> str:
        """
        Remove HTML tags from text for length calculation.

        Args:
            text: Text that may contain HTML

        Returns:
            Plain text with HTML tags removed
        """
        return re.sub(r"<[^>]+>", "", text)

    def _is_fallback_content(self, text: str) -> bool:
        """
        Check if text contains common fallback content patterns.

        Args:
            text: Plain text description

        Returns:
            True if text appears to be generic fallback content
        """
        # Convert to lowercase for pattern matching
        text_lower = text.lower()

        # Common fallback patterns to exclude
        fallback_patterns = [
            "looking for a loving forever home",
            "contact the rescue organization to learn more",
            "contact [organization] to learn more",
            "wonderful dog's personality, needs, and how you can provide",
            "ready to fly",
        ]

        # Check if text contains multiple fallback patterns (likely generated)
        pattern_count = sum(1 for pattern in fallback_patterns if pattern in text_lower)

        # If 2+ patterns match, likely fallback content
        return pattern_count >= 2

    def _get_animals_with_fallback(self, filters: AnimalFilterRequest) -> List[Animal]:
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
        logger.debug(
            f"Executing fallback query: {fallback_query} with params: {fallback_params}"
        )
        self.cursor.execute(fallback_query, tuple(fallback_params))
        fallback_rows = self.cursor.fetchall()

        logger.info(f"Found {len(fallback_rows)} animals in fallback")
        return self._build_animals_response(fallback_rows)

    def _build_animals_response(self, animal_rows) -> List[Animal]:
        """
        Build Animal response from database rows.

        Args:
            animal_rows: Database query results

        Returns:
            List of animals
        """
        # Build response without images
        animals = []
        for i, row in enumerate(animal_rows):
            try:
                # Convert row to dictionary for manipulation
                row_dict = dict(row)

                # Log the keys we have for debugging
                if i == 0:  # Only log for first row to avoid spam
                    logger.debug(f"Row keys: {list(row_dict.keys())}")

                # Parse JSON properties using utility function
                parse_json_field(row_dict, "properties")

                # Parse dog_profiler_data if present (for LLM-enhanced descriptions)
                parse_json_field(row_dict, "dog_profiler_data")

                # Parse adoption_check_data if present
                parse_json_field(row_dict, "adoption_check_data")

                # Build nested organization using utility function
                organization = build_organization_object(row_dict)

                # Strip out raw org_* keys and add organization
                clean = {k: v for k, v in row_dict.items() if not k.startswith("org_")}
                clean["organization"] = organization

                # Normalize protocol-relative URLs (e.g., //example.com -> https://example.com)
                clean["primary_image_url"] = _normalize_url(
                    clean.get("primary_image_url")
                )
                clean["adoption_url"] = _normalize_url(clean.get("adoption_url"))

                animals.append(Animal(**clean))
            except Exception as e:
                logger.error(
                    f"Error building animal response for row {i}, id={row.get('id')}, name={row.get('name')}: {e}"
                )
                logger.error(f"Row keys: {list(row_dict.keys())}")
                logger.error(f"Clean dict keys: {list(clean.keys())}")
                logger.error(f"Error type: {type(e).__name__}")
                if hasattr(e, "errors"):
                    logger.error(f"Validation errors: {e.errors()}")
                raise
        return animals

    def get_animal_by_slug(self, animal_slug: str) -> Optional[Animal]:
        """
        Get a single animal by slug, regardless of status.

        This allows viewing of adopted/reserved dogs for SEO and celebration pages.
        """
        try:
            # Don't filter by status - allow all dogs to be viewed
            # Include organization stats and recent dogs for the organization card
            query = """
                SELECT a.*, 
                       o.name as org_name,
                       o.slug as org_slug,
                       o.city as org_city,
                       o.country as org_country,
                       o.website_url as org_website_url,
                       o.logo_url as org_logo_url,
                       o.social_media as org_social_media,
                       o.ships_to as org_ships_to,
                       o.service_regions as org_service_regions,
                       (SELECT COUNT(*) FROM animals WHERE organization_id = o.id AND status = 'available') as org_total_dogs,
                       (SELECT COUNT(*) FROM animals WHERE organization_id = o.id AND status = 'available' AND created_at >= NOW() - INTERVAL '7 days') as org_new_this_week,
                       (
                           SELECT COALESCE(
                               json_agg(
                                   json_build_object(
                                       'id', a2.id,
                                       'slug', a2.slug,
                                       'name', a2.name,
                                       'primary_image_url', a2.primary_image_url,
                                       'standardized_breed', a2.standardized_breed,
                                       'age_min_months', a2.age_min_months,
                                       'age_max_months', a2.age_max_months
                                   ) ORDER BY a2.created_at DESC
                               ),
                               '[]'::json
                           )
                           FROM (
                               SELECT * FROM animals 
                               WHERE organization_id = o.id 
                               AND status = 'available'
                               ORDER BY created_at DESC
                               LIMIT 3
                           ) a2
                       ) as org_recent_dogs
                FROM animals a
                LEFT JOIN organizations o ON a.organization_id = o.id
                WHERE a.slug = %s
                  AND a.animal_type = 'dog'
                  AND o.active = TRUE
            """

            self.cursor.execute(query, [animal_slug])
            result = self.cursor.fetchone()

            if not result:
                return None

            return self._build_single_animal_response(result)

        except Exception as e:
            logger.error(f"Error fetching animal by slug {animal_slug}: {e}")
            raise APIException(
                status_code=500,
                detail=f"Failed to fetch animal {animal_slug}",
                error_code="INTERNAL_ERROR",
            )

    def get_animal_by_id(self, animal_id: int) -> Optional[Animal]:
        """
        Get a single animal by ID, regardless of status.

        This allows viewing of adopted/reserved dogs for SEO and celebration pages.
        """
        try:
            # Don't filter by status - allow all dogs to be viewed
            # Include organization stats and recent dogs for the organization card
            query = """
                SELECT a.*, 
                       o.name as org_name,
                       o.slug as org_slug,
                       o.city as org_city,
                       o.country as org_country,
                       o.website_url as org_website_url,
                       o.logo_url as org_logo_url,
                       o.social_media as org_social_media,
                       o.ships_to as org_ships_to,
                       o.service_regions as org_service_regions,
                       (SELECT COUNT(*) FROM animals WHERE organization_id = o.id AND status = 'available') as org_total_dogs,
                       (SELECT COUNT(*) FROM animals WHERE organization_id = o.id AND status = 'available' AND created_at >= NOW() - INTERVAL '7 days') as org_new_this_week,
                       (
                           SELECT COALESCE(
                               json_agg(
                                   json_build_object(
                                       'id', a2.id,
                                       'slug', a2.slug,
                                       'name', a2.name,
                                       'primary_image_url', a2.primary_image_url,
                                       'standardized_breed', a2.standardized_breed,
                                       'age_min_months', a2.age_min_months,
                                       'age_max_months', a2.age_max_months
                                   ) ORDER BY a2.created_at DESC
                               ),
                               '[]'::json
                           )
                           FROM (
                               SELECT * FROM animals 
                               WHERE organization_id = o.id 
                               AND status = 'available'
                               ORDER BY created_at DESC
                               LIMIT 3
                           ) a2
                       ) as org_recent_dogs
                FROM animals a
                LEFT JOIN organizations o ON a.organization_id = o.id
                WHERE a.id = %s
                  AND a.animal_type = 'dog'
                  AND o.active = TRUE
            """

            self.cursor.execute(query, [animal_id])
            result = self.cursor.fetchone()

            if not result:
                return None

            return self._build_single_animal_response(result)

        except Exception as e:
            logger.error(f"Error fetching animal by id {animal_id}: {e}")
            raise APIException(
                status_code=500,
                detail=f"Failed to fetch animal {animal_id}",
                error_code="INTERNAL_ERROR",
            )

    def _build_single_animal_response(self, row: dict) -> Animal:
        """Build a single animal response with adoption data if available."""
        # Parse properties JSON field properly
        row_dict = dict(row)
        parse_json_field(row_dict, "properties")
        parse_json_field(row_dict, "dog_profiler_data")
        parse_json_field(row_dict, "adoption_check_data")

        # Parse the org_recent_dogs JSON field if present
        if "org_recent_dogs" in row_dict:
            parse_json_field(row_dict, "org_recent_dogs", [])

        # Build organization data
        organization = build_organization_object(row_dict) if row_dict else None

        # Build animal object
        animal_dict = {
            "id": row["id"],
            "slug": row["slug"],
            "name": row["name"],
            "animal_type": row["animal_type"],
            "breed": row.get("breed"),
            "standardized_breed": row.get("standardized_breed"),
            "breed_group": row.get("breed_group"),
            "primary_breed": row.get("primary_breed"),
            "breed_type": row.get("breed_type"),
            "breed_confidence": row.get("breed_confidence"),
            "secondary_breed": row.get("secondary_breed"),
            "breed_slug": row.get("breed_slug"),
            "age_text": row.get("age_text"),
            "age_min_months": row.get("age_min_months"),
            "age_max_months": row.get("age_max_months"),
            "sex": row.get("sex"),
            "size": row.get("size"),
            "standardized_size": row.get("standardized_size"),
            "status": row.get("status"),
            "primary_image_url": row.get("primary_image_url"),
            "adoption_url": row.get("adoption_url"),
            "organization_id": row.get("organization_id"),
            "external_id": row.get("external_id"),
            "language": row.get("language"),
            "properties": row_dict.get("properties", {}),
            "created_at": row.get("created_at"),
            "updated_at": row.get("updated_at"),
            "last_scraped_at": row.get("last_scraped_at"),
            "availability_confidence": row.get("availability_confidence"),
            "last_seen_at": row.get("last_seen_at"),
            "consecutive_scrapes_missing": row.get("consecutive_scrapes_missing"),
            "dog_profiler_data": row_dict.get("dog_profiler_data", {}),
            "organization": organization,
        }

        # Add adoption check data if available
        if row_dict.get("adoption_check_data"):
            animal_dict["adoption_check_data"] = {
                "checked_at": row.get("adoption_checked_at").isoformat()
                if row.get("adoption_checked_at")
                else None,
                "evidence": row_dict.get("adoption_check_data", {}).get("evidence"),
                "confidence": row_dict.get("adoption_check_data", {}).get("confidence"),
                "status": row.get("status"),  # Include the detected status
            }

        return Animal(**animal_dict)

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
                  AND active = true
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
            raise APIException(
                status_code=500,
                detail="Failed to fetch breed list",
                error_code="INTERNAL_ERROR",
            )

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
                  AND active = true
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
            raise APIException(
                status_code=500,
                detail="Failed to fetch breed group list",
                error_code="INTERNAL_ERROR",
            )

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
                  AND active = true
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
                  AND a.active = true
                  AND a.availability_confidence IN ('high', 'medium')
                  AND o.active = TRUE
                  AND o.country IS NOT NULL
                GROUP BY o.country
                ORDER BY count DESC, o.country ASC
            """
            )
            stats["countries"] = [
                {"country": row["country"], "count": row["count"]}
                for row in self.cursor.fetchall()
            ]

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
                    AND a.active = true
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
            raise APIException(
                status_code=500,
                detail="Failed to fetch statistics",
                error_code="INTERNAL_ERROR",
            )

    def get_breed_stats(self) -> dict:
        """
        Get breed statistics aggregated by primary_breed.

        Returns data structure for /api/breeds/stats endpoint including:
        - Total dogs
        - Unique breeds count
        - Breed groups distribution
        - Qualifying breeds (15+ dogs) with details
        """
        try:
            # Get total dog count
            self.cursor.execute(
                """
                SELECT COUNT(*) as total
                FROM animals a
                JOIN organizations o ON a.organization_id = o.id
                WHERE a.animal_type = 'dog'
                AND a.status = 'available'
                AND a.active = true
                AND o.active = TRUE
            """
            )
            total_dogs = self.cursor.fetchone()["total"]

            # Get unique breed count (where primary_breed is not null)
            self.cursor.execute(
                """
                SELECT COUNT(DISTINCT primary_breed) as count
                FROM animals a
                JOIN organizations o ON a.organization_id = o.id
                WHERE a.animal_type = 'dog'
                AND a.status = 'available'
                AND a.active = true
                AND o.active = TRUE
                AND a.primary_breed IS NOT NULL
            """
            )
            unique_breeds = self.cursor.fetchone()["count"]

            # Get breed groups distribution
            self.cursor.execute(
                """
                SELECT
                    COALESCE(breed_group, 'Unknown') as group_name,
                    COUNT(*) as count
                FROM animals a
                JOIN organizations o ON a.organization_id = o.id
                WHERE a.animal_type = 'dog'
                AND a.status = 'available'
                AND a.active = true
                AND o.active = TRUE
                GROUP BY COALESCE(breed_group, 'Unknown')
                ORDER BY count DESC
            """
            )
            breed_groups = [
                {"name": row["group_name"], "count": row["count"]}
                for row in self.cursor.fetchall()
            ]

            # Get qualifying breeds (15+ dogs) with organization distribution
            self.cursor.execute(
                """
                WITH breed_stats AS (
                    SELECT 
                        a.primary_breed,
                        a.breed_slug,
                        a.breed_type,
                        a.breed_group,
                        COUNT(*) as count,
                        -- Calculate average age in months
                        ROUND(AVG((a.age_min_months + a.age_max_months) / 2.0) FILTER (WHERE a.age_min_months IS NOT NULL AND a.age_max_months IS NOT NULL)) as average_age_months,
                        COUNT(DISTINCT a.organization_id) as org_count,
                        ARRAY_AGG(DISTINCT o.name ORDER BY o.name) as organizations,
                        -- Age distribution
                        COUNT(*) FILTER (WHERE a.age_max_months < 12) as puppy_count,
                        COUNT(*) FILTER (WHERE a.age_min_months >= 12 AND a.age_max_months <= 36) as young_count,
                        COUNT(*) FILTER (WHERE a.age_min_months >= 36 AND a.age_max_months <= 96) as adult_count,
                        COUNT(*) FILTER (WHERE a.age_min_months >= 96) as senior_count,
                        -- Size distribution
                        COUNT(*) FILTER (WHERE a.standardized_size = 'Tiny') as tiny_count,
                        COUNT(*) FILTER (WHERE a.standardized_size = 'Small') as small_count,
                        COUNT(*) FILTER (WHERE a.standardized_size = 'Medium') as medium_count,
                        COUNT(*) FILTER (WHERE a.standardized_size = 'Large') as large_count,
                        COUNT(*) FILTER (WHERE a.standardized_size = 'XLarge') as xlarge_count,
                        -- Experience level distribution
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'experience_level' = 'beginner') as first_time_ok_count,
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'experience_level' = 'intermediate') as some_experience_count,
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'experience_level' = 'experienced') as experienced_count,
                        -- Sex distribution
                        COUNT(*) FILTER (WHERE a.sex = 'Male') as male_count,
                        COUNT(*) FILTER (WHERE a.sex = 'Female') as female_count,
                        -- Personality metrics for bar charts
                        COUNT(*) FILTER (WHERE a.dog_profiler_data IS NOT NULL) as total_with_profiler_data,
                        -- Energy Level
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'energy_level' = 'low') as energy_low_count,
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'energy_level' = 'medium') as energy_medium_count,
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'energy_level' = 'high') as energy_high_count,
                        -- Confidence (as proxy for trainability/independence)
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'confidence' IN ('very_confident', 'confident')) as confidence_high_count,
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'confidence' = 'moderate') as confidence_moderate_count,
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'confidence' IN ('shy', 'very_shy')) as confidence_low_count,
                        -- Good with dogs (as proxy for affection/sociability)
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'good_with_dogs' = 'yes') as good_with_dogs_yes_count,
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'good_with_dogs' = 'sometimes') as good_with_dogs_sometimes_count,
                        COUNT(*) FILTER (WHERE a.dog_profiler_data->>'good_with_dogs' = 'no') as good_with_dogs_no_count
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    WHERE a.animal_type = 'dog'
                    AND a.status = 'available'
                    AND a.active = true
                    AND o.active = TRUE
                    AND a.primary_breed IS NOT NULL
                    GROUP BY a.primary_breed, a.breed_slug, a.breed_type, a.breed_group
                    HAVING COUNT(*) >= 15
                ),
                breed_traits AS (
                    SELECT 
                        a.primary_breed,
                        trait,
                        COUNT(*) as trait_count
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    CROSS JOIN LATERAL jsonb_array_elements_text(
                        COALESCE(a.dog_profiler_data->'personality_traits', '[]'::jsonb)
                    ) AS trait
                    WHERE a.animal_type = 'dog'
                    AND a.status = 'available'
                    AND a.active = true
                    AND o.active = TRUE
                    AND a.primary_breed IS NOT NULL
                    AND a.dog_profiler_data IS NOT NULL
                    AND a.dog_profiler_data != '{}'::jsonb
                    AND jsonb_typeof(a.dog_profiler_data->'personality_traits') = 'array'
                    GROUP BY a.primary_breed, trait
                ),
                top_traits AS (
                    SELECT 
                        primary_breed,
                        ARRAY_AGG(trait ORDER BY trait_count DESC) FILTER (WHERE row_num <= 5) as top_personality_traits
                    FROM (
                        SELECT 
                            primary_breed,
                            trait,
                            trait_count,
                            ROW_NUMBER() OVER (PARTITION BY primary_breed ORDER BY trait_count DESC) as row_num
                        FROM breed_traits
                    ) ranked_traits
                    GROUP BY primary_breed
                )
                SELECT 
                    bs.*,
                    COALESCE(tt.top_personality_traits, ARRAY[]::text[]) as personality_traits
                FROM breed_stats bs
                LEFT JOIN top_traits tt ON bs.primary_breed = tt.primary_breed
                ORDER BY bs.count DESC
            """
            )

            qualifying_breeds = []
            for row in self.cursor.fetchall():
                # Use stored breed_slug or generate if missing
                breed_slug = row["breed_slug"] or generate_breed_slug(
                    row["primary_breed"]
                )

                # Calculate personality metrics percentages
                total_with_data = row["total_with_profiler_data"] or 0
                personality_metrics = None

                if total_with_data > 0:
                    # Energy level calculation - convert to 0-100 scale
                    energy_total = (
                        row["energy_low_count"]
                        + row["energy_medium_count"]
                        + row["energy_high_count"]
                    )
                    if energy_total > 0:
                        # Weight: low=1, medium=2, high=3, then scale to 0-100
                        energy_weighted = (
                            row["energy_low_count"] * 1
                            + row["energy_medium_count"] * 2
                            + row["energy_high_count"] * 3
                        )
                        energy_percentage = int(
                            (energy_weighted / (energy_total * 3)) * 100
                        )
                    else:
                        energy_percentage = 50  # Default to medium if no data

                    # Affection (using good_with_dogs as proxy) - higher is more affectionate
                    dogs_total = (
                        row["good_with_dogs_yes_count"]
                        + row["good_with_dogs_sometimes_count"]
                        + row["good_with_dogs_no_count"]
                    )
                    if dogs_total > 0:
                        # Weight: yes=3, sometimes=2, no=1, then scale to 0-100
                        affection_weighted = (
                            row["good_with_dogs_yes_count"] * 3
                            + row["good_with_dogs_sometimes_count"] * 2
                            + row["good_with_dogs_no_count"] * 1
                        )
                        affection_percentage = int(
                            (affection_weighted / (dogs_total * 3)) * 100
                        )
                    else:
                        affection_percentage = (
                            70  # Default to high affection if no data
                        )

                    # Trainability (using confidence as proxy) - higher confidence = better trainability
                    confidence_total = (
                        row["confidence_high_count"]
                        + row["confidence_moderate_count"]
                        + row["confidence_low_count"]
                    )
                    if confidence_total > 0:
                        # Weight: high=3, moderate=2, low=1, then scale to 0-100
                        trainability_weighted = (
                            row["confidence_high_count"] * 3
                            + row["confidence_moderate_count"] * 2
                            + row["confidence_low_count"] * 1
                        )
                        trainability_percentage = int(
                            (trainability_weighted / (confidence_total * 3)) * 100
                        )
                    else:
                        trainability_percentage = 60  # Default to moderate if no data

                    # Independence (inverse of confidence - lower confidence = more independent)
                    # We'll invert the trainability score
                    independence_percentage = 100 - trainability_percentage

                    # Create labels based on percentages
                    def get_energy_label(percentage):
                        if percentage <= 33:
                            return "Low"
                        elif percentage <= 50:
                            return "Low-Medium"
                        elif percentage <= 66:
                            return "Medium"
                        elif percentage <= 83:
                            return "Medium-High"
                        else:
                            return "High"

                    def get_level_label(percentage):
                        if percentage <= 20:
                            return "Very Low"
                        elif percentage <= 40:
                            return "Low"
                        elif percentage <= 60:
                            return "Moderate"
                        elif percentage <= 80:
                            return "High"
                        else:
                            return "Very High"

                    def get_trainability_label(percentage):
                        if percentage <= 40:
                            return "Challenging"
                        elif percentage <= 60:
                            return "Moderate"
                        elif percentage <= 80:
                            return "Good"
                        else:
                            return "Excellent"

                    personality_metrics = {
                        "energy_level": {
                            "percentage": energy_percentage,
                            "label": get_energy_label(energy_percentage),
                        },
                        "affection": {
                            "percentage": affection_percentage,
                            "label": get_level_label(affection_percentage),
                        },
                        "trainability": {
                            "percentage": trainability_percentage,
                            "label": get_trainability_label(trainability_percentage),
                        },
                        "independence": {
                            "percentage": independence_percentage,
                            "label": get_level_label(independence_percentage),
                        },
                    }

                breed_data = {
                    "primary_breed": row["primary_breed"],
                    "breed_slug": breed_slug,
                    "breed_type": row["breed_type"],
                    "breed_group": row["breed_group"],
                    "count": row["count"],
                    "average_age_months": row[
                        "average_age_months"
                    ],  # Add actual average age
                    "organization_count": row["org_count"],
                    "organizations": row["organizations"][:5]
                    if row["organizations"]
                    else [],  # Limit to top 5 orgs
                    "age_distribution": {
                        "puppy": row["puppy_count"],
                        "young": row["young_count"],
                        "adult": row["adult_count"],
                        "senior": row["senior_count"],
                    },
                    "size_distribution": {
                        "tiny": row["tiny_count"],
                        "small": row["small_count"],
                        "medium": row["medium_count"],
                        "large": row["large_count"],
                        "xlarge": row["xlarge_count"],
                    },
                    "sex_distribution": {
                        "male": row["male_count"],
                        "female": row["female_count"],
                    },
                    "personality_traits": row["personality_traits"]
                    if row["personality_traits"]
                    else [],
                    "experience_distribution": {
                        "first_time_ok": row["first_time_ok_count"],
                        "some_experience": row["some_experience_count"],
                        "experienced": row["experienced_count"],
                    },
                }

                # Only add personality_metrics if we have data
                if personality_metrics:
                    breed_data["personality_metrics"] = personality_metrics

                qualifying_breeds.append(breed_data)

            # Get purebred and crossbreed counts
            self.cursor.execute(
                """
                SELECT 
                    COUNT(*) FILTER (WHERE breed_type = 'purebred') as purebred_count,
                    COUNT(*) FILTER (WHERE breed_type = 'crossbreed') as crossbreed_count
                FROM animals a
                JOIN organizations o ON a.organization_id = o.id
                WHERE a.animal_type = 'dog' 
                AND a.status = 'available'
                AND o.active = TRUE
            """
            )
            breed_type_counts = self.cursor.fetchone()

            return {
                "total_dogs": total_dogs,
                "unique_breeds": unique_breeds,
                "breed_groups": breed_groups,
                "purebred_count": breed_type_counts["purebred_count"] or 0,
                "crossbreed_count": breed_type_counts["crossbreed_count"] or 0,
                "qualifying_breeds": qualifying_breeds,
            }

        except Exception as e:
            logger.error(f"Error in get_breed_stats: {e}")
            raise APIException(
                status_code=500,
                detail="Failed to fetch breed statistics",
                error_code="INTERNAL_ERROR",
            )

    def get_breeds_with_images(
        self,
        breed_type: str = None,
        breed_group: str = None,
        min_count: int = 0,
        limit: int = 10,
    ) -> List[dict]:
        """Get breeds with sample dog images for the breeds overview page."""
        try:
            # Build WHERE conditions for counting ALL dogs (not just with images)
            count_conditions = [
                "a.animal_type = 'dog'",
                "a.status = 'available'",
                "a.active = true",
                "o.active = TRUE",
            ]

            # Build WHERE conditions for sample dogs (must have images)
            sample_conditions = [
                "a.animal_type = 'dog'",
                "a.status = 'available'",
                "a.active = true",
                "o.active = TRUE",
                "a.primary_image_url IS NOT NULL",
            ]
            params = []

            if breed_type:
                if breed_type == "mixed":
                    count_conditions.append("a.breed_group = 'Mixed'")
                    sample_conditions.append("a.breed_group = 'Mixed'")
                else:
                    count_conditions.append("a.breed_type = %s")
                    sample_conditions.append("a.breed_type = %s")
                    params.append(breed_type)
                    params.append(breed_type)  # Need it twice for both queries

            if breed_group:
                count_conditions.append("a.breed_group = %s")
                sample_conditions.append("a.breed_group = %s")
                params.append(breed_group)
                params.append(breed_group)  # Need it twice for both queries

            count_where_clause = " AND ".join(count_conditions)
            sample_where_clause = " AND ".join(sample_conditions)

            # Get breeds with counts and sample dogs
            # For mixed breeds, group by breed_group instead of primary_breed
            if breed_type == "mixed":
                query = f"""
                WITH breed_counts AS (
                    SELECT 
                        'Mixed Breed' as primary_breed,
                        'mixed-breed' as breed_slug,
                        'mixed' as breed_type,
                        'Mixed' as breed_group,
                        COUNT(DISTINCT a.id) as count
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    WHERE {count_where_clause}
                    HAVING COUNT(DISTINCT a.id) >= %s
                    LIMIT %s
                ),
                sample_dogs AS (
                    SELECT DISTINCT ON (a.id)
                        a.id,
                        a.name,
                        a.slug,
                        a.primary_image_url,
                        a.age_text,
                        CASE 
                            WHEN a.age_min_months < 12 THEN 'Puppy'
                            WHEN a.age_min_months < 36 THEN 'Young'
                            WHEN a.age_min_months < 84 THEN 'Adult'
                            ELSE 'Senior'
                        END as age_group,
                        a.sex,
                        a.dog_profiler_data->'personality_traits' as personality_traits,
                        ROW_NUMBER() OVER (
                            ORDER BY 
                                CASE WHEN a.primary_image_url IS NOT NULL THEN 0 ELSE 1 END,
                                a.created_at DESC
                        ) as rn
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    WHERE {sample_where_clause}
                )
                SELECT 
                    bc.primary_breed,
                    bc.breed_slug,
                    bc.breed_type,
                    bc.breed_group,
                    bc.count,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'name', sd.name,
                                'slug', sd.slug,
                                'primary_image_url', sd.primary_image_url,
                                'age_text', sd.age_text,
                                'age_group', sd.age_group,
                                'sex', sd.sex,
                                'personality_traits', COALESCE(sd.personality_traits, '[]'::jsonb)
                            ) ORDER BY sd.rn
                        ) FILTER (WHERE sd.rn <= 5 AND sd.name IS NOT NULL),
                        '[]'::json
                    ) as sample_dogs
                FROM breed_counts bc
                LEFT JOIN sample_dogs sd ON sd.rn <= 5
                GROUP BY bc.primary_breed, bc.breed_slug, bc.breed_type, bc.breed_group, bc.count
                ORDER BY bc.count DESC
            """
            else:
                query = f"""
                WITH breed_counts AS (
                    SELECT 
                        a.primary_breed,
                        a.breed_slug,
                        a.breed_type,
                        a.breed_group,
                        COUNT(DISTINCT a.id) as count
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    WHERE {count_where_clause}
                    GROUP BY a.primary_breed, a.breed_slug, a.breed_type, a.breed_group
                    HAVING COUNT(DISTINCT a.id) >= %s
                    ORDER BY COUNT(DISTINCT a.id) DESC
                    LIMIT %s
                ),
                sample_dogs AS (
                    SELECT DISTINCT ON (a.primary_breed, a.id)
                        a.primary_breed,
                        a.id,
                        a.name,
                        a.slug,
                        a.primary_image_url,
                        a.age_text,
                        CASE 
                            WHEN a.age_min_months < 12 THEN 'Puppy'
                            WHEN a.age_min_months < 36 THEN 'Young'
                            WHEN a.age_min_months < 84 THEN 'Adult'
                            ELSE 'Senior'
                        END as age_group,
                        a.sex,
                        a.dog_profiler_data->'personality_traits' as personality_traits,
                        ROW_NUMBER() OVER (
                            PARTITION BY a.primary_breed 
                            ORDER BY 
                                CASE WHEN a.primary_image_url IS NOT NULL THEN 0 ELSE 1 END,
                                a.created_at DESC
                        ) as rn
                    FROM animals a
                    JOIN organizations o ON a.organization_id = o.id
                    JOIN breed_counts bc ON a.primary_breed = bc.primary_breed
                    WHERE {sample_where_clause}
                )
                SELECT 
                    bc.primary_breed,
                    bc.breed_slug,
                    bc.breed_type,
                    bc.breed_group,
                    bc.count,
                    COALESCE(
                        json_agg(
                            json_build_object(
                                'name', sd.name,
                                'slug', sd.slug,
                                'primary_image_url', sd.primary_image_url,
                                'age_text', sd.age_text,
                                'age_group', sd.age_group,
                                'sex', sd.sex,
                                'personality_traits', COALESCE(sd.personality_traits, '[]'::jsonb)
                            ) ORDER BY sd.rn
                        ) FILTER (WHERE sd.rn <= 5 AND sd.name IS NOT NULL),
                        '[]'::json
                    ) as sample_dogs
                FROM breed_counts bc
                LEFT JOIN sample_dogs sd ON bc.primary_breed = sd.primary_breed AND sd.rn <= 5
                GROUP BY bc.primary_breed, bc.breed_slug, bc.breed_type, bc.breed_group, bc.count
                ORDER BY bc.count DESC
            """

            # Add min_count and limit to params
            params.extend([min_count, limit])

            self.cursor.execute(query, params)
            results = self.cursor.fetchall()

            breeds_with_images = []
            for row in results:
                breeds_with_images.append(
                    {
                        "primary_breed": row["primary_breed"],
                        "breed_slug": row["breed_slug"],
                        "breed_type": row["breed_type"],
                        "breed_group": row["breed_group"],
                        "count": row["count"],
                        "sample_dogs": row["sample_dogs"] if row["sample_dogs"] else [],
                    }
                )

            return breeds_with_images

        except Exception as e:
            logger.error(f"Error in get_breeds_with_images: {e}")
            raise APIException(
                status_code=500,
                detail="Failed to fetch breeds with images",
                error_code="INTERNAL_ERROR",
            )

    def _build_animals_query(
        self, filters: AnimalFilterRequest
    ) -> tuple[str, List[Any]]:
        """Build the animals query with filters."""
        # Base query selects distinct animals and joins with organizations
        # Include dog_profiler_data for sitemap and other requests that need LLM content
        query_base = """
            SELECT DISTINCT a.id, a.slug, a.name, a.animal_type, a.breed, a.standardized_breed, a.breed_group,
                   a.primary_breed, a.breed_type, a.breed_confidence, a.secondary_breed, a.breed_slug,
                   a.age_text, a.age_min_months, a.age_max_months, a.sex, a.size, a.standardized_size,
                   a.status, a.primary_image_url, a.adoption_url, a.organization_id, a.external_id,
                   a.language, a.properties, a.created_at, a.updated_at, a.last_scraped_at,
                   a.availability_confidence, a.last_seen_at, a.consecutive_scrapes_missing,
                   a.dog_profiler_data,
                   o.name as org_name,
                   o.slug as org_slug,
                   o.city as org_city,
                   o.country as org_country,
                   o.website_url as org_website_url,
                   o.logo_url as org_logo_url,
                   o.social_media as org_social_media,
                   o.ships_to as org_ships_to
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
        """

        # Conditionally join service_regions if needed for filtering
        joins = ""
        conditions = [
            "a.animal_type = %s",
            "a.active = true",
            "o.active = TRUE",
        ]
        params = [filters.animal_type]

        # Add JOIN for service_regions if filtering by available_to
        if filters.needs_service_region_join():
            joins += (
                " JOIN service_regions sr ON a.organization_id = sr.organization_id"
            )

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
            conditions.append(
                "(a.name ILIKE %s OR a.breed ILIKE %s OR a.standardized_breed ILIKE %s)"
            )
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

        if filters.primary_breed:
            conditions.append("a.primary_breed = %s")
            params.append(filters.primary_breed)

        if filters.breed_type:
            conditions.append("a.breed_type = %s")
            params.append(filters.breed_type)

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
            params.append(filters.organization_id)

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
                return "ORDER BY a.id DESC"  # Use ID as proxy for newest (IDs are auto-incrementing)

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
                       a.primary_breed, a.breed_type, a.breed_confidence, a.secondary_breed, a.breed_slug,
                       a.age_text, a.age_min_months, a.age_max_months, a.sex, a.size, a.standardized_size,
                       a.status, a.primary_image_url, a.adoption_url, a.organization_id, a.external_id,
                       a.language, a.properties, a.created_at, a.updated_at, a.last_scraped_at,
                       a.availability_confidence, a.last_seen_at, a.consecutive_scrapes_missing,
                       a.dog_profiler_data,
                       o.name as org_name,
                       o.slug as org_slug,
                       o.city as org_city,
                       o.country as org_country,
                       o.website_url as org_website_url,
                       o.logo_url as org_logo_url,
                       o.social_media as org_social_media,
                       o.ships_to as org_ships_to
                FROM animals a
                LEFT JOIN organizations o ON a.organization_id = o.id
                {joins}
                WHERE {where_clause}
                ORDER BY a.organization_id, (abs(hashtext(a.id::text || to_char(now(), 'IYYY-IW'))) %% 1000)
                LIMIT %s OFFSET %s
            """
        else:
            order_clause = get_order_clause()
            query = f"{query_base}{joins} WHERE {where_clause} {order_clause} LIMIT %s OFFSET %s"

        params.extend([filters.limit, filters.offset])

        return query, params

    def get_filter_counts(
        self, filters: AnimalFilterCountRequest
    ) -> FilterCountsResponse:
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
            response.size_options = self._get_size_counts(
                base_conditions, base_params, filters
            )

            # Get age counts
            response.age_options = self._get_age_counts(
                base_conditions, base_params, filters
            )

            # Get sex counts
            response.sex_options = self._get_sex_counts(
                base_conditions, base_params, filters
            )

            # Get breed counts (limit to top breeds to avoid overwhelming response)
            response.breed_options = self._get_breed_counts(
                base_conditions, base_params, filters
            )

            # Get organization counts
            response.organization_options = self._get_organization_counts(
                base_conditions, base_params, filters
            )

            # Get location country counts
            response.location_country_options = self._get_location_country_counts(
                base_conditions, base_params, filters
            )

            # Get available country counts
            response.available_country_options = self._get_available_country_counts(
                base_conditions, base_params, filters
            )

            # Get available region counts (if country is selected)
            if filters.available_to_country:
                response.available_region_options = self._get_available_region_counts(
                    base_conditions, base_params, filters
                )

            return response

        except Exception as e:
            logger.error(f"Error in get_filter_counts: {e}")
            raise APIException(
                status_code=500,
                detail="Failed to fetch filter counts",
                error_code="INTERNAL_ERROR",
            )

    def _build_count_base_conditions(
        self, filters: AnimalFilterCountRequest
    ) -> tuple[List[str], List[Any]]:
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
            conditions.append(
                "(a.name ILIKE %s OR a.breed ILIKE %s OR a.standardized_breed ILIKE %s)"
            )
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

        if filters.primary_breed:
            conditions.append("a.primary_breed = %s")
            params.append(filters.primary_breed)

        if filters.breed_type:
            conditions.append("a.breed_type = %s")
            params.append(filters.breed_type)

        if filters.location_country:
            conditions.append("o.country = %s")
            params.append(filters.location_country)

        if filters.organization_id:
            conditions.append("a.organization_id = %s")
            params.append(filters.organization_id)

        return conditions, params

    def _get_size_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
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
            WHERE {" AND ".join(conditions)}
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
        size_labels = {
            "Tiny": "Tiny",
            "Small": "Small",
            "Medium": "Medium",
            "Large": "Large",
            "XLarge": "Extra Large",
        }

        return [
            FilterOption(
                value=row["standardized_size"],
                label=size_labels.get(
                    row["standardized_size"], row["standardized_size"]
                ),
                count=row["count"],
            )
            for row in results
            if row["count"] > 0
        ]

    def _get_age_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
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
            WHERE {" AND ".join(conditions)}
              AND a.age_min_months IS NOT NULL
              AND a.age_max_months IS NOT NULL
            GROUP BY 1
            HAVING COUNT(*) > 0
            ORDER BY 1
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [
            FilterOption(
                value=row["age_category"], label=row["age_category"], count=row["count"]
            )
            for row in results
            if row["age_category"] != "Unknown" and row["count"] > 0
        ]

    def _get_sex_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
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
            WHERE {" AND ".join(conditions)}
              AND a.sex IS NOT NULL
            GROUP BY a.sex
            HAVING COUNT(*) > 0
            ORDER BY a.sex
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [
            FilterOption(value=row["sex"], label=row["sex"], count=row["count"])
            for row in results
            if row["count"] > 0
        ]

    def _get_breed_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
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
            WHERE {" AND ".join(conditions)}
              AND a.standardized_breed IS NOT NULL
              AND a.standardized_breed != ''
            GROUP BY a.standardized_breed
            HAVING COUNT(*) > 0
            ORDER BY count DESC, a.standardized_breed ASC
            LIMIT 20
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [
            FilterOption(
                value=row["standardized_breed"],
                label=row["standardized_breed"],
                count=row["count"],
            )
            for row in results
            if row["count"] > 0
        ]

    def _get_organization_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
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
            WHERE {" AND ".join(conditions)}
            GROUP BY o.id, o.name
            HAVING COUNT(*) > 0
            ORDER BY o.name ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [
            FilterOption(value=str(row["id"]), label=row["name"], count=row["count"])
            for row in results
            if row["count"] > 0
        ]

    def _get_location_country_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
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
            WHERE {" AND ".join(conditions)}
              AND o.country IS NOT NULL
              AND o.country != ''
            GROUP BY o.country
            ORDER BY o.country ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [
            FilterOption(value=row["country"], label=row["country"], count=row["count"])
            for row in results
            if row["count"] > 0
        ]

    def _get_available_country_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
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
            WHERE {" AND ".join(conditions)}
              AND sr.country IS NOT NULL
              AND sr.country != ''
            GROUP BY sr.country
            ORDER BY sr.country ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [
            FilterOption(value=row["country"], label=row["country"], count=row["count"])
            for row in results
            if row["count"] > 0
        ]

    def _get_available_region_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
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
            WHERE {" AND ".join(conditions)}
              AND sr.region IS NOT NULL
              AND sr.region != ''
            GROUP BY sr.region
            HAVING COUNT(DISTINCT a.id) > 0
            ORDER BY sr.region ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [
            FilterOption(value=row["region"], label=row["region"], count=row["count"])
            for row in results
            if row["count"] > 0
        ]

    def _get_primary_breed_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
        """Get counts for primary breeds, excluding current primary_breed filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Add other non-primary-breed filters
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

        # Note: excluding current primary_breed filter to show counts without that filter
        query = f"""
            SELECT a.primary_breed, COUNT(DISTINCT a.id) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE {" AND ".join(conditions)}
              AND a.primary_breed IS NOT NULL
              AND a.primary_breed != ''
            GROUP BY a.primary_breed
            HAVING COUNT(DISTINCT a.id) > 0
            ORDER BY count DESC, a.primary_breed ASC
            LIMIT 50
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        return [
            FilterOption(
                value=row["primary_breed"],
                label=row["primary_breed"],
                count=row["count"],
            )
            for row in results
            if row["count"] > 0
        ]

    def _get_breed_type_counts(
        self,
        base_conditions: List[str],
        base_params: List[Any],
        filters: AnimalFilterCountRequest,
    ) -> List[FilterOption]:
        """Get counts for breed types, excluding current breed_type filter."""
        conditions = base_conditions.copy()
        params = base_params.copy()

        # Add other non-breed-type filters
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

        # Note: excluding current breed_type filter to show counts without that filter
        query = f"""
            SELECT a.breed_type, COUNT(DISTINCT a.id) as count
            FROM animals a
            LEFT JOIN organizations o ON a.organization_id = o.id
            WHERE {" AND ".join(conditions)}
              AND a.breed_type IS NOT NULL
              AND a.breed_type != ''
            GROUP BY a.breed_type
            HAVING COUNT(DISTINCT a.id) > 0
            ORDER BY count DESC, a.breed_type ASC
        """

        self.cursor.execute(query, params)
        results = self.cursor.fetchall()

        # Capitalize breed type labels for display
        breed_type_labels = {
            "purebred": "Purebred",
            "mixed": "Mixed",
            "crossbreed": "Crossbreed",
            "unknown": "Unknown",
            "sighthound": "Sighthound",
        }

        return [
            FilterOption(
                value=row["breed_type"],
                label=breed_type_labels.get(
                    row["breed_type"].lower(), row["breed_type"]
                ),
                count=row["count"],
            )
            for row in results
            if row["count"] > 0
        ]
