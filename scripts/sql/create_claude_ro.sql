-- Read-only production role for agents (Postgres MCP, cloud sessions).
--
-- Run once, as the owner, from the repo root:
--   railway connect Postgres
--   \i scripts/sql/create_claude_ro.sql
-- psql prompts for the new password, so it never reaches shell history.
-- Then use the role in two places:
-- - Laptop .env, for the postgres MCP server (public TCP proxy):
--     PROD_RO_DATABASE_URL=postgresql://claude_ro:PASSWORD@RAILWAY_TCP_PROXY_DOMAIN:RAILWAY_TCP_PROXY_PORT/railway?sslmode=require
-- - Railway, API service rescue-dog-aggregator, for POST /api/admin/query
--   (cloud sessions; private network, no TLS needed):
--     READONLY_DATABASE_URL=postgresql://claude_ro:PASSWORD@postgres.railway.internal:5432/railway
-- Never put this URL in the cloud environment: its variables are plain text.
--
-- The guard is SELECT-only grants. default_transaction_read_only is a second
-- layer only: a session can switch it off. /api/admin/query refuses to run
-- anything if the role it connects as could write.

CREATE ROLE claude_ro LOGIN CONNECTION LIMIT 3;
\password claude_ro
ALTER ROLE claude_ro SET default_transaction_read_only = on;
ALTER ROLE claude_ro SET statement_timeout = '15s';
ALTER ROLE claude_ro SET idle_in_transaction_session_timeout = '60s';
GRANT CONNECT ON DATABASE railway TO claude_ro;
GRANT USAGE ON SCHEMA public TO claude_ro;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO claude_ro;
-- Tables created later by the owner (migrations) are readable too.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT SELECT ON TABLES TO claude_ro;
