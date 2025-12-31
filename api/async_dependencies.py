"""
Async database dependencies for FastAPI endpoints.

Following CLAUDE.md principles:
- Pure functions, no mutations
- Early returns, no nested conditionals
- Immutable data patterns
- Clear error handling
"""

import logging
import os
import sys
from typing import AsyncGenerator

import asyncpg
from fastapi import HTTPException
from fastapi.exceptions import RequestValidationError

from config import DB_CONFIG

# Add project root to path so we can import config
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Ensure logger is configured
logging.basicConfig(level=logging.INFO, format="%(levelname)s:%(name)s:%(message)s")
logger = logging.getLogger(__name__)


async def get_async_db_connection() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    Async dependency that provides a database connection using asyncpg.
    Manages connection lifecycle and transaction handling.
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

        logger.debug(f"[async_dependencies.py] Attempting asyncpg connection: database={conn_params.get('database')}, user={conn_params.get('user')}, host={conn_params.get('host')}")

        # Create async connection
        conn = await asyncpg.connect(**conn_params)
        logger.debug(f"Async Connection opened: {id(conn)}")

        yield conn

    except HTTPException as http_exc:
        logger.warning(f"[async_dependencies.py] HTTPException caught: {http_exc.detail}")
        raise http_exc
    except RequestValidationError as validation_err:
        # Let FastAPI handle validation errors with proper 422 response
        logger.debug("[async_dependencies.py] Validation error in async dependency")
        raise validation_err
    except asyncpg.PostgresError as db_err:
        logger.error(f"[async_dependencies.py] AsyncPG error: {db_err}")
        raise HTTPException(status_code=500, detail=f"Async database connection error: {db_err}")
    except Exception as e:
        logger.exception(f"[async_dependencies.py] Unexpected error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error in async dependency: {type(e).__name__}: {e}",
        )
    finally:
        if conn:
            logger.debug(f"Async Connection closing: {id(conn)}")
            await conn.close()


async def get_async_db_transaction() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    Async dependency that provides a database connection with transaction handling.
    Automatically handles commit/rollback based on success/failure.
    """
    conn = None
    transaction = None
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

        logger.debug(f"[async_dependencies.py] Attempting asyncpg transaction: database={conn_params.get('database')}")

        # Create async connection and start transaction
        conn = await asyncpg.connect(**conn_params)
        transaction = conn.transaction()
        await transaction.start()

        logger.debug(f"Async transaction started: {id(conn)}")

        yield conn

        # Commit transaction on successful completion
        await transaction.commit()
        logger.debug(f"Async transaction committed: {id(conn)}")

    except HTTPException as http_exc:
        if transaction:
            await transaction.rollback()
            logger.warning(f"[async_dependencies.py] HTTPException caught, transaction rolled back: {http_exc.detail}")
        raise http_exc
    except RequestValidationError as validation_err:
        # Let FastAPI handle validation errors with proper 422 response
        if transaction:
            await transaction.rollback()
            logger.debug("[async_dependencies.py] Validation error, transaction rolled back")
        raise validation_err
    except asyncpg.PostgresError as db_err:
        if transaction:
            await transaction.rollback()
            logger.error(f"[async_dependencies.py] AsyncPG error, transaction rolled back: {db_err}")
        raise HTTPException(status_code=500, detail=f"Async database transaction error: {db_err}")
    except Exception as e:
        if transaction:
            await transaction.rollback()
            logger.exception(f"[async_dependencies.py] Unexpected error, transaction rolled back: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error in async transaction: {type(e).__name__}: {e}",
        )
    finally:
        if conn:
            logger.debug(f"Async transaction connection closing: {id(conn)}")
            await conn.close()
