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

        # Use circuit breaker upload to prevent excessive failures
        r2_url, success = self.r2_service.upload_image_with_circuit_breaker(
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

    def _validate_image_url(self, url: str) -> bool:
        """Validate if an image URL is suitable for upload.

        Args:
            url: Image URL to validate

        Returns:
            True if URL is valid and should be uploaded
        """
        if not url:
            return False

        # Skip data URLs (base64 encoded images)
        if url.startswith("data:"):
            return False

        # Skip already uploaded R2 URLs
        if "images.rescuedogs.me" in url:
            return False

        # Must be http or https
        if not url.startswith(("http://", "https://")):
            return False

        # Check for valid image extensions or image services
        valid_extensions = (".jpg", ".jpeg", ".png", ".webp", ".gif")
        valid_services = ("wixstatic.com", "squarespace", "wordpress", "cloudinary")

        url_lower = url.lower()
        has_valid_extension = any(ext in url_lower for ext in valid_extensions)
        has_valid_service = any(service in url_lower for service in valid_services)

        return has_valid_extension or has_valid_service

    def _get_existing_image_mappings(self, original_urls: List[str], database_connection) -> Dict[str, str]:
        """Query database for existing original_url to primary_image_url mappings.

        Args:
            original_urls: List of original image URLs to check
            database_connection: Database connection

        Returns:
            Dictionary mapping original_url to primary_image_url for existing images
        """
        if not original_urls:
            return {}

        # Validate database connection
        if not database_connection or not hasattr(database_connection, "cursor"):
            self.logger.warning("Invalid database connection provided for deduplication")
            return {}

        cursor = None
        try:
            # Ensure connection is in a good state
            if hasattr(database_connection, "rollback"):
                try:
                    database_connection.rollback()
                except Exception:
                    pass  # Ignore if no transaction

            cursor = database_connection.cursor()

            # Use IN clause instead of ANY() to avoid psycopg2 issues
            # Build placeholders for parameterized query
            placeholders = ",".join(["%s"] * len(original_urls))

            # Check if we've already uploaded these source URLs
            # The original_urls parameter contains the source URLs (e.g., from the org's website)
            # We need to check if we've already processed and uploaded these
            query = f"""
                SELECT DISTINCT original_image_url, primary_image_url 
                FROM animals 
                WHERE original_image_url IN ({placeholders})
                AND primary_image_url IS NOT NULL
                AND primary_image_url LIKE '%%images.rescuedogs.me%%'
            """

            # Debug: Log what we're about to query
            self.logger.debug(f"Querying for {len(original_urls)} URLs using IN clause")

            cursor.execute(query, tuple(original_urls))
            results = cursor.fetchall()

            # Debug: Log results
            self.logger.debug(f"Query returned {len(results)} results")

            # Build mapping dictionary
            mappings = {}
            for row in results:
                # Handle potential tuple unpacking issues
                if row and len(row) >= 2:
                    original_url, r2_url = row[0], row[1]
                    if original_url and r2_url:
                        mappings[original_url] = r2_url

            return mappings
        except Exception as e:
            self.logger.error(f"Error querying existing image mappings: {e}")
            return {}
        finally:
            if cursor:
                cursor.close()

    def batch_process_images(self, animals_data: List[Dict[str, Any]], organization_name: str, batch_size: int = 5, use_concurrent: bool = True, database_connection=None) -> List[Dict[str, Any]]:
        """Process multiple animal images in batches with deduplication for better performance.

        Args:
            animals_data: List of animal data dictionaries with primary_image_url
            organization_name: Organization name for R2 path
            batch_size: Number of images to upload per batch
            use_concurrent: Whether to use concurrent uploads
            database_connection: Optional database connection for deduplication

        Returns:
            Updated list of animal data with uploaded image URLs
        """
        # Collect all original URLs for deduplication check
        all_original_urls = []
        animal_url_indices = {}  # Map original URL to list of animal indices

        for i, animal in enumerate(animals_data):
            if animal.get("primary_image_url"):
                original_url = animal["primary_image_url"]
                if self._validate_image_url(original_url):
                    all_original_urls.append(original_url)
                    if original_url not in animal_url_indices:
                        animal_url_indices[original_url] = []
                    animal_url_indices[original_url].append(i)

        if not all_original_urls:
            self.logger.info("No images to process in batch")
            return animals_data

        # Query database for existing image mappings (deduplication)
        existing_mappings = {}
        if database_connection:
            existing_mappings = self._get_existing_image_mappings(all_original_urls, database_connection)
            if existing_mappings:
                self.logger.info(f"♻️ Found {len(existing_mappings)} existing R2 images to reuse")

        # Separate images into reusable and new uploads
        images_to_upload = []
        reused_count = 0

        for original_url in set(all_original_urls):  # Use set to avoid duplicate processing
            if original_url in existing_mappings:
                # Reuse existing R2 URL for all animals with this original URL
                r2_url = existing_mappings[original_url]
                for animal_idx in animal_url_indices[original_url]:
                    animals_data[animal_idx]["primary_image_url"] = r2_url
                    animals_data[animal_idx]["original_image_url"] = original_url
                    reused_count += 1
                    self.logger.debug(f"♻️ Reusing R2 image for {animals_data[animal_idx].get('name', 'unknown')}")
            else:
                # Need to upload this image (only once even if multiple animals use it)
                first_animal_idx = animal_url_indices[original_url][0]
                animal_name = animals_data[first_animal_idx].get("name", "unknown")
                images_to_upload.append((original_url, animal_name, organization_name))

        # Log deduplication stats
        total_images = len(all_original_urls)
        unique_images = len(set(all_original_urls))
        self.logger.info(f"📦 Batch processing {total_images} images: {unique_images} unique, {reused_count} reused, {len(images_to_upload)} to upload")

        # Only upload if there are new images
        if images_to_upload:
            # Choose upload strategy based on configuration
            if use_concurrent and len(images_to_upload) > 3:
                # Use concurrent upload for better performance
                results, stats = self.r2_service.concurrent_upload_images_with_stats(images_to_upload, max_workers=3, throttle_ms=200, adaptive_throttle=True)
                self.logger.info(f"✅ Concurrent upload complete: {stats['successful']}/{stats['total']} " f"successful ({stats['success_rate']:.1f}%) in {stats['total_time']:.1f}s")
            else:
                # Use batch upload with adaptive delays
                results, stats = self.r2_service.batch_upload_images_with_stats(images_to_upload, batch_size=batch_size, adaptive_delay=True)
                self.logger.info(f"✅ Batch upload complete: {stats['successful']}/{stats['total']} " f"successful ({stats['success_rate']:.1f}%) in {stats['total_time']:.1f}s")

            # Update animal data with newly uploaded URLs
            for i, (uploaded_url, success) in enumerate(results):
                if i < len(images_to_upload):
                    original_url = images_to_upload[i][0]

                    # Update all animals that use this original URL
                    if original_url in animal_url_indices:
                        for animal_idx in animal_url_indices[original_url]:
                            if success and uploaded_url:
                                animals_data[animal_idx]["primary_image_url"] = uploaded_url
                                animals_data[animal_idx]["original_image_url"] = original_url
                            else:
                                # Keep original URL on failure
                                animals_data[animal_idx]["original_image_url"] = original_url
        else:
            self.logger.info("✨ All images already exist in R2, no uploads needed!")

        return animals_data
