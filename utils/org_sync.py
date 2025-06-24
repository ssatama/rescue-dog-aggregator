import logging
from datetime import datetime
from typing import Dict, Optional, Tuple

import psycopg2
from psycopg2.extras import RealDictCursor

# Use the same database connection pattern as your existing code
from config import DB_CONFIG
from utils.cloudinary_utils import OrganizationLogoUploader
from utils.config_loader import ConfigLoader
from utils.config_models import OrganizationConfig


class OrganizationSyncError(Exception):
    """Raised when organization sync fails."""

    pass


def get_db_connection():
    """Get database connection using the same pattern as existing code."""
    try:
        # Build connection parameters, handling empty password
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
        }

        # Only add password if it's not empty
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        # Connect to the database
        conn = psycopg2.connect(**conn_params)
        return conn
    except Exception as e:
        print(f"Database connection error: {e}")
        raise


def get_db_cursor():
    """Get database cursor using existing connection pattern."""
    conn = get_db_connection()
    return conn.cursor(cursor_factory=RealDictCursor)


class OrganizationSyncManager:
    """Manages synchronization between config files and database organizations."""

    def __init__(self, config_loader: Optional[ConfigLoader] = None):
        """Initialize the sync manager.

        Args:
            config_loader: ConfigLoader instance, creates new one if None
        """
        self.config_loader = config_loader or ConfigLoader()
        self.logger = logging.getLogger(__name__)

    def _get_db_organizations(self) -> Dict[str, dict]:
        """Get all organizations from database, keyed by config_id.

        Returns:
            Dictionary mapping config_id to database row dict
        """
        orgs = {}

        cursor = get_db_cursor()
        try:
            cursor.execute(
                """
                SELECT id, name, website_url, description, social_media,
                       config_id, last_config_sync, created_at, updated_at,
                       ships_to, established_year
                FROM organizations
                WHERE config_id IS NOT NULL
            """
            )

            rows = cursor.fetchall()
            for row in rows:
                if row["config_id"]:
                    orgs[row["config_id"]] = dict(row)
        finally:
            cursor.close()
            cursor.connection.close()

        self.logger.debug(f"Found {len(orgs)} organizations with config_id in database")
        return orgs

    def _should_update_org(self, db_org: dict, config: OrganizationConfig) -> bool:
        """Determine if database organization should be updated from config.

        Args:
            db_org: Database organization row
            config: Config file organization data

        Returns:
            True if update is needed
        """
        # Always update if never synced
        if not db_org.get("last_config_sync"):
            return True

        # Check if key fields have changed
        if db_org["name"] != config.name:
            return True

        if db_org["website_url"] != str(config.metadata.website_url):
            return True

        # Check description
        config_description = config.metadata.description
        if db_org.get("description") != config_description:
            return True

        # Check established_year
        if db_org.get("established_year") != config.metadata.established_year:
            return True

        # Check ships_to
        db_ships_to = db_org.get("ships_to") or []
        config_ships_to = config.metadata.ships_to or []
        if set(db_ships_to) != set(config_ships_to):
            return True

        # Check social media (compare JSONB)
        db_social_media = db_org.get("social_media") or {}
        config_social_media = {}

        if config.metadata.social_media:
            social = config.metadata.social_media
            if social.facebook:
                config_social_media["facebook"] = str(social.facebook)
            if social.instagram:
                config_social_media["instagram"] = str(social.instagram)
            if social.twitter:
                config_social_media["twitter"] = str(social.twitter)
            if social.linkedin:
                config_social_media["linkedin"] = str(social.linkedin)
            if social.youtube:
                config_social_media["youtube"] = str(social.youtube)
            if social.website:
                config_social_media["website"] = str(social.website)

        if db_social_media != config_social_media:
            return True

        # Check logo_url changes
        db_logo_url = db_org.get("logo_url")
        config_logo_url = config.metadata.logo_url
        if db_logo_url != config_logo_url:
            return True

        return False

    def _build_social_media_json(self, config: OrganizationConfig) -> dict:
        """Build social media dict from config."""
        social = config.metadata.social_media

        social_data = {}

        # Only add fields that have values
        if social.facebook:
            social_data["facebook"] = str(social.facebook)
        if social.instagram:
            social_data["instagram"] = str(social.instagram)
        if social.twitter:
            social_data["twitter"] = str(social.twitter)
        if social.youtube:
            social_data["youtube"] = str(social.youtube)
        if social.linkedin:
            social_data["linkedin"] = str(social.linkedin)

        # Add website URL to social media if present
        if hasattr(config.metadata, "website_url") and config.metadata.website_url:
            social_data["website"] = str(config.metadata.website_url)

        return social_data  # Return dict, not JSON string

    def _sync_organization_logo(
        self, org_id: int, config: OrganizationConfig
    ) -> Optional[str]:
        """Upload organization logo to Cloudinary and return the URL.

        Args:
            org_id: Database ID of organization
            config: Organization configuration

        Returns:
            Cloudinary URL of uploaded logo, or None if upload failed
        """
        if not config.metadata.logo_url:
            self.logger.debug(f"No logo URL provided for organization {org_id}")
            return None

        try:
            # Upload logo to Cloudinary
            logo_urls = OrganizationLogoUploader.upload_organization_logo(
                config.id, config.metadata.logo_url, force_upload=False
            )

            if logo_urls and "original" in logo_urls:
                cloudinary_url = logo_urls["original"]
                self.logger.info(
                    f"Successfully uploaded logo for organization {org_id}: {cloudinary_url}"
                )

                # Update the logo_url in database
                cursor = get_db_cursor()
                try:
                    cursor.execute(
                        "UPDATE organizations SET logo_url = %s WHERE id = %s",
                        (cloudinary_url, org_id),
                    )
                    cursor.connection.commit()
                finally:
                    cursor.close()
                    cursor.connection.close()

                return cloudinary_url
            else:
                self.logger.warning(f"Failed to upload logo for organization {org_id}")
                return None

        except Exception as e:
            self.logger.warning(
                f"Logo upload failed for organization {org_id}: {str(e)}"
            )
            return None

    def _sync_service_regions(self, org_id: int, config: OrganizationConfig) -> None:
        """Sync service regions for an organization.

        Includes both service_regions (where dogs are located) and ships_to
        (countries where dogs can be adopted to) for comprehensive filtering.

        Args:
            org_id: Database ID of organization
            config: Organization configuration
        """
        cursor = get_db_cursor()
        try:
            # First, delete existing service regions for this organization
            cursor.execute(
                "DELETE FROM service_regions WHERE organization_id = %s", (org_id,)
            )

            # Collect all countries: service_regions + ships_to
            all_countries = set()

            # Add service regions (where dogs are located)
            service_regions = config.metadata.service_regions or []
            for country_code in service_regions:
                if isinstance(country_code, str):
                    all_countries.add(country_code.strip().upper())

            # Add ships_to countries (where dogs can be adopted to)
            ships_to = config.metadata.ships_to or []
            for country_code in ships_to:
                if isinstance(country_code, str):
                    all_countries.add(country_code.strip().upper())

            if not all_countries:
                self.logger.debug(
                    f"No service regions or ships_to countries defined for organization {org_id}"
                )
                cursor.connection.commit()
                return

            regions_added = 0

            for country_code in all_countries:
                # Insert each unique country
                cursor.execute(
                    """
                    INSERT INTO service_regions (organization_id, country, created_at, updated_at)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (
                        org_id,
                        country_code,
                        datetime.now(),
                        datetime.now(),
                    ),
                )
                regions_added += 1

            cursor.connection.commit()
            self.logger.info(
                f"Synced {regions_added} service regions for organization {org_id}"
            )

        except Exception as e:
            cursor.connection.rollback()
            self.logger.error(
                f"Failed to sync service regions for organization {org_id}: {e}"
            )
            raise
        finally:
            cursor.close()
            cursor.connection.close()

    def create_organization(self, config: OrganizationConfig) -> int:
        """Create a new organization from config.

        Args:
            config: Organization configuration

        Returns:
            Database ID of created organization
        """
        social_media = self._build_social_media_json(config)  # Now returns dict

        cursor = get_db_cursor()
        try:
            cursor.execute(
                """
                INSERT INTO organizations (
                    name, website_url, description, social_media,
                    config_id, last_config_sync, created_at, updated_at,
                    ships_to, established_year, logo_url, country, city, service_regions
                ) VALUES (
                    %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                ) RETURNING id
            """,
                (
                    config.name,
                    str(config.metadata.website_url),
                    config.metadata.description,
                    psycopg2.extras.Json(
                        social_media
                    ),  # This will properly encode the dict
                    config.id,  # config_id
                    datetime.now(),  # last_config_sync
                    datetime.now(),  # created_at
                    datetime.now(),  # updated_at
                    psycopg2.extras.Json(config.metadata.ships_to),  # ships_to
                    config.metadata.established_year,  # established_year
                    config.metadata.logo_url,  # logo_url
                    config.metadata.location.country,  # country
                    config.metadata.location.city,  # city
                    psycopg2.extras.Json(
                        config.metadata.service_regions
                    ),  # service_regions
                ),
            )

            result = cursor.fetchone()
            if result is None:
                raise OrganizationSyncError("INSERT did not return an ID")
            # Use dict key since we're using RealDictCursor
            org_id = result["id"]
            cursor.connection.commit()
            self.logger.info(
                f"Created organization '{config.name}' with ID {org_id} from config '{config.id}'"
            )
        finally:
            cursor.close()
            cursor.connection.close()

        # Sync service regions in a separate transaction
        try:
            self._sync_service_regions(org_id, config)
        except Exception as e:
            self.logger.error(
                f"Failed to sync service regions for new organization {org_id}: {e}"
            )
            # Don't fail the whole operation if service regions fail

        # Upload logo to Cloudinary (separate transaction)
        try:
            self._sync_organization_logo(org_id, config)
        except Exception as e:
            self.logger.error(f"Failed to sync logo for new organization {org_id}: {e}")
            # Don't fail the whole operation if logo upload fails

        return org_id

    def update_organization(self, org_id: int, config: OrganizationConfig) -> None:
        """Update existing organization from config.

        Args:
            org_id: Database ID of organization to update
            config: Organization configuration
        """
        social_media = self._build_social_media_json(config)  # Now returns dict

        cursor = get_db_cursor()
        try:
            cursor.execute(
                """
                UPDATE organizations SET
                    name = %s,
                    website_url = %s,
                    description = %s,
                    social_media = %s,
                    last_config_sync = %s,
                    updated_at = %s,
                    ships_to = %s,
                    established_year = %s,
                    logo_url = %s,
                    country = %s,
                    city = %s,
                    service_regions = %s
                WHERE id = %s
            """,
                (
                    config.name,
                    str(config.metadata.website_url),
                    config.metadata.description,
                    psycopg2.extras.Json(
                        social_media
                    ),  # This will properly encode the dict
                    datetime.now(),  # last_config_sync
                    datetime.now(),  # updated_at
                    psycopg2.extras.Json(config.metadata.ships_to),  # ships_to
                    config.metadata.established_year,  # established_year
                    config.metadata.logo_url,  # logo_url
                    config.metadata.location.country,  # country
                    config.metadata.location.city,  # city
                    psycopg2.extras.Json(
                        config.metadata.service_regions
                    ),  # service_regions
                    org_id,
                ),
            )

            cursor.connection.commit()
            self.logger.info(
                f"Updated organization ID {org_id} '{config.name}' from config '{config.id}'"
            )
        finally:
            cursor.close()
            cursor.connection.close()

        # Sync service regions in a separate transaction
        try:
            self._sync_service_regions(org_id, config)
        except Exception as e:
            self.logger.error(
                f"Failed to sync service regions for organization {org_id}: {e}"
            )
            # Don't fail the whole operation if service regions fail

        # Upload logo to Cloudinary (separate transaction)
        try:
            self._sync_organization_logo(org_id, config)
        except Exception as e:
            self.logger.error(f"Failed to sync logo for organization {org_id}: {e}")
            # Don't fail the whole operation if logo upload fails

    def sync_organization(self, config: OrganizationConfig) -> Tuple[int, bool]:
        """Sync a single organization from config to database.

        Args:
            config: Organization configuration

        Returns:
            Tuple of (org_id, was_created)
        """
        db_orgs = self._get_db_organizations()

        if config.id in db_orgs:
            # Organization exists, check if update needed
            db_org = db_orgs[config.id]
            org_id = db_org["id"]

            if self._should_update_org(db_org, config):
                self.update_organization(org_id, config)
                return org_id, False
            else:
                self.logger.debug(
                    f"Organization '{config.name}' ({config.id}) is up to date"
                )
                return org_id, False
        else:
            # Organization doesn't exist, create it
            org_id = self.create_organization(config)
            return org_id, True

    def sync_all_organizations(self) -> Dict[str, any]:
        """Sync all organizations from configs to database.

        Returns:
            Dictionary with sync results and statistics
        """
        self.logger.info("Starting organization sync from configs to database")

        try:
            # Load all configs
            configs = self.config_loader.load_all_configs()

            if not configs:
                self.logger.warning("No organization configs found to sync")
                return {
                    "success": True,
                    "total_configs": 0,
                    "created": 0,
                    "updated": 0,
                    "errors": [],
                }

            created_count = 0
            updated_count = 0
            errors = []
            org_mappings = {}  # config_id -> db_id

            for config_id, config in configs.items():
                try:
                    org_id, was_created = self.sync_organization(config)
                    org_mappings[config_id] = org_id

                    if was_created:
                        created_count += 1
                    else:
                        updated_count += 1

                except Exception as e:
                    error_msg = f"Failed to sync organization '{config_id}': {e}"
                    self.logger.error(error_msg)
                    errors.append(error_msg)

            # Summary
            total_processed = created_count + updated_count
            self.logger.info(
                f"Organization sync completed: {total_processed}/{len(configs)} processed "
                f"({created_count} created, {updated_count} updated, {len(errors)} errors)"
            )

            return {
                "success": len(errors) == 0,
                "total_configs": len(configs),
                "processed": total_processed,
                "created": created_count,
                "updated": updated_count,
                "errors": errors,
                "org_mappings": org_mappings,
            }

        except Exception as e:
            error_msg = f"Organization sync failed: {e}"
            self.logger.error(error_msg)
            raise OrganizationSyncError(error_msg)

    def get_config_to_db_mapping(self) -> Dict[str, int]:
        """Get mapping from config_id to database organization ID.

        Returns:
            Dictionary mapping config_id to database org ID
        """
        mapping = {}

        cursor = get_db_cursor()
        try:
            cursor.execute(
                """
                SELECT config_id, id
                FROM organizations
                WHERE config_id IS NOT NULL
            """
            )

            for row in cursor.fetchall():
                mapping[row["config_id"]] = row["id"]
        finally:
            cursor.close()
            cursor.connection.close()

        return mapping

    def get_sync_status(self) -> Dict[str, any]:
        """Get current sync status between configs and database.

        Returns:
            Dictionary with sync status information
        """
        try:
            configs = self.config_loader.load_all_configs()
            db_orgs = self._get_db_organizations()

            # Check which configs are in database
            synced_configs = set(configs.keys()) & set(db_orgs.keys())
            missing_configs = set(configs.keys()) - set(db_orgs.keys())
            orphaned_db_orgs = set(db_orgs.keys()) - set(configs.keys())

            # Check which need updates
            needs_update = []
            for config_id in synced_configs:
                config = configs[config_id]
                db_org = db_orgs[config_id]
                if self._should_update_org(db_org, config):
                    needs_update.append(config_id)

            # Check service regions status
            service_regions_status = self._get_service_regions_status()

            return {
                "total_configs": len(configs),
                "total_db_orgs": len(db_orgs),
                "synced": len(synced_configs),
                "missing_from_db": list(missing_configs),
                "orphaned_in_db": list(orphaned_db_orgs),
                "needs_update": needs_update,
                "up_to_date": len(synced_configs) - len(needs_update),
                "service_regions": service_regions_status,
            }

        except Exception as e:
            self.logger.error(f"Failed to get sync status: {e}")
            return {"error": str(e)}

    def _get_service_regions_status(self) -> Dict[str, any]:
        """Get service regions sync status."""
        cursor = get_db_cursor()
        try:
            # Count total service regions
            cursor.execute("SELECT COUNT(*) FROM service_regions")
            total_regions = cursor.fetchone()["count"]

            # Count organizations with service regions
            cursor.execute(
                """
                SELECT COUNT(DISTINCT organization_id)
                FROM service_regions
                """
            )
            orgs_with_regions = cursor.fetchone()["count"]

            # Count total organizations
            cursor.execute("SELECT COUNT(*) FROM organizations WHERE active = TRUE")
            total_orgs = cursor.fetchone()["count"]

            return {
                "total_service_regions": total_regions,
                "organizations_with_regions": orgs_with_regions,
                "total_organizations": total_orgs,
                "coverage_percentage": round(
                    (orgs_with_regions / total_orgs * 100) if total_orgs > 0 else 0, 1
                ),
            }

        except Exception as e:
            self.logger.error(f"Failed to get service regions status: {e}")
            return {"error": str(e)}
        finally:
            cursor.close()
            cursor.connection.close()


if __name__ == "__main__":
    # Simple script to run organization sync
    sync = OrganizationSync()
    result = sync.sync_all_organizations()
    print("Organization sync completed:")
    print(f"  Created: {result.get('created', 0)}")
    print(f"  Updated: {result.get('updated', 0)}")
    print(f"  Errors: {len(result.get('errors', []))}")
    if result.get("errors"):
        print("  Error details:")
        for error in result["errors"]:
            print(f"    {error}")
