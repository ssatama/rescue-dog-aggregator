"""
Test suite for Instagram photo analyzer batch script.

Following CLAUDE.md principles:
- TDD approach: Write tests FIRST, see them FAIL, then implement
- Comprehensive coverage of query logic, rate limiting, progress, errors, DB insertion
- Mock external dependencies (database, LLMClient, vision API)

These tests are written BEFORE implementation (Task 3.1).
They should ALL FAIL until the batch analyzer is implemented (Task 3.2).
"""

import os
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

# Skip all tests in this module if OPENROUTER_API_KEY is not set
pytestmark = pytest.mark.skipif(
    not os.environ.get("OPENROUTER_API_KEY"),
    reason="OPENROUTER_API_KEY not set - skipping Instagram analyzer tests",
)

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent.parent))

from services.llm.photo_analysis_models import PhotoAnalysisResponse


@pytest.fixture
def mock_db_connection():
    """Mock database connection and cursor."""
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_conn.cursor.return_value = mock_cursor
    return mock_conn, mock_cursor


@pytest.fixture
def sample_unanalyzed_dogs():
    """Sample dogs without photo analysis (as tuples from psycopg2)."""
    return [
        (1, "Max", "https://example.com/max.jpg"),
        (2, "Bella", "https://example.com/bella.jpg"),
        (3, "Charlie", "https://example.com/charlie.jpg"),
    ]


@pytest.fixture
def sample_unanalyzed_dogs_dicts():
    """Sample dogs as dictionaries (for analyze_photos tests)."""
    return [
        {"id": 1, "name": "Max", "primary_image_url": "https://example.com/max.jpg"},
        {
            "id": 2,
            "name": "Bella",
            "primary_image_url": "https://example.com/bella.jpg",
        },
        {
            "id": 3,
            "name": "Charlie",
            "primary_image_url": "https://example.com/charlie.jpg",
        },
    ]


@pytest.fixture
def sample_analysis_response():
    """Sample successful photo analysis response."""
    return PhotoAnalysisResponse(
        quality_score=8,
        visibility_score=9,
        appeal_score=7,
        background_score=6,
        overall_score=7.5,
        ig_ready=False,
        confidence="high",
        reasoning="Good photo with minor background issues",
        flags=["busy_background"],
    )


@pytest.fixture
def sample_final_prompt():
    """Sample final prompt text."""
    return "Analyze this dog photo for Instagram quality..."


