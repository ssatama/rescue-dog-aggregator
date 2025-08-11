# utils/r2_logo_uploader.py

import logging
import os
from pathlib import Path
from typing import Dict, Optional
from urllib.parse import urlparse

import requests

from utils.r2_service import R2Service

logger = logging.getLogger(__name__)


class OrganizationLogoUploadError(Exception):
    """Raised when organization logo upload fails."""

    pass


class R2OrganizationLogoUploader:
    """Handles organization logo uploads to R2 with multiple size presets."""

    # Logo size presets for Cloudflare Images transformation
    PRESETS = {
        "thumbnail": {"width": 64, "height": 64, "fit": "crop"},
        "medium": {"width": 128, "height": 128, "fit": "crop"},
        "large": {"width": 256, "height": 256, "fit": "crop"},
        "original": {"quality": 90},
    }

    @classmethod
    def upload_organization_logo(cls, org_id: str, logo_url: str, force_upload: bool = False) -> Dict[str, str]:
        """
        Upload organization logo to R2 with multiple size presets.

        Args:
            org_id: Organization ID for naming
            logo_url: URL of the logo to upload
            force_upload: Force upload even if R2 is not configured

        Returns:
            Dictionary with R2 URLs for different sizes

        Raises:
            OrganizationLogoUploadError: If upload fails
        """
        if not logo_url or not logo_url.strip():
            logger.warning(f"No logo URL provided for organization {org_id}")
            return {}

        # Skip GIF files - they can be large and cause timeouts
        if logo_url.lower().endswith(".gif"):
            logger.info(f"Skipping R2 upload for GIF logo for {org_id}, using original URL")
            return {"original": logo_url}

        # Skip R2 URLs - they are already uploaded and accessible
        if R2Service._is_r2_url(logo_url):
            logger.info(f"Detected R2 URL for {org_id}, skipping re-upload: {logo_url}")
            return {"original": logo_url}

        # Check R2 configuration
        if not R2Service.is_configured():
            if force_upload:
                raise OrganizationLogoUploadError(f"R2 not configured but force_upload=True for {org_id}")
            else:
                logger.info(f"R2 not configured, skipping logo upload for {org_id}")
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

                # Upload to R2 using the existing service method
                upload_result, success = R2Service.upload_image_from_url(
                    logo_url,
                    animal_name=f"logo_{org_id}",
                    organization_name="organizations",
                    raise_on_missing_config=False,
                )

                if not success or not upload_result:
                    raise OrganizationLogoUploadError(f"Failed to upload logo for {org_id}")

            # Generate URLs for different sizes using Cloudflare Images transformations
            urls = {}
            for preset_name, transformations in cls.PRESETS.items():
                if preset_name == "original":
                    urls[preset_name] = upload_result
                else:
                    # Use R2Service's get_optimized_url for transformations
                    urls[preset_name] = R2Service.get_optimized_url(upload_result, transformations)

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
        """Upload a local file to R2 and return the URL."""
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

            # Check R2 configuration
            if not R2Service.is_configured():
                logger.error(f"R2 not configured for local file upload: {org_id}")
                return None

            # Read file and upload to R2
            with open(file_path, "rb") as f:
                file_content = f.read()

            # Use a custom key for organization logos
            r2_key = f"rescue_dogs/organizations/org-logo-{org_id}{file_ext}"

            # Upload directly using boto3 client
            s3_client = R2Service._get_s3_client()
            bucket_name = os.getenv("R2_BUCKET_NAME")

            # Determine content type
            content_type_map = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".gif": "image/gif", ".bmp": "image/bmp", ".webp": "image/webp"}
            content_type = content_type_map.get(file_ext, "image/jpeg")

            s3_client.put_object(Bucket=bucket_name, Key=r2_key, Body=file_content, ContentType=content_type, Metadata={"type": "organization_logo", "organization_id": org_id})

            # Build the public URL
            r2_url = R2Service._build_custom_domain_url(r2_key)
            logger.info(f"Successfully uploaded local file for {org_id}: {file_path}")
            return r2_url

        except Exception as e:
            logger.error(f"Failed to upload local file for {org_id}: {str(e)}")
            return None

    @classmethod
    def get_logo_urls(cls, org_id: str, base_url: str) -> Dict[str, str]:
        """
        Generate logo URLs for different sizes from an R2 base URL.

        Args:
            org_id: Organization ID
            base_url: Base R2 URL

        Returns:
            Dictionary with URLs for different sizes
        """
        if not base_url or not R2Service._is_r2_url(base_url):
            logger.warning(f"Invalid R2 URL for {org_id}: {base_url}")
            return {"original": base_url}

        urls = {"original": base_url}

        for preset_name, transformations in cls.PRESETS.items():
            if preset_name == "original":
                continue

            # Use R2Service's get_optimized_url for transformations
            urls[preset_name] = R2Service.get_optimized_url(base_url, transformations)

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
        if not R2Service.is_configured():
            logger.info(f"R2 not configured, skipping cleanup for {org_id}")
            return True

        try:
            # For now, just log that we would clean up
            logger.info(f"Logo cleanup requested for organization {org_id} (cleanup not implemented)")
            return True

        except Exception as e:
            logger.warning(f"Failed to cleanup old logos for {org_id}: {str(e)}")
            return False
