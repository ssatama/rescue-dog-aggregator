"""
Tests for adoption checking integration in scrapers.
"""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from scrapers.base_scraper import BaseScraper
from services.adoption_detection import AdoptionCheckResult
from utils.config_models import OrganizationConfig, ScraperConfig, ScraperInfo


class TestAdoptionIntegration:
    """Test adoption checking integration in scrapers."""

    @pytest.fixture
    def mock_config_with_adoption(self):
        """Create a mock config with adoption checking enabled."""
        return OrganizationConfig(
            schema_version="1.0",
            id="test-org",
            name="Test Organization",
            enabled=True,
            scraper=ScraperInfo(
                class_name="TestScraper",
                module="test.test_scraper",
                config=ScraperConfig(
                    check_adoption_status=True,
                    adoption_check_threshold=3,
                    adoption_check_config={
                        "max_checks_per_run": 50,
                        "check_interval_hours": 24,
                    },
                ),
            ),
        )

    @pytest.fixture
    def mock_config_without_adoption(self):
        """Create a mock config without adoption checking."""
        return OrganizationConfig(
            schema_version="1.0",
            id="test-org",
            name="Test Organization",
            enabled=True,
            scraper=ScraperInfo(
                class_name="TestScraper",
                module="test.test_scraper",
                config=ScraperConfig(
                    check_adoption_status=False,
                ),
            ),
        )

    @pytest.fixture
    def mock_scraper_with_adoption(self, mock_config_with_adoption):
        """Create a mock scraper with adoption checking enabled."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return []

        # Create scraper with organization_id to avoid config loading
        scraper = TestScraper(organization_id=1)
        # Manually set the config
        scraper.org_config = mock_config_with_adoption
        scraper.conn = MagicMock()
        scraper.logger = MagicMock()
        scraper.metrics_collector = MagicMock()
        return scraper

    @pytest.fixture
    def mock_scraper_without_adoption(self, mock_config_without_adoption):
        """Create a mock scraper without adoption checking."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return []

        # Create scraper with organization_id to avoid config loading
        scraper = TestScraper(organization_id=1)
        # Manually set the config
        scraper.org_config = mock_config_without_adoption
        scraper.conn = MagicMock()
        scraper.logger = MagicMock()
        scraper.metrics_collector = MagicMock()
        return scraper

    def test_adoption_check_config_enabled(self, mock_config_with_adoption):
        """Test getting adoption check config when enabled."""
        config = mock_config_with_adoption.get_adoption_check_config()

        assert config is not None
        assert config["enabled"] is True
        assert config["threshold"] == 3
        assert config["max_checks_per_run"] == 50
        assert config["check_interval_hours"] == 24

    def test_adoption_check_config_disabled(self, mock_config_without_adoption):
        """Test getting adoption check config when disabled."""
        config = mock_config_without_adoption.get_adoption_check_config()
        assert config is None

    @patch("services.adoption_detection.AdoptionDetectionService")
    def test_check_adoptions_if_enabled_runs(
        self, mock_service_class, mock_scraper_with_adoption
    ):
        """Test that adoption checking runs when enabled."""
        # Setup mock service
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service

        # Create mock results
        mock_results = [
            AdoptionCheckResult(
                animal_id=1,
                animal_name="Buddy",
                previous_status="unknown",
                detected_status="adopted",
                evidence="Page shows REHOMED",
                confidence=0.95,
                checked_at=datetime.now(),
                raw_response={"content": "test"},
                error=None,
            ),
            AdoptionCheckResult(
                animal_id=2,
                animal_name="Max",
                previous_status="unknown",
                detected_status="reserved",
                evidence="Page shows RESERVED",
                confidence=0.90,
                checked_at=datetime.now(),
                raw_response={"content": "test"},
                error=None,
            ),
        ]
        mock_service.batch_check_adoptions.return_value = mock_results

        # Run adoption checking
        mock_scraper_with_adoption._check_adoptions_if_enabled()

        # Verify service was called
        mock_service_class.assert_called_once()
        mock_service.batch_check_adoptions.assert_called_once_with(
            mock_scraper_with_adoption.conn, 1, threshold=3, limit=50, dry_run=False
        )  # organization_id

        # Verify logging
        mock_scraper_with_adoption.logger.info.assert_any_call(
            "🔍 Checking for adoptions (threshold: 3 missed scrapes)"
        )
        mock_scraper_with_adoption.logger.info.assert_any_call(
            "✅ Adoption check complete: 2 dogs checked, 1 adopted, 1 reserved"
        )

        # Verify metrics tracking
        mock_scraper_with_adoption.metrics_collector.track_custom_metric.assert_any_call(
            "adoptions_checked", 2
        )
        mock_scraper_with_adoption.metrics_collector.track_custom_metric.assert_any_call(
            "adoptions_detected", 1
        )
        mock_scraper_with_adoption.metrics_collector.track_custom_metric.assert_any_call(
            "reservations_detected", 1
        )

    @patch("services.adoption_detection.AdoptionDetectionService")
    def test_check_adoptions_if_enabled_skips_when_disabled(
        self, mock_service_class, mock_scraper_without_adoption
    ):
        """Test that adoption checking is skipped when disabled."""
        # Run adoption checking
        mock_scraper_without_adoption._check_adoptions_if_enabled()

        # Verify service was NOT called
        mock_service_class.assert_not_called()

        # Verify no logging about adoptions
        mock_scraper_without_adoption.logger.info.assert_not_called()

    @patch("services.adoption_detection.AdoptionDetectionService")
    def test_check_adoptions_handles_no_eligible_dogs(
        self, mock_service_class, mock_scraper_with_adoption
    ):
        """Test handling when no dogs are eligible for adoption checking."""
        # Setup mock service
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.batch_check_adoptions.return_value = []

        # Run adoption checking
        mock_scraper_with_adoption._check_adoptions_if_enabled()

        # Verify logging
        mock_scraper_with_adoption.logger.info.assert_any_call(
            "No dogs eligible for adoption checking"
        )

    def test_check_adoptions_handles_import_error(self, mock_scraper_with_adoption):
        """Test handling when AdoptionDetectionService is not available."""
        # Patch the import to raise ImportError
        with patch("builtins.__import__", side_effect=ImportError("Module not found")):
            # Run adoption checking - should not raise
            mock_scraper_with_adoption._check_adoptions_if_enabled()

            # Verify warning was logged
            mock_scraper_with_adoption.logger.warning.assert_called_once()
            assert "AdoptionDetectionService not available" in str(
                mock_scraper_with_adoption.logger.warning.call_args
            )

    @patch("services.adoption_detection.AdoptionDetectionService")
    def test_check_adoptions_handles_service_error(
        self, mock_service_class, mock_scraper_with_adoption
    ):
        """Test handling when adoption service raises an error."""
        # Setup mock service to raise error
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.batch_check_adoptions.side_effect = Exception("API error")

        # Run adoption checking - should not raise
        mock_scraper_with_adoption._check_adoptions_if_enabled()

        # Verify error was logged
        mock_scraper_with_adoption.logger.error.assert_called_once()
        assert "Error during adoption checking" in str(
            mock_scraper_with_adoption.logger.error.call_args
        )

    def test_check_adoptions_without_config(self):
        """Test adoption checking when org_config is not set."""

        class TestScraper(BaseScraper):
            def collect_data(self):
                return []

        scraper = TestScraper(organization_id=1)
        scraper.org_config = None
        scraper.logger = MagicMock()

        # Should return early without errors
        scraper._check_adoptions_if_enabled()

        # Verify no logging occurred
        scraper.logger.info.assert_not_called()

    @patch("services.adoption_detection.AdoptionDetectionService")
    def test_finalize_scrape_calls_adoption_check(
        self, mock_service_class, mock_scraper_with_adoption
    ):
        """Test that _finalize_scrape calls adoption checking."""
        # Setup mocks
        mock_scraper_with_adoption.detect_partial_failure = MagicMock(
            return_value=False
        )
        mock_scraper_with_adoption.mark_skipped_animals_as_seen = MagicMock()
        mock_scraper_with_adoption.update_stale_data_detection = MagicMock()
        mock_scraper_with_adoption.complete_scrape_log = MagicMock()
        mock_scraper_with_adoption.skip_existing_animals = False

        # Setup mock adoption service
        mock_service = MagicMock()
        mock_service_class.return_value = mock_service
        mock_service.batch_check_adoptions.return_value = []

        # Run finalize scrape
        processing_stats = {}
        mock_scraper_with_adoption._finalize_scrape([], processing_stats)

        # Verify adoption checking was called
        mock_service_class.assert_called_once()
        mock_service.batch_check_adoptions.assert_called_once()
