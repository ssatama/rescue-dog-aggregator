# utils/cloudinary_utils.py

import logging
import os
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import urlparse

import cloudinary.uploader
import requests

from utils.cloudinary_service import CloudinaryService

logger = logging.getLogger(__name__)


class OrganizationLogoUploadError(Exception):
    """Raised when organization logo upload fails."""

    pass


class OrganizationLogoUploader:
    """Handles organization logo uploads to Cloudinary with multiple size presets."""

    # Logo size presets
    PRESETS = {
        "thumbnail": {"width": 64, "height": 64, "crop": "fill", "gravity": "center"},
        "medium": {"width": 128, "height": 128, "crop": "fill", "gravity": "center"},
        "large": {"width": 256, "height": 256, "crop": "fill", "gravity": "center"},
        "original": {"fetch_format": "auto", "quality": "auto"},
    }

    @classmethod
    def upload_organization_logo(cls, org_id: str, logo_url: str, force_upload: bool = False) -> Dict[str, str]:
        """
        Upload organization logo to Cloudinary with multiple size presets.

        Args:
            org_id: Organization ID for naming
            logo_url: URL of the logo to upload
            force_upload: Force upload even if Cloudinary is not configured

        Returns:
            Dictionary with Cloudinary URLs for different sizes

        Raises:
            OrganizationLogoUploadError: If upload fails
        """
        if not logo_url or not logo_url.strip():
            logger.warning(f"No logo URL provided for organization {org_id}")
            return {}

        # Skip GIF files - they can be large and cause timeouts
        if logo_url.lower().endswith(".gif"):
            logger.info(f"Skipping Cloudinary upload for GIF logo for {org_id}, using original URL")
            return {"original": logo_url}

        # Check Cloudinary configuration
        if not CloudinaryService._check_configuration():
            if force_upload:
                raise OrganizationLogoUploadError(f"Cloudinary not configured but force_upload=True for {org_id}")
            else:
                logger.info(f"Cloudinary not configured, skipping logo upload for {org_id}")
                return {"original": logo_url}

        try:
            # Check if it's a local file path
            if cls._is_local_file_path(logo_url):
                logger.info(f"Detected local file path for {org_id}: {logo_url}")
                upload_result = cls._upload_local_file(org_id, logo_url)
                if not upload_result:
                    raise OrganizationLogoUploadError(f"Failed to upload local file for {org_id}")
            else:
                # Handle remote URL
                parsed_url = urlparse(logo_url)
                if not parsed_url.scheme or not parsed_url.netloc:
                    raise OrganizationLogoUploadError(f"Invalid logo URL for {org_id}: {logo_url}")

                # Test if URL is accessible
                response = requests.head(logo_url, timeout=10, allow_redirects=True)
                if response.status_code >= 400:
                    raise OrganizationLogoUploadError(f"Logo URL not accessible for {org_id}: {response.status_code}")

                # Upload to Cloudinary using the existing service method
                upload_result, success = CloudinaryService.upload_image_from_url(
                    logo_url,
                    animal_name=f"logo_{org_id}",
                    organization_name=org_id,
                    raise_on_missing_config=False,
                )

                if not success or not upload_result:
                    raise OrganizationLogoUploadError(f"Failed to upload logo for {org_id}")

            # Generate URLs for different sizes
            urls = {}
            for preset_name, transformations in cls.PRESETS.items():
                if preset_name == "original":
                    urls[preset_name] = upload_result
                else:
                    # Generate transformation URL
                    transform_params = []
                    if isinstance(transformations, dict):
                        for key, value in transformations.items():
                            if key == "width":
                                transform_params.append(f"w_{value}")
                            elif key == "height":
                                transform_params.append(f"h_{value}")
                            elif key == "crop":
                                transform_params.append(f"c_{value}")
                            elif key == "gravity":
                                transform_params.append(f"g_{value}")
                    # Build transformation URL
                    base_url = upload_result.replace("/upload/", f'/upload/{",".join(transform_params)}/')
                    urls[preset_name] = base_url
                    urls[preset_name] = base_url

            logger.info(f"Successfully uploaded logo for organization {org_id}")
            return urls

        except requests.RequestException as e:
            raise OrganizationLogoUploadError(f"Failed to access logo URL for {org_id}: {str(e)}")
        except Exception as e:
            raise OrganizationLogoUploadError(f"Failed to upload logo for {org_id}: {str(e)}")

    @classmethod
    def _is_local_file_path(cls, path: str) -> bool:
        """Check if the path is a local file path (not a URL)."""
        if not path:
            return False

        # Check if it's a URL
        parsed = urlparse(path)
        if parsed.scheme in ("http", "https"):
            return False

        # Check if it looks like a file path
        if "/" in path or "\\" in path or path.startswith("."):
            return True

        # Check if file exists (relative or absolute path)
        return Path(path).exists()

    @classmethod
    def _upload_local_file(cls, org_id: str, file_path: str) -> Optional[str]:
        """Upload a local file to Cloudinary and return the URL."""
        try:
            # Resolve the file path
            file_path = str(Path(file_path).resolve())

            if not os.path.exists(file_path):
                logger.error(f"Local file not found for {org_id}: {file_path}")
                return None

            # Check if it's an image file
            valid_extensions = {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"}
            file_ext = Path(file_path).suffix.lower()
            if file_ext not in valid_extensions:
                logger.error(f"Invalid image file type for {org_id}: {file_ext}")
                return None

            # Check Cloudinary configuration
            if not CloudinaryService._check_configuration():
                logger.error(f"Cloudinary not configured for local file upload: {org_id}")
                return None

            # Upload directly to Cloudinary
            public_id = f"organizations/logos/{org_id}"

            result = cloudinary.uploader.upload(
                file_path,
                public_id=public_id,
                folder="organizations/logos",
                overwrite=True,
                resource_type="image",
                format="jpg",  # Convert to jpg for consistency
                quality="auto",
                fetch_format="auto",
            )

            if result and "secure_url" in result:
                logger.info(f"Successfully uploaded local file for {org_id}: {file_path}")
                return str(result["secure_url"])
            else:
                logger.error(f"Cloudinary upload failed for {org_id}: no URL returned")
                return None

        except Exception as e:
            logger.error(f"Failed to upload local file for {org_id}: {str(e)}")
            return None

    @classmethod
    def get_logo_urls(cls, org_id: str, base_url: str) -> Dict[str, str]:
        """
        Generate logo URLs for different sizes from a Cloudinary base URL.

        Args:
            org_id: Organization ID
            base_url: Base Cloudinary URL

        Returns:
            Dictionary with URLs for different sizes
        """
        if not base_url or "cloudinary.com" not in base_url:
            logger.warning(f"Invalid Cloudinary URL for {org_id}: {base_url}")
            return {"original": base_url}

        urls = {"original": base_url}

        for preset_name, transformations in cls.PRESETS.items():
            if preset_name == "original":
                continue

            # Generate transformation URL
            transform_params = []
            if isinstance(transformations, dict):
                for key, value in transformations.items():
                    if key == "width":
                        transform_params.append(f"w_{value}")
                    elif key == "height":
                        transform_params.append(f"h_{value}")
                    elif key == "crop":
                        transform_params.append(f"c_{value}")
                    elif key == "gravity":
                        transform_params.append(f"g_{value}")
            # Build transformation URL
            transform_url = base_url.replace("/upload/", f'/upload/{",".join(transform_params)}/')
            urls[preset_name] = transform_url

        return urls

    @classmethod
    def cleanup_old_logos(cls, org_id: str) -> bool:
        """
        Clean up old logo versions for an organization.

        Args:
            org_id: Organization ID

        Returns:
            True if cleanup successful, False otherwise
        """
        if not CloudinaryService._check_configuration():
            logger.info(f"Cloudinary not configured, skipping cleanup for {org_id}")
            return True

        try:
            # For now, just log that we would clean up - the service doesn't have a
            # delete method
            logger.info(f"Logo cleanup requested for organization {org_id} (cleanup not implemented)")
            return True

        except Exception as e:
            logger.warning(f"Failed to cleanup old logos for {org_id}: {str(e)}")
            return False
