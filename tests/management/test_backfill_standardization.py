"""
Tests for backfill_standardization management command.

Following TDD approach - tests written before implementation.
"""

from unittest.mock import MagicMock, patch

import pytest

# Import will fail initially (TDD)
from management.backfill_standardization import StandardizationBackfillService


class TestStandardizationBackfillService:
    """Test suite for StandardizationBackfillService."""

    @pytest.fixture
    def service(self):
        """Create service instance for testing."""
        return StandardizationBackfillService()

    @pytest.fixture
    def mock_connection(self):
        """Create mock database connection."""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_conn.cursor.return_value = mock_cursor
        return mock_conn, mock_cursor

    def test_service_initialization(self, service):
        """Test service initializes with correct attributes."""
        assert service.conn is None
        assert hasattr(service, "standardizer")
        assert service.standardizer is not None

    def test_connect_success(self, service):
        """Test successful database connection."""
        with patch("management.backfill_standardization.psycopg2.connect") as mock_connect:
            mock_connect.return_value = MagicMock()

            result = service.connect()

            assert result is True
            assert service.conn is not None
            mock_connect.assert_called_once()

    def test_connect_failure(self, service):
        """Test database connection failure handling."""
        with patch("management.backfill_standardization.psycopg2.connect") as mock_connect:
            mock_connect.side_effect = Exception("Connection failed")

            result = service.connect()

            assert result is False
            assert service.conn is None

    def test_fix_lurchers_query(self, service, mock_connection):
        """Test fix_lurchers finds correct dogs to update."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        # Mock Lurcher dogs that need fixing (7 fields returned)
        mock_cursor.fetchall.return_value = [
            (1, "Max", "Lurcher", None, "Unknown", "3 years", "Medium"),
            (2, "Bella", "Lurcher Mix", None, "Unknown", "2 years", "Large"),
            (3, "Charlie", "Lurcher Cross", None, "Unknown", "5 years", "Medium"),
        ]

        result = service.get_lurchers_to_fix()

        # Verify correct SQL query
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        assert "breed ilike '%lurcher%'" in query.lower()
        assert "breed_group" in query.lower()
        assert "'unknown'" in query.lower() or "is null" in query.lower()

        assert len(result) == 3
        assert result[0][2] == "Lurcher"

    def test_fix_staffordshire_query(self, service, mock_connection):
        """Test fix_staffordshire finds correct dogs to update."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        # Mock Staffordshire dogs that need fixing
        mock_cursor.fetchall.return_value = [
            (4, "Rocky", "Staffy", "Staffy", "Terrier"),
            (5, "Luna", "Staffie Mix", "Staffie Mix", "Terrier"),
            (6, "Duke", "Staff", "Staff", "Terrier"),
        ]

        result = service.get_staffordshires_to_fix()

        # Verify correct SQL query
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        assert "breed" in query.lower()
        assert "staff" in query.lower()

        assert len(result) == 3

    def test_update_animal_standardization(self, service, mock_connection):
        """Test updating a single animal's standardization fields."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        standardized_data = {
            "breed": "German Shepherd Dog",
            "breed_category": "Herding",
            "breed_group": "Herding",
            "standardized_size": "Large",
        }

        result = service.update_animal_standardization(1, standardized_data)

        assert result is True
        mock_cursor.execute.assert_called_once()

        # Verify UPDATE query structure
        query = mock_cursor.execute.call_args[0][0]
        assert "UPDATE animals" in query
        assert "SET" in query
        assert "standardized_breed" in query
        # Field was renamed from breed_category to breed_group
        assert "breed_group" in query
        # Note: age_category is NOT updated in the UPDATE query, only breed fields

    def test_fix_lurchers_processing(self, service, mock_connection):
        """Test fix_lurchers processes all Lurcher breeds correctly."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        # Mock data
        lurchers = [
            (1, "Max", "Lurcher", None, "Unknown", "3 years", "Medium"),
            (2, "Bella", "Lurcher Mix", None, "Unknown", "2 years", "Large"),
        ]

        with patch.object(service, "get_lurchers_to_fix", return_value=lurchers):
            with patch.object(service, "update_animal_standardization", return_value=True) as mock_update:
                with patch.object(service.standardizer, "apply_full_standardization") as mock_standardize:
                    # Mock standardization to return Hound group - use actual field names from apply_full_standardization
                    mock_standardize.return_value = {
                        "breed": "Lurcher",
                        "breed_category": "Hound",
                        "breed_group": "Hound",
                        "standardized_size": "Large",
                        "breed_confidence": 0.95,
                        "breed_type": "sighthound",
                        "primary_breed": "Lurcher",
                        "secondary_breed": None,
                    }

                    stats = service.fix_lurchers(dry_run=False)

                    assert stats["total"] == 2
                    assert stats["processed"] == 2
                    assert stats["failed"] == 0
                    assert mock_update.call_count == 2

                    # Verify Lurcher was standardized to Hound group
                    for call_args in mock_update.call_args_list:
                        animal_id, data = call_args[0]
                        # breed_category is what gets passed to update function (DB column is breed_group)
                        assert data["breed_category"] == "Hound"

    def test_fix_lurchers_dry_run(self, service, mock_connection):
        """Test fix_lurchers in dry-run mode doesn't update database."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        lurchers = [(1, "Max", "Lurcher", None, "Unknown", "3 years", "Medium")]

        with patch.object(service, "get_lurchers_to_fix", return_value=lurchers):
            with patch.object(service, "update_animal_standardization") as mock_update:
                stats = service.fix_lurchers(dry_run=True)

                assert stats["total"] == 1
                assert stats["processed"] == 0  # Nothing actually processed in dry-run
                mock_update.assert_not_called()

    def test_fix_staffordshire_processing(self, service, mock_connection):
        """Test fix_staffordshire standardizes breed names correctly."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        staffies = [
            (4, "Rocky", "Staffy", "Staffy", "Terrier", "4 years", "Medium"),
            (5, "Luna", "Staffie Mix", "Staffie Mix", "Terrier", "2 years", "Medium"),
        ]

        with patch.object(service, "get_staffordshires_to_fix", return_value=staffies):
            with patch.object(service, "update_animal_standardization", return_value=True) as mock_update:
                with patch.object(service.standardizer, "apply_full_standardization") as mock_standardize:
                    # Mock standardization to return proper Staffordshire name - use actual field names
                    mock_standardize.return_value = {
                        "breed": "Staffordshire Bull Terrier",
                        "breed_category": "Terrier",
                        "breed_group": "Terrier",
                        "standardized_size": "Medium",
                        "breed_confidence": 0.9,
                        "breed_type": "purebred",
                        "primary_breed": "Staffordshire Bull Terrier",
                        "secondary_breed": None,
                    }

                    stats = service.fix_staffordshire(dry_run=False)

                    assert stats["total"] == 2
                    assert stats["processed"] == 2
                    assert stats["failed"] == 0

                    # Verify Staffordshire Bull Terrier standardization
                    for call_args in mock_update.call_args_list:
                        animal_id, data = call_args[0]
                        assert "Staffordshire Bull Terrier" in data["breed"]

    def test_backfill_breed_data_batch_processing(self, service, mock_connection):
        """Test backfill processes animals in batches."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        # Mock 250 animals to test batch processing
        animals = [(i, f"Dog{i}", "Mixed Breed", None, "Unknown", "2 years", "Medium") for i in range(1, 251)]
        mock_cursor.fetchall.return_value = animals

        with patch.object(service, "update_animal_standardization", return_value=True) as mock_update:
            stats = service.backfill_breed_data(batch_size=100, dry_run=False, show_progress=False)

            # Should process in 3 batches (100, 100, 50)
            assert stats["total"] == 250
            assert stats["processed"] == 250
            assert stats["batches"] == 3
            assert mock_conn.commit.call_count >= 3  # At least one commit per batch

    def test_backfill_with_progress_tracking(self, service, mock_connection):
        """Test backfill shows progress during processing."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        animals = [(1, "Max", "Unknown", None, None, "3 years", "Medium")]
        mock_cursor.fetchall.return_value = animals

        with patch("management.backfill_standardization.Progress") as mock_progress:
            mock_progress_instance = MagicMock()
            mock_progress.return_value.__enter__.return_value = mock_progress_instance

            service.backfill_breed_data(show_progress=True, dry_run=False)

            # Verify progress tracking was used
            mock_progress.assert_called_once()
            mock_progress_instance.add_task.assert_called()

    def test_backfill_handles_errors_gracefully(self, service, mock_connection):
        """Test backfill continues on individual errors."""
        mock_conn, mock_cursor = mock_connection
        service.conn = mock_conn

        animals = [
            (1, "Max", "Breed1", None, None, "3 years", "Medium"),
            (2, "Bella", "Breed2", None, None, "2 years", "Large"),
            (3, "Charlie", "Breed3", None, None, "1 year", "Small"),
        ]
        mock_cursor.fetchall.return_value = animals

        # Make second update fail
        with patch.object(service, "update_animal_standardization") as mock_update:
            mock_update.side_effect = [True, False, True]

            stats = service.backfill_breed_data(dry_run=False, show_progress=False)

            assert stats["total"] == 3
            assert stats["processed"] == 2
            assert stats["failed"] == 1
            assert len(stats["errors"]) == 1

    def test_main_function_with_arguments(self):
        """Test main function handles command-line arguments."""
        test_args = ["backfill_standardization.py", "--dry-run", "--limit", "10"]

        with patch("sys.argv", test_args):
            with patch("management.backfill_standardization.StandardizationBackfillService") as mock_service_class:
                mock_service = MagicMock()
                mock_service_class.return_value = mock_service
                mock_service.connect.return_value = True
                mock_service.fix_lurchers.return_value = {
                    "total": 5,
                    "processed": 0,
                    "failed": 0,
                }  # dry-run doesn't process
                mock_service.fix_staffordshire.return_value = {
                    "total": 3,
                    "processed": 0,
                    "failed": 0,
                }
                mock_service.backfill_breed_data.return_value = {
                    "total": 10,
                    "processed": 0,
                    "failed": 0,
                    "batches": 1,
                    "errors": [],
                }

                from management.backfill_standardization import main

                result = main()

                assert result == 0
                mock_service.fix_lurchers.assert_called_with(dry_run=True)
                mock_service.backfill_breed_data.assert_called_with(limit=10, batch_size=100, dry_run=True, show_progress=True)
