# api/auth.py

"""
Simple API key authentication for admin endpoints.

This module provides basic API key authentication to protect monitoring
and administrative endpoints from unauthorized access.
"""

import hmac
import os

from fastapi import Header, HTTPException


async def verify_admin_key(x_api_key: str = Header(None)):
    """
    Simple API key authentication for admin endpoints.

    Args:
        x_api_key: API key provided in X-API-Key header

    Raises:
        HTTPException: 401 if API key is invalid or missing
        HTTPException: 500 if admin API key not configured
    """
    admin_key = os.getenv("ADMIN_API_KEY")
    if not admin_key:
        raise HTTPException(status_code=500, detail="Admin API key not configured")
    if not x_api_key or not hmac.compare_digest(x_api_key, admin_key):
        raise HTTPException(status_code=401, detail="Unauthorized - Invalid API key")
