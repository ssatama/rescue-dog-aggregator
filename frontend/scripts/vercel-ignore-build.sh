#!/bin/sh
# Vercel "Ignored Build Step" (frontend/vercel.json ignoreCommand, which Vercel
# caps at 256 characters). Exit 0 skips the build; anything else builds.
# Runs from frontend/, the project's Root Directory, in a shallow clone.

build() { echo "Building: $1"; exit 1; }

# Dependabot previews: CI already covers them.
if [ "$VERCEL_ENV" = "preview" ] && [ "${VERCEL_GIT_COMMIT_REF#dependabot/}" != "$VERCEL_GIT_COMMIT_REF" ]; then
  echo "Skipping: Dependabot preview"
  exit 0
fi

# Production: skip when nothing under frontend/ changed since the last
# successful deploy. Each new deployment starts the ISR cache cold (#781).
[ "$VERCEL_ENV" = "production" ] || build "not production"
[ -n "$VERCEL_GIT_PREVIOUS_SHA" ] || build "no previous deployment SHA"
# A redeploy of the deployed commit (e.g. after changing an env var) must build.
[ "$(git rev-parse HEAD)" != "$VERCEL_GIT_PREVIOUS_SHA" ] || build "redeploy of the deployed commit"
git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA^{commit}" 2>/dev/null ||
  git fetch -q --depth=1 origin "$VERCEL_GIT_PREVIOUS_SHA" || build "previous SHA not fetchable"
if git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- .; then
  echo "Skipping: nothing under frontend/ changed since $VERCEL_GIT_PREVIOUS_SHA"
  exit 0
fi
build "frontend/ changed (or git diff failed)"
