import pytest
from unittest.mock import patch, MagicMock
from utils.db import connect_to_database


class TestDatabaseUtils:
    @patch("utils.db.psycopg2")
    def test_connect_to_database_success(self, mock_psycopg2):
        """Test successful database connection."""
        # Setup mock
        mock_conn = MagicMock()
        mock_psycopg2.connect.return_value = mock_conn

        # Call the function
        result = connect_to_database()

        # Verify connect was called with correct parameters
        mock_psycopg2.connect.assert_called_once()
        call_args = mock_psycopg2.connect.call_args[1]

        # Check connection parameters
        assert "host" in call_args
        assert "user" in call_args
        assert "database" in call_args

        # Verify return value
        assert result == mock_conn

    @patch("utils.db.psycopg2")
    def test_connect_to_database_with_password(self, mock_psycopg2):
        """Test database connection with password."""
        # Setup mock
        mock_conn = MagicMock()
        mock_psycopg2.connect.return_value = mock_conn

        # Patch DB_CONFIG to include a password
        with patch(
            "utils.db.DB_CONFIG",
            {
                "host": "localhost",
                "user": "test_user",
                "database": "test_db",
                "password": "test_password",
            },
        ):
            # Call the function
            result = connect_to_database()

            # Verify connect was called with password
            call_args = mock_psycopg2.connect.call_args[1]
            assert "password" in call_args
            assert call_args["password"] == "test_password"

    @patch("utils.db.psycopg2")
    def test_connect_to_database_without_password(self, mock_psycopg2):
        """Test database connection without password."""
        # Setup mock
        mock_conn = MagicMock()
        mock_psycopg2.connect.return_value = mock_conn

        # Patch DB_CONFIG to exclude password
        with patch(
            "utils.db.DB_CONFIG",
            {
                "host": "localhost",
                "user": "test_user",
                "database": "test_db",
                "password": "",  # Empty password
            },
        ):
            # Call the function
            result = connect_to_database()

            # Verify connect was called without password
            call_args = mock_psycopg2.connect.call_args[1]
            assert "password" not in call_args

    @patch("utils.db.psycopg2")
    def test_connect_to_database_error(self, mock_psycopg2):
        """Test error handling in database connection."""
        # Setup mock to raise exception
        mock_psycopg2.connect.side_effect = Exception("Connection failed")

        # Call the function
        result = connect_to_database()

        # Verify error is handled and None is returned
        assert result is None
