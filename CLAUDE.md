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

Configured for this project in `.mcp.json`:

- `postgres` - read-only SQL against the database. Prefer it over shelling out
  to `psql` for inspection.
- `rescuedogs` - this repo's own MCP server (`rescuedogs-mcp-server/`): dog
  search, filter counts, statistics against the live API.
- `pal` - `precommit` validation, used in the PR workflow above.
- `lighthouse` - performance audits.
- `sequential-thinking` - structured reasoning helper.

Railway and Sentry MCP servers may also be available from user-level config for
deployment status and production error triage.

### Review

- `/code-review` for automated review of the current branch or a PR.
