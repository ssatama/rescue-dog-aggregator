"""
Test suite for SQL utility functions.

Tests escape_like_pattern() to ensure user input is safely escaped
for use in SQL LIKE/ILIKE clauses.
"""

import pytest

from api.utils.sql_utils import escape_like_pattern


@pytest.mark.unit
class TestEscapeLikePattern:
    """Tests for escape_like_pattern function."""

    def test_plain_text_unchanged(self):
        assert escape_like_pattern("golden retriever") == "golden retriever"

    def test_escapes_percent(self):
        assert escape_like_pattern("100%") == r"100\%"

    def test_escapes_underscore(self):
        assert escape_like_pattern("my_dog") == r"my\_dog"

    def test_escapes_backslash(self):
        assert escape_like_pattern(r"back\slash") == r"back\\slash"

    def test_escapes_all_special_chars(self):
        assert escape_like_pattern(r"a%b_c\d") == r"a\%b\_c\\d"

    def test_empty_string(self):
        assert escape_like_pattern("") == ""

    def test_only_wildcards(self):
        assert escape_like_pattern("%%%") == r"\%\%\%"

    def test_unicode_preserved(self):
        assert escape_like_pattern("hünd%") == r"hünd\%"

    def test_multiple_consecutive_underscores(self):
        assert escape_like_pattern("__init__") == r"\_\_init\_\_"

    def test_used_in_like_pattern(self):
        """Verify escaped value is safe when wrapped in LIKE wildcards."""
        user_input = "%dangerous_input"
        escaped = escape_like_pattern(user_input)
        pattern = f"%{escaped}%"
        assert pattern == r"%\%dangerous\_input%"
