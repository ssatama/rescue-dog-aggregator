"""Test FurryRescueItaly scraper with unified standardization."""

from unittest.mock import Mock

import pytest

from scrapers.furryrescueitaly.furryrescueitaly_scraper import FurryRescueItalyScraper


@pytest.fixture
def scraper():
    """Create FurryRescueItaly scraper instance with mocked dependencies."""
    mock_metrics = Mock()
    mock_session = Mock()
    mock_database = Mock()

    scraper = FurryRescueItalyScraper(
        config_id="furryrescueitaly",
        metrics_collector=mock_metrics,
        session_manager=mock_session,
        database_service=mock_database,
    )

    # Enable unified standardization for this scraper
    scraper.use_unified_standardization = True

    return scraper


class TestFurryRescueItalyUnifiedStandardization:
    """Test unified standardization for FurryRescueItaly scraper."""

    def test_lurcher_breed_standardization(self, scraper):
        """Test that Lurcher is properly standardized to Hound group."""
        animal_data = {
            "url": "https://test.com/dog1",
            "name": "Test Dog",
            "breed": "LURCHER",  # FurryRescue often has UPPERCASE breeds
            "age": "2 years",
            "size": "Large (20+ kg)",
            "sex": "Male",
            "properties": {
                "breed": "LURCHER",
                "age": "2 years",
                "size": "Large (20+ kg)",
                "sex": "Male",
            },
        }

        processed = scraper.process_animal(animal_data)

        # Verify Lurcher is mapped to Hound group
        assert processed["breed_category"] == "Hound"
        assert processed["breed"] == "Lurcher"  # Standardized breed name
        assert processed["standardization_confidence"] > 0.8

    def test_italian_breed_handling(self, scraper):
        """Test that Italian breeds are properly standardized."""
        animal_data = {
            "url": "https://test.com/dog2",
            "name": "Bella",
            "breed": "CANE CORSO",  # Italian breed in uppercase
            "age": "3 years",
            "size": "Large",
            "properties": {
                "breed": "CANE CORSO",
                "age": "3 years",
                "size": "Large",
            },
        }

        processed = scraper.process_animal(animal_data)

        assert processed["breed"] == "Cane Corso"  # Standardized breed name
        assert processed["breed_category"] == "Working"
        assert processed["standardization_confidence"] > 0.8

    def test_designer_breed_standardization(self, scraper):
        """Test designer breeds get proper parent mapping."""
        animal_data = {
            "url": "https://test.com/dog3",
            "name": "Fluffy",
            "breed": "CAVACHON",
            "age": "1 year",
            "size": "Small",
            "properties": {
                "breed": "CAVACHON",
                "age": "1 year",
                "size": "Small",
            },
        }

        processed = scraper.process_animal(animal_data)

        assert processed["breed"] == "Cavachon"  # Standardized breed name
        assert processed["breed_category"] == "Designer"
        # Parent breeds should be in primary/secondary breed fields
        assert processed.get("primary_breed") in [
            "Cavachon",
            "Cavalier King Charles Spaniel",
        ]

    def test_size_standardization_with_weight(self, scraper):
        """Test size standardization when weight info is included."""
        animal_data = {
            "url": "https://test.com/dog4",
            "name": "Rex",
            "breed": "Mixed Breed",
            "size": "Large",  # Already extracted from weight info
            "properties": {
                "breed": "Mixed Breed",
                "size": "Large (20+ kg)",  # Original with weight
            },
        }

        processed = scraper.process_animal(animal_data)

        assert processed["standardized_size"] == "Large"
        # Original size with weight should be preserved in properties
        assert processed["properties"]["size"] == "Large (20+ kg)"

    def test_age_standardization_from_birth(self, scraper):
        """Test age standardization from birth date."""
        animal_data = {
            "url": "https://test.com/dog5",
            "name": "Puppy",
            "breed": "Labrador",
            "age": "2022",  # Birth year set at top level
            "properties": {
                "breed": "Labrador",
                "born": "2022",  # Birth year in properties
                "size": "Medium",
            },
        }

        processed = scraper.process_animal(animal_data)

        # Age should be preserved
        assert "age" in processed

    def test_mixed_breed_handling(self, scraper):
        """Test mixed breeds are categorized correctly."""
        animal_data = {
            "url": "https://test.com/dog6",
            "name": "Spot",
            "breed": "MIXED BREED",
            "size": "Medium",
            "properties": {
                "breed": "MIXED BREED",
                "size": "Medium",
            },
        }

        processed = scraper.process_animal(animal_data)

        assert processed["breed"] == "Mixed Breed"  # Standardized breed name
        assert processed["breed_category"] == "Mixed"

    def test_uppercase_to_titlecase_conversion(self, scraper):
        """Test that UPPERCASE breeds are converted to Title Case."""
        animal_data = {
            "url": "https://test.com/dog7",
            "name": "Duke",
            "breed": "GERMAN SHEPHERD",
            "properties": {
                "breed": "GERMAN SHEPHERD",
                "size": "Large",
            },
        }

        processed = scraper.process_animal(animal_data)

        # Should convert to proper case and full name
        assert processed["breed"] == "German Shepherd Dog"  # Standardized breed name
        assert processed["breed_category"] == "Herding"

    def test_feature_flag_enabled(self):
        """Test that feature flag is enabled for FurryRescueItaly."""
        from utils.feature_flags import FeatureFlags

        assert FeatureFlags.SCRAPER_FLAGS.get("furryrescueitaly") == True
