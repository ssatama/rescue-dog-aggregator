"""An unprofiled dog must serialize as null, not as an empty object.

`parse_json_field` coerces a NULL JSONB column to `{}`, which is right for
`properties` but wrong for `dog_profiler_data`: the frontend guards the
personality section with `dog.dog_profiler_data && (...)`, and `{}` is truthy in
JavaScript. Every dog whose profiling failed rendered four empty headings -
Personality, Energy & Training, Good With, Activities & Quirks - with no content
under any of them.

"Never profiled" and "profiled" have to stay distinguishable over the wire.
"""

from datetime import UTC, datetime

import pytest

from api.models.dog import Animal
from api.utils.json_parser import parse_json_field, parse_optional_json_field


def _animal(**overrides) -> Animal:
    fields = {
        "id": 11227,
        "name": "Gabi",
        "animal_type": "dog",
        "status": "available",
        "slug": "gabi-english-springer-spaniel-11227",
        "organization_id": 28,
        "adoption_url": "https://www.dogstrust.org.uk/rehoming/dogs/spaniel-english-springer/3663231",
        "created_at": datetime.now(UTC),
        "updated_at": datetime.now(UTC),
    }
    fields.update(overrides)
    return Animal(**fields)


@pytest.mark.unit
class TestParseOptionalJsonField:
    def test_null_stays_null(self):
        data = {"dog_profiler_data": None}
        parse_optional_json_field(data, "dog_profiler_data")
        assert data["dog_profiler_data"] is None

    def test_a_missing_key_stays_missing(self):
        data = {}
        parse_optional_json_field(data, "dog_profiler_data")
        assert data.get("dog_profiler_data") is None

    def test_json_string_is_still_parsed(self):
        data = {"dog_profiler_data": '{"tagline": "Sweet and shy"}'}
        parse_optional_json_field(data, "dog_profiler_data")
        assert data["dog_profiler_data"] == {"tagline": "Sweet and shy"}

    def test_existing_dict_is_preserved(self):
        original = {"tagline": "Sweet and shy"}
        data = {"dog_profiler_data": original}
        parse_optional_json_field(data, "dog_profiler_data")
        assert data["dog_profiler_data"] is original

    def test_malformed_json_becomes_null_rather_than_an_empty_profile(self):
        data = {"dog_profiler_data": "{not valid json"}
        parse_optional_json_field(data, "dog_profiler_data")
        assert data["dog_profiler_data"] is None

    def test_properties_still_coerce_to_an_empty_dict(self):
        """The permissive behaviour stays for fields the frontend indexes into."""
        data = {"properties": None}
        parse_json_field(data, "properties")
        assert data["properties"] == {}


@pytest.mark.unit
class TestAnimalModelKeepsTheDistinction:
    def test_an_unprofiled_dog_serializes_as_null(self):
        assert _animal(dog_profiler_data=None).model_dump()["dog_profiler_data"] is None

    def test_an_omitted_profile_is_null_too(self):
        assert _animal().model_dump()["dog_profiler_data"] is None

    def test_a_real_profile_survives_intact(self):
        profile = {"tagline": "Sweet, sensitive, and tennis-ball obsessed"}

        assert _animal(dog_profiler_data=profile).model_dump()["dog_profiler_data"] == profile
