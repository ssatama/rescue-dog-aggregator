# api/models/organization.py

from typing import Dict, Optional
from pydantic import BaseModel, Field
from datetime import datetime


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

    # our new social_media field
    social_media: Dict[str, str] = Field(default_factory=dict)

    class Config:
        # ignore any extra keys (so if we ever back‐fill more later, tests won’t break)
        extra = "ignore"
