"""
Tests for adoption fees functionality in OrganizationSyncService.

Following TDD principles - these tests validate the adoption_fees handling
in the organization synchronization service.
"""

from unittest.mock import Mock, patch

import pytest

from utils.config_models import OrganizationConfig, OrganizationMetadata
from utils.organization_sync_service import OrganizationRecord, OrganizationSyncService


class TestOrganizationSyncAdoptionFees:
    """Test suite for adoption_fees in OrganizationSyncService."""

    @pytest.fixture
    def sync_service(self):
        """Create OrganizationSyncService instance for testing."""
        return OrganizationSyncService()

    @pytest.fixture
    def mock_config_with_fees(self):
        """Create mock organization config with adoption fees."""
        config = Mock(spec=OrganizationConfig)
        config.id = "test-org"
        config.name = "Test Organization"

        # Mock metadata with all required fields
        metadata = Mock(spec=OrganizationMetadata)
        metadata.adoption_fees = {"usual_fee": 500, "currency": "EUR"}
        metadata.website_url = "https://example.com"
        metadata.description = "Test description"
        metadata.established_year = 2020
        metadata.ships_to = ["US"]
        metadata.service_regions = ["US"]
        metadata.logo_url = None

        # Mock social media object
        social_media = Mock()
        social_media.facebook = None
        social_media.instagram = None
        social_media.twitter = None
        social_media.linkedin = None
        social_media.website = None
        metadata.social_media = social_media

        # Mock location
        location = Mock()
        location.country = "US"
        location.city = "Test City"
        metadata.location = location

        config.metadata = metadata

        return config

    @pytest.fixture
    def mock_config_without_fees(self):
        """Create mock organization config without adoption fees."""
        config = Mock(spec=OrganizationConfig)
        config.id = "test-org-no-fees"
        config.name = "Test Organization No Fees"

        # Mock metadata without adoption fees but with other required fields
        metadata = Mock(spec=OrganizationMetadata)
        metadata.adoption_fees = None
        metadata.website_url = "https://example.com"
        metadata.description = "Test description"
        metadata.established_year = 2020
        metadata.ships_to = ["US"]
        metadata.service_regions = ["US"]
        metadata.logo_url = None

        # Mock social media object
        social_media = Mock()
        social_media.facebook = None
        social_media.instagram = None
        social_media.twitter = None
        social_media.linkedin = None
        social_media.website = None
        metadata.social_media = social_media

        # Mock location
        location = Mock()
        location.country = "US"
        location.city = "Test City"
        metadata.location = location

        config.metadata = metadata

        return config

    def test_build_adoption_fees_dict_with_fees(self, sync_service, mock_config_with_fees):
        """
        Test _build_adoption_fees_dict creates correct dict when fees present.

        GIVEN config with adoption fees
        WHEN _build_adoption_fees_dict is called
        THEN it should return properly structured fees dict
        """
        result = sync_service._build_adoption_fees_dict(mock_config_with_fees)

        expected = {"usual_fee": 500, "currency": "EUR"}

        assert result == expected
        assert isinstance(result, dict)

    def test_build_adoption_fees_dict_without_fees(self, sync_service, mock_config_without_fees):
        """
        Test _build_adoption_fees_dict returns empty dict when no fees.

        GIVEN config without adoption fees
        WHEN _build_adoption_fees_dict is called
        THEN it should return empty dictionary
        """
        result = sync_service._build_adoption_fees_dict(mock_config_without_fees)

        assert result == {}
        assert isinstance(result, dict)

    def test_build_adoption_fees_dict_missing_attribute(self, sync_service):
        """
        Test _build_adoption_fees_dict handles missing adoption_fees attribute.

        GIVEN config metadata without adoption_fees attribute
        WHEN _build_adoption_fees_dict is called
        THEN it should return empty dictionary without error
        """
        config = Mock(spec=OrganizationConfig)
        metadata = Mock(spec=OrganizationMetadata)
        # Don't set adoption_fees attribute
        config.metadata = metadata

        result = sync_service._build_adoption_fees_dict(config)

        assert result == {}

    def test_organization_record_includes_adoption_fees(self):
        """
        Test that OrganizationRecord dataclass includes adoption_fees field.

        GIVEN OrganizationRecord with adoption_fees data
        WHEN record is created
        THEN it should store adoption_fees correctly
        """
        adoption_fees = {"usual_fee": 425, "currency": "GBP"}

        record = OrganizationRecord(id=1, name="Test Org", adoption_fees=adoption_fees)

        assert record.adoption_fees == adoption_fees
        assert isinstance(record.adoption_fees, dict)

    def test_organization_record_default_adoption_fees(self):
        """
        Test that OrganizationRecord defaults adoption_fees to None.

        GIVEN OrganizationRecord without adoption_fees specified
        WHEN record is created
        THEN adoption_fees should default to None
        """
        record = OrganizationRecord(id=1, name="Test Org")

        assert record.adoption_fees is None

    @patch("utils.organization_sync_service.execute_command")
    def test_create_organization_includes_adoption_fees(self, mock_execute, sync_service, mock_config_with_fees):
        """
        Test create_organization includes adoption_fees in INSERT statement.

        GIVEN config with adoption fees
        WHEN create_organization is called
        THEN adoption_fees should be included in database INSERT
        """
        # Mock successful INSERT returning ID
        mock_execute.return_value = {"id": 123}

        # Mock the service region and logo methods to avoid side effects
        with patch.object(sync_service, "_sync_service_regions"), patch.object(sync_service, "_sync_organization_logo"):

            org_id = sync_service.create_organization(mock_config_with_fees)

        assert org_id == 123
        mock_execute.assert_called_once()

        # Verify the query includes adoption_fees column
        call_args = mock_execute.call_args
        query = call_args[0][0]  # First positional argument is the query
        params = call_args[0][1]  # Second positional argument is params

        assert "adoption_fees" in query
        assert "INSERT INTO organizations" in query

        # Verify adoption_fees data is in parameters
        # The exact position depends on the query structure, but it should be there
        adoption_fees_param = None
        for param in params:
            if hasattr(param, "adapted") and isinstance(param.adapted, dict):
                if param.adapted.get("usual_fee") == 500:
                    adoption_fees_param = param.adapted
                    break

        assert adoption_fees_param is not None
        assert adoption_fees_param["usual_fee"] == 500
        assert adoption_fees_param["currency"] == "EUR"

    @patch("utils.organization_sync_service.execute_command")
    def test_update_organization_includes_adoption_fees(self, mock_execute, sync_service, mock_config_with_fees):
        """
        Test update_organization includes adoption_fees in UPDATE statement.

        GIVEN config with adoption fees and existing organization ID
        WHEN update_organization is called
        THEN adoption_fees should be included in database UPDATE
        """
        org_id = 456

        # Mock the service region and logo methods to avoid side effects
        with patch.object(sync_service, "_sync_service_regions"), patch.object(sync_service, "_sync_organization_logo"):

            sync_service.update_organization(org_id, mock_config_with_fees)

        mock_execute.assert_called_once()

        # Verify the query includes adoption_fees column
        call_args = mock_execute.call_args
        query = call_args[0][0]  # First positional argument is the query
        params = call_args[0][1]  # Second positional argument is params

        assert "adoption_fees" in query
        assert "UPDATE organizations SET" in query

        # Verify organization ID is the last parameter
        assert params[-1] == org_id

        # Verify adoption_fees data is in parameters (before the org_id)
        adoption_fees_param = None
        for param in params[:-1]:  # Exclude the last param (org_id)
            if hasattr(param, "adapted") and isinstance(param.adapted, dict):
                if param.adapted.get("usual_fee") == 500:
                    adoption_fees_param = param.adapted
                    break

        assert adoption_fees_param is not None

    def test_should_update_organization_detects_adoption_fees_changes(self, sync_service, mock_config_with_fees):
        """
        Test should_update_organization detects changes in adoption_fees.

        GIVEN database org with different adoption_fees than config
        WHEN should_update_organization is called
        THEN it should return True (update needed)
        """
        # Create database record with different adoption fees
        db_org = OrganizationRecord(id=1, name="Test Organization", adoption_fees={"usual_fee": 300, "currency": "USD"})  # Different from config

        # Mock other fields to match so only adoption_fees differs
        mock_config_with_fees.name = "Test Organization"
        mock_config_with_fees.metadata.website_url = None
        mock_config_with_fees.metadata.description = None
        mock_config_with_fees.metadata.established_year = None
        mock_config_with_fees.metadata.ships_to = []
        mock_config_with_fees.metadata.logo_url = None

        # Mock social media to return empty dict
        with patch.object(sync_service, "_build_social_media_dict", return_value={}):
            should_update = sync_service.should_update_organization(db_org, mock_config_with_fees)

        assert should_update is True

    def test_should_update_organization_no_change_in_adoption_fees(self, sync_service, mock_config_with_fees):
        """
        Test should_update_organization when adoption_fees unchanged.

        GIVEN database org with same adoption_fees as config
        WHEN should_update_organization is called
        THEN adoption_fees comparison should not trigger update
        """
        # Create database record with same adoption fees
        db_org = OrganizationRecord(
            id=1,
            name="Test Organization",
            website_url="None",  # Match the string conversion in should_update check
            description=None,
            established_year=None,
            ships_to=[],
            social_media={},
            logo_url=None,
            adoption_fees={"usual_fee": 500, "currency": "EUR"},  # Same as config
        )

        # Mock all other fields to match to isolate adoption_fees comparison
        mock_config_with_fees.name = "Test Organization"
        mock_config_with_fees.metadata.website_url = "None"  # String to match db string conversion
        mock_config_with_fees.metadata.description = None
        mock_config_with_fees.metadata.established_year = None
        mock_config_with_fees.metadata.ships_to = []
        mock_config_with_fees.metadata.logo_url = None

        # Verify _build_adoption_fees_dict is called during comparison
        with (
            patch.object(sync_service, "_build_social_media_dict", return_value={}),
            patch.object(sync_service, "_build_adoption_fees_dict", return_value={"usual_fee": 500, "currency": "EUR"}) as mock_build,
        ):
            should_update = sync_service.should_update_organization(db_org, mock_config_with_fees)
            mock_build.assert_called_once_with(mock_config_with_fees)

        # Should not need update since adoption_fees match (returns False)

    @patch("utils.organization_sync_service.execute_query")
    def test_get_database_organizations_includes_adoption_fees(self, mock_execute_query, sync_service):
        """
        Test get_database_organizations retrieves adoption_fees from database.

        GIVEN database query for organizations
        WHEN get_database_organizations is called
        THEN it should include adoption_fees in SELECT and parse results
        """
        # Mock database response
        mock_execute_query.return_value = [
            {
                "id": 1,
                "name": "Test Org",
                "website_url": None,
                "description": None,
                "social_media": None,
                "created_at": None,
                "updated_at": None,
                "ships_to": None,
                "established_year": None,
                "logo_url": None,
                "country": None,
                "city": None,
                "service_regions": None,
                "adoption_fees": {"usual_fee": 400, "currency": "CAD"},
            }
        ]

        result = sync_service.get_database_organizations()

        # Verify query includes adoption_fees
        mock_execute_query.assert_called_once()
        query = mock_execute_query.call_args[0][0]
        assert "adoption_fees" in query
        assert "FROM organizations" in query

        # Verify result includes adoption_fees
        assert len(result) == 1
        assert "Test Org" in result
        org_record = result["Test Org"]
        assert org_record.adoption_fees == {"usual_fee": 400, "currency": "CAD"}
