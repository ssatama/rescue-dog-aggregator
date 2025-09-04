"""
Tests for BaseScraper integration with UnifiedStandardizer
Tests the feature flag system and standardization flow
"""
from unittest.mock import Mock, patch, MagicMock
import pytest
from scrapers.base_scraper import BaseScraper


class ConcreteTestScraper(BaseScraper):
    """Concrete implementation of BaseScraper for testing"""
    
    def collect_data(self):
        """Abstract method implementation - not used in these tests"""
        return []


@pytest.mark.unit
@pytest.mark.fast
class TestBasScraperUnifiedStandardization:
    """Test UnifiedStandardizer integration in BaseScraper"""
    
    @pytest.fixture
    def scraper(self):
        """Create a BaseScraper instance with mocked dependencies"""
        with patch("scrapers.base_scraper.psycopg2"):
            scraper = ConcreteTestScraper(organization_id=1)
            scraper.database_service = Mock()
            scraper.conn = Mock()
            scraper.cursor = Mock()
            scraper.image_processing_service = Mock()
            scraper.metrics_collector = Mock()
            return scraper
    
    def test_base_scraper_has_unified_standardizer(self, scraper):
        """BaseScraper should initialize UnifiedStandardizer instance"""
        assert hasattr(scraper, 'standardizer')
        assert scraper.standardizer is not None
        from utils.unified_standardization import UnifiedStandardizer
        assert isinstance(scraper.standardizer, UnifiedStandardizer)
    
    def test_base_scraper_has_feature_flag(self, scraper):
        """BaseScraper should have use_unified_standardization flag defaulting to True"""
        assert hasattr(scraper, 'use_unified_standardization')
        assert scraper.use_unified_standardization is True
    
    def test_process_animal_with_standardization_enabled(self, scraper):
        """process_animal() should apply standardization when flag is True"""
        scraper.use_unified_standardization = True
        
        raw_data = {
            "name": "Buddy",
            "breed": "Staffordshire Bull Terrier Cross",
            "external_id": "dog-123",
            "organization_id": 1
        }
        
        processed = scraper.process_animal(raw_data)
        
        # Should standardize the breed
        assert processed["breed"] == "Staffordshire Bull Terrier"
        assert processed["primary_breed"] == "Staffordshire Bull Terrier"
        assert processed["secondary_breed"] == "Mixed Breed"
        assert processed["breed_category"] == "Terrier"
        assert "standardization_confidence" in processed
        assert processed["name"] == "Buddy"
        assert processed["external_id"] == "dog-123"
    
    def test_process_animal_with_standardization_disabled(self, scraper):
        """process_animal() should return raw data when flag is False"""
        scraper.use_unified_standardization = False
        
        raw_data = {
            "name": "Max",
            "breed": "Lurcher",
            "external_id": "dog-456",
            "organization_id": 1
        }
        
        processed = scraper.process_animal(raw_data)
        
        # Should return unchanged
        assert processed == raw_data
        assert "primary_breed" not in processed
        assert "breed_category" not in processed
    
    def test_save_animal_calls_process_animal(self, scraper):
        """save_animal() should call process_animal() before saving"""
        scraper.database_service.get_existing_animal.return_value = None
        scraper.database_service.create_animal.return_value = (789, "create")
        scraper.image_processing_service.save_processed_image.return_value = "https://cdn.example.com/image.jpg"
        
        # Mock process_animal to verify it's called
        scraper.process_animal = Mock(side_effect=lambda x: x)
        
        animal_data = {
            "name": "Charlie",
            "breed": "Labradoodle",
            "external_id": "dog-789",
            "organization_id": 1,
            "image_url": "https://example.com/dog.jpg"
        }
        
        result = scraper.save_animal(animal_data)
        
        # Verify process_animal was called with original data
        scraper.process_animal.assert_called_once_with(animal_data)
        assert result == (789, "create")
    
    def test_save_animal_with_standardization_updates_breed_fields(self, scraper):
        """save_animal() should save standardized breed data when enabled"""
        scraper.use_unified_standardization = True
        scraper.database_service.get_existing_animal.return_value = None
        scraper.database_service.create_animal.return_value = (999, "create")
        
        animal_data = {
            "name": "Luna",
            "breed": "Staffordshire Bull Terrier",
            "external_id": "dog-999",
            "organization_id": 1
        }
        
        scraper.save_animal(animal_data)
        
        # Check that create_animal was called with standardized data
        call_args = scraper.database_service.create_animal.call_args[0][0]
        assert call_args["breed"] == "Staffordshire Bull Terrier"
        assert call_args["primary_breed"] == "Staffordshire Bull Terrier"
        assert call_args["secondary_breed"] is None
        assert call_args["breed_category"] == "Terrier"
        assert "standardization_confidence" in call_args
    
    def test_standardization_preserves_non_breed_fields(self, scraper):
        """Standardization should not modify non-breed related fields"""
        scraper.use_unified_standardization = True
        scraper.database_service.get_existing_animal.return_value = None
        scraper.database_service.create_animal.return_value = (111, "create")
        
        animal_data = {
            "name": "Bella",
            "breed": "Cockapoo",
            "external_id": "dog-111",
            "organization_id": 1,
            "age": "2 years",
            "description": "Friendly and energetic",
            "location": "London",
            "image_url": "https://example.com/bella.jpg"
        }
        
        scraper.save_animal(animal_data)
        
        # Verify non-breed fields are preserved
        call_args = scraper.database_service.create_animal.call_args[0][0]
        assert call_args["name"] == "Bella"
        assert call_args["age"] == "2 years"
        assert call_args["description"] == "Friendly and energetic"
        assert call_args["location"] == "London"
        # But breed fields should be standardized (Cockapoo is a designer breed)
        assert call_args["breed"] == "Cockapoo"
        assert call_args["primary_breed"] == "Cocker Spaniel"
        assert call_args["secondary_breed"] == "Poodle"
        assert call_args["breed_category"] == "Non-Sporting"
    
    def test_standardization_logs_events(self, scraper):
        """Standardization should log breed changes"""
        scraper.use_unified_standardization = True
        scraper.database_service.get_existing_animal.return_value = None
        scraper.database_service.create_animal.return_value = (222, "create")
        
        animal_data = {
            "name": "Rex",
            "breed": "Staff X",  # Common abbreviation
            "external_id": "dog-222",
            "organization_id": 1
        }
        
        # Just verify it doesn't crash when logging
        result = scraper.save_animal(animal_data)
        
        # Verify the breed was standardized
        assert result == (222, "create")
        call_args = scraper.database_service.create_animal.call_args[0][0]
        assert call_args["breed"] == "Staffordshire Bull Terrier"
    
    def test_existing_animal_update_with_standardization(self, scraper):
        """Updating existing animal should apply standardization"""
        scraper.use_unified_standardization = True
        
        # Mock existing animal as a tuple (like database would return)
        existing_animal = (333, "Duke", "Lurcher", None, None)
        scraper.database_service.get_existing_animal.return_value = existing_animal
        scraper.database_service.update_animal.return_value = (333, "update")
        
        animal_data = {
            "name": "Duke",
            "breed": "Lurcher",
            "external_id": "dog-333",
            "organization_id": 1
        }
        
        result = scraper.save_animal(animal_data)
        
        # Verify update was called with standardized data
        update_call_args = scraper.database_service.update_animal.call_args[0]
        assert update_call_args[0] == 333  # animal_id
        updated_data = update_call_args[1]
        assert updated_data["primary_breed"] == "Lurcher"
        assert updated_data["breed_category"] == "Hound"
        assert result == (333, "update")
    
    def test_feature_flag_can_be_disabled_per_instance(self):
        """Each scraper instance can independently control standardization"""
        with patch("scrapers.base_scraper.psycopg2"):
            scraper1 = ConcreteTestScraper(organization_id=1)
            scraper2 = ConcreteTestScraper(organization_id=2)
            
            scraper1.use_unified_standardization = False
            scraper2.use_unified_standardization = True
            
            assert scraper1.use_unified_standardization is False
            assert scraper2.use_unified_standardization is True
    
    def test_standardizer_handles_none_breed_gracefully(self, scraper):
        """process_animal() should handle None breed values"""
        scraper.use_unified_standardization = True
        
        raw_data = {
            "name": "Unknown",
            "breed": None,
            "external_id": "dog-444",
            "organization_id": 1
        }
        
        processed = scraper.process_animal(raw_data)
        
        # Should handle None without crashing and set defaults
        assert processed["breed"] == "Unknown"
        assert processed.get("primary_breed") == "Unknown"
        assert processed.get("breed_category") == "Unknown"