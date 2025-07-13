"""
R2Service - Cloudflare R2 storage service with S3-compatible API
Replacement for CloudinaryService with interface parity
"""

import hashlib
import logging
import os
from io import BytesIO
from typing import Dict, Optional, Tuple
from urllib.parse import urljoin

import boto3
import requests
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)


class R2ConfigurationError(Exception):
    """Raised when R2 is not properly configured."""

    pass


class R2Service:
    """R2 storage service with CloudinaryService interface parity"""

    _config_checked = False
    _config_valid = False
    _s3_client = None

    @classmethod
    def _reset_config_cache(cls):
        """Reset configuration cache for testing purposes."""
        cls._config_checked = False
        cls._config_valid = False
        cls._s3_client = None

    @classmethod
    def _check_configuration(cls):
        """Check R2 configuration once and cache result."""
        if cls._config_checked:
            return cls._config_valid

        cls._config_checked = True

        required_vars = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_ENDPOINT"]
        missing_vars = [var for var in required_vars if not os.getenv(var)]

        if missing_vars:
            logger.info(f"R2 not configured (missing: {', '.join(missing_vars)}). Using original image URLs.")
            cls._config_valid = False
            return False

        cls._config_valid = True
        logger.info("R2 successfully configured")
        return True

    @classmethod
    def _get_s3_client(cls):
        """Get or create S3 client for R2"""
        if cls._s3_client is None:
            cls._s3_client = boto3.client(
                "s3",
                endpoint_url=os.getenv("R2_ENDPOINT"),
                aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
                region_name="auto",  # R2 uses 'auto' region
            )
        return cls._s3_client

    @classmethod
    def is_configured(cls):
        """Check if R2 is properly configured."""
        return cls._check_configuration()

    @staticmethod
    def _generate_image_key(image_url: str, animal_name: str, organization_name: str = "unknown") -> str:
        """Generate unique image key for R2 storage"""
        # Create URL hash to avoid duplicates (same as CloudinaryService)
        url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
        safe_animal_name = animal_name.lower().replace(" ", "_").replace("-", "_")
        safe_org_name = organization_name.lower().replace(" ", "_").replace("-", "_")

        return f"rescue_dogs/{safe_org_name}/{safe_animal_name}_{url_hash}.jpg"

    @staticmethod
    def _build_custom_domain_url(key: str) -> str:
        """Build URL using custom domain"""
        custom_domain = os.getenv("R2_CUSTOM_DOMAIN", "").rstrip("/")
        if custom_domain:
            # Ensure custom domain has https:// protocol
            if not custom_domain.startswith(("http://", "https://")):
                custom_domain = f"https://{custom_domain}"
            return f"{custom_domain}/{key}"

        # Fallback to R2 endpoint if no custom domain
        endpoint = os.getenv("R2_ENDPOINT", "").rstrip("/")
        bucket_name = os.getenv("R2_BUCKET_NAME", "")
        return f"{endpoint}/{bucket_name}/{key}"

    @staticmethod
    def _is_r2_url(url: str) -> bool:
        """Check if URL is from R2 custom domain"""
        if not url:
            return False

        custom_domain = os.getenv("R2_CUSTOM_DOMAIN", "")
        if custom_domain and custom_domain in url:
            return True

        return False

    @staticmethod
    def upload_image_from_url(
        image_url: str,
        animal_name: str,
        organization_name: str = "unknown",
        raise_on_missing_config: bool = False,
    ) -> Tuple[Optional[str], bool]:
        """
        Upload image to R2 from URL and return the URL.

        Args:
            image_url: Original image URL
            animal_name: Name of the animal for folder organization
            organization_name: Organization name for folder organization
            raise_on_missing_config: If True, raise exception when R2 not configured

        Returns:
            tuple: (r2_url_or_original_url, success_boolean)

        Raises:
            R2ConfigurationError: If raise_on_missing_config=True and R2 not configured
        """
        if not image_url:
            logger.warning("No image URL provided")
            return None, False

        # Check configuration
        if not R2Service._check_configuration():
            if raise_on_missing_config:
                raise R2ConfigurationError("R2 not properly configured. Missing environment variables.")

            # Fallback: return original URL with success=False
            logger.debug(f"R2 not configured, using original URL: {image_url}")
            return image_url, False

        try:
            # Generate image key
            image_key = R2Service._generate_image_key(image_url, animal_name, organization_name)
            bucket_name = os.getenv("R2_BUCKET_NAME")

            # Get S3 client
            s3_client = R2Service._get_s3_client()

            # Check if image already exists
            try:
                s3_client.head_object(Bucket=bucket_name, Key=image_key)
                logger.debug(f"Image already exists in R2: {image_key}")
                return R2Service._build_custom_domain_url(image_key), True
            except ClientError as e:
                if e.response["Error"]["Code"] != "404":
                    logger.warning(f"Could not check existing image: {e}")
                # Image doesn't exist, proceed with upload
                pass

            # Download the image
            headers = {"User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"}
            response = requests.get(image_url, timeout=30, headers=headers)
            response.raise_for_status()

            if response.status_code != 200:
                logger.warning(f"Failed to download image {image_url}: HTTP {response.status_code}")
                return image_url, False

            # Check content type
            content_type = response.headers.get("content-type", "").lower()
            if not any(img_type in content_type for img_type in ["image/jpeg", "image/jpg", "image/png", "image/webp"]):
                logger.warning(f"Invalid content type for image {image_url}: {content_type}")
                return image_url, False

            # Upload to R2
            image_data = BytesIO(response.content)
            s3_client.upload_fileobj(
                image_data, bucket_name, image_key, ExtraArgs={"ContentType": content_type, "Metadata": {"original_url": image_url, "animal_name": animal_name, "organization": organization_name}}
            )

            logger.info(f"Successfully uploaded image to R2: {image_key}")
            return R2Service._build_custom_domain_url(image_key), True

        except requests.exceptions.RequestException as e:
            logger.warning(f"Network error downloading image {image_url}: {e}")
            return image_url, False

        except ClientError as e:
            logger.warning(f"R2 error uploading image {image_url}: {e}")
            return image_url, False

        except Exception as e:
            logger.warning(f"Unexpected error uploading image {image_url}: {e}")
            return image_url, False

    @staticmethod
    def get_optimized_url(r2_url: str, transformation_options: Optional[Dict] = None) -> str:
        """
        Get optimized URL using Cloudflare Images transformations.

        Args:
            r2_url: R2 image URL
            transformation_options: Dict with width, height, fit, etc.

        Returns:
            str: Optimized URL or original URL if not R2 URL
        """
        if not r2_url or not R2Service._is_r2_url(r2_url):
            return r2_url

        if not R2Service.is_configured():
            logger.debug("R2 not configured, returning original URL")
            return r2_url

        try:
            # For R2 URLs, use Cloudflare Images transformation format
            custom_domain = os.getenv("R2_CUSTOM_DOMAIN", "").rstrip("/")
            if not custom_domain:
                return r2_url

            # Extract image path from URL
            if custom_domain in r2_url:
                image_path = r2_url.replace(custom_domain + "/", "")
            else:
                return r2_url

            # Build transformation parameters
            if transformation_options:
                params = []
                if "width" in transformation_options:
                    params.append(f"w_{transformation_options['width']}")
                if "height" in transformation_options:
                    params.append(f"h_{transformation_options['height']}")
                if "fit" in transformation_options:
                    # Map fit options to Cloudflare Images format
                    fit_mapping = {"fill": "c_fill", "fit": "c_fit", "crop": "c_crop", "scale": "c_scale"}
                    cloudflare_fit = fit_mapping.get(transformation_options["fit"], "c_fill")
                    params.append(cloudflare_fit)
                if "quality" in transformation_options:
                    params.append(f"q_{transformation_options['quality']}")

                # Add format optimization
                params.append("f_auto")

                transform_string = ",".join(params)
                return f"{custom_domain}/cdn-cgi/image/{transform_string}/{image_path}"

            return r2_url

        except Exception as e:
            logger.error(f"Error generating optimized URL for {r2_url}: {e}")
            return r2_url

    @staticmethod
    def get_status() -> Dict:
        """Get R2 service status for health checks."""
        return {
            "configured": R2Service.is_configured(),
            "account_id": os.getenv("R2_ACCOUNT_ID", "Not set"),
            "access_key_set": bool(os.getenv("R2_ACCESS_KEY_ID")),
            "secret_key_set": bool(os.getenv("R2_SECRET_ACCESS_KEY")),
            "bucket_name": os.getenv("R2_BUCKET_NAME", "Not set"),
            "endpoint": os.getenv("R2_ENDPOINT", "Not set"),
            "custom_domain": os.getenv("R2_CUSTOM_DOMAIN", "Not set"),
        }
