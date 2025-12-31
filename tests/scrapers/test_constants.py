"""Tests for centralized scraper constants."""

import pytest

from scrapers.constants import (
    CONCURRENT_UPLOAD_THRESHOLD,
    MAX_R2_FAILURE_RATE,
    SMALL_BATCH_THRESHOLD,
)


@pytest.mark.unit
@pytest.mark.fast
class TestBatchProcessingConstants:
    """Test batch processing configuration constants."""

    def test_small_batch_threshold_is_positive(self):
        assert SMALL_BATCH_THRESHOLD > 0
        assert isinstance(SMALL_BATCH_THRESHOLD, int)

    def test_small_batch_threshold_value(self):
        assert SMALL_BATCH_THRESHOLD == 3

    def test_concurrent_upload_threshold_is_positive(self):
        assert CONCURRENT_UPLOAD_THRESHOLD > 0
        assert isinstance(CONCURRENT_UPLOAD_THRESHOLD, int)

    def test_concurrent_upload_threshold_value(self):
        assert CONCURRENT_UPLOAD_THRESHOLD == 10

    def test_max_r2_failure_rate_is_percentage(self):
        assert 0 <= MAX_R2_FAILURE_RATE <= 100
        assert isinstance(MAX_R2_FAILURE_RATE, int)

    def test_max_r2_failure_rate_value(self):
        assert MAX_R2_FAILURE_RATE == 50


@pytest.mark.unit
@pytest.mark.fast
class TestConstantsRelationships:
    """Test that constants have sensible relationships."""

    def test_small_batch_is_less_than_concurrent_threshold(self):
        assert SMALL_BATCH_THRESHOLD < CONCURRENT_UPLOAD_THRESHOLD

    def test_concurrent_threshold_reasonable_for_parallel_uploads(self):
        assert CONCURRENT_UPLOAD_THRESHOLD >= 5
        assert CONCURRENT_UPLOAD_THRESHOLD <= 50

    def test_failure_rate_allows_some_failures(self):
        assert MAX_R2_FAILURE_RATE > 0
