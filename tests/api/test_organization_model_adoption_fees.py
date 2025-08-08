"""
Tests for adoption fees functionality in Organization model.

Following TDD principles - these tests validate the adoption_fees field
in the Organization Pydantic model.
"""

import pytest
from pydantic import ValidationError

from api.models.organization import Organization


@pytest.mark.unit
class TestOrganizationModelAdoptionFees:
    """Test suite for adoption_fees field in Organization model."""

    def test_organization_model_has_adoption_fees_field(self):
        """
        Test that Organization model includes adoption_fees field.

        GIVEN Organization model definition
        WHEN model instance is created
        THEN it should have adoption_fees field with correct type
        """
        org_data = {"id": 1, "name": "Test Organization", "slug": "test-organization", "adoption_fees": {"usual_fee": 500, "currency": "EUR"}}

        org = Organization(**org_data)

        assert hasattr(org, "adoption_fees")
        assert org.adoption_fees == {"usual_fee": 500, "currency": "EUR"}
        assert isinstance(org.adoption_fees, dict)

    def test_adoption_fees_defaults_to_empty_dict(self):
        """
        Test that adoption_fees field defaults to empty dict when not provided.

        GIVEN Organization model without adoption_fees in input
        WHEN model instance is created
        THEN adoption_fees should default to empty dictionary
        """
        org_data = {"id": 1, "name": "Test Organization", "slug": "test-organization"}

        org = Organization(**org_data)

        assert org.adoption_fees == {}
        assert isinstance(org.adoption_fees, dict)

    def test_adoption_fees_accepts_complex_structure(self):
        """
        Test that adoption_fees can handle complex nested structures.

        GIVEN adoption_fees with multiple fee types and details
        WHEN Organization model is created
        THEN it should accept and preserve the complex structure
        """
        org_data = {
            "id": 1,
            "name": "Test Organization",
            "slug": "test-organization",
            "adoption_fees": {"usual_fee": 425, "currency": "GBP", "fee_breakdown": {"vaccination": 50, "microchip": 25, "care": 350}, "special_rates": {"senior_dogs": 200, "disabled_dogs": 100}},
        }

        org = Organization(**org_data)

        assert org.adoption_fees["usual_fee"] == 425
        assert org.adoption_fees["currency"] == "GBP"
        assert org.adoption_fees["fee_breakdown"]["vaccination"] == 50
        assert org.adoption_fees["special_rates"]["senior_dogs"] == 200

    def test_adoption_fees_rejects_none_values(self):
        """
        Test that adoption_fees rejects None values (strict typing).

        GIVEN adoption_fees with None value
        WHEN Organization model is created
        THEN it should raise validation error (strict dict typing)
        """
        org_data = {"id": 1, "name": "Test Organization", "slug": "test-organization", "adoption_fees": None}

        with pytest.raises(ValidationError) as exc_info:
            Organization(**org_data)

        # Verify the error is related to adoption_fees field expecting dict
        errors = exc_info.value.errors()
        adoption_fees_errors = [e for e in errors if "adoption_fees" in str(e.get("loc", []))]
        assert len(adoption_fees_errors) > 0
        assert "dict" in str(adoption_fees_errors[0]["type"])

    def test_adoption_fees_type_validation(self):
        """
        Test that adoption_fees validates type constraints.

        GIVEN invalid adoption_fees type (not dict-compatible)
        WHEN Organization model is created
        THEN it should raise validation error
        """
        org_data = {"id": 1, "name": "Test Organization", "slug": "test-organization", "adoption_fees": "invalid_string_value"}  # Should be dict

        with pytest.raises(ValidationError) as exc_info:
            Organization(**org_data)

        # Verify the error is related to adoption_fees field
        errors = exc_info.value.errors()
        adoption_fees_errors = [e for e in errors if "adoption_fees" in str(e.get("loc", []))]
        assert len(adoption_fees_errors) > 0

    def test_adoption_fees_preserves_nested_types(self):
        """
        Test that adoption_fees preserves various nested data types.

        GIVEN adoption_fees with different value types
        WHEN Organization model is created
        THEN all data types should be preserved correctly
        """
        org_data = {
            "id": 1,
            "name": "Test Organization",
            "slug": "test-organization",
            "adoption_fees": {
                "usual_fee": 500,  # int
                "discounted_fee": 450.75,  # float
                "currency": "USD",  # string
                "includes_spay": True,  # boolean
                "fee_categories": ["adult", "puppy", "senior"],  # list
                "location_fees": {"local": 400, "national": 500, "international": 600},  # nested dict
                "notes": None,  # None value
            },
        }

        org = Organization(**org_data)
        fees = org.adoption_fees

        assert isinstance(fees["usual_fee"], int)
        assert isinstance(fees["discounted_fee"], float)
        assert isinstance(fees["currency"], str)
        assert isinstance(fees["includes_spay"], bool)
        assert isinstance(fees["fee_categories"], list)
        assert isinstance(fees["location_fees"], dict)
        assert fees["notes"] is None

    def test_organization_serialization_with_adoption_fees(self):
        """
        Test that Organization model serializes correctly with adoption_fees.

        GIVEN Organization with adoption_fees
        WHEN model is serialized to dict
        THEN adoption_fees should be included in output
        """
        org_data = {"id": 1, "name": "Test Organization", "slug": "test-organization", "adoption_fees": {"usual_fee": 300, "currency": "CAD"}}

        org = Organization(**org_data)
        serialized = org.model_dump()

        assert "adoption_fees" in serialized
        assert serialized["adoption_fees"] == {"usual_fee": 300, "currency": "CAD"}

    def test_adoption_fees_json_serialization(self):
        """
        Test that adoption_fees serializes to valid JSON.

        GIVEN Organization with complex adoption_fees
        WHEN model is serialized to JSON
        THEN it should produce valid JSON string
        """
        import json

        org_data = {"id": 1, "name": "Test Organization", "slug": "test-organization", "adoption_fees": {"usual_fee": 500, "currency": "EUR", "details": {"spay_included": True}}}

        org = Organization(**org_data)
        json_str = org.model_dump_json()

        # Should be valid JSON
        parsed = json.loads(json_str)
        assert "adoption_fees" in parsed
        assert parsed["adoption_fees"]["usual_fee"] == 500

    def test_adoption_fees_empty_dict_serialization(self):
        """
        Test that empty adoption_fees dict serializes correctly.

        GIVEN Organization with default empty adoption_fees
        WHEN model is serialized
        THEN adoption_fees should be empty dict in output
        """
        org_data = {"id": 1, "name": "Test Organization", "slug": "test-organization"}

        org = Organization(**org_data)
        serialized = org.model_dump()

        assert "adoption_fees" in serialized
        assert serialized["adoption_fees"] == {}
        assert isinstance(serialized["adoption_fees"], dict)
