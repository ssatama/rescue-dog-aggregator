"""Integration test for unified standardization with base scraper."""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from utils.unified_standardization import UnifiedStandardizer


class TestScraper(BaseScraper):
    """Test scraper for integration testing."""

    def __init__(self, use_unified_standardization=True):
        """Initialize test scraper with minimal required arguments."""
        # Mock the necessary services
        mock_db = Mock()
        mock_session_manager = Mock()
        mock_metrics = Mock()

        # Initialize with config_id instead of base_url/org_name
        super().__init__(
            config_id="test_org",
            database_service=mock_db,
            session_manager=mock_session_manager,
            metrics_collector=mock_metrics,
        )

        # Override the use_unified_standardization flag after init
        self.use_unified_standardization = use_unified_standardization

    def collect_data(self):
        """Implement abstract method to collect data."""
        return self.fetch_animals()

    def fetch_animals(self):
        """Return test animals."""
        return [
            {
                "name": "Luna",
                "breed": "Lurcher",  # Should be standardized to Hound group
                "age": "2 years",
                "size": "medium",
                "url": "http://test.com/luna",
            },
            {
                "name": "Max",
                "breed": "Staffy",  # Should be standardized to Staffordshire Bull Terrier
                "age": "5 years old",
                "size": "Medium",
                "url": "http://test.com/max",
            },
            {
                "name": "Bella",
                "breed": "Labradoodle",  # Designer breed
                "age": "puppy",
                "size": "large",
                "url": "http://test.com/bella",
            },
        ]


@pytest.mark.unit
class TestUnifiedStandardizationIntegration:
    """Test unified standardization integration with base scraper."""

    @patch("scrapers.base_scraper.ConfigLoader")
    @patch("scrapers.base_scraper.create_default_sync_service")
    def test_base_scraper_applies_standardization(self, mock_sync_service, mock_config_loader):
        """Test that base scraper correctly applies unified standardization."""
        # Setup config mock
        mock_config = Mock()
        mock_config.base_url = "http://test.com"
        mock_config.name = "test_org"
        mock_config_loader.load_config.return_value = mock_config

        # Setup sync service mock
        mock_sync_service.return_value = Mock()

        # Track saved animals
        saved_animals = []

        # Create scraper with unified standardization enabled
        scraper = TestScraper(use_unified_standardization=True)

        # Mock the save_animal method to track what gets saved
        def mock_save(animal):
            # Apply standardization manually to test
            if scraper.use_unified_standardization and scraper.standardizer:
                animal = scraper.process_animal(animal)
            saved_animals.append(animal)
            return animal

        # Get test animals and process them
        animals = scraper.fetch_animals()
        for animal in animals:
            mock_save(animal)

        # Verify animals were standardized
        assert len(saved_animals) == 3

        # Check Lurcher standardization
        luna = saved_animals[0]
        assert luna["breed"] == "Lurcher"
        assert luna["breed_category"] == "Hound"  # Updated field name

        # Check Staffordshire standardization
        max_dog = saved_animals[1]
        assert max_dog["breed"] == "Staffordshire Bull Terrier"  # Standardized name
        assert max_dog["breed_category"] == "Terrier"

        # Check designer breed
        bella = saved_animals[2]
        assert bella["breed"] == "Labradoodle"
        assert bella["breed_category"] == "Designer/Hybrid"
        assert bella["primary_breed"] == "Labrador Retriever"
        assert bella["secondary_breed"] == "Poodle"

    @patch("scrapers.base_scraper.ConfigLoader")
    @patch("scrapers.base_scraper.create_default_sync_service")
    def test_standardization_disabled(self, mock_sync_service, mock_config_loader):
        """Test that standardization can be disabled."""
        # Setup config mock
        mock_config = Mock()
        mock_config.base_url = "http://test.com"
        mock_config.name = "test_org"
        mock_config_loader.load_config.return_value = mock_config

        # Setup sync service mock
        mock_sync_service.return_value = Mock()

        saved_animals = []

        # Create scraper with standardization disabled
        scraper = TestScraper(use_unified_standardization=False)

        # Mock the save_animal method
        def mock_save(animal):
            if scraper.use_unified_standardization and scraper.standardizer:
                animal = scraper.process_animal(animal)
            saved_animals.append(animal)
            return animal

        # Get test animals and process them
        animals = scraper.fetch_animals()
        for animal in animals:
            mock_save(animal)

        # Verify animals were NOT standardized
        assert len(saved_animals) == 3

        # Breeds should remain as-is
        luna = saved_animals[0]
        assert luna["breed"] == "Lurcher"
        assert "breed_category" not in luna  # No standardization applied

        max_dog = saved_animals[1]
        assert max_dog["breed"] == "Staffy"  # Not standardized
        assert "breed_category" not in max_dog

    def test_standardizer_handles_edge_cases(self):
        """Test that standardizer handles edge cases properly."""
        standardizer = UnifiedStandardizer()

        # Test None values - standardizer accepts individual params not dicts
        result = standardizer.apply_full_standardization(breed=None, age=None, size=None)
        assert result is not None
        assert result["breed_category"] == "Unknown"
        assert result["standardization_confidence"] == 0.0

        # Test empty/missing values
        result = standardizer.apply_full_standardization()
        assert result is not None
        assert "breed" in result

        # Test partial data with Unknown breed
        result = standardizer.apply_full_standardization(breed="Unknown")
        assert result["breed"] == "Unknown"
        assert result["breed_category"] == "Unknown"
        assert result["standardization_confidence"] == 0.3  # "Unknown" has 0.3 confidence

        # Test empty string breed
        result = standardizer.apply_full_standardization(breed="")
        assert result["breed"] == "Unknown"
        assert result["breed_category"] == "Unknown"
