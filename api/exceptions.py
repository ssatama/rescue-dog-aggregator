# api/exceptions.py

"""
Standardized exception handling for the API.

This module provides consistent error handling patterns across all endpoints.
"""

import logging
from typing import Any

import httpx
import psycopg2
from fastapi import HTTPException, status
from pydantic import ValidationError as PydanticValidationError

logger = logging.getLogger(__name__)


class APIException(HTTPException):
    """Base exception class for API errors."""

    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str | None = None,
        headers: dict[str, Any] | None = None,
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class DatabaseError(APIException):
    """Database-related errors."""

    def __init__(self, detail: str, original_error: Exception | None = None):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {detail}",
            error_code="DATABASE_ERROR",
        )
        self.original_error = original_error


class ValidationError(APIException):
    """Validation-related errors."""

    def __init__(self, detail: str, field: str | None = None):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation error: {detail}",
            error_code="VALIDATION_ERROR",
        )
        self.field = field


class NotFoundError(APIException):
    """Resource not found errors."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"{resource} not found: {identifier}",
            error_code="NOT_FOUND",
        )


class AuthenticationError(APIException):
    """Authentication-related errors."""

    def __init__(self, detail: str = "Authentication required"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            error_code="AUTHENTICATION_ERROR",
        )


class LLMServiceError(APIException):
    """LLM service-related errors."""

    def __init__(
        self,
        detail: str = "LLM service error",
        original_error: Exception | None = None,
    ):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            error_code="LLM_SERVICE_ERROR",
        )
        self.original_error = original_error


class RateLimitError(APIException):
    """Rate limiting errors."""

    def __init__(self, detail: str = "Rate limit exceeded"):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            error_code="RATE_LIMIT_ERROR",
        )


class InvalidInputError(APIException):
    """Invalid input errors."""

    def __init__(self, detail: str, field: str | None = None):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
            error_code="INVALID_INPUT",
        )
        self.field = field


def handle_database_error(error: Exception, operation: str) -> None:
    """
    Handle database errors with Sentry capture, logging, and exception raising.

    This function captures the error to Sentry with operation context
    before logging and raising a DatabaseError.

    Args:
        error: The database error that occurred
        operation: Description of the operation that failed
    """
    # Import Sentry here to avoid circular imports with monitoring module
    import sentry_sdk

    # Capture to Sentry with context
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error.type", "database")
        scope.set_tag("operation", operation)
        scope.set_context(
            "database",
            {
                "operation": operation,
                "error_type": type(error).__name__,
                "error_message": str(error),
            },
        )
        sentry_sdk.capture_exception(error)

    if isinstance(error, psycopg2.Error):
        logger.error(f"Database error during {operation}: {error}")
        raise DatabaseError(f"Failed to {operation}", original_error=error)
    else:
        logger.exception(f"Unexpected error during {operation}: {error}")
        raise DatabaseError(f"Unexpected error during {operation}", original_error=error)


def handle_validation_error(error: Exception, context: str) -> None:
    """
    Handle validation errors with proper logging and exception raising.

    Args:
        error: The validation error that occurred
        context: Description of the validation context
    """
    import sentry_sdk

    # Capture to Sentry with context
    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error.type", "validation")
        scope.set_tag("context", context)
        scope.set_context(
            "validation",
            {
                "context": context,
                "error_type": type(error).__name__,
                "error_message": str(error),
            },
        )
        sentry_sdk.capture_exception(error)

    if isinstance(error, PydanticValidationError):
        logger.error(f"Validation error in {context}: {error}")
        raise ValidationError(str(error))
    else:
        logger.exception(f"Unexpected validation error in {context}: {error}")
        raise ValidationError(f"Validation failed in {context}")


def handle_llm_error(error: Exception, operation: str) -> None:
    """
    Handle LLM service errors with proper logging and secure error responses.

    This function ensures no internal details are exposed to clients while
    providing detailed logging for debugging.

    Args:
        error: The LLM service error that occurred
        operation: Description of the operation that failed
    """
    # Log full error details for debugging (server-side only)
    logger.error(f"LLM service error during {operation}: {type(error).__name__}: {error}")

    # Capture to Sentry with rich context
    import sentry_sdk

    with sentry_sdk.push_scope() as scope:
        scope.set_tag("error.type", "llm_service")
        scope.set_tag("operation", operation)
        scope.set_context(
            "llm",
            {
                "operation": operation,
                "error_type": type(error).__name__,
                "error_message": str(error),
            },
        )
        sentry_sdk.capture_exception(error)

    # Categorize errors and provide safe client responses
    if isinstance(error, httpx.HTTPStatusError):
        if error.response.status_code == 401:
            logger.error(f"LLM API authentication failed for {operation}")
            raise LLMServiceError("LLM service authentication failed")
        elif error.response.status_code == 429:
            logger.warning(f"LLM API rate limit exceeded for {operation}")
            raise RateLimitError("LLM service rate limit exceeded, please try again later")
        elif error.response.status_code == 413:
            raise InvalidInputError("Input text is too long for processing")
        elif 400 <= error.response.status_code < 500:
            logger.error(f"LLM API client error {error.response.status_code} for {operation}")
            raise InvalidInputError("Invalid request for LLM processing")
        else:
            logger.error(f"LLM API server error {error.response.status_code} for {operation}")
            raise LLMServiceError("LLM service temporarily unavailable")

    elif isinstance(error, httpx.TimeoutException):
        logger.warning(f"LLM API timeout for {operation}")
        raise LLMServiceError("LLM service request timeout, please try again")

    elif isinstance(error, httpx.ConnectError):
        logger.error(f"LLM API connection error for {operation}")
        raise LLMServiceError("LLM service temporarily unavailable")

    elif isinstance(error, (ValueError, KeyError, TypeError)) and "json" in str(error).lower():
        logger.error(f"LLM API response parsing error for {operation}: {error}")
        raise LLMServiceError("LLM service response format error")

    elif isinstance(error, ValueError) and any(keyword in str(error).lower() for keyword in ["empty", "invalid", "missing"]):
        logger.warning(f"Invalid input for LLM {operation}: {error}")
        raise InvalidInputError(f"Invalid input for {operation}")

    else:
        # Generic error - log full details but return sanitized message
        logger.exception(f"Unexpected error during LLM {operation}")
        raise LLMServiceError(f"LLM service error during {operation}")


def safe_execute(operation_name: str):
    """
    Decorator for safe execution of database operations.

    Args:
        operation_name: Name of the operation for error reporting
    """

    def decorator(func):
        def wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except psycopg2.Error as db_err:
                handle_database_error(db_err, operation_name)
            except ValidationError as ve:
                handle_validation_error(ve, operation_name)
            except Exception as e:
                logger.exception(f"Unexpected error in {operation_name}: {e}")
                raise APIException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"Internal server error during {operation_name}",
                    error_code="INTERNAL_ERROR",
                )

        return wrapper

    return decorator


# Standard error responses
STANDARD_RESPONSES = {
    400: {"description": "Bad Request - Invalid parameters"},
    401: {"description": "Unauthorized - Authentication required"},
    404: {"description": "Not Found - Resource does not exist"},
    422: {"description": "Unprocessable Entity - Validation error"},
    429: {"description": "Too Many Requests - Rate limit exceeded"},
    500: {"description": "Internal Server Error - Database or system error"},
    503: {"description": "Service Unavailable - External service error"},
}


# Enhanced Animals Exceptions
class EnhancedAnimalError(Exception):
    """Base exception for enhanced animal operations."""

    def __init__(
        self,
        message: str,
        animal_id: int | None = None,
        operation: str | None = None,
        details: dict[str, Any] | None = None,
    ):
        self.message = message
        self.animal_id = animal_id
        self.operation = operation
        self.details = details or {}
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        """Convert exception to dictionary for API responses."""
        return {
            "error": self.__class__.__name__,
            "message": self.message,
            "animal_id": self.animal_id,
            "operation": self.operation,
            "details": self.details,
        }


class CacheError(EnhancedAnimalError):
    """Raised when cache operations fail."""

    pass


class DataNotEnrichedError(EnhancedAnimalError):
    """Raised when animal has no enhanced data."""

    pass


class InvalidAttributeError(EnhancedAnimalError):
    """Raised when invalid attributes are requested."""

    pass


class DatabaseRetryExhaustedError(EnhancedAnimalError):
    """Raised when all database retry attempts fail."""

    pass


class DataNormalizationError(EnhancedAnimalError):
    """Raised when LLM data cannot be normalized."""

    pass
