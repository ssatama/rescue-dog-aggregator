# CLAUDE.md - Rescue Dog Aggregator

All project instructions live in a single file, imported here:

@AGENTS.md

`AGENTS.md` is the source of truth and is shared across every coding agent used
on this repo. Add or change instructions there, never here - the two files
previously held duplicate copies that drifted apart, which is what this import
exists to prevent.

## Claude Code specifics

Only tooling notes that apply to Claude Code and nowhere else belong below.

### Skills

- `ops-commands` - operational runbooks: organization config sync, LLM
  profiling batches, emergency recovery.
- `weekly-devops` - the Monday `/weekly-devops` run. It reads
  `BING_WEBMASTER_API_KEY` from `.env`, so it runs on the laptop.

### MCP servers

Committed in `.mcp.json`, the same on the laptop and in cloud sessions. Both
start through `scripts/mcp-server.sh`, so the file holds no paths or secrets:

- `postgres` - read-only SQL against the **production** Railway database, as
  the `claude_ro` role (`scripts/sql/create_claude_ro.sql`). On the laptop it
  connects with `PROD_RO_DATABASE_URL` from `.env`; in cloud sessions, which
  can't reach Postgres, it goes over HTTPS via `POST /api/admin/query`.
  Prefer it over shelling out to `psql` for inspection.
- `rescuedogs` - this repo's own MCP server (`rescuedogs-mcp-server/`): dog
  search, filter counts, statistics against the live API. Built on first use.

Laptop only, added with `claude mcp add --scope local`: `Railway` (deployment
status, logs, variables; cloud sessions have no Railway credentials).

Vercel (plugin), Context7 and chrome-devtools come from user-level config;
chrome-devtools also covers Lighthouse audits. Sentry is a local-scope server
until a claude.ai Sentry connector replaces it.

### Review

- `/code-review` for automated review of the current branch or a PR.
