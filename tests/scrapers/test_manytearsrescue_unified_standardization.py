"""
Test ManyTearsRescue scraper with unified standardization.
"""
import pytest
from unittest.mock import Mock, MagicMock, patch
from scrapers.manytearsrescue.manytearsrescue_scraper import ManyTearsRescueScraper


class TestManyTearsRescueUnifiedStandardization:
    """Test ManyTearsRescue scraper with unified standardization enabled."""

    @pytest.fixture
    def scraper(self):
        """Create a ManyTearsRescue scraper instance with mocked driver."""
        scraper = ManyTearsRescueScraper()
        scraper.driver = MagicMock()
        scraper.use_unified_standardization = True
        return scraper

    def test_staffordshire_bull_terrier_standardization(self, scraper):
        """Test that Staffordshire Bull Terrier variations are standardized."""
        test_data = {
            'breed': 'Staffie',
            'age': '2 years',
            'size': 'Medium',
            'location': 'UK'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['breed'] == 'Staffordshire Bull Terrier'
        assert result['breed_category'] == 'Terrier'
        assert result['standardized_size'] == 'Medium'
        assert result['standardization_confidence'] > 0.8

    def test_jack_russell_terrier_standardization(self, scraper):
        """Test Jack Russell Terrier standardization."""
        test_data = {
            'breed': 'jack russell',
            'age': '5 years',
            'size': 'Small'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['breed'] == 'Jack Russell Terrier'
        assert result['breed_category'] == 'Terrier'
        assert result['standardized_size'] == 'Small'

    def test_cocker_spaniel_standardization(self, scraper):
        """Test Cocker Spaniel (UK variant) standardization."""
        test_data = {
            'breed': 'Cocker Spaniel',
            'age': '3 years old',
            'size': 'Medium'
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['breed'] == 'Cocker Spaniel'
        assert result['breed_category'] == 'Sporting'
        assert result['standardized_size'] == 'Medium'

    def test_english_springer_spaniel_standardization(self, scraper):
        """Test English Springer Spaniel standardization."""
        test_data = {
            'breed': 'English Springer',
            'age': '1 year',
            'size': None  # Test size inference
        }
        
        result = scraper.process_animal(test_data)
        
        assert result['breed'] == 'English Springer Spaniel'
        assert result['breed_category'] == 'Sporting'
        assert result['standardized_size'] == 'Medium'  # Inferred from breed

    def test_mixed_breed_handling(self, scraper):
        """Test mixed breed with multiple breeds."""
        test_data = {
            'breed': 'Collie X Labrador',
            'age': '4 years',
            'size': 'Large'
        }
        
        result = scraper.process_animal(test_data)
        
        assert 'Collie' in result['breed']
        assert 'Labrador' in result['breed']
        assert result['breed_category'] == 'Mixed'
        assert result['standardized_size'] == 'Large'

    def test_age_text_parsing(self, scraper):
        """Test various age text formats."""
        test_cases = [
            ('6 months', 'Puppy'),
            ('1 year old', 'Young'),
            ('3-4 years', 'Adult'),
            ('7 years', 'Senior'),  # 7 years (84 months) is the Senior threshold
            ('10 years', 'Senior')
        ]
        
        for age_text, expected_category in test_cases:
            test_data = {
                'breed': 'Beagle',
                'age': age_text,
                'size': 'Medium'
            }
            
            result = scraper.process_animal(test_data)
            assert result['age_category'] == expected_category

    def test_size_standardization(self, scraper):
        """Test size value standardization."""
        test_cases = [
            ('tiny', 'Small'),
            ('small', 'Small'),
            ('medium', 'Medium'),
            ('large', 'Large'),
            ('giant', 'Large'),
            ('xl', 'Large')
        ]
        
        for input_size, expected_size in test_cases:
            test_data = {
                'breed': 'Mixed Breed',
                'age': '2 years',
                'size': input_size
            }
            
            result = scraper.process_animal(test_data)
            assert result['standardized_size'] == expected_size

    def test_feature_flag_enabled(self):
        """Test that feature flag is enabled for ManyTearsRescue."""
        from utils.feature_flags import FeatureFlags
        # This will fail initially and pass after migration
        assert FeatureFlags.SCRAPER_FLAGS.get('manytearsrescue', False) == True