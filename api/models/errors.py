# api/models/errors.py

"""
Structured error models for consistent error responses.
"""

from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from uuid import uuid4

from pydantic import BaseModel, Field, field_serializer


class ErrorType(str, Enum):
    """Types of errors that can occur."""

    DATABASE_CONNECTION = "database_connection"
    POOL_INITIALIZATION = "pool_initialization"
    QUERY_ERROR = "query_error"
    VALIDATION_ERROR = "validation_error"
    NOT_FOUND = "not_found"
    INTERNAL_ERROR = "internal_error"


class ErrorCode(str, Enum):
    """Specific error codes for detailed identification."""

    POOL_INIT_FAILED = "POOL_INIT_FAILED"
    POOL_NOT_INITIALIZED = "POOL_NOT_INITIALIZED"
    CONNECTION_REFUSED = "CONNECTION_REFUSED"
    CONNECTION_TIMEOUT = "CONNECTION_TIMEOUT"
    POOL_EXHAUSTED = "POOL_EXHAUSTED"
    QUERY_FAILED = "QUERY_FAILED"
    TRANSACTION_FAILED = "TRANSACTION_FAILED"
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    INVALID_REQUEST = "INVALID_REQUEST"
    UNKNOWN_ERROR = "UNKNOWN_ERROR"


class RetryInfo(BaseModel):
    """Information about retry suggestions."""

    suggested: bool = Field(description="Whether retry is suggested")
    after_seconds: Optional[int] = Field(None, description="Seconds to wait before retry")
    attempt: Optional[int] = Field(None, description="Current attempt number")
    max_attempts: Optional[int] = Field(None, description="Maximum number of attempts")


class ErrorDetail(BaseModel):
    """Detailed error information."""

    type: ErrorType = Field(description="Category of error")
    code: ErrorCode = Field(description="Specific error code")
    message: str = Field(description="User-friendly error message")
    detail: Optional[str] = Field(None, description="Technical details")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Error occurrence time")
    correlation_id: str = Field(default_factory=lambda: str(uuid4()), description="Request correlation ID")
    retry: Optional[RetryInfo] = Field(None, description="Retry information if applicable")

    @field_serializer("timestamp")
    def serialize_timestamp(self, timestamp: datetime, _info):
        return timestamp.isoformat()


class ErrorResponse(BaseModel):
    """Standard error response structure."""

    error: ErrorDetail


def create_pool_initialization_error(detail: str, retry_attempt: int = 1, max_attempts: int = 3) -> ErrorResponse:
    """Create a pool initialization error response."""
    return ErrorResponse(
        error=ErrorDetail(
            type=ErrorType.POOL_INITIALIZATION,
            code=ErrorCode.POOL_INIT_FAILED,
            message="Unable to initialize database connection pool",
            detail=detail,
            retry=(
                RetryInfo(suggested=retry_attempt < max_attempts, after_seconds=5 * (2 ** (retry_attempt - 1)), attempt=retry_attempt, max_attempts=max_attempts)  # Exponential backoff
                if retry_attempt < max_attempts
                else None
            ),
        )
    )


def create_pool_not_initialized_error() -> ErrorResponse:
    """Create an error for when pool is not initialized."""
    return ErrorResponse(
        error=ErrorDetail(
            type=ErrorType.DATABASE_CONNECTION,
            code=ErrorCode.POOL_NOT_INITIALIZED,
            message="Database connection pool is not initialized",
            detail="The connection pool failed to initialize at startup. Please try again in a few moments.",
            retry=RetryInfo(suggested=True, after_seconds=5),
        )
    )


def create_connection_error(detail: str, code: ErrorCode = ErrorCode.CONNECTION_REFUSED) -> ErrorResponse:
    """Create a database connection error response."""
    return ErrorResponse(error=ErrorDetail(type=ErrorType.DATABASE_CONNECTION, code=code, message="Database connection error", detail=detail, retry=RetryInfo(suggested=True, after_seconds=5)))


def create_query_error(detail: str) -> ErrorResponse:
    """Create a query execution error response."""
    return ErrorResponse(error=ErrorDetail(type=ErrorType.QUERY_ERROR, code=ErrorCode.QUERY_FAILED, message="Database query failed", detail=detail, retry=RetryInfo(suggested=False)))


def create_not_found_error(resource: str, identifier: str) -> ErrorResponse:
    """Create a resource not found error response."""
    return ErrorResponse(
        error=ErrorDetail(
            type=ErrorType.NOT_FOUND,
            code=ErrorCode.RESOURCE_NOT_FOUND,
            message=f"{resource} not found",
            detail=f"No {resource.lower()} found with identifier: {identifier}",
            retry=RetryInfo(suggested=False),
        )
    )
