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
from typing import Any

import httpx

logger = logging.getLogger(__name__)

RAILWAY_GRAPHQL_ENDPOINT = "https://backboard.railway.com/graphql/v2"

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
    """Raised when the Railway GraphQL API returns an error."""


@dataclass(frozen=True)
class Deployment:
    id: str
    status: str


class RailwayServiceController:
    """Controls a single Railway service via GraphQL: stop, redeploy, wait-for-health."""

    def __init__(
        self,
        api_token: str,
        project_id: str,
        environment_id: str,
        service_id: str,
        *,
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
        """Build a controller from environment variables. Returns None if not fully configured."""
        api_token = os.getenv("RAILWAY_API_TOKEN")
        project_id = os.getenv("RAILWAY_PROJECT_ID")
        environment_id = os.getenv("RAILWAY_ENVIRONMENT_ID")
        service_id = os.getenv(service_id_env)

        missing = [
            name
            for name, value in (
                ("RAILWAY_API_TOKEN", api_token),
                ("RAILWAY_PROJECT_ID", project_id),
                ("RAILWAY_ENVIRONMENT_ID", environment_id),
                (service_id_env, service_id),
            )
            if not value
        ]
        if missing:
            logger.info("Railway service control disabled (missing env: %s)", ", ".join(missing))
            return None

        return cls(
            api_token=api_token,  # type: ignore[arg-type]
            project_id=project_id,  # type: ignore[arg-type]
            environment_id=environment_id,  # type: ignore[arg-type]
            service_id=service_id,  # type: ignore[arg-type]
        )

    def close(self) -> None:
        if self._owns_client:
            self._client.close()

    def __enter__(self) -> RailwayServiceController:
        return self

    def __exit__(self, *_exc: object) -> None:
        self.close()

    def latest_deployment(self) -> Deployment | None:
        """Return the most recent deployment for the service, or None if there isn't one."""
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
        edges = data["deployments"]["edges"]
        if not edges:
            return None
        node = edges[0]["node"]
        return Deployment(id=node["id"], status=node["status"])

    def stop(self) -> bool:
        """Stop the running deployment. Returns True on success, False if nothing to stop."""
        deployment = self.latest_deployment()
        if deployment is None:
            logger.warning("No deployment found for service %s; nothing to stop", self._service_id)
            return False
        if deployment.status in {"REMOVED", "CRASHED", "FAILED"}:
            logger.info("Deployment %s already in non-running state: %s", deployment.id, deployment.status)
            return False

        logger.info("Stopping deployment %s (status=%s)", deployment.id, deployment.status)
        self._graphql(_STOP_DEPLOYMENT_MUTATION, {"id": deployment.id})
        return True

    def redeploy(self) -> str:
        """Redeploy the latest deployment. Returns the new deployment status."""
        deployment = self.latest_deployment()
        if deployment is None:
            raise RailwayApiError(f"No deployment exists for service {self._service_id} to redeploy")

        logger.info("Redeploying deployment %s (current status=%s)", deployment.id, deployment.status)
        data = self._graphql(_REDEPLOY_MUTATION, {"id": deployment.id})
        return data["deploymentRedeploy"]["status"]

    def wait_for_healthy(self, health_url: str, *, timeout: float = 180.0, interval: float = 3.0) -> bool:
        """Poll `health_url` until it returns 2xx or timeout elapses. Returns True on success."""
        deadline = time.monotonic() + timeout
        attempts = 0
        last_error: str | None = None

        while time.monotonic() < deadline:
            attempts += 1
            try:
                response = httpx.get(health_url, timeout=5.0)
                if 200 <= response.status_code < 300:
                    logger.info("Service healthy at %s after %d attempts", health_url, attempts)
                    return True
                last_error = f"HTTP {response.status_code}"
            except httpx.HTTPError as exc:
                last_error = type(exc).__name__
            time.sleep(interval)

        logger.error("Service did not become healthy at %s within %.0fs (last error: %s)", health_url, timeout, last_error)
        return False

    def _graphql(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        response = self._client.post("", json={"query": query, "variables": variables})
        response.raise_for_status()
        payload = response.json()
        if payload.get("errors"):
            raise RailwayApiError(f"Railway GraphQL error: {payload['errors']}")
        return payload["data"]
