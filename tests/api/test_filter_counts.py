"""
Tests for filter counts API endpoint.

This module tests the dynamic filter counts functionality that prevents
dead-end filtering by providing real-time counts for each filter option.
"""

import pytest
from fastapi.testclient import TestClient

from api.main import app

client = TestClient(app)


@pytest.mark.slow
@pytest.mark.database
@pytest.mark.api
class TestFilterCountsAPI:
    """Test class for filter counts endpoint."""

    def test_filter_counts_endpoint_exists(self):
        """Test that the filter counts endpoint exists and returns 200."""
        response = client.get("/api/animals/meta/filter_counts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

    def test_filter_counts_basic_structure(self):
        """Test that filter counts returns the expected structure."""
        response = client.get("/api/animals/meta/filter_counts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        # Expected structure for filter counts
        expected_keys = ["size_options", "age_options", "sex_options", "breed_options", "organization_options", "location_country_options", "available_country_options", "available_region_options"]

        for key in expected_keys:
            assert key in data, f"Missing {key} in response"
            assert isinstance(data[key], list), f"{key} should be a list"

    def test_filter_counts_with_context(self):
        """Test that filter counts respect current filter context."""
        # When filtering by size=Large, only options that work with Large dogs should show counts
        response = client.get("/api/animals/meta/filter_counts?standardized_size=Large")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        # Should have age options that exist for Large dogs in the test database
        age_options = data.get("age_options", [])
        if age_options:
            # All returned options should have count > 0
            for age_option in age_options:
                assert age_option["count"] > 0, f"Age option should have count > 0: {age_option}"

    def test_filter_counts_hide_zero_options(self):
        """Test that options with 0 count are hidden from results."""
        response = client.get("/api/animals/meta/filter_counts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        # All returned options should have count > 0
        for option_type in ["size_options", "age_options", "sex_options"]:
            if option_type in data:
                for option in data[option_type]:
                    assert "count" in option, f"Option missing count: {option}"
                    assert option["count"] > 0, f"Option should have count > 0: {option}"

    def test_filter_counts_option_structure(self):
        """Test that each filter option has the correct structure."""
        response = client.get("/api/animals/meta/filter_counts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        for option_type in data:
            if isinstance(data[option_type], list):
                for option in data[option_type]:
                    # Each option should have value, label, and count
                    assert "value" in option, f"Option missing value: {option}"
                    assert "label" in option, f"Option missing label: {option}"
                    assert "count" in option, f"Option missing count: {option}"

                    # Validate types
                    assert isinstance(option["value"], str), "Value should be string"
                    assert isinstance(option["label"], str), "Label should be string"
                    assert isinstance(option["count"], int), "Count should be integer"
                    assert option["count"] >= 0, "Count should be non-negative"

    def test_filter_counts_no_extra_large_dead_end(self):
        """Test that Extra Large size is not returned when count is 0 (fixes dead-end issue)."""
        response = client.get("/api/animals/meta/filter_counts")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        size_options = data.get("size_options", [])
        size_values = [opt["value"] for opt in size_options]

        # If there are no XLarge dogs in the test database, it shouldn't appear
        # This is the core feature - hiding dead-end filter options
        if "XLarge" in size_values:
            # If XLarge appears, it must have count > 0
            xlarge_option = next(opt for opt in size_options if opt["value"] == "XLarge")
            assert xlarge_option["count"] > 0, "XLarge should not appear with count 0"

    def test_filter_counts_with_multiple_filters(self):
        """Test filter counts with multiple active filters."""
        # Apply multiple filters and verify counts are calculated correctly
        params = "standardized_size=Large&sex=Female"
        response = client.get(f"/api/animals/meta/filter_counts?{params}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"

        data = response.json()

        # Should only show organizations that have Large Female dogs
        org_options = data.get("organization_options", [])

        # All organization counts should reflect only Large Female dogs
        for org in org_options:
            assert org["count"] > 0, "Organization should only appear if it has matching dogs"

    def test_filter_counts_performance_response_time(self):
        """Test that filter counts API responds within acceptable time limits."""
        import time

        start_time = time.time()
        response = client.get("/api/animals/meta/filter_counts")
        end_time = time.time()

        response_time_ms = (end_time - start_time) * 1000

        # Should respond within 300ms as per requirements
        assert response_time_ms < 300, f"Response time {response_time_ms}ms exceeds 300ms limit"

    def test_filter_counts_error_handling(self):
        """Test error handling for invalid filter parameters."""
        # Test with invalid size parameter
        response = client.get("/api/animals/meta/filter_counts?standardized_size=InvalidSize")

        # Should handle gracefully - 422 is correct for validation errors
        assert response.status_code in [200, 400, 422], "Should handle invalid parameters gracefully"

        if response.status_code in [400, 422]:
            error_data = response.json()
            assert "detail" in error_data, "Error response should have detail"
