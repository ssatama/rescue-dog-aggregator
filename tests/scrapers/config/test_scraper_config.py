"""Tests for ScraperConfig dataclass."""

import pytest

from scrapers.config.scraper_config import ScraperConfig


@pytest.mark.unit
@pytest.mark.unit
class TestScraperConfigCreation:
    """Test ScraperConfig creation and defaults."""

    def test_creates_with_required_fields_only(self):
        config = ScraperConfig(
            organization_id=1,
            organization_name="Test Rescue",
        )
        assert config.organization_id == 1
        assert config.organization_name == "Test Rescue"
        assert config.rate_limit_delay == 1.0
        assert config.max_retries == 3
        assert config.batch_size == 6
        assert config.skip_existing_animals is False

    def test_creates_with_custom_values(self):
        config = ScraperConfig(
            organization_id=5,
            organization_name="Custom Rescue",
            rate_limit_delay=2.5,
            max_retries=5,
            batch_size=10,
            skip_existing_animals=True,
        )
        assert config.organization_id == 5
        assert config.organization_name == "Custom Rescue"
        assert config.rate_limit_delay == 2.5
        assert config.max_retries == 5
        assert config.batch_size == 10
        assert config.skip_existing_animals is True

    def test_creates_with_optional_timeout(self):
        config = ScraperConfig(
            organization_id=1,
            organization_name="Test",
            timeout=60,
        )
        assert config.timeout == 60

    def test_default_timeout_is_30(self):
        config = ScraperConfig(
            organization_id=1,
            organization_name="Test",
        )
        assert config.timeout == 30

    def test_creates_with_retry_backoff_factor(self):
        config = ScraperConfig(
            organization_id=1,
            organization_name="Test",
            retry_backoff_factor=3.0,
        )
        assert config.retry_backoff_factor == 3.0

    def test_default_retry_backoff_factor(self):
        config = ScraperConfig(
            organization_id=1,
            organization_name="Test",
        )
        assert config.retry_backoff_factor == 2.0


@pytest.mark.unit
@pytest.mark.unit
class TestScraperConfigImmutability:
    """Test that ScraperConfig is immutable (frozen)."""

    def test_cannot_modify_organization_id(self):
        config = ScraperConfig(organization_id=1, organization_name="Test")
        with pytest.raises(AttributeError):
            config.organization_id = 2

    def test_cannot_modify_rate_limit_delay(self):
        config = ScraperConfig(organization_id=1, organization_name="Test")
        with pytest.raises(AttributeError):
            config.rate_limit_delay = 5.0

    def test_cannot_modify_skip_existing_animals(self):
        config = ScraperConfig(organization_id=1, organization_name="Test")
        with pytest.raises(AttributeError):
            config.skip_existing_animals = True


@pytest.mark.unit
@pytest.mark.unit
class TestScraperConfigFromConfigId:
    """Test ScraperConfig.from_config_id() factory method."""

    def test_loads_dogstrust_config(self):
        config = ScraperConfig.from_config_id("dogstrust")
        assert config.organization_name == "Dogs Trust"
        assert config.rate_limit_delay >= 0
        assert config.max_retries >= 1

    def test_loads_rean_config(self):
        config = ScraperConfig.from_config_id("rean")
        assert "REAN" in config.organization_name or "rean" in config.organization_name.lower()
        assert config.rate_limit_delay >= 0

    def test_raises_for_invalid_config_id(self):
        with pytest.raises(ValueError, match="Config not found"):
            ScraperConfig.from_config_id("nonexistent_org")

    def test_respects_skip_existing_animals_from_config(self):
        config = ScraperConfig.from_config_id("dogstrust")
        assert isinstance(config.skip_existing_animals, bool)


@pytest.mark.unit
@pytest.mark.unit
class TestScraperConfigFromOrganizationId:
    """Test ScraperConfig.from_organization_id() factory method."""

    def test_creates_config_with_default_values(self):
        config = ScraperConfig.from_organization_id(42)
        assert config.organization_id == 42
        assert config.organization_name == "Organization ID 42"
        assert config.rate_limit_delay == 1.0
        assert config.max_retries == 3

    def test_creates_config_with_custom_name(self):
        config = ScraperConfig.from_organization_id(
            org_id=10,
            organization_name="Custom Org Name",
        )
        assert config.organization_id == 10
        assert config.organization_name == "Custom Org Name"

    def test_creates_config_with_overrides(self):
        config = ScraperConfig.from_organization_id(
            org_id=5,
            rate_limit_delay=2.0,
            batch_size=12,
        )
        assert config.organization_id == 5
        assert config.rate_limit_delay == 2.0
        assert config.batch_size == 12


@pytest.mark.unit
@pytest.mark.unit
class TestScraperConfigEquality:
    """Test ScraperConfig equality and hashing."""

    def test_equal_configs_are_equal(self):
        config1 = ScraperConfig(organization_id=1, organization_name="Test")
        config2 = ScraperConfig(organization_id=1, organization_name="Test")
        assert config1 == config2

    def test_different_configs_are_not_equal(self):
        config1 = ScraperConfig(organization_id=1, organization_name="Test")
        config2 = ScraperConfig(organization_id=2, organization_name="Test")
        assert config1 != config2

    def test_configs_are_hashable(self):
        config = ScraperConfig(organization_id=1, organization_name="Test")
        config_set = {config}
        assert config in config_set


@pytest.mark.unit
@pytest.mark.unit
class TestScraperConfigToDict:
    """Test ScraperConfig.to_dict() method."""

    def test_to_dict_includes_all_fields(self):
        config = ScraperConfig(
            organization_id=1,
            organization_name="Test",
            rate_limit_delay=2.0,
            max_retries=5,
        )
        result = config.to_dict()
        assert result["organization_id"] == 1
        assert result["organization_name"] == "Test"
        assert result["rate_limit_delay"] == 2.0
        assert result["max_retries"] == 5
        assert result["batch_size"] == 6
        assert result["skip_existing_animals"] is False

    def test_to_dict_returns_new_dict(self):
        config = ScraperConfig(organization_id=1, organization_name="Test")
        dict1 = config.to_dict()
        dict2 = config.to_dict()
        assert dict1 == dict2
        assert dict1 is not dict2
