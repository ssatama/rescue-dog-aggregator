"""
Test that LLM profiling commands only process high availability confidence dogs.

Following CLAUDE.md principles:
- TDD approach
- Verify critical filtering behavior
"""

import unittest
from unittest.mock import MagicMock, patch

from management.config_commands import ConfigManager


class TestLLMAvailabilityFiltering(unittest.TestCase):
    """Test that LLM commands filter by availability_confidence."""

    @patch("psycopg2.connect")
    @patch("services.llm.organization_config_loader.get_config_loader")
    @patch("pathlib.Path")
    def test_profile_dogs_only_high_confidence(self, mock_path, mock_loader, mock_connect):
        """Test profile_dogs method only fetches high confidence dogs."""
        # Setup mocks
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        mock_connect.return_value = mock_conn
        mock_conn.cursor.return_value = mock_cursor
        
        # Mock config loader
        mock_config = MagicMock()
        mock_config.prompt_file = "test.yaml"
        mock_config.organization_name = "Test Org"
        mock_config.source_language = "en"
        mock_config.model_preference = "test-model"
        
        mock_loader_instance = MagicMock()
        mock_loader_instance.load_config.return_value = mock_config
        mock_loader.return_value = mock_loader_instance
        
        # Mock template path exists
        mock_template = MagicMock()
        mock_template.exists.return_value = True
        mock_path.return_value = mock_template
        
        # Mock cursor returns no dogs (to avoid processing)
        mock_cursor.fetchall.return_value = []
        
        # Create manager and call profile_dogs
        manager = ConfigManager()
        manager.profile_dogs(org_id=11, limit=10, dry_run=True)
        
        # Verify the query includes availability_confidence filter
        call_args = mock_cursor.execute.call_args
        query = call_args[0][0]
        
        # Check that the query includes the availability filter
        assert "availability_confidence = 'high'" in query, \
            f"Query missing availability_confidence filter: {query}"
        
        # Verify it's checking for unprofiled dogs
        assert "dog_profiler_data IS NULL" in query
        assert "organization_id = %s" in query
        
        print("✅ profile_dogs correctly filters for high confidence dogs")


if __name__ == "__main__":
    unittest.main()