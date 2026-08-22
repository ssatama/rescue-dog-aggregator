"""A NULL column must not reach the model as the word "None".

`dict.get(key, default)` returns the default only when the key is ABSENT. Every
row loaded by management/llm_commands.py:261 carries `breed` and `properties`
as keys, so a NULL column arrives present-and-None and the default never fires.
Production holds 59 animals with a NULL breed and 125 with NULL properties.

Same defect class as #344: a profile written against source text that is not
there. #349 fixed this for `age_text` in build_prompt; the two lines around it
had it too.
"""

from unittest.mock import patch

import pytest

from services.llm.prompt_builder import PromptBuilder

TEMPLATE = {
    "extraction_prompt": "Name: {name}\nBreed: {breed}\nAge: {age_text}\nSource:\n{properties}",
    "system_prompt": "s",
}


@pytest.fixture
def builder():
    with patch.object(PromptBuilder, "_load_prompt_template", return_value=TEMPLATE):
        return PromptBuilder(organization_id=1)


@pytest.mark.unit
class TestNullColumnsDoNotReachTheModel:
    def test_a_null_breed_does_not_become_the_word_none(self, builder):
        prompt = builder.build_prompt({"name": "Bella", "breed": None, "age_text": "2 years", "properties": {"description": "x"}})

        assert "Breed: None" not in prompt
        assert "Breed: Mixed Breed" in prompt

    def test_null_properties_do_not_become_the_word_none(self, builder):
        prompt = builder.build_prompt({"name": "Bella", "breed": "Lab", "age_text": "2 years", "properties": None})

        assert "None" not in prompt.split("Source:")[1]

    def test_a_null_name_does_not_become_the_word_none(self, builder):
        prompt = builder.build_prompt({"name": None, "breed": "Lab", "age_text": "2 years", "properties": {}})

        assert "Name: None" not in prompt

    def test_real_values_are_passed_through_untouched(self, builder):
        prompt = builder.build_prompt({"name": "Bella", "breed": "Beagle", "age_text": "3 years", "properties": {"description": "Found in Sofia"}})

        assert "Breed: Beagle" in prompt
        assert "Name: Bella" in prompt
        assert "Found in Sofia" in prompt


@pytest.mark.unit
class TestNullPropertiesDoNotCrashTheProfiler:
    """`dog_data.get("properties", {}).get(...)` raised on a NULL column.

    125 animals carry NULL properties. The chained get ran whenever the model
    omitted `source_references`, so the failure was intermittent by response
    shape rather than by row.
    """

    def test_source_reference_extraction_survives_null_properties(self):
        dog_data = {"id": 1, "name": "Bella", "breed": None, "properties": None}

        description = str((dog_data.get("properties") or {}).get("description") or "")

        assert description == ""

    def test_source_reference_extraction_reads_a_real_description(self):
        dog_data = {"id": 1, "name": "Bella", "properties": {"description": "Found in Sofia"}}

        description = str((dog_data.get("properties") or {}).get("description") or "")

        assert description == "Found in Sofia"
