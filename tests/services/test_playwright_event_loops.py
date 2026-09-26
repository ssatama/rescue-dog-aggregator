"""The shared Playwright instance is only reused on the loop that started it (#580).

2026-09-26: MISIs' listing started the shared instance in one asyncio.run();
its detail pages ran in worker threads, each with its own asyncio.run(), and
reused that instance. Its driver connection lived on the closed first loop, so
the detail fetch awaited forever and the cron hung.
"""

import asyncio
import threading
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from services.playwright_browser_service import PlaywrightBrowserService


def _fake_async_playwright(started):
    def factory():
        instance = MagicMock(name=f"playwright-{len(started)}")
        instance.stop = AsyncMock()
        started.append(instance)
        return MagicMock(start=AsyncMock(return_value=instance))

    return factory


@pytest.fixture
def started():
    instances = []
    with patch("services.playwright_browser_service.async_playwright", side_effect=_fake_async_playwright(instances)):
        yield instances


@pytest.mark.unit
class TestPlaywrightPerEventLoop:
    def test_the_same_loop_reuses_the_shared_instance(self, started):
        service = PlaywrightBrowserService()

        async def twice():
            return await service._get_or_start_playwright(), await service._get_or_start_playwright()

        first, second = asyncio.run(twice())

        assert first == (started[0], False)
        assert second == (started[0], False)
        assert len(started) == 1

    def test_a_later_loop_does_not_reuse_a_closed_loops_instance(self, started):
        """Explicit loops: nest_asyncio (imported by the cron) makes asyncio.run reuse one loop."""
        service = PlaywrightBrowserService()
        first_loop = asyncio.new_event_loop()
        first_loop.run_until_complete(service._get_or_start_playwright())
        first_loop.close()

        second_loop = asyncio.new_event_loop()
        try:
            playwright, owned = second_loop.run_until_complete(service._get_or_start_playwright())
        finally:
            second_loop.close()

        assert playwright is started[1], "the first loop is closed; its instance must not be reused"
        assert owned is True, "the caller owns and stops it; the shared instance is never replaced"

    @pytest.mark.real_clock
    def test_another_running_loop_gets_its_own_instance_to_stop(self, started):
        service = PlaywrightBrowserService()
        ready, done = threading.Event(), threading.Event()
        other = {}

        async def hold_shared_loop_open():
            await service._get_or_start_playwright()
            ready.set()
            while not done.is_set():
                await asyncio.sleep(0.01)

        holder = threading.Thread(target=lambda: asyncio.run(hold_shared_loop_open()))
        holder.start()
        ready.wait(5)
        try:
            other["result"] = asyncio.run(service._get_or_start_playwright())
        finally:
            done.set()
            holder.join(5)

        assert other["result"] == (started[1], True), "a worker thread's loop must not touch the other loop's instance"

    def test_an_owned_instance_is_stopped_when_the_browser_closes(self, started):
        service = PlaywrightBrowserService()
        service._endpoint = "wss://browserless.example"
        service._create_context = AsyncMock(return_value=MagicMock(new_page=AsyncMock(return_value=MagicMock(close=AsyncMock()))))
        owned_playwright = MagicMock(stop=AsyncMock())
        owned_playwright.chromium.connect_over_cdp = AsyncMock(return_value=MagicMock(close=AsyncMock()))
        service._get_or_start_playwright = AsyncMock(return_value=(owned_playwright, True))

        async def use_browser():
            async with service.get_browser():
                pass

        asyncio.run(use_browser())

        owned_playwright.stop.assert_awaited_once()

    def test_an_owned_instance_is_stopped_when_browserless_cannot_be_reached(self, started):
        service = PlaywrightBrowserService()
        service._endpoint = "wss://browserless.example"
        owned_playwright = MagicMock(stop=AsyncMock())
        owned_playwright.chromium.connect_over_cdp = AsyncMock(side_effect=ConnectionError("refused"))
        service._get_or_start_playwright = AsyncMock(return_value=(owned_playwright, True))

        with patch("services.playwright_browser_service.asyncio.sleep", new=AsyncMock()), pytest.raises(ConnectionError):
            asyncio.run(service.create_browser())

        owned_playwright.stop.assert_awaited_once()


@pytest.mark.unit
@pytest.mark.real_clock
class TestNoDriverPileUp:
    def test_many_detail_loops_each_get_an_instance_they_stop(self, started):
        """Before this, each closed loop's instance was replaced as 'shared' and never stopped."""
        service = PlaywrightBrowserService()
        loops = [asyncio.new_event_loop() for _ in range(4)]
        results = []
        for loop in loops:
            results.append(loop.run_until_complete(service._get_or_start_playwright()))
            loop.close()

        assert results[0] == (started[0], False)
        assert all(owned for _, owned in results[1:]), "every later loop owns (and so stops) its instance"
        assert service._playwright is started[0], "the shared instance is never replaced"


@pytest.mark.unit
@pytest.mark.real_clock
class TestCloseNeverHangs:
    def test_a_close_that_never_returns_is_abandoned(self):
        """A dead Browserless connection can leave page.close() waiting forever."""
        from services.playwright_browser_service import PlaywrightResult

        async def never():
            await asyncio.Event().wait()

        page = MagicMock(close=AsyncMock(side_effect=never))
        context = MagicMock(close=AsyncMock())
        browser = MagicMock(close=AsyncMock())
        owned = MagicMock(stop=AsyncMock())
        result = PlaywrightResult(browser=browser, context=context, page=page, is_remote=True, _playwright=owned, _owns_playwright=True)
        result.CLOSE_TIMEOUT_SECONDS = 0.05

        asyncio.run(result.close())

        context.close.assert_awaited_once()
        browser.close.assert_awaited_once()
        owned.stop.assert_awaited_once()

    def test_a_timeout_around_a_stalled_page_returns_even_when_cleanup_stalls(self):
        """The #580 shape: the caller's wait_for cancels, and cleanup must still finish."""
        from services.playwright_browser_service import PlaywrightResult

        async def never():
            await asyncio.Event().wait()

        page = MagicMock(close=AsyncMock(side_effect=never), content=AsyncMock(side_effect=never))
        result = PlaywrightResult(browser=MagicMock(close=AsyncMock(side_effect=never)), context=MagicMock(close=AsyncMock(side_effect=never)), page=page, is_remote=True)
        result.CLOSE_TIMEOUT_SECONDS = 0.05

        async def scrape():
            try:
                await page.content()
            finally:
                await result.close()

        async def bounded():
            await asyncio.wait_for(scrape(), 0.05)

        with pytest.raises(TimeoutError):
            asyncio.run(bounded())


@pytest.mark.unit
@pytest.mark.real_clock
class TestOwnedInstanceStopsOnCancel:
    def test_a_timeout_during_connect_still_stops_the_owned_instance(self):
        """A caller's wait_for cancels mid-connect; CancelledError is not an Exception."""
        service = PlaywrightBrowserService()
        service._endpoint = "wss://browserless.example"

        async def never(*args, **kwargs):
            await asyncio.Event().wait()

        owned_playwright = MagicMock(stop=AsyncMock())
        owned_playwright.chromium.connect_over_cdp = AsyncMock(side_effect=never)
        service._get_or_start_playwright = AsyncMock(return_value=(owned_playwright, True))

        async def bounded():
            await asyncio.wait_for(service.create_browser(), 0.05)

        with pytest.raises(TimeoutError):
            asyncio.run(bounded())

        owned_playwright.stop.assert_awaited_once()
