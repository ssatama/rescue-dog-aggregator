# api/services/__init__.py

"""
Services package for business logic.

This package contains service classes that provide business logic
for the API, abstracting away database details from the routes.
"""

from .animal_service import AnimalService

__all__ = [
    "AnimalService",
]
