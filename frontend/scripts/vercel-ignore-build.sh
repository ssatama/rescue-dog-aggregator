#!/bin/sh
# Vercel "Ignored Build Step" (frontend/vercel.json ignoreCommand, which Vercel
# caps at 256 characters). Exit 0 skips the build; anything else builds.
# Runs from frontend/, the project's Root Directory, in a shallow clone.

# Dependabot previews: CI already covers them.
if [ "$VERCEL_ENV" = "preview" ] && [ "${VERCEL_GIT_COMMIT_REF#dependabot/}" != "$VERCEL_GIT_COMMIT_REF" ]; then
  exit 0
fi

# Production: skip when nothing under frontend/ changed since the last
# successful deploy. Each new deployment starts the ISR cache cold (#781).
# A missing or unfetchable SHA makes this fail, so the build runs.
[ "$VERCEL_ENV" = "production" ] || exit 1
[ -n "$VERCEL_GIT_PREVIOUS_SHA" ] || exit 1
git cat-file -e "$VERCEL_GIT_PREVIOUS_SHA^{commit}" 2>/dev/null ||
  git fetch -q --depth=1 origin "$VERCEL_GIT_PREVIOUS_SHA" || exit 1
git diff --quiet "$VERCEL_GIT_PREVIOUS_SHA" HEAD -- .
