# MCP Server

The `rescuedogs` MCP server lets LLM clients (Claude, Claude Code, Claude
Desktop) search the dogs on rescuedogs.me through natural conversation. It is
read-only, needs no authentication and calls the public API
(`https://api.rescuedogs.me`).

## Where it lives

It has its own repository, and that is the only source:

- Source, tool reference and release process:
  [ssatama/rescuedogs-mcp-server](https://github.com/ssatama/rescuedogs-mcp-server)
- npm: [`rescuedogs-mcp-server`](https://www.npmjs.com/package/rescuedogs-mcp-server)
- Hosted endpoint (streamable HTTP): `https://mcp.rescuedogs.me/mcp`
- Listed in the [Claude Connectors Directory](https://claude.ai/directory/connectors/rescue-dogs)

The project never distributes ZIP archives, installers or executables. Any
copy, fork or listing that offers a "Download" button is not ours.

## How this repo uses it

`.mcp.json` points the `rescuedogs` server at the hosted endpoint, so nothing
is installed or built locally. Its tools mirror the API, so a change to an
endpoint it calls (`/api/animals`, `/api/enhanced_animals`,
`/api/organizations`, `/api/animals/breeds`, `/api/animals/meta`) needs a
matching change in the MCP repo; its contract tests run against the live API.
