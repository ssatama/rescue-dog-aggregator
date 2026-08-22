"""The frontend's view of a dog must match what the API actually sends.

Both sides are internally consistent and tested, so a field that exists on
only one of them fails nothing. The Zod schema marks every field optional, so
a field the API never sends parses fine and reads as `undefined` forever - the
shape of the `llm_description` bug, where ~9,500 dogs had a profile the page
could not display.

This compares the OpenAPI document FastAPI derives from its response models
against the field names the frontend declares, and pins the known divergence
so it can shrink but not grow.
"""

import os
import re
from pathlib import Path

import pytest

ZOD_SCHEMA = Path(__file__).resolve().parents[2] / "frontend" / "src" / "schemas" / "animals.ts"

# Declared by the frontend, never sent by the API. Everything here reads as
# undefined at runtime. Each is either dead schema or a guarded fallback; the
# set must shrink, never grow, so a new entry means new drift.
KNOWN_FRONTEND_ONLY_FIELDS = {
    "additional_images",
    "age",
    "age_months",
    "city",
    "coat",
    "color",
    "country",
    "description",
    "good_with_cats",
    "good_with_children",
    "good_with_dogs",
    "house_trained",
    "image",
    "images",
    "location",
    "main_image",
    "mixed_breed",
    # Sent by /api/swipe (api/routes/swipe.py:354), which builds its payload by
    # hand rather than from the Animal response model, so it is absent here.
    "dogProfilerData",
    # LLM profile fields; the API nests these inside dog_profiler_data.
    "personality_traits",
    "postcode",
    "quality_score",
    "shots_current",
    "spayed_neutered",
    "special_needs",
    "state",
    "traits",
    "videos",
    "weight",
}


def _openapi_animal_fields() -> set[str]:
    os.environ.setdefault("TESTING", "true")
    from api.main import app

    return set(app.openapi()["components"]["schemas"]["Animal"]["properties"])


def _zod_declared_fields(schema_name: str) -> set[str]:
    """Field names declared on a Zod object schema.

    Reads the source rather than a generated artefact so the check cannot go
    stale against a schema someone edits without regenerating anything.

    The name pattern accepts camelCase as well as snake_case: a snake_case-only
    pattern skipped `dogProfilerData` silently, which is the one shape this
    test exists to catch.
    """
    source = ZOD_SCHEMA.read_text()
    start = source.index(f"export const {schema_name} = z")
    # The object literal closes on a line of its own at two-space indent,
    # before any chained .passthrough() / .optional().
    body = source[start : source.index("\n  })", start)]
    return set(re.findall(r"^\s{4}([A-Za-z_][A-Za-z0-9_]*):\s", body, re.MULTILINE))


@pytest.mark.unit
class TestDogFieldParity:
    def test_the_extractors_find_something(self):
        """Both sides must parse, or every assertion below passes vacuously."""
        assert len(_openapi_animal_fields()) > 20
        assert len(_zod_declared_fields("ApiDogSchema")) > 20

    def test_the_extractor_sees_camel_case_fields(self):
        """A snake_case-only pattern skipped these without failing anything."""
        assert "dogProfilerData" in _zod_declared_fields("ApiDogSchema")

    def test_frontend_declares_no_new_field_the_api_does_not_send(self):
        phantom = _zod_declared_fields("ApiDogSchema") - _openapi_animal_fields()

        new_drift = phantom - KNOWN_FRONTEND_ONLY_FIELDS
        assert not new_drift, (
            f"ApiDogSchema declares {sorted(new_drift)}, which the API never sends. Anything reading these gets undefined. Either add the field to the response model or remove it from the schema."
        )

    def test_the_known_divergence_list_is_current(self):
        """A field that gets cleaned up must leave this list too."""
        phantom = _zod_declared_fields("ApiDogSchema") - _openapi_animal_fields()

        resolved = KNOWN_FRONTEND_ONLY_FIELDS - phantom
        assert not resolved, f"No longer divergent, drop from KNOWN_FRONTEND_ONLY_FIELDS: {sorted(resolved)}"
