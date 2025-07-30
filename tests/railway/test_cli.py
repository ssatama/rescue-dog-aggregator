import os
from unittest.mock import MagicMock, call, patch

import pytest
from click.testing import CliRunner

from management.railway_commands import migrate, railway_cli, setup, status, sync, test_connection


@pytest.mark.unit
class TestRailwayCliCommands:

    def setup_method(self):
        self.runner = CliRunner()

    def test_test_connection_success(self):
        test_url = "postgresql://user:pass@host:5432/db"
        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("management.railway_commands.check_railway_connection") as mock_check:
                mock_check.return_value = True

                result = self.runner.invoke(test_connection)

                assert result.exit_code == 0
                assert "Railway connection successful" in result.output
                mock_check.assert_called_once()

    def test_test_connection_failure(self):
        test_url = "postgresql://user:pass@host:5432/db"
        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("management.railway_commands.check_railway_connection") as mock_check:
                mock_check.return_value = False

                result = self.runner.invoke(test_connection)

                assert result.exit_code == 1
                assert "Railway connection failed" in result.output

    def test_test_connection_missing_env(self):
        with patch.dict(os.environ, {}, clear=True):
            result = self.runner.invoke(test_connection)

            assert result.exit_code == 1
            assert "RAILWAY_DATABASE_URL environment variable not set" in result.output

    def test_migrate_success(self):
        with patch("management.railway_commands.RailwayMigrationManager") as mock_manager_class:
            mock_manager = MagicMock()
            mock_manager.setup_and_migrate.return_value = True
            mock_manager_class.return_value = mock_manager

            result = self.runner.invoke(migrate)

            assert result.exit_code == 0
            assert "Railway database migration completed successfully" in result.output
            mock_manager.setup_and_migrate.assert_called_once_with(dry_run=False)

    def test_migrate_dry_run(self):
        with patch("management.railway_commands.RailwayMigrationManager") as mock_manager_class:
            mock_manager = MagicMock()
            mock_manager.setup_and_migrate.return_value = True
            mock_manager_class.return_value = mock_manager

            result = self.runner.invoke(migrate, ["--dry-run"])

            assert result.exit_code == 0
            assert "Railway migration dry run completed" in result.output
            mock_manager.setup_and_migrate.assert_called_once_with(dry_run=True)

    def test_migrate_failure(self):
        with patch("management.railway_commands.RailwayMigrationManager") as mock_manager_class:
            mock_manager = MagicMock()
            mock_manager.setup_and_migrate.return_value = False
            mock_manager_class.return_value = mock_manager

            result = self.runner.invoke(migrate)

            assert result.exit_code == 1
            assert "Railway database migration failed" in result.output

    def test_sync_success(self):
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer_class:
            mock_syncer = MagicMock()
            mock_syncer.perform_full_sync.return_value = True
            mock_syncer_class.return_value = mock_syncer

            result = self.runner.invoke(sync)

            assert result.exit_code == 0
            assert "Railway data sync completed successfully" in result.output
            mock_syncer.perform_full_sync.assert_called_once_with(dry_run=False, validate_after=True, sync_mode="incremental")

    def test_sync_dry_run(self):
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer_class:
            mock_syncer = MagicMock()
            mock_syncer.perform_full_sync.return_value = True
            mock_syncer_class.return_value = mock_syncer

            result = self.runner.invoke(sync, ["--dry-run"])

            assert result.exit_code == 0
            assert "Railway sync dry run completed" in result.output
            mock_syncer.perform_full_sync.assert_called_once_with(dry_run=True, validate_after=True, sync_mode="incremental")

    def test_sync_no_validation(self):
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer_class:
            mock_syncer = MagicMock()
            mock_syncer.perform_full_sync.return_value = True
            mock_syncer_class.return_value = mock_syncer

            result = self.runner.invoke(sync, ["--skip-validation"])

            assert result.exit_code == 0
            mock_syncer.perform_full_sync.assert_called_once_with(dry_run=False, validate_after=False, sync_mode="incremental")

    def test_sync_failure(self):
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer_class:
            mock_syncer = MagicMock()
            mock_syncer.perform_full_sync.return_value = False
            mock_syncer_class.return_value = mock_syncer

            result = self.runner.invoke(sync)

            assert result.exit_code == 1
            assert "Railway data sync failed" in result.output

    def test_status_success(self):
        with patch("management.railway_commands.get_local_data_count") as mock_local:
            with patch("management.railway_commands.get_railway_data_count") as mock_railway:
                with patch("management.railway_commands.check_railway_connection") as mock_check:
                    mock_check.return_value = True
                    # Mock all tables: organizations, animals, animal_images, scrape_logs, service_regions
                    mock_local.side_effect = [7, 850, 100, 50, 5]
                    mock_railway.side_effect = [7, 850, 100, 50, 5]

                    result = self.runner.invoke(status)

                    assert result.exit_code == 0
                    assert "Railway Connection: ✓ Connected" in result.output
                    assert "Organizations: 7" in result.output
                    assert "Animals: 850" in result.output

    def test_status_connection_failure(self):
        with patch("management.railway_commands.check_railway_connection") as mock_check:
            mock_check.return_value = False

            result = self.runner.invoke(status)

            assert result.exit_code == 0
            assert "Railway Connection: ✗ Failed" in result.output

    def test_status_data_mismatch(self):
        with patch("management.railway_commands.get_local_data_count") as mock_local:
            with patch("management.railway_commands.get_railway_data_count") as mock_railway:
                with patch("management.railway_commands.check_railway_connection") as mock_check:
                    mock_check.return_value = True
                    # Mock all tables: organizations, animals, animal_images, scrape_logs, service_regions
                    mock_local.side_effect = [7, 850, 100, 50, 5]
                    mock_railway.side_effect = [7, 800, 100, 50, 5]  # Different animal count

                    result = self.runner.invoke(status)

                    assert result.exit_code == 0
                    assert "⚠ Data mismatch detected" in result.output

    def test_setup_success(self):
        with patch("management.railway_commands.RailwayMigrationManager") as mock_migration:
            with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
                mock_migration_instance = MagicMock()
                mock_migration_instance.setup_and_migrate.return_value = True
                mock_migration.return_value = mock_migration_instance

                mock_syncer_instance = MagicMock()
                mock_syncer_instance.perform_full_sync.return_value = True
                mock_syncer.return_value = mock_syncer_instance

                result = self.runner.invoke(setup)

                assert result.exit_code == 0
                assert "Railway setup completed successfully" in result.output
                mock_migration_instance.setup_and_migrate.assert_called_once()
                mock_syncer_instance.perform_full_sync.assert_called_once()

    def test_setup_migration_failure(self):
        with patch("management.railway_commands.RailwayMigrationManager") as mock_migration:
            mock_migration_instance = MagicMock()
            mock_migration_instance.setup_and_migrate.return_value = False
            mock_migration.return_value = mock_migration_instance

            result = self.runner.invoke(setup)

            assert result.exit_code == 1
            assert "Railway migration failed during setup" in result.output

    def test_setup_sync_failure(self):
        with patch("management.railway_commands.RailwayMigrationManager") as mock_migration:
            with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
                mock_migration_instance = MagicMock()
                mock_migration_instance.setup_and_migrate.return_value = True
                mock_migration.return_value = mock_migration_instance

                mock_syncer_instance = MagicMock()
                mock_syncer_instance.perform_full_sync.return_value = False
                mock_syncer.return_value = mock_syncer_instance

                result = self.runner.invoke(setup)

                assert result.exit_code == 1
                assert "Railway data sync failed during setup" in result.output

    def test_setup_dry_run(self):
        with patch("management.railway_commands.RailwayMigrationManager") as mock_migration:
            with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
                mock_migration_instance = MagicMock()
                mock_migration_instance.setup_and_migrate.return_value = True
                mock_migration.return_value = mock_migration_instance

                mock_syncer_instance = MagicMock()
                mock_syncer_instance.perform_full_sync.return_value = True
                mock_syncer.return_value = mock_syncer_instance

                result = self.runner.invoke(setup, ["--dry-run"])

                assert result.exit_code == 0
                assert "Railway setup dry run completed" in result.output
                mock_migration_instance.setup_and_migrate.assert_called_once_with(dry_run=True)
                mock_syncer_instance.perform_full_sync.assert_called_once_with(dry_run=True, validate_after=True, sync_mode="incremental")


