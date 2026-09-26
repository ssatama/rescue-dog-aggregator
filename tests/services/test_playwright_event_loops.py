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
        assert owned is False, "it becomes the shared instance of the new loop"

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
