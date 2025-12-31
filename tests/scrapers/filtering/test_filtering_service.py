"""Tests for FilteringService."""

from unittest.mock import Mock

import pytest

from scrapers.filtering.filtering_service import FilteringService


@pytest.mark.unit
@pytest.mark.fast
class TestFilteringServiceUrlFiltering:
    """Test URL filtering logic."""

    @pytest.fixture
    def mock_database_service(self):
        service = Mock()
        service.get_existing_animal_urls.return_value = set()
        return service

    @pytest.fixture
    def mock_session_manager(self):
        return Mock()

    def test_filter_existing_urls_returns_all_when_skip_disabled(self, mock_database_service):
        service = FilteringService(
            database_service=mock_database_service,
            organization_id=1,
            skip_existing_animals=False,
        )

        all_urls = ["url1", "url2", "url3"]
        result = service.filter_existing_urls(all_urls)

        assert result == all_urls
        mock_database_service.get_existing_animal_urls.assert_not_called()

    def test_filter_existing_urls_filters_when_skip_enabled(self, mock_database_service):
        mock_database_service.get_existing_animal_urls.return_value = {"url1", "url3"}

        service = FilteringService(
            database_service=mock_database_service,
            organization_id=1,
            skip_existing_animals=True,
        )

        all_urls = ["url1", "url2", "url3"]
        result = service.filter_existing_urls(all_urls)

        assert result == ["url2"]

    def test_filter_existing_urls_returns_all_when_no_existing(self, mock_database_service):
        mock_database_service.get_existing_animal_urls.return_value = set()

        service = FilteringService(
            database_service=mock_database_service,
            organization_id=1,
            skip_existing_animals=True,
        )

        all_urls = ["url1", "url2"]
        result = service.filter_existing_urls(all_urls)

        assert result == all_urls


@pytest.mark.unit
@pytest.mark.fast
class TestFilteringServiceAnimalFiltering:
    """Test animal filtering logic."""

    @pytest.fixture
    def mock_database_service(self):
        service = Mock()
        service.get_existing_animal_urls.return_value = set()
        return service

    @pytest.fixture
    def mock_session_manager(self):
        return Mock()

    def test_filter_existing_animals_records_all_external_ids(
        self, mock_database_service, mock_session_manager
    ):
        service = FilteringService(
            database_service=mock_database_service,
            session_manager=mock_session_manager,
            organization_id=1,
            skip_existing_animals=False,
        )

        animals = [
            {"external_id": "id1", "adoption_url": "url1"},
            {"external_id": "id2", "adoption_url": "url2"},
            {"external_id": "id3", "adoption_url": "url3"},
        ]

        service.filter_existing_animals(animals)

        assert mock_session_manager.record_found_animal.call_count == 3
        mock_session_manager.record_found_animal.assert_any_call("id1")
        mock_session_manager.record_found_animal.assert_any_call("id2")
        mock_session_manager.record_found_animal.assert_any_call("id3")

    def test_filter_existing_animals_returns_all_when_skip_disabled(
        self, mock_database_service, mock_session_manager
    ):
        service = FilteringService(
            database_service=mock_database_service,
            session_manager=mock_session_manager,
            organization_id=1,
            skip_existing_animals=False,
        )

        animals = [
            {"external_id": "id1", "adoption_url": "url1"},
            {"external_id": "id2", "adoption_url": "url2"},
        ]

        result = service.filter_existing_animals(animals)

        assert result == animals

    def test_filter_existing_animals_filters_when_skip_enabled(
        self, mock_database_service, mock_session_manager
    ):
        mock_database_service.get_existing_animal_urls.return_value = {"url1"}

        service = FilteringService(
            database_service=mock_database_service,
            session_manager=mock_session_manager,
            organization_id=1,
            skip_existing_animals=True,
        )

        animals = [
            {"external_id": "id1", "adoption_url": "url1"},
            {"external_id": "id2", "adoption_url": "url2"},
        ]

        result = service.filter_existing_animals(animals)

        assert len(result) == 1
        assert result[0]["external_id"] == "id2"

    def test_filter_existing_animals_handles_empty_list(
        self, mock_database_service, mock_session_manager
    ):
        service = FilteringService(
            database_service=mock_database_service,
            session_manager=mock_session_manager,
            organization_id=1,
            skip_existing_animals=True,
        )

        result = service.filter_existing_animals([])

        assert result == []


@pytest.mark.unit
@pytest.mark.fast
class TestFilteringServiceStats:
    """Test filtering statistics tracking."""

    def test_filtering_stats_updated_after_filtering(self):
        mock_db = Mock()
        mock_db.get_existing_animal_urls.return_value = {"url1", "url2"}

        service = FilteringService(
            database_service=mock_db,
            organization_id=1,
            skip_existing_animals=True,
        )

        animals = [
            {"external_id": "id1", "adoption_url": "url1"},
            {"external_id": "id2", "adoption_url": "url2"},
            {"external_id": "id3", "adoption_url": "url3"},
        ]

        service.filter_existing_animals(animals)

        assert service.total_animals_before_filter == 3
        assert service.total_animals_skipped == 2

    def test_get_correct_animals_found_count_returns_before_filter_when_skip_enabled(self):
        mock_db = Mock()
        mock_db.get_existing_animal_urls.return_value = {"url1", "url2"}

        service = FilteringService(
            database_service=mock_db,
            organization_id=1,
            skip_existing_animals=True,
        )

        animals = [
            {"external_id": "id1", "adoption_url": "url1"},
            {"external_id": "id2", "adoption_url": "url2"},
            {"external_id": "id3", "adoption_url": "url3"},
        ]

        filtered = service.filter_existing_animals(animals)

        count = service.get_correct_animals_found_count(filtered)
        assert count == 3

    def test_get_correct_animals_found_count_returns_list_length_when_skip_disabled(self):
        service = FilteringService(
            organization_id=1,
            skip_existing_animals=False,
        )

        animals = [{"external_id": "id1"}, {"external_id": "id2"}]
        count = service.get_correct_animals_found_count(animals)

        assert count == 2


@pytest.mark.unit
@pytest.mark.fast
class TestFilteringServiceExternalIdRecording:
    """Test external ID recording for stale detection."""

    def test_record_all_found_external_ids(self):
        mock_session = Mock()

        service = FilteringService(
            session_manager=mock_session,
            organization_id=1,
        )

        animals = [
            {"external_id": "id1"},
            {"external_id": "id2"},
            {"name": "no_id"},
        ]

        recorded = service.record_all_found_external_ids(animals)

        assert recorded == 2
        assert mock_session.record_found_animal.call_count == 2

    def test_record_all_found_external_ids_without_session_manager(self):
        service = FilteringService(organization_id=1)

        animals = [{"external_id": "id1"}]
        recorded = service.record_all_found_external_ids(animals)

        assert recorded == 0
