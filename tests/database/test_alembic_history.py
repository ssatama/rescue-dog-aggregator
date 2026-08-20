"""Guards on the Alembic revision graph.

The history previously carried two disjoint roots: production was stamped on
one of them while the other was never applied to any database, so a new
migration could be chained onto a branch that never runs.
"""

from pathlib import Path

import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations" / "railway"


def _script_directory() -> ScriptDirectory:
    config = Config(str(MIGRATIONS_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(MIGRATIONS_DIR))
    return ScriptDirectory.from_config(config)


@pytest.mark.unit
class TestAlembicHistory:
    def test_exactly_one_head(self):
        """Multiple heads make `alembic upgrade head` fail outright."""
        heads = _script_directory().get_heads()
        assert len(heads) == 1, f"expected a single head, found {heads}"

    def test_exactly_one_root(self):
        """A second root is a parallel history that no database will ever apply."""
        roots = [r.revision for r in _script_directory().walk_revisions() if r.down_revision is None]
        assert len(roots) == 1, f"expected a single root revision, found {roots}"

    def test_production_stamp_is_in_the_history(self):
        """The revision production is stamped at must remain reachable."""
        production_stamp = "45c123f68726"
        revisions = {r.revision for r in _script_directory().walk_revisions()}
        assert production_stamp in revisions

    def test_migration_files_are_tracked_by_git(self):
        """A gitignored versions/ directory silently drops new migrations."""
        gitignore = (MIGRATIONS_DIR.parents[1] / ".gitignore").read_text().splitlines()
        ignored = {line.strip() for line in gitignore}
        assert "migrations/railway/versions/" not in ignored
        assert "migrations/railway/alembic.ini" not in ignored
