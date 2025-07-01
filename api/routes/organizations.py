# api/routes/organizations.py

import json
from typing import List

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extras import RealDictCursor

from api.dependencies import get_db_cursor
from api.models.organization import Organization

router = APIRouter()


@router.get("/", response_model=List[Organization])
def get_organizations(cursor: RealDictCursor = Depends(get_db_cursor)):
    """
    Get all organizations.

    Returns a list of all active rescue organizations.
    """
    try:
        cursor.execute(
            """
            SELECT
                o.id, o.name, o.website_url, o.description, o.country, o.city,
                o.logo_url, o.social_media, o.active, o.created_at, o.updated_at,
                o.ships_to, o.established_year, o.service_regions,
                -- Dog statistics
                COUNT(DISTINCT a.id) as total_dogs,
                COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') as new_this_week
            FROM organizations o
            LEFT JOIN animals a ON o.id = a.organization_id AND a.status = 'available'
            WHERE o.active = true
            GROUP BY o.id, o.name, o.website_url, o.description, o.country, o.city,
                     o.logo_url, o.social_media, o.active, o.created_at, o.updated_at,
                     o.ships_to, o.established_year, o.service_regions
            ORDER BY o.name
        """
        )

        organizations = cursor.fetchall()

        # Parse JSON fields and prepare data
        for org in organizations:
            # Parse social_media JSON strings if needed
            if org.get("social_media") and isinstance(org["social_media"], str):
                try:
                    org["social_media"] = json.loads(org["social_media"])
                except json.JSONDecodeError:
                    org["social_media"] = {}
            elif org.get("social_media") is None:
                org["social_media"] = {}

            # Parse ships_to JSON if needed
            if org.get("ships_to") and isinstance(org["ships_to"], str):
                try:
                    org["ships_to"] = json.loads(org["ships_to"])
                except json.JSONDecodeError:
                    org["ships_to"] = []
            elif org.get("ships_to") is None:
                org["ships_to"] = []

            # Parse service_regions JSON if needed
            if org.get("service_regions") and isinstance(org["service_regions"], str):
                try:
                    org["service_regions"] = json.loads(org["service_regions"])
                except json.JSONDecodeError:
                    org["service_regions"] = []
            elif org.get("service_regions") is None:
                org["service_regions"] = []

        return organizations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/{organization_id}", response_model=Organization)
def get_organization(organization_id: int, cursor: RealDictCursor = Depends(get_db_cursor)):
    """
    Get a specific organization by ID.

    Returns detailed information about the requested organization including statistics.
    """
    try:
        cursor.execute(
            """
            SELECT
                o.id, o.name, o.website_url, o.description, o.country, o.city,
                o.logo_url, o.social_media, o.active, o.created_at, o.updated_at,
                o.ships_to, o.established_year, o.service_regions,
                -- Dog statistics
                COUNT(DISTINCT a.id) as total_dogs,
                COUNT(DISTINCT a.id) FILTER (WHERE a.created_at >= NOW() - INTERVAL '7 days') as new_this_week
            FROM organizations o
            LEFT JOIN animals a ON o.id = a.organization_id AND a.status = 'available'
            WHERE o.id = %s AND o.active = true
            GROUP BY o.id, o.name, o.website_url, o.description, o.country, o.city,
                     o.logo_url, o.social_media, o.active, o.created_at, o.updated_at,
                     o.ships_to, o.established_year, o.service_regions
        """,
            (organization_id,),
        )

        organization = cursor.fetchone()

        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")

        # Parse JSON fields and prepare data (same as list endpoint)
        # Parse social_media JSON strings if needed
        if organization.get("social_media") and isinstance(organization["social_media"], str):
            try:
                organization["social_media"] = json.loads(organization["social_media"])
            except json.JSONDecodeError:
                organization["social_media"] = {}
        elif organization.get("social_media") is None:
            organization["social_media"] = {}

        # Parse ships_to JSON if needed
        if organization.get("ships_to") and isinstance(organization["ships_to"], str):
            try:
                organization["ships_to"] = json.loads(organization["ships_to"])
            except json.JSONDecodeError:
                organization["ships_to"] = []
        elif organization.get("ships_to") is None:
            organization["ships_to"] = []

        # Parse service_regions JSON if needed
        if organization.get("service_regions") and isinstance(organization["service_regions"], str):
            try:
                organization["service_regions"] = json.loads(organization["service_regions"])
            except json.JSONDecodeError:
                organization["service_regions"] = []
        elif organization.get("service_regions") is None:
            organization["service_regions"] = []

        return organization
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


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
            WHERE organization_id = %s AND status = 'available' AND primary_image_url IS NOT NULL
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
            # Use Cloudinary transformations for thumbnails if available
            if dog_data.get("primary_image_url") and "cloudinary.com" in dog_data["primary_image_url"]:
                # Generate thumbnail URL (96x96 for card previews)
                thumbnail_url = dog_data["primary_image_url"].replace("/upload/", "/upload/w_96,h_96,c_fill,g_auto/")
                dog_data["thumbnail_url"] = thumbnail_url
            else:
                dog_data["thumbnail_url"] = dog_data["primary_image_url"]

            dogs_with_thumbnails.append(dog_data)

        return dogs_with_thumbnails

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


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
            WHERE a.organization_id = %s AND a.status = 'available'
            """,
            (organization_id,),
        )

        stats = cursor.fetchone()

        if not stats:
            return {"total_dogs": 0, "new_this_week": 0, "new_this_month": 0}

        return dict(stats)

    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
