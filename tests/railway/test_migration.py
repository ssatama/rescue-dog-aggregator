import os
from unittest.mock import MagicMock, mock_open, patch

import pytest

from services.railway.migration import RailwayMigrationManager, create_initial_migration, get_migration_status, init_railway_alembic, run_railway_migrations


@pytest.mark.unit
class TestRailwayMigration:

    def test_init_railway_alembic_creates_structure(self):
        with patch("os.makedirs") as mock_makedirs:
            with patch("builtins.open", mock_open()) as mock_file:
                result = init_railway_alembic()

                assert result is True
                mock_makedirs.assert_called()
                mock_file.assert_called()

    def test_init_railway_alembic_handles_existing_directory(self):
        with patch("os.makedirs", side_effect=FileExistsError()):
            with patch("builtins.open", mock_open()) as mock_file:
                result = init_railway_alembic()

                assert result is True
                mock_file.assert_called()

    def test_create_initial_migration_success(self):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "Migration created successfully"

            with patch("services.railway.migration.Path") as mock_path:
                # Mock migration file creation
                mock_versions_dir = MagicMock()
                mock_migration_file = MagicMock()
                mock_migration_file.stat.return_value.st_mtime = 1234567890
                mock_versions_dir.glob.return_value = [mock_migration_file]
                mock_path.return_value = mock_versions_dir

                with patch("builtins.open", MagicMock()):
                    result = create_initial_migration()

            assert result is True
            mock_run.assert_called_once()

            call_args = mock_run.call_args[0][0]
            assert "alembic" in call_args
            assert "revision" in call_args
            assert "-m" in call_args

    def test_create_initial_migration_failure(self):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 1
            mock_run.return_value.stderr = "Migration failed"

            result = create_initial_migration()

            assert result is False

    def test_run_railway_migrations_success(self):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = "Migration applied successfully"

            result = run_railway_migrations()

            assert result is True
            mock_run.assert_called_once()

            call_args = mock_run.call_args[0][0]
            assert "alembic" in call_args
            assert "upgrade" in call_args
            assert "head" in call_args

    def test_run_railway_migrations_failure(self):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 1
            mock_run.return_value.stderr = "Migration failed"

            result = run_railway_migrations()

            assert result is False

    def test_run_railway_migrations_with_target(self):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0

            result = run_railway_migrations(target_revision="abc123")

            assert result is True
            call_args = mock_run.call_args[0][0]
            assert "abc123" in call_args

    def test_get_migration_status_success(self):
        mock_output = """
        Current revision(s) for postgresql://...:
        abc123def (head)
        
        Rev: abc123def
        Parent: <base>
        Path: migrations/railway/versions/abc123def_initial.py
        """

        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = mock_output

            status = get_migration_status()

            assert status is not None
            assert "abc123def" in status

    def test_get_migration_status_failure(self):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 1
            mock_run.return_value.stderr = "Connection failed"

            status = get_migration_status()

            assert status is None

    def test_railway_migration_manager_full_workflow(self):
        with patch("services.railway.migration.check_railway_connection") as mock_check:
            with patch("services.railway.migration.get_migration_status") as mock_status:
                with patch("services.railway.migration.init_railway_alembic") as mock_init:
                    with patch("services.railway.migration.create_initial_migration") as mock_create:
                        with patch("services.railway.migration.run_railway_migrations") as mock_run:
                            with patch("services.railway.migration.Path") as mock_path:
                                mock_check.return_value = True
                                mock_status.return_value = "No migrations"  # Not completed
                                mock_init.return_value = True
                                mock_create.return_value = True
                                mock_run.return_value = True

                                # Mock no existing migration files
                                mock_versions_dir = MagicMock()
                                mock_versions_dir.glob.return_value = []  # No existing files
                                mock_path.return_value = mock_versions_dir

                                manager = RailwayMigrationManager()
                                result = manager.setup_and_migrate()

                                assert result is True
                                mock_check.assert_called_once()
                                mock_init.assert_called_once()
                                mock_create.assert_called_once()
                                mock_run.assert_called_once()

    def test_railway_migration_manager_connection_failure(self):
        with patch("services.railway.migration.check_railway_connection") as mock_check:
            mock_check.return_value = False

            manager = RailwayMigrationManager()
            result = manager.setup_and_migrate()

            assert result is False
            mock_check.assert_called_once()

    def test_railway_migration_manager_init_failure(self):
        with patch("services.railway.migration.check_railway_connection") as mock_check:
            with patch("services.railway.migration.get_migration_status") as mock_status:
                with patch("services.railway.migration.init_railway_alembic") as mock_init:
                    mock_check.return_value = True
                    mock_status.return_value = "No migrations"  # Not completed
                    mock_init.return_value = False

                    manager = RailwayMigrationManager()
                    result = manager.setup_and_migrate()

                    assert result is False

    def test_railway_migration_manager_dry_run(self):
        with patch("services.railway.migration.check_railway_connection") as mock_check:
            with patch("services.railway.migration.get_migration_status") as mock_status:
                mock_check.return_value = True
                mock_status.return_value = "Current status info"

                manager = RailwayMigrationManager()
                result = manager.setup_and_migrate(dry_run=True)

                assert result is True
                mock_check.assert_called_once()
                mock_status.assert_called_once()


@pytest.mark.complex_setup
@pytest.mark.requires_migrations
class TestRailwayMigrationIntegration:

    def test_migration_environment_setup(self):
        test_url = "postgresql://user:pass@host:5432/db"

        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("os.path.exists") as mock_exists:
                with patch("builtins.open", mock_open()) as mock_file:
                    mock_exists.return_value = False

                    result = init_railway_alembic()

                    assert result is True

                    written_content = "".join(call.args[0] for call in mock_file().write.call_args_list)
                    # The implementation uses a placeholder "test" and dynamically gets URL at runtime
                    assert "sqlalchemy.url = test" in written_content
                    assert "get_url()" in written_content

    def test_migration_with_custom_message(self):
        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0

            result = create_initial_migration(message="Custom migration message")

            assert result is True
            call_args = mock_run.call_args[0][0]
            assert "Custom migration message" in call_args

    def test_migration_directory_validation(self):
        with patch("os.path.exists") as mock_exists:
            mock_exists.return_value = False

            with patch("os.makedirs") as mock_makedirs:
                with patch("builtins.open", mock_open()):
                    result = init_railway_alembic()

                    assert result is True
                    mock_makedirs.assert_called()

    def test_migration_status_parsing(self):
        complex_output = """
        INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
        INFO  [alembic.runtime.migration] Will assume transactional DDL.
        Current revision(s) for postgresql://user:pass@host:5432/db:
        abc123def456 (head)
        
        Rev: abc123def456
        Parent: <base>
        Path: migrations/railway/versions/abc123def456_initial_railway_schema.py
        
        Some additional output here...
        """

        with patch("subprocess.run") as mock_run:
            mock_run.return_value.returncode = 0
            mock_run.return_value.stdout = complex_output

            status = get_migration_status()

            assert status is not None
            assert "abc123def456" in status
            assert "initial_railway_schema" in status
