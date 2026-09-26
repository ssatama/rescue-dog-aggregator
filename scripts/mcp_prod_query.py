#!/usr/bin/env python3
"""Minimal MCP stdio server: read-only production SQL over HTTPS.

Cloud sessions can't reach Postgres (the egress proxy only passes HTTP(S)), so
the `postgres` MCP server falls back to this. It offers the same `query` tool
as @modelcontextprotocol/server-postgres and sends each query to the API's
POST /api/admin/query, which runs it as the read-only claude_ro role.

Auth: in cloud sessions the agent proxy adds X-API-Key for api.rescuedogs.me,
so no key is read here. Elsewhere, ADMIN_API_KEY from the environment is used.
Standard library only, so it runs before any dependency install.
"""

import json
import os
import sys
import urllib.error
import urllib.request

ENDPOINT = os.environ.get("PROD_QUERY_URL", "https://api.rescuedogs.me/api/admin/query")

TOOL = {
    "name": "query",
    "description": "Run a read-only SQL query against the production database (as claude_ro).",
    "inputSchema": {
        "type": "object",
        "properties": {"sql": {"type": "string"}},
        "required": ["sql"],
    },
}


def fetch_rows(sql: str, limit: int = 1000) -> tuple[list[dict], bool]:
    """Run one read-only query through the API. Returns (rows, truncated); raises on failure."""
    # Cloudflare in front of the API blocks urllib's default User-Agent (403, error 1010).
    headers = {"Content-Type": "application/json", "User-Agent": "rescuedogs-mcp-prod-query/1.0"}
    if os.environ.get("ADMIN_API_KEY"):
        headers["X-API-Key"] = os.environ["ADMIN_API_KEY"]
    request = urllib.request.Request(ENDPOINT, data=json.dumps({"sql": sql, "limit": limit}).encode(), headers=headers)
    with urllib.request.urlopen(request, timeout=30) as response:
        body = json.load(response)
    return [dict(zip(body["columns"], row, strict=True)) for row in body["rows"]], body["truncated"]


def run_query(sql: str) -> tuple[str, bool]:
    try:
        rows, truncated = fetch_rows(sql)
    except urllib.error.HTTPError as e:
        return f"HTTP {e.code}: {e.read().decode(errors='replace')}", True
    except urllib.error.URLError as e:
        return f"Request failed: {e.reason}", True
    except Exception as e:  # timeouts, resets, non-JSON proxy pages: report, don't die
        return f"Request failed: {type(e).__name__}: {e}", True

    text = json.dumps(rows, indent=2, default=str)
    if truncated:
        text += f"\n(truncated to {len(rows)} rows)"
    return text, False


def handle(message: dict) -> dict | None:
    method = message.get("method")
    if "id" not in message:  # notifications need no reply
        return None
    if method == "initialize":
        result = {
            "protocolVersion": message.get("params", {}).get("protocolVersion", "2025-06-18"),
            "capabilities": {"tools": {}},
            "serverInfo": {"name": "rescuedogs-prod-query", "version": "1.0.0"},
        }
    elif method == "ping":
        result = {}
    elif method == "tools/list":
        result = {"tools": [TOOL]}
    elif method == "tools/call" and message.get("params", {}).get("name") == "query":
        text, is_error = run_query(message["params"].get("arguments", {}).get("sql", ""))
        result = {"content": [{"type": "text", "text": text}], "isError": is_error}
    else:
        return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": -32601, "message": f"Unknown method {method}"}}
    return {"jsonrpc": "2.0", "id": message["id"], "result": result}


def main() -> None:
    for line in sys.stdin:
        if not line.strip():
            continue
        # One bad message must not end the server for the rest of the session.
        try:
            reply = handle(json.loads(line))
        except Exception as e:
            reply = {"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": f"{type(e).__name__}: {e}"}}
        if reply is not None:
            sys.stdout.write(json.dumps(reply) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    main()
