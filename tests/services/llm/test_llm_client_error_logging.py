"""A retried OpenRouter 429 or 5xx is a warning; only a request error is an error (Sentry records errors)."""

import logging
from unittest.mock import patch

import httpx
import pytest

from services.llm.llm_client import LLMClient

REAL_CLIENT = httpx.AsyncClient


def _openrouter_answers(status: int):
    transport = httpx.MockTransport(lambda request: httpx.Response(status, json={"error": {"message": "no", "code": status}}))
    return patch("services.llm.llm_client.httpx.AsyncClient", lambda: REAL_CLIENT(transport=transport))


@pytest.mark.unit
@pytest.mark.asyncio
class TestOpenRouterErrorLogging:
    @pytest.mark.parametrize("status", [429, 502, 503])
    async def test_a_status_the_caller_retries_is_a_warning(self, status, caplog):
        with _openrouter_answers(status), pytest.raises(httpx.HTTPStatusError):
            await LLMClient(api_key="k").call_openrouter_api(messages=[{"role": "user", "content": "hi"}])

        (record,) = [r for r in caplog.records if r.name == "services.llm.llm_client"]
        assert record.levelno == logging.WARNING

    async def test_a_bad_request_is_an_error(self, caplog):
        with _openrouter_answers(400), pytest.raises(httpx.HTTPStatusError):
            await LLMClient(api_key="k").call_openrouter_api(messages=[{"role": "user", "content": "hi"}])

        (record,) = [r for r in caplog.records if r.name == "services.llm.llm_client"]
        assert record.levelno == logging.ERROR

    async def test_a_gateway_page_that_is_not_json_is_still_logged(self, caplog):
        """#633: response.json() raised on an HTML 502 before either log line ran."""
        transport = httpx.MockTransport(lambda request: httpx.Response(502, text="<html><body>502 Bad Gateway</body></html>"))
        with patch("services.llm.llm_client.httpx.AsyncClient", lambda: REAL_CLIENT(transport=transport)), pytest.raises(httpx.HTTPStatusError):
            await LLMClient(api_key="k").call_openrouter_api(messages=[{"role": "user", "content": "hi"}])

        (record,) = [r for r in caplog.records if r.name == "services.llm.llm_client"]
        assert record.levelno == logging.WARNING
        assert "502 Bad Gateway" in record.getMessage()
