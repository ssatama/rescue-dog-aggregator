# api/models/dog.py

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field
from datetime import datetime

class DogImage(BaseModel):
    """Schema for a dog image."""
    id: int
    image_url: str
    is_primary: bool = False

class DogBase(BaseModel):
    """Base schema with common dog attributes."""
    name: str
    breed: Optional[str] = None
    age_text: Optional[str] = None
    sex: Optional[str] = None
    size: Optional[str] = None
    status: str = "available"
    primary_image_url: Optional[str] = None
    adoption_url: str
    
class Dog(DogBase):
    """Complete dog schema including database fields."""
    id: int
    organization_id: int
    external_id: Optional[str] = None
    language: str = "en"
    properties: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    last_scraped_at: Optional[datetime] = None
    
class DogWithImages(Dog):
    """Dog with its associated images."""
    images: List[DogImage] = []
    
class DogFilter(BaseModel):
    """Schema for filtering dogs."""
    breed: Optional[str] = None
    sex: Optional[str] = None
    size: Optional[str] = None
    status: Optional[str] = None
    organization_id: Optional[int] = None
    
class PaginationParams(BaseModel):
    """Schema for pagination parameters."""
    page: int = 1
    limit: int = 20