# api/routes/organizations.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException
import psycopg2
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
        return organizations
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


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
            raise HTTPException(status_code=404, detail="Organization not found")

        return organization
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
