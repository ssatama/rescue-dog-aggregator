"""
Organization synchronization service following CLAUDE.md principles.
Implements: immutable data, pure functions, context managers, dependency injection.
"""

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Dict, List, Optional, Protocol

import psycopg2.extras

from utils.config_models import OrganizationConfig
from utils.db_connection import execute_command, execute_query, execute_transaction
from utils.r2_logo_uploader import R2OrganizationLogoUploader as OrganizationLogoUploader

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class OrganizationRecord:
    """Immutable organization database record."""

    id: int
    name: str
    website_url: Optional[str] = None
    description: Optional[str] = None
    social_media: Optional[Dict] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    ships_to: Optional[List[str]] = None
    established_year: Optional[int] = None
    logo_url: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    service_regions: Optional[List[str]] = None


@dataclass(frozen=True)
class SyncResult:
    """Immutable sync operation result."""

    organization_id: int
    config_id: str
    was_created: bool
    success: bool
    error: Optional[str] = None


@dataclass(frozen=True)
class SyncSummary:
    """Immutable sync summary."""

    total_configs: int
    processed: int
    created: int
    updated: int
    errors: List[str]
    org_mappings: Dict[str, int]

    @property
    def success(self) -> bool:
        return len(self.errors) == 0


class LogoUploadService(Protocol):
    """Protocol for logo upload services."""

    def upload_organization_logo(self, org_id: str, logo_url: str, force_upload: bool = False) -> Dict[str, str]: ...


class NullLogoUploadService:
    """Null object implementation for logo upload service."""

    def upload_organization_logo(self, org_id: str, logo_url: str, force_upload: bool = False) -> Dict[str, str]:
        logger.info(f"Null logo upload service: skipping logo upload for {org_id}")
        return {"original": logo_url} if logo_url else {}


