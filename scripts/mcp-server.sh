#!/bin/bash
# Launch one of the project MCP servers declared in .mcp.json. Shared by
# laptop and cloud sessions, so the config holds no paths or secrets.
#
#   postgres    read-only production SQL as claude_ro. With PROD_RO_DATABASE_URL
#               (environment or .env, i.e. the laptop) it connects directly. In
#               cloud sessions, which can't reach Postgres, it goes over HTTPS
#               through the API's /api/admin/query (scripts/mcp_prod_query.py).
#   rescuedogs  this repo's MCP server against the public API; built on first use.
#
# The Railway MCP server is laptop-only (it needs a railway login), so it is
# added with `claude mcp add --scope local` rather than committed here.

set -euo pipefail
cd "$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"

case "${1:-}" in
  postgres)
    url=${PROD_RO_DATABASE_URL:-}
    if [ -z "$url" ] && [ -f .env ]; then
      url=$(grep -E '^PROD_RO_DATABASE_URL=' .env | cut -d= -f2- | tr -d "\"'" || true)
    fi
    if [ -z "$url" ] && [ "${CLAUDE_CODE_REMOTE:-}" = "true" ]; then
      exec python3 scripts/mcp_prod_query.py
    fi
    if [ -z "$url" ]; then
      echo "PROD_RO_DATABASE_URL is not set (environment or .env); see scripts/sql/create_claude_ro.sql" >&2
      exit 1
    fi
    # The URL uses libpq's sslmode=require (encrypt, don't verify), which psql
    # understands. node-postgres reads "require" as verify-full and rejects
    # Railway's self-signed proxy certificate; its spelling is "no-verify".
    exec npx -y @modelcontextprotocol/server-postgres "${url/sslmode=require/sslmode=no-verify}"
    ;;
  rescuedogs)
    cd rescuedogs-mcp-server
    if [ ! -f dist/index.js ]; then
      { npm install --no-audit --no-fund && npm run build; } >&2
    fi
    exec node dist/index.js
    ;;
  *)
    echo "usage: $0 postgres|rescuedogs" >&2
    exit 2
    ;;
esac
