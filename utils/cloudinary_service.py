import cloudinary
import cloudinary.uploader
import requests
import hashlib
import os
from urllib.parse import urlparse
import logging

logger = logging.getLogger(__name__)

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv("CLOUDINARY_CLOUD_NAME"),
    api_key=os.getenv("CLOUDINARY_API_KEY"),
    api_secret=os.getenv("CLOUDINARY_API_SECRET"),
    secure=True,
)


class CloudinaryService:
    @staticmethod
    def upload_image_from_url(image_url, animal_name, organization_name="unknown"):
        """
        Upload image to Cloudinary from URL and return the optimized URL.

        Args:
            image_url (str): Original image URL
            animal_name (str): Name of the animal for folder organization
            organization_name (str): Organization name for folder organization

        Returns:
            tuple: (cloudinary_url, success_boolean)
        """
        if not image_url:
            logger.warning("No image URL provided")
            return None, False

        try:
            # Create a unique public_id using URL hash to avoid duplicates
            url_hash = hashlib.md5(image_url.encode()).hexdigest()[:8]
            safe_animal_name = animal_name.lower().replace(" ", "_").replace("-", "_")
            safe_org_name = (
                organization_name.lower().replace(" ", "_").replace("-", "_")
            )

            public_id = f"rescue_dogs/{safe_org_name}/{safe_animal_name}_{url_hash}"

            # Check if image already exists in Cloudinary
            try:
                existing = cloudinary.api.resource(public_id)
                if existing:
                    logger.info(f"Image already exists in Cloudinary: {public_id}")
                    return existing["secure_url"], True
            except cloudinary.exceptions.NotFound:
                # Image doesn't exist, proceed with upload
                pass

            # Download the image first with timeout and headers
            headers = {
                "User-Agent": "Mozilla/5.0 (compatible; RescueDogAggregator/1.0)"
            }

            response = requests.get(image_url, timeout=30, headers=headers)
            response.raise_for_status()

            if response.status_code != 200:
                logger.error(
                    f"Failed to download image {image_url}: HTTP {response.status_code}"
                )
                return None, False

            # Check content type
            content_type = response.headers.get("content-type", "").lower()
            if not any(
                img_type in content_type
                for img_type in ["image/jpeg", "image/jpg", "image/png", "image/webp"]
            ):
                logger.warning(
                    f"Invalid content type for image {image_url}: {content_type}"
                )
                return None, False

            # Upload to Cloudinary
            result = cloudinary.uploader.upload(
                response.content,
                public_id=public_id,
                folder="rescue_dogs",
                resource_type="image",
                overwrite=False,  # Don't overwrite existing images
                format="auto",  # Auto-detect best format
                quality="auto:good",  # Automatic quality optimization
                fetch_format="auto",  # Serve best format to browsers
                transformation=[{"quality": "auto:good"}, {"fetch_format": "auto"}],
            )

            logger.info(f"Successfully uploaded image to Cloudinary: {public_id}")
            return result["secure_url"], True

        except requests.exceptions.RequestException as e:
            logger.error(f"Network error downloading image {image_url}: {e}")
            return None, False
        except cloudinary.exceptions.Error as e:
            logger.error(f"Cloudinary error uploading image {image_url}: {e}")
            return None, False
        except Exception as e:
            logger.error(f"Unexpected error uploading image {image_url}: {e}")
            return None, False

    @staticmethod
    def get_optimized_url(cloudinary_url, transformation_options=None):
        """
        Get optimized URL for an existing Cloudinary image.

        Args:
            cloudinary_url (str): Existing Cloudinary URL
            transformation_options (dict): Cloudinary transformation options

        Returns:
            str: Optimized URL
        """
        if not cloudinary_url or "cloudinary.com" not in cloudinary_url:
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
                    return cloudinary.CloudinaryImage(public_id).build_url(
                        **transformation_options
                    )
                else:
                    return cloudinary_url

        except Exception as e:
            logger.error(f"Error generating optimized URL for {cloudinary_url}: {e}")

        return cloudinary_url
