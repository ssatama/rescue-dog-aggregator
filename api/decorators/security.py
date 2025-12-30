"""
Security decorators for API routes.

Provides authentication and authorization decorators for securing endpoints.
"""

import functools
import logging
from typing import Callable

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)


def internal_only(func: Callable) -> Callable:
    """
    Decorator to restrict endpoint access to internal requests only.

    This decorator ensures that certain sensitive operations (like bypassing
    limits) can only be performed by internal services, not external clients.

    Usage:
        @router.get("/internal/animals")
        @internal_only
        async def get_all_animals_internal(request: Request):
            # This endpoint can bypass normal limits
            pass
    """

    @functools.wraps(func)
    async def wrapper(*args, **kwargs):
        # Find the request object in args or kwargs
        request = None
        for arg in args:
            if isinstance(arg, Request):
                request = arg
                break
        if not request:
            request = kwargs.get("request")

        if not request:
            logger.error("internal_only decorator used without Request object")
            raise HTTPException(status_code=500, detail="Internal server error")

        # Check if request is internal
        # In production, this would check headers, IP, or authentication tokens
        # For now, we check for a special header
        internal_key = request.headers.get("X-Internal-Key")
        expected_key = "rescue-dogs-internal-2024"  # Should be in environment variable

        if internal_key != expected_key:
            # Log potential security issue
            client_ip = request.client.host if request.client else "unknown"
            logger.warning(
                f"Unauthorized internal endpoint access attempt from {client_ip} "
                f"to {request.url.path}"
            )
            raise HTTPException(
                status_code=403,
                detail="This endpoint is restricted to internal services only",
            )

        # Log successful internal access for audit
        logger.info(f"Internal access granted to {request.url.path}")

        # Call the original function
        if asyncio.iscoroutinefunction(func):
            return await func(*args, **kwargs)
        return func(*args, **kwargs)

    return wrapper


def rate_limit(max_requests: int = 100, window_seconds: int = 60):
    """
    Rate limiting decorator for API endpoints.

    Args:
        max_requests: Maximum number of requests allowed
        window_seconds: Time window in seconds

    Usage:
        @router.get("/animals")
        @rate_limit(max_requests=50, window_seconds=60)
        async def get_animals():
            pass
    """

    def decorator(func: Callable) -> Callable:
        # Simple in-memory rate limiting (should use Redis in production)
        request_counts = {}

        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            if not request:
                request = kwargs.get("request")

            if request:
                client_ip = request.client.host if request.client else "unknown"
                current_time = time.time()

                # Clean old entries
                request_counts[client_ip] = [
                    t
                    for t in request_counts.get(client_ip, [])
                    if current_time - t < window_seconds
                ]

                # Check rate limit
                if len(request_counts.get(client_ip, [])) >= max_requests:
                    logger.warning(f"Rate limit exceeded for {client_ip}")
                    raise HTTPException(
                        status_code=429,
                        detail="Rate limit exceeded. Please try again later.",
                    )

                # Record this request
                request_counts.setdefault(client_ip, []).append(current_time)

            # Call original function
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            return func(*args, **kwargs)

        return wrapper

    return decorator


import asyncio
import time
