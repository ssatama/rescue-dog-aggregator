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

### MCP servers

Configured for this project in `.mcp.json` (gitignored, so each machine keeps
its own copy):

- `postgres` - read-only SQL against the **production** Railway database. Its
  URL is read from `RAILWAY_DATABASE_URL` in `.env` at startup, never written
  into `.mcp.json`. Prefer it over shelling out to `psql` for inspection.
- `rescuedogs` - this repo's own MCP server (`rescuedogs-mcp-server/`): dog
  search, filter counts, statistics against the live API.
- `Railway` - deployment status, logs, variables.

Vercel (plugin), Context7 and chrome-devtools come from user-level config;
chrome-devtools also covers Lighthouse audits. Sentry is a local-scope server
until a claude.ai Sentry connector replaces it.

### Review

- `/code-review` for automated review of the current branch or a PR.
