"""Tests for services.revalidation_client.

Covers fire-and-forget semantics: never raises, even on network/HTTP errors.
Token-based auth, URL override, and the sync entry point.
"""

import logging
from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest


@pytest.fixture
def mock_async_client():
    """Mocked httpx.AsyncClient where the post() call is inspectable."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = AsyncMock()
    mock_client_instance.post = AsyncMock(return_value=mock_response)

    with patch("services.revalidation_client.httpx.AsyncClient") as mock_class:
        mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
        mock_class.return_value.__aexit__ = AsyncMock(return_value=None)
        yield mock_client_instance


@pytest.fixture
def mock_sync_client():
    """Mocked httpx.Client where the post() call is inspectable."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    mock_client_instance = MagicMock()
    mock_client_instance.post = MagicMock(return_value=mock_response)

    with patch("services.revalidation_client.httpx.Client") as mock_class:
        mock_class.return_value.__enter__ = MagicMock(return_value=mock_client_instance)
        mock_class.return_value.__exit__ = MagicMock(return_value=None)
        yield mock_client_instance


@pytest.mark.unit
class TestInvalidate:
    """Behavior of the async invalidate() function."""

    @pytest.mark.asyncio
    async def test_skips_when_token_missing(self, monkeypatch, caplog):
        monkeypatch.delenv("REVALIDATION_TOKEN", raising=False)
        from services.revalidation_client import invalidate

        with patch("services.revalidation_client.httpx.AsyncClient") as mock_client:
            with caplog.at_level(logging.WARNING):
                await invalidate(tags=["animals"])

        mock_client.assert_not_called()
        assert "REVALIDATION_TOKEN" in caplog.text

    @pytest.mark.asyncio
    async def test_skips_when_no_tags_or_paths(self, monkeypatch):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        from services.revalidation_client import invalidate

        with patch("services.revalidation_client.httpx.AsyncClient") as mock_client:
            await invalidate()

        mock_client.assert_not_called()

    @pytest.mark.asyncio
    async def test_posts_with_token_and_payload(self, monkeypatch, mock_async_client):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        monkeypatch.delenv("FRONTEND_URL", raising=False)
        from services.revalidation_client import invalidate

        await invalidate(tags=["animals", "statistics"], paths=["/dogs/buddy"])

        mock_async_client.post.assert_called_once_with(
            "https://www.rescuedogs.me/api/revalidate",
            headers={"x-revalidate-token": "secret"},
            json={
                "tags": ["animals", "statistics"],
                "paths": ["/dogs/buddy"],
            },
        )

    @pytest.mark.asyncio
    async def test_uses_custom_frontend_url(self, monkeypatch, mock_async_client):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        monkeypatch.setenv("FRONTEND_URL", "https://staging.example.com/")
        from services.revalidation_client import invalidate

        await invalidate(tags=["foo"])

        called_url = mock_async_client.post.call_args[0][0]
        assert called_url == "https://staging.example.com/api/revalidate"

    @pytest.mark.asyncio
    async def test_filters_empty_string_entries(self, monkeypatch, mock_async_client):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        from services.revalidation_client import invalidate

        await invalidate(tags=["animals", "", None], paths=["", "/ok"])

        payload = mock_async_client.post.call_args.kwargs["json"]
        assert payload == {"tags": ["animals"], "paths": ["/ok"]}

    @pytest.mark.asyncio
    async def test_swallows_http_status_error(self, monkeypatch, caplog):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        from services.revalidation_client import invalidate

        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_response.raise_for_status = MagicMock(
            side_effect=httpx.HTTPStatusError(
                "401 Unauthorized",
                request=MagicMock(),
                response=mock_response,
            )
        )
        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(return_value=mock_response)

        with patch("services.revalidation_client.httpx.AsyncClient") as mock_class:
            mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_class.return_value.__aexit__ = AsyncMock(return_value=None)
            with caplog.at_level(logging.ERROR):
                await invalidate(tags=["foo"])

        assert "cache invalidation failed" in caplog.text

    @pytest.mark.asyncio
    async def test_swallows_network_error(self, monkeypatch, caplog):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        from services.revalidation_client import invalidate

        mock_client_instance = AsyncMock()
        mock_client_instance.post = AsyncMock(side_effect=httpx.ConnectError("connection refused"))

        with patch("services.revalidation_client.httpx.AsyncClient") as mock_class:
            mock_class.return_value.__aenter__ = AsyncMock(return_value=mock_client_instance)
            mock_class.return_value.__aexit__ = AsyncMock(return_value=None)
            with caplog.at_level(logging.ERROR):
                await invalidate(tags=["foo"])

        assert "cache invalidation failed" in caplog.text


@pytest.mark.unit
class TestInvalidateSync:
    """Behavior of the sync invalidate_sync() function."""

    def test_skips_when_token_missing(self, monkeypatch, caplog):
        monkeypatch.delenv("REVALIDATION_TOKEN", raising=False)
        from services.revalidation_client import invalidate_sync

        with patch("services.revalidation_client.httpx.Client") as mock_client:
            with caplog.at_level(logging.WARNING):
                invalidate_sync(tags=["animals"])

        mock_client.assert_not_called()
        assert "REVALIDATION_TOKEN" in caplog.text

    def test_skips_when_no_tags_or_paths(self, monkeypatch):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        from services.revalidation_client import invalidate_sync

        with patch("services.revalidation_client.httpx.Client") as mock_client:
            invalidate_sync()

        mock_client.assert_not_called()

    def test_posts_with_token_and_payload(self, monkeypatch, mock_sync_client):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        monkeypatch.delenv("FRONTEND_URL", raising=False)
        from services.revalidation_client import invalidate_sync

        invalidate_sync(tags=["animals"], paths=["/x"])

        mock_sync_client.post.assert_called_once_with(
            "https://www.rescuedogs.me/api/revalidate",
            headers={"x-revalidate-token": "secret"},
            json={"tags": ["animals"], "paths": ["/x"]},
        )

    def test_swallows_network_error(self, monkeypatch, caplog):
        monkeypatch.setenv("REVALIDATION_TOKEN", "secret")
        from services.revalidation_client import invalidate_sync

        mock_client_instance = MagicMock()
        mock_client_instance.post = MagicMock(side_effect=httpx.ConnectError("connection refused"))

        with patch("services.revalidation_client.httpx.Client") as mock_class:
            mock_class.return_value.__enter__ = MagicMock(return_value=mock_client_instance)
            mock_class.return_value.__exit__ = MagicMock(return_value=None)
            with caplog.at_level(logging.ERROR):
                invalidate_sync(tags=["foo"])

        assert "cache invalidation failed" in caplog.text
