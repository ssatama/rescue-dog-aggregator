# tests/railway/test_sync_refactored.py

from unittest.mock import Mock, patch

import pytest

from services.railway.sync import RailwayDataSyncer


@pytest.mark.unit
class TestRailwaySyncRefactored:
    """Test Railway sync service after removing animal_images functionality."""

    def test_railway_sync_no_animal_images_functions(self):
        """Test that animal_images sync functions have been removed."""
        from services.railway import sync

        # These functions should not exist anymore
        assert not hasattr(sync, "_sync_animal_images_independently")
        assert not hasattr(sync, "_sync_animal_images_with_mapping")
        assert not hasattr(sync, "_sync_animal_images_to_railway_in_transaction")

    def test_safety_thresholds_no_animal_images(self):
        """Test that SAFETY_THRESHOLDS no longer includes animal_images."""
        from services.railway.sync import SAFETY_THRESHOLDS

        # Should not have animal_images threshold
        assert "animal_images" not in SAFETY_THRESHOLDS

        # Should still have other tables
        assert "organizations" in SAFETY_THRESHOLDS
        assert "animals" in SAFETY_THRESHOLDS
        assert "scrape_logs" in SAFETY_THRESHOLDS
        assert "service_regions" in SAFETY_THRESHOLDS

    def test_valid_tables_no_animal_images(self):
        """Test that valid_tables lists no longer include animal_images."""
        import inspect

        from services.railway import sync

        # Get source code to check for animal_images in valid_tables lists
        source = inspect.getsource(sync)

        # Count occurrences of animal_images (should only be in comments or strings, not lists)
        lines = source.split("\n")
        valid_tables_lines = [line for line in lines if "valid_tables = [" in line]

        for line in valid_tables_lines:
            assert "animal_images" not in line, f"animal_images found in valid_tables: {line}"

        # Should still contain other tables in valid_tables
        assert any("organizations" in line for line in valid_tables_lines)
        assert any("animals" in line for line in valid_tables_lines)

    def test_railway_syncer_perform_full_sync_no_animal_images_calls(self):
        """Test that perform_full_sync no longer calls animal_images sync functions."""
        import inspect

        from services.railway import sync

        # Get source code of perform_full_sync method
        source = inspect.getsource(sync.RailwayDataSyncer.perform_full_sync)

        # Should not call any animal_images sync functions
        assert "_sync_animal_images" not in source, "perform_full_sync should not call animal_images sync functions"
        assert "animal_images" not in source, "perform_full_sync should not reference animal_images"
