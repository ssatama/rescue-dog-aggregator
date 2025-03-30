# api/routes/dogs.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import psycopg2

from api.dependencies import get_db_connection
from api.models.dog import Dog, DogWithImages, DogImage

router = APIRouter()

@router.get("/", response_model=List[Dog])
def get_dogs(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    breed: Optional[str] = None,
    sex: Optional[str] = None,
    size: Optional[str] = None,
    status: Optional[str] = "available",
    organization_id: Optional[int] = None,
    conn=Depends(get_db_connection)
):
    """
    Get all dogs with filtering and pagination.
    
    Returns a list of dogs matching the specified filters.
    """
    try:
        # Build SQL query with filters
        query = """
            SELECT * FROM dogs
            WHERE 1=1
        """
        params = []
        
        # Add filters if provided
        if breed:
            query += " AND breed ILIKE %s"
            params.append(f"%{breed}%")
        
        if sex:
            query += " AND sex = %s"
            params.append(sex)
        
        if size:
            query += " AND size = %s"
            params.append(size)
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        if organization_id:
            query += " AND organization_id = %s"
            params.append(organization_id)
        
        # Add pagination
        query += " ORDER BY updated_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, (page - 1) * limit])
        
        # Execute query
        cursor = conn.cursor()
        cursor.execute(query, params)
        dogs = cursor.fetchall()
        
        return list(dogs)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{dog_id}", response_model=DogWithImages)
def get_dog(dog_id: int, conn=Depends(get_db_connection)):
    """
    Get a specific dog by ID.
    
    Returns detailed information about the requested dog including all images.
    """
    try:
        # Get dog details
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM dogs
            WHERE id = %s
        """, (dog_id,))
        
        dog = cursor.fetchone()
        
        if not dog:
            raise HTTPException(status_code=404, detail="Dog not found")
        
        # Get dog images
        cursor.execute("""
            SELECT * FROM dog_images
            WHERE dog_id = %s
            ORDER BY is_primary DESC
        """, (dog_id,))
        
        images = cursor.fetchall()
        
        # Create response
        result = dict(dog)
        result["images"] = list(images)
        
        return result
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")