"""Admin-only, read-only SQL over HTTPS.

Lets agents in cloud sessions read the production database: the cloud's
egress proxy only passes HTTP(S), so they can't reach Postgres directly. The
proxy adds ADMIN_API_KEY to requests for this host, so the session never sees
a credential.

Queries run as the read-only ``claude_ro`` role through READONLY_DATABASE_URL,
never through the API's owner connection. The role's grants are the guard: a
read-only *session* can be switched back to read-write by the query itself, so
the endpoint refuses to run anything unless the connected role is verifiably
unable to write. The query runs through a server-side cursor, which accepts a
single SELECT-style statement and keeps the result on the database server, so
only ``limit + 1`` rows ever reach this process; the role's statement timeout
bounds runtime. See scripts/sql/create_claude_ro.sql.
"""

import json
import logging
import os

import psycopg2
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from api.auth import verify_admin_key

router = APIRouter(tags=["admin"], dependencies=[Depends(verify_admin_key)])

logger = logging.getLogger(__name__)

MAX_ROWS = 5000

# True when the connected role could change anything: superuser, CREATE on the
# schema, or any write privilege on any table in it.
CAN_WRITE_SQL = """
    SELECT (SELECT rolsuper FROM pg_roles WHERE rolname = current_user)
        OR has_schema_privilege('public', 'CREATE')
        OR coalesce(bool_or(has_table_privilege(c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE')), false)
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
"""


class QueryRequest(BaseModel):
    sql: str = Field(..., min_length=1, max_length=20_000)
    limit: int = Field(500, ge=1, le=MAX_ROWS, description="Maximum rows returned")


class QueryResponse(BaseModel):
    columns: list[str]
    rows: list[list]
    row_count: int
    truncated: bool


@router.post("/query", response_model=QueryResponse)
def run_readonly_query(request: QueryRequest) -> QueryResponse:
    """Run one read-only query as claude_ro and return its rows."""
    dsn = os.getenv("READONLY_DATABASE_URL")
    if not dsn:
        raise HTTPException(status_code=503, detail="Read-only query endpoint is not configured")

    try:
        conn = psycopg2.connect(dsn, connect_timeout=5)
    except psycopg2.OperationalError:
        logger.exception("Read-only query connection failed")
        raise HTTPException(status_code=503, detail="Read-only database unavailable") from None

    try:
        conn.set_session(readonly=True, autocommit=False)
        with conn.cursor() as cur:
            cur.execute(CAN_WRITE_SQL)
            if cur.fetchone()[0]:
                logger.error("READONLY_DATABASE_URL points at a role that can write; refusing to run queries")
                raise HTTPException(status_code=503, detail="Read-only query endpoint is misconfigured")
        # Named cursor = DECLARE ... CURSOR FOR <sql>: one SELECT-style statement,
        # rows fetched from the server only as asked for.
        with conn.cursor(name="admin_query") as cur:
            cur.execute(request.sql.strip().rstrip(";"))
            fetched = cur.fetchmany(request.limit + 1)
            columns = [col.name for col in cur.description or []]
    except psycopg2.Error as e:
        raise HTTPException(status_code=400, detail=(e.pgerror or str(e)).strip()) from None
    finally:
        try:
            conn.rollback()
        except psycopg2.Error:
            pass  # a dead connection mustn't replace the real error
        conn.close()

    truncated = len(fetched) > request.limit
    rows = fetched[: request.limit]
    # Dates, decimals, UUIDs and the like become strings; JSONB stays structured.
    rows = json.loads(json.dumps([list(r) for r in rows], default=str))
    return QueryResponse(columns=columns, rows=rows, row_count=len(rows), truncated=truncated)
