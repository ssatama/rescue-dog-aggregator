#!/usr/bin/env python3
"""
Resource leak tests for Railway connection management.

Tests designed to catch resource leaks that could cause
connection pool exhaustion in production.
"""

import gc
from unittest.mock import MagicMock, patch

import pytest

from services.railway.connection import get_railway_engine, get_railway_session


@pytest.mark.unit
class TestRailwayConnectionLeaks:
    """Resource leak tests for Railway connection management."""

    def test_engine_creation_leak_in_get_railway_session(self):
        """
        Test that verifies engine reuse prevents resource leaks.

        After the fix, engines should be cached and reused instead of
        creating new ones for each session.
        """
        # Clear any cached engine first
        from services.railway.connection import dispose_railway_engine

        dispose_railway_engine()

        with patch("services.railway.connection.get_railway_database_url") as mock_url:
            mock_url.return_value = "postgresql://user:pass@host:5432/db"

            # Track created engines
            created_engines = []

            with patch("services.railway.connection.create_engine") as mock_create_engine:

                def track_engine_creation(*args, **kwargs):
                    engine = MagicMock()
                    created_engines.append(engine)
                    return engine

                mock_create_engine.side_effect = track_engine_creation

                # Create multiple sessions - with fix, this should reuse engines
                sessions = []
                for i in range(10):
                    session = get_railway_session()
                    sessions.append(session)

                # With the fix, only 1 engine should be created and reused
                assert len(created_engines) == 1, f"Expected 1 engine (reused), got {len(created_engines)} - caching working correctly"

                # Clean up sessions
                for session in sessions:
                    if hasattr(session, "close"):
                        session.close()

    def test_proper_engine_reuse_prevents_leaks(self):
        """
        Test that proper engine reuse prevents resource leaks.

        This test will PASS once we implement engine caching.
        """
        with patch("services.railway.connection.get_railway_database_url") as mock_url:
            mock_url.return_value = "postgresql://user:pass@host:5432/db"

            # After fix, engines should be reused
            engines_created = []

            with patch("services.railway.connection.create_engine") as mock_create_engine:
                mock_engine = MagicMock()
                mock_create_engine.return_value = mock_engine
                engines_created.append(mock_engine)

                # Create multiple sessions
                sessions = []
                for i in range(10):
                    session = get_railway_session()
                    sessions.append(session)

                # With proper caching, create_engine should be called only once
                # Currently this will fail, after fix it should pass
                assert mock_create_engine.call_count <= 1, f"Expected 1 engine creation, got {mock_create_engine.call_count}"

                # Clean up
                for session in sessions:
                    if hasattr(session, "close"):
                        session.close()

    def test_connection_context_manager_cleanup(self):
        """
        Test that connection context managers properly clean up resources.
        """
        from services.railway.connection import RailwayConnectionManager

        with patch("services.railway.connection.get_railway_session") as mock_get_session:
            mock_session = MagicMock()
            mock_get_session.return_value = mock_session

            # Test normal operation
            with RailwayConnectionManager() as session:
                assert session == mock_session

            # Verify cleanup was called
            mock_session.commit.assert_called_once()
            mock_session.close.assert_called_once()

            # Test exception handling
            mock_session.reset_mock()

            try:
                with RailwayConnectionManager() as session:
                    raise ValueError("Test exception")
            except ValueError:
                pass

            # Verify rollback and cleanup on exception
            mock_session.rollback.assert_called_once()
            mock_session.close.assert_called_once()
            mock_session.commit.assert_not_called()
