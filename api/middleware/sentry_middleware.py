"""Sentry middleware for timeout detection.

Note: SentryPerformanceMiddleware was removed as dead code -
FastApiIntegration handles performance tracking automatically.
"""

import logging
import os
from collections.abc import Callable

import sentry_sdk
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger(__name__)


class SentryTimeoutMiddleware(BaseHTTPMiddleware):
    """Middleware to detect and report request timeouts."""

    def __init__(self, app: ASGIApp, timeout_seconds: int = 30):
        super().__init__(app)
        self.timeout_seconds = timeout_seconds

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Monitor for request timeouts."""

        # Only track in production
        environment = os.getenv("ENVIRONMENT", "development").lower()
        if environment != "production":
            # Skip timeout tracking in non-production environments
            return await call_next(request)

        import asyncio

        try:
            # Set a timeout for the request
            response = await asyncio.wait_for(call_next(request), timeout=self.timeout_seconds)
            return response

        except TimeoutError:
            # Capture timeout as an error
            error_msg = f"Request timeout: {request.method} {request.url.path} exceeded {self.timeout_seconds}s"

            with sentry_sdk.new_scope() as scope:
                scope.set_tag("error.type", "timeout")
                scope.set_tag("timeout.seconds", self.timeout_seconds)
                scope.set_context(
                    "request",
                    {
                        "method": request.method,
                        "url": str(request.url),
                        "headers": dict(request.headers),
                    },
                )
                sentry_sdk.capture_message(error_msg, level="error", scope=scope)

            # Re-raise to let FastAPI handle it
            raise
