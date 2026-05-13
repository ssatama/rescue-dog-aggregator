"""Fire-and-forget cache invalidation for the Next.js frontend.

Posts to the /api/revalidate endpoint with a list of tags and/or paths so
the Next.js Full Route Cache regenerates affected pages on the next request,
instead of waiting for the time-based revalidate window to expire.

Failures (missing token, network issues, non-2xx response) are logged but
never raised. Callers (scrapers, LLM pipeline, CLIs) must not break because
the cache invalidation step failed.

Two entry points share validation logic via ``_build_request``:
- ``invalidate`` for async callers (LLM pipeline)
- ``invalidate_sync`` for sync callers (BaseScraper, management CLIs)

``invalidate_sync`` uses ``httpx.Client`` directly so it does not allocate
a fresh event loop — that previously caused suite-level test interference
with code that calls ``asyncio.get_event_loop()``.
"""

import logging
import os
from collections.abc import Iterable
from typing import Final

import httpx

logger = logging.getLogger(__name__)

_DEFAULT_FRONTEND_URL: Final = "https://www.rescuedogs.me"
_REVALIDATE_PATH: Final = "/api/revalidate"
_HTTP_TIMEOUT_SECONDS: Final = 5.0


def _build_request(
    tags: Iterable[str],
    paths: Iterable[str],
) -> dict | None:
    """Validate auth/payload. Returns ``None`` if the call should be skipped."""
    token = os.getenv("REVALIDATION_TOKEN")
    if not token:
        logger.warning("REVALIDATION_TOKEN not set; skipping cache invalidation")
        return None

    tag_list = [t for t in tags if t]
    path_list = [p for p in paths if p]
    if not tag_list and not path_list:
        return None

    base_url = os.getenv("FRONTEND_URL", _DEFAULT_FRONTEND_URL).rstrip("/")
    return {
        "url": f"{base_url}{_REVALIDATE_PATH}",
        "headers": {"x-revalidate-token": token},
        "json": {"tags": tag_list, "paths": path_list},
        "tag_list": tag_list,
        "path_list": path_list,
    }


async def invalidate(
    tags: Iterable[str] = (),
    paths: Iterable[str] = (),
) -> None:
    """Async invalidation entry point — for use inside ``async def`` callers."""
    req = _build_request(tags, paths)
    if req is None:
        return

    try:
        async with httpx.AsyncClient(timeout=_HTTP_TIMEOUT_SECONDS) as client:
            response = await client.post(
                req["url"],
                headers=req["headers"],
                json=req["json"],
            )
            response.raise_for_status()
            logger.info(
                "cache invalidated: tags=%s paths=%s",
                req["tag_list"],
                req["path_list"],
            )
    except httpx.HTTPError as e:
        logger.warning(
            "cache invalidation network failure: url=%s tags=%s paths=%s err=%s",
            req["url"],
            req["tag_list"],
            req["path_list"],
            e,
        )
    except Exception:
        logger.exception(
            "cache invalidation unexpected error: url=%s tags=%s paths=%s",
            req["url"],
            req["tag_list"],
            req["path_list"],
        )


def invalidate_sync(
    tags: Iterable[str] = (),
    paths: Iterable[str] = (),
) -> None:
    """Sync invalidation entry point — for use in sync callers (CLIs, scrapers)."""
    req = _build_request(tags, paths)
    if req is None:
        return

    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT_SECONDS) as client:
            response = client.post(
                req["url"],
                headers=req["headers"],
                json=req["json"],
            )
            response.raise_for_status()
            logger.info(
                "cache invalidated: tags=%s paths=%s",
                req["tag_list"],
                req["path_list"],
            )
    except httpx.HTTPError as e:
        logger.warning(
            "cache invalidation network failure: url=%s tags=%s paths=%s err=%s",
            req["url"],
            req["tag_list"],
            req["path_list"],
            e,
        )
    except Exception:
        logger.exception(
            "cache invalidation unexpected error: url=%s tags=%s paths=%s",
            req["url"],
            req["tag_list"],
            req["path_list"],
        )
