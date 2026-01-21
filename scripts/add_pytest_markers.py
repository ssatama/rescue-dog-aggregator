#!/usr/bin/env python3
"""
Add appropriate pytest markers to unmarked test files.
Based on comprehensive audit of rescue-dog-aggregator test suite.
"""

import re
from pathlib import Path


def analyze_test_file(file_path: Path) -> set[str]:
    """Analyze test file content to determine appropriate markers."""
    markers = set()

    try:
        with open(file_path, encoding="utf-8") as f:
            content = f.read()
    except Exception:
        return markers

    # Skip __init__.py and non-test files
    if file_path.name == "__init__.py" or not file_path.name.startswith("test_"):
        return markers

    # Check for external service dependencies
    external_patterns = [
        r"requests\.(get|post|put|delete)",
        r"http[s]?://",
        r"\.com/",
        r"\.org/",
        r"BeautifulSoup",
        r"selenium",
        r"webdriver",
        r"playwright",
    ]

    # Check for database operations
    db_patterns = [
        r"psycopg2",
        r"cursor\(",
        r"connection\(",
        r"\.connect\(",
        r"@patch.*connect",
        r"mock.*connect",
        r"fetchall",
        r"execute\(",
        r"commit\(\)",
    ]

    # Check for slow operations
    slow_patterns = [
        r"time\.sleep",
        r"@patch.*requests",
        r"TestClient",
        r"batch_upload",
        r"concurrent",
        r"class.*Integration",
        r"integration.*test",
        r"end.*to.*end",
    ]

    # Check for I/O operations
    io_patterns = [
        r"open\(",
        r"Path\(",
        r"pathlib",
        r"os\.path",
        r"file.*read",
        r"file.*write",
    ]

    # Check for API tests
    api_patterns = [
        r"TestClient",
        r"FastAPI",
        r"/api/",
        r"test.*api",
        r"endpoint",
        r"route",
    ]

    # Determine markers based on patterns
    if any(re.search(pattern, content, re.IGNORECASE) for pattern in external_patterns):
        if "selenium" in content.lower() or "webdriver" in content.lower() or "playwright" in content.lower():
            markers.add("browser")
            markers.add("slow")
        else:
            markers.add("external")

    if any(re.search(pattern, content, re.IGNORECASE) for pattern in db_patterns):
        if "mock" in content.lower() and "patch" in content.lower():
            markers.add("unit")  # Mocked database operations
        else:
            markers.add("integration")  # Real database operations
            markers.add("database")

    if any(re.search(pattern, content, re.IGNORECASE) for pattern in slow_patterns):
        markers.add("slow")

    if any(re.search(pattern, content, re.IGNORECASE) for pattern in io_patterns):
        markers.add("file_io")

    if any(re.search(pattern, content, re.IGNORECASE) for pattern in api_patterns):
        markers.add("api")

    # Categorize by directory structure
    path_str = str(file_path)
    if "/scrapers/" in path_str:
        markers.add("scrapers")
        if "integration" not in markers and "unit" not in markers:
            markers.add("integration")  # Most scraper tests are integration
    elif "/services/" in path_str:
        markers.add("services")
        if not markers:  # If no other markers detected
            markers.add("unit")
    elif "/utils/" in path_str:
        markers.add("utils")
        if not markers:
            markers.add("unit")
    elif "/api/" in path_str:
        markers.add("api")
        if "integration" not in markers:
            markers.add("integration")
    elif "/management/" in path_str:
        markers.add("management")
        if not markers:
            markers.add("integration")

    # Default fallback - if no markers detected, assume unit test
    if not markers:
        markers.add("unit")
        markers.add("fast")

    return markers


def add_markers_to_file(file_path: Path, markers: set[str]) -> bool:
    """Add pytest markers to the beginning of a test file."""
    if not markers:
        return False

    try:
        with open(file_path, encoding="utf-8") as f:
            content = f.read()
    except Exception:
        return False

    # Skip if file already has markers
    if "@pytest.mark" in content:
        return False

    # Find the first test function or class
    lines = content.split("\n")
    insert_line = 0

    for i, line in enumerate(lines):
        if line.strip().startswith(("def test_", "class Test")):
            insert_line = i
            break

    if insert_line == 0:
        return False  # No test found

    # Create marker lines
    marker_lines = [f"@pytest.mark.{marker}" for marker in sorted(markers)]

    # Insert markers before the test
    new_lines = lines[:insert_line] + marker_lines + lines[insert_line:]

    # Write back to file
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            f.write("\n".join(new_lines))
        return True
    except Exception:
        return False


def main():
    """Main function to process unmarked test files."""
    # Files identified as unmarked
    unmarked_files = [
        "tests/management/test_config_commands_llm_filter.py",
        "tests/utils/test_r2_batch_upload.py",
        "tests/utils/test_r2_exponential_backoff.py",
        "tests/utils/test_r2_intelligent_fallback.py",
        "tests/utils/test_r2_concurrent_upload.py",
        "tests/scrapers/test_base_scraper_batch_uploads.py",
        "tests/scrapers/test_tierschutzverein_translations.py",
        "tests/scrapers/test_misis_rescue_r2_integration.py",
        "tests/scrapers/test_misis_rescue_fixes.py",
        "tests/scrapers/test_misis_rescue_improvements.py",
        "tests/scrapers/validate_furryrescueitaly_real_urls.py",
        "tests/scrapers/test_scraper_base.py",
        "tests/scrapers/test_misis_rescue_normalizer_fixes.py",
        "tests/services/llm/test_profile_normalizer.py",
        "tests/services/llm/test_dog_profiler_refactoring_regression.py",
        "tests/services/llm/test_prompt_builder.py",
        "tests/services/llm/test_dog_profiler_schema.py",
        "tests/services/llm/test_organization_config_loader.py",
        "tests/services/railway/test_index_sync.py",
        "tests/services/test_image_deduplication.py",
    ]

    results = {"processed": 0, "skipped": 0, "errors": 0, "file_results": {}}

    for file_path_str in unmarked_files:
        file_path = Path(file_path_str)

        if not file_path.exists():
            results["skipped"] += 1
            continue

        markers = analyze_test_file(file_path)

        if add_markers_to_file(file_path, markers):
            results["processed"] += 1
            results["file_results"][str(file_path)] = list(markers)
            print(f"✅ Added markers to {file_path}: {', '.join(sorted(markers))}")
        else:
            results["errors"] += 1
            print(f"❌ Failed to add markers to {file_path}")

    print("\n📊 SUMMARY:")
    print(f"Processed: {results['processed']} files")
    print(f"Skipped: {results['skipped']} files")
    print(f"Errors: {results['errors']} files")

    return results


if __name__ == "__main__":
    main()
