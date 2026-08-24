"""robots.txt compliance for the scrapers.

Listings are collected from other organizations' websites. This module makes
that collection conditional on those sites permitting it: before a scrape runs,
the organization's robots.txt is fetched and consulted.

frontend/public/llms.txt currently claims only that listings come from openly
published pages - the stronger sentence about robots.txt was removed during
review precisely because no code backed it. With this in place that claim can
be restored.

It also gives source organizations an opt-out that costs them nothing. A rescue
that would rather not be aggregated can add a Disallow line to a file it
already controls, and the next run stops - no need to find this repository or
contact anyone.

Checking happens per organization at scrape setup rather than per request:
there is no shared HTTP helper across the eighteen scraper modules, and a
site-level decision is what actually matters. Fetches are cached per host.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse, urlunparse
from urllib.request import Request, urlopen
from urllib.robotparser import RobotFileParser

logger = logging.getLogger(__name__)

USER_AGENT = "RescueDogAggregator"
"""Token matched against robots.txt User-agent groups. Keep it in the
User-Agent header the scrapers send, so a site can address us by name."""

DEFAULT_TIMEOUT = 10.0
_MAX_ROBOTS_BYTES = 512 * 1024


@dataclass(frozen=True)
class RobotsDecision:
    """Outcome of consulting a site's robots.txt."""

    allowed: bool
    reason: str
    crawl_delay: float | None = None
    uncertain: bool = False
    """True when robots.txt could not be read and the result is a default
    rather than the site's stated position."""


class RobotsChecker:
    def __init__(self, user_agent: str = USER_AGENT, timeout: float = DEFAULT_TIMEOUT):
        self.user_agent = user_agent
        self.timeout = timeout
        self._cache: dict[tuple[str, str], tuple[str | None, int]] = {}

    def check(self, url: str) -> RobotsDecision:
        """Decide whether `url` may be fetched."""
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            # A bad config value is our fault, not a refusal by the site.
            # Blocking here would report "the site disallows us" about a site
            # we never contacted.
            return RobotsDecision(True, f"Not an absolute URL, cannot check: {url!r}", uncertain=True)

        robots_url = urlunparse((parsed.scheme, parsed.netloc, "/robots.txt", "", "", ""))
        origin = (parsed.scheme, parsed.netloc)

        if origin not in self._cache:
            self._cache[origin] = self._fetch(robots_url)
        body, status = self._cache[origin]

        if body is None:
            # RFC 9309 2.3.1.3: 4xx means no restrictions were expressed, so
            # crawling is allowed - except 429, which is the site asking us to
            # back off and must not be read as permission.
            if 400 <= status < 500 and status != 429:
                return RobotsDecision(True, f"No robots.txt ({status})")

            # RFC 9309 2.3.1.4 says an unreachable robots.txt SHOULD be treated
            # as a full disallow. We deliberately depart from that: a transient
            # 5xx at one rescue should not silently halt its listings. The
            # result is flagged uncertain so it is never mistaken for consent.
            return RobotsDecision(
                True,
                f"robots.txt unreadable ({status}); proceeding without its rules",
                uncertain=True,
            )

        parser = RobotFileParser()
        parser.parse(body.splitlines())

        path = parsed.path or "/"
        allowed = parser.can_fetch(self.user_agent, url)
        delay = parser.crawl_delay(self.user_agent)

        return RobotsDecision(
            allowed=allowed,
            reason=(f"Allowed by robots.txt for {self.user_agent}" if allowed else f"Disallowed by robots.txt for {self.user_agent}: {path}"),
            crawl_delay=float(delay) if delay is not None else None,
        )

    def _fetch(self, robots_url: str) -> tuple[str | None, int]:
        """Returns (body, status). Body is None when there are no rules to read.

        Overridden in tests; keep the network confined to this method.
        """
        request = Request(robots_url, headers={"User-Agent": self.user_agent})
        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read(_MAX_ROBOTS_BYTES)
                return raw.decode("utf-8", errors="replace"), response.status
        except HTTPError as exc:
            return None, exc.code
        except (URLError, TimeoutError, OSError) as exc:
            logger.warning("Could not fetch %s: %s", robots_url, exc)
            return None, 0
