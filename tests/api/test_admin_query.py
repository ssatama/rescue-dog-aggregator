"""Tests for the admin read-only query endpoint (POST /api/admin/query)."""

import os
from unittest.mock import MagicMock, patch

import psycopg2
import pytest
from fastapi.testclient import TestClient

from api.main import app

ADMIN_KEY = "test-secret-key"
TEST_DSN = "postgresql://postgres:postgres@localhost:5432/test_rescue_dogs"


@pytest.fixture
def client():
    with patch.dict(os.environ, {"ADMIN_API_KEY": ADMIN_KEY, "READONLY_DATABASE_URL": TEST_DSN}):
        c = TestClient(app, raise_server_exceptions=False)
        c.headers["X-API-Key"] = ADMIN_KEY
        yield c


def fake_connection(description=None, rows=(), error=None, can_write=False):
    """A connection whose plain cursor answers the write-privilege check and
    whose named (server-side) cursor runs the user's query."""
    guard = MagicMock()
    guard.fetchone.return_value = (can_write,)
    query = MagicMock()
    query.description = description
    query.fetchmany.return_value = list(rows)
    if error:
        query.execute.side_effect = error

    def cursor(*args, **kwargs):
        context = MagicMock()
        context.__enter__.return_value = query if kwargs.get("name") else guard
        return context

    conn = MagicMock()
    conn.cursor.side_effect = cursor
    return conn, query


def column(name):
    col = MagicMock()
    col.name = name
    return col


@pytest.mark.unit
class TestAdminQueryUnit:
    def test_requires_admin_key(self, client):
        response = client.post("/api/admin/query", json={"sql": "select 1"}, headers={"X-API-Key": "wrong"})
        assert response.status_code == 401

    def test_unconfigured_returns_503(self, client):
        with patch.dict(os.environ, {"READONLY_DATABASE_URL": ""}):
            response = client.post("/api/admin/query", json={"sql": "select 1"})
        assert response.status_code == 503

    def test_session_is_read_only_and_always_rolled_back(self, client):
        conn, _ = fake_connection([column("n")], [(1,)])
        with patch("api.routes.admin.psycopg2.connect", return_value=conn) as connect:
            response = client.post("/api/admin/query", json={"sql": "select 1 as n"})
        assert response.status_code == 200
        assert connect.call_args.args[0] == TEST_DSN
        conn.set_session.assert_called_once_with(readonly=True, autocommit=False)
        conn.rollback.assert_called_once()
        conn.close.assert_called_once()

    def test_query_runs_in_a_server_side_cursor(self, client):
        conn, query = fake_connection([column("n")], [(1,)])
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            client.post("/api/admin/query", json={"sql": "select 1 as n;  "})
        assert any(call.kwargs.get("name") for call in conn.cursor.call_args_list)
        query.execute.assert_called_once_with("select 1 as n")  # trailing ; would break DECLARE

    def test_returns_columns_and_rows(self, client):
        conn, _ = fake_connection([column("id"), column("name")], [(1, "Luna"), (2, "Max")])
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "select id, name from animals"})
        assert response.json() == {"columns": ["id", "name"], "rows": [[1, "Luna"], [2, "Max"]], "row_count": 2, "truncated": False}

    def test_truncates_at_limit(self, client):
        conn, query = fake_connection([column("n")], [(1,), (2,), (3,)])
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "select n", "limit": 2})
        body = response.json()
        query.fetchmany.assert_called_once_with(3)
        assert body["rows"] == [[1], [2]]
        assert body["truncated"] is True

    def test_limit_above_max_is_rejected(self, client):
        response = client.post("/api/admin/query", json={"sql": "select 1", "limit": 5001})
        assert response.status_code == 422

    def test_sql_error_is_a_400_and_still_rolls_back(self, client):
        conn, _ = fake_connection(error=psycopg2.errors.InsufficientPrivilege("permission denied for table animals"))
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "select * from animals"})
        assert response.status_code == 400
        assert "permission denied" in response.json()["detail"]
        conn.rollback.assert_called_once()

    def test_failed_rollback_does_not_mask_the_error(self, client):
        conn, _ = fake_connection(error=psycopg2.OperationalError("server closed the connection"))
        conn.rollback.side_effect = psycopg2.InterfaceError("connection already closed")
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "select 1"})
        assert response.status_code == 400
        assert "server closed" in response.json()["detail"]
        conn.close.assert_called_once()

    def test_role_that_can_write_is_refused(self, client):
        conn, query = fake_connection([column("n")], [(1,)], can_write=True)
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "select 1"})
        assert response.status_code == 503
        query.execute.assert_not_called()  # the user's SQL never ran
        conn.close.assert_called_once()

    def test_unreachable_database_is_a_503(self, client):
        with patch("api.routes.admin.psycopg2.connect", side_effect=psycopg2.OperationalError("timeout")):
            response = client.post("/api/admin/query", json={"sql": "select 1"})
        assert response.status_code == 503


