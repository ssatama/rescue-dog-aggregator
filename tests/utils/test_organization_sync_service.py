"""Tests for organization sync service — enabled→active cascade.

Verifies that ``config.enabled`` propagates to ``organizations.active`` on
both INSERT and UPDATE, and that drift between the two triggers an update.
"""

from datetime import datetime
from unittest.mock import patch

import pytest

from utils.config_models import (
    Location,
    OrganizationConfig,
    OrganizationMetadata,
    ScraperInfo,
    SocialMedia,
)
from utils.organization_sync_service import (
    NullLogoUploadService,
    OrganizationRecord,
    OrganizationSyncService,
)


def _make_config(*, enabled: bool = True) -> OrganizationConfig:
    """Build a minimal valid OrganizationConfig for sync tests."""
    return OrganizationConfig(
        schema_version="1.0",
        id="testorg",
        name="Test Org",
        enabled=enabled,
        scraper=ScraperInfo(
            class_name="FakeScraper",
            module="scrapers.fake.fake_scraper",
        ),
        metadata=OrganizationMetadata(
            website_url="https://example.com",
            description="desc",
            social_media=SocialMedia(),
            location=Location(country="DE", city="Berlin"),
            service_regions=["DE"],
            ships_to=["DE"],
            established_year=2020,
        ),
    )


def _db_row(active: bool = True) -> dict:
    """Simulate a row from get_database_organizations SELECT."""
    return {
        "id": 42,
        "name": "Test Org",
        "website_url": "https://example.com",
        "description": "desc",
        "social_media": {"website": "https://example.com"},
        "created_at": datetime(2026, 1, 1),
        "updated_at": datetime(2026, 1, 1),
        "ships_to": ["DE"],
        "established_year": 2020,
        "logo_url": None,
        "country": "DE",
        "city": "Berlin",
        "service_regions": ["DE"],
        "adoption_fees": {},
        "active": active,
    }


@pytest.mark.unit
class TestOrganizationSyncEnabledCascade:
    """Cover the enabled→active propagation explicitly."""

    @pytest.mark.parametrize("enabled", [True, False])
    def test_create_organization_binds_enabled_to_last_insert_param(self, enabled):
        service = OrganizationSyncService(logo_service=NullLogoUploadService())
        config = _make_config(enabled=enabled)

        with (
            patch("utils.organization_sync_service.execute_command", return_value={"id": 42}) as mock_cmd,
            patch.object(service, "_sync_service_regions"),
            patch.object(service, "_sync_organization_logo"),
            patch("utils.organization_sync_service.generate_unique_organization_slug", return_value="test-org"),
        ):
            service.create_organization(config)

        insert_calls = [c for c in mock_cmd.call_args_list if "INSERT INTO organizations" in c.args[0]]
        assert len(insert_calls) == 1
        sql, params = insert_calls[0].args
        assert sql.count("%s") == len(params), "SQL placeholder count must match params length"
        assert params[-1] is enabled, f"Expected active={enabled} as last INSERT param, got {params[-1]}"

    @pytest.mark.parametrize("enabled", [True, False])
    def test_update_organization_binds_enabled_before_where_param(self, enabled):
        service = OrganizationSyncService(logo_service=NullLogoUploadService())
        config = _make_config(enabled=enabled)

        with (
            patch("utils.organization_sync_service.execute_command") as mock_cmd,
            patch.object(service, "_sync_service_regions"),
            patch.object(service, "_sync_organization_logo"),
            patch("utils.organization_sync_service.generate_unique_organization_slug", return_value="test-org"),
        ):
            service.update_organization(org_id=42, config=config)

        update_calls = [c for c in mock_cmd.call_args_list if "UPDATE organizations" in c.args[0]]
        assert len(update_calls) == 1
        sql, params = update_calls[0].args
        assert sql.count("%s") == len(params), "SQL placeholder count must match params length"
        assert params[-1] == 42, "Last UPDATE param must be the WHERE org_id"
        assert params[-2] is enabled, f"Expected active={enabled} as second-to-last UPDATE param, got {params[-2]}"

    def test_get_database_organizations_populates_active(self):
        service = OrganizationSyncService(logo_service=NullLogoUploadService())

        with patch(
            "utils.organization_sync_service.execute_query",
            return_value=[_db_row(active=False)],
        ):
            result = service.get_database_organizations()

        assert "Test Org" in result
        record = result["Test Org"]
        assert isinstance(record, OrganizationRecord)
        assert record.active is False

    def test_should_update_when_active_diverges_from_enabled(self):
        service = OrganizationSyncService(logo_service=NullLogoUploadService())
        config = _make_config(enabled=True)
        db_org = OrganizationRecord(
            id=42,
            name="Test Org",
            website_url="https://example.com",
            description="desc",
            social_media={"website": "https://example.com"},
            ships_to=["DE"],
            established_year=2020,
            logo_url=None,
            country="DE",
            city="Berlin",
            service_regions=["DE"],
            adoption_fees={},
            active=False,
        )

        assert service.should_update_organization(db_org, config) is True

    def test_should_not_update_when_active_matches_enabled(self):
        service = OrganizationSyncService(logo_service=NullLogoUploadService())
        config = _make_config(enabled=True)
        db_org = OrganizationRecord(
            id=42,
            name="Test Org",
            website_url="https://example.com",
            description="desc",
            social_media={"website": "https://example.com"},
            ships_to=["DE"],
            established_year=2020,
            logo_url=None,
            country="DE",
            city="Berlin",
            service_regions=["DE"],
            adoption_fees={},
            active=True,
        )

        assert service.should_update_organization(db_org, config) is False

    def test_sync_single_organization_flips_active_false_for_existing_row(self):
        """End-to-end: flipping config.enabled to False must UPDATE the row with active=False.

        Guards against a refactor that accidentally bypasses the UPDATE branch.
        """
        service = OrganizationSyncService(logo_service=NullLogoUploadService())
        config = _make_config(enabled=False)
        db_organizations = {
            "Test Org": OrganizationRecord(
                id=42,
                name="Test Org",
                website_url="https://example.com",
                description="desc",
                social_media={"website": "https://example.com"},
                ships_to=["DE"],
                established_year=2020,
                logo_url=None,
                country="DE",
                city="Berlin",
                service_regions=["DE"],
                adoption_fees={},
                active=True,
            )
        }

        with (
            patch("utils.organization_sync_service.execute_command") as mock_cmd,
            patch.object(service, "_sync_service_regions"),
            patch.object(service, "_sync_organization_logo"),
            patch("utils.organization_sync_service.generate_unique_organization_slug", return_value="test-org"),
        ):
            result = service.sync_single_organization(config, db_organizations)

        assert result.success is True
        assert result.was_created is False
        update_calls = [c for c in mock_cmd.call_args_list if "UPDATE organizations" in c.args[0]]
        assert len(update_calls) == 1, "Expected exactly one UPDATE, got {}".format(len(update_calls))
        _, params = update_calls[0].args
        assert params[-2] is False, f"Flip to enabled=False must UPDATE with active=False (got {params[-2]})"