@pytest.mark.unit
class TestRailwayCliGroup:

    def setup_method(self):
        self.runner = CliRunner()

    def test_railway_cli_help(self):
        result = self.runner.invoke(railway_cli, ["--help"])

        assert result.exit_code == 0
        assert "Railway database management commands" in result.output
        assert "setup" in result.output
        assert "migrate" in result.output
        assert "sync" in result.output
        assert "status" in result.output
        assert "test-connection" in result.output

    def test_railway_cli_subcommand_execution(self):
        test_url = "postgresql://user:pass@host:5432/db"
        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("management.railway_commands.check_railway_connection") as mock_check:
                mock_check.return_value = True

                result = self.runner.invoke(railway_cli, ["test-connection"])

                assert result.exit_code == 0
                assert "Railway connection successful" in result.output

    def test_railway_cli_invalid_subcommand(self):
        result = self.runner.invoke(railway_cli, ["invalid-command"])

        assert result.exit_code != 0


@pytest.mark.unit
class TestRailwayCliIntegration:

    def setup_method(self):
        self.runner = CliRunner()

    def test_railway_workflow_integration(self):
        """Test complete Railway setup workflow"""
        test_url = "postgresql://user:pass@host:5432/db"
        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("management.railway_commands.check_railway_connection") as mock_check:
                with patch("management.railway_commands.RailwayMigrationManager") as mock_migration:
                    with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
                        # Setup mocks
                        mock_check.return_value = True

                        mock_migration_instance = MagicMock()
                        mock_migration_instance.setup_and_migrate.return_value = True
                        mock_migration.return_value = mock_migration_instance

                        mock_syncer_instance = MagicMock()
                        mock_syncer_instance.perform_full_sync.return_value = True
                        mock_syncer.return_value = mock_syncer_instance

                        # Test connection
                        result = self.runner.invoke(railway_cli, ["test-connection"])
                        assert result.exit_code == 0

                        # Test migration
                        result = self.runner.invoke(railway_cli, ["migrate"])
                        assert result.exit_code == 0

                        # Test sync
                        result = self.runner.invoke(railway_cli, ["sync"])
                        assert result.exit_code == 0

                        # Test status
                        with patch("management.railway_commands.get_local_data_count") as mock_local:
                            with patch("management.railway_commands.get_railway_data_count") as mock_railway:
                                # Mock all tables: organizations, animals, animal_images, scrape_logs, service_regions
                                mock_local.side_effect = [5, 100, 20, 10, 2]
                                mock_railway.side_effect = [5, 100, 20, 10, 2]

                                result = self.runner.invoke(railway_cli, ["status"])
                                assert result.exit_code == 0

    def test_railway_environment_validation(self):
        """Test environment variable validation"""
        with patch.dict(os.environ, {}, clear=True):
            # All commands should handle missing environment gracefully
            commands_expecting_error = ["test-connection", "migrate", "sync"]
            status_command = ["status"]

            # These commands should fail with missing env var
            for cmd in commands_expecting_error:
                result = self.runner.invoke(railway_cli, [cmd])
                assert "RAILWAY_DATABASE_URL" in result.output or result.exit_code == 1

            # Status command should handle missing env gracefully
            result = self.runner.invoke(railway_cli, ["status"])
            assert result.exit_code == 0  # Status exits gracefully
            assert "Railway Connection: ✗" in result.output  # Shows connection failed

    def test_railway_error_handling(self):
        """Test error handling across commands"""
        test_url = "postgresql://user:pass@host:5432/db"
        with patch.dict(os.environ, {"RAILWAY_DATABASE_URL": test_url}):
            with patch("management.railway_commands.check_railway_connection") as mock_check:
                # Simulate connection failure
                mock_check.side_effect = Exception("Connection error")

                result = self.runner.invoke(railway_cli, ["test-connection"])
                assert result.exit_code == 1
                assert "Error testing Railway connection" in result.output


