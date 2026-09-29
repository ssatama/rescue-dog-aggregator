"""A dog whose profile fails every run is counted, so the backlog can stop retrying it (#633)."""

import pytest

from config import get_database_config
from services.database_service import DatabaseService
from services.llm.database_updater import DatabaseUpdater


@pytest.mark.database
@pytest.mark.integration
class TestProfileFailedRuns:
    def test_each_failed_run_adds_one(self):
        updater = DatabaseUpdater()

        assert updater.record_failed_runs([9001, 9002]) == {9001: 1, 9002: 1}
        assert updater.record_failed_runs([9001]) == {9001: 2}

    def test_the_unprofiled_lookup_reports_the_count(self):
        DatabaseUpdater().record_failed_runs([9001])
        service = DatabaseService(get_database_config())
        service.connect()
        try:
            dogs = {dog["id"]: dog for dog in service.get_unprofiled_animals(901)}
        finally:
            service.close()

        assert dogs[9001]["profile_failed_runs"] == 1
        assert dogs[9002]["profile_failed_runs"] == 0

    def test_nothing_to_record_opens_no_connection(self):
        assert DatabaseUpdater(connection_pool=object()).record_failed_runs([]) == {}

    def test_a_dry_run_records_nothing(self):
        assert DatabaseUpdater(dry_run=True).record_failed_runs([9001]) == {}
