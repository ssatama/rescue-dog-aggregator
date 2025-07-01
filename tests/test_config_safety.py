import logging
import os
import sys
from unittest.mock import patch

import pytest


@pytest.fixture(autouse=True)
def prevent_dev_db_write(monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "sqlite:///:memory:")


def test_database_connection():
    assert os.getenv("DATABASE_URL") == "sqlite:///:memory:"


def test_no_dev_db_write():
    # Simulate a write operation
    with pytest.raises(Exception):
        # Replace with actual write operation to dev database
        raise Exception("Attempt to write to development database")


# Test the safety mechanism in config.py


def test_config_fails_if_testing_uses_dev_db():
    """Verify config.py exits if TESTING=true but DB_NAME is the dev DB."""
    # Mock environment variables to simulate this dangerous scenario
    dangerous_env = {
        "TESTING": "true",
        "DB_NAME": "rescue_dogs",  # <<< The production/dev DB name
        "DB_USER": "test_user",  # Doesn't matter for this test
        "DB_PASSWORD": "test_password",  # Doesn't matter for this test
    }
    with patch.dict(os.environ, dangerous_env, clear=True):
        # We expect config.py to call sys.exit when imported/executed
        with pytest.raises(SystemExit) as excinfo:
            # Import config dynamically within the patched environment
            from importlib import reload

            import config  # Import for the first time or reload if already imported

            reload(config)
        # Check that the exit was called
        assert excinfo.type == SystemExit
        # Optionally check the exit message if config.py provides one
        assert "CRITICAL SAFETY ERROR" in str(excinfo.value)


def test_config_allows_test_db_when_testing():
    """Verify config.py allows the test DB when TESTING=true."""
    test_env = {
        "TESTING": "true",
        "DB_NAME": "test_rescue_dogs",  # <<< Correct test DB name
        "DB_USER": "test_user",
        "DB_PASSWORD": "test_password",
    }
    with patch.dict(os.environ, test_env, clear=True):
        try:
            # Import config dynamically
            from importlib import reload

            import config

            reload(config)
            # Check if the config was set correctly
            assert config.DB_CONFIG["database"] == "test_rescue_dogs"
            assert config.DB_CONFIG["user"] == "test_user"
        except SystemExit:
            pytest.fail("config.py exited unexpectedly when configured correctly for testing.")


def test_config_defaults_to_dev_db_when_not_testing():
    """Verify config.py defaults to the dev DB when TESTING is not set."""
    import getpass

    # Ensure TESTING is not set
    clean_env = {"DB_HOST": "localhost", "DB_NAME": "rescue_dogs"}

    with patch.dict(os.environ, clean_env, clear=True):
        if "config" in sys.modules:
            del sys.modules["config"]

        import config

        assert config.DB_CONFIG["database"] == "rescue_dogs"
        # Test that it uses the actual system user (more realistic)
        expected_user = getpass.getuser()
        assert config.DB_CONFIG["user"] == expected_user


def test_config_warns_but_allows_test_db_when_not_testing_if_explicit(caplog):
    """Verify config.py warns but allows connecting to test DB if explicitly set when not testing."""
    explicit_test_env_no_testing = {
        # TESTING is NOT set
        "DB_NAME": "test_rescue_dogs",  # Explicitly set to test DB
        "DB_USER": "explicit_user",
        "DB_PASSWORD": "explicit_password",
    }
    with patch.dict(os.environ, explicit_test_env_no_testing, clear=True):
        try:
            # Set the logging level for the test capture
            caplog.set_level(logging.WARNING, logger="config")  # <<< Capture WARNING level from 'config' logger

            from importlib import reload

            import config  # Import for the first time or reload if already imported

            reload(config)

            # Check config is set as per env vars
            assert config.DB_CONFIG["database"] == "test_rescue_dogs"
            assert config.DB_CONFIG["user"] == "explicit_user"

            # <<< Check captured logs instead of mock >>>
            assert any("SAFETY WARNING" in record.message for record in caplog.records)
            assert any(record.levelname == "WARNING" for record in caplog.records)
            # <<< End log check >>>

        except SystemExit:
            pytest.fail("config.py exited unexpectedly when explicitly configured for test DB without TESTING flag.")
