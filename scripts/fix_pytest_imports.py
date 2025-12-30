#!/usr/bin/env python3
"""Fix missing pytest imports in test files with pytest markers."""

import re
from pathlib import Path


def fix_pytest_import(file_path: Path) -> bool:
    """Add pytest import to file if it has @pytest.mark but no pytest import."""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
    except Exception:
        return False

    # Check if file has pytest markers but no pytest import
    has_markers = "@pytest.mark" in content
    has_import = re.search(r"^import pytest", content, re.MULTILINE) or re.search(
        r"^from pytest", content, re.MULTILINE
    )

    if has_markers and not has_import:
        # Find the right place to insert import
        lines = content.split("\n")

        # Find last import line
        last_import_line = -1
        for i, line in enumerate(lines):
            if line.strip().startswith(
                ("import ", "from ")
            ) and not line.strip().startswith("from ."):
                last_import_line = i

        if last_import_line >= 0:
            # Insert after last import
            lines.insert(last_import_line + 1, "import pytest")
        else:
            # Insert at beginning after docstring/comments
            insert_line = 0
            for i, line in enumerate(lines):
                if line.strip() and not line.strip().startswith(("#", '"""', "'''")):
                    insert_line = i
                    break
            lines.insert(insert_line, "import pytest")
            lines.insert(insert_line + 1, "")  # Add blank line

        # Write back
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write("\n".join(lines))
            return True
        except Exception:
            return False

    return False


def main():
    """Fix pytest imports in all test files."""
    test_dir = Path("tests")
    fixed_files = []

    for test_file in test_dir.rglob("*.py"):
        if test_file.name.startswith("test_") or "test" in str(test_file):
            if fix_pytest_import(test_file):
                fixed_files.append(str(test_file))
                print(f"✅ Fixed pytest import in {test_file}")

    print(f"\n📊 Fixed pytest imports in {len(fixed_files)} files")
    return fixed_files


if __name__ == "__main__":
    main()
