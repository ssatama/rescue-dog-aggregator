#!/usr/bin/env python3
"""
Benchmark pytest marker performance for different test categories.
Measures execution time by marker category to validate our categorization.
"""

import subprocess
import sys
import time
from typing import Tuple


def run_pytest_command(marker_expression: str, timeout_seconds: int = 300) -> Tuple[float, int, str]:
    """
    Run pytest with specific marker expression and measure execution time.

    Returns:
        Tuple of (execution_time_seconds, exit_code, output)
    """
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        "-x",
        "--tb=no",
        "-q",
        "-m",
        marker_expression,
    ]  # Stop on first failure  # No traceback for cleaner output  # Quiet output

    start_time = time.time()
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_seconds, cwd=".")
        execution_time = time.time() - start_time
        return execution_time, result.returncode, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        execution_time = time.time() - start_time
        return execution_time, -1, f"TIMEOUT after {timeout_seconds}s"


def count_tests_by_marker(marker_expression: str) -> int:
    """Count number of tests matching marker expression."""
    cmd = [
        sys.executable,
        "-m",
        "pytest",
        "--collect-only",
        "-q",
        "-m",
        marker_expression,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if result.returncode == 0:
            lines = result.stdout.strip().split("\n")
            # Count lines that look like test collection
            test_count = 0
            for line in lines:
                if "::" in line and ("test_" in line or "Test" in line):
                    test_count += 1
            return test_count
        return 0
    except:
        return 0


def main():
    """Benchmark different marker categories."""
    print("🔬 PYTEST MARKER PERFORMANCE BENCHMARK")
    print("=" * 60)

    # Define marker categories to benchmark
    marker_categories = {
        # Primary performance categories
        "unit": "unit",
        "integration": "integration",
        "slow": "slow",
        "browser": "browser",
        "external": "external",
        # Combination markers for CI/CD
        "unit_fast": "unit or fast",
        "not_slow": "not slow and not browser and not external",
        "ci_safe": "not slow and not browser and not external and not requires_migrations",
        "development": "unit or (integration and not slow)",
        # Component categories
        "api_tests": "api",
        "scraper_tests": "scrapers",
        "service_tests": "services",
        "util_tests": "utils",
        # Infrastructure
        "database_tests": "database",
        "requires_migrations": "requires_migrations",
    }

    results = {}

    for category_name, marker_expr in marker_categories.items():
        print(f"\n📊 Benchmarking: {category_name} ({marker_expr})")
        print("-" * 40)

        # Count tests first
        test_count = count_tests_by_marker(marker_expr)
        print(f"Tests found: {test_count}")

        if test_count == 0:
            print("⚠️  No tests found, skipping benchmark")
            results[category_name] = {
                "test_count": 0,
                "execution_time": 0,
                "avg_time_per_test": 0,
                "status": "no_tests",
            }
            continue

        # Run benchmark
        execution_time, exit_code, output = run_pytest_command(marker_expr)

        # Calculate metrics
        avg_time_per_test = execution_time / test_count if test_count > 0 else 0

        status = "success" if exit_code == 0 else "failed" if exit_code > 0 else "timeout"

        results[category_name] = {
            "test_count": test_count,
            "execution_time": execution_time,
            "avg_time_per_test": avg_time_per_test,
            "exit_code": exit_code,
            "status": status,
        }

        print(f"⏱️  Total time: {execution_time:.2f}s")
        print(f"📊 Avg per test: {avg_time_per_test * 1000:.1f}ms")
        print(f"✅ Status: {status}")

        if test_count > 20:
            print("⚠️  Large test set - consider sampling")

    # Print summary report
    print("\n" + "=" * 60)
    print("📋 BENCHMARK SUMMARY REPORT")
    print("=" * 60)

    # Sort by average time per test
    sorted_results = sorted(results.items(), key=lambda x: x[1]["avg_time_per_test"])

    print(f"{'Category':<20} {'Tests':<8} {'Total(s)':<10} {'Avg(ms)':<10} {'Status':<10}")
    print("-" * 70)

    for category, data in sorted_results:
        if data["test_count"] > 0:
            print(f"{category:<20} {data['test_count']:<8} {data['execution_time']:<10.2f} " f"{data['avg_time_per_test'] * 1000:<10.1f} {data['status']:<10}")

    # Performance analysis
    print("\n🔍 PERFORMANCE ANALYSIS:")

    # Identify fastest categories (should be unit tests)
    fastest_categories = [cat for cat, data in sorted_results if data["avg_time_per_test"] < 0.01 and data["test_count"] > 0]
    if fastest_categories:
        print(f"⚡ Fastest categories (<10ms avg): {', '.join(fastest_categories[:3])}")

    # Identify slowest categories
    slowest_categories = [cat for cat, data in sorted_results if data["avg_time_per_test"] > 1.0 and data["test_count"] > 0]
    if slowest_categories:
        print(f"🐌 Slowest categories (>1s avg): {', '.join(slowest_categories[-3:])}")

    # CI/CD recommendations
    print("\n🚀 CI/CD PIPELINE RECOMMENDATIONS:")

    ci_safe_data = results.get("ci_safe", {})
    if ci_safe_data.get("test_count", 0) > 0:
        print(f"✅ CI-safe tests: {ci_safe_data['test_count']} tests, " f"{ci_safe_data['execution_time']:.1f}s total")

    development_data = results.get("development", {})
    if development_data.get("test_count", 0) > 0:
        print(f"⚡ Development tests: {development_data['test_count']} tests, " f"{development_data['execution_time']:.1f}s total")

    # Test distribution validation
    total_tests = sum(data["test_count"] for data in results.values() if data["test_count"] > 0 and data["status"] != "no_tests")

    if total_tests > 0:
        print("\n📈 TEST DISTRIBUTION ANALYSIS:")
        unit_count = results.get("unit", {}).get("test_count", 0)
        integration_count = results.get("integration", {}).get("test_count", 0)
        slow_count = results.get("slow", {}).get("test_count", 0)

        if unit_count > 0:
            print(f"Unit tests: {unit_count} ({unit_count / total_tests * 100:.1f}%)")
        if integration_count > 0:
            print(f"Integration tests: {integration_count} ({integration_count / total_tests * 100:.1f}%)")
        if slow_count > 0:
            print(f"Slow tests: {slow_count} ({slow_count / total_tests * 100:.1f}%)")

    return results


if __name__ == "__main__":
    main()
