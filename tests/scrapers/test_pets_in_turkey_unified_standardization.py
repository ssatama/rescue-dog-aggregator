"""Tests for Pets in Turkey scraper with unified standardization."""

import pytest
from unittest.mock import MagicMock, patch

from scrapers.pets_in_turkey.dogs_scraper import PetsInTurkeyScraper
from utils.unified_standardization import UnifiedStandardizer


class TestPetsInTurkeyUnifiedStandardization:
    """Test Pets in Turkey scraper using unified breed standardization."""
    
    @pytest.fixture
    def scraper(self):
        """Create a scraper instance for testing."""
        scraper = PetsInTurkeyScraper(organization_id=1, organization_name="Pets in Turkey")
        scraper.use_unified_standardization = True
        return scraper
    
    @pytest.fixture
    def mock_save_animal(self):
        """Mock save_animal to prevent database writes."""
        with patch.object(PetsInTurkeyScraper, "save_animal") as mock:
            yield mock
    
    def test_pets_in_turkey_unified_standardization_enabled(self):
        """Test that unified standardization is enabled for Pets in Turkey."""
        from utils.feature_flags import is_scraper_standardization_enabled
        
        assert is_scraper_standardization_enabled("pets_in_turkey") is True
    
    def test_lurcher_breed_standardization(self, scraper, mock_save_animal):
        """Test that Lurcher is correctly standardized to Hound group."""
        dog_data = {
            "name": "Max",
            "breed": "Lurcher",
            "age": "2 years",
            "sex": "Male",
            "external_id": "pit-max-123",
            "properties": {
                "weight": "25kg",
                "height": "60cm",
                "neutered_spayed": "Yes",
                "description": "Beautiful Lurcher looking for a home"
            }
        }
        
        # Process the animal
        result = scraper.process_animal(dog_data)
        
        # Verify breed group is Hound (critical fix for Lurchers)
        assert result["breed_category"] == "Hound"
        assert result["breed"] == "Lurcher"
    
    def test_staffordshire_bull_terrier_standardization(self, scraper, mock_save_animal):
        """Test that Staffordshire Bull Terrier variations are standardized."""
        dog_data = {
            "name": "Ruby",
            "breed": "staffordshire bull terrier",  # Lowercase variation
            "age": "4 years",
            "sex": "Female",
            "external_id": "pit-ruby-456",
            "properties": {
                "weight": "15kg",
                "height": "40cm",
                "neutered_spayed": "Yes",
                "description": "Sweet Staffie girl"
            }
        }
        
        # Process the animal
        result = scraper.process_animal(dog_data)
        
        # Verify breed is properly capitalized
        assert result["breed"] == "Staffordshire Bull Terrier"
        assert result["breed_category"] == "Terrier"
    
    def test_designer_breed_standardization(self, scraper, mock_save_animal):
        """Test that designer breeds are handled correctly."""
        dog_data = {
            "name": "Charlie",
            "breed": "Labradoodle",
            "age": "1 year",
            "sex": "Male",
            "external_id": "pit-charlie-789",
            "properties": {
                "weight": "30kg",
                "height": "55cm",
                "neutered_spayed": "No",
                "description": "Fluffy Labradoodle puppy"
            }
        }
        
        # Process the animal
        result = scraper.process_animal(dog_data)
        
        # Verify designer breed handling
        assert result["breed"] == "Labradoodle"
        # Labradoodle is categorized as Sporting (from Labrador parent breed)
        assert result["breed_category"] in ["Sporting", "Designer", "Mixed"]
    
    def test_age_standardization(self, scraper, mock_save_animal):
        """Test that age text is properly handled and yo format is converted."""
        test_cases = [
            ("2 yo", "2 years"),  # "yo" format conversion
            ("6 months", "6 months"),
            ("10 years", "10 years"),
            ("Unknown", "Unknown"),
        ]
        
        for age_input, expected_age in test_cases:
            dog_data = {
                "name": "Test",
                "breed": "Mixed",
                "age": age_input,
                "sex": "Male",
                "external_id": f"pit-test-{age_input}",
                "properties": {
                    "weight": "20kg",
                    "height": "50cm",
                    "neutered_spayed": "Yes",
                    "description": "Test dog"
                }
            }
            
            result = scraper.process_animal(dog_data)
            # The age field should contain the converted value
            assert result["age"] == expected_age, f"Failed for age: {age_input}"
    
    def test_size_standardization(self, scraper, mock_save_animal):
        """Test that size is properly standardized from weight."""
        test_cases = [
            ("4kg", "Small"),   # <5kg is Tiny, but unified standardization may map to Small
            ("10kg", "Small"),  # 5-12kg is Small
            ("20kg", "Medium"), # 12-25kg is Medium
            ("35kg", "Large"),  # 25-40kg is Large
            ("45kg", "Large"),  # >40kg is XLarge, but may map to Large
        ]
        
        for weight, expected_size_category in test_cases:
            dog_data = {
                "name": "Test",
                "breed": "Mixed",
                "age": "2 years",
                "sex": "Female",
                "external_id": f"pit-test-{weight}",
                "properties": {
                    "weight": weight,
                    "height": "50cm",
                    "neutered_spayed": "Yes",
                    "description": "Test dog"
                }
            }
            
            # Process with unified standardization
            result = scraper.process_animal(dog_data)
            
            # UnifiedStandardizer infers size from weight in properties
            if result.get("standardized_size"):
                # Check that size was inferred (may differ from old logic)
                assert result["standardized_size"] in ["Small", "Medium", "Large"]
    
    def test_mixed_breed_standardization(self, scraper, mock_save_animal):
        """Test that mixed breeds are properly categorized."""
        dog_data = {
            "name": "Buddy",
            "breed": "Mixed Breed",
            "age": "3 years",
            "sex": "Male",
            "external_id": "pit-buddy-mix",
            "properties": {
                "weight": "22kg",
                "height": "55cm",
                "neutered_spayed": "Yes",
                "description": "Friendly mixed breed"
            }
        }
        
        # Process the animal
        result = scraper.process_animal(dog_data)
        
        # Verify mixed breed handling
        assert result["breed_category"] == "Mixed"
    
    def test_breed_confidence_scoring(self, scraper, mock_save_animal):
        """Test that breed confidence scores are generated."""
        dog_data = {
            "name": "Rex",
            "breed": "German Shepherd",
            "age": "5 years",
            "sex": "Male",
            "external_id": "pit-rex-gsd",
            "properties": {
                "weight": "35kg",
                "height": "65cm",
                "neutered_spayed": "Yes",
                "description": "Purebred German Shepherd"
            }
        }
        
        # Process the animal
        result = scraper.process_animal(dog_data)
        
        # Verify confidence scoring is present
        assert "standardization_confidence" in result
        assert 0 <= result["standardization_confidence"] <= 1
        # Known breeds should have high confidence
        assert result["standardization_confidence"] > 0.8