# api/utils/json_parser.py

"""
JSON parsing utilities for API routes.

This module provides safe JSON parsing functions to eliminate code duplication
across route handlers.
"""

import json
import logging
from typing import Any, Dict, List, Optional, Union

logger = logging.getLogger(__name__)


def parse_json_field(
    data: Dict[str, Any], field: str, default_value: Optional[Union[Dict, List]] = None
) -> None:
    """
    Safely parse a JSON string field from a dictionary in-place.

    Args:
        data: Dictionary containing the field to parse
        field: Name of the field to parse
        default_value: Default value to use if parsing fails or field is None
    """
    if default_value is None:
        default_value = {}

    value = data.get(field)
    if isinstance(value, str):
        try:
            data[field] = json.loads(value)
        except json.JSONDecodeError:
            logger.warning(f"Could not parse {field} JSON: {value}")
            data[field] = default_value
    elif value is None:
        data[field] = default_value
    # If it's already a dict/list, keep it as is


def parse_organization_fields(row_dict: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse organization-related JSON fields from a database row.

    Args:
        row_dict: Dictionary containing organization data from database

    Returns:
        Dictionary with parsed organization fields
    """
    # Parse social_media JSONB - handle both string and dict cases
    org_social_media = row_dict.get("org_social_media")
    if isinstance(org_social_media, str):
        try:
            org_social_media = json.loads(org_social_media)
        except json.JSONDecodeError:
            logger.warning(f"Could not parse social_media JSON: {org_social_media}")
            org_social_media = {}
    elif org_social_media is None:
        org_social_media = {}

    # Parse ships_to JSONB - handle both string and array cases
    org_ships_to = row_dict.get("org_ships_to")
    if isinstance(org_ships_to, str):
        try:
            org_ships_to = json.loads(org_ships_to)
        except json.JSONDecodeError:
            logger.warning(f"Could not parse ships_to JSON: {org_ships_to}")
            org_ships_to = []
    elif org_ships_to is None:
        org_ships_to = []

    # Parse service_regions JSONB - handle both string and array cases
    org_service_regions = row_dict.get("org_service_regions")
    if isinstance(org_service_regions, str):
        try:
            org_service_regions = json.loads(org_service_regions)
        except json.JSONDecodeError:
            logger.warning(
                f"Could not parse service_regions JSON: {org_service_regions}"
            )
            org_service_regions = []
    elif org_service_regions is None:
        org_service_regions = []

    return {
        "social_media": org_social_media,
        "ships_to": org_ships_to,
        "service_regions": org_service_regions,
    }


def build_organization_object(row_dict: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Build nested organization object from database row.

    Args:
        row_dict: Dictionary containing organization data from database

    Returns:
        Organization dictionary or None if no organization data
    """
    if not row_dict.get("org_name"):
        return None

    org_fields = parse_organization_fields(row_dict)

    organization = {
        "id": row_dict["organization_id"],
        "name": row_dict["org_name"],
        "slug": row_dict["org_slug"],
        "city": row_dict["org_city"],
        "country": row_dict["org_country"],
        "website_url": row_dict["org_website_url"],
        "social_media": org_fields["social_media"],
        "ships_to": org_fields["ships_to"],
    }

    # Add optional fields if they exist
    if "org_logo_url" in row_dict:
        organization["logo_url"] = row_dict["org_logo_url"]
    if "org_service_regions" in row_dict:
        organization["service_regions"] = org_fields["service_regions"]
    if "org_description" in row_dict:
        organization["description"] = row_dict["org_description"]
    if "org_total_dogs" in row_dict:
        organization["total_dogs"] = row_dict["org_total_dogs"]
    if "org_new_this_week" in row_dict:
        organization["new_this_week"] = row_dict["org_new_this_week"]

    # Handle recent_dogs which could be JSON string or already parsed
    if "org_recent_dogs" in row_dict:
        recent_dogs = row_dict["org_recent_dogs"]
        if isinstance(recent_dogs, str):
            try:
                recent_dogs = json.loads(recent_dogs)
            except json.JSONDecodeError:
                logger.warning(f"Could not parse recent_dogs JSON: {recent_dogs}")
                recent_dogs = []
        elif recent_dogs is None:
            recent_dogs = []
        organization["recent_dogs"] = recent_dogs

    return organization
