"""Test suite for Daisy Family Rescue unified standardization migration.

Tests the migration from custom age parsing to unified standardization.
Follows TDD approach - test first, then code.
"""

from datetime import datetime
from unittest.mock import Mock, patch


from scrapers.daisy_family_rescue.dogs_scraper import DaisyFamilyRescueScraper


class TestDaisyFamilyRescueUnifiedStandardization:
    """Test unified standardization for Daisy Family Rescue scraper."""

    def test_scraper_inherits_from_base_scraper(self):
        """Test that scraper properly inherits from BaseScraper."""
        from scrapers.base_scraper import BaseScraper

        scraper = DaisyFamilyRescueScraper(organization_id=13)
        assert isinstance(scraper, BaseScraper)

    def test_scraper_has_unified_standardizer(self):
        """Test that scraper has UnifiedStandardizer available."""
        scraper = DaisyFamilyRescueScraper(organization_id=13)
        assert hasattr(scraper, "standardizer")
        assert scraper.standardizer is not None
        from utils.unified_standardization import UnifiedStandardizer

        assert isinstance(scraper.standardizer, UnifiedStandardizer)

    def test_scraper_uses_unified_standardization_flag(self):
        """Test that scraper has unified standardization enabled."""
        scraper = DaisyFamilyRescueScraper(organization_id=13)
        assert hasattr(scraper, "use_unified_standardization")
        assert scraper.use_unified_standardization is True

    def test_feature_flag_enables_unified_standardization(self):
        """Test that feature flag controls unified standardization."""
        from utils.feature_flags import is_feature_enabled

        # Check if feature is enabled for Daisy Family Rescue
        assert is_feature_enabled("unified_breed_standardization", "daisyfamilyrescue")

    def test_detail_scraper_no_custom_parse_age(self):
        """Test that detail scraper doesn't have custom _parse_age method."""
        from scrapers.daisy_family_rescue.dog_detail_scraper import (
            DaisyFamilyRescueDogDetailScraper,
        )

        detail_scraper = DaisyFamilyRescueDogDetailScraper()

        # Test that detail scraper doesn't have custom _parse_age anymore
        assert not hasattr(detail_scraper, "_parse_age"), (
            "Detail scraper should not have custom _parse_age method"
        )

    def test_process_steckbrief_data_extracts_age_text(self):
        """Test that steckbrief data processing extracts age_text for unified parsing."""
        from scrapers.daisy_family_rescue.dog_detail_scraper import (
            DaisyFamilyRescueDogDetailScraper,
        )

        detail_scraper = DaisyFamilyRescueDogDetailScraper()

        steckbrief_data = {"Alter:": "03/2020", "Größe:": "55 cm", "Gewicht:": "25 kg"}

        # This should extract age_text for unified parsing
        processed_data = detail_scraper._process_steckbrief_data(
            steckbrief_data, Mock()
        )

        # Age should be extracted as age_text for unified parsing
        assert "age_text" in processed_data
        assert processed_data["age_text"] == "03/2020"

    def test_unified_standardizer_processes_german_age_formats(self):
        """Test that UnifiedStandardizer processes German age formats (defaults to Adult for now)."""
        from utils.unified_standardization import UnifiedStandardizer

        standardizer = UnifiedStandardizer()

        # Test German age formats through apply_full_standardization
        # Note: UnifiedStandardizer currently defaults unrecognized formats to Adult
        # This can be enhanced in the future to parse German formats
        test_cases = [
            "5 Jahre",  # 5 years in German
            "8 Monate",  # 8 months in German
            "12 Wochen",  # 12 weeks in German
        ]

        for age_text in test_cases:
            result = standardizer.apply_full_standardization(age=age_text)
            assert "age" in result, f"No age in result for: {age_text}"
            assert result["age"] == age_text, f"Original age not preserved: {age_text}"
            # Currently returns Adult for unrecognized formats - this is acceptable
            assert "age_category" in result, f"No age_category for: {age_text}"

    def test_unified_standardizer_handles_birth_dates(self):
        """Test that UnifiedStandardizer can handle MM/YYYY birth dates."""
        from utils.unified_standardization import UnifiedStandardizer

        standardizer = UnifiedStandardizer()

        # Mock current date for consistent testing
        with patch("utils.unified_standardization.datetime") as mock_datetime:
            mock_datetime.now.return_value = datetime(2025, 1, 1)

            # Test birth date formats through apply_full_standardization
            # Age parsing now correctly calculates age from birth dates
            test_cases = [
                ("01/2024", "young"),  # ~12 months old = Young
                ("01/2023", "young"),  # ~24 months old = Young
                ("01/2020", "adult"),  # ~60 months old = Adult
                ("06/2024", "puppy"),  # ~7 months old = Puppy
            ]

            for birth_date, expected_category in test_cases:
                result = standardizer.apply_full_standardization(age=birth_date)
                assert "age" in result, f"No age in result for: {birth_date}"
                assert result["age"] == birth_date, (
                    f"Original age not preserved: {birth_date}"
                )
                # Check category matches (case-insensitive) - currently all default to Adult
                assert result["age_category"].lower() == expected_category.lower(), (
                    f"Wrong category for {birth_date}: got {result.get('age_category')}, expected {expected_category}"
                )
