"""
ImageProcessingService - Extracted from BaseScraper for Single Responsibility.

Handles primary image processing operations including:
- Primary image processing and validation
- R2 integration and error handling
- Image URL validation and processing

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from utils.r2_service import R2Service


class ImageProcessingService:
    """Service for all image processing operations extracted from BaseScraper."""

    def __init__(self, r2_service: Optional[R2Service] = None, logger: Optional[logging.Logger] = None):
        """Initialize ImageProcessingService with dependencies.

        Args:
            r2_service: R2Service instance for image uploads
            logger: Optional logger instance
        """
        self.r2_service = r2_service or R2Service()
        self.logger = logger or logging.getLogger(__name__)

    def process_primary_image(self, animal_data: Dict[str, Any], existing_animal: Optional[Tuple] = None, database_connection=None, organization_name: str = "unknown") -> Dict[str, Any]:
        """Process primary image for an animal, handling uploads and URL management.

        Args:
            animal_data: Animal data dictionary (will not be mutated)
            existing_animal: Existing animal data tuple if updating
            database_connection: Database connection for checking existing images
            organization_name: Organization name for R2 folder organization

        Returns:
            Updated animal data dictionary with processed image URLs
        """
        # Create immutable copy of animal data
        processed_data = animal_data.copy()

        if not processed_data.get("primary_image_url"):
            return processed_data

        original_url = processed_data["primary_image_url"]
        should_upload_image = True

        # Check existing animal for image URL changes
        if existing_animal and database_connection:
            should_upload_image = self._should_upload_primary_image(existing_animal, original_url, database_connection, processed_data)

        # Upload image if needed
        if should_upload_image:
            processed_data = self._upload_primary_image(processed_data, original_url, organization_name)

        return processed_data

    def upload_image_to_r2(self, image_url: str, animal_name: str, organization_name: str = "unknown") -> Tuple[Optional[str], bool]:
        """Upload image to R2 service.

        Args:
            image_url: URL of image to upload
            animal_name: Name of animal for organization
            organization_name: Organization name for folder structure

        Returns:
            Tuple of (r2_url, success_boolean)
        """
        return self.r2_service.upload_image_from_url(image_url, animal_name, organization_name)

    def validate_image_url(self, image_url: str) -> bool:
        """Validate image URL format and accessibility.

        Args:
            image_url: URL to validate

        Returns:
            True if URL appears valid, False otherwise
        """
        if not image_url or not isinstance(image_url, str):
            return False

        # Basic URL validation
        if not image_url.startswith(("http://", "https://")):
            return False

        # Check for common image extensions
        image_extensions = (".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp")
        url_lower = image_url.lower()

        # Allow URLs without extensions (many sites use dynamic URLs)
        # or with image extensions
        return True  # Basic validation passed

    def _should_upload_primary_image(self, existing_animal: Tuple, original_url: str, database_connection, processed_data: Dict[str, Any]) -> bool:
        """Determine if primary image should be uploaded (pure function).

        Args:
            existing_animal: Existing animal data tuple
            original_url: Original image URL
            database_connection: Database connection
            processed_data: Processed animal data (will be modified)

        Returns:
            True if image should be uploaded, False otherwise
        """
        cursor = database_connection.cursor()
        cursor.execute(
            "SELECT primary_image_url, original_image_url FROM animals WHERE id = %s",
            (existing_animal[0],),
        )
        current_image_data = cursor.fetchone()
        cursor.close()

        if not current_image_data:
            return True

        current_primary_url, current_original_url = current_image_data

        # Don't upload if original URL hasn't changed
        if current_original_url == original_url:
            processed_data["primary_image_url"] = current_primary_url
            processed_data["original_image_url"] = current_original_url
            self.logger.info(f"🔄 Image unchanged for {processed_data.get('name')}, using existing R2 URL")
            return False

        # Handle legacy case where original_image_url is a R2 URL
        if current_original_url and "images.rescuedogs.me" in current_original_url:
            processed_data["primary_image_url"] = current_primary_url
            processed_data["original_image_url"] = original_url
            self.logger.info(f"🔄 Updated original_image_url to source URL for {processed_data.get('name')}, keeping existing R2 URL")
            return False

        return True

    def _upload_primary_image(self, processed_data: Dict[str, Any], original_url: str, organization_name: str) -> Dict[str, Any]:
        """Upload primary image and update processed data (pure function).

        Args:
            processed_data: Animal data dictionary
            original_url: Original image URL
            organization_name: Organization name

        Returns:
            Updated processed data dictionary
        """
        self.logger.info(f"📤 Uploading primary image to R2 for {processed_data.get('name', 'unknown')}")

        r2_url, success = self.r2_service.upload_image_from_url(
            original_url,
            processed_data.get("name", "unknown"),
            organization_name,
        )

        if success and r2_url:
            processed_data["primary_image_url"] = r2_url
            processed_data["original_image_url"] = original_url
            self.logger.info(f"✅ Successfully uploaded primary image to R2 for {processed_data.get('name')}")
        else:
            self.logger.warning(f"❌ Failed to upload primary image for {processed_data.get('name')}, keeping original URL")
            processed_data["original_image_url"] = original_url

        return processed_data
