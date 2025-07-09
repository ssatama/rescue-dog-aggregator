from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper


@pytest.mark.file_io
class TestBackwardCompatibility:
    """Test that config changes don't break existing functionality."""

    def test_legacy_scraper_initialization(self):
        """Test that legacy scrapers still work with organization_id only."""

        class LegacyScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return 1, "updated"

        # Should work with legacy initialization
        scraper = LegacyScraper(organization_id=1)

        assert scraper.organization_id == 1
        assert scraper.organization_name == "Organization ID 1"
        assert scraper.org_config is None
        assert scraper.rate_limit_delay == 1.0  # Default values

    def test_config_scraper_initialization(self):
        """Test that new config-based initialization works."""

        class ConfigScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return 1, "updated"

        # Mock the ConfigLoader class itself, not the instance method
        with patch("scrapers.base_scraper.ConfigLoader") as mock_loader_class, patch("scrapers.base_scraper.create_default_sync_service") as mock_sync:

            # Mock config
            mock_config = Mock()
            mock_config.name = "Test Organization"
            mock_config.get_scraper_config_dict.return_value = {
                "rate_limit_delay": 2.0,
                "max_retries": 5,
                "timeout": 60,
            }

            # Mock the loader instance
            mock_loader_instance = Mock()
            mock_loader_instance.load_config.return_value = mock_config
            mock_loader_class.return_value = mock_loader_instance

            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=1, was_created=False)
            mock_sync.return_value = mock_sync_service

            # Should work with config initialization
            scraper = ConfigScraper(config_id="test-org")

            assert scraper.organization_id == 1
            assert scraper.organization_name == "Test Organization"
            assert scraper.org_config == mock_config
            assert scraper.rate_limit_delay == 2.0

    def test_both_parameters_rejected(self):
        """Test that providing both organization_id and config_id is rejected."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return []

            def get_existing_animal(self, external_id, organization_id):
                return None

            def create_animal(self, animal_data):
                return 1, "added"

            def update_animal(self, animal_id, animal_data):
                return 1, "updated"

        with pytest.raises(ValueError, match="Either organization_id or config_id must be provided"):
            TestScraper()  # Neither provided

    def test_existing_pets_in_turkey_scraper_compatibility(self):
        """Test that the actual PetsInTurkeyScraper works with both modes."""

        from scrapers.pets_in_turkey.dogs_scraper import PetsInTurkeyScraper

        # Test legacy mode
        scraper_legacy = PetsInTurkeyScraper(organization_id=1)
        assert scraper_legacy.organization_id == 1
        assert "Organization ID 1" in scraper_legacy.organization_name

        # Test config mode (mock the config loading)
        with patch("scrapers.base_scraper.ConfigLoader") as mock_loader, patch("scrapers.base_scraper.create_default_sync_service") as mock_sync:

            mock_config = Mock()
            mock_config.name = "Pets in Turkey"
            mock_config.get_scraper_config_dict.return_value = {"rate_limit_delay": 1.0}

            mock_loader.return_value.load_config.return_value = mock_config
            mock_sync_service = Mock()
            mock_sync_service.sync_single_organization.return_value = Mock(organization_id=2, was_created=False)
            mock_sync.return_value = mock_sync_service

            # Mock the actual config file loading to avoid Pydantic validation
            with patch("utils.config_loader.ConfigLoader.load_config", return_value=mock_config):
                scraper_config = PetsInTurkeyScraper(config_id="pets-in-turkey")

            assert scraper_config.organization_id == 2
            assert scraper_config.organization_name == "Pets in Turkey"
            assert scraper_config.rate_limit_delay == 1.0
