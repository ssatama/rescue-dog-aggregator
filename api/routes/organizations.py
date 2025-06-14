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
            SELECT id, name, website_url, description, country, city,
                   logo_url, social_media, active, created_at, updated_at
            FROM organizations
            WHERE active = true
            ORDER BY name
        """
        )

        organizations = cursor.fetchall()

        # Parse social_media JSON strings if needed
        for org in organizations:
            if org.get("social_media") and isinstance(org["social_media"], str):
                try:
                    org["social_media"] = json.loads(org["social_media"])
                except json.JSONDecodeError:
                    org["social_media"] = {}
            elif org.get("social_media") is None:
                org["social_media"] = {}

        return organizations
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Database error: {str(e)}")


@router.get("/{organization_id}", response_model=Organization)
def get_organization(
    organization_id: int, cursor: RealDictCursor = Depends(get_db_cursor)
):
    """
    Get a specific organization by ID.

    Returns detailed information about the requested organization.
    """
    try:
        cursor.execute(
            """
            SELECT id, name, website_url, description, country, city,
                   logo_url, social_media, active, created_at, updated_at
            FROM organizations
            WHERE id = %s AND active = true
        """,
            (organization_id,),
        )

        organization = cursor.fetchone()

        if not organization:
            raise HTTPException(
                status_code=404, detail="Organization not found")

        # Parse social_media JSON string if needed
        if organization.get("social_media") and isinstance(
            organization["social_media"], str
        ):
            try:
                organization["social_media"] = json.loads(
                    organization["social_media"])
            except json.JSONDecodeError:
                organization["social_media"] = {}
        elif organization.get("social_media") is None:
            organization["social_media"] = {}

        return organization
    except HTTPException:
        # Re-raise HTTP exceptions (like 404)
        raise
    except psycopg2.Error as e:
        raise HTTPException(
            status_code=500, detail=f"Database error: {str(e)}")
