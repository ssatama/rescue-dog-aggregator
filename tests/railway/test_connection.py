import os
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

from services.railway.connection import RailwayConnectionManager, check_railway_connection, get_railway_engine, get_railway_session


@pytest.mark.unit
class TestRailwayConnection:

    def test_get_railway_engine_with_valid_url(self):
        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            engine = get_railway_engine()
            assert engine is not None
            assert str(engine.url).startswith("postgresql://")

    def test_get_railway_engine_missing_url_raises_error(self):
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(ValueError, match="RAILWAY_DATABASE_URL environment variable not set"):
                get_railway_engine()

    def test_get_railway_engine_invalid_url_raises_error(self):
        invalid_url = "not-a-database-url"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": invalid_url}):
            with pytest.raises(ValueError, match="Invalid database URL format"):
                get_railway_engine()

    def test_get_railway_session_returns_session(self):
        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("services.railway.connection.get_railway_engine") as mock_engine:
                mock_engine.return_value = MagicMock()
                session = get_railway_session()
                assert session is not None

    def test_check_railway_connection_success(self):
        with patch("services.railway.connection.get_railway_engine") as mock_engine:
            mock_engine.return_value.connect.return_value.__enter__.return_value.execute.return_value = True

            result = check_railway_connection()
            assert result is True

    def test_check_railway_connection_failure(self):
        with patch("services.railway.connection.get_railway_engine") as mock_engine:
            mock_engine.return_value.connect.side_effect = OperationalError("Connection failed", "", "")

            result = check_railway_connection()
            assert result is False

    def test_railway_connection_manager_context(self):
        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("services.railway.connection.get_railway_session") as mock_session:
                mock_session_instance = MagicMock()
                mock_session.return_value = mock_session_instance

                with RailwayConnectionManager() as session:
                    assert session == mock_session_instance

                mock_session_instance.close.assert_called_once()

    def test_railway_connection_manager_handles_exception(self):
        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("services.railway.connection.get_railway_session") as mock_session:
                mock_session_instance = MagicMock()
                mock_session.return_value = mock_session_instance

                with pytest.raises(ValueError):
                    with RailwayConnectionManager() as session:
                        raise ValueError("Test exception")

                mock_session_instance.rollback.assert_called_once()
                mock_session_instance.close.assert_called_once()

    def test_connection_with_custom_timeout(self):
        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url, "RAILWAY_CONNECTION_TIMEOUT": "60"}):
            with patch("services.railway.connection.create_engine") as mock_create_engine:
                get_railway_engine()

                mock_create_engine.assert_called_once()
                call_args = mock_create_engine.call_args
                assert call_args[1]["connect_args"]["connect_timeout"] == 60

    def test_connection_with_default_timeout(self):
        # Clear cache to ensure fresh engine creation
        from services.railway.connection import dispose_railway_engine

        dispose_railway_engine()

        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}, clear=True):
            with patch("services.railway.connection.create_engine") as mock_create_engine:
                get_railway_engine()

                mock_create_engine.assert_called_once()
                call_args = mock_create_engine.call_args
                assert call_args[1]["connect_args"]["connect_timeout"] == 30

    def test_connection_pool_configuration(self):
        # Clear cache to ensure fresh engine creation
        from services.railway.connection import dispose_railway_engine

        dispose_railway_engine()

        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("services.railway.connection.create_engine") as mock_create_engine:
                get_railway_engine()

                mock_create_engine.assert_called_once()
                call_args = mock_create_engine.call_args
                assert call_args[1]["pool_size"] == 5
                assert call_args[1]["max_overflow"] == 10
                assert call_args[1]["pool_timeout"] == 30


@pytest.mark.complex_setup
@pytest.mark.requires_migrations
class TestRailwayConnectionIntegration:

    def test_connection_manager_with_real_operations(self):
        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("services.railway.connection.get_railway_session") as mock_session:
                mock_session_instance = MagicMock()
                mock_session.return_value = mock_session_instance

                manager = RailwayConnectionManager()

                with manager as session:
                    session.execute("SELECT 1")

                mock_session_instance.execute.assert_called_with("SELECT 1")
                mock_session_instance.commit.assert_called_once()
                mock_session_instance.close.assert_called_once()
