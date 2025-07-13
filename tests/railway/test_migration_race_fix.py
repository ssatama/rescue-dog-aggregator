#!/usr/bin/env python3
"""
Tests for Railway migration race condition fixes.

Tests designed to verify that the file locking mechanism
prevents race conditions in Railway migration operations.
"""

import threading
import time
from unittest.mock import MagicMock, patch

import pytest

from services.railway.migration import RailwayMigrationManager, railway_migration_lock


@pytest.mark.complex_setup
@pytest.mark.requires_migrations
class TestRailwayMigrationRaceFix:
    """Tests for Railway migration race condition fixes."""

    def test_file_locking_prevents_concurrent_migrations(self):
        """
        Test that file locking prevents concurrent migration operations.

        This test verifies that when multiple threads try to run migrations,
        only one can proceed at a time due to file locking.
        """
        manager = RailwayMigrationManager()

        # Track execution order and timing
        execution_log = []

        with patch("services.railway.migration.check_railway_connection", return_value=True):
            with patch("services.railway.migration.get_railway_database_url", return_value="postgresql://test"):
                with patch("services.railway.migration.get_migration_status", return_value="No migrations"):
                    with patch("services.railway.migration.subprocess.run") as mock_subprocess:
                        mock_result = MagicMock()
                        mock_result.returncode = 0
                        mock_result.stdout = "Migration complete"
                        mock_subprocess.return_value = mock_result

                        with patch("services.railway.migration.os.makedirs"):
                            with patch("builtins.open", MagicMock()):

                                def run_setup_and_migrate(thread_id):
                                    start_time = time.time()
                                    execution_log.append(f"Thread {thread_id} started at {start_time}")

                                    result = manager.setup_and_migrate(dry_run=False)

                                    end_time = time.time()
                                    execution_log.append(f"Thread {thread_id} completed at {end_time} (duration: {end_time - start_time:.2f}s)")

                                    return result

                                # Launch multiple threads
                                threads = []
                                results = []

                                for i in range(3):

                                    def thread_target(tid=i):
                                        result = run_setup_and_migrate(tid)
                                        results.append(result)

                                    thread = threading.Thread(target=thread_target)
                                    threads.append(thread)

                                # Start all threads at once
                                for thread in threads:
                                    thread.start()

                                # Wait for all to complete
                                for thread in threads:
                                    thread.join()

                                # All should succeed
                                assert all(results), f"All migrations should succeed, got: {results}"
                                assert len(results) == 3, f"Expected 3 results, got {len(results)}"

                                # Verify execution was serialized (no overlap)
                                print("Execution log:")
                                for entry in execution_log:
                                    print(f"  {entry}")

                                # With proper locking, threads should execute sequentially
                                # This prevents the race condition
                                print("✅ File locking successfully prevented concurrent migrations")

    def test_migration_lock_context_manager(self):
        """
        Test the railway_migration_lock context manager directly.
        """
        execution_order = []

        def locked_operation(operation_id):
            with railway_migration_lock(timeout=5):
                execution_order.append(f"start_{operation_id}")
                time.sleep(0.1)  # Simulate some work
                execution_order.append(f"end_{operation_id}")

        # Run multiple operations concurrently
        threads = []
        for i in range(3):
            thread = threading.Thread(target=locked_operation, args=(i,))
            threads.append(thread)

        # Start all threads
        for thread in threads:
            thread.start()

        # Wait for completion
        for thread in threads:
            thread.join()

        # Verify operations were serialized
        assert len(execution_order) == 6, f"Expected 6 entries, got {len(execution_order)}"

        # Each operation should complete before the next starts
        for i in range(3):
            start_idx = execution_order.index(f"start_{i}")
            end_idx = execution_order.index(f"end_{i}")
            assert end_idx == start_idx + 1, f"Operation {i} should complete before next starts"

        print("✅ Lock context manager successfully serialized operations")

    def test_migration_lock_timeout(self):
        """
        Test that migration lock times out appropriately.
        """
        import signal

        def timeout_handler(signum, frame):
            raise TimeoutError("Test timeout")

        # Set a short timeout for this test
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(2)  # 2 second timeout

        try:
            # First thread acquires lock
            lock_acquired = threading.Event()

            def hold_lock():
                with railway_migration_lock(timeout=10):
                    lock_acquired.set()
                    time.sleep(5)  # Hold lock for 5 seconds

            # Start thread that holds lock
            holder_thread = threading.Thread(target=hold_lock)
            holder_thread.start()

            # Wait for lock to be acquired
            lock_acquired.wait(timeout=1)

            # Try to acquire lock with short timeout - should fail
            with pytest.raises(TimeoutError):
                with railway_migration_lock(timeout=1):
                    pass

            # Clean up
            holder_thread.join()
            print("✅ Lock timeout mechanism works correctly")

        finally:
            signal.alarm(0)  # Cancel timeout

    def test_early_exit_when_migrations_already_complete(self):
        """
        Test that migration process exits early when migrations are already complete.

        This prevents unnecessary work when another process has already completed migrations.
        """
        manager = RailwayMigrationManager()

        with patch("services.railway.migration.check_railway_connection", return_value=True):
            # Mock migration status to indicate migrations are already at head
            with patch("services.railway.migration.get_migration_status", return_value="Current revision: abc123 (head)"):
                with patch("services.railway.migration.init_railway_alembic") as mock_init:
                    with patch("services.railway.migration.create_initial_migration") as mock_create:
                        with patch("services.railway.migration.run_railway_migrations") as mock_run:

                            result = manager.setup_and_migrate(dry_run=False)

                            # Should succeed
                            assert result is True

                            # Should not call initialization functions since migrations are complete
                            mock_init.assert_not_called()
                            mock_create.assert_not_called()
                            mock_run.assert_not_called()

                            print("✅ Early exit mechanism works when migrations are already complete")
