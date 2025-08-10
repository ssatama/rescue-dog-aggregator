# tests/management/test_railway_commands_refactored.py

import pytest


class TestRailwayCommandsRefactored:
    """Test Railway commands after removing animal_images table references."""

    def test_status_command_tables_list_excludes_animal_images(self):
        """Test that the tables list in status command excludes animal_images."""
        # Read the file directly to check the source code
        with open("management/railway_commands.py", "r") as f:
            content = f.read()

        # Should not contain animal_images in the tables list
        assert "animal_images" not in content, "animal_images should not be in the tables list"

        # Should still contain the other tables
        assert "organizations" in content
        assert "animals" in content
        assert "scrape_logs" in content
        assert "service_regions" in content

        # Verify the specific line that was changed
        lines = content.split("\n")
        tables_lines = [line for line in lines if "tables = [" in line]
        assert len(tables_lines) == 1, "Should have exactly one tables list definition"

        tables_line = tables_lines[0]
        assert "animal_images" not in tables_line, "animal_images should not be in tables list"
        assert "organizations" in tables_line, "organizations should be in tables list"
        assert "animals" in tables_line, "animals should be in tables list"
