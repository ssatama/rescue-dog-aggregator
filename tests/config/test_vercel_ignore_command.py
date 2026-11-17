"""frontend/vercel.json ignoreCommand: exit 0 skips the Vercel build.

Each production deploy starts the dog pages' ISR cache cold, so a deploy for a
backend-only commit costs tens of thousands of ISR write units (#758).
"""

import json
import subprocess
from pathlib import Path

import pytest

IGNORE_COMMAND = json.loads((Path(__file__).parents[2] / "frontend" / "vercel.json").read_text())["ignoreCommand"]


def git(repo: Path, *args: str) -> str:
    return subprocess.run(["git", *args], cwd=repo, check=True, capture_output=True, text=True).stdout.strip()


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
    result = subprocess.run(["sh", "-c", IGNORE_COMMAND], cwd=repo / "frontend", env={"PATH": "/usr/bin:/bin", **env})
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
