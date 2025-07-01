from unittest.mock import MagicMock, mock_open, patch

import psycopg2
import pytest
from psycopg2 import errors

from database.db_setup import add_organization, connect_to_database, create_tables, initialize_database, setup_initial_data


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.integration
class TestDatabaseSetup:
    """Test database setup functionality that's critical for system operation."""

    @patch("database.db_setup.DB_CONFIG", {"host": "localhost", "user": "test", "database": "test_db", "password": "test_pass"})
    @patch("database.db_setup.psycopg2.connect")
    def test_connect_to_database_success(self, mock_connect):
        """Test successful database connection with all parameters."""
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn

        result = connect_to_database()

        mock_connect.assert_called_once_with(host="localhost", user="test", database="test_db", password="test_pass")
        assert result == mock_conn

    @patch("database.db_setup.DB_CONFIG", {"host": "localhost", "user": "test", "database": "test_db", "password": ""})
    @patch("database.db_setup.psycopg2.connect")
    def test_connect_to_database_no_password(self, mock_connect):
        """Test database connection without password (peer authentication)."""
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn

        result = connect_to_database()

        # Should not include password parameter when empty
        mock_connect.assert_called_once_with(host="localhost", user="test", database="test_db")
        assert result == mock_conn

    @patch("database.db_setup.DB_CONFIG", {"host": "localhost", "user": "test", "database": "nonexistent_db", "password": ""})
    @patch("database.db_setup.psycopg2.connect")
    def test_connect_to_database_nonexistent_db(self, mock_connect):
        """Test handling of nonexistent database - critical for production deployment."""
        mock_connect.side_effect = psycopg2.OperationalError('database "nonexistent_db" does not exist')

        with pytest.raises(psycopg2.OperationalError):
            connect_to_database()

    @patch("database.db_setup.DB_CONFIG", {"host": "localhost", "user": "test", "database": "test_db", "password": ""})
    @patch("database.db_setup.psycopg2.connect")
    def test_connect_to_database_connection_refused(self, mock_connect):
        """Test handling of connection refused - critical for service availability."""
        mock_connect.side_effect = psycopg2.OperationalError("connection refused")

        with pytest.raises(psycopg2.OperationalError):
            connect_to_database()

    @patch("builtins.open", mock_open(read_data="CREATE TABLE test (id SERIAL PRIMARY KEY);"))
    @patch("database.db_setup.os.path.join")
    def test_create_tables_success(self, mock_join):
        """Test successful table creation from schema.sql."""
        mock_join.return_value = "/fake/path/schema.sql"
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor

        result = create_tables(mock_conn)

        mock_cursor.execute.assert_called_once_with("CREATE TABLE test (id SERIAL PRIMARY KEY);")
        mock_conn.commit.assert_called_once()
        mock_cursor.close.assert_called_once()
        assert result is True

    def test_create_tables_duplicate_table_handling(self):
        """Test graceful handling of existing tables - prevents production deployment failures."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = errors.DuplicateTable("relation already exists")

        with patch("builtins.open", mock_open(read_data="CREATE TABLE test (id SERIAL);")):
            with patch("database.db_setup.os.path.join", return_value="/fake/schema.sql"):
                result = create_tables(mock_conn)

        mock_conn.rollback.assert_called_once()
        mock_cursor.close.assert_called_once()
        assert result is True

    def test_create_tables_sql_error(self):
        """Test handling of SQL errors during table creation - prevents data corruption."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.execute.side_effect = psycopg2.Error("SQL syntax error")

        with patch("builtins.open", mock_open(read_data="INVALID SQL;")):
            with patch("database.db_setup.os.path.join", return_value="/fake/schema.sql"):
                with pytest.raises(psycopg2.Error):
                    create_tables(mock_conn)

        mock_conn.rollback.assert_called_once()
        mock_cursor.close.assert_called_once()

    def test_create_tables_missing_schema_file(self):
        """Test handling of missing schema.sql file - prevents silent deployment failures."""
        mock_conn = MagicMock()

        with patch("builtins.open", side_effect=FileNotFoundError("schema.sql not found")):
            with patch("database.db_setup.os.path.join", return_value="/fake/schema.sql"):
                with pytest.raises(FileNotFoundError):
                    create_tables(mock_conn)

    @patch("database.db_setup.create_tables")
    @patch("database.db_setup.connect_to_database")
    def test_initialize_database_success(self, mock_connect, mock_create_tables):
        """Test successful database initialization."""
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn
        mock_create_tables.return_value = True

        result = initialize_database()

        mock_connect.assert_called_once()
        mock_create_tables.assert_called_once_with(mock_conn)
        assert result == mock_conn

    @patch("database.db_setup.create_tables")
    @patch("database.db_setup.connect_to_database")
    def test_initialize_database_connection_failure(self, mock_connect, mock_create_tables):
        """Test handling of connection failure during initialization."""
        mock_connect.side_effect = psycopg2.OperationalError("connection failed")

        result = initialize_database()

        mock_create_tables.assert_not_called()
        assert result is None

    @patch("database.db_setup.create_tables")
    @patch("database.db_setup.connect_to_database")
    def test_initialize_database_schema_failure(self, mock_connect, mock_create_tables):
        """Test handling of schema creation failure during initialization."""
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn
        mock_create_tables.return_value = False

        result = initialize_database()

        assert result is None

    def test_add_organization_success(self):
        """Test successful organization addition."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None  # Organization doesn't exist

        result = add_organization(
            mock_conn, name="Test Org", website_url="https://test.com", description="Test description", country="Test Country", city="Test City", logo_url="https://test.com/logo.png"
        )

        # Verify it checks for existing organization first
        mock_cursor.execute.assert_any_call("SELECT id FROM organizations WHERE name = %s", ("Test Org",))

        # Verify it inserts the new organization
        insert_call = mock_cursor.execute.call_args_list[1]
        assert "INSERT INTO organizations" in insert_call[0][0]
        assert insert_call[0][1] == ("Test Org", "https://test.com", "Test description", "Test Country", "Test City", "https://test.com/logo.png")

        mock_conn.commit.assert_called_once()
        mock_cursor.close.assert_called_once()
        assert result is True

    def test_add_organization_already_exists(self):
        """Test handling of duplicate organization - prevents data corruption."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = (123,)  # Organization exists with ID 123

        result = add_organization(mock_conn, name="Existing Org", website_url="https://existing.com")

        # Should only execute the SELECT, not the INSERT
        assert mock_cursor.execute.call_count == 1
        mock_conn.commit.assert_not_called()
        mock_cursor.close.assert_called_once()
        assert result is True

    def test_add_organization_no_connection(self):
        """Test handling of invalid connection - prevents silent failures."""
        result = add_organization(None, name="Test Org", website_url="https://test.com")

        assert result is False

    def test_add_organization_database_error(self):
        """Test handling of database errors during organization addition."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        mock_cursor.fetchone.return_value = None
        mock_cursor.execute.side_effect = [None, psycopg2.Error("Database error")]

        result = add_organization(mock_conn, name="Test Org", website_url="https://test.com")

        mock_conn.rollback.assert_called_once()
        assert result is False

    @patch("database.db_setup.add_organization")
    @patch("database.db_setup.initialize_database")
    def test_setup_initial_data_success(self, mock_initialize, mock_add_org):
        """Test successful initial data setup - critical for first deployment."""
        mock_conn = MagicMock()
        mock_initialize.return_value = mock_conn
        mock_add_org.return_value = True

        result = setup_initial_data()

        mock_initialize.assert_called_once()
        mock_add_org.assert_called_once_with(
            conn=mock_conn,
            name="Pets in Turkey",
            website_url="https://www.petsinturkey.org",
            description="Rescue organization based in Turkey, focusing on dogs and cats.",
            country="Turkey",
            city=None,
            logo_url="https://images.squarespace-cdn.com/content/v1/60b0c58c51e13d5e3d1d1b3f/8566a85a-9b80-4c46-8a1a-969a30f11092/PIT+LOGO+ROUND+TRANSPARENT+BG.png?format=1500w",
        )
        mock_conn.close.assert_called_once()
        assert result is True

    @patch("database.db_setup.add_organization")
    @patch("database.db_setup.initialize_database")
    def test_setup_initial_data_initialization_failure(self, mock_initialize, mock_add_org):
        """Test handling of initialization failure during setup."""
        mock_initialize.return_value = None

        result = setup_initial_data()

        mock_add_org.assert_not_called()
        assert result is False

    @patch("database.db_setup.add_organization")
    @patch("database.db_setup.initialize_database")
    def test_setup_initial_data_organization_failure(self, mock_initialize, mock_add_org):
        """Test handling of organization addition failure during setup."""
        mock_conn = MagicMock()
        mock_initialize.return_value = mock_conn
        mock_add_org.return_value = False

        result = setup_initial_data()

        mock_conn.close.assert_called_once()
        assert result is False

    @patch("database.db_setup.add_organization")
    @patch("database.db_setup.initialize_database")
    def test_setup_initial_data_exception_handling(self, mock_initialize, mock_add_org):
        """Test exception handling during initial data setup."""
        mock_conn = MagicMock()
        mock_initialize.return_value = mock_conn
        mock_add_org.side_effect = Exception("Unexpected error")

        result = setup_initial_data()

        mock_conn.close.assert_called_once()
        assert result is False
