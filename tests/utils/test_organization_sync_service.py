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

    def test_create_organization_passes_enabled_true_to_insert(self):
        service = OrganizationSyncService(logo_service=NullLogoUploadService())
        config = _make_config(enabled=True)

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
        assert "active" in sql
        assert True in params, f"Expected active=True in params, got {params}"

    def test_create_organization_passes_enabled_false_to_insert(self):
        service = OrganizationSyncService(logo_service=NullLogoUploadService())
        config = _make_config(enabled=False)

        with (
            patch("utils.organization_sync_service.execute_command", return_value={"id": 42}) as mock_cmd,
            patch.object(service, "_sync_service_regions"),
            patch.object(service, "_sync_organization_logo"),
            patch("utils.organization_sync_service.generate_unique_organization_slug", return_value="test-org"),
        ):
            service.create_organization(config)

        insert_calls = [c for c in mock_cmd.call_args_list if "INSERT INTO organizations" in c.args[0]]
        sql, params = insert_calls[0].args
        assert "active" in sql
        assert False in params, f"Expected active=False in params, got {params}"

    def test_update_organization_sets_active_from_enabled(self):
        service = OrganizationSyncService(logo_service=NullLogoUploadService())
        config = _make_config(enabled=False)

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
        assert "active = %s" in sql
        assert False in params, f"Expected active=False in params, got {params}"

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