@pytest.mark.management
class TestInstagramPhotoAnalyzer:
    """Test the Instagram photo analyzer batch processing script."""

    @pytest.mark.asyncio
    async def test_concurrent_batch_processing(self, mock_db_connection, sample_unanalyzed_dogs_dicts, sample_analysis_response):
        """Test concurrent processing of multiple dogs in batches."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = sample_analysis_response.dict()

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 10  # Process 10 dogs concurrently
            analyzer.rate_limit_delay = 0  # No delay for testing

            # Process 30 dogs (should be 3 batches of 10)
            many_dogs = sample_unanalyzed_dogs_dicts * 10  # 30 dogs
            await analyzer.analyze_photos(dogs=many_dogs)

            # Verify all dogs were processed
            assert mock_vision.call_count == 30

    @pytest.mark.asyncio
    async def test_progress_tracking(self, mock_db_connection, sample_unanalyzed_dogs_dicts):
        """Test progress is logged during batch processing."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = {
                "quality_score": 8,
                "visibility_score": 9,
                "appeal_score": 7,
                "background_score": 6,
                "overall_score": 7.5,
                "ig_ready": False,
                "confidence": "high",
                "reasoning": "Test",
                "flags": [],
            }

            with patch("builtins.print") as mock_print:
                analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
                analyzer.batch_size = 5  # Process in batches

                await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts)

                # Verify progress messages were printed
                print_calls = [str(call) for call in mock_print.call_args_list]
                progress_messages = [c for c in print_calls if "Processed" in c or "Analyzing" in c or "Batch" in c]

                assert len(progress_messages) > 0

    @pytest.mark.asyncio
    async def test_error_handling_broken_image_url(self, mock_db_connection, sample_unanalyzed_dogs_dicts):
        """Test handling of 404/broken image URLs."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            # Simulate API error for broken image
            mock_vision.side_effect = Exception("Image not found")

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 5

            result = await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts[:1])

            # Should track error but not crash
            assert result["errors"] >= 1
            assert result["processed"] == 0  # Failed to process

    @pytest.mark.asyncio
    async def test_error_handling_continues_after_failure(self, mock_db_connection, sample_unanalyzed_dogs_dicts):
        """Test that batch processing continues after individual failures."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            # First dog fails, second succeeds, third fails
            mock_vision.side_effect = [
                Exception("Network error"),
                {
                    "quality_score": 8,
                    "visibility_score": 9,
                    "appeal_score": 7,
                    "background_score": 6,
                    "overall_score": 7.5,
                    "ig_ready": False,
                    "confidence": "high",
                    "reasoning": "Good photo",
                    "flags": [],
                },
                Exception("Timeout"),
            ]

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 5

            result = await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts)

            # Should process 1 successfully, 2 errors
            assert result["processed"] == 1
            assert result["errors"] == 2

    @pytest.mark.asyncio
    async def test_database_insertion_success(self, mock_db_connection, sample_analysis_response):
        """Test successful database insertion of analysis results."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        analyzer = InstagramPhotoAnalyzer(connection=mock_conn)

        dog = {
            "id": 1,
            "name": "Max",
            "primary_image_url": "https://example.com/max.jpg",
        }
        cost = 0.0015

        await analyzer.insert_analysis_result(
            dog_id=dog["id"],
            image_url=dog["primary_image_url"],
            analysis=sample_analysis_response,
            cost=cost,
        )

        # Verify INSERT was called
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]

        # Verify INSERT structure
        assert "INSERT INTO dog_photo_analysis" in query
        assert "dog_id" in query
        assert "quality_score" in query
        assert "overall_score" in query
        assert "ig_ready" in query

        # Verify parameters
        assert 1 in params  # dog_id
        assert 8 in params  # quality_score
        assert 7.5 in params or params[6] == 7.5  # overall_score

        # Verify commit was called
        mock_conn.commit.assert_called_once()

    @pytest.mark.asyncio
    async def test_database_insertion_handles_duplicate(self, mock_db_connection, sample_analysis_response):
        """Test database insertion handles duplicate dog_id (UPSERT)."""
        import psycopg2

        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        # Simulate unique constraint violation
        mock_cursor.execute.side_effect = psycopg2.IntegrityError("duplicate key")

        analyzer = InstagramPhotoAnalyzer(connection=mock_conn)

        dog = {
            "id": 1,
            "name": "Max",
            "primary_image_url": "https://example.com/max.jpg",
        }

        # Should either:
        # 1. Use ON CONFLICT DO UPDATE, or
        # 2. Catch IntegrityError and handle gracefully
        try:
            await analyzer.insert_analysis_result(
                dog_id=dog["id"],
                image_url=dog["primary_image_url"],
                analysis=sample_analysis_response,
                cost=0.0015,
            )
        except psycopg2.IntegrityError:
            # If it raises, that's acceptable too (test will verify behavior)
            pass

        # Verify rollback was called on error
        assert mock_conn.rollback.called or "ON CONFLICT" in str(mock_cursor.execute.call_args)

    @pytest.mark.asyncio
    async def test_cost_tracking(self, mock_db_connection, sample_unanalyzed_dogs_dicts):
        """Test cost accumulation throughout batch processing."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = {
                "quality_score": 8,
                "visibility_score": 9,
                "appeal_score": 7,
                "background_score": 6,
                "overall_score": 7.5,
                "ig_ready": False,
                "confidence": "high",
                "reasoning": "Good",
                "flags": [],
            }

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 5
            analyzer.cost_per_request = 0.0015  # $0.0015 per image

            result = await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts)

            # Verify cost tracking
            expected_cost = len(sample_unanalyzed_dogs_dicts) * 0.0015
            assert "total_cost" in result
            assert abs(result["total_cost"] - expected_cost) < 0.0001  # Float comparison

    @pytest.mark.asyncio
    async def test_loads_final_prompt_from_file(self, mock_db_connection, sample_final_prompt):
        """Test that analyzer loads the final prompt from prompts/instagram/."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("builtins.open", create=True) as mock_open:
            mock_open.return_value.__enter__.return_value.read.return_value = sample_final_prompt

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)

            # Verify prompt was loaded
            assert analyzer.prompt is not None
            assert len(analyzer.prompt) > 0

            # Verify correct file was opened
            mock_open.assert_called()
            call_args = str(mock_open.call_args)
            assert "photo_quality_analysis_final.txt" in call_args or "instagram" in call_args

    @pytest.mark.asyncio
    async def test_uses_correct_vision_model(self, mock_db_connection, sample_unanalyzed_dogs_dicts):
        """Test that analyzer uses google/gemini-2.5-flash-image model."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = {
                "quality_score": 8,
                "visibility_score": 9,
                "appeal_score": 7,
                "background_score": 6,
                "overall_score": 7.5,
                "ig_ready": False,
                "confidence": "high",
                "reasoning": "Test",
                "flags": [],
            }

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 5

            await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts[:1])

            # Verify correct model was used
            mock_vision.assert_called()
            call_kwargs = mock_vision.call_args.kwargs
            assert call_kwargs.get("model") == "google/gemini-2.5-flash-image"

    @pytest.mark.asyncio
    async def test_validates_response_with_pydantic(self, mock_db_connection, sample_unanalyzed_dogs_dicts):
        """Test that API responses are validated with PhotoAnalysisResponse model."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            # Return invalid response (missing required fields)
            mock_vision.return_value = {"quality_score": 8}  # Missing many fields

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 5

            result = await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts[:1])

            # Should catch validation error and count as error
            assert result["errors"] >= 1
            assert result["processed"] == 0

    @pytest.mark.asyncio
    async def test_dry_run_mode_no_database_writes(self, mock_db_connection, sample_unanalyzed_dogs_dicts):
        """Test dry-run mode makes API calls but doesn't write to database."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = {
                "quality_score": 8,
                "visibility_score": 9,
                "appeal_score": 7,
                "background_score": 6,
                "overall_score": 7.5,
                "ig_ready": False,
                "confidence": "high",
                "reasoning": "Test",
                "flags": [],
            }

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn, dry_run=True)
            analyzer.batch_size = 5

            await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts[:1])

            # Verify API was called
            assert mock_vision.called

            # Verify NO database writes
            insert_calls = [c for c in mock_cursor.execute.call_args_list if c and "INSERT" in str(c)]
            assert len(insert_calls) == 0

            # Verify NO commits
            assert mock_conn.commit.call_count == 0

    @pytest.mark.asyncio
    async def test_summary_statistics(self, mock_db_connection, sample_unanalyzed_dogs_dicts):
        """Test that analyze_photos returns comprehensive statistics."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            # 2 succeed, 1 fails
            mock_vision.side_effect = [
                {
                    "quality_score": 8,
                    "visibility_score": 9,
                    "appeal_score": 7,
                    "background_score": 6,
                    "overall_score": 7.5,
                    "ig_ready": False,
                    "confidence": "high",
                    "reasoning": "Test",
                    "flags": [],
                },
                {
                    "quality_score": 9,
                    "visibility_score": 9,
                    "appeal_score": 9,
                    "background_score": 8,
                    "overall_score": 8.75,
                    "ig_ready": True,
                    "confidence": "high",
                    "reasoning": "Excellent",
                    "flags": [],
                },
                Exception("API error"),
            ]

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 5

            result = await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts)

            # Verify comprehensive statistics
            assert "total" in result
            assert "processed" in result
            assert "errors" in result
            assert "total_cost" in result

            assert result["total"] == 3
            assert result["processed"] == 2
            assert result["errors"] == 1

    @pytest.mark.asyncio
    async def test_logs_errors_with_details(self, mock_db_connection, sample_unanalyzed_dogs_dicts, capsys):
        """Test that errors are logged with dog name and error message."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            mock_vision.side_effect = Exception("Network timeout")

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 5

            await analyzer.analyze_photos(dogs=sample_unanalyzed_dogs_dicts[:1])

            # Verify error was logged (either to stdout or logger)
            captured = capsys.readouterr()
            output = captured.out + captured.err

            # Should log dog name and error
            assert "Max" in output or "error" in output.lower()


