# api/exceptions.py

"""
Standardized exception handling for the API.

This module provides consistent error handling patterns across all endpoints.
"""

import logging
from typing import Any, Dict, Optional

import psycopg2
from fastapi import HTTPException, status
from pydantic import ValidationError

logger = logging.getLogger(__name__)


class APIException(HTTPException):
    """Base exception class for API errors."""

    def __init__(self, status_code: int, detail: str, error_code: Optional[str] = None, headers: Optional[Dict[str, Any]] = None):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code


class DatabaseError(APIException):
    """Database-related errors."""

    def __init__(self, detail: str, original_error: Optional[Exception] = None):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error: {detail}", error_code="DATABASE_ERROR")
        self.original_error = original_error


class ValidationError(APIException):
    """Validation-related errors."""

    def __init__(self, detail: str, field: Optional[str] = None):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Validation error: {detail}", error_code="VALIDATION_ERROR")
        self.field = field


class NotFoundError(APIException):
    """Resource not found errors."""

    def __init__(self, resource: str, identifier: Any):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=f"{resource} not found: {identifier}", error_code="NOT_FOUND")


class AuthenticationError(APIException):
    """Authentication-related errors."""

    def __init__(self, detail: str = "Authentication required"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail, error_code="AUTHENTICATION_ERROR")


def handle_database_error(error: Exception, operation: str) -> None:
    """
    Handle database errors with proper logging and exception raising.

    Args:
        error: The database error that occurred
        operation: Description of the operation that failed
    """
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
    if isinstance(error, ValidationError):
        logger.error(f"Validation error in {context}: {error}")
        raise ValidationError(str(error))
    else:
        logger.exception(f"Unexpected validation error in {context}: {error}")
        raise ValidationError(f"Validation failed in {context}")


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
                raise APIException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Internal server error during {operation_name}", error_code="INTERNAL_ERROR")

        return wrapper

    return decorator


# Standard error responses
STANDARD_RESPONSES = {
    400: {"description": "Bad Request - Invalid parameters"},
    401: {"description": "Unauthorized - Authentication required"},
    404: {"description": "Not Found - Resource does not exist"},
    422: {"description": "Unprocessable Entity - Validation error"},
    500: {"description": "Internal Server Error - Database or system error"},
}
