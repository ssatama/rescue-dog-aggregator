import hashlib
import time
from typing import Dict, Optional, Tuple

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse


class CacheHeadersMiddleware(BaseHTTPMiddleware):
    CACHE_DURATIONS = {
        "recent_animals": 300,
        "diverse_animals": 3600,
        "default_animals": 900,
        "meta_endpoints": 86400,
        "statistics": 3600,
        "individual_animal": 1800,
        "organizations": 3600,
        "health": 0,
        "monitoring": 0,
    }

    SWR_DURATIONS = {
        "recent_animals": 60,
        "diverse_animals": 300,
        "default_animals": 120,
        "meta_endpoints": 3600,
        "statistics": 600,
        "individual_animal": 300,
        "organizations": 600,
    }

    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        response_time = time.time() - start_time
        response.headers["X-Response-Time"] = f"{response_time:.3f}"

        if request.method == "GET" and response.status_code == 200:
            cache_type, cache_duration, swr_duration = self._determine_cache_strategy(request.url.path, dict(request.query_params))

            if cache_duration > 0:
                cache_control = self._build_cache_control(cache_duration, swr_duration, is_public=True)
                response.headers["Cache-Control"] = cache_control

                cdn_cache_control = self._build_cache_control(cache_duration, swr_duration, is_public=True, is_cdn=True)
                response.headers["CDN-Cache-Control"] = cdn_cache_control

                vary_headers = self._get_vary_headers(request.url.path, dict(request.query_params))
                if vary_headers:
                    response.headers["Vary"] = vary_headers

                etag = await self._generate_etag(response)
                if etag:
                    response.headers["ETag"] = etag

                    if_none_match = request.headers.get("If-None-Match")
                    if if_none_match and if_none_match == etag:
                        return Response(status_code=304, headers=dict(response.headers))
            else:
                response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
                response.headers["Pragma"] = "no-cache"
                response.headers["Expires"] = "0"

        elif request.method == "GET" and response.status_code >= 400:
            response.headers["Cache-Control"] = "public, max-age=60"

        return response

    def _determine_cache_strategy(self, path: str, query_params: Dict) -> Tuple[str, int, int]:
        if path in ["/health", "/"] or path.startswith("/monitoring"):
            return ("health", 0, 0)

        if "/meta/" in path:
            return ("meta_endpoints", self.CACHE_DURATIONS["meta_endpoints"], self.SWR_DURATIONS["meta_endpoints"])

        if "/statistics" in path or "/stats" in path:
            return ("statistics", self.CACHE_DURATIONS["statistics"], self.SWR_DURATIONS["statistics"])

        if path.startswith("/api/animals/enhanced"):
            curation = query_params.get("curation", "").lower()
            if curation == "recent":
                return ("recent_animals", self.CACHE_DURATIONS["recent_animals"], self.SWR_DURATIONS["recent_animals"])
            else:
                return ("diverse_animals", self.CACHE_DURATIONS["diverse_animals"], self.SWR_DURATIONS["diverse_animals"])

        if path.startswith("/api/animals/") and (path.count("/") == 3 or "/id/" in path):
            return ("individual_animal", self.CACHE_DURATIONS["individual_animal"], self.SWR_DURATIONS["individual_animal"])

        if path == "/api/animals" or path == "/api/animals/":
            curation = query_params.get("curation", "").lower()
            if curation == "recent":
                return ("recent_animals", self.CACHE_DURATIONS["recent_animals"], self.SWR_DURATIONS["recent_animals"])
            elif curation == "diverse":
                return ("diverse_animals", self.CACHE_DURATIONS["diverse_animals"], self.SWR_DURATIONS["diverse_animals"])
            else:
                return ("default_animals", self.CACHE_DURATIONS["default_animals"], self.SWR_DURATIONS["default_animals"])

        if "/organizations" in path:
            return ("organizations", self.CACHE_DURATIONS["organizations"], self.SWR_DURATIONS["organizations"])

        return ("default_animals", 900, 120)

    def _build_cache_control(self, max_age: int, swr: int, is_public: bool = True, is_cdn: bool = False) -> str:
        parts = []

        if is_public:
            parts.append("public")
        else:
            parts.append("private")

        parts.append(f"max-age={max_age}")

        if swr > 0:
            parts.append(f"stale-while-revalidate={swr}")

        if is_cdn:
            parts.append("s-maxage=" + str(max_age))

        return ", ".join(parts)

    def _get_vary_headers(self, path: str, query_params: Dict) -> str:
        vary_headers = ["Accept", "Accept-Encoding"]

        if "/animals" in path:
            vary_headers.append("Origin")

            if any(param in query_params for param in ["city", "state", "country", "latitude", "longitude"]):
                vary_headers.append("X-Forwarded-For")

        return ", ".join(vary_headers)

    async def _generate_etag(self, response: Response) -> Optional[str]:
        try:
            if isinstance(response, StreamingResponse):
                return None

            body = b""

            if hasattr(response, "body"):
                body = response.body
            elif hasattr(response, "_body"):
                body = response._body
            elif hasattr(response, "body_iterator"):
                return None

            if body:
                if isinstance(body, str):
                    body = body.encode("utf-8")

                content_hash = hashlib.sha256(body).hexdigest()[:32]
                return f'W/"{content_hash}"'

            return None

        except Exception:
            return None
