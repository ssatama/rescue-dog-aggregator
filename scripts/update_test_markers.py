#!/usr/bin/env python3
"""
Script to automatically add pytest markers to untagged test files.
Based on file patterns and content analysis.
"""

import os
import re
from pathlib import Path

# Marker mappings based on file patterns and content
MARKER_RULES = {
    # File pattern rules
    "tests/api/": ["api"],
    "tests/scrapers/": ["integration", "slow"],
    "tests/services/": ["integration", "slow"],
    "tests/utils/": ["unit"],
    "tests/data_consistency/": ["unit"],
    "tests/filesystem/": ["filesystem", "slow"],
    "tests/management/": ["integration", "management", "slow"],
    "tests/security/": ["security", "slow"],
    "tests/railway/": ["integration", "complex_setup", "requires_migrations", "slow"],
    # Specific file rules
    "test_dependencies.py": ["unit"],
    "test_standardization": ["unit", "computation"],
    "test_slug": ["unit"],
    "test_secure": ["security", "unit"],
    "test_database_service": ["database", "integration", "slow"],
    "test_session_manager": ["database", "integration", "slow"],
    "test_r2_service": ["network", "integration", "slow"],
    "test_image_processing": ["computation", "slow"],
    "test_metrics": ["unit"],
    "test_progress": ["unit"],
}

# Content-based rules
CONTENT_RULES = {
    "database": ["database", "slow"],
    "selenium": ["browser", "selenium", "slow"],
    "network": ["network", "slow"],
    "api": ["api"],
    "scraper": ["integration", "slow"],
    "emergency": ["emergency", "management", "slow"],
    "security": ["security"],
    "computation": ["computation", "slow"],
    "r2": ["network", "slow"],
    "image": ["computation", "slow"],
}


def analyze_file_for_markers(file_path):
    """Analyze a test file to determine appropriate markers."""
    markers = set()

    # Add markers based on file path
    for pattern, file_markers in MARKER_RULES.items():
        if pattern in str(file_path):
            markers.update(file_markers)

    # Read file content for additional analysis
    try:
        with open(file_path, "r") as f:
            content = f.read().lower()

        # Add markers based on content
        for keyword, content_markers in CONTENT_RULES.items():
            if keyword in content:
                markers.update(content_markers)

        # Special cases
        if "mock" in content and len(markers) == 0:
            markers.add("unit")
        elif "database" in content or "db" in content:
            markers.update(["database", "slow"])
        elif "fetchall" in content or "memory" in content:
            markers.update(["computation", "slow"])

    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}")
        markers.add("integration")  # Safe default

    # Ensure at least one performance marker
    performance_markers = {"unit", "fast", "slow"}
    if not markers.intersection(performance_markers):
        if "unit" not in markers:
            markers.add("slow")  # Conservative default
        else:
            markers.add("unit")

    return sorted(list(markers))


def add_markers_to_file(file_path, markers):
    """Add pytest markers to a test file."""
    try:
        with open(file_path, "r") as f:
            content = f.read()

        # Find the first class or function definition
        lines = content.split("\n")
        insert_pos = -1

        for i, line in enumerate(lines):
            if re.match(r"^class Test|^def test_", line.strip()):
                insert_pos = i
                break

        if insert_pos == -1:
            print(f"Warning: No test class/function found in {file_path}")
            return False

        # Insert markers
        marker_lines = [f"@pytest.mark.{marker}" for marker in markers]

        # Check if pytest is already imported
        has_pytest_import = "import pytest" in content
        if not has_pytest_import:
            # Find import section
            import_pos = -1
            for i, line in enumerate(lines):
                if line.startswith("import ") or line.startswith("from "):
                    import_pos = i
                elif import_pos != -1 and not (line.startswith("import ") or line.startswith("from ") or line.strip() == ""):
                    break

            if import_pos != -1:
                lines.insert(import_pos + 1, "import pytest")
                insert_pos += 1
            else:
                lines.insert(0, "import pytest")
                lines.insert(1, "")
                insert_pos += 2

        # Insert markers before the test class/function
        for marker in reversed(marker_lines):
            lines.insert(insert_pos, marker)

        # Write back
        with open(file_path, "w") as f:
            f.write("\n".join(lines))

        return True

    except Exception as e:
        print(f"Error updating {file_path}: {e}")
        return False


def main():
    """Main function to update all untagged test files."""
    project_root = Path(__file__).parent.parent
    tests_dir = project_root / "tests"

    # Find untagged test files
    untagged_files = []
    for test_file in tests_dir.rglob("test_*.py"):
        try:
            with open(test_file, "r") as f:
                content = f.read()
            if "@pytest.mark" not in content:
                untagged_files.append(test_file)
        except Exception:
            continue

    print(f"Found {len(untagged_files)} untagged test files")

    # Update each file
    updated_count = 0
    for file_path in untagged_files:
        print(f"Processing: {file_path}")
        markers = analyze_file_for_markers(file_path)
        print(f"  -> Adding markers: {markers}")

        if add_markers_to_file(file_path, markers):
            updated_count += 1
        else:
            print(f"  -> Failed to update {file_path}")

    print(f"\nSuccessfully updated {updated_count}/{len(untagged_files)} files")


if __name__ == "__main__":
    main()
