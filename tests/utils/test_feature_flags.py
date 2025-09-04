"""Tests for feature flags configuration."""
import os
import pytest
from unittest.mock import patch

from utils.feature_flags import (
    FeatureFlags,
    is_unified_standardization_enabled,
    is_scraper_standardization_enabled,
    get_enabled_scrapers,
    reset_flags_cache,
)


class TestFeatureFlags:
    """Test feature flags configuration."""
    
    def setup_method(self):
        """Reset cache before each test."""
        reset_flags_cache()
    
    def test_default_global_flag(self):
        """Test default global unified standardization flag is False."""
        assert FeatureFlags.UNIFIED_STANDARDIZATION_ENABLED is False
    
    def test_scrapers_flag_states(self):
        """Test scrapers have correct standardization flag states."""
        # REAN is enabled as the first migrated scraper
        assert FeatureFlags.SCRAPER_FLAGS['rean'] is True
        
        # Rest of Group C still disabled (pending migration)
        assert FeatureFlags.SCRAPER_FLAGS['theunderdog'] is False
        assert FeatureFlags.SCRAPER_FLAGS['tierschutzverein_europa'] is False
        assert FeatureFlags.SCRAPER_FLAGS['animalrescuebosnia'] is False
        assert FeatureFlags.SCRAPER_FLAGS['daisy_family_rescue'] is False
        
        # Group A still disabled
        assert FeatureFlags.SCRAPER_FLAGS['dogstrust'] is False
        assert FeatureFlags.SCRAPER_FLAGS['woof_project'] is False
        assert FeatureFlags.SCRAPER_FLAGS['pets_in_turkey'] is False
        
        # Group B still disabled
        assert FeatureFlags.SCRAPER_FLAGS['furryrescueitaly'] is False
        assert FeatureFlags.SCRAPER_FLAGS['galgosdelsol'] is False
        assert FeatureFlags.SCRAPER_FLAGS['manytearsrescue'] is False
        assert FeatureFlags.SCRAPER_FLAGS['petsinturkey'] is False
        assert FeatureFlags.SCRAPER_FLAGS['santerpaws'] is False
    
    def test_is_unified_standardization_enabled(self):
        """Test global flag check function."""
        assert is_unified_standardization_enabled() is False
        
        # Test with environment override
        with patch.dict(os.environ, {'UNIFIED_STANDARDIZATION_ENABLED': 'true'}):
            reset_flags_cache()
            assert is_unified_standardization_enabled() is True
        
        # Test with false string
        with patch.dict(os.environ, {'UNIFIED_STANDARDIZATION_ENABLED': 'false'}):
            reset_flags_cache()
            assert is_unified_standardization_enabled() is False
    
    def test_is_scraper_standardization_enabled(self):
        """Test per-scraper flag check."""
        # REAN is enabled
        assert is_scraper_standardization_enabled('rean') is True
        # Others still disabled
        assert is_scraper_standardization_enabled('dogstrust') is False
        
        # Test with environment override for specific scraper
        with patch.dict(os.environ, {'SCRAPER_REAN_UNIFIED_ENABLED': 'true'}):
            reset_flags_cache()
            assert is_scraper_standardization_enabled('rean') is True
            assert is_scraper_standardization_enabled('dogstrust') is False
        
        # Test global override affects all scrapers
        with patch.dict(os.environ, {'UNIFIED_STANDARDIZATION_ENABLED': 'true'}):
            reset_flags_cache()
            assert is_scraper_standardization_enabled('rean') is True
            assert is_scraper_standardization_enabled('dogstrust') is True
    
    def test_get_enabled_scrapers(self):
        """Test getting list of enabled scrapers."""
        # REAN is enabled by default now
        assert get_enabled_scrapers() == ['rean']
        
        # Enable specific scrapers
        with patch.dict(os.environ, {
            'SCRAPER_REAN_UNIFIED_ENABLED': 'true',
            'SCRAPER_DOGSTRUST_UNIFIED_ENABLED': 'true',
        }):
            reset_flags_cache()
            enabled = get_enabled_scrapers()
            assert 'rean' in enabled
            assert 'dogstrust' in enabled
            assert 'theunderdog' not in enabled
        
        # Global enable should return all
        with patch.dict(os.environ, {'UNIFIED_STANDARDIZATION_ENABLED': 'true'}):
            reset_flags_cache()
            enabled = get_enabled_scrapers()
            assert len(enabled) == 13  # All scrapers
    
    def test_environment_variable_formats(self):
        """Test various environment variable formats."""
        # Test case insensitive true values
        for value in ['true', 'True', 'TRUE', '1', 'yes', 'YES']:
            with patch.dict(os.environ, {'UNIFIED_STANDARDIZATION_ENABLED': value}):
                reset_flags_cache()
                assert is_unified_standardization_enabled() is True
        
        # Test false values
        for value in ['false', 'False', 'FALSE', '0', 'no', 'NO', '']:
            with patch.dict(os.environ, {'UNIFIED_STANDARDIZATION_ENABLED': value}):
                reset_flags_cache()
                assert is_unified_standardization_enabled() is False
    
    def test_scraper_not_in_flags(self):
        """Test behavior for scraper not in flags dictionary."""
        # Should return False for unknown scrapers
        assert is_scraper_standardization_enabled('unknown_scraper') is False
        
        # Unless global is enabled
        with patch.dict(os.environ, {'UNIFIED_STANDARDIZATION_ENABLED': 'true'}):
            reset_flags_cache()
            assert is_scraper_standardization_enabled('unknown_scraper') is True
    
    def test_cache_functionality(self):
        """Test that flags are cached properly."""
        # Initial state
        assert is_unified_standardization_enabled() is False
        
        # Change environment but don't reset cache
        with patch.dict(os.environ, {'UNIFIED_STANDARDIZATION_ENABLED': 'true'}):
            # Should still be False (cached)
            assert is_unified_standardization_enabled() is False
            
            # After reset, should reflect new value
            reset_flags_cache()
            assert is_unified_standardization_enabled() is True