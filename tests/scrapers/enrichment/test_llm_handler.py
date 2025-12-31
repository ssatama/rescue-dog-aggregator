"""Tests for LLMEnrichmentHandler."""

from unittest.mock import AsyncMock, Mock, patch

import pytest

from scrapers.enrichment.llm_handler import LLMEnrichmentHandler


@pytest.mark.unit
@pytest.mark.fast
class TestLLMEnrichmentHandlerConfig:
    """Test configuration checking."""

    def test_enrichment_disabled_when_no_org_config(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
            org_config=None,
        )
        assert handler.is_enrichment_enabled() is False

    def test_enrichment_disabled_when_not_enabled_in_config(self):
        mock_config = Mock()
        mock_config.get_scraper_config_dict.return_value = {"enable_llm_profiling": False}

        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
            org_config=mock_config,
        )
        assert handler.is_enrichment_enabled() is False

    def test_enrichment_enabled_when_enabled_in_config(self):
        mock_config = Mock()
        mock_config.get_scraper_config_dict.return_value = {"enable_llm_profiling": True}

        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
            org_config=mock_config,
        )
        assert handler.is_enrichment_enabled() is True

    def test_get_llm_org_id_returns_default_when_no_config(self):
        handler = LLMEnrichmentHandler(
            organization_id=42,
            organization_name="Test Org",
            org_config=None,
        )
        assert handler.get_llm_organization_id() == 42

    def test_get_llm_org_id_returns_custom_when_configured(self):
        mock_config = Mock()
        mock_config.get_scraper_config_dict.return_value = {"llm_organization_id": 99}

        handler = LLMEnrichmentHandler(
            organization_id=42,
            organization_name="Test Org",
            org_config=mock_config,
        )
        assert handler.get_llm_organization_id() == 99


@pytest.mark.unit
@pytest.mark.fast
class TestLLMEnrichmentHandlerEnrichment:
    """Test enrichment processing."""

    def test_enrich_animals_returns_true_when_disabled(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
            org_config=None,
        )

        animals = [{"id": 1, "data": {"name": "Buddy"}, "action": "create"}]
        result = handler.enrich_animals(animals)

        assert result is True

    def test_enrich_animals_returns_true_when_empty_list(self):
        mock_config = Mock()
        mock_config.get_scraper_config_dict.return_value = {"enable_llm_profiling": True}

        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
            org_config=mock_config,
        )

        result = handler.enrich_animals([])
        assert result is True

    def test_enrich_animals_handles_import_error(self):
        mock_config = Mock()
        mock_config.get_scraper_config_dict.return_value = {"enable_llm_profiling": True}

        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
            org_config=mock_config,
        )

        animals = [{"id": 1, "data": {"name": "Buddy"}, "action": "create"}]

        with patch.object(
            handler,
            "_process_enrichment_batch",
            side_effect=ImportError("LLM modules not available"),
        ):
            result = handler.enrich_animals(animals)
            assert result is False

    def test_enrich_animals_calls_alert_on_exception(self):
        mock_config = Mock()
        mock_config.get_scraper_config_dict.return_value = {"enable_llm_profiling": True}
        mock_alert = Mock()

        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
            org_config=mock_config,
            alert_callback=mock_alert,
        )

        animals = [{"id": 1, "data": {"name": "Buddy"}, "action": "create"}]

        with patch.object(
            handler, "_process_enrichment_batch", side_effect=Exception("Pipeline error")
        ):
            result = handler.enrich_animals(animals)

            assert result is False
            mock_alert.assert_called_once()
            call_args = mock_alert.call_args
            assert call_args.kwargs["org_name"] == "Test Org"
            assert call_args.kwargs["batch_size"] == 1
            assert call_args.kwargs["failed_count"] == 1
            assert "Pipeline error" in call_args.kwargs["error_message"]


@pytest.mark.unit
@pytest.mark.fast
class TestLLMEnrichmentHandlerDataPreparation:
    """Test data preparation for profiling."""

    def test_prepare_dogs_for_profiling_extracts_required_fields(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
        )

        animals = [
            {
                "id": 123,
                "data": {
                    "name": "Buddy",
                    "breed": "Labrador",
                    "age_text": "2 years",
                    "properties": {"color": "yellow"},
                },
                "action": "create",
            }
        ]

        result = handler._prepare_dogs_for_profiling(animals)

        assert len(result) == 1
        assert result[0]["id"] == 123
        assert result[0]["name"] == "Buddy"
        assert result[0]["breed"] == "Labrador"
        assert result[0]["age_text"] == "2 years"
        assert result[0]["properties"]["color"] == "yellow"

    def test_prepare_dogs_for_profiling_uses_defaults(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
        )

        animals = [{"id": 456, "data": {}, "action": "create"}]

        result = handler._prepare_dogs_for_profiling(animals)

        assert len(result) == 1
        assert result[0]["id"] == 456
        assert result[0]["name"] == "Unknown"
        assert result[0]["breed"] == "Mixed Breed"
        assert result[0]["age_text"] == "Unknown"

    def test_prepare_dogs_adds_description_from_data(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
        )

        animals = [
            {
                "id": 789,
                "data": {"name": "Max", "description": "A friendly dog"},
                "action": "create",
            }
        ]

        result = handler._prepare_dogs_for_profiling(animals)

        assert result[0]["properties"]["description"] == "A friendly dog"

    def test_prepare_dogs_adds_description_from_properties(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
        )

        animals = [
            {
                "id": 101,
                "data": {
                    "name": "Luna",
                    "properties": {"description": "Loves to play fetch"},
                },
                "action": "create",
            }
        ]

        result = handler._prepare_dogs_for_profiling(animals)

        assert result[0]["properties"]["description"] == "Loves to play fetch"


@pytest.mark.unit
@pytest.mark.fast
class TestLLMEnrichmentHandlerSignificantUpdate:
    """Test significant update detection."""

    def test_is_significant_update_always_returns_true(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
        )

        assert handler.is_significant_update(None) is True
        assert handler.is_significant_update(("id", "name", "updated_at")) is True


@pytest.mark.unit
@pytest.mark.fast
class TestLLMEnrichmentHandlerStatistics:
    """Test statistics collection."""

    def test_get_last_statistics_returns_none_initially(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
        )

        assert handler.get_last_statistics() is None

    def test_collect_and_log_statistics_stores_stats(self):
        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
        )

        mock_pipeline = Mock()
        mock_pipeline.get_statistics.return_value = {
            "success_rate": 95.0,
            "total_processed": 10,
            "total_failed": 0,
        }

        handler._collect_and_log_statistics(mock_pipeline, 10)

        stats = handler.get_last_statistics()
        assert stats["success_rate"] == 95.0
        assert stats["total_processed"] == 10

    def test_collect_and_log_statistics_alerts_on_failures(self):
        mock_alert = Mock()

        handler = LLMEnrichmentHandler(
            organization_id=1,
            organization_name="Test Org",
            alert_callback=mock_alert,
        )

        mock_pipeline = Mock()
        mock_pipeline.get_statistics.return_value = {
            "success_rate": 80.0,
            "total_processed": 8,
            "total_failed": 2,
        }

        handler._collect_and_log_statistics(mock_pipeline, 10)

        mock_alert.assert_called_once()
        call_args = mock_alert.call_args
        assert call_args.kwargs["failed_count"] == 2
