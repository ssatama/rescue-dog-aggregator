#!/usr/bin/env python3
"""
Validation script for pytest markers - ensures consistency and compliance.
"""
import re
from collections import defaultdict
from pathlib import Path

# Expected marker categories from pytest.ini
VALID_MARKERS = {
    "slow",
    "selenium",
    "network",
    "network_dependent",
    "browser",
    "complex_setup",
    "database",
    "file_io",
    "computation",
    "management",
    "api",
    "unit",
    "fast",
    "integration",
    "config",
    "filesystem",
    "build",
    "requires_migrations",
    "security",
    "emergency",
    "parametrize",
    "skip",
}

# Performance markers - every test should have exactly one
PERFORMANCE_MARKERS = {"unit", "fast", "slow"}

# Mutually exclusive marker groups
EXCLUSIVE_GROUPS = [
    {"unit", "integration"},  # Can't be both unit and integration
]

# Required combinations
REQUIRED_COMBINATIONS = {
    "browser": ["selenium", "slow"],  # Browser tests should also be selenium and slow
    "selenium": ["slow"],  # Selenium tests should be slow
    "database": ["slow"],  # Database tests should be slow (usually)
    "network": ["slow"],  # Network tests should be slow
    "computation": ["slow"],  # Computation tests should be slow
}


def extract_markers_from_file(file_path):
    """Extract all pytest markers from a test file."""
    markers = set()
    try:
        with open(file_path, "r") as f:
            content = f.read()

        # Find all @pytest.mark.* markers
        marker_matches = re.findall(r"@pytest\.mark\.(\w+)", content)
        markers.update(marker_matches)

    except Exception as e:
        print(f"Warning: Could not read {file_path}: {e}")

    return markers


def validate_file_markers(file_path, markers):
    """Validate markers for a single test file."""
    issues = []

    # Check for invalid markers
    invalid_markers = markers - VALID_MARKERS
    if invalid_markers:
        issues.append(f"Invalid markers: {invalid_markers}")

    # Check for performance markers
    perf_markers = markers.intersection(PERFORMANCE_MARKERS)
    if len(perf_markers) == 0:
        issues.append("Missing performance marker (unit/fast/slow)")
    elif len(perf_markers) > 1:
        issues.append(f"Multiple performance markers: {perf_markers}")

    # Check exclusive groups
    for group in EXCLUSIVE_GROUPS:
        overlap = markers.intersection(group)
        if len(overlap) > 1:
            issues.append(f"Conflicting markers: {overlap}")

    # Check required combinations
    for marker, required in REQUIRED_COMBINATIONS.items():
        if marker in markers:
            missing = set(required) - markers
            if missing:
                issues.append(f"Marker '{marker}' requires: {missing}")

    return issues


def analyze_marker_distribution():
    """Analyze overall marker distribution and patterns."""
    marker_stats = defaultdict(int)
    file_count = 0
    all_issues = []

    project_root = Path(__file__).parent.parent
    tests_dir = project_root / "tests"

    for test_file in tests_dir.rglob("test_*.py"):
        file_count += 1
        markers = extract_markers_from_file(test_file)

        # Update statistics
        for marker in markers:
            marker_stats[marker] += 1

        # Validate this file
        issues = validate_file_markers(test_file, markers)
        if issues:
            all_issues.append((test_file, issues))

    return marker_stats, file_count, all_issues


def print_validation_report():
    """Print comprehensive validation report."""
    print("🔍 Test Marker Validation Report")
    print("=" * 50)

    marker_stats, file_count, all_issues = analyze_marker_distribution()

    # Overall statistics
    print(f"\n📊 Overall Statistics:")
    print(f"  Total test files: {file_count}")
    print(f"  Unique markers used: {len(marker_stats)}")
    print(f"  Files with issues: {len(all_issues)}")

    # Marker distribution
    print(f"\n📈 Marker Distribution:")
    sorted_markers = sorted(marker_stats.items(), key=lambda x: x[1], reverse=True)
    for marker, count in sorted_markers:
        percentage = (count / file_count) * 100
        print(f"  {marker:20} {count:3d} files ({percentage:5.1f}%)")

    # Performance marker distribution
    print(f"\n⚡ Performance Marker Analysis:")
    perf_counts = {marker: marker_stats[marker] for marker in PERFORMANCE_MARKERS}
    total_perf = sum(perf_counts.values())
    for marker, count in perf_counts.items():
        percentage = (count / total_perf) * 100 if total_perf > 0 else 0
        print(f"  {marker:10} {count:3d} files ({percentage:5.1f}% of performance-tagged)")

    # Issues found
    if all_issues:
        print(f"\n❌ Issues Found ({len(all_issues)} files):")
        for file_path, issues in all_issues[:10]:  # Show first 10
            print(f"  {file_path}:")
            for issue in issues:
                print(f"    - {issue}")

        if len(all_issues) > 10:
            print(f"    ... and {len(all_issues) - 10} more files with issues")
    else:
        print(f"\n✅ No issues found! All markers are valid and consistent.")

    # Recommendations
    print(f"\n💡 Recommendations:")

    unit_pct = (marker_stats["unit"] / file_count) * 100
    slow_pct = (marker_stats["slow"] / file_count) * 100

    if unit_pct < 30:
        print(f"  - Consider adding more unit tests (currently {unit_pct:.1f}%)")

    if slow_pct > 70:
        print(f"  - Many slow tests ({slow_pct:.1f}%) - consider optimizing CI pipeline")

    # CI optimization suggestions
    fast_feedback_tests = marker_stats["unit"] + marker_stats.get("fast", 0)
    fast_pct = (fast_feedback_tests / file_count) * 100

    print(f"  - Fast feedback tests: {fast_feedback_tests} files ({fast_pct:.1f}%)")
    print(f"  - Recommended CI command: pytest -m 'unit or fast' -v")

    return len(all_issues) == 0


def main():
    """Main validation function."""
    success = print_validation_report()

    if success:
        print(f"\n🎉 Validation passed! All test markers are consistent.")
        return 0
    else:
        print(f"\n⚠️  Validation found issues. Please review and fix.")
        return 1


if __name__ == "__main__":
    exit(main())
