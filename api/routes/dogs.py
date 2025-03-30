# api/routes/dogs.py

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
import psycopg2

from api.dependencies import get_db_connection
from api.models.dog import Animal, AnimalWithImages, AnimalImage

router = APIRouter()

@router.get("/", response_model=List[Animal])
def get_animals(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    animal_type: Optional[str] = Query("dog", description="Type of animal (dog, cat)"),
    breed: Optional[str] = None,
    sex: Optional[str] = None,
    size: Optional[str] = None,
    status: Optional[str] = "available",
    organization_id: Optional[int] = None,
    search: Optional[str] = None,  # Added search parameter
    conn=Depends(get_db_connection)
):
    """
    Get all animals with filtering and pagination.
    
    Returns a list of animals matching the specified filters.
    """
    try:
        # Build SQL query with filters
        query = """
            SELECT * FROM animals
            WHERE 1=1
        """
        params = []
        
        # Add animal_type filter
        query += " AND animal_type = %s"
        params.append(animal_type)
        
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
        
        # Add search query if provided
        if search:
            query += " AND (name ILIKE %s OR breed ILIKE %s)"  # Search in both name and breed
            params.append(f"%{search}%")
            params.append(f"%{search}%")
        
        # Add pagination
        query += " ORDER BY updated_at DESC LIMIT %s OFFSET %s"
        params.extend([limit, (page - 1) * limit])
        
        # Execute query
        cursor = conn.cursor()
        cursor.execute(query, params)
        animals = cursor.fetchall()
        
        return list(animals)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.get("/{animal_id}", response_model=AnimalWithImages)
def get_animal(animal_id: int, conn=Depends(get_db_connection)):
    """
    Get a specific animal by ID.
    
    Returns detailed information about the requested animal including all images.
    """
    try:
        # Get animal details
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM animals
            WHERE id = %s
        """, (animal_id,))
        
        animal = cursor.fetchone()
        
        if not animal:
            raise HTTPException(status_code=404, detail="Animal not found")
        
        # Get animal images
        cursor.execute("""
            SELECT * FROM animal_images
            WHERE animal_id = %s
            ORDER BY is_primary DESC
        """, (animal_id,))
        
        images = cursor.fetchall()
        
        # Create response
        result = dict(animal)
        result["images"] = list(images)
        
        return result
    except psycopg2.Error as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")