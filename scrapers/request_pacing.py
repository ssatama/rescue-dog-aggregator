"""How a scraper fetches: robots.txt, one request clock per scraper, back-off
and retries (#567). A mixin of BaseScraper (#569)."""

import threading
import time
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from typing import Any

import requests
from playwright.async_api import TimeoutError as PlaywrightTimeoutError

from utils.robots_checker import RobotsChecker

# Worth retrying: the server or the network may recover. Any other 4xx won't.
RETRYABLE_STATUS_CODES = frozenset({429, 500, 502, 503, 504})
# Transient without a response: the connection failed, stalled or dropped mid-body.
RETRYABLE_ERRORS = (requests.ConnectionError, requests.Timeout, requests.exceptions.ChunkedEncodingError, requests.exceptions.ContentDecodingError)


class DetailPageError(RuntimeError):
    """A dog's detail page yielded no details: the dog is skipped and counted (#567)."""


class ListingIncompleteError(RuntimeError):
    """A listing page the scraper had to read could not be read.

    Raised instead of returning the pages that did load: stale detection would
    take the dogs on the missing pages for gone (#559). The run ends as an
    error and stale detection doesn't run.
    """


class RequestPacing:
    """Robots checks, request pacing, detail fetching and listing pages."""

    # Class-level defaults for the request clock, so a scraper built without
    # __init__ (test fixtures) still works; __init__ gives each its own (#567)
    _request_slot_lock = threading.Lock()
    _next_request_at = 0.0
    _paused_until = 0.0
    _detail_attempted = 0
    detail_failures: list[str] = []
    # A site's Retry-After is honoured up to this; longer would outlast the cron's per-org timeout
    MAX_BACK_OFF_SECONDS = 120
    # Built on the first robots check
    _robots_checker: RobotsChecker | None = None

    def get_robots_check_urls(self) -> list[str]:
        """URLs to test against robots.txt before scraping.

        The organization homepage alone is not enough: a site can allow / and
        still carry `Disallow: /rehoming/`, which is exactly the path a scraper
        goes on to fetch. Subclasses that build listing URLs should override
        this to include them, so the rule the site wrote is the rule we honour.
        """
        candidates = [
            getattr(getattr(self.org_config, "metadata", None), "website_url", None),
            getattr(self, "base_url", None),
            getattr(self, "listing_url", None),
        ]
        seen: list[str] = []
        for url in candidates:
            if isinstance(url, str) and url and url not in seen:
                seen.append(url)
        return seen

    def _check_robots_permission(self) -> bool:
        """Whether the organization's site permits us to collect from it.

        Gives an organization an opt-out it can exercise on its own: add a
        Disallow line and the next run stops, with no need to find this
        repository or contact anyone. For organizations that do not answer
        email, an opt-out needing no response from them is worth more than one
        that does.

        Only an explicit disallow blocks a scrape. A missing or unreadable
        robots.txt, an unconfigured website, or a fault in this check itself
        all proceed - the gate exists to honour a stated refusal, not to
        become a new way for the pipeline to fail.
        """
        urls = self.get_robots_check_urls()
        if not urls:
            self.logger.warning(f"No website URL configured for {self.get_organization_name()}; cannot check robots.txt")
            return True

        if self._robots_checker is None:
            self._robots_checker = RobotsChecker()

        for url in urls:
            try:
                decision = self._robots_checker.check(url)
            except Exception as exc:  # noqa: BLE001 - never let the gate break a run
                self.logger.warning(f"robots.txt check failed for {url}: {exc}")
                continue

            if decision.uncertain:
                self.logger.warning(f"robots.txt for {url}: {decision.reason}")
            if not decision.allowed:
                self.logger.error(f"Skipping {self.get_organization_name()}: {decision.reason}")
                return False
            self._apply_crawl_delay(url, decision.crawl_delay)

        return True

    def _apply_crawl_delay(self, url: str, crawl_delay: float | None) -> None:
        """Honour a site's Crawl-delay, rather than only reporting it.

        Parsing the directive and then ignoring it would leave us crawling a
        site at our own pace while claiming to respect its robots.txt. Only
        ever slows us down; a delay below our own is left alone.
        """
        if not crawl_delay:
            return
        current = getattr(self, "rate_limit_delay", 0) or 0
        if crawl_delay > current:
            self.rate_limit_delay = crawl_delay
            self.logger.info(f"{url} requests Crawl-delay {crawl_delay}s; raising rate limit delay from {current}s")

    # Add method to respect rate limiting
    def respect_rate_limit(self):
        """Sleep for the configured rate limit delay."""
        if self.rate_limit_delay > 0:
            time.sleep(self.rate_limit_delay)

    def _claim_request_slot(self) -> float:
        """Seconds to wait before this scraper's next request may start.

        ``rate_limit_delay`` is the minimum time between request starts to the
        site, across every worker (#567): N threads can't multiply the rate.
        """
        with self._request_slot_lock:
            now = time.monotonic()
            start = max(now, self._next_request_at)
            self._next_request_at = start + self.rate_limit_delay
        return start - now

    def _push_back_request_clock(self, seconds: float, pause: bool = False) -> None:
        """Move the next free slot to at least ``seconds`` from now.

        With ``pause``, requests whose slot was already claimed wait too: the
        site asked every worker to slow down.
        """
        until = time.monotonic() + seconds
        with self._request_slot_lock:
            self._next_request_at = max(self._next_request_at, until)
            if pause:
                self._paused_until = max(self._paused_until, until)

    def _back_off_after(self, error: BaseException, attempt: int) -> None:
        """A 429 or 503 slows the whole scraper, by Retry-After or exponential back-off."""
        response = getattr(error, "response", None)
        if getattr(response, "status_code", None) not in (429, 503):
            return
        retry_after = (getattr(response, "headers", None) or {}).get("Retry-After")
        seconds = float(retry_after) if retry_after and str(retry_after).isdigit() else self.rate_limit_delay * self.retry_backoff_factor**attempt
        seconds = min(seconds, self.MAX_BACK_OFF_SECONDS)
        self.logger.warning(f"The site answered {response.status_code}; pausing requests for {seconds:.0f}s")
        self._push_back_request_clock(seconds, pause=True)

    def _after_listing(self) -> None:
        """A browser listing took no slots: its last page load still counts as a request start."""
        if self._next_request_at == 0.0:
            self._push_back_request_clock(self.rate_limit_delay)

    def wait_for_request_slot(self) -> None:
        """Block until this scraper may start a request. Call it before every extra request a fetch makes."""
        wait = self._claim_request_slot()
        starts_at = time.monotonic() + max(wait, 0)
        if wait > 0:
            time.sleep(wait)
        # A back-off that started while this request was waiting holds it too
        pause = self._paused_until - starts_at
        if pause > 0:
            time.sleep(pause)

    @staticmethod
    def _unique_by_url(items: list, url: Callable[[Any], str]) -> list:
        seen: set[str] = set()
        unique = []
        for item in items:
            if url(item) not in seen:
                seen.add(url(item))
                unique.append(item)
        return unique

    @staticmethod
    def _is_transient(error: BaseException) -> bool:
        """Worth another attempt: a timeout, a dropped connection, a 429 or a 5xx. Not a 404 or a parse error."""
        if isinstance(error, requests.HTTPError):
            return getattr(error.response, "status_code", None) in RETRYABLE_STATUS_CODES
        return isinstance(error, RETRYABLE_ERRORS + (TimeoutError, PlaywrightTimeoutError))

    def _detail_failed(self, item_url: str, error: BaseException) -> None:
        self.detail_failures = [*self.detail_failures, item_url]
        self.logger.error(f"Detail page {item_url} failed, skipping this dog: {error!r}")

    def fetch_details(
        self,
        items: list,
        fetch_one: Callable[[Any], Any],
        *,
        url: Callable[[Any], str] = lambda item: item["adoption_url"],
        max_workers: int = 1,
        attempts: int = 1,
    ) -> list:
        """``fetch_one(item)`` for each item, results in input order (#567).

        An item whose URL was already seen runs once. Every attempt waits for a
        request slot, so the site sees at most one request start per
        ``rate_limit_delay`` however many workers run. Only transient errors
        are retried (``_is_transient``). An item that still raises is logged,
        added to ``detail_failures`` and left out, as is a ``None`` result
        (without counting as a failure). One bad item never stops the rest.
        ``fetch_one`` bounds its own time: every request it makes has a timeout.
        """

        attempts = max(1, attempts)

        def run(item):
            for attempt in range(1, attempts + 1):
                self.wait_for_request_slot()
                try:
                    result = fetch_one(item)
                except Exception as e:
                    # A 429 slows every worker, whether or not this dog gets another try
                    self._back_off_after(e, attempt)
                    if attempt == attempts or not self._is_transient(e):
                        raise
                    self.metrics_collector.track_retry(success=False)
                    self.logger.warning(f"Detail page {url(item)} failed (attempt {attempt} of {attempts}), retrying: {e}")
                    continue
                if attempt > 1:
                    self.metrics_collector.track_retry(success=True)
                return result

        self._after_listing()
        results = []
        unique = self._unique_by_url(items, url)
        self._detail_attempted += len(unique)
        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            futures = [(item, executor.submit(run, item)) for item in unique]
            for item, future in futures:
                try:
                    result = future.result()
                except Exception as e:
                    self._detail_failed(url(item), e)
                    continue
                if result is not None:
                    results.append(result)
        return results

    def get_listing_page(self, url: str, **kwargs) -> requests.Response:
        """GET one listing page, retried max_retries times with backoff.

        A page that still fails raises ListingIncompleteError, never a partial
        listing. Timeouts, connection errors, 429 and 5xx are retried; any
        other error (another 4xx, a malformed URL) fails at once.
        """
        kwargs.setdefault("timeout", self.timeout)
        attempts = self.max_retries + 1
        for attempt in range(1, attempts + 1):
            # Listing pages share the request clock with detail pages (#567)
            self.wait_for_request_slot()
            try:
                response = requests.get(url, **kwargs)
                response.raise_for_status()
                return response
            except requests.RequestException as e:
                status = getattr(e.response, "status_code", None)
                retryable = status in RETRYABLE_STATUS_CODES if status is not None else isinstance(e, RETRYABLE_ERRORS)
                if attempt == attempts or not retryable:
                    raise ListingIncompleteError(f"Listing page {url} failed after {attempt} attempt(s): {e}") from e
                self.logger.warning(f"Listing page {url} failed (attempt {attempt} of {attempts}), retrying: {e}")
                time.sleep(self.retry_backoff_factor**attempt)
