"""Fire-and-forget IndexNow submissions (Bing, Yandex, Seznam, Naver, Yep).

Tells the IndexNow search engines which dog pages a run added, changed or
retired, so they recrawl now instead of waiting to rediscover the sitemap.
DuckDuckGo's web results come largely from Bing's index.

The key is public by design: the engines verify it by fetching
``https://{host}/{key}.txt``, which lives in ``frontend/public/``. Without
``INDEXNOW_KEY`` the submission is skipped. Like ``revalidation_client``,
failures are logged and never raised: a scrape must not fail because a
search engine ping did.
"""

import logging
import os
from collections.abc import Iterable
from typing import Final
from urllib.parse import urlparse

import httpx

logger = logging.getLogger(__name__)

_ENDPOINT: Final = "https://api.indexnow.org/indexnow"
_DEFAULT_FRONTEND_URL: Final = "https://www.rescuedogs.me"
_MAX_URLS_PER_REQUEST: Final = 10_000
_HTTP_TIMEOUT_SECONDS: Final = 10.0


def build_payloads(slugs: Iterable[str], key: str, frontend_url: str = _DEFAULT_FRONTEND_URL) -> list[dict]:
    """IndexNow request bodies for the dog pages behind ``slugs``, at most 10,000 URLs each."""
    base_url = frontend_url.rstrip("/")
    urls = [f"{base_url}/dogs/{slug}" for slug in dict.fromkeys(s for s in slugs if s)]
    return [
        {
            "host": urlparse(base_url).netloc,
            "key": key,
            "keyLocation": f"{base_url}/{key}.txt",
            "urlList": urls[i : i + _MAX_URLS_PER_REQUEST],
        }
        for i in range(0, len(urls), _MAX_URLS_PER_REQUEST)
    ]


def _warm(client: httpx.Client, urls: list[str]) -> None:
    """Request each page once before pinging.

    The cache purge that precedes this is stale-while-revalidate: the next request still
    gets the old page and only triggers the rebuild. Without this, that request would
    often be Bing's own crawl, and it would index the stale page (e.g. an adopted dog
    without its noindex) right after being told to look.
    """
    for url in urls:
        try:
            client.get(url)
        except httpx.HTTPError as e:
            logger.debug("IndexNow warm-up failed for %s: %s", url, e)


def submit_dog_urls_sync(slugs: Iterable[str]) -> None:
    """Submit the dog pages for ``slugs``. Skips quietly without ``INDEXNOW_KEY``."""
    key = os.getenv("INDEXNOW_KEY")
    if not key:
        logger.info("INDEXNOW_KEY not set; skipping IndexNow submission")
        return

    payloads = build_payloads(slugs, key, os.getenv("FRONTEND_URL", _DEFAULT_FRONTEND_URL))
    try:
        with httpx.Client(timeout=_HTTP_TIMEOUT_SECONDS) as client:
            for payload in payloads:
                _warm(client, payload["urlList"])
                response = client.post(_ENDPOINT, json=payload)
                # 200 = accepted and verified, 202 = accepted, key check pending
                if response.status_code in (200, 202):
                    logger.info("IndexNow submitted %d URL(s): HTTP %d", len(payload["urlList"]), response.status_code)
                else:
                    logger.warning(
                        "IndexNow rejected %d URL(s): HTTP %d %s",
                        len(payload["urlList"]),
                        response.status_code,
                        response.text[:200],
                    )
    except httpx.HTTPError as e:
        logger.warning("IndexNow network failure: %s", e)
    except Exception:
        logger.exception("IndexNow unexpected error")
