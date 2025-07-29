"""
Database test fixtures for service testing.

Provides comprehensive mocking infrastructure for database operations
including connection management, transaction tracking, and test data generation.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from unittest.mock import MagicMock, Mock

import pytest


@pytest.fixture
def mock_db_connection():
    """Mock psycopg2 connection with rollback tracking.

    Returns:
        Tuple of (mock_connection, mock_cursor) with transaction tracking
    """
    mock_conn = Mock()
    mock_cursor = Mock()

    # Track transaction state
    mock_conn.rollback_called = False
    mock_conn.commit_called = False

    # Set up rollback tracking
    def track_rollback():
        mock_conn.rollback_called = True

    def track_commit():
        mock_conn.commit_called = True

    mock_conn.rollback = Mock(side_effect=track_rollback)
    mock_conn.commit = Mock(side_effect=track_commit)
    mock_conn.cursor.return_value = mock_cursor

    # Cursor should track executed queries
    mock_cursor.executed_queries = []
    original_execute = mock_cursor.execute

    def track_execute(query, params=None):
        mock_cursor.executed_queries.append((query, params))
        return original_execute(query, params)

    mock_cursor.execute = Mock(side_effect=track_execute)
    mock_cursor.fetchone.return_value = None
    mock_cursor.fetchall.return_value = []
    mock_cursor.rowcount = 0

    return mock_conn, mock_cursor


@pytest.fixture
def sample_animal_data():
    """Generate realistic animal data for testing.

    Returns:
        List of dictionaries with various data quality levels
    """
    return [
        {
            # High quality data - all fields present
            "name": "Max",
            "breed": "Golden Retriever",
            "age_text": "2 years",
            "external_id": "dog-001",
            "sex": "Male",
            "size": "Large",
            "primary_image_url": "https://example.com/max.jpg",
            "adoption_url": "https://example.com/adopt/dog-001",
            "organization_id": 1,
            "animal_type": "dog",
            "status": "available",
        },
        {
            # Medium quality - missing some optional fields
            "name": "Luna",
            "breed": "German Shepherd Mix",
            "age_text": "3-4 years",
            "external_id": "dog-002",
            "sex": "Female",
            "primary_image_url": "https://example.com/luna.jpg",
            "adoption_url": "https://example.com/adopt/dog-002",
            "organization_id": 1,
            "animal_type": "dog",
            "status": "available",
            # Missing: size
        },
        {
            # Low quality - minimal required fields only
            "name": "Charlie",
            "breed": "",
            "age_text": "Adult",
            "external_id": "dog-003",
            "adoption_url": "https://example.com/adopt/dog-003",
            "organization_id": 1,
            "animal_type": "dog",
            # Missing: sex, size, primary_image_url, status
        },
        {
            # Edge case - empty strings and minimal data
            "name": "Unknown",
            "breed": "",
            "age_text": "",
            "external_id": "dog-004",
            "adoption_url": "https://example.com/adopt/dog-004",
            "organization_id": 1,
            "animal_type": "dog",
        },
    ]


@pytest.fixture
def historical_scrape_data():
    """Generate historical scrape logs for failure detection testing.

    Returns:
        List of tuples simulating scrape log history
    """
    base_time = datetime.now() - timedelta(days=30)

    # Normal scrape history - consistent animal counts
    normal_history = [
        (50, 1),  # (dogs_found, count)
        (48, 1),
        (52, 1),
        (49, 1),
        (51, 1),
    ]

    # Declining history - simulating partial failures
    declining_history = [
        (50, 1),
        (40, 1),
        (25, 1),
        (10, 1),
        (2, 1),
    ]

    # Volatile history - inconsistent counts
    volatile_history = [
        (50, 1),
        (10, 1),
        (45, 1),
        (5, 1),
        (48, 1),
    ]

    return {
        "normal": normal_history,
        "declining": declining_history,
        "volatile": volatile_history,
        "no_history": [],  # New organization with no history
    }


@pytest.fixture
def mock_session_manager_db():
    """Mock database connection specifically for SessionManager testing.

    Returns:
        Mock connection configured for SessionManager operations
    """
    mock_conn, mock_cursor = mock_db_connection()

    # Set up common SessionManager query responses
    mock_cursor.fetchone.side_effect = [
        (45.0, 5),  # Average dogs found, count of scrapes
        None,  # No more results
    ]

    return mock_conn


@pytest.fixture
def failure_scenario_generator():
    """Generate various failure scenarios for testing.

    Returns:
        Dictionary of failure scenarios with test parameters
    """
    return {
        "zero_animals": {
            "animals_found": 0,
            "threshold_percentage": 0.5,
            "absolute_minimum": 3,
            "minimum_historical_scrapes": 3,
            "total_animals_before_filter": 0,
            "total_animals_skipped": 0,
            "expected_result": True,  # Should detect failure
        },
        "below_absolute_minimum": {
            "animals_found": 2,
            "threshold_percentage": 0.5,
            "absolute_minimum": 3,
            "minimum_historical_scrapes": 3,
            "total_animals_before_filter": 2,
            "total_animals_skipped": 0,
            "expected_result": True,
        },
        "below_percentage_threshold": {
            "animals_found": 20,
            "threshold_percentage": 0.5,
            "absolute_minimum": 3,
            "minimum_historical_scrapes": 3,
            "total_animals_before_filter": 20,
            "total_animals_skipped": 0,
            "expected_result": True,  # If historical average is 50
        },
        "normal_operation": {
            "animals_found": 45,
            "threshold_percentage": 0.5,
            "absolute_minimum": 3,
            "minimum_historical_scrapes": 3,
            "total_animals_before_filter": 45,
            "total_animals_skipped": 0,
            "expected_result": False,  # Should not detect failure
        },
        "skip_existing_normal": {
            "animals_found": 0,
            "threshold_percentage": 0.5,
            "absolute_minimum": 3,
            "minimum_historical_scrapes": 3,
            "total_animals_before_filter": 50,
            "total_animals_skipped": 50,
            "expected_result": False,  # Normal when all animals skipped
            "skip_existing_animals": True,  # This scenario requires skip_existing_animals to be enabled
        },
    }


@pytest.fixture
def mock_db_error_scenarios():
    """Generate database error scenarios for error handling tests.

    Returns:
        Dictionary of error scenarios with mock configurations
    """
    import psycopg2

    return {
        "connection_lost": psycopg2.OperationalError("connection lost"),
        "query_timeout": psycopg2.OperationalError("query timeout"),
        "constraint_violation": psycopg2.IntegrityError("unique constraint violated"),
        "deadlock": psycopg2.OperationalError("deadlock detected"),
        "invalid_query": psycopg2.ProgrammingError("syntax error in query"),
    }


@pytest.fixture
def animal_quality_test_data():
    """Generate animal data with various quality levels for testing.

    Returns:
        Dictionary of test data categorized by quality
    """
    return {
        "high_quality": [
            {
                "name": "Buddy",
                "breed": "Labrador Retriever",
                "age_text": "2 years",
                "external_id": "lab-001",
                "sex": "Male",
                "size": "Large",
                "primary_image_url": "https://example.com/buddy.jpg",
                "adoption_url": "https://example.com/adopt/lab-001",
            }
        ],
        "medium_quality": [
            {
                "name": "Rex",
                "breed": "Mixed Breed",
                "age_text": "Adult",
                "external_id": "mix-001",
                "primary_image_url": "https://example.com/rex.jpg",
                "adoption_url": "https://example.com/adopt/mix-001",
                # Missing: sex, size
            }
        ],
        "low_quality": [
            {
                "name": "Dog",
                "breed": "",
                "age_text": "",
                "external_id": "unknown-001",
                "adoption_url": "https://example.com/adopt/unknown-001",
                # Missing: sex, size, primary_image_url
            }
        ],
        "empty": [],
        "malformed": [
            {
                "name": None,
                "breed": 123,  # Wrong type
                "age_text": [],  # Wrong type
                "external_id": "",
                "adoption_url": None,
            }
        ],
    }