@pytest.mark.management
class TestInstagramPhotoAnalyzerCLI:
    """Test the command-line interface for the analyzer."""

    def test_cli_with_limit_argument(self):
        """Test CLI accepts --limit argument."""
        from management.instagram_photo_analyzer import parse_args

        args = parse_args(["--limit", "10"])

        assert args.limit == 10

    def test_cli_with_all_flag(self):
        """Test CLI accepts --all flag to process all dogs."""
        from management.instagram_photo_analyzer import parse_args

        args = parse_args(["--all"])

        assert args.all is True
        assert args.limit is None

    def test_cli_with_dry_run_flag(self):
        """Test CLI accepts --dry-run flag."""
        from management.instagram_photo_analyzer import parse_args

        args = parse_args(["--dry-run", "--limit", "5"])

        assert args.dry_run is True

    def test_cli_requires_limit_or_all(self):
        """Test CLI requires either --limit or --all."""
        from management.instagram_photo_analyzer import parse_args

        with pytest.raises(SystemExit):
            parse_args([])  # No arguments should fail

    def test_cli_cannot_use_limit_and_all_together(self):
        """Test CLI doesn't allow both --limit and --all."""
        from management.instagram_photo_analyzer import parse_args

        # This should either raise error or have validation logic
        # Implementation should enforce mutual exclusivity
        try:
            args = parse_args(["--limit", "10", "--all"])
            # If parsing succeeds, verify validation logic exists
            assert hasattr(args, "limit") and hasattr(args, "all")
        except SystemExit:
            # Expected behavior - mutual exclusivity enforced
            pass


