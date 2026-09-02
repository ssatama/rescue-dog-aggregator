"""An exception raised by a route must not be rewritten by the cursor dependency.

FastAPI throws the route's exception into `get_pooled_db_cursor` when it unwinds
the AsyncExitStack. The dependency used to catch everything, so a
RequestValidationError (a 422) came back to the client as a 500 UNKNOWN_ERROR
(Sentry PYTHON-FASTAPI-23, 64 events). The dependency owns pool acquisition and
cursor lifecycle; it does not own what the route raised.
"""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.testclient import TestClient

from api.database.connection_pool import PoolExhaustedError
from api.dependencies import get_pooled_db_cursor


@pytest.fixture
def pooled_cursor():
    """Patch the pool so the dependency yields a cursor without a database."""
    cursor = MagicMock()
    with patch("api.dependencies.get_pooled_cursor") as get_cursor:
        get_cursor.return_value.__enter__.return_value = cursor
        get_cursor.return_value.__exit__.return_value = False
        yield cursor


@pytest.mark.unit
class TestRouteErrorsPassThrough:
    """Errors thrown back into the generator belong to the route."""

    def test_validation_error_stays_a_422(self, pooled_cursor):
        app = FastAPI()

        @app.get("/dogs")
        def list_dogs(
            limit: int = Query(20, ge=1, le=50),
            cursor=Depends(get_pooled_db_cursor),
        ):
            return {"limit": limit}

        response = TestClient(app).get("/dogs", params={"limit": 100})

        assert response.status_code == 422
        assert response.json()["detail"][0]["type"] == "less_than_equal"

    def test_route_runtime_error_is_not_relabelled_as_a_pool_error(self, pooled_cursor):
        generator = get_pooled_db_cursor()
        next(generator)

        route_error = RuntimeError("the route's own bug")
        with pytest.raises(RuntimeError) as exc_info:
            generator.throw(route_error)

        assert exc_info.value is route_error

    def test_route_exception_is_not_relabelled_as_unknown_error(self, pooled_cursor):
        generator = get_pooled_db_cursor()
        next(generator)

        route_error = ValueError("the route's own bug")
        with pytest.raises(ValueError) as exc_info:
            generator.throw(route_error)

        assert exc_info.value is route_error

    def test_a_route_raising_a_pool_error_is_not_relabelled(self, pooled_cursor):
        """PoolExhaustedError is a public importable type a route could raise.

        The type-specific clauses used to sit above the identity check, so the
        dependency would swallow the route's own message and answer with the
        fixed "too many concurrent requests" 503 - #380's bug, reintroduced for
        the types #379 added.
        """
        generator = get_pooled_db_cursor()
        next(generator)

        route_error = PoolExhaustedError("the route decided to shed load")
        with pytest.raises(PoolExhaustedError) as exc_info:
            generator.throw(route_error)

        assert exc_info.value is route_error

    def test_generator_exit_is_not_translated(self, pooled_cursor):
        """A BaseException that is not an Exception is never ours to rewrite."""
        generator = get_pooled_db_cursor()
        next(generator)

        with pytest.raises(GeneratorExit):
            generator.throw(GeneratorExit())

    def test_route_http_exception_still_passes_through(self, pooled_cursor):
        generator = get_pooled_db_cursor()
        next(generator)

        route_error = HTTPException(status_code=404, detail="Dog not found")
        with pytest.raises(HTTPException) as exc_info:
            generator.throw(route_error)

        assert exc_info.value.status_code == 404


@pytest.mark.unit
class TestPoolErrorsAreStillTranslated:
    """Failures the dependency does own keep their structured responses."""

    def test_pool_exhaustion_is_a_503_not_a_500(self):
        with patch("api.dependencies.get_pooled_cursor") as get_cursor:
            get_cursor.return_value.__enter__.side_effect = PoolExhaustedError("Connection pool exhausted after 3 retries")

            with pytest.raises(HTTPException) as exc_info:
                next(get_pooled_db_cursor())

        assert exc_info.value.status_code == 503
        assert exc_info.value.detail["code"] == "POOL_EXHAUSTED"

    def test_uninitialized_pool_is_a_503(self):
        from api.database.connection_pool import PoolNotInitializedError

        with patch("api.dependencies.get_pooled_cursor") as get_cursor:
            get_cursor.return_value.__enter__.side_effect = PoolNotInitializedError("Connection pool not initialized. Call initialize() first.")

            with pytest.raises(HTTPException) as exc_info:
                next(get_pooled_db_cursor())

        assert exc_info.value.status_code == 503
        assert exc_info.value.detail["code"] == "POOL_NOT_INITIALIZED"

    def test_acquisition_failure_is_still_translated(self):
        with patch("api.dependencies.get_pooled_cursor") as get_cursor:
            get_cursor.return_value.__enter__.side_effect = OSError("socket gone")

            with pytest.raises(HTTPException) as exc_info:
                next(get_pooled_db_cursor())

        assert exc_info.value.status_code == 500
        assert exc_info.value.detail["code"] == "UNKNOWN_ERROR"
