"""Feature flags configuration for unified breed standardization rollout."""

import os
from functools import lru_cache
from typing import Dict, List


class FeatureFlags:
    """Central feature flags configuration.

    Controls the rollout of unified breed standardization across scrapers.
    Can be overridden via environment variables.
    """

    # Global flag to enable/disable unified standardization
    UNIFIED_STANDARDIZATION_ENABLED = False

    # Per-scraper flags for granular control
    # Start with all scrapers disabled, enable progressively
    SCRAPER_FLAGS: Dict[str, bool] = {
        # Group C: Non-standardized scrapers (migrate first)
        "rean": True,  # Enabled - REAN has no custom standardization, ready to use unified
        "theunderdog": True,  # Enabled - TheUnderdog migrated to unified standardization
        "tierschutzverein_europa": True,  # German-to-English translation then standardization
        "animalrescuebosnia": True,  # Enabled - Size standardization migrated to unified
        "daisy_family_rescue": True,  # Enabled - Age parsing migrated to unified standardization
        "daisyfamilyrescue": True,  # Alias for daisy_family_rescue
        # Group A: Currently using optimized_standardization.py
        "dogstrust": True,  # Enabled - Migrated from optimized_standardization to unified
        "woof_project": True,  # Enabled - Migrated from optimized_standardization to unified
        "pets_in_turkey": True,  # Enabled - Migrated from optimized_standardization to unified
        # Group B: Currently using standardization.py
        "furryrescueitaly": True,  # Enabled - Migrated from standardization.py to unified
        "galgosdelsol": True,  # Enabled - Migrated from standardization.py to unified
        "manytearsrescue": False,
        "petsinturkey": False,  # Note: different from pets_in_turkey
        "santerpaws": False,
    }


def _parse_bool_env(value: str) -> bool:
    """Parse boolean from environment variable string.

    Args:
        value: String value from environment variable

    Returns:
        Boolean interpretation of the value
    """
    return value.lower() in ("true", "1", "yes", "y", "on")


@lru_cache(maxsize=1)
def is_unified_standardization_enabled() -> bool:
    """Check if unified standardization is globally enabled.

    Can be overridden by UNIFIED_STANDARDIZATION_ENABLED environment variable.

    Returns:
        True if unified standardization is enabled globally
    """
    env_value = os.environ.get("UNIFIED_STANDARDIZATION_ENABLED", "").strip()
    if env_value:
        return _parse_bool_env(env_value)
    return FeatureFlags.UNIFIED_STANDARDIZATION_ENABLED


@lru_cache(maxsize=32)
def is_scraper_standardization_enabled(scraper_name: str) -> bool:
    """Check if unified standardization is enabled for a specific scraper.

    Checks in order:
    1. Global override (UNIFIED_STANDARDIZATION_ENABLED)
    2. Per-scraper environment variable (SCRAPER_{NAME}_UNIFIED_ENABLED)
    3. Per-scraper flag in FeatureFlags.SCRAPER_FLAGS

    Args:
        scraper_name: Name of the scraper (e.g., 'rean', 'dogstrust')

    Returns:
        True if standardization is enabled for this scraper
    """
    # Check global override first
    if is_unified_standardization_enabled():
        return True

    # Check scraper-specific environment variable
    env_key = f"SCRAPER_{scraper_name.upper()}_UNIFIED_ENABLED"
    env_value = os.environ.get(env_key, "").strip()
    if env_value:
        return _parse_bool_env(env_value)

    # Fall back to configuration
    return FeatureFlags.SCRAPER_FLAGS.get(scraper_name, False)


def is_feature_enabled(feature_name: str, scraper_name: str) -> bool:
    """Check if a feature is enabled for a specific scraper.
    
    This is an alias for backward compatibility with tests.
    
    Args:
        feature_name: Name of the feature (e.g., 'unified_breed_standardization')
        scraper_name: Name of the scraper
        
    Returns:
        True if the feature is enabled for this scraper
    """
    if feature_name == "unified_breed_standardization":
        return is_scraper_standardization_enabled(scraper_name)
    return False


def get_enabled_scrapers() -> List[str]:
    """Get list of scrapers with unified standardization enabled.

    Returns:
        List of scraper names that have standardization enabled
    """
    # If global is enabled, return all scrapers
    if is_unified_standardization_enabled():
        return list(FeatureFlags.SCRAPER_FLAGS.keys())

    # Check each scraper individually
    enabled = []
    for scraper_name in FeatureFlags.SCRAPER_FLAGS.keys():
        if is_scraper_standardization_enabled(scraper_name):
            enabled.append(scraper_name)

    return enabled


def reset_flags_cache() -> None:
    """Reset the cached flag values.

    Useful for testing or when environment variables change.
    """
    is_unified_standardization_enabled.cache_clear()
    is_scraper_standardization_enabled.cache_clear()


# Usage documentation
"""
Feature Flags Usage Guide
========================

1. Default State:
   All flags are disabled by default for safe rollout.

2. Environment Variables:
   - Global: UNIFIED_STANDARDIZATION_ENABLED=true
   - Per-scraper: SCRAPER_REAN_UNIFIED_ENABLED=true

3. Rollout Strategy:
   Phase 1: Enable for Group C scrapers (no existing standardization)
   Phase 2: Enable for Group A scrapers (using optimized_standardization)  
   Phase 3: Enable for Group B scrapers (using standardization)
   Phase 4: Enable globally

4. In Scrapers:
   from utils.feature_flags import is_scraper_standardization_enabled
   
   if is_scraper_standardization_enabled('rean'):
       # Use unified standardization via base_scraper
   else:
       # Use existing approach

5. Testing:
   Set environment variables for testing:
   export SCRAPER_REAN_UNIFIED_ENABLED=true
   python -m scrapers.rean.dogs_scraper

6. Production Rollout:
   Set environment variables in production configuration
   or modify FeatureFlags.SCRAPER_FLAGS in this file.
"""