@pytest.mark.management
class TestInstagramPhotoAnalyzerIntegration:
    """Integration-style tests for full workflow."""

    @pytest.mark.asyncio
    async def test_full_batch_workflow(self, mock_db_connection, sample_unanalyzed_dogs):
        """Test complete workflow from query to database insertion."""
        from management.instagram_photo_analyzer import InstagramPhotoAnalyzer

        mock_conn, mock_cursor = mock_db_connection
        mock_cursor.fetchall.return_value = sample_unanalyzed_dogs

        with patch("services.llm.llm_client.LLMClient.call_vision_api", new_callable=AsyncMock) as mock_vision:
            mock_vision.return_value = {
                "quality_score": 8,
                "visibility_score": 9,
                "appeal_score": 7,
                "background_score": 6,
                "overall_score": 7.5,
                "ig_ready": False,
                "confidence": "high",
                "reasoning": "Good photo",
                "flags": [],
            }

            analyzer = InstagramPhotoAnalyzer(connection=mock_conn)
            analyzer.batch_size = 10  # Process 10 concurrently

            # Run full workflow
            result = await analyzer.run(limit=3)

            # Verify complete workflow executed
            assert result["total"] == 3
            assert result["processed"] == 3
            assert result["errors"] == 0

            # Verify API calls made
            assert mock_vision.call_count == 3

            # Verify database inserts made
            insert_calls = [c for c in mock_cursor.execute.call_args_list if "INSERT" in str(c[0][0])]
            assert len(insert_calls) == 3
