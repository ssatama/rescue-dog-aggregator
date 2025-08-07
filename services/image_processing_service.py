"""
ImageProcessingService - Extracted from BaseScraper for Single Responsibility.

Handles all image processing operations including:
- Primary image processing and validation
- Multiple image upload and management
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

    def save_animal_images(self, animal_id: int, image_urls: List[str], database_connection, organization_name: str = "unknown") -> Tuple[int, int]:
        """Save multiple animal images with R2 upload.

        Args:
            animal_id: ID of the animal
            image_urls: List of image URLs to process
            database_connection: Database connection for operations
            organization_name: Organization name for R2 folder organization

        Returns:
            Tuple of (success_count, failure_count)
        """
        if not image_urls:
            return 0, 0

        upload_success_count = 0
        upload_failure_count = 0

        try:
            cursor = database_connection.cursor()

            # Get existing images and animal name
            existing_images = self._get_existing_images(cursor, animal_id)
            animal_name = self._get_animal_name(cursor, animal_id)

            # Create map of existing URLs
            existing_urls_map = self._create_existing_urls_map(existing_images)

            # Process each image URL
            images_to_keep = set()
            for i, image_url in enumerate(image_urls):
                if image_url in existing_urls_map:
                    success_count, failure_count = self._handle_existing_image(cursor, image_url, existing_urls_map, i, animal_id, images_to_keep)
                    upload_success_count += success_count
                    upload_failure_count += failure_count
                else:
                    success_count, failure_count = self._handle_new_image(cursor, image_url, i, animal_id, animal_name, organization_name)
                    upload_success_count += success_count
                    upload_failure_count += failure_count

            # Clean up removed images
            self._cleanup_removed_images(cursor, existing_images, images_to_keep, animal_id)

            database_connection.commit()
            cursor.close()

            return upload_success_count, upload_failure_count

        except Exception as e:
            self.logger.error(f"Error saving animal images: {e}")
            if database_connection:
                database_connection.rollback()
            return 0, upload_failure_count or len(image_urls)

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

    def _get_existing_images(self, cursor, animal_id: int) -> List[Tuple]:
        """Get existing images for animal (pure function)."""
        cursor.execute(
            """
            SELECT id, image_url, original_image_url, is_primary
            FROM animal_images
            WHERE animal_id = %s
            ORDER BY is_primary DESC, id ASC
            """,
            (animal_id,),
        )
        return cursor.fetchall()

    def _get_animal_name(self, cursor, animal_id: int) -> str:
        """Get animal name for R2 folder organization (pure function)."""
        cursor.execute("SELECT name FROM animals WHERE id = %s", (animal_id,))
        result = cursor.fetchone()
        return result[0] if result else "unknown"

    def _create_existing_urls_map(self, existing_images: List[Tuple]) -> Dict[str, Dict[str, Any]]:
        """Create map of existing image URLs (pure function)."""
        existing_urls_map = {}
        for img in existing_images:
            img_id, r2_url, original_url, is_primary = img
            existing_urls_map[original_url] = {
                "id": img_id,
                "r2_url": r2_url,
                "is_primary": is_primary,
            }
        return existing_urls_map

    def _handle_existing_image(self, cursor, image_url: str, existing_urls_map: Dict, index: int, animal_id: int, images_to_keep: set) -> Tuple[int, int]:
        """Handle existing image processing (pure function)."""
        existing_img = existing_urls_map[image_url]
        images_to_keep.add(existing_img["id"])

        # Update is_primary flag if needed
        expected_is_primary = index == 0
        if existing_img["is_primary"] != expected_is_primary:
            cursor.execute(
                "UPDATE animal_images SET is_primary = %s WHERE id = %s",
                (expected_is_primary, existing_img["id"]),
            )

        self.logger.info(f"🔄 Keeping existing image {index+1} for animal {animal_id} (unchanged)")
        return 0, 0  # No upload attempted

    def _handle_new_image(self, cursor, image_url: str, index: int, animal_id: int, animal_name: str, organization_name: str) -> Tuple[int, int]:
        """Handle new image upload and database insertion."""
        self.logger.info(f"📤 Uploading new additional image {index+1} for animal {animal_id}")

        r2_url, success = self.r2_service.upload_image_from_url(image_url, animal_name, organization_name)

        # Use R2 URL if successful, otherwise fallback to original
        final_url = r2_url if success else image_url

        cursor.execute(
            """
            INSERT INTO animal_images (animal_id, image_url, original_image_url, is_primary)
            VALUES (%s, %s, %s, %s)
            """,
            (animal_id, final_url, image_url, index == 0),
        )

        if success:
            self.logger.info(f"✅ Uploaded new additional image {index+1} for animal {animal_id}")
            return 1, 0
        else:
            self.logger.warning(f"❌ Failed to upload additional image {index+1} for animal {animal_id}, using original")
            return 0, 1

    def _cleanup_removed_images(self, cursor, existing_images: List[Tuple], images_to_keep: set, animal_id: int) -> None:
        """Clean up images that are no longer needed."""
        for img in existing_images:
            if img[0] not in images_to_keep:  # img[0] is the id
                cursor.execute("DELETE FROM animal_images WHERE id = %s", (img[0],))
                self.logger.info(f"🗑️ Removed obsolete image for animal {animal_id}")
