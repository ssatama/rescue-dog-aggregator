"""IndexNow submissions for changed dog pages (#440)."""

import logging
from unittest.mock import MagicMock, patch

import httpx
import pytest

from services.indexnow_client import build_payloads, submit_dog_urls_sync

KEY = "0123456789abcdef0123456789abcdef"


@pytest.mark.unit
class TestBuildPayloads:
    def test_payload_names_the_host_key_and_canonical_dog_urls(self):
        [payload] = build_payloads(["rex-terrier-101", "bella-lab-102"], KEY)

        assert payload == {
            "host": "www.rescuedogs.me",
            "key": KEY,
            "keyLocation": f"https://www.rescuedogs.me/{KEY}.txt",
            "urlList": [
                "https://www.rescuedogs.me/dogs/rex-terrier-101",
                "https://www.rescuedogs.me/dogs/bella-lab-102",
            ],
        }

    def test_duplicates_and_empty_slugs_are_dropped(self):
        [payload] = build_payloads(["rex", "", "rex", None], KEY)

        assert payload["urlList"] == ["https://www.rescuedogs.me/dogs/rex"]

    def test_splits_at_ten_thousand_urls(self):
        payloads = build_payloads([f"dog-{i}" for i in range(10_001)], KEY)

        assert [len(p["urlList"]) for p in payloads] == [10_000, 1]

    def test_no_slugs_means_no_request(self):
        assert build_payloads([], KEY) == []


def _client_returning(status_code):
    client = MagicMock()
    client.__enter__.return_value = client
    client.post.return_value = httpx.Response(status_code, text="nope" if status_code >= 400 else "")
    return client


@pytest.mark.unit
class TestSubmitDogUrls:
    def test_skips_quietly_without_a_key(self, monkeypatch):
        monkeypatch.delenv("INDEXNOW_KEY", raising=False)

        with patch("services.indexnow_client.httpx.Client") as client_cls:
            submit_dog_urls_sync(["rex-terrier-101"])

        client_cls.assert_not_called()

    def test_posts_to_the_indexnow_endpoint(self, monkeypatch, caplog):
        monkeypatch.setenv("INDEXNOW_KEY", KEY)
        client = _client_returning(202)

        with patch("services.indexnow_client.httpx.Client", return_value=client), caplog.at_level(logging.INFO):
            submit_dog_urls_sync(["rex-terrier-101"])

        url = client.post.call_args.args[0]
        body = client.post.call_args.kwargs["json"]
        assert url == "https://api.indexnow.org/indexnow"
        assert body["urlList"] == ["https://www.rescuedogs.me/dogs/rex-terrier-101"]
        assert "IndexNow submitted 1 URL(s): HTTP 202" in caplog.text

    def test_warms_each_page_before_pinging(self, monkeypatch):
        """The purge is stale-while-revalidate; Bing must not be the one to get the stale page."""
        monkeypatch.setenv("INDEXNOW_KEY", KEY)
        client = _client_returning(200)
        calls = []
        client.get.side_effect = lambda url: calls.append(("get", url))
        client.post.side_effect = lambda url, json: calls.append(("post", url)) or httpx.Response(200)

        with patch("services.indexnow_client.httpx.Client", return_value=client):
            submit_dog_urls_sync(["rex-terrier-101", "bella-lab-102"])

        assert calls == [
            ("get", "https://www.rescuedogs.me/dogs/rex-terrier-101"),
            ("get", "https://www.rescuedogs.me/dogs/bella-lab-102"),
            ("post", "https://api.indexnow.org/indexnow"),
        ]

    def test_rejection_is_logged_not_raised(self, monkeypatch, caplog):
        monkeypatch.setenv("INDEXNOW_KEY", KEY)

        with patch("services.indexnow_client.httpx.Client", return_value=_client_returning(403)):
            submit_dog_urls_sync(["rex-terrier-101"])

        assert "IndexNow rejected 1 URL(s): HTTP 403" in caplog.text

    def test_network_failure_is_logged_not_raised(self, monkeypatch, caplog):
        monkeypatch.setenv("INDEXNOW_KEY", KEY)
        client = MagicMock()
        client.__enter__.return_value = client
        client.post.side_effect = httpx.ConnectError("dns")

        with patch("services.indexnow_client.httpx.Client", return_value=client):
            submit_dog_urls_sync(["rex-terrier-101"])

        assert "IndexNow network failure" in caplog.text
