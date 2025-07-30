from contextlib import contextmanager
from unittest.mock import MagicMock, Mock, patch

import pytest

from management.services.database_service import DatabaseConfig, DatabaseService


@pytest.mark.integration
@pytest.mark.management
@pytest.mark.database
@pytest.mark.slow
class TestDatabaseService:
    """Test suite for DatabaseService following TDD methodology."""

    def test_database_service_creation(self):
        """Test DatabaseService can be created with configuration."""
        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password="test_pass")
        service = DatabaseService(config)
        assert service.config == config

    def test_database_service_creation_without_password(self):
        """Test DatabaseService works with no password configured."""
        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password=None)
        service = DatabaseService(config)
        assert service.config == config

    @patch("management.services.database_service.psycopg2")
    def test_get_connection_success(self, mock_psycopg2):
        """Test successful database connection creation."""
        mock_connection = Mock()
        mock_psycopg2.connect.return_value = mock_connection

        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password="test_pass")
        service = DatabaseService(config)

        connection = service.get_connection()

        mock_psycopg2.connect.assert_called_once_with(host="localhost", user="test_user", database="test_db", password="test_pass")
        assert connection == mock_connection

    @patch("management.services.database_service.psycopg2")
    def test_get_connection_no_password(self, mock_psycopg2):
        """Test connection creation without password."""
        mock_connection = Mock()
        mock_psycopg2.connect.return_value = mock_connection

        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password=None)
        service = DatabaseService(config)

        connection = service.get_connection()

        mock_psycopg2.connect.assert_called_once_with(host="localhost", user="test_user", database="test_db")
        assert connection == mock_connection

    @patch("management.services.database_service.psycopg2")
    def test_get_connection_error_handling(self, mock_psycopg2):
        """Test database connection error handling."""
        mock_psycopg2.connect.side_effect = Exception("Connection failed")

        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password="test_pass")
        service = DatabaseService(config)

        with pytest.raises(Exception, match="Connection failed"):
            service.get_connection()

    @patch("management.services.database_service.psycopg2")
    def test_context_manager_success(self, mock_psycopg2):
        """Test DatabaseService as context manager with successful operation."""
        mock_connection = Mock()
        mock_psycopg2.connect.return_value = mock_connection

        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password="test_pass")
        service = DatabaseService(config)

        with service as connection:
            assert connection == mock_connection

        mock_connection.close.assert_called_once()

    @patch("management.services.database_service.psycopg2")
    def test_context_manager_exception_handling(self, mock_psycopg2):
        """Test context manager properly closes connection on exception."""
        mock_connection = Mock()
        mock_psycopg2.connect.return_value = mock_connection

        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password="test_pass")
        service = DatabaseService(config)

        with pytest.raises(ValueError):
            with service as connection:
                raise ValueError("Test exception")

        mock_connection.close.assert_called_once()

    @patch("management.services.database_service.psycopg2")
    def test_execute_query_success(self, mock_psycopg2):
        """Test successful query execution."""
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.fetchall.return_value = [("result1",), ("result2",)]
        mock_psycopg2.connect.return_value = mock_connection

        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password="test_pass")
        service = DatabaseService(config)

        result = service.execute_query("SELECT * FROM test_table")

        mock_cursor.execute.assert_called_once_with("SELECT * FROM test_table", None)
        mock_cursor.fetchall.assert_called_once()
        assert result == [("result1",), ("result2",)]
        mock_cursor.close.assert_called_once()
        mock_connection.close.assert_called_once()

    @patch("management.services.database_service.psycopg2")
    def test_execute_command_success(self, mock_psycopg2):
        """Test successful command execution with commit."""
        mock_connection = Mock()
        mock_cursor = Mock()
        mock_connection.cursor.return_value = mock_cursor
        mock_cursor.rowcount = 1
        mock_psycopg2.connect.return_value = mock_connection

        config = DatabaseConfig(host="localhost", user="test_user", database="test_db", password="test_pass")
        service = DatabaseService(config)

        result = service.execute_command("INSERT INTO test_table VALUES (%s)", ("value",))

        mock_cursor.execute.assert_called_once_with("INSERT INTO test_table VALUES (%s)", ("value",))
        mock_connection.commit.assert_called_once()
        assert result == 1
        mock_cursor.close.assert_called_once()
        mock_connection.close.assert_called_once()
