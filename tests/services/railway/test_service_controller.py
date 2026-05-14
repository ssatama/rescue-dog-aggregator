"""Unit tests for RailwayServiceController."""

from __future__ import annotations

import json
from typing import Any

import httpx
import pytest

from services.railway.service_controller import (
    Deployment,
    RailwayApiError,
    RailwayServiceController,
)


def _build_controller(handler: httpx.MockTransport) -> RailwayServiceController:
    client = httpx.Client(
        base_url="https://backboard.railway.com/graphql/v2",
        headers={"Authorization": "Bearer test-token", "Content-Type": "application/json"},
        transport=handler,
    )
    return RailwayServiceController(
        api_token="test-token",
        project_id="proj-1",
        environment_id="env-1",
        service_id="svc-1",
        client=client,
    )


def _graphql_response(data: dict[str, Any]) -> httpx.Response:
    return httpx.Response(200, json={"data": data})


def _parse_body(request: httpx.Request) -> dict[str, Any]:
    return json.loads(request.read().decode())


@pytest.mark.unit
class TestFromEnv:
    _ALL_ENV = {
        "RAILWAY_API_TOKEN": "t",
        "RAILWAY_PROJECT_ID": "p",
        "RAILWAY_ENVIRONMENT_ID": "e",
        "BROWSERLESS_SERVICE_ID": "s",
    }

    @pytest.mark.parametrize("missing_var", list(_ALL_ENV.keys()))
    def test_returns_none_when_any_var_missing(self, monkeypatch: pytest.MonkeyPatch, missing_var: str) -> None:
        for name, value in self._ALL_ENV.items():
            if name == missing_var:
                monkeypatch.delenv(name, raising=False)
            else:
                monkeypatch.setenv(name, value)

        assert RailwayServiceController.from_env() is None

    def test_partial_config_logs_warning(self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
        monkeypatch.setenv("RAILWAY_API_TOKEN", "t")
        monkeypatch.setenv("RAILWAY_PROJECT_ID", "p")
        monkeypatch.delenv("RAILWAY_ENVIRONMENT_ID", raising=False)
        monkeypatch.delenv("BROWSERLESS_SERVICE_ID", raising=False)

        with caplog.at_level("WARNING", logger="services.railway.service_controller"):
            assert RailwayServiceController.from_env() is None
        assert any("PARTIALLY configured" in record.message for record in caplog.records)

    def test_fully_unset_logs_info_not_warning(self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
        for name in self._ALL_ENV:
            monkeypatch.delenv(name, raising=False)

        with caplog.at_level("INFO", logger="services.railway.service_controller"):
            assert RailwayServiceController.from_env() is None
        assert any("disabled" in record.message for record in caplog.records)
        assert not any(record.levelname == "WARNING" for record in caplog.records)

    def test_returns_controller_when_all_env_set(self, monkeypatch: pytest.MonkeyPatch) -> None:
        for name, value in self._ALL_ENV.items():
            monkeypatch.setenv(name, value)

        controller = RailwayServiceController.from_env()
        assert controller is not None
        assert controller._project_id == "p"
        assert controller._environment_id == "e"
        assert controller._service_id == "s"
        assert controller._owns_client is True
        controller.close()


@pytest.mark.unit
class TestLatestDeployment:
    def test_returns_deployment_when_present(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            body = _parse_body(request)
            assert "latestDeployment" in body["query"]
            assert body["variables"]["input"]["projectId"] == "proj-1"
            assert body["variables"]["input"]["serviceId"] == "svc-1"
            return _graphql_response({"deployments": {"edges": [{"node": {"id": "dep-99", "status": "SUCCESS"}}]}})

        controller = _build_controller(httpx.MockTransport(handler))
        deployment = controller.latest_deployment()

        assert deployment is not None
        assert deployment.id == "dep-99"
        assert deployment.status == "SUCCESS"

    def test_returns_none_when_no_deployments(self) -> None:
        handler = httpx.MockTransport(lambda _req: _graphql_response({"deployments": {"edges": []}}))
        controller = _build_controller(handler)

        assert controller.latest_deployment() is None

    def test_raises_on_unexpected_schema(self) -> None:
        handler = httpx.MockTransport(lambda _req: _graphql_response({"deployments": {"unexpected": []}}))
        controller = _build_controller(handler)

        with pytest.raises(RailwayApiError, match="Unexpected response shape"):
            controller.latest_deployment()


@pytest.mark.unit
class TestStop:
    def test_stops_running_deployment(self) -> None:
        calls: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            body = _parse_body(request)
            if "latestDeployment" in body["query"]:
                calls.append("query")
                return _graphql_response({"deployments": {"edges": [{"node": {"id": "dep-1", "status": "SUCCESS"}}]}})
            assert "deploymentStop" in body["query"]
            assert body["variables"]["id"] == "dep-1"
            calls.append("stop")
            return _graphql_response({"deploymentStop": True})

        controller = _build_controller(httpx.MockTransport(handler))
        assert controller.stop() is True
        assert calls == ["query", "stop"]

    def test_returns_false_when_no_deployment(self) -> None:
        handler = httpx.MockTransport(lambda _req: _graphql_response({"deployments": {"edges": []}}))
        controller = _build_controller(handler)

        assert controller.stop() is False

    @pytest.mark.parametrize("terminal_status", ["REMOVED", "CRASHED", "FAILED"])
    def test_skips_when_already_terminal(self, terminal_status: str) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            body = _parse_body(request)
            assert "latestDeployment" in body["query"], "Stop mutation must not be called for terminal deployment"
            return _graphql_response({"deployments": {"edges": [{"node": {"id": "dep-1", "status": terminal_status}}]}})

        controller = _build_controller(httpx.MockTransport(handler))
        assert controller.stop() is False


@pytest.mark.unit
class TestRedeploy:
    def test_redeploys_latest_returns_deployment(self) -> None:
        calls: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            body = _parse_body(request)
            if "latestDeployment" in body["query"]:
                calls.append("query")
                return _graphql_response({"deployments": {"edges": [{"node": {"id": "dep-7", "status": "REMOVED"}}]}})
            assert "deploymentRedeploy" in body["query"]
            assert body["variables"]["id"] == "dep-7"
            calls.append("redeploy")
            return _graphql_response({"deploymentRedeploy": {"id": "dep-8", "status": "DEPLOYING"}})

        controller = _build_controller(httpx.MockTransport(handler))
        result = controller.redeploy()

        assert result == Deployment(id="dep-8", status="DEPLOYING")
        assert calls == ["query", "redeploy"]

    def test_raises_when_no_deployment_to_redeploy(self) -> None:
        handler = httpx.MockTransport(lambda _req: _graphql_response({"deployments": {"edges": []}}))
        controller = _build_controller(handler)

        with pytest.raises(RailwayApiError):
            controller.redeploy()

    def test_raises_on_unexpected_redeploy_response(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            body = _parse_body(request)
            if "latestDeployment" in body["query"]:
                return _graphql_response({"deployments": {"edges": [{"node": {"id": "dep-1", "status": "SUCCESS"}}]}})
            return _graphql_response({"deploymentRedeploy": None})

        controller = _build_controller(httpx.MockTransport(handler))

        with pytest.raises(RailwayApiError, match="Unexpected response shape"):
            controller.redeploy()


@pytest.mark.unit
class TestGraphQLErrors:
    def test_raises_on_graphql_error_response(self) -> None:
        handler = httpx.MockTransport(lambda _req: httpx.Response(200, json={"errors": [{"message": "Unauthorized"}]}))
        controller = _build_controller(handler)

        with pytest.raises(RailwayApiError, match="Unauthorized"):
            controller.latest_deployment()

    def test_raises_railway_error_on_missing_data_field(self) -> None:
        handler = httpx.MockTransport(lambda _req: httpx.Response(200, json={}))
        controller = _build_controller(handler)

        with pytest.raises(RailwayApiError, match="missing 'data' field"):
            controller.latest_deployment()

    def test_raises_railway_error_on_non_json_response(self) -> None:
        handler = httpx.MockTransport(lambda _req: httpx.Response(200, text="<html>maintenance</html>"))
        controller = _build_controller(handler)

        with pytest.raises(RailwayApiError, match="non-JSON"):
            controller.latest_deployment()

    def test_raises_on_http_error_status(self) -> None:
        handler = httpx.MockTransport(lambda _req: httpx.Response(500, json={}))
        controller = _build_controller(handler)

        with pytest.raises(httpx.HTTPStatusError):
            controller.latest_deployment()


@pytest.mark.unit
class TestWaitForHealthy:
    @pytest.fixture(autouse=True)
    def _no_sleep(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("services.railway.service_controller.time.sleep", lambda _s: None)

    def test_returns_true_on_first_success(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr(httpx.Client, "get", lambda self, url: httpx.Response(200))

        controller = _build_controller(httpx.MockTransport(lambda _r: _graphql_response({})))
        assert controller.wait_for_healthy("http://example/health", timeout=5.0, interval=0.1) is True

    def test_polls_until_healthy(self, monkeypatch: pytest.MonkeyPatch) -> None:
        responses: list[httpx.Response | Exception] = [
            httpx.ConnectError("refused"),
            httpx.Response(503),
            httpx.Response(200),
        ]

        def fake_get(_self: httpx.Client, _url: str) -> httpx.Response:
            value = responses.pop(0)
            if isinstance(value, Exception):
                raise value
            return value

        monkeypatch.setattr(httpx.Client, "get", fake_get)
        controller = _build_controller(httpx.MockTransport(lambda _r: _graphql_response({})))

        assert controller.wait_for_healthy("http://example/health", timeout=10.0, interval=0.01) is True
        assert responses == []  # all consumed

    def test_returns_false_on_timeout(self, monkeypatch: pytest.MonkeyPatch) -> None:
        # Deterministic clock: start at 0, then jump past deadline of 0.05 on second check.
        times = iter([0.0, 0.0, 0.06])
        monkeypatch.setattr("services.railway.service_controller.time.monotonic", lambda: next(times))
        monkeypatch.setattr(httpx.Client, "get", lambda self, url: httpx.Response(503))

        controller = _build_controller(httpx.MockTransport(lambda _r: _graphql_response({})))
        assert controller.wait_for_healthy("http://example/health", timeout=0.05, interval=0.01) is False

    def test_logs_last_error_with_message(self, monkeypatch: pytest.MonkeyPatch, caplog: pytest.LogCaptureFixture) -> None:
        times = iter([0.0, 0.0, 0.06])
        monkeypatch.setattr("services.railway.service_controller.time.monotonic", lambda: next(times))

        def fake_get(_self: httpx.Client, _url: str) -> httpx.Response:
            raise httpx.ConnectError("DNS resolution failed for example.com")

        monkeypatch.setattr(httpx.Client, "get", fake_get)
        controller = _build_controller(httpx.MockTransport(lambda _r: _graphql_response({})))

        with caplog.at_level("ERROR", logger="services.railway.service_controller"):
            controller.wait_for_healthy("http://example/health", timeout=0.05, interval=0.01)

        assert any("DNS resolution failed" in record.message for record in caplog.records)
