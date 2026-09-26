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
    cursor = MagicMock()
    cursor.description = description
    cursor.fetchone.return_value = (can_write,)
    cursor.fetchmany.return_value = list(rows)
    if error:
        # The first execute is the role's write-privilege check.
        cursor.execute.side_effect = [None, error]
    conn = MagicMock()
    conn.cursor.return_value.__enter__.return_value = cursor
    return conn, cursor


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

    def test_returns_columns_and_rows(self, client):
        conn, _ = fake_connection([column("id"), column("name")], [(1, "Luna"), (2, "Max")])
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "select id, name from animals"})
        assert response.json() == {"columns": ["id", "name"], "rows": [[1, "Luna"], [2, "Max"]], "row_count": 2, "truncated": False}

    def test_truncates_at_limit(self, client):
        conn, cursor = fake_connection([column("n")], [(1,), (2,), (3,)])
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "select n", "limit": 2})
        body = response.json()
        cursor.fetchmany.assert_called_once_with(3)
        assert body["rows"] == [[1], [2]]
        assert body["truncated"] is True

    def test_limit_above_max_is_rejected(self, client):
        response = client.post("/api/admin/query", json={"sql": "select 1", "limit": 5001})
        assert response.status_code == 422

    def test_sql_error_is_a_400_and_still_rolls_back(self, client):
        conn, _ = fake_connection(error=psycopg2.errors.InsufficientPrivilege("permission denied for table animals"))
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "delete from animals"})
        assert response.status_code == 400
        assert "permission denied" in response.json()["detail"]
        conn.rollback.assert_called_once()

    def test_role_that_can_write_is_refused(self, client):
        conn, cursor = fake_connection([column("n")], [(1,)], can_write=True)
        with patch("api.routes.admin.psycopg2.connect", return_value=conn):
            response = client.post("/api/admin/query", json={"sql": "select 1"})
        assert response.status_code == 503
        assert cursor.execute.call_count == 1  # the user's SQL never ran
        conn.close.assert_called_once()

    def test_unreachable_database_is_a_503(self, client):
        with patch("api.routes.admin.psycopg2.connect", side_effect=psycopg2.OperationalError("timeout")):
            response = client.post("/api/admin/query", json={"sql": "select 1"})
        assert response.status_code == 503


RO_ROLE = "admin_query_test_ro"


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
        if _role_exists(cur):  # left over from an interrupted run
            cur.execute(f"DROP OWNED BY {RO_ROLE}")
            cur.execute(f"DROP ROLE {RO_ROLE}")
        cur.execute(f"CREATE ROLE {RO_ROLE} LOGIN PASSWORD 'ro'")
        cur.execute(f"ALTER ROLE {RO_ROLE} SET default_transaction_read_only = on")
        cur.execute(f"GRANT CONNECT ON DATABASE test_rescue_dogs TO {RO_ROLE}")
        cur.execute(f"GRANT USAGE ON SCHEMA public TO {RO_ROLE}")
        cur.execute(f"GRANT SELECT ON ALL TABLES IN SCHEMA public TO {RO_ROLE}")
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
            cur.execute(f"DROP OWNED BY {RO_ROLE}")
            cur.execute(f"DROP ROLE {RO_ROLE}")
        admin.close()


def _role_exists(cur) -> bool:
    cur.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (RO_ROLE,))
    return cur.fetchone() is not None


@pytest.mark.database
@pytest.mark.integration
class TestAdminQueryDatabase:
    """Against the real test database."""

    def test_reads_rows(self, client, readonly_role_dsn):
        with patch.dict(os.environ, {"READONLY_DATABASE_URL": readonly_role_dsn}):
            response = client.post("/api/admin/query", json={"sql": "select 1 as one, current_user as who"})
        assert response.status_code == 200
        assert response.json()["rows"] == [[1, RO_ROLE]]

    @pytest.mark.parametrize(
        "sql",
        [
            "create table admin_query_probe (x int)",
            "update organizations set name = name",
            # A read-only session can be switched back; the role's grants still refuse.
            "begin; set transaction read write; update organizations set name = name; commit",
            "set transaction read write; create table admin_query_probe (x int); commit",
        ],
    )
    def test_refuses_writes(self, client, readonly_role_dsn, sql):
        with patch.dict(os.environ, {"READONLY_DATABASE_URL": readonly_role_dsn}):
            response = client.post("/api/admin/query", json={"sql": sql})
        assert response.status_code == 400
        assert "permission denied" in response.json()["detail"] or "read-only" in response.json()["detail"]

    def test_owner_url_is_refused_before_running_anything(self, client):
        # TEST_DSN owns the tables: the misconfiguration this guard exists for.
        response = client.post(
            "/api/admin/query",
            json={"sql": "begin; set transaction read write; create table admin_query_probe (x int); commit"},
        )
        assert response.status_code == 503
        admin = psycopg2.connect(TEST_DSN)
        with admin.cursor() as cur:
            cur.execute("SELECT to_regclass('public.admin_query_probe')")
            assert cur.fetchone()[0] is None
        admin.close()
