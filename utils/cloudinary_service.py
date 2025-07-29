# utils/cloudinary_service.py - Backward compatible version

import hashlib
import logging
import os

import cloudinary
import cloudinary.api
import cloudinary.uploader
import requests

logger = logging.getLogger(__name__)


class CloudinaryConfigurationError(Exception):
    """Raised when Cloudinary is not properly configured."""

    pass


class CloudinaryService:
    _config_checked = False
    _config_valid = False

    @classmethod
    def _reset_config_cache(cls):
        """Reset configuration cache for testing purposes."""
        cls._config_checked = False
        cls._config_valid = False

    @classmethod
    def _check_configuration(cls):
        """Check Cloudinary configuration once and cache result."""
        if cls._config_checked:
            return cls._config_valid

        cls._config_checked = True

        required_vars = [
            "CLOUDINARY_CLOUD_NAME",
            "CLOUDINARY_API_KEY",
            "CLOUDINARY_API_SECRET",
        ]
        missing_vars = [var for var in required_vars if not os.getenv(var)]

        if missing_vars:
            logger.info(f"Cloudinary not configured (missing: {', '.join(missing_vars)}). " "Using original image URLs.")
            cls._config_valid = False
            return False

        # Configure Cloudinary
        cloudinary.config(
            cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
            api_key=os.getenv("CLOUDINARY_API_KEY"),
            api_secret=os.getenv("CLOUDINARY_API_SECRET"),
            secure=True,
        )

        cls._config_valid = True
        logger.info("Cloudinary successfully configured")
        return True

    @classmethod
    def is_configured(cls):
        """Check if Cloudinary is properly configured."""
        return cls._check_configuration()

    @staticmethod
    def upload_image_from_url(
        image_url,
        animal_name,
        organization_name="unknown",
        raise_on_missing_config=False,
    ):
        """
        Upload image to Cloudinary from URL and return the optimized URL.

        Args:
            image_url (str): Original image URL
            animal_name (str): Name of the animal for folder organization
            organization_name (str): Organization name for folder organization
            raise_on_missing_config (bool): If True, raise exception when Cloudinary not configured

        Returns:
            tuple: (cloudinary_url_or_original_url, success_boolean)

        Raises:
            CloudinaryConfigurationError: If raise_on_missing_config=True and Cloudinary not configured
        """
        if not image_url:
            logger.warning("No image URL provided")
            return None, False

        # Check configuration
        if not CloudinaryService._check_configuration():
            if raise_on_missing_config:
                raise CloudinaryConfigurationError("Cloudinary not properly configured. Missing environment variables.")

            # Fallback: return original URL with success=False (indicates
            # fallback)
            logger.debug(f"Cloudinary not configured, using original URL: {image_url}")
            return image_url, False

        try:
            # Create a unique public_id using URL hash to avoid duplicates
            url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
            safe_animal_name = animal_name.lower().replace(" ", "_").replace("-", "_")
            safe_org_name = organization_name.lower().replace(" ", "_").replace("-", "_")

            public_id = f"rescue_dogs/{safe_org_name}/{safe_animal_name}_{url_hash}"

            # Check if image already exists in Cloudinary
            try:
                existing = cloudinary.api.resource(public_id)
                if existing:
                    logger.debug(f"Image already exists in Cloudinary: {public_id}")
                    return existing["secure_url"], True
            except cloudinary.exceptions.NotFound:
                # Image doesn't exist, proceed with upload
                pass
            except Exception as e:
                logger.warning(f"Could not check existing image: {e}")

            # Download the image first with timeout and headers
            headers = {"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"}

            response = requests.get(image_url, timeout=30, headers=headers)
            response.raise_for_status()

            if response.status_code != 200:
                logger.warning(f"Failed to download image {image_url}: HTTP {response.status_code}")
                return image_url, False  # Return original URL as fallback

            # Check content type
            content_type = response.headers.get("content-type", "").lower()
            if not any(img_type in content_type for img_type in ["image/jpeg", "image/jpg", "image/png", "image/webp"]):
                logger.warning(f"Invalid content type for image {image_url}: {content_type}")
                return image_url, False  # Return original URL as fallback

            # Upload to Cloudinary with minimal parameters
            result = cloudinary.uploader.upload(
                response.content,
                public_id=public_id,
                overwrite=False,  # Don't overwrite existing images
                resource_type="image",
                quality="auto",  # Auto-optimize quality
            )

            logger.info(f"Successfully uploaded image to Cloudinary: {public_id}")
            return result["secure_url"], True

        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error downloading image {image_url}: {e}")
            return image_url, False  # Return original URL as fallback

        except cloudinary.exceptions.Error as e:
            logger.warning(f"Cloudinary error uploading image {image_url}: {e}")
            return image_url, False  # Return original URL as fallback

        except Exception as e:
            logger.warning(f"Unexpected error uploading image {image_url}: {e}")
            return image_url, False  # Return original URL as fallback

    @staticmethod
    def get_optimized_url(cloudinary_url, transformation_options=None):
        """
        Get optimized URL for an existing Cloudinary image.

        Args:
            cloudinary_url (str): Existing Cloudinary URL
            transformation_options (dict): Cloudinary transformation options

        Returns:
            str: Optimized URL or original URL if not a Cloudinary URL
        """
        if not cloudinary_url or "cloudinary.com" not in cloudinary_url:
            return cloudinary_url

        if not CloudinaryService.is_configured():
            logger.debug("Cloudinary not configured, returning original URL")
            return cloudinary_url

        try:
            # Extract public_id from Cloudinary URL
            parts = cloudinary_url.split("/")
            if "upload" in parts:
                upload_index = parts.index("upload")
                public_id = "/".join(parts[upload_index + 1 :])
                # Remove file extension
                if "." in public_id:
                    public_id = public_id.rsplit(".", 1)[0]

                # Apply transformations
                if transformation_options:
                    return cloudinary.CloudinaryImage(public_id).build_url(**transformation_options)
                else:
                    return cloudinary_url

        except Exception as e:
            logger.error(f"Error generating optimized URL for {cloudinary_url}: {e}")

        return cloudinary_url

    @staticmethod
    def get_status():
        """Get Cloudinary service status for health checks."""
        return {
            "configured": CloudinaryService.is_configured(),
            "cloud_name": os.getenv("CLOUDINARY_CLOUD_NAME", "Not set"),
            "api_key_set": bool(os.getenv("CLOUDINARY_API_KEY")),
            "api_secret_set": bool(os.getenv("CLOUDINARY_API_SECRET")),
        }
