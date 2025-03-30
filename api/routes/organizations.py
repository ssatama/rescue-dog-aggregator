# api/routes/organizations.py

from typing import List
from fastapi import APIRouter, Depends, HTTPException
import psycopg2

from api.dependencies import get_db_connection
from api.models.organization import Organization

router = APIRouter()

@router.get("/", response_model=List[Organization])
def get_organizations(conn=Depends(get_db_connection)):
    """
    Get all organizations.
    
    Returns a list of all active rescue organizations.
    """
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM organizations
            WHERE active = TRUE
            ORDER BY name
        """)
        
        organizations = cursor.fetchall()
        return list(organizations)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{organization_id}", response_model=Organization)
def get_organization(organization_id: int, conn=Depends(get_db_connection)):
    """
    Get a specific organization by ID.
    
    Returns detailed information about the requested organization.
    """
    try:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM organizations
            WHERE id = %s
        """, (organization_id,))
        
        organization = cursor.fetchone()
        
        if not organization:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        return organization
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")