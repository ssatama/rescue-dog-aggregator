"""
API middleware package for FastAPI application.

Contains middleware for:
- Cache headers and intelligent caching strategies
- Security headers (defined in main.py)
- CORS handling (defined in main.py)
"""

from .cache_headers import CacheHeadersMiddleware

__all__ = ["CacheHeadersMiddleware"]
