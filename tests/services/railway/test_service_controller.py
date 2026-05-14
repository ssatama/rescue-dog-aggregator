"""Unit tests for RailwayServiceController."""

from __future__ import annotations

from typing import Any

import httpx
import pytest

from services.railway.service_controller import (
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


@pytest.mark.unit
class TestFromEnv:
    def test_returns_none_when_token_missing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.delenv("RAILWAY_API_TOKEN", raising=False)
        monkeypatch.setenv("RAILWAY_PROJECT_ID", "p")
        monkeypatch.setenv("RAILWAY_ENVIRONMENT_ID", "e")
        monkeypatch.setenv("BROWSERLESS_SERVICE_ID", "s")

        assert RailwayServiceController.from_env() is None

    def test_returns_none_when_service_id_missing(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("RAILWAY_API_TOKEN", "t")
        monkeypatch.setenv("RAILWAY_PROJECT_ID", "p")
        monkeypatch.setenv("RAILWAY_ENVIRONMENT_ID", "e")
        monkeypatch.delenv("BROWSERLESS_SERVICE_ID", raising=False)

        assert RailwayServiceController.from_env() is None

    def test_returns_controller_when_all_env_set(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setenv("RAILWAY_API_TOKEN", "t")
        monkeypatch.setenv("RAILWAY_PROJECT_ID", "p")
        monkeypatch.setenv("RAILWAY_ENVIRONMENT_ID", "e")
        monkeypatch.setenv("BROWSERLESS_SERVICE_ID", "s")

        controller = RailwayServiceController.from_env()
        assert controller is not None
        controller.close()


@pytest.mark.unit
class TestLatestDeployment:
    def test_returns_deployment_when_present(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            body = request.read().decode()
            assert "latestDeployment" in body
            assert "proj-1" in body
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


@pytest.mark.unit
class TestStop:
    def test_stops_running_deployment(self) -> None:
        calls: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            body = request.read().decode()
            if "latestDeployment" in body:
                calls.append("query")
                return _graphql_response({"deployments": {"edges": [{"node": {"id": "dep-1", "status": "SUCCESS"}}]}})
            assert "deploymentStop" in body
            assert "dep-1" in body
            calls.append("stop")
            return _graphql_response({"deploymentStop": True})

        controller = _build_controller(httpx.MockTransport(handler))
        assert controller.stop() is True
        assert calls == ["query", "stop"]

    def test_returns_false_when_no_deployment(self) -> None:
        handler = httpx.MockTransport(lambda _req: _graphql_response({"deployments": {"edges": []}}))
        controller = _build_controller(handler)

        assert controller.stop() is False

    def test_skips_when_already_removed(self) -> None:
        def handler(request: httpx.Request) -> httpx.Response:
            body = request.read().decode()
            assert "latestDeployment" in body, "Stop mutation must not be called for REMOVED deployment"
            return _graphql_response({"deployments": {"edges": [{"node": {"id": "dep-1", "status": "REMOVED"}}]}})

        controller = _build_controller(httpx.MockTransport(handler))
        assert controller.stop() is False


@pytest.mark.unit
class TestRedeploy:
    def test_redeploys_latest(self) -> None:
        calls: list[str] = []

        def handler(request: httpx.Request) -> httpx.Response:
            body = request.read().decode()
            if "latestDeployment" in body:
                calls.append("query")
                return _graphql_response({"deployments": {"edges": [{"node": {"id": "dep-7", "status": "REMOVED"}}]}})
            assert "deploymentRedeploy" in body
            assert "dep-7" in body
            calls.append("redeploy")
            return _graphql_response({"deploymentRedeploy": {"id": "dep-8", "status": "DEPLOYING"}})

        controller = _build_controller(httpx.MockTransport(handler))
        assert controller.redeploy() == "DEPLOYING"
        assert calls == ["query", "redeploy"]

    def test_raises_when_no_deployment_to_redeploy(self) -> None:
        handler = httpx.MockTransport(lambda _req: _graphql_response({"deployments": {"edges": []}}))
        controller = _build_controller(handler)

        with pytest.raises(RailwayApiError):
            controller.redeploy()


@pytest.mark.unit
class TestGraphQLErrors:
    def test_raises_on_graphql_error_response(self) -> None:
        handler = httpx.MockTransport(lambda _req: httpx.Response(200, json={"errors": [{"message": "Unauthorized"}]}))
        controller = _build_controller(handler)

        with pytest.raises(RailwayApiError, match="Unauthorized"):
            controller.latest_deployment()

    def test_raises_on_http_error(self) -> None:
        handler = httpx.MockTransport(lambda _req: httpx.Response(500, json={}))
        controller = _build_controller(handler)

        with pytest.raises(httpx.HTTPStatusError):
            controller.latest_deployment()


@pytest.mark.unit
class TestWaitForHealthy:
    def test_returns_true_on_first_success(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("time.sleep", lambda _s: None)
        monkeypatch.setattr(httpx, "get", lambda *_a, **_kw: httpx.Response(200))

        controller = _build_controller(httpx.MockTransport(lambda _r: _graphql_response({})))
        assert controller.wait_for_healthy("http://example/health", timeout=5.0, interval=0.1) is True

    def test_polls_until_healthy(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("time.sleep", lambda _s: None)
        responses = iter(
            [
                httpx.ConnectError("refused"),
                httpx.Response(503),
                httpx.Response(200),
            ]
        )

        def fake_get(*_args: Any, **_kw: Any) -> httpx.Response:
            value = next(responses)
            if isinstance(value, Exception):
                raise value
            return value

        monkeypatch.setattr(httpx, "get", fake_get)
        controller = _build_controller(httpx.MockTransport(lambda _r: _graphql_response({})))

        assert controller.wait_for_healthy("http://example/health", timeout=10.0, interval=0.01) is True

    def test_returns_false_on_timeout(self, monkeypatch: pytest.MonkeyPatch) -> None:
        monkeypatch.setattr("time.sleep", lambda _s: None)
        monkeypatch.setattr(httpx, "get", lambda *_a, **_kw: (_ for _ in ()).throw(httpx.ConnectError("refused")))
        controller = _build_controller(httpx.MockTransport(lambda _r: _graphql_response({})))

        assert controller.wait_for_healthy("http://example/health", timeout=0.05, interval=0.01) is False