RO_ROLE = "admin_query_test_ro"
RO_TABLES = "organizations, animals"


def _drop_readonly_role(cur) -> None:
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (RO_ROLE,))
    if cur.fetchone() is None:
        return
    # Explicit revokes rather than DROP OWNED BY, which needs superuser.
    cur.execute(f"REVOKE ALL ON {RO_TABLES} FROM {RO_ROLE}")
    cur.execute(f"REVOKE ALL ON SCHEMA public FROM {RO_ROLE}")
    cur.execute(f"REVOKE ALL ON DATABASE test_rescue_dogs FROM {RO_ROLE}")
    cur.execute(f"DROP ROLE {RO_ROLE}")


@pytest.fixture
def readonly_role_dsn():
    """A role set up like claude_ro (scripts/sql/create_claude_ro.sql) in the test database."""
    admin = psycopg2.connect(TEST_DSN)
    admin.autocommit = True
    with admin.cursor() as cur:
        cur.execute("SELECT rolsuper OR rolcreaterole FROM pg_roles WHERE rolname = current_user")
        if not cur.fetchone()[0]:
            admin.close()
            pytest.skip("test database user can't create roles (CI's can)")
        _drop_readonly_role(cur)  # left over from an interrupted run
        cur.execute(f"CREATE ROLE {RO_ROLE} LOGIN PASSWORD 'ro'")
        cur.execute(f"ALTER ROLE {RO_ROLE} SET default_transaction_read_only = on")
        cur.execute(f"GRANT CONNECT ON DATABASE test_rescue_dogs TO {RO_ROLE}")
        cur.execute(f"GRANT USAGE ON SCHEMA public TO {RO_ROLE}")
        cur.execute(f"GRANT SELECT ON {RO_TABLES} TO {RO_ROLE}")
        # Postgres 14 and older let every role create in public (15+ don't);
        # the endpoint rightly refuses such a role, so match production here.
        cur.execute("SELECT has_schema_privilege('public', 'public', 'CREATE')")
        public_could_create = cur.fetchone()[0]
        if public_could_create:
            cur.execute("REVOKE CREATE ON SCHEMA public FROM PUBLIC")
    try:
        yield f"postgresql://{RO_ROLE}:ro@localhost:5432/test_rescue_dogs"
    finally:
        with admin.cursor() as cur:
            if public_could_create:
                cur.execute("GRANT CREATE ON SCHEMA public TO PUBLIC")
            _drop_readonly_role(cur)
        admin.close()


def _organization_snapshot():
    conn = psycopg2.connect(TEST_DSN)
    with conn.cursor() as cur:
        cur.execute("SELECT count(*), coalesce(max(id), 0), (SELECT last_value FROM organizations_id_seq) FROM organizations")
        snapshot = cur.fetchone()
    conn.close()
    return snapshot


@pytest.mark.database
@pytest.mark.integration
class TestAdminQueryDatabase:
    """Against the real test database."""

    def test_reads_rows(self, client, readonly_role_dsn):
        with patch.dict(os.environ, {"READONLY_DATABASE_URL": readonly_role_dsn}):
            response = client.post("/api/admin/query", json={"sql": "select 1 as one, current_user as who;"})
        assert response.status_code == 200
        assert response.json()["rows"] == [[1, RO_ROLE]]

    def test_large_result_is_fetched_only_up_to_the_limit(self, client, readonly_role_dsn):
        with patch.dict(os.environ, {"READONLY_DATABASE_URL": readonly_role_dsn}):
            response = client.post("/api/admin/query", json={"sql": "select g from generate_series(1, 5000000) g", "limit": 3})
        assert response.status_code == 200
        assert response.json() == {"columns": ["g"], "rows": [[1], [2], [3]], "row_count": 3, "truncated": True}

    @pytest.mark.parametrize(
        "sql",
        [
            "insert into organizations (name, website_url) values ('x', 'https://x.test')",
            "update organizations set name = name",
            "create table admin_query_probe (x int)",
            # Statement stacking, to escape the read-only transaction.
            "commit; set default_transaction_read_only = off; delete from organizations",
            # Writes hidden inside a SELECT.
            "with gone as (delete from organizations returning id) select * from gone",
            "select nextval('organizations_id_seq')",
        ],
    )
    def test_refuses_writes(self, client, readonly_role_dsn, sql):
        before = _organization_snapshot()
        with patch.dict(os.environ, {"READONLY_DATABASE_URL": readonly_role_dsn}):
            response = client.post("/api/admin/query", json={"sql": sql})
        assert response.status_code == 400
        assert _organization_snapshot() == before

    def test_owner_url_is_refused_before_running_anything(self, client):
        # TEST_DSN owns the tables: the misconfiguration this guard exists for.
        response = client.post("/api/admin/query", json={"sql": "select nextval('organizations_id_seq')"})
        assert response.status_code == 503
        assert "misconfigured" in response.json()["detail"]
