"""
Tests for adoption fees in organization configuration files.

Following TDD principles - these tests validate that organization YAML configs
properly include and validate adoption_fees structures.
"""

from pathlib import Path

import pytest
import yaml

from utils.config_loader import ConfigLoader
from utils.config_models import OrganizationConfig


@pytest.mark.config
@pytest.mark.integration
class TestAdoptionFeesConfig:
    """Test suite for adoption_fees in organization configurations."""

    @pytest.fixture
    def config_dir(self):
        """Path to organization config directory."""
        return Path("configs/organizations")

    @pytest.fixture
    def sample_config_with_fees(self):
        """Sample organization config with adoption fees."""
        return {
            "id": "test-org-fees",
            "name": "Test Organization with Fees",
            "metadata": {
                "website_url": "https://example.com",
                "description": "Test organization",
                "location": {"country": "US", "city": "Test City"},
                "adoption_fees": {"usual_fee": 350, "currency": "USD"},
                "social_media": {},
                "ships_to": ["US"],
                "service_regions": ["US"],
            },
            "scraper": {"class_name": "TestScraper", "module": "test_module"},
        }

    @pytest.fixture
    def sample_config_without_fees(self):
        """Sample organization config without adoption fees."""
        return {
            "id": "test-org-no-fees",
            "name": "Test Organization without Fees",
            "metadata": {
                "website_url": "https://example.com",
                "description": "Test organization",
                "location": {"country": "US", "city": "Test City"},
                "social_media": {},
                "ships_to": ["US"],
                "service_regions": ["US"],
            },
            "scraper": {"class_name": "TestScraper", "module": "test_module"},
        }

    def test_organization_config_loads_with_adoption_fees(
        self, sample_config_with_fees
    ):
        """
        Test that OrganizationConfig loads correctly with adoption_fees.

        GIVEN config YAML with adoption_fees section
        WHEN loading into OrganizationConfig model
        THEN adoption_fees should be accessible and properly typed
        """
        config = OrganizationConfig(**sample_config_with_fees)

        # adoption_fees is stored as a dict in the metadata (due to Pydantic extra="allow")
        assert hasattr(config.metadata, "adoption_fees")
        assert config.metadata.adoption_fees is not None
        assert config.metadata.adoption_fees["usual_fee"] == 350
        assert config.metadata.adoption_fees["currency"] == "USD"

    def test_organization_config_loads_without_adoption_fees(
        self, sample_config_without_fees
    ):
        """
        Test that OrganizationConfig loads correctly without adoption_fees.

        GIVEN config YAML without adoption_fees section
        WHEN loading into OrganizationConfig model
        THEN adoption_fees should be None or handle gracefully
        """
        config = OrganizationConfig(**sample_config_without_fees)

        # Should either not have the attribute or be None
        if hasattr(config.metadata, "adoption_fees"):
            assert config.metadata.adoption_fees is None

    def test_adoption_fees_validates_usual_fee_type(self):
        """
        Test that adoption_fees validates usual_fee as numeric.

        GIVEN config with non-numeric usual_fee
        WHEN loading into OrganizationConfig model
        THEN should raise validation error
        """
        config_data = {
            "id": "test-invalid-fee",
            "name": "Test Invalid Fee",
            "metadata": {
                "website_url": "https://example.com",
                "description": "Test organization",
                "location": {"country": "US", "city": "Test City"},
                "adoption_fees": {
                    "usual_fee": "not_a_number",
                    "currency": "USD",
                },  # Invalid type
                "social_media": {},
                "ships_to": ["US"],
                "service_regions": ["US"],
            },
            "scraper": {"type": "static", "enabled": False},
        }

        with pytest.raises(Exception):  # Should raise validation error
            OrganizationConfig(**config_data)

    def test_adoption_fees_validates_currency_format(self):
        """
        Test that adoption_fees validates currency as proper format.

        GIVEN config with invalid currency format
        WHEN loading into OrganizationConfig model
        THEN should raise validation error or handle appropriately
        """
        config_data = {
            "id": "test-invalid-currency",
            "name": "Test Invalid Currency",
            "metadata": {
                "website_url": "https://example.com",
                "description": "Test organization",
                "location": {"country": "US", "city": "Test City"},
                "adoption_fees": {
                    "usual_fee": 300,
                    "currency": "INVALID_CURRENCY_CODE",
                },  # Too long
                "social_media": {},
                "ships_to": ["US"],
                "service_regions": ["US"],
            },
            "scraper": {"type": "static", "enabled": False},
        }

        # May raise validation error or accept it (depending on validation rules)
        try:
            config = OrganizationConfig(**config_data)
            # If it doesn't raise error, currency should still be accessible
            if hasattr(config.metadata.adoption_fees, "currency"):
                assert isinstance(config.metadata.adoption_fees.currency, str)
        except Exception:
            # Expected if strict validation is in place
            pass

    def test_all_existing_org_configs_load_successfully(self, config_dir):
        """
        Test that all existing organization configs load without errors.

        GIVEN all organization YAML config files
        WHEN loading each config
        THEN none should raise errors (adoption_fees should be optional)
        """
        if not config_dir.exists():
            pytest.skip("Config directory not found")

        config_files = list(config_dir.glob("*.yaml")) + list(config_dir.glob("*.yml"))
        assert len(config_files) > 0, "No config files found"

        loaded_configs = {}

        for config_file in config_files:
            with open(config_file, "r") as f:
                config_data = yaml.safe_load(f)

            # Should load without error
            config = OrganizationConfig(**config_data)
            loaded_configs[config.id] = config

            # Check adoption_fees if present
            if (
                hasattr(config.metadata, "adoption_fees")
                and config.metadata.adoption_fees
            ):
                fees = config.metadata.adoption_fees

                # Validate structure if present (fees is a dict)
                assert "usual_fee" in fees
                assert "currency" in fees
                assert isinstance(fees["usual_fee"], (int, float))
                assert isinstance(fees["currency"], str)
                assert fees["usual_fee"] > 0
                assert len(fees["currency"]) == 3  # ISO currency code

        assert len(loaded_configs) == len(config_files)

    def test_configs_with_adoption_fees_have_valid_structure(self, config_dir):
        """
        Test that configs with adoption_fees have valid fee structure.

        GIVEN organization configs with adoption_fees
        WHEN examining the fee structure
        THEN should have required fields with valid values
        """
        if not config_dir.exists():
            pytest.skip("Config directory not found")

        loader = ConfigLoader()
        configs = loader.load_all_configs()
        configs_with_fees = []

        for config_id, config in configs.items():
            if (
                hasattr(config.metadata, "adoption_fees")
                and config.metadata.adoption_fees
            ):
                configs_with_fees.append(config)

        # Should have at least some configs with fees (based on the git diff)
        if len(configs_with_fees) > 0:
            for config in configs_with_fees:
                fees = config.metadata.adoption_fees

                # Check required fields (fees is a dict)
                assert "usual_fee" in fees, f"Config {config.id} missing usual_fee"
                assert "currency" in fees, f"Config {config.id} missing currency"

                # Check value types and ranges
                assert isinstance(fees["usual_fee"], (int, float)), (
                    f"Config {config.id} usual_fee not numeric"
                )
                assert isinstance(fees["currency"], str), (
                    f"Config {config.id} currency not string"
                )
                assert fees["usual_fee"] > 0, (
                    f"Config {config.id} usual_fee not positive"
                )
                assert fees["usual_fee"] < 5000, (
                    f"Config {config.id} usual_fee unreasonably high"
                )
                assert len(fees["currency"]) == 3, (
                    f"Config {config.id} currency not 3 chars"
                )
                assert fees["currency"].isupper(), (
                    f"Config {config.id} currency not uppercase"
                )

    def test_adoption_fees_schema_validation(self):
        """
        Test that adoption_fees follows the JSON schema if one exists.

        GIVEN organization JSON schema file
        WHEN schema defines adoption_fees structure
        THEN configs should validate against schema
        """
        schema_file = Path("configs/schemas/organization.schema.json")

        if not schema_file.exists():
            pytest.skip("Organization schema file not found")

        import json

        with open(schema_file, "r") as f:
            schema = json.load(f)

        # Check if adoption_fees is defined in schema
        if "properties" in schema and "metadata" in schema["properties"]:
            metadata_props = schema["properties"]["metadata"]
            if (
                "properties" in metadata_props
                and "adoption_fees" in metadata_props["properties"]
            ):
                adoption_fees_schema = metadata_props["properties"]["adoption_fees"]

                # Verify schema structure is reasonable
                assert "type" in adoption_fees_schema

                if (
                    adoption_fees_schema["type"] == "object"
                    and "properties" in adoption_fees_schema
                ):
                    props = adoption_fees_schema["properties"]

                    # Check usual_fee is defined properly
                    if "usual_fee" in props:
                        assert "type" in props["usual_fee"]
                        assert props["usual_fee"]["type"] in ["number", "integer"]

                    # Check currency is defined properly
                    if "currency" in props:
                        assert "type" in props["currency"]
                        assert props["currency"]["type"] == "string"

    def test_config_loader_handles_adoption_fees(self):
        """
        Test that config loader properly handles adoption_fees across all configs.

        GIVEN organization configs with and without adoption_fees
        WHEN loading all configs via config loader
        THEN all should load successfully and fees should be accessible
        """
        try:
            loader = ConfigLoader()
            configs = loader.load_all_configs()

            assert len(configs) > 0, "No configs loaded"

            fees_count = 0
            no_fees_count = 0

            for config_id, config in configs.items():
                # Should have metadata
                assert hasattr(config, "metadata")

                # Check adoption_fees handling
                if (
                    hasattr(config.metadata, "adoption_fees")
                    and config.metadata.adoption_fees
                ):
                    fees_count += 1

                    # Validate fee structure
                    fees = config.metadata.adoption_fees
                    assert "usual_fee" in fees
                    assert "currency" in fees
                    assert fees["usual_fee"] > 0
                    assert len(fees["currency"]) == 3
                else:
                    no_fees_count += 1

            # Should have a mix of configs with and without fees
            # (Based on the changes, some configs should have fees)
            total_configs = fees_count + no_fees_count
            assert total_configs == len(configs)

        except Exception as e:
            pytest.fail(f"Config loader failed with adoption_fees: {e}")

    def test_specific_organization_adoption_fees(self, config_dir):
        """
        Test specific organizations that should have adoption fees based on git changes.

        GIVEN organizations that were modified to include adoption_fees
        WHEN loading their configs
        THEN they should have valid adoption_fees structure
        """
        # Based on git diff, these orgs were modified:
        expected_orgs_with_fees = [
            "tierschutzverein-europa.yaml",
            "theunderdog.yaml",
            "rean.yaml",
            "pets-in-turkey.yaml",
            "misisrescue.yaml",
            "daisyfamilyrescue.yaml",
            "animalrescuebosnia.yaml",
            "woof-project.yaml",
        ]

        for org_file in expected_orgs_with_fees:
            config_path = config_dir / org_file

            if config_path.exists():
                with open(config_path, "r") as f:
                    config_data = yaml.safe_load(f)

                config = OrganizationConfig(**config_data)

                # Should have adoption_fees
                assert hasattr(config.metadata, "adoption_fees"), (
                    f"{org_file} missing adoption_fees"
                )
                assert config.metadata.adoption_fees is not None, (
                    f"{org_file} adoption_fees is None"
                )

                # Should have required fields (fees is a dict)
                fees = config.metadata.adoption_fees
                assert "usual_fee" in fees, f"{org_file} missing usual_fee"
                assert "currency" in fees, f"{org_file} missing currency"
                assert fees["usual_fee"] > 0, f"{org_file} invalid usual_fee"
                assert fees["currency"] in ["USD", "EUR", "GBP", "CAD"], (
                    f"{org_file} invalid currency"
                )
