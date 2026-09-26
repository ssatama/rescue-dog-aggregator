"""A dog the rescue's site lists is never marked stale because its save failed (#558)."""

from unittest.mock import Mock, patch

import psycopg2
import pytest

from config import DB_CONFIG
from scrapers.base_scraper import BaseScraper
from services.metrics_collector import MetricsCollector
from services.session_manager import SessionManager

ORG_ID = 901  # seeded by conftest.manage_test_data, with animals 9001-9014


def _dog(external_id):
    return {"name": f"Dog {external_id}", "external_id": external_id, "adoption_url": f"https://example.org/{external_id}", "primary_image_url": f"https://example.org/{external_id}.jpg"}


class _Scraper(BaseScraper):
    dogs: list = []

    def collect_data(self):
        return list(self.dogs)


def _scraper(session_manager):
    with (
        patch("scrapers.base_scraper.create_default_sync_service") as sync,
        patch("scrapers.base_scraper.ConfigLoader") as loader,
    ):
        sync.return_value.sync_single_organization.return_value = Mock(organization_id=ORG_ID, was_created=False)
        config = Mock()
        config.get_scraper_config_dict.return_value = {"rate_limit_delay": 0, "max_retries": 1, "timeout": 10, "skip_existing_animals": False}
        config.name = "Test Rescue"
        loader.return_value.load_config.return_value = config
        s = _Scraper(config_id="test", metrics_collector=MetricsCollector())
    s.database_service = Mock()
    s.database_service.create_scrape_log.return_value = 77
    s.database_service.get_slugs_for_animals.return_value = []
    s.image_processing_service = None
    s.session_manager = session_manager
    s.llm_handler = Mock()
    s._check_robots_permission = Mock(return_value=True)
    return s


def _missing_counts(cursor):
    cursor.execute("SELECT id, consecutive_scrapes_missing FROM animals WHERE organization_id = %s ORDER BY id", (ORG_ID,))
    return dict(cursor.fetchall())


@pytest.mark.database
@pytest.mark.integration
class TestAgainstTheDatabase:
    @pytest.fixture
    def db(self):
        conn = psycopg2.connect(**{k: v for k, v in DB_CONFIG.items() if v})
        cursor = conn.cursor()
        # External ids for the seeded dogs, each already missed once
        cursor.execute(
            "UPDATE animals SET external_id = 'ext-' || id, consecutive_scrapes_missing = 1, last_seen_at = NULL WHERE organization_id = %s",
            (ORG_ID,),
        )
        conn.commit()
        yield cursor
        conn.close()

    def test_an_existing_dog_whose_update_fails_keeps_consecutive_scrapes_missing_at_zero(self, db):
        session_manager = SessionManager(DB_CONFIG, organization_id=ORG_ID)
        scraper = _scraper(session_manager)
        listed = [9001, 9002, 9003, 9004, 9005, 9006]  # 9002's save fails: 1 of 6, under the partial-failure rate
        scraper.dogs = [_dog(f"ext-{i}") for i in listed]

        def save(dog):
            animal_id = int(dog["external_id"].removeprefix("ext-"))
            return (None, "error") if animal_id == 9002 else (animal_id, "no_change")

        with (
            patch.object(scraper, "save_animal", side_effect=save),
            patch.object(scraper, "detect_partial_failure", return_value=False),
            patch("services.revalidation_client.invalidate_sync"),
        ):
            assert scraper._run_with_connection() is True

        counts = _missing_counts(db)
        assert counts[9002] == 0, "listed, save failed: still seen"
        assert all(counts[i] == 0 for i in listed)
        assert counts[9007] == 2, "not listed: goes on towards stale"

    def test_found_dogs_are_seen_without_skip_existing_animals_but_unlisted_ones_are_not(self, db):
        session_manager = SessionManager(DB_CONFIG, organization_id=ORG_ID, skip_existing_animals=False)
        session_manager.start_scrape_session()
        session_manager.record_found_animal("ext-9001")

        assert session_manager.mark_found_animals_as_seen() == 1
        session_manager.update_stale_data_detection()
        session_manager.close()

        counts = _missing_counts(db)
        assert counts[9001] == 0
        assert counts[9003] == 2

    def test_a_found_dog_that_is_already_inactive_stays_inactive(self, db):
        db.execute("UPDATE animals SET status = 'unknown', active = false WHERE id = 9001")
        db.connection.commit()
        session_manager = SessionManager(DB_CONFIG, organization_id=ORG_ID)
        session_manager.start_scrape_session()
        session_manager.record_found_animal("ext-9001")

        assert session_manager.mark_found_animals_as_seen() == 0
        session_manager.close()

        db.execute("SELECT active FROM animals WHERE id = 9001")
        assert db.fetchone()[0] is False, "only a successful save brings a dog back"


@pytest.mark.unit
class TestTooManyNotSavedIsAPartialFailure:
    def test_a_30_percent_save_failure_run_is_a_partial_failure_and_skips_stale_detection(self):
        session_manager = Mock()
        session_manager.get_historical_average_dogs_found.return_value = None
        scraper = _scraper(session_manager)
        scraper.dogs = [_dog(f"d{i}") for i in range(10)]
        failing = {"d0", "d1", "d2"}

        with (
            patch.object(scraper, "save_animal", side_effect=lambda d: (None, "error") if d["external_id"] in failing else (1, "no_change")),
            patch.object(scraper, "detect_partial_failure", return_value=False),
            patch("scrapers.base_scraper.alert_dogs_not_saved"),
            patch("services.revalidation_client.invalidate_sync"),
        ):
            scraper._run_with_connection()

        (completion,) = [c.args for c in scraper.database_service.complete_scrape_log.call_args_list]
        assert completion[1] == "warning"
        assert "3 of 10 found dogs not saved" in completion[5]
        session_manager.update_stale_data_detection.assert_not_called()
        session_manager.mark_found_animals_as_seen.assert_not_called()

    def test_a_20_percent_save_failure_run_still_runs_stale_detection(self):
        session_manager = Mock()
        session_manager.get_historical_average_dogs_found.return_value = None
        scraper = _scraper(session_manager)
        scraper.dogs = [_dog(f"d{i}") for i in range(10)]

        with (
            patch.object(scraper, "save_animal", side_effect=lambda d: (None, "error") if d["external_id"] in {"d0", "d1"} else (1, "no_change")),
            patch.object(scraper, "detect_partial_failure", return_value=False),
            patch("scrapers.base_scraper.alert_dogs_not_saved"),
            patch("services.revalidation_client.invalidate_sync"),
        ):
            scraper._run_with_connection()

        session_manager.mark_found_animals_as_seen.assert_called_once()
        session_manager.update_stale_data_detection.assert_called_once()
        assert session_manager.method_calls.index(("mark_found_animals_as_seen", (), {})) < session_manager.method_calls.index(("update_stale_data_detection", (), {}))
