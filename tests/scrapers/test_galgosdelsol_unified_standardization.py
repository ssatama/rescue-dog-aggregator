"""Test GalgosDelSol scraper with unified standardization."""

from unittest.mock import Mock

import pytest

from scrapers.galgosdelsol.galgosdelsol_scraper import GalgosDelSolScraper


@pytest.fixture
def galgosdelsol_scraper():
    """Create a GalgosDelSol scraper instance with mocked database."""
    mock_metrics = Mock()
    mock_session = Mock()
    mock_database = Mock()
    
    scraper = GalgosDelSolScraper(
        config_id="galgosdelsol",
        metrics_collector=mock_metrics,
        session_manager=mock_session,
        database_service=mock_database,
    )
    
    # Enable unified standardization
    scraper.use_unified_standardization = True
    
    return scraper


class TestGalgosDelSolUnifiedStandardization:
    """Test GalgosDelSol scraper uses unified standardization correctly."""

    def test_galgo_breed_standardization(self, galgosdelsol_scraper):
        """Test that Galgo breed is properly standardized."""
        animal = {
            "breed": "galgo",
            "age": "2 years",
            "sex": "Male",
            "size": "Large",
        }
        
        result = galgosdelsol_scraper.process_animal(animal)
        
        assert result["breed"] == "Galgo"
        assert result["breed_category"] == "Hound"
        assert result["standardized_size"] == "Large"
        assert result["standardization_confidence"] > 0.8

    def test_galgo_espanol_breed_standardization(self, galgosdelsol_scraper):
        """Test that Galgo Español breed is properly standardized."""
        animal = {
            "breed": "galgo español",
            "age": "3 years",
            "sex": "Female",
            "size": "Large",
        }
        
        result = galgosdelsol_scraper.process_animal(animal)
        
        assert result["breed"] == "Galgo Español"
        assert result["breed_category"] == "Hound"
        assert result["standardized_size"] == "Large"
        assert result["standardization_confidence"] > 0.8

    def test_podenco_breed_standardization(self, galgosdelsol_scraper):
        """Test that Podenco breed is properly standardized."""
        animal = {
            "breed": "podenco",
            "age": "18 months",
            "sex": "Male",
            "size": "Medium",
        }
        
        result = galgosdelsol_scraper.process_animal(animal)
        
        assert result["breed"] == "Podenco"
        assert result["breed_category"] == "Hound"
        assert result["standardized_size"] == "Medium"
        assert result["standardization_confidence"] > 0.8

    def test_mixed_breed_standardization(self, galgosdelsol_scraper):
        """Test that mixed breed is properly standardized."""
        animal = {
            "breed": "galgo mix",
            "age": "4 years",
            "sex": "Female",
            "size": "Large",
        }
        
        result = galgosdelsol_scraper.process_animal(animal)
        
        assert "galgo" in result["breed"].lower()
        assert result["breed_category"] == "Mixed"
        assert result["standardized_size"] == "Large"

    def test_age_standardization(self, galgosdelsol_scraper):
        """Test that age categories are properly standardized."""
        test_cases = [
            ("6 months", "Puppy"),
            ("10 months", "Puppy"),
            ("1 year", "Young"),
            ("2 years", "Adult"),
            ("5 years", "Adult"),
            ("8 years", "Senior"),
            ("10 years", "Senior"),
        ]
        
        for age_text, expected_category in test_cases:
            animal = {
                "breed": "galgo",
                "age": age_text,
                "sex": "Male",
                "size": "Large",
            }
            
            result = galgosdelsol_scraper.process_animal(animal)
            assert result.get("age_category") == expected_category, f"Failed for age: {age_text}"

    def test_size_standardization(self, galgosdelsol_scraper):
        """Test that sizes are properly standardized."""
        test_cases = [
            ("small", "Small"),
            ("medium", "Medium"),
            ("large", "Large"),
            ("xlarge", "XLarge"),
        ]
        
        for raw_size, expected_size in test_cases:
            animal = {
                "breed": "galgo",
                "age": "3 years",
                "sex": "Male",
                "size": raw_size,
            }
            
            result = galgosdelsol_scraper.process_animal(animal)
            assert result["standardized_size"] == expected_size

    def test_spanish_breed_variety_handling(self, galgosdelsol_scraper):
        """Test that various Spanish breed names are handled correctly."""
        test_breeds = [
            ("Galgo", "Galgo", "Hound"),
            ("Podenco", "Podenco", "Hound"),
            ("galgo español", "Galgo Español", "Hound"),
            ("GALGO", "Galgo", "Hound"),
            ("podenco mix", "podenco mix", "Mixed"),  # Mixed breeds keep their original form
        ]
        
        for raw_breed, expected_breed, expected_category in test_breeds:
            animal = {
                "breed": raw_breed,
                "age": "2 years",
                "sex": "Female",
                "size": "Medium",
            }
            
            result = galgosdelsol_scraper.process_animal(animal)
            assert result["breed"] == expected_breed
            assert result["breed_category"] == expected_category

    def test_feature_flag_controls_standardization(self, galgosdelsol_scraper):
        """Test that feature flag properly controls standardization."""
        animal = {
            "breed": "galgo",
            "age": "3 years",
            "sex": "Male",
            "size": "large",
        }
        
        # With flag enabled (default in fixture)
        result_enabled = galgosdelsol_scraper.process_animal(animal)
        assert "breed" in result_enabled
        assert result_enabled["breed"] == "Galgo"
        assert "breed_category" in result_enabled
        
        # With flag disabled
        galgosdelsol_scraper.use_unified_standardization = False
        result_disabled = galgosdelsol_scraper.process_animal(animal)
        # Should return original data unchanged
        assert result_disabled == animal