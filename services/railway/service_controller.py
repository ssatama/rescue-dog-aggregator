"""Railway service controller for starting/stopping deployments via GraphQL API.

Used by management/railway_scraper_cron.py to wake the Browserless service before
scrape runs and stop it after, eliminating ~24/7 idle Chrome memory billing.

Required environment variables:
    RAILWAY_API_TOKEN: Account-level Personal Access Token (Bearer)
    RAILWAY_PROJECT_ID: Project ID (auto-injected by Railway runtime)
    RAILWAY_ENVIRONMENT_ID: Environment ID (auto-injected by Railway runtime)
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from typing import Any, Literal

import httpx

logger = logging.getLogger(__name__)

RAILWAY_GRAPHQL_ENDPOINT = "https://backboard.railway.com/graphql/v2"

DeploymentStatus = Literal[
    "INITIALIZING",
    "BUILDING",
    "DEPLOYING",
    "SUCCESS",
    "REMOVING",
    "REMOVED",
    "CRASHED",
    "FAILED",
    "SKIPPED",
    "QUEUED",
]

_TERMINAL_STATUSES: frozenset[DeploymentStatus] = frozenset({"REMOVED", "CRASHED", "FAILED"})

_BASE_REQUIRED_ENV_NAMES: tuple[str, ...] = (
    "RAILWAY_API_TOKEN",
    "RAILWAY_PROJECT_ID",
    "RAILWAY_ENVIRONMENT_ID",
)

_LATEST_DEPLOYMENT_QUERY = """
query latestDeployment($input: DeploymentListInput!) {
  deployments(input: $input, first: 1) {
    edges {
      node {
        id
        status
      }
    }
  }
}
"""

_STOP_DEPLOYMENT_MUTATION = """
mutation deploymentStop($id: String!) {
  deploymentStop(id: $id)
}
"""

_REDEPLOY_MUTATION = """
mutation deploymentRedeploy($id: String!) {
  deploymentRedeploy(id: $id) {
    id
    status
  }
}
"""


class RailwayApiError(RuntimeError):
    """Raised on any Railway GraphQL error: API error response, malformed payload, or unexpected schema."""


@dataclass(frozen=True)
class Deployment:
    id: str
    status: str


class RailwayServiceController:
    def __init__(
        self,
        api_token: str,
        *,
        project_id: str,
        environment_id: str,
        service_id: str,
        client: httpx.Client | None = None,
        request_timeout: float = 30.0,
    ) -> None:
        self._project_id = project_id
        self._environment_id = environment_id
        self._service_id = service_id
        self._owns_client = client is None
        self._client = client or httpx.Client(
            base_url=RAILWAY_GRAPHQL_ENDPOINT,
            headers={
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            },
            timeout=request_timeout,
        )

    @classmethod
    def from_env(cls, service_id_env: str = "BROWSERLESS_SERVICE_ID") -> RailwayServiceController | None:
        """Build a controller from environment variables.

        Returns None if any required variable is missing. Logs at WARNING when *some but
        not all* are set (likely misconfiguration) and INFO when all are unset (deliberately off).
        """
        required_names = (*_BASE_REQUIRED_ENV_NAMES, service_id_env)
        missing = [name for name in required_names if not os.getenv(name)]
        if missing:
            if len(missing) < len(required_names):
                logger.warning(
                    "Railway service control PARTIALLY configured; missing env vars suggest misconfiguration: %s",
                    ", ".join(missing),
                )
            else:
                logger.info("Railway service control disabled (no env vars set)")
            return None

        api_token = os.getenv("RAILWAY_API_TOKEN")
        project_id = os.getenv("RAILWAY_PROJECT_ID")
        environment_id = os.getenv("RAILWAY_ENVIRONMENT_ID")
        service_id = os.getenv(service_id_env)
        assert api_token and project_id and environment_id and service_id  # narrowed by `missing` check above

        return cls(
            api_token=api_token,
            project_id=project_id,
            environment_id=environment_id,
            service_id=service_id,
        )

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> RailwayServiceController:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def latest_deployment(self) -> Deployment | None:
        data = self._graphql(
            _LATEST_DEPLOYMENT_QUERY,
            {
                "input": {
                    "projectId": self._project_id,
                    "serviceId": self._service_id,
                    "environmentId": self._environment_id,
                }
            },
        )
        try:
            edges = data["deployments"]["edges"]
            if not edges:
                return None
            node = edges[0]["node"]
            return Deployment(id=node["id"], status=node["status"])
        except (KeyError, TypeError) as exc:
            raise RailwayApiError(f"Unexpected response shape from latestDeployment: {data!r}") from exc

    def stop(self) -> bool:
        """Stop the latest deployment if it's running.

        Returns True if a stop mutation was issued, False if there's no deployment or
        it's already in a terminal state (REMOVED/CRASHED/FAILED).
        """
        deployment = self.latest_deployment()
        if deployment is None:
            logger.warning("No deployment found for service %s; nothing to stop", self._service_id)
            return False
        if deployment.status in _TERMINAL_STATUSES:
            logger.info("Deployment %s already in terminal state: %s", deployment.id, deployment.status)
            return False

        logger.info("Stopping deployment %s (status=%s)", deployment.id, deployment.status)
        self._graphql(_STOP_DEPLOYMENT_MUTATION, {"id": deployment.id})
        return True

    def redeploy(self) -> Deployment:
        """Redeploy the latest deployment.

        Raises RailwayApiError if no prior deployment exists or the API returns an error.
        """
        deployment = self.latest_deployment()
        if deployment is None:
            raise RailwayApiError(f"No deployment exists for service {self._service_id} to redeploy")

        logger.info("Redeploying deployment %s (current status=%s)", deployment.id, deployment.status)
        data = self._graphql(_REDEPLOY_MUTATION, {"id": deployment.id})
        try:
            node = data["deploymentRedeploy"]
            return Deployment(id=node["id"], status=node["status"])
        except (KeyError, TypeError) as exc:
            raise RailwayApiError(f"Unexpected response shape from deploymentRedeploy: {data!r}") from exc

    def wait_for_healthy(self, health_url: str, *, timeout: float = 180.0, interval: float = 3.0) -> bool:
        """Poll health_url until it returns 2xx or timeout elapses.

        Returns True on the first 2xx response, False if the deadline passes (also logs
        an ERROR with attempts and the last observed failure).
        """
        deadline = time.monotonic() + timeout
        attempts = 0
        last_error: str | None = None

        with httpx.Client(timeout=5.0) as health_client:
            while time.monotonic() < deadline:
                attempts += 1
                try:
                    response = health_client.get(health_url)
                    if 200 <= response.status_code < 300:
                        logger.info("Service healthy at %s after %d attempts", health_url, attempts)
                        return True
                    last_error = f"HTTP {response.status_code}"
                except httpx.HTTPError as exc:
                    last_error = f"{type(exc).__name__}: {exc}"
                time.sleep(interval)

        logger.error(
            "Service did not become healthy at %s within %.0fs after %d attempts (last error: %s)",
            health_url,
            timeout,
            attempts,
            last_error,
        )
        return False

    def _graphql(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        response = self._client.post("", json={"query": query, "variables": variables})
        response.raise_for_status()
        try:
            payload = response.json()
        except ValueError as exc:
            raise RailwayApiError(f"Railway returned non-JSON ({response.status_code}): {response.text[:200]}") from exc
        if payload.get("errors"):
            raise RailwayApiError(f"Railway GraphQL error: {payload['errors']}")
        if "data" not in payload:
            raise RailwayApiError(f"Railway response missing 'data' field: {payload!r}")
        return payload["data"]