class OrganizationSyncService:
    """Service for synchronizing organizations with dependency injection."""

    def __init__(self, logo_service: Optional[LogoUploadService] = None):
        """Initialize with optional logo service."""
        self.logo_service = logo_service or NullLogoUploadService()

    def get_database_organizations(self) -> Dict[str, OrganizationRecord]:
        """Get all organizations from database (pure function)."""
        query = """
            SELECT id, name, website_url, description, social_media,
                   created_at, updated_at, ships_to, established_year, 
                   logo_url, country, city, service_regions
            FROM organizations
        """

        rows = execute_query(query)

        organizations = {}
        for row in rows:
            # Use organization name as key instead of config_id
            org_record = OrganizationRecord(
                id=row["id"],
                name=row["name"],
                website_url=row["website_url"],
                description=row["description"],
                social_media=row["social_media"],
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                ships_to=row["ships_to"],
                established_year=row["established_year"],
                logo_url=row["logo_url"],
                country=row["country"],
                city=row["city"],
                service_regions=row["service_regions"],
            )
            organizations[row["name"]] = org_record

        return organizations

    def should_update_organization(self, db_org: OrganizationRecord, config: OrganizationConfig) -> bool:
        """Determine if organization should be updated (pure function)."""
        # Always update since we don't have last_config_sync in current schema
        # This ensures organizations are kept in sync with config changes

        # Check key fields
        if db_org.name != config.name:
            return True

        if db_org.website_url != str(config.metadata.website_url):
            return True

        if db_org.description != config.metadata.description:
            return True

        if db_org.established_year != config.metadata.established_year:
            return True

        # Check ships_to
        db_ships_to = set(db_org.ships_to or [])
        config_ships_to = set(config.metadata.ships_to or [])
        if db_ships_to != config_ships_to:
            return True

        # Check social media
        db_social_media = db_org.social_media or {}
        config_social_media = self._build_social_media_dict(config)
        if db_social_media != config_social_media:
            return True

        # Check logo URL
        if db_org.logo_url != config.metadata.logo_url:
            return True

        return False

    def _build_social_media_dict(self, config: OrganizationConfig) -> Dict[str, str]:
        """Build social media dictionary from config (pure function)."""
        social = config.metadata.social_media
        social_data = {}

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
        if hasattr(config.metadata, "website_url") and config.metadata.website_url:
            social_data["website"] = str(config.metadata.website_url)

        return social_data

    def create_organization(self, config: OrganizationConfig) -> int:
        """Create new organization from config."""
        social_media = self._build_social_media_dict(config)

        query = """
            INSERT INTO organizations (
                name, config_id, website_url, description, social_media,
                created_at, updated_at,
                ships_to, established_year, logo_url, country, city, service_regions
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            ) RETURNING id
        """

        params = (
            config.name,
            config.id,  # Add config_id
            str(config.metadata.website_url),
            config.metadata.description,
            psycopg2.extras.Json(social_media),
            datetime.now(),
            datetime.now(),
            psycopg2.extras.Json(config.metadata.ships_to),
            config.metadata.established_year,
            config.metadata.logo_url,
            config.metadata.location.country,
            config.metadata.location.city,
            psycopg2.extras.Json(config.metadata.service_regions),
        )

        result = execute_command(query, params)
        if not result:
            raise RuntimeError("INSERT did not return an ID")

        org_id = result["id"]
        logger.info(f"Created organization '{config.name}' with ID {org_id}")

        # Handle service regions and logo separately
        self._sync_service_regions(org_id, config)
        self._sync_organization_logo(org_id, config)

        return org_id

    def update_organization(self, org_id: int, config: OrganizationConfig) -> None:
        """Update existing organization from config."""
        social_media = self._build_social_media_dict(config)

        query = """
            UPDATE organizations SET
                name = %s, config_id = %s, website_url = %s, description = %s, social_media = %s,
                updated_at = %s, ships_to = %s,
                established_year = %s, logo_url = %s, country = %s, city = %s,
                service_regions = %s
            WHERE id = %s
        """

        params = (
            config.name,
            config.id,  # Add config_id
            str(config.metadata.website_url),
            config.metadata.description,
            psycopg2.extras.Json(social_media),
            datetime.now(),
            psycopg2.extras.Json(config.metadata.ships_to),
            config.metadata.established_year,
            config.metadata.logo_url,
            config.metadata.location.country,
            config.metadata.location.city,
            psycopg2.extras.Json(config.metadata.service_regions),
            org_id,
        )

        execute_command(query, params)
        logger.info(f"Updated organization ID {org_id} '{config.name}'")

        # Handle service regions and logo separately
        self._sync_service_regions(org_id, config)
        self._sync_organization_logo(org_id, config)

    def _sync_service_regions(self, org_id: int, config: OrganizationConfig) -> None:
        """Sync service regions for organization."""
        try:
            # Collect all countries
            all_countries = set()

            # Add service regions
            for country_code in config.metadata.service_regions or []:
                if isinstance(country_code, str):
                    all_countries.add(country_code.strip().upper())

            # Add ships_to countries
            for country_code in config.metadata.ships_to or []:
                if isinstance(country_code, str):
                    all_countries.add(country_code.strip().upper())

            if not all_countries:
                return

            # Delete existing and insert new in transaction
            commands = [("DELETE FROM service_regions WHERE organization_id = %s", (org_id,))]

            for country_code in all_countries:
                commands.append(("INSERT INTO service_regions (organization_id, country, created_at, updated_at) VALUES (%s, %s, %s, %s)", (org_id, country_code, datetime.now(), datetime.now())))

            execute_transaction(commands)
            logger.info(f"Synced {len(all_countries)} service regions for organization {org_id}")

        except Exception as e:
            logger.error(f"Failed to sync service regions for organization {org_id}: {e}")
            # Don't fail the whole operation

    def _sync_organization_logo(self, org_id: int, config: OrganizationConfig) -> None:
        """Sync organization logo using injected service."""
        if not config.metadata.logo_url:
            return

        try:
            logo_urls = self.logo_service.upload_organization_logo(config.id, config.metadata.logo_url, force_upload=False)

            if logo_urls and "original" in logo_urls:
                cloudinary_url = logo_urls["original"]

                # Update logo URL in database
                query = "UPDATE organizations SET logo_url = %s WHERE id = %s"
                execute_command(query, (cloudinary_url, org_id))

                logger.info(f"Updated logo for organization {org_id}")

        except Exception as e:
            logger.error(f"Failed to sync logo for organization {org_id}: {e}")
            # Don't fail the whole operation

    def sync_single_organization(self, config: OrganizationConfig, db_organizations: Optional[Dict[str, OrganizationRecord]] = None) -> SyncResult:
        """Sync single organization (pure business logic)."""
        if db_organizations is None:
            db_organizations = self.get_database_organizations()

        try:
            # Use organization name as key instead of config.id
            if config.name in db_organizations:
                # Organization exists
                db_org = db_organizations[config.name]

                if self.should_update_organization(db_org, config):
                    self.update_organization(db_org.id, config)
                    return SyncResult(db_org.id, config.id, False, True)
                else:
                    logger.debug(f"Organization '{config.name}' is up to date")
                    return SyncResult(db_org.id, config.id, False, True)
            else:
                # Organization doesn't exist
                org_id = self.create_organization(config)
                return SyncResult(org_id, config.id, True, True)

        except Exception as e:
            error_msg = f"Failed to sync organization '{config.id}': {e}"
            logger.error(error_msg)
            return SyncResult(0, config.id, False, False, error_msg)

    def sync_all_organizations(self, configs: Dict[str, OrganizationConfig]) -> SyncSummary:
        """Sync all organizations and return summary."""
        if not configs:
            return SyncSummary(0, 0, 0, 0, [], {})

        # Get current database state once
        db_organizations = self.get_database_organizations()

        # Process each configuration
        results = []
        for config_id, config in configs.items():
            result = self.sync_single_organization(config, db_organizations)
            results.append(result)

        # Build summary
        successful_results = [r for r in results if r.success]
        failed_results = [r for r in results if not r.success]

        created_count = sum(1 for r in successful_results if r.was_created)
        updated_count = sum(1 for r in successful_results if not r.was_created)

        org_mappings = {r.config_id: r.organization_id for r in successful_results}
        errors = [r.error for r in failed_results if r.error]

        summary = SyncSummary(total_configs=len(configs), processed=len(successful_results), created=created_count, updated=updated_count, errors=errors, org_mappings=org_mappings)

        logger.info(f"Sync completed: {summary.processed}/{summary.total_configs} processed " f"({summary.created} created, {summary.updated} updated, {len(summary.errors)} errors)")

        return summary

    def get_config_to_db_mapping(self) -> Dict[str, int]:
        """Get mapping from organization name to database organization ID."""
        query = """
            SELECT name, id
            FROM organizations
            WHERE name IS NOT NULL
        """

        rows = execute_query(query)
        return {row["name"]: row["id"] for row in rows}

    def get_sync_status(self, configs: Dict[str, OrganizationConfig]) -> Dict[str, Any]:
        """Get sync status between configs and database."""
        try:
            db_organizations = self.get_database_organizations()

            # Create mapping from config names to config IDs
            config_names_to_ids = {config.name: config_id for config_id, config in configs.items()}

            # Find organizations that exist in both configs and database (by name)
            db_org_names = set(db_organizations.keys())
            config_names = set(config_names_to_ids.keys())

            synced_names = config_names & db_org_names
            missing_names = config_names - db_org_names
            orphaned_names = db_org_names - config_names

            # Convert back to config IDs for backwards compatibility
            synced_config_ids = [config_names_to_ids[name] for name in synced_names]
            missing_config_ids = [config_names_to_ids[name] for name in missing_names]

            # Check which need updates
            needs_update = []
            for org_name in synced_names:
                config_id = config_names_to_ids[org_name]
                config = configs[config_id]
                db_org = db_organizations[org_name]
                if self.should_update_organization(db_org, config):
                    needs_update.append(config_id)

            return {
                "total_configs": len(configs),
                "total_db_orgs": len(db_organizations),
                "synced": len(synced_config_ids),
                "missing_from_db": missing_config_ids,
                "orphaned_in_db": list(orphaned_names),
                "needs_update": needs_update,
                "up_to_date": len(synced_config_ids) - len(needs_update),
            }

        except Exception as e:
            logger.error(f"Failed to get sync status: {e}")
            return {"error": str(e)}


# Factory function with dependency injection
def create_organization_sync_service(logo_service: Optional[LogoUploadService] = None) -> OrganizationSyncService:
    """Create organization sync service with optional logo service."""
    if logo_service is None:
        # Default to real logo service
        logo_service = OrganizationLogoUploader()

    return OrganizationSyncService(logo_service)


# Convenience function for backward compatibility
def create_default_sync_service() -> OrganizationSyncService:
    """Create sync service with default dependencies."""
    return create_organization_sync_service()


class OrganizationSyncError(Exception):
    """Raised when organization sync fails."""

    pass
