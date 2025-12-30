# utils/r2_utils.py

import logging
from typing import Dict
from urllib.parse import urlparse

import requests

from utils.r2_service import R2Service

logger = logging.getLogger(__name__)


class OrganizationLogoUploadError(Exception):
    """Raised when organization logo upload fails."""

    pass


class OrganizationLogoUploader:
    """Handles organization logo uploads to R2 with Cloudflare Images transformations."""

    # Logo size presets for Cloudflare Images
    PRESETS = {
        "thumbnail": "w_64,h_64,c_fill,g_center,f_auto,q_auto",
        "medium": "w_128,h_128,c_fill,g_center,f_auto,q_auto",
        "large": "w_256,h_256,c_fill,g_center,f_auto,q_auto",
        "original": "f_auto,q_auto",
    }

    @classmethod
    def upload_organization_logo(
        cls, org_id: str, logo_url: str, force_upload: bool = False
    ) -> Dict[str, str]:
        """
        Upload organization logo to R2 with Cloudflare Images transformation URLs.

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
            raise OrganizationLogoUploadError("Logo URL is required")

        # Check if R2 is configured
        if not R2Service.is_configured():
            if not force_upload:
                logger.warning("R2 not configured, skipping logo upload")
                return {}
            else:
                raise OrganizationLogoUploadError("R2 not configured")

        try:
            # Create R2 service instance
            r2_service = R2Service()

            # Upload logo to R2
            r2_url, success = r2_service.upload_image_from_url(
                logo_url, f"org-logo-{org_id}", "organizations"
            )

            if not success or not r2_url:
                raise OrganizationLogoUploadError(
                    f"Failed to upload logo for organization {org_id}"
                )

            # Generate URLs for different sizes using Cloudflare Images
            preset_urls = {}
            for preset_name, transformations in cls.PRESETS.items():
                if preset_name == "original":
                    # Original size - just add basic optimizations
                    preset_urls[preset_name] = cls._build_cloudflare_images_url(
                        r2_url, transformations
                    )
                else:
                    # Specific size transformations
                    preset_urls[preset_name] = cls._build_cloudflare_images_url(
                        r2_url, transformations
                    )

            logger.info(f"Successfully uploaded organization logo for {org_id}")
            return preset_urls

        except Exception as e:
            logger.error(f"Failed to upload organization logo for {org_id}: {e}")
            raise OrganizationLogoUploadError(f"Logo upload failed: {e}")

    @classmethod
    def _build_cloudflare_images_url(cls, r2_url: str, transformations: str) -> str:
        """Build Cloudflare Images URL with transformations."""
        try:
            # Extract domain and path from R2 URL
            parsed = urlparse(r2_url)
            domain = parsed.netloc
            path = parsed.path.lstrip("/")

            # Build Cloudflare Images URL
            return f"https://{domain}/cdn-cgi/image/{transformations}/{path}"
        except Exception as e:
            logger.warning(f"Failed to build Cloudflare Images URL: {e}")
            return r2_url  # Return original URL as fallback

    @classmethod
    def validate_logo_url(cls, logo_url: str) -> bool:
        """
        Validate that the logo URL is accessible and appears to be an image.

        Args:
            logo_url: URL to validate

        Returns:
            True if valid, False otherwise
        """
        if not logo_url or not logo_url.strip():
            return False

        try:
            # Parse URL
            parsed = urlparse(logo_url)
            if not parsed.scheme or not parsed.netloc:
                return False

            # Check if URL is accessible
            response = requests.head(logo_url, timeout=10)
            if response.status_code != 200:
                return False

            # Check content type
            content_type = response.headers.get("content-type", "").lower()
            if not content_type.startswith("image/"):
                return False

            return True

        except Exception as e:
            logger.warning(f"Failed to validate logo URL {logo_url}: {e}")
            return False

    @classmethod
    def get_logo_urls(cls, org_id: str) -> Dict[str, str]:
        """
        Get existing logo URLs for an organization.

        Args:
            org_id: Organization ID

        Returns:
            Dictionary with logo URLs for different sizes
        """
        # This would typically query the database or R2 to get existing logos
        # For now, return empty dict - implement based on your storage strategy
        return {}

    @classmethod
    def delete_organization_logo(cls, org_id: str) -> bool:
        """
        Delete organization logo from R2.

        Args:
            org_id: Organization ID

        Returns:
            True if successful, False otherwise
        """
        try:
            # This would implement deletion from R2
            # For now, just log the operation
            logger.info(f"Would delete organization logo for {org_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete organization logo for {org_id}: {e}")
            return False


def upload_organization_logo(
    org_id: str, logo_url: str, force_upload: bool = False
) -> Dict[str, str]:
    """
    Convenience function to upload organization logo.

    Args:
        org_id: Organization ID
        logo_url: URL of the logo to upload
        force_upload: Force upload even if R2 is not configured

    Returns:
        Dictionary with R2 URLs for different sizes

    Raises:
        OrganizationLogoUploadError: If upload fails
    """
    return OrganizationLogoUploader.upload_organization_logo(
        org_id, logo_url, force_upload
    )


def validate_logo_url(logo_url: str) -> bool:
    """
    Convenience function to validate logo URL.

    Args:
        logo_url: URL to validate

    Returns:
        True if valid, False otherwise
    """
    return OrganizationLogoUploader.validate_logo_url(logo_url)
