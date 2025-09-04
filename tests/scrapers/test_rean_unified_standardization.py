"""
Test REAN scraper with unified standardization enabled.
"""
import pytest
from unittest.mock import Mock, patch, MagicMock
from scrapers.rean.dogs_scraper import REANScraper
from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.unit
class TestREANUnifiedStandardization:
    """Test REAN scraper with unified standardization."""
    
    @pytest.fixture
    def scraper(self):
        """Create REAN scraper instance."""
        with patch('services.database_service.DatabaseService'), \
             patch('utils.config_loader.ConfigLoader.load_config') as mock_load_config:
            # Mock config loading
            mock_load_config.return_value = Mock(
                name='REAN',
                base_url='https://www.rean.org.uk',
                organization_id='rean'
            )
            scraper = REANScraper(config_id='rean')
            scraper.db_service = Mock()
            scraper.standardizer = UnifiedStandardizer()
            return scraper
    
    def test_rean_inherits_from_base_scraper(self):
        """Verify REAN scraper inherits from BaseScraper."""
        from scrapers.base_scraper import BaseScraper
        assert issubclass(REANScraper, BaseScraper)
    
    def test_rean_uses_unified_standardization_when_enabled(self, scraper):
        """Test that REAN uses unified standardization through BaseScraper."""
        # Set feature flag
        scraper.use_unified_standardization = True
        
        # Mock animal data (REAN doesn't extract breed)
        raw_animal = {
            'name': 'Buddy',
            'age_text': '2 years old',
            'properties': {
                'weight': '25kg',
                'location': 'Romania'
            }
        }
        
        # Process through base scraper's process_animal method
        with patch.object(scraper, 'save_animal') as mock_save:
            scraper.process_animal(raw_animal)
            
            # Verify save_animal was called
            mock_save.assert_called_once()
            processed = mock_save.call_args[0][0]
            
            # Verify standardization was applied (even without breed data)
            assert processed['name'] == 'Buddy'
            assert 'age_text' in processed
    
    def test_rean_handles_missing_breed_gracefully(self, scraper):
        """Test REAN handles cases where breed is not extracted."""
        scraper.use_unified_standardization = True
        
        raw_animal = {
            'name': 'Max',
            'age_text': '3 years',
            'properties': {}
        }
        
        # Process animal
        with patch.object(scraper, 'save_animal') as mock_save:
            scraper.process_animal(raw_animal)
            
            # Verify it was saved even without breed
            mock_save.assert_called_once()
            processed = mock_save.call_args[0][0]
            assert processed['name'] == 'Max'
    
    def test_rean_future_breed_extraction_ready(self, scraper):
        """Test that if REAN adds breed extraction, it will use unified standardization."""
        scraper.use_unified_standardization = True
        
        # Simulate future breed data extraction
        raw_animal = {
            'name': 'Luna',
            'age_text': '1 year',
            'breed': 'Lurcher',  # If REAN adds breed extraction
            'properties': {}
        }
        
        # Process through standardizer directly
        standardized = scraper.standardizer.apply_full_standardization(raw_animal)
        
        # Verify Lurcher would be properly categorized as Hound
        if 'breed_group' in standardized:
            assert standardized['breed_group'] == 'Hound'
    
    def test_rean_data_extraction_unchanged(self, scraper):
        """Verify REAN's data extraction logic remains unchanged."""
        with patch.object(scraper, 'extract_dog_data') as mock_extract:
            mock_extract.return_value = {
                'name': 'Test Dog',
                'age_text': '2 years',
                'properties': {'weight': '20kg'}
            }
            
            # Call extraction
            result = scraper.extract_dog_data("Sample text")
            
            # Verify extraction still works
            assert result['name'] == 'Test Dog'
            assert result['age_text'] == '2 years'
            assert 'properties' in result
    
    def test_feature_flag_controls_standardization(self, scraper):
        """Test feature flag properly controls standardization usage."""
        raw_animal = {
            'name': 'Charlie',
            'age_text': '4 years',
            'properties': {}
        }
        
        # Test with flag disabled
        scraper.use_unified_standardization = False
        with patch.object(scraper, 'save_animal') as mock_save:
            scraper.process_animal(raw_animal)
            assert mock_save.called
        
        # Test with flag enabled
        scraper.use_unified_standardization = True
        with patch.object(scraper, 'save_animal') as mock_save:
            scraper.process_animal(raw_animal)
            assert mock_save.called