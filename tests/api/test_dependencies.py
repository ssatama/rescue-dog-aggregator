"""
Test suite for api/dependencies.py

Tests database connection dependencies, error handling, and connection lifecycle.
"""

from unittest.mock import MagicMock, patch

import psycopg2
import pytest
from fastapi import HTTPException

from api.dependencies import get_database_connection, get_db_cursor


@pytest.mark.api
@pytest.mark.database
@pytest.mark.slow
class TestGetDbCursor:
    """Test suite for get_db_cursor dependency."""

    @patch("api.dependencies.psycopg2.connect")
    def test_get_db_cursor_success(self, mock_connect):
        """Test successful database cursor creation and cleanup."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        generator = get_db_cursor()
        cursor = next(generator)

        assert cursor == mock_cursor
        mock_connect.assert_called_once()
        mock_conn.cursor.assert_called_once()

        # Trigger cleanup
        try:
            next(generator)
        except StopIteration:
            pass

        mock_conn.commit.assert_called_once()
        mock_cursor.close.assert_called_once()
        mock_conn.close.assert_called_once()

    @patch("api.dependencies.psycopg2.connect")
    def test_get_db_cursor_psycopg2_error(self, mock_connect):
        """Test handling of psycopg2.Error during connection."""
        mock_connect.side_effect = psycopg2.OperationalError("Connection failed")

        generator = get_db_cursor()

        with pytest.raises(HTTPException) as exc_info:
            next(generator)

        assert exc_info.value.status_code == 500
        assert "Database dependency error" in exc_info.value.detail
        assert "Connection failed" in exc_info.value.detail

    @patch("api.dependencies.psycopg2.connect")
    def test_get_db_cursor_unexpected_error(self, mock_connect):
        """Test handling of unexpected errors during connection."""
        mock_connect.side_effect = ValueError("Unexpected error")

        generator = get_db_cursor()

        with pytest.raises(HTTPException) as exc_info:
            next(generator)

        assert exc_info.value.status_code == 500
        assert "Internal server error in dependency" in exc_info.value.detail
        assert "ValueError: Unexpected error" in exc_info.value.detail

    @patch("api.dependencies.psycopg2.connect")
    def test_get_db_cursor_rollback_on_error(self, mock_connect):
        """Test rollback is called when connection exists but error occurs during commit."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        # Simulate error during commit phase
        mock_conn.commit.side_effect = psycopg2.Error("Commit failed")

        generator = get_db_cursor()
        cursor = next(generator)

        # Trigger cleanup that should rollback due to commit error
        with pytest.raises(HTTPException):
            try:
                next(generator)
            except StopIteration:
                pass

        mock_conn.rollback.assert_called_once()

    @patch("api.dependencies.psycopg2.connect")
    def test_get_db_cursor_http_exception_handling(self, mock_connect):
        """Test HTTPException is re-raised without wrapping."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        generator = get_db_cursor()
        cursor = next(generator)

        # Simulate HTTPException being raised
        original_exception = HTTPException(status_code=404, detail="Not found")

        with pytest.raises(HTTPException) as exc_info:
            # Simulate the dependency raising an HTTPException
            mock_conn.commit.side_effect = original_exception
            try:
                next(generator)
            except StopIteration:
                pass

        # Should re-raise the original HTTPException
        assert exc_info.value.status_code == 404
        assert exc_info.value.detail == "Not found"
        mock_conn.rollback.assert_called_once()

    @patch("api.dependencies.psycopg2.connect")
    @patch("api.dependencies.DB_CONFIG", {"host": "localhost", "user": "test", "database": "test_db", "password": ""})
    def test_get_db_cursor_no_password(self, mock_connect):
        """Test connection without password parameter."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        generator = get_db_cursor()
        cursor = next(generator)

        # Verify password is not included in connection params when empty
        mock_connect.assert_called_once_with(host="localhost", user="test", database="test_db")
        assert cursor == mock_cursor

    @patch("api.dependencies.psycopg2.connect")
    @patch("api.dependencies.DB_CONFIG", {"host": "localhost", "user": "test", "database": "test_db", "password": "secret"})
    def test_get_db_cursor_with_password(self, mock_connect):
        """Test connection with password parameter."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor

        generator = get_db_cursor()
        cursor = next(generator)

        # Verify password is included in connection params
        mock_connect.assert_called_once_with(host="localhost", user="test", database="test_db", password="secret")
        assert cursor == mock_cursor

    @patch("api.dependencies.psycopg2.connect")
    def test_get_db_cursor_connection_timeout(self, mock_connect):
        """Test handling of connection timeout."""
        mock_connect.side_effect = psycopg2.OperationalError("connection timed out")

        generator = get_db_cursor()

        with pytest.raises(HTTPException) as exc_info:
            next(generator)

        assert exc_info.value.status_code == 500
        assert "Database dependency error" in exc_info.value.detail
        assert "connection timed out" in exc_info.value.detail

    @patch("api.dependencies.psycopg2.connect")
    def test_get_db_cursor_invalid_credentials(self, mock_connect):
        """Test handling of invalid credentials."""
        mock_connect.side_effect = psycopg2.OperationalError("authentication failed")

        generator = get_db_cursor()

        with pytest.raises(HTTPException) as exc_info:
            next(generator)

        assert exc_info.value.status_code == 500
        assert "Database dependency error" in exc_info.value.detail
        assert "authentication failed" in exc_info.value.detail


class TestGetDatabaseConnection:
    """Test suite for get_database_connection dependency."""

    @patch("api.dependencies.psycopg2.connect")
    def test_get_database_connection_success(self, mock_connect):
        """Test successful database connection creation and cleanup."""
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn

        generator = get_database_connection()
        connection = next(generator)

        assert connection == mock_conn
        mock_connect.assert_called_once()

        # Trigger cleanup
        try:
            next(generator)
        except StopIteration:
            pass

        mock_conn.commit.assert_called_once()
        mock_conn.close.assert_called_once()

    @patch("api.dependencies.psycopg2.connect")
    def test_get_database_connection_psycopg2_error(self, mock_connect):
        """Test handling of psycopg2.Error during connection."""
        mock_connect.side_effect = psycopg2.DatabaseError("Database error")

        generator = get_database_connection()

        with pytest.raises(HTTPException) as exc_info:
            next(generator)

        assert exc_info.value.status_code == 500
        assert "Database dependency error" in exc_info.value.detail
        assert "Database error" in exc_info.value.detail

    @patch("api.dependencies.psycopg2.connect")
    def test_get_database_connection_unexpected_error(self, mock_connect):
        """Test handling of unexpected errors during connection."""
        mock_connect.side_effect = RuntimeError("Runtime error")

        generator = get_database_connection()

        with pytest.raises(HTTPException) as exc_info:
            next(generator)

        assert exc_info.value.status_code == 500
        assert "Internal server error in dependency" in exc_info.value.detail
        assert "RuntimeError: Runtime error" in exc_info.value.detail

    @patch("api.dependencies.psycopg2.connect")
    def test_get_database_connection_rollback_on_error(self, mock_connect):
        """Test rollback is called when connection exists but error occurs."""
        mock_conn = MagicMock()
        mock_connect.return_value = mock_conn

        # Simulate error after connection is established
        mock_conn.commit.side_effect = psycopg2.Error("Commit failed")

        generator = get_database_connection()
        connection = next(generator)

        with pytest.raises(HTTPException):
            try:
                next(generator)
            except StopIteration:
                pass

        mock_conn.rollback.assert_called_once()
