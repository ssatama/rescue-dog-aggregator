# api/models/dog.py

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class AnimalImage(BaseModel):
    """Schema for an animal image."""
    id: int
    image_url: str
    is_primary: bool = False

class AnimalBase(BaseModel):
    """Base schema with common animal attributes."""
    name: str
    animal_type: str = "dog"
    breed: Optional[str] = None
    standardized_breed: Optional[str] = None
    age_text: Optional[str] = None
    age_min_months: Optional[int] = None
    age_max_months: Optional[int] = None
    sex: Optional[str] = None
    size: Optional[str] = None
    standardized_size: Optional[str] = None
    status: str = "available"
    primary_image_url: Optional[str] = None
    adoption_url: str
    
class Animal(AnimalBase):
    """Complete animal schema including database fields."""
    id: int
    organization_id: int
    external_id: Optional[str] = None
    language: str = "en"
    properties: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    last_scraped_at: Optional[datetime] = None
    
class AnimalWithImages(Animal):
    """Animal with its associated images."""
    images: List[AnimalImage] = []
    
class AnimalFilter(BaseModel):
    """Schema for filtering animals."""
    animal_type: Optional[str] = "dog"
    breed: Optional[str] = None
    standardized_breed: Optional[str] = None
    sex: Optional[str] = None
    size: Optional[str] = None
    standardized_size: Optional[str] = None
    status: Optional[str] = None
    organization_id: Optional[int] = None
    
class PaginationParams(BaseModel):
    """Schema for pagination parameters."""
    page: int = 1
    limit: int = 20