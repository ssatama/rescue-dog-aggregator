# api/services/service_factory.py

"""
Service factory for dependency injection.

This module provides factory functions to create service instances
with their dependencies injected.
"""

from psycopg2.extras import RealDictCursor

from .animal_service import AnimalService


def create_animal_service(cursor: RealDictCursor) -> AnimalService:
    """
    Create an AnimalService instance with dependencies injected.

    Args:
        cursor: Database cursor for the service to use

    Returns:
        Configured AnimalService instance
    """
    return AnimalService(cursor)


class ServiceFactory:
    """Factory class for creating service instances."""

    def __init__(self, cursor: RealDictCursor):
        self.cursor = cursor

    def create_animal_service(self) -> AnimalService:
        """Create an AnimalService instance."""
        return create_animal_service(self.cursor)
