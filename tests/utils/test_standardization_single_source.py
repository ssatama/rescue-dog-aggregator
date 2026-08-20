"""Guards that breed, age, and size have exactly one implementation.

Three parallel implementations existed (unified_standardization,
optimized_standardization, and a duplicate age parser inside
standardization.py) and they disagreed: optimized_standardization read
"Under 6 months" as 6-8 months and failed outright on "5+ years".
"""

import importlib

import pytest

from utils.standardization import parse_age_text
from utils.unified_standardization import UnifiedStandardizer

AGE_CORPUS = [
    "2 years",
    "6 months",
    "Puppy",
    "Young",
    "Adult",
    "Senior",
    "10 weeks",
    "3-5 years",
    "born 03/2020",
    "2020",
    "5+ years",
    "Under 6 months",
    "2.5 years",
    "unbekannt",
    "1 year",
    "18 months",
    "8 years",
    "6 - 12 months",
    "12 Jahre",
    "",
    "not an age",
]


@pytest.mark.unit
class TestRemovedDuplicateModules:
    @pytest.mark.parametrize("module", ["utils.optimized_standardization", "utils.feature_flags"])
    def test_duplicate_module_is_gone(self, module):
        with pytest.raises(ModuleNotFoundError):
            importlib.import_module(module)


@pytest.mark.unit
class TestAgeParsingHasOneImplementation:
    @pytest.mark.parametrize("age_text", AGE_CORPUS)
    def test_standardization_delegates_to_unified(self, age_text):
        """utils.standardization must not carry its own age parser."""
        assert parse_age_text(age_text) == UnifiedStandardizer()._parse_age_text(age_text)

    def test_ranges_are_read_as_ranges_not_endpoints(self):
        """The removed implementation returned Young 12-24 for this."""
        assert parse_age_text("6 - 12 months") == ("Puppy", 6, 12)

    def test_under_prefix_is_honoured(self):
        """The removed implementation ignored 'Under' and returned 6-8."""
        assert parse_age_text("Under 6 months") == ("Puppy", 0, 6)

    def test_open_ended_age_is_parsed(self):
        """The removed implementation failed outright and returned None."""
        assert parse_age_text("5+ years") == ("Adult", 60, 360)
