"""
Script to migrate existing images to Cloudinary.
Run this ONCE after implementing the upload flow.
"""

import logging
import os
import sys

import psycopg2
from dotenv import load_dotenv

import config
from utils.cloudinary_service import CloudinaryService

# Load environment variables
load_dotenv()

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_existing_images():
    """Migrate existing animal images to Cloudinary."""
    cloudinary_service = CloudinaryService()

    try:
        conn = psycopg2.connect(**config.DB_CONFIG)
        cursor = conn.cursor()

        # Get animals with images that aren't already on Cloudinary
        cursor.execute(
            """
            SELECT id, name, primary_image_url, organization_id
            FROM animals
            WHERE primary_image_url IS NOT NULL
            AND primary_image_url NOT LIKE '%cloudinary.com%'
            ORDER BY id
        """
        )

        animals = cursor.fetchall()
        logger.info(f"Found {len(animals)} animals with non-Cloudinary images")

        success_count = 0

        for animal_id, name, image_url, org_id in animals:
            # Get organization name
            cursor.execute("SELECT name FROM organizations WHERE id = %s", (org_id,))
            org_result = cursor.fetchone()
            org_name = org_result[0] if org_result else "unknown"

            logger.info(f"Migrating image for {name} (ID: {animal_id})")

            # Upload to Cloudinary
            cloudinary_url, success = cloudinary_service.upload_image_from_url(
                image_url, name, org_name
            )

            if success and cloudinary_url:
                # Update database with Cloudinary URL and store original
                cursor.execute(
                    """
                    UPDATE animals
                    SET primary_image_url = %s, original_image_url = %s
                    WHERE id = %s
                """,
                    (cloudinary_url, image_url, animal_id),
                )

                success_count += 1
                logger.info(f"✅ Successfully migrated {name}")
            else:
                # Store original URL in fallback column
                cursor.execute(
                    """
                    UPDATE animals
                    SET original_image_url = %s
                    WHERE id = %s
                """,
                    (image_url, animal_id),
                )

                logger.warning(f"❌ Failed to migrate {name}, kept original URL")

            # Commit every 10 records
            if animal_id % 10 == 0:
                conn.commit()
                logger.info(f"Committed progress: {success_count}/{len(animals)} successful")

        conn.commit()
        logger.info(
            f"Migration complete: {success_count}/{len(animals)} images successfully migrated"
        )

    except Exception as e:
        logger.error(f"Migration failed: {e}")
        if "conn" in locals():
            conn.rollback()
    finally:
        if "cursor" in locals() and cursor:
            cursor.close()
        if "conn" in locals() and conn:
            conn.close()


if __name__ == "__main__":
    migrate_existing_images()
