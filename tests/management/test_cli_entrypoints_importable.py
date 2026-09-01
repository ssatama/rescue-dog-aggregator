"""Every management CLI must be runnable the way the docs say to run it.

`management/` contains a `services/` package, and running `python
management/foo.py` puts `management/` at `sys.path[0]`, so `import services`
resolves there instead of to the project's own `services/`. The scripts tried
to correct this with

    if project_root not in sys.path:
        sys.path.insert(0, project_root)

but the project is installed in editable mode, so `project_root` is already on
`sys.path` - just *after* `management/` - and the guard is False, so the insert
never runs.

The result: `uv run python management/llm_commands.py generate-profiles`, the
command AGENTS.md and the ops runbook both document, died on
`ModuleNotFoundError: No module named 'services.llm'`. That is why the LLM
profile backfill had not been run since 2026-08-20.
"""

import subprocess
import sys
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[2]

CLI_SCRIPTS = sorted(path.name for path in (PROJECT_ROOT / "management").glob("*.py") if path.name != "__init__.py" and "__main__" in path.read_text())


@pytest.mark.unit
@pytest.mark.parametrize("script", CLI_SCRIPTS)
def test_cli_starts_when_run_as_a_script(script):
    """`--help` must reach argument parsing, not die on imports."""
    result = subprocess.run(
        [sys.executable, f"management/{script}", "--help"],
        cwd=PROJECT_ROOT,
        capture_output=True,
        text=True,
        timeout=120,
    )

    assert "ModuleNotFoundError" not in result.stderr, f"management/{script} cannot import its own dependencies:\n{result.stderr[-1500:]}"
    assert result.returncode == 0, f"management/{script} --help exited {result.returncode}:\n{result.stderr[-1500:]}"


@pytest.mark.unit
def test_the_shadowing_package_that_caused_this_still_exists():
    """If `management/services/` is ever removed the guard above is moot, but
    while it exists every CLI must put the project root first."""
    assert (PROJECT_ROOT / "management" / "services" / "__init__.py").exists()
    assert (PROJECT_ROOT / "services" / "llm" / "__init__.py").exists()
