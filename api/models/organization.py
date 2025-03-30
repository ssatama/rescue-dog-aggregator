# api/models/organization.py

from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class OrganizationBase(BaseModel):
    """Base schema with common organization attributes."""
    name: str
    website_url: str
    description: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None
    
class Organization(OrganizationBase):
    """Complete organization schema including database fields."""
    id: int
    active: bool = True
    created_at: datetime
    updated_at: datetime