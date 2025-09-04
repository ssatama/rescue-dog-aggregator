"""Tests for DogsTrustScraper class.

Focus on behavior-based testing for the Dogs Trust scraper implementation.
Tests cover the hybrid approach (Selenium for listings, HTTP for details)
and reserved dog filtering requirements.
"""

from unittest.mock import Mock, patch

import pytest
import requests

from scrapers.dogstrust.dogstrust_scraper import DogsTrustScraper
from tests.scrapers.test_scraper_base import ScraperTestBase
from scrapers.base_scraper import BaseScraper
from utils.unified_standardization import UnifiedStandardizer


@pytest.mark.slow
@pytest.mark.browser
class TestDogsTrustScraper(ScraperTestBase):
    """Test cases for DogsTrustScraper - only scraper-specific tests."""

    # Configuration for base class
    scraper_class = DogsTrustScraper
    config_id = "dogstrust"
    expected_org_name = "Dogs Trust"
    expected_base_url = "https://www.dogstrust.org.uk"

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_selenium_driver_cleanup_on_exception(self, mock_webdriver, scraper):
        """Test WebDriver is properly cleaned up even when exceptions occur."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.get.side_effect = Exception("Network error")

        # Should handle exception gracefully and clean up driver
        result = scraper.get_animal_list()

        assert isinstance(result, list)  # Should return empty list on error
        mock_driver.quit.assert_called_once()

    @patch("scrapers.dogstrust.dogstrust_scraper.webdriver.Chrome")
    def test_get_animal_list_applies_reserved_dog_filter(self, mock_webdriver, scraper):
        """Test that get_animal_list applies filter to hide reserved dogs through UI."""
        mock_driver = Mock()
        mock_webdriver.return_value = mock_driver
        mock_driver.page_source = """
        <html>
            <body>
                <div>1 of 5</div>
            </body>
        </html>
        """

        # Mock find_element to simulate filter elements not found
        mock_driver.find_element.side_effect = Exception("Element not found")

        result = scraper.get_animal_list()

        # Verify the initial page load call
        expected_first_url = "https://www.dogstrust.org.uk/rehoming/dogs"
        mock_driver.get.assert_any_call(expected_first_url)
        # Verify attempts to find filter elements were made
        assert mock_driver.find_element.called
        assert isinstance(result, list)


class TestDogsTrustUnifiedStandardization:
    """Test DogsTrust scraper unified standardization integration."""

    def test_dogstrust_inherits_from_base_scraper(self):
        """Test that DogsTrust scraper inherits from BaseScraper."""
        scraper = DogsTrustScraper()
        assert isinstance(scraper, BaseScraper)
        assert hasattr(scraper, 'standardizer')
        assert isinstance(scraper.standardizer, UnifiedStandardizer)

    def test_dogstrust_uses_unified_standardization_when_enabled(self):
        """Test that DogsTrust uses unified standardization when feature flag is enabled."""
        scraper = DogsTrustScraper()
        
        # Mock feature flag enabled
        with patch('utils.feature_flags.is_scraper_standardization_enabled', return_value=True):
            raw_animal_data = {
                'name': 'Buddy',
                'breed': 'german shepherd',
                'age': '3 years old',
                'size': 'large',
                'gender': 'Male'
            }
            
            processed = scraper.process_animal(raw_animal_data)
            
            # Verify unified standardization was applied
            assert processed['breed'] == 'German Shepherd Dog'  # Standardized breed
            assert processed['breed_category'] == 'Herding'  # Group assignment
            assert processed['standardized_size'] == 'Large'  # Size standardization
            assert processed['primary_breed'] == 'German Shepherd Dog'  # Primary breed
            assert processed['standardization_confidence'] > 0.8  # Confidence score

    def test_dogstrust_bypasses_unified_when_disabled(self):
        """Test that DogsTrust bypasses unified standardization when feature flag is disabled."""
        scraper = DogsTrustScraper()
        
        # Disable unified standardization
        scraper.use_unified_standardization = False
        
        raw_animal_data = {
            'name': 'Buddy',
            'breed': 'german shepherd',
            'age': '3 years old',
            'size': 'large'
        }
        
        processed = scraper.process_animal(raw_animal_data)
        
        # Should return original data when flag disabled
        assert processed == raw_animal_data

    def test_dogstrust_removes_optimized_standardization_imports(self):
        """Test that DogsTrust no longer imports from optimized_standardization after migration."""
        import scrapers.dogstrust.dogstrust_scraper as dogstrust_module
        import inspect
        
        # Get the source code
        source = inspect.getsource(dogstrust_module)
        
        # Should NOT contain optimized_standardization imports after migration
        assert 'from utils.optimized_standardization' not in source
        assert 'parse_age_text' not in source or 'import' not in source
        assert 'standardize_breed' not in source or 'import' not in source
        assert 'standardize_size_value' not in source or 'import' not in source

    def test_dogstrust_handles_missing_breed_gracefully(self):
        """Test that DogsTrust handles missing breed data gracefully."""
        scraper = DogsTrustScraper()
        
        with patch('utils.feature_flags.is_scraper_standardization_enabled', return_value=True):
            raw_animal_data = {
                'name': 'Buddy',
                # Missing breed field
                'age': '2 years',
                'size': 'medium'
            }
            
            processed = scraper.process_animal(raw_animal_data)
            
            # Should handle missing breed gracefully
            assert 'breed' in processed
            assert processed['breed_category'] == 'Unknown'

