"""
Tests for adoption fees functionality in organizations API.

Following TDD principles - these tests validate the existing implementation
of adoption fees across the API layer.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app


class TestOrganizationsAdoptionFeesAPI:
    """Test suite for adoption fees in organizations API endpoints."""

    @pytest.fixture
    def client(self):
        """Create test client for API requests."""
        return TestClient(app)

    def test_get_organizations_includes_adoption_fees_field(self, client):
        """
        Test that GET /api/organizations returns adoption_fees field.

        GIVEN organizations exist in database
        WHEN client requests organizations list
        THEN response should include adoption_fees field for each organization
        """
        response = client.get("/api/organizations/")
        assert response.status_code == 200

        organizations = response.json()
        assert isinstance(organizations, list)
        assert len(organizations) > 0

        # Check first organization has adoption_fees field
        org = organizations[0]
        assert "adoption_fees" in org
        assert isinstance(org["adoption_fees"], dict)

    def test_get_organizations_adoption_fees_structure(self, client):
        """
        Test adoption_fees field has expected structure when populated.

        GIVEN organizations with adoption fees exist
        WHEN client requests organizations list
        THEN adoption_fees should contain usual_fee and currency fields
        """
        response = client.get("/api/organizations/")
        assert response.status_code == 200

        organizations = response.json()

        # Find organization with populated adoption fees
        org_with_fees = None
        for org in organizations:
            if org["adoption_fees"] and "usual_fee" in org["adoption_fees"]:
                org_with_fees = org
                break

        if org_with_fees:
            adoption_fees = org_with_fees["adoption_fees"]
            assert "usual_fee" in adoption_fees
            assert "currency" in adoption_fees
            assert isinstance(adoption_fees["usual_fee"], (int, float))
            assert isinstance(adoption_fees["currency"], str)
            assert len(adoption_fees["currency"]) == 3  # ISO currency code

    def test_get_organization_by_slug_includes_adoption_fees(self, client):
        """
        Test that GET /api/organizations/{slug} returns adoption_fees field.

        GIVEN an organization exists with slug
        WHEN client requests organization by slug
        THEN response should include adoption_fees field
        """
        # First get list to find a valid slug
        response = client.get("/api/organizations/")
        assert response.status_code == 200

        organizations = response.json()
        assert len(organizations) > 0

        org_slug = organizations[0]["slug"]

        # Test individual organization endpoint
        response = client.get(f"/api/organizations/{org_slug}")
        assert response.status_code == 200

        org = response.json()
        assert "adoption_fees" in org
        assert isinstance(org["adoption_fees"], dict)

    def test_adoption_fees_defaults_to_empty_dict(self, client):
        """
        Test that adoption_fees defaults to empty dict when not set.

        GIVEN organizations without explicit adoption fees
        WHEN client requests organizations
        THEN adoption_fees should default to empty dictionary
        """
        response = client.get("/api/organizations/")
        assert response.status_code == 200

        organizations = response.json()

        # Find organization with empty adoption fees
        org_with_empty_fees = None
        for org in organizations:
            if not org["adoption_fees"]:  # Empty dict evaluates to False
                org_with_empty_fees = org
                break

        if org_with_empty_fees:
            assert org_with_empty_fees["adoption_fees"] == {}

    def test_organizations_list_json_parsing_adoption_fees(self, client):
        """
        Test that adoption_fees field is properly JSON parsed in list endpoint.

        GIVEN organizations with JSONB adoption_fees in database
        WHEN client requests organizations list
        THEN adoption_fees should be parsed as Python dict, not JSON string
        """
        response = client.get("/api/organizations/")
        assert response.status_code == 200

        organizations = response.json()

        for org in organizations:
            # Verify adoption_fees is dict, not string
            assert isinstance(org["adoption_fees"], dict)
            # Verify it's not a JSON string
            assert not isinstance(org["adoption_fees"], str)

    def test_organization_detail_json_parsing_adoption_fees(self, client):
        """
        Test that adoption_fees field is properly JSON parsed in detail endpoint.

        GIVEN an organization with JSONB adoption_fees in database
        WHEN client requests organization by slug
        THEN adoption_fees should be parsed as Python dict, not JSON string
        """
        # Get first organization slug
        response = client.get("/api/organizations/")
        assert response.status_code == 200

        organizations = response.json()
        org_slug = organizations[0]["slug"]

        # Test detail endpoint
        response = client.get(f"/api/organizations/{org_slug}")
        assert response.status_code == 200

        org = response.json()

        # Verify adoption_fees is dict, not string
        assert isinstance(org["adoption_fees"], dict)
        # Verify it's not a JSON string
        assert not isinstance(org["adoption_fees"], str)

    def test_adoption_fees_currency_validation(self, client):
        """
        Test that currency codes in adoption_fees are valid ISO format.

        GIVEN organizations with adoption fees containing currency codes
        WHEN client requests organizations
        THEN currency codes should be 3-letter ISO format
        """
        response = client.get("/api/organizations/")
        assert response.status_code == 200

        organizations = response.json()

        valid_currencies = {"USD", "EUR", "GBP", "CAD", "AUD"}

        for org in organizations:
            if org["adoption_fees"] and "currency" in org["adoption_fees"]:
                currency = org["adoption_fees"]["currency"]
                assert len(currency) == 3
                assert currency.isupper()
                # Should be a known valid currency for this system
                assert currency in valid_currencies

    def test_adoption_fees_amount_validation(self, client):
        """
        Test that adoption fee amounts are positive numbers.

        GIVEN organizations with adoption fees containing amounts
        WHEN client requests organizations
        THEN fee amounts should be positive numeric values
        """
        response = client.get("/api/organizations/")
        assert response.status_code == 200

        organizations = response.json()

        for org in organizations:
            if org["adoption_fees"] and "usual_fee" in org["adoption_fees"]:
                fee = org["adoption_fees"]["usual_fee"]
                assert isinstance(fee, (int, float))
                assert fee > 0
                # Should be reasonable adoption fee (not too high/low)
                assert 50 <= fee <= 2000
