# api/routes/organizations.py

import json
from typing import List

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from psycopg2.extras import RealDictCursor
from pydantic import ValidationError

from api.dependencies import get_db_cursor
from api.exceptions import APIException, handle_database_error, handle_validation_error
from api.models.organization import Organization
from api.models.requests import OrganizationFilterRequest
from api.utils.json_parser import parse_json_field

router = APIRouter()


@router.get("/", response_model=List[Organization])
def get_organizations(
    filters: OrganizationFilterRequest = Depends(),
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """
    Get all organizations.

    Returns a list of all active rescue organizations.
    """
    try:
        # Build the base query
        query = """
            SELECT
                o.id, o.slug, o.name, o.website_url, o.description, o.country, o.city,
                o.logo_url, o.social_media, o.active, o.created_at, o.updated_at,
                o.ships_to, o.established_year, o.service_regions, o.adoption_fees,
                -- Dog statistics
                COUNT(DISTINCT a.id) as total_dogs,
                COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') as new_this_week
            FROM organizations o
            LEFT JOIN animals a ON o.id = a.organization_id AND a.status = 'available' AND a.active = true
        """

        # Build conditions
        conditions = []
        params = []

        if filters.active_only:
            conditions.append("o.active = true")

        if filters.country:
            conditions.append("o.country = %s")
            params.append(filters.country)

        if filters.search:
            conditions.append("o.name ILIKE %s")
            params.append(f"%{filters.search}%")

        # Add WHERE clause if conditions exist
        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        # Add GROUP BY and ORDER BY
        query += """
            GROUP BY o.id, o.slug, o.name, o.website_url, o.description, o.country, o.city,
                     o.logo_url, o.social_media, o.active, o.created_at, o.updated_at,
                     o.ships_to, o.established_year, o.service_regions, o.adoption_fees
            ORDER BY o.name
            LIMIT %s OFFSET %s
        """

        params.extend([filters.limit, filters.offset])

        cursor.execute(query, params)

        organizations = cursor.fetchall()

        # Parse JSON fields using utility functions
        for org in organizations:
            org_dict = dict(org)

            # Parse organization fields
            parse_json_field(org_dict, "social_media")
            parse_json_field(org_dict, "ships_to", [])
            parse_json_field(org_dict, "service_regions", [])
            parse_json_field(org_dict, "adoption_fees", {})

            # Update the original dict
            org.update(org_dict)

        return organizations
    except ValidationError as ve:
        handle_validation_error(ve, "get_organizations")
    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_organizations")
    except Exception:
        raise APIException(
            status_code=500,
            detail="Failed to fetch organizations",
            error_code="INTERNAL_ERROR",
        )


@router.get("/enhanced", response_model=List[dict])
def get_enhanced_organizations(cursor: RealDictCursor = Depends(get_db_cursor)):
    """
    Get all organizations with statistics and recent dogs in a single optimized query.

    This endpoint is designed for SSR and reduces N+1 queries by using a CTE
    to fetch all data in one database round trip.
    """
    try:
        # Use CTE to fetch organizations with statistics and recent dogs in one query
        cursor.execute(
            """
            WITH org_stats AS (
                SELECT 
                    o.id,
                    o.name,
                    o.description,
                    o.logo_url,
                    o.website_url,
                    o.country,
                    o.city,
                    o.social_media::jsonb as social_media,
                    o.service_regions::jsonb as service_regions,
                    o.ships_to::jsonb as ships_to,
                    o.adoption_fees::jsonb as adoption_fees,
                    o.slug,
                    o.active as is_active,
                    o.created_at,
                    o.updated_at,
                    COUNT(DISTINCT a.id) as total_dogs,
                    COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') as new_this_week,
                    COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '30 days') as new_this_month
                FROM organizations o
                LEFT JOIN animals a ON o.id = a.organization_id AND a.status = 'available' AND a.active = true
                WHERE o.active = true
                GROUP BY o.id
            ),
            recent_dogs AS (
                SELECT DISTINCT ON (a.organization_id, a.id)
                    a.organization_id,
                    a.id as dog_id,
                    a.name as dog_name,
                    a.primary_image_url as image_url,
                    a.adoption_url as external_link,
                    a.age_min_months,
                    a.age_max_months,
                    a.standardized_size,
                    a.standardized_breed,
                    a.created_at as dog_created_at,
                    ROW_NUMBER() OVER (PARTITION BY a.organization_id ORDER BY a.created_at DESC) as rn
                FROM animals a
                WHERE a.status = 'available'
                    AND a.active = true
                    AND a.organization_id IN (SELECT id FROM org_stats)
            )
            SELECT 
                os.*,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', rd.dog_id,
                            'name', rd.dog_name,
                            'image_url', rd.image_url,
                            'external_link', rd.external_link,
                            'age_min_months', rd.age_min_months,
                            'age_max_months', rd.age_max_months,
                            'standardized_size', rd.standardized_size,
                            'standardized_breed', rd.standardized_breed
                        ) ORDER BY rd.dog_created_at DESC
                    ) FILTER (WHERE rd.dog_id IS NOT NULL AND rd.rn <= 3),
                    '[]'::json
                ) as recent_dogs
            FROM org_stats os
            LEFT JOIN recent_dogs rd ON os.id = rd.organization_id AND rd.rn <= 3
            GROUP BY 
                os.id, os.name, os.description, os.logo_url, os.website_url,
                os.country, os.city, os.social_media, os.service_regions,
                os.ships_to, os.adoption_fees, os.slug, os.is_active,
                os.created_at, os.updated_at, os.total_dogs, os.new_this_week,
                os.new_this_month
            ORDER BY os.total_dogs DESC, os.name
            """
        )

        organizations = cursor.fetchall()

        # Convert to list of dicts and ensure JSON fields are properly parsed
        result = []
        for org in organizations:
            org_dict = dict(org)
            # Ensure JSON fields are parsed
            if org_dict.get("social_media") and isinstance(org_dict["social_media"], str):
                org_dict["social_media"] = json.loads(org_dict["social_media"])
            if org_dict.get("service_regions") and isinstance(org_dict["service_regions"], str):
                org_dict["service_regions"] = json.loads(org_dict["service_regions"])
            if org_dict.get("ships_to") and isinstance(org_dict["ships_to"], str):
                org_dict["ships_to"] = json.loads(org_dict["ships_to"])
            if org_dict.get("recent_dogs") and isinstance(org_dict["recent_dogs"], str):
                org_dict["recent_dogs"] = json.loads(org_dict["recent_dogs"])

            result.append(org_dict)

        return result

    except psycopg2.Error as db_err:
        handle_database_error(db_err, "get_enhanced_organizations")
    except Exception:
        raise APIException(
            status_code=500,
            detail="Failed to fetch enhanced organizations data",
            error_code="INTERNAL_ERROR",
        )


@router.get("/{organization_slug}", response_model=Organization)
def get_organization_by_slug(organization_slug: str, cursor: RealDictCursor = Depends(get_db_cursor)):
    """
    Get a specific organization by slug, with legacy ID redirect support.

    Returns detailed information about the requested organization including statistics.
    """
    try:
        # Check if it's a numeric ID (legacy route)
        if organization_slug.isdigit():
            organization_id = int(organization_slug)
            # Get org by ID and redirect to slug
            cursor.execute(
                "SELECT slug FROM organizations WHERE id = %s AND active = true",
                (organization_id,),
            )
            result = cursor.fetchone()
            if result:
                return RedirectResponse(url=f"/api/organizations/{result['slug']}", status_code=301)

        # Lookup by slug
        cursor.execute(
            """
            SELECT
                o.id, o.slug, o.name, o.website_url, o.description, o.country, o.city,
                o.logo_url, o.social_media, o.active, o.created_at, o.updated_at,
                o.ships_to, o.established_year, o.service_regions, o.adoption_fees,
                -- Dog statistics
                COUNT(DISTINCT a.id) as total_dogs,
                COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') as new_this_week
            FROM organizations o
            LEFT JOIN animals a ON o.id = a.organization_id AND a.status = 'available' AND a.active = true
            WHERE o.slug = %s AND o.active = true
            GROUP BY o.id, o.slug, o.name, o.website_url, o.description, o.country, o.city,
                     o.logo_url, o.social_media, o.active, o.created_at, o.updated_at,
                     o.ships_to, o.established_year, o.service_regions, o.adoption_fees
        """,
            (organization_slug,),
        )

        organization = cursor.fetchone()

        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Parse JSON fields using utility functions
        org_dict = dict(organization)
        parse_json_field(org_dict, "social_media")
        parse_json_field(org_dict, "ships_to", [])
        parse_json_field(org_dict, "service_regions", [])
        parse_json_field(org_dict, "adoption_fees", {})

        return org_dict
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except ValidationError as ve:
        handle_validation_error(ve, f"get_organization_by_slug({organization_slug})")
    except psycopg2.Error as db_err:
        handle_database_error(db_err, f"get_organization_by_slug({organization_slug})")
    except Exception:
        raise APIException(
            status_code=500,
            detail=f"Failed to fetch organization {organization_slug}",
            error_code="INTERNAL_ERROR",
        )


# --- Legacy ID Route (Explicit Redirect) ---
@router.get("/id/{organization_id}", response_model=Organization)
def get_organization_by_id_legacy(organization_id: int, cursor: RealDictCursor = Depends(get_db_cursor)):
    """Legacy endpoint - redirects to slug URL."""
    try:
        cursor.execute(
            "SELECT slug FROM organizations WHERE id = %s AND active = true",
            (organization_id,),
        )
        result = cursor.fetchone()

        if not result:
            raise HTTPException(status_code=404, detail="Organization not found")

        # 301 redirect to new slug URL
        return RedirectResponse(url=f"/api/organizations/{result['slug']}", status_code=301)

    except HTTPException:
        raise
    except Exception:
        raise APIException(status_code=500, detail="Internal server error", error_code="INTERNAL_ERROR")


@router.get("/{organization_id}/recent-dogs")
def get_organization_recent_dogs(
    organization_id: int,
    limit: int = 3,
    cursor: RealDictCursor = Depends(get_db_cursor),
):
    """
    Get the most recent dogs from a specific organization for preview thumbnails.

    Returns up to {limit} most recent dogs with thumbnail URLs.
    """
    try:
        cursor.execute(
            """
            SELECT id, name, primary_image_url
            FROM animals
            WHERE organization_id = %s AND status = 'available' AND active = true AND primary_image_url IS NOT NULL
            ORDER BY created_at DESC
            LIMIT %s
            """,
            (organization_id, limit),
        )

        recent_dogs = cursor.fetchall()

        # Format the response with thumbnail URLs
        dogs_with_thumbnails = []
        for dog in recent_dogs:
            dog_data = dict(dog)
            # Use raw R2 URL for thumbnails - transformations handled by frontend
            dog_data["thumbnail_url"] = dog_data["primary_image_url"]

            dogs_with_thumbnails.append(dog_data)

        return dogs_with_thumbnails

    except psycopg2.Error as db_err:
        handle_database_error(db_err, f"get_organization_recent_dogs({organization_id})")
    except Exception:
        raise APIException(
            status_code=500,
            detail=f"Failed to fetch recent dogs for organization {organization_id}",
            error_code="INTERNAL_ERROR",
        )


@router.get("/{organization_id}/statistics")
def get_organization_statistics(organization_id: int, cursor: RealDictCursor = Depends(get_db_cursor)):
    """
    Get statistics for a specific organization.

    Returns dog count and recent additions.
    """
    try:
        cursor.execute(
            """
            SELECT
                COUNT(a.id) as total_dogs,
                COUNT(a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') as new_this_week,
                COUNT(a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '30 days') as new_this_month
            FROM animals a
            WHERE a.organization_id = %s AND a.status = 'available' AND a.active = true
            """,
            (organization_id,),
        )

        stats = cursor.fetchone()

        if not stats:
            return {"total_dogs": 0, "new_this_week": 0, "new_this_month": 0}

        return dict(stats)

    except psycopg2.Error as db_err:
        handle_database_error(db_err, f"get_organization_statistics({organization_id})")
    except Exception:
        raise APIException(
            status_code=500,
            detail=f"Failed to fetch statistics for organization {organization_id}",
            error_code="INTERNAL_ERROR",
        )
