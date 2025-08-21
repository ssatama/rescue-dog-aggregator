"""
Pydantic models for enhanced animal data (LLM-generated content).

Following CLAUDE.md principles:
- Immutable data models
- Clear validation
- No side effects
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator


class EnhancedAttributes(BaseModel):
    """LLM-generated enhanced attributes with tagline support."""
    
    description: Optional[str] = None
    tagline: Optional[str] = None  # Short compelling tagline for detail pages
    personality_traits: Optional[List[str]] = Field(default_factory=list)
    energy_level: Optional[str] = None
    trainability: Optional[str] = None
    experience_level: Optional[str] = None
    grooming_needs: Optional[str] = None
    exercise_needs: Optional[str] = None
    good_with_kids: Optional[bool] = None
    good_with_dogs: Optional[bool] = None
    good_with_cats: Optional[bool] = None
    good_with_strangers: Optional[bool] = None
    special_needs: Optional[List[str]] = Field(default_factory=list)
    ideal_home: Optional[str] = None
    
    @field_validator('energy_level', 'trainability', 'experience_level', 'grooming_needs', 'exercise_needs')
    @classmethod
    def validate_enum_fields(cls, v):
        """Validate enum-like fields are from expected values."""
        if v is None:
            return v
        
        # Normalize to lowercase for comparison
        normalized = v.lower() if isinstance(v, str) else v
        
        valid_energy = ['low', 'medium', 'high', 'very_high']
        valid_trainability = ['low', 'moderate', 'high', 'very_high']
        valid_experience = ['beginner', 'intermediate', 'experienced']
        valid_grooming = ['minimal', 'moderate', 'high', 'professional']
        valid_exercise = ['minimal', 'moderate', 'high', 'very_high']
        
        # Return normalized value if valid, otherwise return as-is
        # (to handle edge cases gracefully)
        return normalized if isinstance(normalized, str) else v


class EnhancedAnimalResponse(BaseModel):
    """Response model for enhanced animal data."""
    
    id: int
    name: str
    slug: str
    enhanced_data_available: bool
    enhanced_attributes: Optional[EnhancedAttributes] = None
    data_completeness_score: float = Field(
        ..., 
        ge=0, 
        le=100,
        description="Percentage of enhanced fields populated (0-100)"
    )
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the enhanced data"
    )


class BulkEnhancedRequest(BaseModel):
    """Request model for bulk enhanced data retrieval."""
    
    animal_ids: List[int] = Field(
        ...,
        min_items=1,
        max_items=100,
        description="List of animal IDs to fetch (max 100)"
    )
    include_fields: Optional[List[str]] = Field(
        None,
        description="Optional list of specific fields to include"
    )
    
    @field_validator('animal_ids')
    @classmethod
    def validate_animal_ids(cls, v):
        """Ensure all animal IDs are positive."""
        if any(aid <= 0 for aid in v):
            raise ValueError("All animal IDs must be positive integers")
        return v


class DetailContentResponse(BaseModel):
    """Optimized response for detail page content."""
    
    id: int
    description: Optional[str] = None
    tagline: Optional[str] = None
    has_enhanced_data: bool


class AttributesRequest(BaseModel):
    """Request for specific attributes."""
    
    animal_ids: List[int] = Field(
        ...,
        min_items=1,
        max_items=1000,
        description="Animal IDs to query"
    )
    attributes: List[str] = Field(
        ...,
        min_items=1,
        max_items=20,
        description="Attribute names to fetch"
    )
    
    @field_validator('animal_ids')
    @classmethod
    def validate_animal_ids(cls, v):
        """Ensure all animal IDs are positive."""
        if any(aid <= 0 for aid in v):
            raise ValueError("All animal IDs must be positive integers")
        return v
    
    @field_validator('attributes')
    @classmethod
    def validate_attributes(cls, v):
        """Validate attribute names."""
        valid_attributes = {
            'description', 'tagline', 'personality_traits',
            'energy_level', 'trainability', 'experience_level',
            'grooming_needs', 'exercise_needs', 'good_with_kids',
            'good_with_dogs', 'good_with_cats', 'good_with_strangers',
            'special_needs', 'ideal_home'
        }
        
        invalid = set(v) - valid_attributes
        if invalid:
            raise ValueError(f"Invalid attributes: {', '.join(invalid)}")
        
        return v


class AttributesResponse(BaseModel):
    """Response for attributes query."""
    
    data: Dict[int, Dict[str, Any]] = Field(
        ...,
        description="Map of animal ID to requested attributes"
    )
    requested_attributes: List[str]
    animals_found: int