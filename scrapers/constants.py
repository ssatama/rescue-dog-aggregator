"""Centralized constants for scraper configuration.

This module consolidates batch processing and R2 upload constants
that were previously scattered in BaseScraper.
"""

SMALL_BATCH_THRESHOLD = 3
"""Threshold below which smaller batch sizes are used for image processing.

When the number of animals is at or below this threshold, the batch size
is set to the number of animals to avoid unnecessary overhead.
"""

CONCURRENT_UPLOAD_THRESHOLD = 10
"""Threshold above which concurrent image uploads are enabled.

When processing more than this many animals, concurrent uploads
are used for better performance.
"""

MAX_R2_FAILURE_RATE = 50
"""Maximum R2 failure rate (percentage) before batch processing is skipped.

If the R2 service reports a failure rate above this threshold,
batch image processing is skipped to avoid cascading failures.
"""
