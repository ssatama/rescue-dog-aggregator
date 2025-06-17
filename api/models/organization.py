# api/models/organization.py

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class Organization(BaseModel):
    id: int
    name: str

    website_url: Optional[str] = None
    description: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    logo_url: Optional[str] = None
    active: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Enhanced fields for organization profiles
    social_media: Dict[str, str] = Field(default_factory=dict)
    ships_to: List[str] = Field(default_factory=list)
    established_year: Optional[int] = None

    class Config:
        # ignore any extra keys (so if we ever back‐fill more later, tests
        # won’t break)
        extra = "ignore"