@pytest.mark.unit
class TestRailwaySyncModes:
    """Test CLI sync mode functionality."""

    def setup_method(self):
        self.runner = CliRunner()

    def test_sync_incremental_mode_default(self):
        """Test sync defaults to incremental mode."""
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
            mock_syncer_instance = MagicMock()
            mock_syncer_instance.perform_full_sync.return_value = True
            mock_syncer.return_value = mock_syncer_instance

            result = self.runner.invoke(sync)

            assert result.exit_code == 0
            # Should call perform_full_sync with default incremental mode
            mock_syncer_instance.perform_full_sync.assert_called_once_with(dry_run=False, validate_after=True, sync_mode="incremental")

    def test_sync_incremental_mode_explicit(self):
        """Test sync with explicit incremental mode."""
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
            mock_syncer_instance = MagicMock()
            mock_syncer_instance.perform_full_sync.return_value = True
            mock_syncer.return_value = mock_syncer_instance

            result = self.runner.invoke(sync, ["--mode", "incremental"])

            assert result.exit_code == 0
            mock_syncer_instance.perform_full_sync.assert_called_once_with(dry_run=False, validate_after=True, sync_mode="incremental")

    def test_sync_rebuild_mode_success(self):
        """Test sync with rebuild mode."""
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
            mock_syncer_instance = MagicMock()
            mock_syncer_instance.perform_full_sync.return_value = True
            mock_syncer.return_value = mock_syncer_instance

            result = self.runner.invoke(sync, ["--mode", "rebuild", "--confirm-destructive"])

            assert result.exit_code == 0
            mock_syncer_instance.perform_full_sync.assert_called_once_with(dry_run=False, validate_after=True, sync_mode="rebuild")

    def test_sync_rebuild_mode_without_confirmation(self):
        """Test sync rebuild mode requires confirmation."""
        result = self.runner.invoke(sync, ["--mode", "rebuild"])

        assert result.exit_code == 1
        assert "Rebuild mode requires --confirm-destructive flag" in result.output

    def test_sync_force_mode_success(self):
        """Test sync with force mode."""
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
            mock_syncer_instance = MagicMock()
            mock_syncer_instance.perform_full_sync.return_value = True
            mock_syncer.return_value = mock_syncer_instance

            result = self.runner.invoke(sync, ["--mode", "force", "--confirm-destructive"])

            assert result.exit_code == 0
            mock_syncer_instance.perform_full_sync.assert_called_once_with(dry_run=False, validate_after=True, sync_mode="force")

    def test_sync_force_mode_without_confirmation(self):
        """Test sync force mode requires confirmation."""
        result = self.runner.invoke(sync, ["--mode", "force"])

        assert result.exit_code == 1
        assert "Force mode requires --confirm-destructive flag" in result.output

    def test_sync_invalid_mode(self):
        """Test sync with invalid mode."""
        result = self.runner.invoke(sync, ["--mode", "invalid"])

        assert result.exit_code == 2  # Click validation error
        assert "Invalid value for '--mode'" in result.output

    def test_sync_dry_run_with_modes(self):
        """Test sync dry run works with all modes."""
        with patch("management.railway_commands.RailwayDataSyncer") as mock_syncer:
            mock_syncer_instance = MagicMock()
            mock_syncer_instance.perform_full_sync.return_value = True
            mock_syncer.return_value = mock_syncer_instance

            # Test dry run with rebuild mode
            result = self.runner.invoke(sync, ["--mode", "rebuild", "--confirm-destructive", "--dry-run"])

            assert result.exit_code == 0
            mock_syncer_instance.perform_full_sync.assert_called_once_with(dry_run=True, validate_after=True, sync_mode="rebuild")
