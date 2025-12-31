# api/dependencies.py

import logging
import os
import sys
from typing import Generator

import psycopg2
from fastapi import HTTPException
from psycopg2.extras import RealDictCursor

from api.database import get_pooled_cursor
from config import DB_CONFIG  # DB_CONFIG is imported here

# Add project root to path so we can import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# Ensure logger is configured (config.py might do this, but being explicit
# is safe)
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)


def get_db_cursor() -> Generator[RealDictCursor, None, None]:
    """
    Dependency that provides a database cursor (RealDictCursor).
    Manages connection, cursor, and transaction lifecycle.
    """
    conn = None
    cursor = None
    try:
        # Build connection parameters (using the imported DB_CONFIG)
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
            "port": DB_CONFIG.get("port", 5432),
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        conn = psycopg2.connect(**conn_params)
        # Changed level to debug
        logger.debug(f"Cursor Connection opened: {id(conn)}")
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        logger.debug(f"Cursor created: {id(cursor)} for connection {id(conn)}")  # Changed level to debug
        yield cursor

        logger.debug(f"Committing transaction for connection {id(conn)}")  # Changed level to debug
        conn.commit()

    except HTTPException as http_exc:  # Keep the specific HTTPException handling
        logger.warning(f"[dependencies.py get_db_cursor] HTTPException caught, rolling back: {http_exc.detail}")
        if conn:
            conn.rollback()
        raise http_exc
    except psycopg2.Error as db_err:
        logger.error(f"[dependencies.py get_db_cursor] Database error, rolling back: {db_err}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database dependency error: {db_err}")
    except Exception as e:
        logger.exception(f"[dependencies.py get_db_cursor] Unexpected error, rolling back: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error in dependency: {type(e).__name__}: {e}",
        )
    finally:
        if cursor:
            # Changed level to debug
            logger.debug(f"Cursor closing: {id(cursor)}")
            cursor.close()
        if conn:
            logger.debug(f"Cursor Connection closing: {id(conn)}")  # Changed level to debug
            conn.close()


def get_database_connection() -> Generator[psycopg2.extensions.connection, None, None]:
    """
    Dependency that provides a database connection.
    Used for monitoring endpoints that need direct connection access.
    """
    conn = None
    try:
        # Build connection parameters
        conn_params = {
            "host": DB_CONFIG["host"],
            "user": DB_CONFIG["user"],
            "database": DB_CONFIG["database"],
            "port": DB_CONFIG.get("port", 5432),
        }
        if DB_CONFIG["password"]:
            conn_params["password"] = DB_CONFIG["password"]

        conn = psycopg2.connect(**conn_params)
        logger.debug(f"Monitoring Connection opened: {id(conn)}")
        yield conn

        logger.debug(f"Committing transaction for monitoring connection {id(conn)}")
        conn.commit()

    except HTTPException as http_exc:
        logger.warning(f"[dependencies.py get_database_connection] HTTPException caught, rolling back: {http_exc.detail}")
        if conn:
            conn.rollback()
        raise http_exc
    except psycopg2.Error as db_err:
        logger.error(f"[dependencies.py get_database_connection] Database error, rolling back: {db_err}")
        if conn:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Database dependency error: {db_err}")
    except Exception as e:
        logger.exception(f"[dependencies.py get_database_connection] Unexpected error, rolling back: {e}")
        if conn:
            conn.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error in dependency: {type(e).__name__}: {e}",
        )
    finally:
        if conn:
            logger.debug(f"Monitoring Connection closing: {id(conn)}")
            conn.close()


def get_pooled_db_cursor() -> Generator[RealDictCursor, None, None]:
    """
    Dependency that provides a database cursor from the connection pool.

    This is an optimized version of get_db_cursor that uses connection pooling
    for better performance under high load.
    """
    from api.models.errors import (
        create_connection_error,
        create_pool_not_initialized_error,
    )

    try:
        with get_pooled_cursor() as cursor:
            yield cursor
    except HTTPException:
        # Let HTTPExceptions from routes bubble up without modification
        raise
    except RuntimeError as e:
        error_msg = str(e)
        logger.error(f"Pool error in dependency: {error_msg}")

        # Handle specific pool errors with structured responses
        if "not initialized" in error_msg.lower():
            error_response = create_pool_not_initialized_error()
            raise HTTPException(status_code=503, detail=error_response.error.model_dump())
        elif "pool may be exhausted" in error_msg.lower():
            from api.models.errors import ErrorCode

            error_response = create_connection_error(
                detail="Connection pool exhausted - too many concurrent requests",
                code=ErrorCode.POOL_EXHAUSTED,
            )
            raise HTTPException(status_code=503, detail=error_response.error.model_dump())
        else:
            error_response = create_connection_error(detail=error_msg)
            raise HTTPException(status_code=500, detail=error_response.error.model_dump())
    except Exception as e:
        logger.error(f"Unexpected error with pooled cursor: {e}")
        from api.models.errors import ErrorCode, ErrorDetail, ErrorResponse, ErrorType

        error_response = ErrorResponse(
            error=ErrorDetail(
                type=ErrorType.INTERNAL_ERROR,
                code=ErrorCode.UNKNOWN_ERROR,
                message="An unexpected error occurred",
                detail=str(e),
            )
        )
        raise HTTPException(status_code=500, detail=error_response.error.model_dump())
