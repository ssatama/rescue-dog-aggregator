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
    standardized_breed: Optional[str] = None,
    breed_group: Optional[str] = None,
    sex: Optional[str] = None,
    size: Optional[str] = None,
    standardized_size: Optional[str] = None,
    age_category: Optional[str] = None,
    min_age_months: Optional[int] = None,
    max_age_months: Optional[int] = None,
    status: Optional[str] = "available",
    organization_id: Optional[int] = None,
    search: Optional[str] = None,
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
        
        # Add standardized breed filter
        if standardized_breed:
            query += " AND standardized_breed = %s"
            params.append(standardized_breed)
        
        # Add breed group filter
        if breed_group:
            query += " AND properties->>'breed_group' = %s"
            params.append(breed_group)
        
        if sex:
            query += " AND sex = %s"
            params.append(sex)
        
        if size:
            query += " AND size = %s"
            params.append(size)
        
        # Add standardized size filter
        if standardized_size:
            query += " AND standardized_size = %s"
            params.append(standardized_size)
        
        # Add age range filters
        if min_age_months is not None:
            query += " AND (age_min_months >= %s OR age_max_months >= %s)"
            params.extend([min_age_months, min_age_months])
        
        if max_age_months is not None:
            query += " AND (age_min_months <= %s)"
            params.append(max_age_months)
        
        # Add age category filter using the age ranges
        if age_category:
            if age_category.lower() == 'puppy':
                query += " AND age_min_months < 12"
            elif age_category.lower() == 'young':
                query += " AND age_min_months >= 12 AND age_min_months < 36"
            elif age_category.lower() == 'adult':
                query += " AND age_min_months >= 36 AND age_min_months < 96"
            elif age_category.lower() == 'senior':
                query += " AND age_min_months >= 96"
        
        if status:
            query += " AND status = %s"
            params.append(status)
        
        if organization_id:
            query += " AND organization_id = %s"
            params.append(organization_id)
        
        # Add search query if provided
        if search:
            query += " AND (name ILIKE %s OR breed ILIKE %s OR standardized_breed ILIKE %s)"
            params.extend([f"%{search}%", f"%{search}%", f"%{search}%"])
        
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