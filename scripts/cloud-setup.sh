#!/bin/bash
# Prepare a Claude Code cloud session: local Postgres, dependencies, schema,
# organizations and seed dogs. Run by the SessionStart hook in
# .claude/settings.json on startup and resume; safe to run again.
#
# Does nothing outside a cloud session, so laptop sessions are unaffected.
# Everything here targets the local database through DB_*; see the
# "Cloud sessions" section of AGENTS.md.

if [ "$CLAUDE_CODE_REMOTE" != "true" ]; then
  exit 0
fi

set -euo pipefail
cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/..}"

LOG=/tmp/cloud-setup.log
: >"$LOG"
trap 'echo "cloud-setup failed at line $LINENO; last lines of $LOG:"; tail -n 20 "$LOG"' ERR

# config.py prefers DATABASE_URL over DB_*, and several management commands
# write to RAILWAY_DATABASE_URL. Either one here would point this session at
# production.
for var in DATABASE_URL RAILWAY_DATABASE_URL; do
  if [ -n "${!var:-}" ]; then
    echo "cloud-setup: refusing to run with $var set; remove it from the cloud environment." >&2
    exit 1
  fi
done
if [ "${DB_HOST:-}" != "localhost" ]; then
  echo "cloud-setup: DB_HOST must be localhost (got '${DB_HOST:-}')." >&2
  exit 1
fi
if [ -z "${DB_PASSWORD:-}" ]; then
  echo "cloud-setup: DB_PASSWORD must be set in the cloud environment." >&2
  exit 1
fi

# A resumed container can have Postgres stopped.
service postgresql start >>"$LOG" 2>&1
runuser -u postgres -- psql -qc "ALTER USER postgres PASSWORD '$DB_PASSWORD';" >>"$LOG" 2>&1
for db in rescue_dogs test_rescue_dogs; do
  runuser -u postgres -- psql -tAc "SELECT 1 FROM pg_database WHERE datname='$db'" | grep -q 1 \
    || runuser -u postgres -- createdb "$db" >>"$LOG" 2>&1
done

uv sync >>"$LOG" 2>&1
(cd frontend && pnpm install --frozen-lockfile) >>"$LOG" 2>&1

# Schema for the dev database and, as CI does, for the test database.
for db in rescue_dogs test_rescue_dogs; do
  DB_NAME=$db uv run python -c "
import sys
from database.db_setup import initialize_database
sys.exit(0 if initialize_database() else 1)
" >>"$LOG" 2>&1
done

# Writes organizations through DB_CONFIG, so the local database. The
# revalidation call after it is skipped because REVALIDATION_TOKEN is unset.
uv run python management/config_commands.py sync >>"$LOG" 2>&1

uv run python management/seed_dev_data.py --if-empty >>"$LOG" 2>&1

dogs=$(PGPASSWORD="$DB_PASSWORD" psql -h localhost -U postgres -d rescue_dogs -tAc \
  "SELECT count(*) FROM animals WHERE active AND status = 'available'")
echo "cloud-setup: Postgres running, dependencies installed, $dogs seeded dogs in rescue_dogs (log: $LOG)."
echo "Start the API with: uv run uvicorn api.main:app --port 8000   and the web app with: cd frontend && pnpm dev"
