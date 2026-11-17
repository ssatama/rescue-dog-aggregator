"""frontend/vercel.json ignoreCommand: exit 0 skips the Vercel build.

Vercel rejects a vercel.json whose ignoreCommand is over 256 characters, so the
logic lives in frontend/scripts/vercel-ignore-build.sh.

Each production deploy starts the dog pages' ISR cache cold, so a deploy for a
backend-only commit costs tens of thousands of ISR write units (#758).
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

pytestmark = pytest.mark.unit

FRONTEND = Path(__file__).parents[2] / "frontend"
IGNORE_COMMAND = json.loads((FRONTEND / "vercel.json").read_text())["ignoreCommand"]
SCRIPT = FRONTEND / "scripts" / "vercel-ignore-build.sh"


# A clean environment: a GIT_DIR exported by a git hook must not redirect the fixture's commits.
GIT_ENV = {"PATH": os.path.dirname(shutil.which("git")) + ":/usr/bin:/bin", "HOME": "/nonexistent"}


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True, env=GIT_ENV).stdout.strip()


@pytest.fixture
def repo(tmp_path: Path) -> Path:
    git(tmp_path, "init", "-q")
    git(tmp_path, "config", "user.email", "test@example.com")
    git(tmp_path, "config", "user.name", "test")
    (tmp_path / "frontend").mkdir()
    (tmp_path / "frontend" / "page.tsx").write_text("v1")
    (tmp_path / "api.py").write_text("v1")
    git(tmp_path, "add", ".")
    git(tmp_path, "commit", "-qm", "base")
    return tmp_path


def commit(repo: Path, path: str) -> None:
    (repo / path).write_text((repo / path).read_text() + "+")
    git(repo, "commit", "-qam", f"change {path}")


def skips_build(repo: Path, **env: str) -> bool:
    # Run as Vercel does, from frontend/, with the script where the command expects it.
    (repo / "frontend" / "scripts").mkdir(exist_ok=True)
    shutil.copy(SCRIPT, repo / "frontend" / "scripts" / SCRIPT.name)
    result = subprocess.run(["sh", "-c", IGNORE_COMMAND], cwd=repo / "frontend", env={**GIT_ENV, **env})
    return result.returncode == 0


def test_production_skips_when_only_backend_changed(repo):
    previous = git(repo, "rev-parse", "HEAD")
    commit(repo, "api.py")
    assert skips_build(repo, VERCEL_ENV="production", VERCEL_GIT_PREVIOUS_SHA=previous)


def test_production_builds_when_frontend_changed_since_last_deploy(repo):
    previous = git(repo, "rev-parse", "HEAD")
    commit(repo, "frontend/page.tsx")
    commit(repo, "api.py")  # a later backend-only commit must not hide it
    assert not skips_build(repo, VERCEL_ENV="production", VERCEL_GIT_PREVIOUS_SHA=previous)


def test_production_builds_without_previous_sha(repo):
    commit(repo, "api.py")
    assert not skips_build(repo, VERCEL_ENV="production")


def test_production_builds_when_previous_sha_is_not_in_clone(repo):
    commit(repo, "api.py")
    assert not skips_build(repo, VERCEL_ENV="production", VERCEL_GIT_PREVIOUS_SHA="0" * 40)


def test_dependabot_previews_still_skip(repo):
    assert skips_build(repo, VERCEL_ENV="preview", VERCEL_GIT_COMMIT_REF="dependabot/npm_and_yarn/x")


def test_other_previews_build(repo):
    previous = git(repo, "rev-parse", "HEAD")
    commit(repo, "api.py")
    assert not skips_build(repo, VERCEL_ENV="preview", VERCEL_GIT_COMMIT_REF="feat/x", VERCEL_GIT_PREVIOUS_SHA=previous)


def test_production_fetches_previous_sha_missing_from_shallow_clone(repo, tmp_path_factory):
    previous = git(repo, "rev-parse", "HEAD")
    commit(repo, "api.py")
    commit(repo, "api.py")
    clone = tmp_path_factory.mktemp("clone") / "repo"
    git(clone.parent, "clone", "-q", "--depth=1", f"file://{repo}", str(clone))
    git(repo, "config", "uploadpack.allowReachableSHA1InWant", "true")
    assert skips_build(clone, VERCEL_ENV="production", VERCEL_GIT_PREVIOUS_SHA=previous)


def test_ignore_command_fits_vercel_schema_limit():
    assert len(IGNORE_COMMAND) <= 256
