"""Test endpoints for Sentry verification."""

import asyncio
import time
from typing import Any, Dict

import sentry_sdk
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/sentry-test")


class TestResponse(BaseModel):
    """Response model for test endpoints."""

    message: str
    details: Dict[str, Any] = {}


@router.get("/health", response_model=TestResponse)
async def sentry_health():
    """Verify Sentry is initialized and working."""
    client = sentry_sdk.get_client()

    # Check if client can capture events (handles both production and non-production clients)
    # NonRecordingClient doesn't have is_capturing() method, so check if method exists
    is_initialized = False
    if hasattr(client, "is_capturing"):
        is_initialized = client.is_capturing()
    else:
        # For NonRecordingClient, check if it's initialized by checking options
        is_initialized = bool(client.options)

    return TestResponse(
        message="Sentry health check",
        details={
            "sentry_initialized": is_initialized,
            "environment": sentry_sdk.get_client().options.get("environment"),
            "dsn_configured": bool(sentry_sdk.get_client().options.get("dsn")),
            "traces_sample_rate": sentry_sdk.get_client().options.get(
                "traces_sample_rate"
            ),
            "profiles_sample_rate": sentry_sdk.get_client().options.get(
                "profiles_sample_rate"
            ),
        },
    )


@router.get("/test-error", response_model=TestResponse)
async def test_error(
    error_type: str = Query(
        "exception",
        description="Type of error to trigger: exception, http_404, http_500",
    ),
):
    """Trigger a test error for Sentry verification."""

    if error_type == "exception":
        # This will be captured by Sentry
        raise ValueError("Test error from Sentry verification endpoint")
    elif error_type == "http_404":
        raise HTTPException(status_code=404, detail="Test 404 error for Sentry")
    elif error_type == "http_500":
        raise HTTPException(status_code=500, detail="Test 500 error for Sentry")
    else:
        return TestResponse(
            message="Unknown error type",
            details={
                "error_type": error_type,
                "valid_types": ["exception", "http_404", "http_500"],
            },
        )


@router.get("/test-performance", response_model=TestResponse)
async def test_performance(
    delay_ms: int = Query(
        100, description="Delay in milliseconds to simulate slow operation"
    ),
):
    """Test performance monitoring with configurable delay."""

    with sentry_sdk.start_transaction(
        name="test-performance", op="test"
    ) as transaction:
        transaction.set_tag("test_type", "performance")

        # Simulate database query
        with sentry_sdk.start_span(op="db.query", name="Simulated DB query"):
            await asyncio.sleep(delay_ms / 1000)

        # Simulate processing
        with sentry_sdk.start_span(op="processing", name="Simulated processing"):
            await asyncio.sleep(delay_ms / 2000)

        # Add some custom measurements
        transaction.set_measurement("delay_ms", delay_ms)
        transaction.set_measurement("total_time_ms", delay_ms * 1.5)

    return TestResponse(
        message="Performance test completed",
        details={
            "requested_delay_ms": delay_ms,
            "total_simulated_time_ms": delay_ms * 1.5,
            "transaction_recorded": True,
        },
    )


@router.get("/test-breadcrumb", response_model=TestResponse)
async def test_breadcrumb():
    """Test breadcrumb recording."""

    # Add various breadcrumbs
    sentry_sdk.add_breadcrumb(
        category="test", message="Test breadcrumb 1", level="info", data={"step": 1}
    )

    sentry_sdk.add_breadcrumb(
        category="test", message="Test breadcrumb 2", level="warning", data={"step": 2}
    )

    sentry_sdk.add_breadcrumb(
        category="test", message="Test breadcrumb 3", level="error", data={"step": 3}
    )

    return TestResponse(
        message="Breadcrumbs added",
        details={
            "breadcrumbs_added": 3,
            "note": "Breadcrumbs will be visible when an error occurs",
        },
    )


@router.get("/test-custom-event", response_model=TestResponse)
async def test_custom_event(
    event_type: str = Query("info", description="Event type: info, warning, error"),
):
    """Test custom event capture."""

    if event_type == "info":
        sentry_sdk.capture_message(
            "Test info message from Sentry test endpoint", level="info"
        )
    elif event_type == "warning":
        sentry_sdk.capture_message(
            "Test warning message from Sentry test endpoint", level="warning"
        )
    elif event_type == "error":
        sentry_sdk.capture_message(
            "Test error message from Sentry test endpoint", level="error"
        )
    else:
        return TestResponse(
            message="Unknown event type",
            details={
                "event_type": event_type,
                "valid_types": ["info", "warning", "error"],
            },
        )

    return TestResponse(
        message=f"Custom {event_type} event sent to Sentry",
        details={"event_type": event_type, "timestamp": time.time()},
    )


@router.get("/test-user-context", response_model=TestResponse)
async def test_user_context(
    user_id: str = Query("test-user-123", description="User ID to set in context"),
    email: str = Query("test@example.com", description="User email to set in context"),
):
    """Test user context setting."""

    with sentry_sdk.push_scope() as scope:
        scope.set_user({"id": user_id, "email": email, "username": f"user_{user_id}"})

        # Send a test message with user context
        sentry_sdk.capture_message(
            f"Test message with user context for {email}", level="info"
        )

    return TestResponse(
        message="User context set and test event sent",
        details={"user_id": user_id, "email": email, "username": f"user_{user_id}"},
    )


@router.get("/test-tags", response_model=TestResponse)
async def test_tags():
    """Test tag setting."""

    with sentry_sdk.push_scope() as scope:
        scope.set_tag("test_endpoint", "sentry-test")
        scope.set_tag("feature", "monitoring")
        scope.set_tag("test_type", "verification")

        # Send a test message with tags
        sentry_sdk.capture_message("Test message with custom tags", level="info")

    return TestResponse(
        message="Tags set and test event sent",
        details={
            "tags": {
                "test_endpoint": "sentry-test",
                "feature": "monitoring",
                "test_type": "verification",
            }
        },
    )
