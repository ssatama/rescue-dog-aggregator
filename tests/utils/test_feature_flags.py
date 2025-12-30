"""Tests for feature flags configuration."""

import os
from unittest.mock import patch


from utils.feature_flags import (
    FeatureFlags,
    get_enabled_scrapers,
    is_scraper_standardization_enabled,
    is_unified_standardization_enabled,
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
        """Test scrapers have correct standardization flag states - ALL enabled now."""
        # ALL scrapers should be enabled
        assert FeatureFlags.SCRAPER_FLAGS["rean"] is True
        assert FeatureFlags.SCRAPER_FLAGS["theunderdog"] is True
        assert FeatureFlags.SCRAPER_FLAGS["tierschutzverein_europa"] is True
        assert FeatureFlags.SCRAPER_FLAGS["animalrescuebosnia"] is True
        assert FeatureFlags.SCRAPER_FLAGS["daisy_family_rescue"] is True
        assert FeatureFlags.SCRAPER_FLAGS["daisyfamilyrescue"] is True  # Alias
        assert FeatureFlags.SCRAPER_FLAGS["misis_rescue"] is True
        assert FeatureFlags.SCRAPER_FLAGS["dogstrust"] is True
        assert FeatureFlags.SCRAPER_FLAGS["woof_project"] is True
        assert FeatureFlags.SCRAPER_FLAGS["pets_in_turkey"] is True
        assert FeatureFlags.SCRAPER_FLAGS["furryrescueitaly"] is True
        assert FeatureFlags.SCRAPER_FLAGS["galgosdelsol"] is True
        assert FeatureFlags.SCRAPER_FLAGS["manytearsrescue"] is True
        assert FeatureFlags.SCRAPER_FLAGS["petsinturkey"] is True  # Now enabled
        assert FeatureFlags.SCRAPER_FLAGS["santerpaws"] is True  # Now enabled
        assert FeatureFlags.SCRAPER_FLAGS["santerpawsbulgarianrescue"] is True

    def test_is_unified_standardization_enabled(self):
        """Test global flag check function."""
        assert is_unified_standardization_enabled() is False

        # Test with environment override
        with patch.dict(os.environ, {"UNIFIED_STANDARDIZATION_ENABLED": "true"}):
            reset_flags_cache()
            assert is_unified_standardization_enabled() is True

        # Test with false string
        with patch.dict(os.environ, {"UNIFIED_STANDARDIZATION_ENABLED": "false"}):
            reset_flags_cache()
            assert is_unified_standardization_enabled() is False

    def test_is_scraper_standardization_enabled(self):
        """Test per-scraper flag check."""
        # REAN is enabled
        assert is_scraper_standardization_enabled("rean") is True
        # DogsTrust is now enabled
        assert is_scraper_standardization_enabled("dogstrust") is True

        # Test with environment override for specific scraper
        with patch.dict(os.environ, {"SCRAPER_SANTERPAWS_UNIFIED_ENABLED": "true"}):
            reset_flags_cache()
            assert (
                is_scraper_standardization_enabled("santerpaws") is True
            )  # Override enables it
            assert (
                is_scraper_standardization_enabled("dogstrust") is True
            )  # Still enabled by default

        # Test global override affects all scrapers
        with patch.dict(os.environ, {"UNIFIED_STANDARDIZATION_ENABLED": "true"}):
            reset_flags_cache()
            assert is_scraper_standardization_enabled("rean") is True
            assert is_scraper_standardization_enabled("dogstrust") is True

    def test_get_enabled_scrapers(self):
        """Test getting list of enabled scrapers."""
        # ALL scrapers are enabled by default now
        expected_enabled = [
            "rean",
            "theunderdog",
            "tierschutzverein_europa",
            "animalrescuebosnia",
            "daisy_family_rescue",
            "daisyfamilyrescue",
            "misis_rescue",
            "dogstrust",
            "woof_project",
            "pets_in_turkey",
            "furryrescueitaly",
            "galgosdelsol",
            "manytearsrescue",
            "petsinturkey",
            "santerpaws",
            "santerpawsbulgarianrescue",
        ]
        actual_enabled = get_enabled_scrapers()
        assert set(actual_enabled) == set(expected_enabled)

        # Disable specific scraper via override (since all are enabled by default)
        with patch.dict(
            os.environ,
            {
                "SCRAPER_SANTERPAWS_UNIFIED_ENABLED": "false",  # Override to disable
            },
        ):
            reset_flags_cache()
            enabled = get_enabled_scrapers()
            assert "santerpaws" not in enabled  # Disabled via override
            assert "rean" in enabled  # Still enabled by default
            assert "dogstrust" in enabled  # Still enabled by default

        # Global enable should return all
        with patch.dict(os.environ, {"UNIFIED_STANDARDIZATION_ENABLED": "true"}):
            reset_flags_cache()
            enabled = get_enabled_scrapers()
            assert len(enabled) == 16  # All scrapers including aliases and misis_rescue

    def test_environment_variable_formats(self):
        """Test various environment variable formats."""
        # Test case insensitive true values
        for value in ["true", "True", "TRUE", "1", "yes", "YES"]:
            with patch.dict(os.environ, {"UNIFIED_STANDARDIZATION_ENABLED": value}):
                reset_flags_cache()
                assert is_unified_standardization_enabled() is True

        # Test false values
        for value in ["false", "False", "FALSE", "0", "no", "NO", ""]:
            with patch.dict(os.environ, {"UNIFIED_STANDARDIZATION_ENABLED": value}):
                reset_flags_cache()
                assert is_unified_standardization_enabled() is False

    def test_scraper_not_in_flags(self):
        """Test behavior for scraper not in flags dictionary."""
        # Should return False for unknown scrapers
        assert is_scraper_standardization_enabled("unknown_scraper") is False

        # Unless global is enabled
        with patch.dict(os.environ, {"UNIFIED_STANDARDIZATION_ENABLED": "true"}):
            reset_flags_cache()
            assert is_scraper_standardization_enabled("unknown_scraper") is True

    def test_cache_functionality(self):
        """Test that flags are cached properly."""
        # Initial state
        assert is_unified_standardization_enabled() is False

        # Change environment but don't reset cache
        with patch.dict(os.environ, {"UNIFIED_STANDARDIZATION_ENABLED": "true"}):
            # Should still be False (cached)
            assert is_unified_standardization_enabled() is False

            # After reset, should reflect new value
            reset_flags_cache()
            assert is_unified_standardization_enabled() is True
