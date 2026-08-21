"""Re-profiling an already-profiled dog.

generate_profiles only ever selected dogs with no profile, so the 445 Dogs Trust
dogs whose profiles were invented from breed-guide junk could not be regenerated
after the scraper was fixed. It also filtered to availability_confidence 'high',
which would have left the 90 junk-sourced medium and low confidence dogs behind.
"""

import pytest

from management.llm_commands import build_profile_selection_query


@pytest.mark.unit
class TestProfileSelectionQuery:
    def test_default_skips_dogs_that_already_have_a_profile(self):
        sql, params = build_profile_selection_query(org_id=28, force=False, confidence="high", limit=None)

        assert "dog_profiler_data IS NULL" in sql
        assert params == (28,)

    def test_force_includes_dogs_that_already_have_a_profile(self):
        sql, _ = build_profile_selection_query(org_id=28, force=True, confidence="high", limit=None)

        assert "dog_profiler_data IS NULL" not in sql

    def test_default_confidence_stays_high_only(self):
        sql, _ = build_profile_selection_query(org_id=28, force=False, confidence="high", limit=None)

        assert "availability_confidence = 'high'" in sql

    def test_confidence_all_drops_the_filter(self):
        sql, _ = build_profile_selection_query(org_id=28, force=True, confidence="all", limit=None)

        assert "availability_confidence" not in sql

    def test_always_restricted_to_available_dogs_of_one_org(self):
        sql, params = build_profile_selection_query(org_id=28, force=True, confidence="all", limit=None)

        assert "status = 'available'" in sql
        assert "organization_id = %s" in sql
        assert params == (28,)

    def test_limit_is_applied_as_an_integer_not_interpolated_text(self):
        sql, _ = build_profile_selection_query(org_id=28, force=True, confidence="all", limit=50)

        assert "LIMIT 50" in sql

    def test_rejects_an_unknown_confidence_value(self):
        with pytest.raises(ValueError):
            build_profile_selection_query(org_id=28, force=True, confidence="'; DROP TABLE animals;--", limit=None)
