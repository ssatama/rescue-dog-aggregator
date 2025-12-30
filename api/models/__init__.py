# api/models/__init__.py

"""
API Models Package

This package contains all Pydantic models used in the Rescue Dog Aggregator API.
All models follow modern Pydantic v2 patterns with comprehensive validation,
type safety, and security features.
"""

from .dog import (
    Animal,
    AnimalBase,
    AnimalFilter,
    AnimalStatus,
    AvailabilityConfidence,
    PaginationParams,
    StandardizedSize,
)
from .organization import Organization

__all__ = [
    # Animal models
    "Animal",
    "AnimalBase",
    "AnimalFilter",
    "PaginationParams",
    # Enums
    "AnimalStatus",
    "AvailabilityConfidence",
    "StandardizedSize",
    # Organization models
    "Organization",
]
