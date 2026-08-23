"""Inactive dogs must be identifiable by API consumers.

A dog whose listing vanished from the source organisation is marked
``active = false`` by the scrapers, but the detail endpoint deliberately serves
it anyway (``get_animal_by_slug`` ignores status so the page survives). Without
the flag on the wire, no consumer - the website, the MCP server, a crawler -
can tell a retired listing from a live one.
"""

import pytest

from api.models.dog import Animal


@pytest.mark.unit
def test_animal_model_exposes_active_flag():
    """``active`` is part of the serialised animal payload."""
    assert "active" in Animal.model_fields


@pytest.mark.unit
def test_animal_model_defaults_to_active():
    """A payload omitting ``active`` is treated as a live listing."""
    assert Animal.model_fields["active"].default is True


@pytest.mark.unit
def test_single_animal_response_preserves_inactive_flag():
    """A retired listing does not come back off the wire looking live.

    ``_build_single_animal_response`` copies an explicit whitelist of columns
    into the model, so a column missing from that list silently falls back to
    its default - which for ``active`` would turn every retired dog back into
    an apparently live one.
    """
    from api.services.animal_service import AnimalService

    row = {
        "id": 1,
        "slug": "skyla-mixed-breed-10039",
        "name": "Skyla",
        "organization_id": 1,
        "animal_type": "dog",
        "status": "unknown",
        "active": False,
        "created_at": "2026-01-01T00:00:00",
        "updated_at": "2026-01-01T00:00:00",
        "language": "en",
        "adoption_url": "https://example.org/skyla",
    }

    animal = AnimalService.__new__(AnimalService)._build_single_animal_response(row)

    assert animal.active is False
