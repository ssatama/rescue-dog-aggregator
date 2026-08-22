"""Every management entrypoint must import.

The Railway cron container has shipped code that imported fine in CI and
crashed on startup in production, because nothing ever imported the module
outside the test that mocked it. Importing is cheap and catches the whole
class: a missing dependency, a renamed module, a circular import, a syntax
error on a path no test exercises.

These modules are entrypoints, so importing them must not do any work. If a
module needs a database or a network call at import time, that is the finding,
not a reason to skip it here.
"""

import importlib
import pkgutil

import pytest

import management

ENTRYPOINTS = sorted(module.name for module in pkgutil.walk_packages(management.__path__, prefix="management.") if not module.ispkg)


@pytest.mark.unit
def test_entrypoint_discovery_is_not_silently_empty():
    """A discovery bug would make every test below vacuously pass."""
    assert len(ENTRYPOINTS) >= 10, f"only discovered {ENTRYPOINTS}"
    assert "management.railway_scraper_cron" in ENTRYPOINTS


@pytest.mark.unit
@pytest.mark.parametrize("module_name", ENTRYPOINTS)
def test_module_imports(module_name: str):
    importlib.import_module(module_name)
