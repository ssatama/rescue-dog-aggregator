"""Integration test for unified standardization with base scraper."""

from unittest.mock import Mock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from utils.unified_standardization import UnifiedStandardizer


class TestScraper(BaseScraper):
    """Test scraper for integration testing."""

    def __init__(self):
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
    def test_base_scraper_applies_standardization(self, mock_config_loader):
        """Test that base scraper correctly applies unified standardization."""
        # Setup config mock
        mock_config = Mock()
        mock_config.base_url = "http://test.com"
        mock_config.name = "test_org"
        mock_config_loader.load_config.return_value = mock_config

        # Track saved animals
        saved_animals = []

        # Create scraper with unified standardization enabled
        scraper = TestScraper()

        # Mock the save_animal method to track what gets saved
        def mock_save(animal):
            # Apply standardization manually to test
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
        assert bella["primary_breed"] == "Labradoodle"  # keeps its own identity
        assert bella["secondary_breed"] is None

    def test_standardizer_handles_edge_cases(self):
        """Test that standardizer handles edge cases properly."""
        standardizer = UnifiedStandardizer()

        # Test None values - standardizer accepts individual params not dicts
        result = standardizer.apply_full_standardization(breed=None, age=None, size=None)
        assert result is not None
        assert result["breed_category"] is None  # no breed stays empty, not "Unknown" (#568)
        assert result["standardization_confidence"] == 0.0

        # Test empty/missing values
        result = standardizer.apply_full_standardization()
        assert result is not None
        assert "breed" in result

        # Test partial data with Unknown breed
        result = standardizer.apply_full_standardization(breed="Unknown")
        assert result["breed"] is None
        assert result["breed_category"] is None
        assert result["standardization_confidence"] == 0.0  # "Unknown" names no breed

        # Test empty string breed
        result = standardizer.apply_full_standardization(breed="")
        assert result["breed"] is None
        assert result["breed_category"] is None
